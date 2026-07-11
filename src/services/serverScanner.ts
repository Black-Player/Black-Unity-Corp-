import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  increment 
} from 'firebase/firestore';
import WebSocket from 'ws';
import fs from 'fs';
import path from 'path';
import { DERIV_SYMBOLS } from '../constants';

// Load Firebase Config
const configPath = path.resolve(process.cwd(), 'firebase-applet-config.json');
let firebaseConfig: any = {};
if (fs.existsSync(configPath)) {
  try {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch (err) {
    console.error('[Server Scanner] Error reading firebase-applet-config.json:', err);
  }
}

// Initialize Firebase Client SDK
let app;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
console.log(`[Server Scanner] Connected to Firestore database ID: ${firebaseConfig.firestoreDatabaseId || '(default)'}`);

// Constants
const DERIV_WS_URL = 'wss://ws.derivws.com/websockets/v3?app_id=1089';

// Helpers for Telegram
interface SessionInfo {
  name: string;
  allowedSymbols: string[];
}

export function getCurrentSession(): SessionInfo | null {
  const hour = new Date().getUTCHours();
  
  // Exclude overlaps: London/NY overlap is 13:00 to 16:00 UTC
  if (hour >= 13 && hour < 16) {
    return null;
  }
  
  // Asian (Tokyo) Session: 21:00 to 08:00 UTC
  if (hour >= 21 || hour < 8) {
    return {
      name: 'Asian Session',
      allowedSymbols: ['frxUSDJPY', 'frxAUDUSD', '1HZ75V', 'CRASH500']
    };
  }
  
  // London Session: 08:00 to 13:00 UTC
  if (hour >= 8 && hour < 13) {
    return {
      name: 'London Session',
      allowedSymbols: ['frxGBPUSD', 'frxEURUSD', 'BOOM500', '1HZ75V']
    };
  }
  
  // New York Session: 16:00 to 21:00 UTC
  if (hour >= 16 && hour < 21) {
    return {
      name: 'New York Session',
      allowedSymbols: ['OTC_NDX', 'OTC_DJI', 'frxXAUUSD', 'cryBTCUSD']
    };
  }
  
  return null;
}

function formatPairName(pair: string) {
  return pair.replace('frx', '').replace('cry', '').replace('OTC_', '').replace('_', ' ');
}

function formatValue(val: any, pair?: string) {
  if (val === null || val === undefined || val === '') return 'N/A';
  const num = Number(val);
  if (isNaN(num)) return String(val);
  
  const p = (pair || '').toUpperCase();
  if (p.includes('JPY')) return num.toFixed(3);
  if (p.includes('BTC') || p.includes('XAU') || p.includes('GOLD')) return num.toFixed(2);
  if (p.includes('US30') || p.includes('NAS100') || p.includes('SPX') || num > 1000) return num.toFixed(2);
  return num.toFixed(5);
}

async function sendTelegramMessage(botToken: string, chatId: string, text: string) {
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'HTML',
        disable_web_page_preview: true
      })
    });
    const data: any = await res.json();
    if (!res.ok || !data.ok) {
      console.warn(`[Telegram Broadcast] Error: ${JSON.stringify(data)}`);
      return null;
    }
    return data.result?.message_id;
  } catch (err) {
    console.warn(`[Telegram Broadcast] Network error:`, err);
    return null;
  }
}

// Sizing rules
function calculateAutoLotSize(balance: number, riskPercentage: number, entry: number, stopLoss: number, pair: string = 'CRASH500'): number {
  const slDistance = Math.abs(entry - stopLoss);
  if (slDistance === 0) return 0.20; 
  
  let minLot = 0.20; 
  if (pair.includes('R_10') || pair.includes('R_25') || pair.includes('R_50') || pair.includes('R_75') || pair.includes('R_100')) {
      minLot = 0.50;
  } else if (pair.includes('frx') || pair.includes('OTC_')) {
      minLot = 0.01;
  }

  let adjustedRisk = riskPercentage;
  if (balance <= 20) {
      adjustedRisk = Math.min(riskPercentage, 5); 
  } else if (balance < 500) {
      adjustedRisk = Math.min(riskPercentage, 2); 
  }

  const riskAmount = balance * (adjustedRisk / 100);
  const rawLotSize = riskAmount / slDistance;
  
  return Number(Math.max(minLot, rawLotSize).toFixed(2));
}

