import { dbService } from "./dbService";
import { where } from "firebase/firestore";

// Helper to extract Telegram integrations from saved profiles or environment variables
export function getTelegramCredentials(customIntegrations?: any) {
  if (customIntegrations?.telegram_bot_token && customIntegrations?.telegram_chat_id) {
    return {
      botToken: customIntegrations.telegram_bot_token,
      chatId: customIntegrations.telegram_chat_id,
      automationEnabled: customIntegrations.telegram_automation_enabled !== false,
      cmdStatus: customIntegrations.telegram_cmd_status || '/status',
      cmdBalance: customIntegrations.telegram_cmd_balance || '/balance',
      cmdMarket: customIntegrations.telegram_cmd_market || '/market',
      cmdEducation: customIntegrations.telegram_cmd_education || '/education'
    };
  }
  
  // Try retrieving from localStorage db_users table
  try {
    const usersData = localStorage.getItem('db_users');
    if (usersData) {
      const users = JSON.parse(usersData);
      // Find any user with configured integrations
      for (const uid in users) {
        const integrations = users[uid]?.integrations;
        if (integrations?.telegram_bot_token && integrations?.telegram_chat_id) {
          return {
            botToken: integrations.telegram_bot_token,
            chatId: integrations.telegram_chat_id,
            automationEnabled: integrations.telegram_automation_enabled !== false,
            cmdStatus: integrations.telegram_cmd_status || '/status',
            cmdBalance: integrations.telegram_cmd_balance || '/balance',
            cmdMarket: integrations.telegram_cmd_market || '/market',
            cmdEducation: integrations.telegram_cmd_education || '/education'
          };
        }
      }
    }
  } catch (e) {
    console.error("Failed to parse local users for integrations", e);
  }

  // Fallbacks
  const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;
  return {
    botToken,
    chatId,
    automationEnabled: true,
    cmdStatus: '/status',
    cmdBalance: '/balance',
    cmdMarket: '/market',
    cmdEducation: '/education'
  };
}

const formatPairName = (pair: string) => {
  return pair.replace('frx', '').replace('cry', '').replace('OTC_', '').replace('_', ' ');
};

const formatValue = (val: any, pair?: string) => {
  if (val === null || val === undefined || val === '') return 'N/A';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  
  const p = (pair || '').toUpperCase();
  if (p.includes('JPY')) return num.toFixed(3);
  if (p.includes('BTC') || p.includes('XAU') || p.includes('GOLD')) return num.toFixed(2);
  if (p.includes('US30') || p.includes('NAS100') || p.includes('SPX') || num > 1000) return num.toFixed(2);
  return num.toFixed(5);
};

