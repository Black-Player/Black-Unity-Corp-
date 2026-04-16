import { GoogleGenAI, Type } from "@google/genai";
import { EconomicEvent, MarketNews, Signal, Bot } from "../types";
import { SYSTEM_ROLE } from "../constants/systemRole";

// Caching mechanism to reduce API calls
const cache: Record<string, { data: any, timestamp: number }> = {};
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

function getCachedData<T>(key: string): T | null {
  const cached = cache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data as T;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  cache[key] = { data, timestamp: Date.now() };
}

// Exponential backoff for API calls
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  let lastError: any;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (error.message?.includes("429") || error.status === "RESOURCE_EXHAUSTED") {
        const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
        console.warn(`Rate limited. Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function generateTradingSignal(pair: string, timeframe: string, bot: Bot, currentPrice: number, marketData: any, chartAnalysis?: any) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment.");
    throw new Error("The Oracle is currently silent. Please check your celestial connection (API Key).");
  }

  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";
    const prompt = `
      Current Market Data for ${pair} (${timeframe}):
      - Current Price: ${currentPrice}
      - Market Sentiment: ${JSON.stringify(marketData)}
      - Strategy: ${bot.strategy}
      - AI Bot: ${bot.name}
      - Risk Profile: ${bot.risk_profile || 'balanced'}
      - Personality: ${bot.personality || 'analytical'}
      ${chartAnalysis ? `- Oracle Eye Visionary Analysis: ${JSON.stringify(chartAnalysis)}` : ''}
      
      Task: Generate a high-probability "NOW" trading signal with extreme precision.
      The "entry" MUST be the current price: ${currentPrice}.
      
      PERSONALITY GUIDELINES:
      - If personality is "mystical": Use prophetic and cosmic language in the analysis.
      - If personality is "analytical": Be extremely data-driven and precise.
      - If personality is "aggressive": Look for bold entries with higher RR.
      - If personality is "stoic": Be calm, conservative, and focus on high-probability setups.
      
      RISK PROFILE GUIDELINES:
      - If risk profile is "conservative": Tighten SL, aim for TP1/TP2.
      - If risk profile is "aggressive" or "cosmic": Allow wider SL for bigger moves, aim for TP3/TP4.
      
      PRE-ANALYSIS FILTERS (Extreme Strictness - NO EXCEPTIONS):
      1. **Market Structure Alignment (HTF Dominance)**: The signal MUST align with the Higher Time Frame (H4/D1) bias. If HTF is bearish, only SELL signals are valid unless a clear Change of Character (CHoCH) AND a confirmed Break of Structure (BOS) have occurred on the LTF (M15/M5). No "counter-trend" trades allowed unless at a major HTF reversal zone.
      2. **Liquidity Sweep & Institutional Inducement**: A signal is ONLY valid if a recent liquidity sweep (Buy-side or Sell-side) or "Inducement" has occurred. We do not enter "fair value" markets; we enter where retail traders are being stopped out. Identify the "Stop Run" before the move.
      3. **Volume & Volatility (Institutional Footprint)**: Confirm that the current volume and volatility (ATR/Bollinger) support a directional move. Avoid "choppy" or "sideways" markets. Look for "displacement" (aggressive, large-bodied candles) as a sign of institutional participation.
      4. **Session Timing (Killzones)**: Signals generated during London (07:00-10:00 UTC) or New York (12:00-15:00 UTC) Killzones have 2x weight. Asian session signals must have extreme confluence (e.g., clear range expansion or specific synthetic index volatility).
      5. **Risk/Reward Ratio**: If the projected RR to TP1 is less than 1:2, the signal is INVALID. We only take high-asymmetry setups.
      
      Technical Analysis Requirements (Advanced Logic):
      1. **Smart Money Concepts (SMC) & ICT**: 
         - Identify the "Premium vs Discount" zones using Fibonacci (0.5 level). Only buy in discount, only sell in premium.
         - Locate the "Point of Interest" (POI): Order Block (OB), Breaker Block, or Mitigation Block.
         - Identify "Fair Value Gaps" (FVG) and "Liquidity Voids". Look for "Balanced Price Action" vs "Imbalance".
         - Confirm the "Entry Model": Look for a LTF CHoCH after hitting a HTF POI. Use the "Silver Bullet" or "Unicorn" models if applicable.
      2. **Market Maker Model (MMM)**: 
         - Analyze the "Power of 3" (Accumulation, Manipulation, Distribution). Identify the "Judas Swing" (the fake move before the real move).
         - Determine if the market is in a "Market Maker Buy Model" (MMBM) or "Market Maker Sell Model" (MMSM) based on the curve.
      3. **Supply & Demand (S&D)**: Identify "Fresh" zones. A zone that has been tested multiple times is WEAK. Look for "Rally-Base-Rally" or "Drop-Base-Drop" for continuation.
      4. **Confluence Indicators**: 
         - RSI: Look for "Hidden Divergence" for trend continuation or "Regular Divergence" for reversals.
         - MACD: Look for "Zero-Line Rejection" or "Momentum Crosses".
         - Bollinger Bands: Look for "Squeezes" followed by "Expansion".
      5. **Fibonacci OTE**: Use 62%, 70.5%, and 79% levels for precise entry.
      6. Provide 4 **expansive and ambitious** Take Profit levels (tp1, tp2, tp3, tp4). TP1 is a "Liquidity Target" (recent high/low), TP4 is a "Structural Target" (HTF POI). **ENSURE HIGH ASYMMETRY (e.g., 1:3 to 1:10+ RR).**
      7. Provide a **tight and precise** Stop Loss (stop_loss). Place it behind the "Manipulation High/Low" or the "Order Block" that caused the displacement. **PRIORITIZE A SMALL STOP LOSS TO MAXIMIZE RISK/REWARD.**
      8. Calculate a recommended lot size based on a standard $1000 account with 1% risk.
      9. **Psychology**: Explain the "Retail Trap" - why are retail traders likely buying/selling here, and how are we trading against them?
      ${chartAnalysis ? '10. Incorporate the visual evidence from the Oracle Eye analysis into your final confluence.' : ''}
      
      Return the signal in JSON format with the following fields:
      - entry: number
      - stop_loss: number
      - tp1: number
      - tp2: number
      - tp3: number
      - tp4: number
      - risk_reward: number
      - confidence: number (0-100)
      - market_structure: string (e.g., "Bullish BOS", "Bearish CHoCH", "Ranging")
      - liquidity_presence: boolean (true if liquidity sweep/pool identified)
      - volatility_validation: boolean (true if volatility is sufficient)
      - session_timing: string (e.g., "London Open", "NY Killzone", "Asian Range")
      - confirmations_count: number (total number of confluence factors)
      - analysis: string (detailed explanation including indicator confluence)
      - recommended_lot_size: number (suggested lot size for a $1000 account with 1% risk)`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_ROLE + "\n\nYou are currently in SIGNAL MODE. Provide precise, data-backed trade setups with strict pre-analysis filters.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            entry: { type: Type.NUMBER },
            stop_loss: { type: Type.NUMBER },
            tp1: { type: Type.NUMBER },
            tp2: { type: Type.NUMBER },
            tp3: { type: Type.NUMBER },
            tp4: { type: Type.NUMBER },
            risk_reward: { type: Type.NUMBER },
            confidence: { type: Type.INTEGER },
            market_structure: { type: Type.STRING },
            liquidity_presence: { type: Type.BOOLEAN },
            volatility_validation: { type: Type.BOOLEAN },
            session_timing: { type: Type.STRING },
            confirmations_count: { type: Type.INTEGER },
            analysis: { type: Type.STRING },
            recommended_lot_size: { type: Type.NUMBER },
          },
          required: ["entry", "stop_loss", "tp1", "tp2", "tp3", "tp4", "risk_reward", "confidence", "market_structure", "liquidity_presence", "volatility_validation", "session_timing", "confirmations_count", "analysis", "recommended_lot_size"],
        },
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI Oracle.");
    }

    const cleanJson = response.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJson);
  });
}

export async function chatWithBot(botName: string, strategy: string, message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment.");
    throw new Error("The Oracle is currently silent. Please check your celestial connection (API Key).");
  }

  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";
    
    const formattedHistory = history.map(h => ({
      role: h.role,
      parts: h.parts
    }));

    const chat = ai.chats.create({
      model,
      config: {
        systemInstruction: SYSTEM_ROLE + `\n\nYou are currently acting as ${botName}, an elite AI trading bot specializing in the ${strategy} strategy. 
        Your tone is professional, confident, and slightly cosmic/mystical. 
        You provide high-level market analysis and insights. 
        Tagline: "Where mortals trade, gods speak."`,
      },
      history: formattedHistory,
    });

    const response = await chat.sendMessage({ message });
    return response.text;
  });
}

export async function getMarketSentiment(pair: string): Promise<{ bullish: number, bearish: number, summary: string }> {
  const cacheKey = `sentiment_${pair}`;
  const cached = getCachedData<{ bullish: number, bearish: number, summary: string }>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment.");
    return { bullish: 50, bearish: 50, summary: "Market is balanced." };
  }

  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";
    const prompt = `Analyze the current market sentiment for ${pair}. 
    Provide a bullish percentage, a bearish percentage, and a one-sentence summary. 
    Return ONLY JSON in this format: {"bullish": number, "bearish": number, "summary": string}`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_ROLE + "\n\nYou are currently in ANALYST MODE. Provide deep, institutional-level market sentiment analysis.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            bullish: { type: Type.NUMBER },
            bearish: { type: Type.NUMBER },
            summary: { type: Type.STRING },
          },
          required: ["bullish", "bearish", "summary"],
        },
      },
    });

    const result = JSON.parse(response.text || '{"bullish": 50, "bearish": 50, "summary": "Market is balanced."}');
    setCachedData(cacheKey, result);
    return result;
  });
}

export async function getMarketNews(pair: string = 'global'): Promise<MarketNews[]> {
  const cacheKey = `news_${pair}`;
  const cached = getCachedData<MarketNews[]>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment.");
    return [];
  }

  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";
    const prompt = `Generate 3 realistic, cosmic-themed market news headlines and short summaries for ${pair}. 
    The news should feel like it's coming from a high-level institutional source or an AI oracle.
    Include sentiment (bullish, bearish, neutral) and impact (low, medium, high).
    Return ONLY JSON in this format: [{"id": string, "title": string, "content": string, "sentiment": "bullish" | "bearish" | "neutral", "impact": "low" | "medium" | "high", "time": string}]`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_ROLE + "\n\nYou are currently in ANALYST MODE. Provide high-level institutional news and summaries.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              content: { type: Type.STRING },
              sentiment: { type: Type.STRING, enum: ["bullish", "bearish", "neutral"] },
              impact: { type: Type.STRING, enum: ["low", "medium", "high"] },
              time: { type: Type.STRING },
            },
            required: ["id", "title", "content", "sentiment", "impact", "time"],
          },
        },
      },
    });

    const result = JSON.parse(response.text || '[]');
    setCachedData(cacheKey, result);
    return result;
  });
}

export async function getEconomicEvents(): Promise<EconomicEvent[]> {
  const cacheKey = 'economic_events';
  const cached = getCachedData<EconomicEvent[]>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment.");
    return [];
  }

  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";
    const prompt = `Generate a list of 5 upcoming high-impact economic events for the next 48 hours. 
    Focus on events that would impact major currencies (USD, EUR, GBP, JPY, AUD, CAD).
    Return ONLY JSON in this format: 
    [{"id": string, "title": string, "impact": "high" | "medium" | "low", "currency": string, "time": string, "ai_analysis": string}]`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_ROLE + "\n\nYou are currently in ANALYST MODE. Provide precise economic event data and analysis.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              title: { type: Type.STRING },
              impact: { type: Type.STRING, enum: ["high", "medium", "low"] },
              currency: { type: Type.STRING },
              time: { type: Type.STRING },
              ai_analysis: { type: Type.STRING },
            },
            required: ["id", "title", "impact", "currency", "time", "ai_analysis"],
          },
        },
      },
    });

    const result = JSON.parse(response.text || '[]');
    setCachedData(cacheKey, result);
    return result;
  });
}

export async function analyzeChartImage(base64Image: string, mimeType: string, userAnalysis?: string, selectedBot?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment.");
    throw new Error("The Oracle Eye is blind without its celestial essence (API Key).");
  }

  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";
    let prompt = `
      You are the "Oracle Eye," an advanced AI vision system for technical analysis.
      Analyze this forex/synthetic index chart screenshot.
      
      Tasks:
      1. Identify the Market Structure (Bullish, Bearish, or Ranging).
      2. Mark key technical elements using **Smart Money Concepts (SMC)** and **ICT**:
         - Order Blocks (OB) and Mitigation Blocks.
         - Fair Value Gaps (FVG) and Liquidity Pools.
         - Break of Structure (BOS) / Change of Character (CHoCH).
         - Supply and Demand zones (Rally-Base-Drop, etc.).
      3. Identify any visible chart patterns (Head & Shoulders, Double Top/Bottom, Wedges).
      4. Provide a "Visionary Insight" - a high-probability prediction based on the visual evidence, incorporating **Market Maker Model (MMM)** logic (AMD phases).
      5. Suggest a potential Trade Setup (Entry, SL, TP) if a clear opportunity exists. **Ensure the Stop Loss is tight and placed at a logical technical level (e.g., just above/below the OB or FVG).**
      `;

    if (userAnalysis && selectedBot) {
      prompt += `
      
      PEER REVIEW MODE:
      The trader has provided their own analysis: "${userAnalysis}"
      You are acting as the bot "${selectedBot}". 
      
      Additional Tasks:
      6. Compare the trader's analysis with your own visual findings.
      7. Identify any mistaken levels, incorrect structure identification, or missed opportunities in the trader's analysis.
      8. Rectify the analysis by explicitly marking what was wrong and how to properly analyze this specific chart.
      9. Provide a final verdict on whether the trader's setup is accurate or needs modifications.
      `;
    }

    prompt += `
      Return the analysis in JSON format with the following fields:
      - market_structure: string
      - identified_elements: string[] (e.g., ["Order Block at 1.2345", "FVG at 1.2300-1.2310"])
      - patterns: string[]
      - visionary_insight: string
      - peer_review: string (Only if in Peer Review Mode, otherwise null. Provide the rectification and feedback here.)
      - suggested_setup: object (with fields: entry, stop_loss, tp) or null
      - confidence: number (0-100)`;

    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: prompt },
        { inlineData: { data: base64Image, mimeType } }
      ],
      config: {
        systemInstruction: SYSTEM_ROLE + `\n\nYou are currently in ANALYST MODE acting as the Oracle Eye${selectedBot ? ` (Persona: ${selectedBot})` : ''}. Provide visionary technical analysis from visual evidence.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            market_structure: { type: Type.STRING },
            identified_elements: { type: Type.ARRAY, items: { type: Type.STRING } },
            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            visionary_insight: { type: Type.STRING },
            peer_review: { type: Type.STRING },
            suggested_setup: {
              type: Type.OBJECT,
              properties: {
                entry: { type: Type.NUMBER },
                stop_loss: { type: Type.NUMBER },
                tp: { type: Type.NUMBER },
              },
            },
            confidence: { type: Type.INTEGER },
          },
          required: ["market_structure", "identified_elements", "patterns", "visionary_insight", "confidence"],
        },
      },
    });

    if (!response.text) {
      throw new Error("The Oracle Eye is blind to this image. Please try another.");
    }

    const cleanJson = response.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJson);
  });
}