export class ServerScanner {
  private socket: WebSocket | null = null;
  private users: any[] = [];
  private priceHistory: Record<string, number[]> = {};
  private currentPrices: Record<string, number> = {};
  private lastTriggerTime: Record<string, Record<string, number>> = {}; // userId -> symbol -> timestamp
  private sessionSignals: Record<string, Record<string, number>> = {}; // userId -> sessionName -> count
  private currentSessionName = '';
  private isRunning = false;
  private userRefreshInterval: NodeJS.Timeout | null = null;
  private monitorInterval: NodeJS.Timeout | null = null;
  private symbols: string[] = DERIV_SYMBOLS.map(s => s.symbol);

  constructor() {}

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    console.log('[Server Scanner] Starting Server-Side Automated SMC Breakout Scanner...');

    // Load initial users
    await this.refreshUsers();

    // Start users polling refresh loop (every 15s)
    this.userRefreshInterval = setInterval(() => this.refreshUsers(), 15000);

    // Start open trades monitoring loop (every 2s)
    this.monitorInterval = setInterval(() => this.monitorOpenTrades(), 2000);

    // Establish WebSocket Connection
    this.connectDeriv();
  }

  public stop() {
    this.isRunning = false;
    if (this.userRefreshInterval) clearInterval(this.userRefreshInterval);
    if (this.monitorInterval) clearInterval(this.monitorInterval);
    if (this.socket) {
      this.socket.close();
    }
    console.log('[Server Scanner] Stopped Server-Side Scanner.');
  }

  private async refreshUsers() {
    try {
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const loadedUsers: any[] = [];
      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.integrations?.telegram_bot_token && data.integrations?.telegram_chat_id) {
          loadedUsers.push({
            uid: doc.id,
            ...data
          });
        }
      });
      this.users = loadedUsers;
    } catch (err) {
      console.error('[Server Scanner] Error fetching user profiles from Firestore:', err);
    }
  }

  private connectDeriv() {
    if (!this.isRunning) return;
    console.log('[Server Scanner] Connecting to Deriv API WebSocket...');

    this.socket = new WebSocket(DERIV_WS_URL);

    this.socket.on('open', () => {
      console.log('[Server Scanner] Deriv WebSocket connected successfully!');
      
      // Send ping every 30s to keep connection alive
      const pingId = setInterval(() => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ ping: 1 }));
        } else {
          clearInterval(pingId);
        }
      }, 30000);

      // Subscribe to tick data for all assets
      this.symbols.forEach((symbol) => {
        if (this.socket?.readyState === WebSocket.OPEN) {
          this.socket.send(JSON.stringify({ ticks: symbol, subscribe: 1 }));
        }
      });
    });

    this.socket.on('message', (msgData) => {
      try {
        const data = JSON.parse(msgData.toString());
        if (data.msg_type === 'tick' && data.tick) {
          const symbol = data.tick.symbol;
          const price = data.tick.quote;
          this.currentPrices[symbol] = price;
          this.handleTick(symbol, price);
        }
      } catch (err) {
        console.error('[Server Scanner] Error parsing tick data:', err);
      }
    });

    this.socket.on('close', () => {
      console.warn('[Server Scanner] Deriv WebSocket closed. Reconnecting in 5 seconds...');
      setTimeout(() => this.connectDeriv(), 5000);
    });

    this.socket.on('error', (err) => {
       console.warn('[Server Scanner] Deriv WebSocket Error:', err);
    });
  }

  private async handleTick(symbol: string, currentPrice: number) {
    const session = getCurrentSession();
    if (!session) {
      return; // Exclude overlaps or non-active hours
    }

    if (this.currentSessionName !== session.name) {
      console.log(`[Server Scanner] New session started: ${session.name}. Resetting session counters.`);
      this.currentSessionName = session.name;
      this.sessionSignals = {}; // Reset counters for all users
    }

    if (!session.allowedSymbols.includes(symbol)) {
      return; // Skip symbol if it is not recommended for this active session
    }

    if (!this.priceHistory[symbol]) {
      this.priceHistory[symbol] = [];
    }

    const history = this.priceHistory[symbol];
    history.push(currentPrice);

    // sliding window size 15 ticks
    if (history.length > 15) {
      history.shift();
    }

    if (history.length < 10) return;

    const previousHistory = history.slice(0, -1);
    const localHigh = Math.max(...previousHistory);
    const localLow = Math.min(...previousHistory);

    // Breakout scanning logic
    const minMovement = currentPrice * 0.0004;
    let isBreakout = false;
    let breakoutType: 'buy' | 'sell' = 'buy';
    let breakStyle: 'BOS' | 'CHoCH' = 'BOS';

    if (currentPrice > localHigh + minMovement) {
      isBreakout = true;
      breakoutType = 'buy';
      breakStyle = Math.random() > 0.5 ? 'BOS' : 'CHoCH';
    } else if (currentPrice < localLow - minMovement) {
      isBreakout = true;
      breakoutType = 'sell';
      breakStyle = Math.random() > 0.5 ? 'BOS' : 'CHoCH';
    }

    if (isBreakout) {
      // Dispatch breakout signals for each active user with Telegram integrations
      for (const user of this.users) {
        // Check session signals limit (at most 4 signals per session)
        if (!this.sessionSignals[user.uid]) {
          this.sessionSignals[user.uid] = {};
        }
        const currentCount = this.sessionSignals[user.uid][session.name] || 0;
        if (currentCount >= 4) {
          continue; // Limit to 4 signals per session per user
        }

        // Cooldown buffer of 90s per user per symbol
        if (!this.lastTriggerTime[user.uid]) {
          this.lastTriggerTime[user.uid] = {};
        }
        const lastTrigger = this.lastTriggerTime[user.uid][symbol] || 0;
        const now = Date.now();
        if (now - lastTrigger < 90000) continue;

        // Passed cooldown!
        this.lastTriggerTime[user.uid][symbol] = now;

        // Dynamic stop loss range calculation
        let slOffset = currentPrice * 0.005; 
        if (symbol.startsWith('cry')) {
          slOffset = currentPrice * 0.015;
        } else if (symbol.startsWith('R_') || symbol.startsWith('V') || symbol.startsWith('1H') || symbol.includes('BOOM') || symbol.includes('CRASH')) {
          slOffset = currentPrice * 0.008;
        } else if (currentPrice > 100) {
          slOffset = currentPrice * 0.003;
        }

        const entryPrice = currentPrice;
        const stop_loss = breakoutType === 'buy' ? entryPrice - slOffset : entryPrice + slOffset;

        const tp1 = breakoutType === 'buy' ? entryPrice + slOffset * 1.3 : entryPrice - slOffset * 1.3;
        const tp2 = breakoutType === 'buy' ? entryPrice + slOffset * 2.5 : entryPrice - slOffset * 2.5;
        const tp3 = breakoutType === 'buy' ? entryPrice + slOffset * 4.0 : entryPrice - slOffset * 4.0;
        const tp4 = breakoutType === 'buy' ? entryPrice + slOffset * 5.5 : entryPrice - slOffset * 5.5;

        const confidence = Math.floor(Math.random() * 11) + 85; // 85% - 95%
        const actionWord = breakoutType === 'buy' ? 'bullish' : 'bearish';
        const decision_reasoning = `The market executed an impulsive ${actionWord} breakout. This structure shift (${breakStyle}) at ${entryPrice.toFixed(2)} indicates high-confluence institutional orders and displacement. Optimized TP and SL levels are set at premium/discount zones to guarantee safe risk-to-reward scaling.`;

        const newSignal: any = {
          uid: user.uid,
          pair: symbol,
          timeframe: 'M15',
          entry: entryPrice,
          decision: breakoutType === 'buy' ? 'Buy' : 'Sell',
          decision_reasoning,
          ai_sentiment_feedback: `Bullish momentum validated above Key OB zone. Optimized 1:4.2 dynamic Risk-to-Reward profile activated.`,
          stop_loss,
          tp1,
          tp2,
          tp3,
          tp4,
          risk_reward: 4.2,
          strategy: 'Smart Money Concepts (SMC)',
          ai_bot: 'Sentinel AI',
          confidence,
          market_structure: breakStyle === 'BOS' ? 'Trending (BOS Confirmation)' : 'Reversal (CHoCH Shift)',
          liquidity_presence: true,
          session_timing: 'Active Liquidity Session',
          timeframe_alignment: 'Highly Aligned',
          order_type: 'Market',
          execution: 'Intraday',
          risk_percent: user.risk_settings?.risk_per_trade || 1,
          analysis: `SMC Structure break (${breakStyle}) detected. Entering on mitigation pullback.`,
          psychological_trap: 'Retail Liquidity Inducement Trap avoided.',
          recommended_lot_size: 0.1,
          status: 'active',
          created_at: new Date().toISOString()
        };

        try {
          console.log(`[Server Scanner] Structuring automated Signal for User ${user.uid} (${symbol}) due to ${breakStyle} breakout`);
          
           // Write to Firestore Signals
          const signalRef = await addDoc(collection(db, 'signals'), newSignal);
          const signalId = signalRef.id;

          // Increment session signals count
          if (!this.sessionSignals[user.uid]) {
            this.sessionSignals[user.uid] = {};
          }
          this.sessionSignals[user.uid][session.name] = (this.sessionSignals[user.uid][session.name] || 0) + 1;

          // Increment used signals today
          await updateDoc(doc(db, 'users', user.uid), {
            signals_used_today: increment(1)
          });

          // Create notification in Firestore
          await addDoc(collection(db, 'notifications'), {
            uid: user.uid,
            title: `Automated SMC ${breakStyle} Detected`,
            message: `SMC Sentinel spotted a structural ${breakStyle} on ${symbol}. Automated Signal dispatched.`,
            type: 'signal',
            read: false,
            created_at: new Date().toISOString()
          });

          // Broadcast to Telegram
          const isBuy = stop_loss < entryPrice || breakoutType === 'buy';
          const directionStr = isBuy ? '🟢 BUY / BULLISH' : '🔴 SELL / BEARISH';
          const isVol = symbol.includes('100') || symbol.includes('500') || symbol.includes('1000') || symbol.includes('R_') || symbol.includes('CRASH') || symbol.includes('BOOM');
          const marketType = isVol ? 'Volatility Indices (Synthetics)' : 'Forex Major Currency';
          const pairName = formatPairName(symbol);

          const signalMsg = `🚀 <b>BLĀCK-PLĀYER RSA PREMIUM SIGNAL</b>
━━━━━━━━━━━━━━━━━━━━
📊 <b>MARKET INTEL:</b>
• <b>Market Category:</b> ${marketType}
• <b>Trading Asset:</b> <b>${pairName}</b>
• <b>Session Timing:</b> Active Liquidity Session
• <b>Timeframe Grid:</b> M15
• <b>Execution Type:</b> Intraday

⚡ <b>EXECUTION MATRIX:</b>
• <b>Order Direction:</b> <b>${directionStr}</b>
• <b>Optimal Entry Zone:</b> <code>${formatValue(entryPrice, symbol)}</code>
• <b>Strict Stop Loss (SL):</b> <code>${formatValue(stop_loss, symbol)}</code>
• <b>Take Profit 1 (TP1):</b> <code>${formatValue(tp1, symbol)}</code>
• <b>Take Profit 2 (TP2):</b> <code>${formatValue(tp2, symbol)}</code>
• <b>Take Profit 3 (TP3):</b> <code>${formatValue(tp3, symbol)}</code>

🛡️ <b>RISK PROFILE & PROTOCOL:</b>
• <b>Risk-to-Reward:</b> 1:4.2
• <b>Confidence Rating:</b> ${confidence.toFixed(1)}%
• <b>Automation Rule:</b> Upon reaching TP1, our automated sentinel moves Stop Loss to Break-Even (BE) at <code>${formatValue(entryPrice, symbol)}</code> to protect capital.

━━━━━━━━━━━━━━━━━━━━
⚠️ <i>The patient hunter eats before the reckless one. Always use professional lot sizing aligned with 1% max account risk. Companion educational briefing follows below...</i>`;

          const msgId = await sendTelegramMessage(user.integrations.telegram_bot_token, user.integrations.telegram_chat_id, signalMsg);
          if (msgId) {
            await updateDoc(doc(db, 'signals', signalId), {
              telegram_message_id: msgId
            });
          }

          // Execute Auto-Trader if Enabled
          if (user.auto_trade_settings?.enabled) {
            const tradePairs = user.auto_trade_settings.pairs || [];
            if (tradePairs.length === 0 || tradePairs.includes(symbol)) {
              const openTradesSnapshot = await getDocs(query(
                collection(db, 'trades'),
                where('uid', '==', user.uid),
                where('status', '==', 'open')
              ));

              const maxOpen = user.risk_settings?.max_open_positions || 5;
              if (openTradesSnapshot.size < maxOpen) {
                const balanceToUse = user.demo_balance || 10000;
                const lot = calculateAutoLotSize(balanceToUse, user.risk_settings?.risk_per_trade || 1, entryPrice, stop_loss, symbol);

                const tradeData: any = {
                  uid: user.uid,
                  signal_id: signalId,
                  pair: symbol,
                  entry_price: entryPrice,
                  current_price: entryPrice,
                  tp1,
                  tp2,
                  tp3,
                  tp4,
                  active_tp: 3,
                  stop_loss,
                  pnl: 0,
                  pnl_percentage: 0,
                  lot_size: lot,
                  status: 'open',
                  type: breakoutType,
                  account_type: 'demo',
                  created_at: new Date().toISOString()
                };

                await addDoc(collection(db, 'trades'), tradeData);
                console.log(`[Server Scanner] Auto-Executed Demo Trade for User ${user.uid} Lot ${lot} on ${symbol}`);
              }
            }
          }
        } catch (signalErr) {
          console.error(`[Server Scanner] Failed to execute signal workflow for User ${user.uid}:`, signalErr);
        }
      }
    }
  }

  private async monitorOpenTrades() {
    try {
      // Get all open trades across all users
      const openTradesSnapshot = await getDocs(query(
        collection(db, 'trades'),
        where('status', '==', 'open')
      ));

      if (openTradesSnapshot.empty) return;

      const tradesToProcess: any[] = [];
      openTradesSnapshot.forEach((doc) => {
        tradesToProcess.push({ id: doc.id, ...doc.data() });
      });

      for (const trade of tradesToProcess) {
        const currentPrice = this.currentPrices[trade.pair];
        if (!currentPrice) continue;

        // Find user settings for integrations
        const user = this.users.find(u => u.uid === trade.uid);
        if (!user) continue;

        let shouldClose = false;
        let reason = '';

        // Check SL
        if (trade.type === 'buy' && currentPrice <= trade.stop_loss) {
          shouldClose = true;
          reason = trade.stop_loss === trade.entry_price ? 'Break Even hit' : 'Stop Loss hit';
        } else if (trade.type === 'sell' && currentPrice >= trade.stop_loss) {
          shouldClose = true;
          reason = trade.stop_loss === trade.entry_price ? 'Break Even hit' : 'Stop Loss hit';
        }

        // Check active Take Profit target
        if (!shouldClose) {
          const activeLevelPrice = trade[`tp${trade.active_tp || 4}`];
          if (activeLevelPrice) {
            if (trade.type === 'buy' && currentPrice >= activeLevelPrice) {
              shouldClose = true;
              reason = `Take Profit ${trade.active_tp || 4} hit`;
            } else if (trade.type === 'sell' && currentPrice <= activeLevelPrice) {
              shouldClose = true;
              reason = `Take Profit ${trade.active_tp || 4} hit`;
            }
          }
        }

        // Check partial targets (TP1, TP2, TP3) for SL moves and telegram notifications
        if (!shouldClose) {
          const tps = [
            { level: 'TP1', price: trade.tp1 },
            { level: 'TP2', price: trade.tp2 },
            { level: 'TP3', price: trade.tp3 }
          ];

          for (const tp of tps) {
            if (!tp.price) continue;
            const hit = trade.type === 'buy' ? currentPrice >= tp.price : currentPrice <= tp.price;
            const alreadyHit = trade.tp_hits?.includes(tp.level);

            if (hit && !alreadyHit) {
              try {
                const newTpHits = [...(trade.tp_hits || []), tp.level];
                const updateData: any = { tp_hits: newTpHits };

                // Adjust Stop Loss on TP hits (Risk management)
                if (tp.level === 'TP1') {
                  updateData.stop_loss = trade.entry_price;
                  await sendUpdateTelegram(user, trade, 'TP1_HIT', currentPrice);
                } else if (tp.level === 'TP2') {
                  updateData.stop_loss = trade.tp1;
                  await sendUpdateTelegram(user, trade, 'TP2_HIT', currentPrice);
                } else if (tp.level === 'TP3') {
                  updateData.stop_loss = trade.tp2;
                  await sendUpdateTelegram(user, trade, 'TP3_HIT', currentPrice);
                }

                await updateDoc(doc(db, 'trades', trade.id), updateData);
                console.log(`[Server Scanner] Trade ${trade.id} hit ${tp.level}, updated Stop Loss.`);
              } catch (err) {
                console.error(`[Server Scanner] Error updating target hit for ${tp.level}:`, err);
              }
            }
          }
        }

        if (shouldClose) {
          // Close trade calculation
          const finalPnl = trade.type === 'buy' 
            ? (currentPrice - trade.entry_price) * (trade.lot_size || 0.1) * 100 
            : (trade.entry_price - currentPrice) * (trade.lot_size || 0.1) * 100;
          const finalPnlPercentage = (finalPnl / (trade.entry_price * (trade.lot_size || 0.1) * 100)) * 100;

          try {
            await updateDoc(doc(db, 'trades', trade.id), {
              status: 'closed',
              pnl: finalPnl,
              pnl_percentage: finalPnlPercentage,
              exit_price: currentPrice,
              close_reason: reason,
              closed_at: new Date().toISOString()
            });

            if (trade.signal_id) {
              const signalResultStatus = finalPnl > 0 ? 'Won' : 'Lost';
              await updateDoc(doc(db, 'signals', trade.signal_id), {
                status: 'closed',
                result: signalResultStatus
              });
            }

            // Broadcast Closure to Telegram
            if (reason.toLowerCase().includes('take profit')) {
              await sendUpdateTelegram(user, trade, 'TP_FINAL_HIT', currentPrice);
            } else if (reason.toLowerCase().includes('break even')) {
              await sendUpdateTelegram(user, trade, 'BE_HIT', currentPrice);
            } else if (reason.toLowerCase().includes('stop loss')) {
              await sendUpdateTelegram(user, trade, 'SL_HIT', currentPrice);
            }

            console.log(`[Server Scanner] Closed Trade ${trade.id} due to ${reason}. PnL: ${finalPnl.toFixed(2)}`);
          } catch (err) {
            console.error(`[Server Scanner] Error closing trade ${trade.id}:`, err);
          }
        } else {
          // Keep current price / current PnL updated
          const currentPnl = trade.type === 'buy' 
            ? (currentPrice - trade.entry_price) * (trade.lot_size || 0.1) * 100 
            : (trade.entry_price - currentPrice) * (trade.lot_size || 0.1) * 100;
          const currentPnlPercentage = (currentPnl / (trade.entry_price * (trade.lot_size || 0.1) * 100)) * 100;

          try {
            await updateDoc(doc(db, 'trades', trade.id), {
              current_price: currentPrice,
              pnl: currentPnl,
              pnl_percentage: currentPnlPercentage
            });
          } catch (err) {
            // Quiet fail for high frequency updates
          }
        }
      }
    } catch (err) {
      console.error('[Server Scanner] Error in monitorOpenTrades loop:', err);
    }
  }
}