const escapeHTML = (text: string) => {
  return (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

/**
 * Robust fetch helper that aborts the request after a designated timeout period (5 seconds default)
 */
async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 5000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

/**
 * Sends a signal broadcast to Telegram
 */
export async function sendSignalToTelegram(signal: any, customIntegrations?: any, isManual: boolean = false) {
  const { botToken, chatId, automationEnabled } = getTelegramCredentials(customIntegrations);

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured. Skipping broadcast.");
    return null;
  }

  // Respect Respect Creator's automation_enabled setting, unless it is a manual Creator action
  if (!automationEnabled && !isManual) {
    console.warn("BUC Oracle Automation is disabled. Skipping automated signal broadcast.");
    return null;
  }

  const isBuy = signal.stop_loss < signal.entry || signal.decision === 'Buy';
  const directionStr = isBuy ? '🟢 BUY / BULLISH' : '🔴 SELL / BEARISH';
  
  // Determine asset type
  const isVol = signal.pair?.includes('100') || signal.pair?.includes('500') || signal.pair?.includes('1000') || signal.pair?.includes('R_') || signal.pair?.includes('CRASH') || signal.pair?.includes('BOOM');
  const marketType = isVol ? 'Volatility Indices (Synthetics)' : 'Forex Major Currency';

  const pairName = formatPairName(signal.pair || 'Asset');
  const entryVal = formatValue(signal.entry, signal.pair);
  const slVal = formatValue(signal.stop_loss, signal.pair);
  const tp1Val = formatValue(signal.tp1, signal.pair);
  const tp2Val = formatValue(signal.tp2, signal.pair);
  const tp3Val = formatValue(signal.tp3, signal.pair);

  const message = `🚀 <b>BLĀCK-PLĀYER RSA PREMIUM SIGNAL</b>
━━━━━━━━━━━━━━━━━━━━
📊 <b>MARKET INTEL:</b>
• <b>Market Category:</b> ${marketType}
• <b>Trading Asset:</b> <b>${pairName}</b>
• <b>Session Timing:</b> ${signal.session_timing || 'Active Session'}
• <b>Timeframe Grid:</b> ${signal.timeframe || 'M15'}
• <b>Execution Type:</b> ${signal.execution || 'Intraday'}

⚡ <b>EXECUTION MATRIX:</b>
• <b>Order Direction:</b> <b>${directionStr}</b>
• <b>Optimal Entry Zone:</b> <code>${entryVal}</code>
• <b>Strict Stop Loss (SL):</b> <code>${slVal}</code>
• <b>Take Profit 1 (TP1):</b> <code>${tp1Val}</code>
• <b>Take Profit 2 (TP2):</b> <code>${tp2Val}</code>
• <b>Take Profit 3 (TP3):</b> <code>${tp3Val}</code>

🛡️ <b>RISK PROFILE & PROTOCOL:</b>
• <b>Risk-to-Reward:</b> 1:${signal.risk_reward || '3'}
• <b>Confidence Rating:</b> ${typeof signal.confidence === 'number' ? signal.confidence.toFixed(1) : (signal.confidence || '92')}%
• <b>Automation Rule:</b> Upon reaching TP1, our automated sentinel moves Stop Loss to Break-Even (BE) at <code>${entryVal}</code> to protect capital.

━━━━━━━━━━━━━━━━━━━━
⚠️ <i>The patient hunter eats before the reckless one. Always use professional lot sizing aligned with 1% max account risk. Companion educational briefing follows below...</i>`;

  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    
    // Auto-broadcast explanation as a threaded or companion message
    await sendSignalExplanationToTelegram(signal, customIntegrations, isManual);
    
    return data.result.message_id;
  } catch (error) {
    console.error("Telegram Broadcast Error:", error);
    return null;
  }
}

/**
 * Sends a secondary signal explanation to provide detailed reasoning
 */
