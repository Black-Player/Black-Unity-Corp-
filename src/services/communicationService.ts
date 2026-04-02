export async function sendSignalToTelegram(signal: any) {
  const botToken = process.env.VITE_TELEGRAM_BOT_TOKEN;
  const chatId = process.env.VITE_TELEGRAM_CHAT_ID;

  if (!botToken || !chatId) {
    console.warn("Telegram credentials not configured. Skipping broadcast.");
    return null;
  }

  const formatPairName = (pair: string) => {
    return pair.replace('frx', '').replace('cry', '').replace('OTC_', '').replace('_', ' ');
  };

  const message = `
🔮 **Blāck-Plāyer RSA: The Chronicle** 🔮

🚀 **New Signal: ${formatPairName(signal.pair)}**
━━━━━━━━━━━━━━━━━━━━
✨ **Type:** ${signal.stop_loss < signal.entry ? '🟢 BUY' : '🔴 SELL'}
💰 **Entry:** ${signal.entry.toFixed(5)}
🎯 **TP1:** ${signal.tp1.toFixed(5)}
🎯 **TP2:** ${signal.tp2.toFixed(5)}
🎯 **TP3:** ${signal.tp3.toFixed(5)}
🎯 **TP4:** ${signal.tp4.toFixed(5)}
🛑 **SL:** ${signal.stop_loss.toFixed(5)}
━━━━━━━━━━━━━━━━━━━━
📊 **Structure:** ${signal.market_structure || 'N/A'}
⚡ **Confidence:** ${signal.confidence.toFixed(1)}%
🕒 **Session:** ${signal.session_timing || 'N/A'}
━━━━━━━━━━━━━━━━━━━━
🧠 **Oracle Insight:**
_${signal.analysis}_

⚠️ *Trade with discipline. Risk management is the key to ascension.*
  `;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: message,
        parse_mode: 'Markdown',
      }),
    });

    const data = await response.json();
    if (!data.ok) throw new Error(data.description);
    return data.result.message_id;
  } catch (error) {
    console.error("Telegram Broadcast Error:", error);
    return null;
  }
}

export function getWhatsAppInvestorLink() {
  return "https://chat.whatsapp.com/example-investor-nexus";
}