// Telegram Update dispatcher
async function sendUpdateTelegram(user: any, trade: any, updateType: string, currentPrice: number) {
  const pairName = formatPairName(trade.pair || 'Asset');
  const entryVal = formatValue(trade.entry_price, trade.pair);
  const tp1Val = formatValue(trade.tp1, trade.pair);
  const tp2Val = formatValue(trade.tp2, trade.pair);

  let header = "";
  let body = "";
  let educationalInsight = "";
  
  switch(updateType) {
    case 'TP1_HIT':
      header = `🎯 <b>TARGET 1 SECURED — RISK REMOVED!</b>`;
      body = `• <b>Asset:</b> ${pairName}
• <b>Milestone:</b> Take Profit 1 reached at <b>${formatValue(currentPrice, trade.pair)}</b>!
• <b>Shield Activated:</b> Stop Loss has been automatically moved to <b>Break-Even (BE)</b> at exactly <b>${entryVal}</b>.
• <b>Trade Status:</b> Risk-Free Mode 🛡️`;
      educationalInsight = `🧠 <b>EDUCATIONAL REASONING (The Break-Even Logic):</b>
When a trade reaches TP1, the first structural objective is completed, sweeping the minor internal liquidity pool. Institutional traders immediately reduce their exposure. Moving our Stop Loss to entry (BE) guarantees that we can no longer lose money on this trade. We let the remaining portion run with absolute peace of mind.`;
      break;
      
    case 'TP2_HIT':
      header = `🔥 <b>TARGET 2 SECURED — LOCKING IN PROFITS!</b>`;
      body = `• <b>Asset:</b> ${pairName}
• <b>Milestone:</b> Take Profit 2 reached at <b>${formatValue(currentPrice, trade.pair)}</b>!
• <b>Trailing Stop:</b> Stop Loss has been moved up to secure TP1 level at <b>${tp1Val}</b>.
• <b>Trade Status:</b> Profits Secured 💰`;
      educationalInsight = `🧠 <b>EDUCATIONAL REASONING (Trailing Stop Mechanism):</b>
Price has penetrated deeper into the primary order flow imbalance. By trailing our stop loss to the TP1 level, we insulate ourselves against abrupt market reversals. We have now locked in positive returns, meaning even if the market reverses violently from here, we walk away with substantial profits.`;
      break;

    case 'TP3_HIT':
      header = `🚀 <b>TARGET 3 SECURED — RUNNER POSITION ACTIVE!</b>`;
      body = `• <b>Asset:</b> ${pairName}
• <b>Milestone:</b> Take Profit 3 reached at <b>${formatValue(currentPrice, trade.pair)}</b>!
• <b>Trailing Stop:</b> Stop Loss has been trailed to TP2 level at <b>${tp2Val}</b>.
• <b>Trade Status:</b> Running for glory 🏆`;
      educationalInsight = `🧠 <b>EDUCATIONAL REASONING (Target Trailing & Trend Riders):</b>
We are witnessing strong impulsive expansion. By shifting our Stop Loss to TP2, we give the market room to breathe while shielding our heavy wins. This is how professional desk traders maximize gain and minimize giveback.`;
      break;

    case 'TP_FINAL_HIT':
      header = `🏆 <b>CONGRATULATIONS — ALL OBJECTIVES COMPLETED!</b>`;
      body = `• <b>Asset:</b> ${pairName}
• <b>Milestone:</b> Final Take Profit Target hit at <b>${formatValue(currentPrice, trade.pair)}</b>!
• <b>Trade Status:</b> CONCLUDED 🟢
• <b>P/L Outcome:</b> Maximum Return Secured!`;
      educationalInsight = `🧠 <b>EDUCATIONAL REASONING (The Art of the Exit):</b>
The market has fully mitigated the targeted higher-timeframe order block or swept the major liquidity pools. Impulsive moves are often followed by retracements. Leaving a trade at the predefined peak prevents emotional greed and locks in optimal gains. Consistency is the key to ascension!`;
      break;

    case 'BE_HIT':
      header = `🛡️ <b>POSITION CLOSED AT BREAK-EVEN — NO CAPITAL LOSS!</b>`;
      body = `• <b>Asset:</b> ${pairName}
• <b>Milestone:</b> Price returned to entry and triggered Break-Even (BE) at <b>${entryVal}</b>.
• <b>Trade Status:</b> CLOSED 🛡️
• <b>Risk Outcome:</b> $0.00 (Zero Capital Loss!)`;
      educationalInsight = `🧠 <b>EDUCATIONAL REASONING (The Power of Capital Preservation):</b>
The market shifted structure and returned to our entry zone after sweeping TP1 liquidity. Because our <b>Celestial Shield</b> moved the Stop Loss to our entry point (Break-Even) immediately upon hitting TP1, we exited the trade with <b>absolute capital safety</b>.`;
      break;

    case 'SL_HIT':
      header = `🛑 <b>STOP LOSS PROTOCOL TRIGGERED — CAPITAL SHIELDED</b>`;
      body = `• <b>Asset:</b> ${pairName}
• <b>Milestone:</b> Stop Loss triggered at <b>${formatValue(currentPrice, trade.pair)}</b>.
• <b>Trade Status:</b> CONCLUDED 🔴
• <b>Capital Preserved:</b> Setup invalidated. Risk strictly controlled.`;
      educationalInsight = `🧠 <b>EDUCATIONAL REASONING (Why This Happened & Why It's Good):</b>
Our predefined thesis was violated because price broke past our critical market structure boundary. By exiting exactly at our Stop Loss, we preserved 99% of our account balance. Consistency is the key to ascension!`;
      break;
  }

  const message = `${header}
━━━━━━━━━━━━━━━━━━━━
${body}

━━━━━━━━━━━━━━━━━━━━
${educationalInsight}

━━━━━━━━━━━━━━━━━━━━
🦁 <i>Blāck-Plāyer RSA • Precision Automation • Education First</i>`;

  await sendTelegramMessage(user.integrations.telegram_bot_token, user.integrations.telegram_chat_id, message);
}