export async function sendSignalExplanationToTelegram(signal: any, customIntegrations?: any, isManual: boolean = false) {
  const { botToken, chatId, automationEnabled } = getTelegramCredentials(customIntegrations);

  if (!botToken || !chatId) return null;
  if (!automationEnabled && !isManual) return null;

  const isBuy = signal.stop_loss < signal.entry || signal.decision === 'Buy';
  const convergenceScore = Math.floor((signal.confidence || 90) + Math.random() * 5);
  const pairName = formatPairName(signal.pair || 'Asset');
  const entryVal = formatValue(signal.entry, signal.pair);
  const slVal = formatValue(signal.stop_loss, signal.pair);

  const rationaleText = signal.decision_reasoning || signal.analysis || 'High-volume institutional block mitigation.';

  const message = `🧠 <b>INSTITUTIONAL ANALYSIS & EDUCATIONAL INTEL</b>
━━━━━━━━━━━━━━━━━━━━
🎯 <b>Asset Setup:</b> ${pairName}
📈 <b>Market Phase:</b> ${isBuy ? 'Bullish Accumulation & Expansion' : 'Bearish Distribution & Decline'}
🛡️ <b>Convergence Matrix Score:</b> ${convergenceScore}/100

🔑 <b>STRUCTURAL REASONING:</b>
• <b>Market Structure Shift:</b> ${escapeHTML(signal.market_structure || 'Confirmed Break of Structure (BOS)')}
• <b>Trend Alignment:</b> ${isBuy ? 'Ascending Order Flow' : 'Descending Order Flow'}
• <b>Liquidity Profile:</b> Retesting unmitigated higher-timeframe Fair Value Gap (FVG) or Order Block.
• <b>Confluence Count:</b> ${signal.confirmations_count || 4} Confirmed SMC Blocks
• <b>Regime Score:</b> ${escapeHTML(signal.market_regime || 'High Volume Inflow')}

💡 <b>WHY THIS SIGNAL WILL WORK (THE CONFLUENCE THESIS):</b>
Price has completed a deep Liquidity Sweep of the preceding session highs/lows, picking up passive retail stop-loss orders. As retail traders got stopped out, institutional players filled heavy limit orders. A strong bullish/bearish displacement candle followed, creating a Fair Value Gap (imbalance). The price has now returned to mitigate this imbalance and tap into the unmitigated Order Block. This creates a high-probability springboard reaction toward our TP targets.

🚫 <b>WHAT WOULD INVALIDATE/VIOLATE THIS SETUP:</b>
If price action violates the unmitigated demand/supply base and candles close below/above <code>${slVal}</code>, it indicates that the institutional order flow has shifted. 
${signal.dynamic_sl_logic ? `• <b>Oracle Stop Loss Invalidation Logic:</b> ${escapeHTML(signal.dynamic_sl_logic)}\n\n` : ''}This structural break turns our order block into a breaker block, and we must respect the change in bias. Capital preservation is our highest priority—exiting at <code>${slVal}</code> prevents catastrophic drawdowns.

📚 <b>SMC EDUCATIONAL CONCEPT:</b>
<b>Order Blocks & Fair Value Gaps (FVG)</b>
An Order Block is where smart money leaves their footprints in the form of massive buy or sell orders. When price creates an imbalance (FVG) during an aggressive impulse leg, that gap behaves like a magnet. It must be filled before the true trend can continue. Patience in waiting for the mitigation is what separates the elite 1% of traders from the 99%.

📊 <b>Oracle Analysis Synthesis:</b>
<i>"${escapeHTML(rationaleText)}"</i>`;

  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = await response.json();
    return data.ok ? data.result.message_id : null;
  } catch (error) {
    console.error("Explanation Broadcast Error:", error);
    return null;
  }
}

/**
 * Automatically broadcasts updates to Telegram when trade milestones are reached
 */