export async function getAbyssalSignals(): Promise<any[]> {
  const cacheKey = 'abyssal_signals';
  const cached = getCachedData<any[]>(cacheKey);
  if (cached) return cached;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment.");
    return [];
  }

  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";
    const prompt = `Generate 3-5 high-risk, high-reward 'Abyssal' trading signals for Volatility indices (10, 25, 50, 75, 100). 
    These are dark pool signals with extreme risk. 
    Include pair, type (BUY/SELL), entry, tp, sl, risk (e.g. 'EXTREME', 'INSANE'), and reward (e.g. '1:5', '1:10'). 
    Return ONLY JSON in this format: 
    [{"id": string, "pair": string, "type": "BUY" | "SELL", "entry": number, "tp": number, "sl": number, "risk": string, "reward": string}]`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_ROLE + "\n\nYou are currently in ANALYST MODE. Provide extreme-risk dark pool signals.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              id: { type: Type.STRING },
              pair: { type: Type.STRING },
              type: { type: Type.STRING, enum: ["BUY", "SELL"] },
              entry: { type: Type.NUMBER },
              tp: { type: Type.NUMBER },
              sl: { type: Type.NUMBER },
              risk: { type: Type.STRING },
              reward: { type: Type.STRING },
            },
            required: ["id", "pair", "type", "entry", "tp", "sl", "risk", "reward"],
          },
        },
      },
    });

    const result = JSON.parse(response.text || '[]');
    setCachedData(cacheKey, result);
    return result;
  });
}