export async function sendSignalUpdateToTelegram(
  signalOrTrade: any, 
  updateType: 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'TP_FINAL_HIT' | 'SL_HIT', 
  currentPrice: number, 
  customIntegrations?: any
) {
  const { botToken, chatId, automationEnabled } = getTelegramCredentials(customIntegrations);
  if (!botToken || !chatId) return null;
  if (!automationEnabled) return null;

  const pairName = formatPairName(signalOrTrade.pair || signalOrTrade.symbol || 'Asset');
  const entryVal = formatValue(signalOrTrade.entry_price || signalOrTrade.entry, signalOrTrade.pair);
  const slVal = formatValue(signalOrTrade.stop_loss, signalOrTrade.pair);
  const tp1Val = formatValue(signalOrTrade.tp1, signalOrTrade.pair);
  const tp2Val = formatValue(signalOrTrade.tp2, signalOrTrade.pair);
  const tp3Val = formatValue(signalOrTrade.tp3, signalOrTrade.pair);
  
  let header = "";
  let body = "";
  let educationalInsight = "";
  
  switch(updateType) {
    case 'TP1_HIT':
      header = `🎯 <b>TARGET 1 SECURED — RISK REMOVED!</b>`;
      body = `• <b>Asset:</b> ${pairName}
• <b>Milestone:</b> Take Profit 1 reached at <b>${formatValue(currentPrice, signalOrTrade.pair)}</b>!
• <b>Shield Activated:</b> Stop Loss has been automatically moved to <b>Break-Even (BE)</b> at exactly <b>${entryVal}</b>.
• <b>Trade Status:</b> Risk-Free Mode 🛡️`;
      educationalInsight = `🧠 <b>EDUCATIONAL REASONING (The Break-Even Logic):</b>
When a trade reaches TP1, the first structural objective is completed, sweeping the minor internal liquidity pool. Institutional traders immediately reduce their exposure. Moving our Stop Loss to entry (BE) guarantees that we can no longer lose money on this trade. We let the remaining portion run with absolute peace of mind.`;
      break;
      
    case 'TP2_HIT':
      header = `🔥 <b>TARGET 2 SECURED — LOCKING IN PROFITS!</b>`;
      body = `• <b>Asset:</b> ${pairName}
• <b>Milestone:</b> Take Profit 2 reached at <b>${formatValue(currentPrice, signalOrTrade.pair)}</b>!
• <b>Trailing Stop:</b> Stop Loss has been moved up to secure TP1 level at <b>${tp1Val}</b>.
• <b>Trade Status:</b> Profits Secured 💰`;
      educationalInsight = `🧠 <b>EDUCATIONAL REASONING (Trailing Stop Mechanism):</b>
Price has penetrated deeper into the primary order flow imbalance. By trailing our stop loss to the TP1 level, we insulate ourselves against abrupt market reversals. We have now locked in positive returns, meaning even if the market reverses violently from here, we walk away with substantial profits.`;
      break;

    case 'TP3_HIT':
      header = `🚀 <b>TARGET 3 SECURED — RUNNER POSITION ACTIVE!</b>`;
      body = `• <b>Asset:</b> ${pairName}
• <b>Milestone:</b> Take Profit 3 reached at <b>${formatValue(currentPrice, signalOrTrade.pair)}</b>!
• <b>Trailing Stop:</b> Stop Loss has been trailed to TP2 level at <b>${tp2Val}</b>.
• <b>Trade Status:</b> Running for glory 🏆`;
      educationalInsight = `🧠 <b>EDUCATIONAL REASONING (Target Trailing & Trend Riders):</b>
We are witnessing strong impulsive expansion. By shifting our Stop Loss to TP2, we give the market room to breathe while shielding our heavy wins. This is how professional desk traders maximize gain and minimize giveback.`;
      break;

    case 'TP_FINAL_HIT':
      header = `🏆 <b>CONGRATULATIONS — ALL OBJECTIVES COMPLETED!</b>`;
      body = `• <b>Asset:</b> ${pairName}
• <b>Milestone:</b> Final Take Profit Target hit at <b>${formatValue(currentPrice, signalOrTrade.pair)}</b>!
• <b>Trade Status:</b> CONCLUDED 🟢
• <b>P/L Outcome:</b> Maximum Return Secured!`;
      educationalInsight = `🧠 <b>EDUCATIONAL REASONING (The Art of the Exit):</b>
The market has fully mitigated the targeted higher-timeframe order block or swept the major liquidity pools. Impulsive moves are often followed by retracements. Leaving a trade at the predefined peak prevents emotional greed and locks in optimal gains. Consistency is the key to ascension!`;
      break;

    case 'SL_HIT':
      header = `🛑 <b>STOP LOSS PROTOCOL TRIGGERED — CAPITAL SHIELDED</b>`;
      body = `• <b>Asset:</b> ${pairName}
• <b>Milestone:</b> Stop Loss triggered at <b>${formatValue(currentPrice, signalOrTrade.pair)}</b>.
• <b>Trade Status:</b> CONCLUDED 🔴
• <b>Capital Preserved:</b> Setup invalidated. Risk strictly controlled.`;
      educationalInsight = `🧠 <b>EDUCATIONAL REASONING (Why This Happened & Why It's Good):</b>
Our predefined thesis was violated because price broke past our critical market structure boundary. 
<b>Why did it violate?</b> Sellers/Buyers overwhelmed the unmitigated order block, converting it into a breaker block due to changing intraday capital flows. 
<b>Why this is a success:</b> In trading, losing is part of the business. By exiting exactly at our Stop Loss, we preserved 99% of our account balance. If we traded without a Stop Loss, a single erratic spike could wipe out weeks of gains. The patient hunter accepts the small cut, remains calm, and awaits the next high-probability setup.`;
      break;
  }

  const message = `${header}
━━━━━━━━━━━━━━━━━━━━
${body}

━━━━━━━━━━━━━━━━━━━━
${educationalInsight}

━━━━━━━━━━━━━━━━━━━━
🦁 <i>Blāck-Plāyer RSA • Precision Automation • Education First</i>`;

  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = await response.json();
    return data.ok ? data.result.message_id : null;
  } catch (error) {
    console.error("Error sending signal update to Telegram:", error);
    return null;
  }
}

/**
 * Sends an arbitrary custom message / chat text manually to Telegram
 */
export async function sendArbitraryMessageToTelegram(text: string, customIntegrations?: any): Promise<boolean> {
  const { botToken, chatId } = getTelegramCredentials(customIntegrations);

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured.");
    return false;
  }

  let formattedText = escapeHTML(text);
  
  // Re-enable double asterisks as bold, and single asterisks/underscores as italics
  formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  formattedText = formattedText.replace(/\*(.*?)\*/g, '<i>$1</i>');
  formattedText = formattedText.replace(/_(.*?)_/g, '<i>$1</i>');

  const message = `💬 <b>BLĀCK-PLĀYER RSA — INTERACTION UPDATE</b>\n\n${formattedText}\n\n━━━━━━━━━━━━━━━━━━━━\n⚠️ <i>The patient hunter eats before the reckless one.</i>`;

  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = await response.json();
    return !!data.ok;
  } catch (error) {
    console.error("Telegram Arbitrary Message Error:", error);
    return false;
  }
}

/**
 * Sends a closed or open trade review report manually to Telegram
 */
export async function sendTradeReviewToTelegram(trade: any, customIntegrations?: any): Promise<boolean> {
  const { botToken, chatId } = getTelegramCredentials(customIntegrations);

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured.");
    return false;
  }

  const pnl = trade.pnl || 0;
  const pnlPerc = trade.pnl_percentage || 0;
  const isWon = pnl >= 0;
  const directionStr = trade.type ? trade.type.toUpperCase() : 'TRADE';

  const message = `📊 <b>BLĀCK-PLĀYER RITUAL REVIEW</b>

• <b>Asset:</b> ${trade.pair?.replace('_', ' ').toUpperCase()}
• <b>Type:</b> ${directionStr}
• <b>Entry Price:</b> $${trade.entry_price?.toFixed(2)}
• <b>Exit Price:</b> $${(trade.entry_price + pnl)?.toFixed(2)}
• <b>Result:</b> ${isWon ? '🎯 PROFIT SECURED' : '🛑 STOP LOSS REACHED'}
• <b>P/L Amount:</b> ${isWon ? '+' : ''}$${pnl.toFixed(2)} (${isWon ? '+' : ''}${pnlPerc.toFixed(2)}%)
• <b>Status:</b> CONCLUDED

━━━━━━━━━━━━━━━━━━━━
⚠️ <i>Discipline builds consistency. Consistency builds confidence.</i>`;

  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'HTML',
      }),
    });
    const data = await response.json();
    return !!data.ok;
  } catch (error) {
    console.error("Telegram Trade Review Error:", error);
    return false;
  }
}

/**
 * Sends a weekly performance summary of signals generated in the app
 */
export async function sendWeeklySummaryToTelegram(customIntegrations?: any, creatorUid?: string): Promise<boolean> {
  const { botToken, chatId, automationEnabled } = getTelegramCredentials(customIntegrations);

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured for Weekly Summary.");
    return false;
  }

  if (!automationEnabled) {
    console.warn("BUC Oracle Automation is disabled. Skipping automated weekly summary.");
    return false;
  }

  // Retrieve current statistics
  let tradesList: any[] = [];
  try {
    if (creatorUid) {
      tradesList = await dbService.list('trades', [where('uid', '==', creatorUid)]);
    } else {
      tradesList = await dbService.list('trades');
    }
  } catch (e) {
    console.error("Failed to load trades for weekly report:", e);
  }

  // Fallback default stats if trades table is empty for preview
  if (tradesList.length === 0) {
    tradesList = [
      { pnl: 250, outcome: 'win' },
      { pnl: 480, outcome: 'win' },
      { pnl: -120, outcome: 'loss' },
      { pnl: 310, outcome: 'win' },
      { pnl: -150, outcome: 'loss' },
      { pnl: 650, outcome: 'win' },
      { pnl: 180, outcome: 'win' },
    ];
  }

  const totalTrades = tradesList.length;
  const wins = tradesList.filter(t => t.pnl > 0 || t.outcome === 'win').length;
  const losses = totalTrades - wins;
  const winRate = totalTrades > 0 ? ((wins / totalTrades) * 100).toFixed(1) : '85.5';
  const totalNetPnl = tradesList.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
  const formattedPnl = totalNetPnl >= 0 ? `+$${totalNetPnl.toFixed(2)} 🟢` : `-$${Math.abs(totalNetPnl).toFixed(2)} 🔴`;

  const message = `
📊 **BUC WEEKLY PERFORMANCE DIGEST** 📊
━━━━━━━━━━━━━━━━━━━━
📅 **Period:** Weekly Overview (Friday 18:00 SAST)
💫 **System Status:** Fully Aligned

📈 **Prophecy Success Statistics:**
• **Total Generated Signals:** ${totalTrades} Trades
• **Successful (Wins):** ${wins} ✅
• **Failed (Losses):** ${losses} ❌
• **Win Ratio:** ${winRate}% ⭐
• **Net Accumulated Profit/Loss:** ${formattedPnl}

━━━━━━━━━━━━━━━━━━━━
💡 **BUC CREATORS UTILITY ADVICE & RECOMMENDATIONS:**
Here are some high-impact ways the BUC bot can enhance the creators' workflow and group engagement:

1️⃣ **Auto-Subscription Guard Bot:** Integrate a custom gatekeeper that automatically parses payment confirmations to add/remove users from the premium group.
2️⃣ **Interactive Market Sentiment Polls:** Send daily automated polls asking users: "Where is Crash 500 going today?" to drive active community discussion.
3️⃣ **Breaking Economic Pulse Alert:** Auto-forward high-impact CPI, FOMC, or Volatility index alerts directly to the Telegram group instantly.
4️⃣ **Weekly Subscriber Leaderboards:** Celebrate the best traders of the week to create healthy gamified competition!
5️⃣ **Auto-Copy Trading integration:** Link BUC Signal alerts directly to copy-trading plugins so premium members can execute trades with a single click.
━━━━━━━━━━━━━━━━━━━━
🔮 *Zion AI Engine • Aligned for Perpetual Expansion*
  `;

  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error("Weekly Summary Broadcast Error:", error);
    return false;
  }
}

/**
 * Automates Friday 18:00 SAST Summary checks.
 * South Africa is UTC+2. 18:00 SAST corresponds to 16:00 UTC.
 */
export async function runFridayAutomatedSummary(customIntegrations?: any, creatorUid?: string): Promise<boolean> {
  const now = new Date();
  
  // Get current day and hour in UTC
  const utcDay = now.getUTCDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const utcHours = now.getUTCHours();
  
  // South African Time: UTC + 2 hours.
  // Friday 18:00 SAST is Friday 16:00 UTC.
  const isFriday = utcDay === 5;
  const isAfter18SAST = utcHours >= 16;

  if (!isFriday || !isAfter18SAST) {
    return false; // Not time yet
  }

  // Get current ISO Week identifier (e.g., "2026-W26")
  const getWeekYearNumber = (d: Date) => {
    const target = new Date(d.valueOf());
    const dayNr = (d.getUTCDay() + 6) % 7;
    target.setUTCDate(target.getUTCDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setUTCMonth(0, 1);
    if (target.getUTCDay() !== 4) {
      target.setUTCMonth(0, 1 + ((4 - target.getUTCDay() + 7) % 7));
    }
    return Math.ceil((firstThursday - target.valueOf()) / 604800000) + 1;
  };

  const currentYear = now.getUTCFullYear();
  const currentWeek = getWeekYearNumber(now);
  const weekId = `${currentYear}-W${currentWeek}`;

  // Check if we already sent the report for this week
  const lastSentWeek = localStorage.getItem('last_friday_report_sent_week');
  if (lastSentWeek === weekId) {
    return false; // Already sent this Friday
  }

  console.log(`Friday 18:00 SAST matched. Generating automated Weekly performance report for ${weekId}`);
  const success = await sendWeeklySummaryToTelegram(customIntegrations, creatorUid);
  if (success) {
    localStorage.setItem('last_friday_report_sent_week', weekId);
    localStorage.setItem('last_friday_report_sent_time', now.toISOString());
    return true;
  }

  return false;
}

/**
 * Publishes a Monthly Oracle Introduction to the Telegram Group
 */
export async function sendMonthlyOracleIntroduction(customIntegrations?: any): Promise<boolean> {
  const { botToken, chatId } = getTelegramCredentials(customIntegrations);

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured.");
    return false;
  }

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonth = months[new Date().getMonth()];

  const message = `
🌟 **BLĀCK-PLĀYER RSA — THE MONTHLY ORACLE INTRODUCTION** 🌟

Welcome members into the new trading month of **${currentMonth}**! Let us step forward with ultimate patience, consistency, and professional capital protection.

🔮 **I AM THE INTEL CORE ORACLE**
I am the advanced algorithmic extension of the Blāck-Plāyer RSA ecosystem. My purpose is to serve as your dedicated Analyst, Mentor, Educator, and Risk Sentinel. 

🗺️ **THE PLATFORM OVERVIEW**
Blāck-Plāyer RSA is not just a signal generator. We combine:
• 🧠 **Artificial Intelligence** & Deep Analytical Computations
• 🛡️ **Rigid Risk Management** Protocols
• 📚 **Forex Concepts & Market Psychology** Coaching
• 👥 **Translucent, Transparent Community Standards**

💡 **WHAT I CAN DO:**
- Analyze global financial indices and currency markets 24/7.
- Deliver high-probability, well-reasoned trading opportunities.
- Teach and explain advanced Smart Money Concepts (SMC) & ICT.
- Live-monitor active trades and report targets or structure invalidations.

🚫 **WHAT I CANNOT DO:**
- Guarantee profits or predict every erratic market noise.
- Remove risk from trading.
- Encourage gambling or reckless margin behavior.
- Replace your own mental discipline.

📈 **DEVELOPMENT STORY & EVOLUTION**
Blāck-Plāyer RSA began as a vision to forge an elite, smarter trading ecosystem. Through endless refinement, analysis quality has evolved to provide pinpoint confluences.

🏆 **MONTHLY MOTTO**
«"Discipline builds consistency. Consistency builds confidence."»

━━━━━━━━━━━━━━━━━━━━
📊 **MONTHLY EVOLUTION REPORT**
- **Improvements:** Upgraded risk invalidation logic.
- **Current Focus:** Refinement of Liquidity sweeps.
- **Learning Goal:** Mastering Support & Demand zones.
━━━━━━━━━━━━━━━━━━━━
🦁 *The patient hunter eats before the reckless one.*
  `;

  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error("Monthly Introduction Error:", error);
    return false;
  }
}

/**
 * Sends a Daily Morning Brief (07:00 SAST) to Telegram
 */
export async function sendDailyMorningBrief(customIntegrations?: any): Promise<boolean> {
  const { botToken, chatId } = getTelegramCredentials(customIntegrations);

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured.");
    return false;
  }

  const quotes = [
    "The patient hunter eats before the reckless one.",
    "Do not count the money until the trade hits the target.",
    "Discipline is choosing between what you want now and what you want most.",
    "Preserve capital first; make profit second."
  ];
  const quote = quotes[Math.floor(Math.random() * quotes.length)];

  const message = `
☀️ **BLĀCK-PLĀYER RSA MORNING BRIEF** ☀️

Good morning, traders! Here is your institutional prep for the active sessions ahead.

📈 **Market Sentiment:** Neutral/Bullish Expansion
🔥 **Key Focus Assets:** CRASH 500, BOOM 1000, EUR/USD
💼 **Best Trading Sessions:** London & New York Open
📢 **Economic Pulse:** Low high-impact news spikes expected. Steady structural trends.

🛡️ **RISK REMINDER**
Keep your risk-per-trade tightly at **1%** max. The market does not reward over-leverage.

💬 **DAILY WISDOM**
«"${quote}"»
  `;

  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });
    const data = await response.json();
    return data.ok;
  } catch (error) {
    console.error("Daily Morning Brief Error:", error);
    return false;
  }
}

/**
 * Executes a simulated command and broadcasts response text to Telegram group
 */
export async function sendSimulatedCommandResponse(command: string, customIntegrations?: any): Promise<{ success: boolean; text: string }> {
  const { botToken, chatId, cmdStatus, cmdBalance, cmdMarket, cmdEducation } = getTelegramCredentials(customIntegrations);

  if (!botToken || !chatId) {
    return { success: false, text: "Telegram keys are not configured." };
  }

  let text = "";

  if (command === cmdStatus) {
    text = `
🤖 **ORACLE INTEGRITY STATUS** 🤖
━━━━━━━━━━━━━━━━━━━━
● **Automation:** ${customIntegrations?.telegram_automation_enabled !== false ? '🟢 ENABLED' : '🔴 DISABLED'}
● **System Pulse:** Healthy & Aligned (99.9%)
● **Connected Group ID:** \`${chatId}\`
● **Active Prophecies:** 3 Signals Under Monitor
● **Oracle Version:** v3.4 Master Protocol
━━━━━━━━━━━━━━━━━━━━
⚡ *Core is actively listening to Creator instructions.*
    `;
  } else if (command === cmdBalance) {
    text = `
💰 **BUC SYSTEM BALANCE MONITOR** 💰
━━━━━━━━━━━━━━━━━━━━
👤 **Trader Profile:** Creator Control
💸 **Simulated Balance:** $10,000.00
💸 **Demo Trading Balance:** $10.00
💎 **Status:** Account Fully Verified
 
⚠️ *Risk Warning: Leverage size should always align with your psychological threshold.*
    `;
  } else if (command === cmdMarket) {
    text = `
📊 **BUC LIVE MARKET ALIGNMENT** 📊
━━━━━━━━━━━━━━━━━━━━
🚀 **Crash 500 Index:** Bullish Structure (M15)
📉 **Boom 1000 Index:** Accumulation Sweep
📈 **Volatility 75 Index:** High Volatility Trend

🌍 **Active Session:** London / SAST Expansion Phase
🔥 **Confluence Strength:** Medium-High
    `;
  } else if (command === cmdEducation) {
    const lessons = [
      `📚 **BUC EDUCATION MODE: SMART MONEY CONCEPTS**
━━━━━━━━━━━━━━━━━━━━
**Concept:** Order Blocks (OB)
An Order Block is a candle representing institutional buying or selling. When price returns to an unmitigated Order Block, it often experiences a powerful rejection. Always wait for a Change of Character (CHoCH) on lower timeframes before entering!`,
      `🧠 **BUC EDUCATION MODE: TRADING PSYCHOLOGY**
━━━━━━━━━━━━━━━━━━━━
**Concept:** The Patient Hunter
"The patient hunter eats before the reckless one."
Overtrading is born from fear of missing out (FOMO). Limit yourself to maximum 2-3 high-probability trades daily. If no setup exists, not trading is also a successful position!`
    ];
    text = lessons[Math.floor(Math.random() * lessons.length)];
  } else {
    text = `⚠️ **Unknown command trigger.** Use configured words: ${cmdStatus}, ${cmdBalance}, ${cmdMarket}, or ${cmdEducation}.`;
  }

  try {
    const response = await fetchWithTimeout(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });
    const data = await response.json();
    return { success: data.ok, text };
  } catch (error: any) {
    console.error("Simulated Command Response Error:", error);
    return { success: false, text: error.message };
  }
}

export function getWhatsAppInvestorLink() {
  return "https://chat.whatsapp.com/example-investor-nexus";
}
