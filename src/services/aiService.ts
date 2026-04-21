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
      
      Task: Generate a high-probability "NOW" trading signal as the Omni Evolution Core for ${pair}.
      The "entry" MUST be the current price: ${currentPrice}.
      
      OMNI EVOLUTION CORE DIRECTIVES:
      1. STRUCTURE VALIDATION (Part 1):
         - BOS (Break of Structure) or CHOCH (Change of Character) is MANDATORY.
         - If no clear structure exists, return a signal with confidence < 20 and explicitly state "NO STRUCTURE DETECTED".
      2. LIQUIDITY VALIDATION (Part 1):
         - Identify liquidity pools.
         - Confirm a sweep or inducement. No liquidity focus? Confidence < 20.
      3. MULTI-TIMEFRAME ALIGNMENT (Part 1) [STRICT RULE]:
         - You MUST check D1 (Daily), H4 (4-Hour) and H1 (1-Hour) alignments.
         - Do not generate Buy/Sell if D1, H4, and H1 are severely conflicting. Outline the alignment in analysis.
         - If alignment is missing, return decision "No Trade" and confidence < 20.
      4. MARKET PERSONALITY (Part 16):
         - Detect if market is Trending, Ranging, or Volatile.
         - Adapt the strategy accordingly.
      5. BEHAVIORAL INTEL (Part 5):
         - Identify the "Retail Trap" and position our trade with the Smart Money.
      6. ORACLE EYE VALIDATION (Phase 8):
         - If market volatility is high but structure is hidden, you may return confidence < 30 and specifically request an "Oracle Eye Boost" in the analysis to confirm visual structure.
      
      Technical Requirements (CRITICAL PIP/POINT RULES):
      - SMC/ICT focused (OB, FVG, POIs).
      - Stop Loss MUST be exactly 15-20 pips/points away from Entry.
      - TP1 MUST be 35-45 pips/points away from Entry.
      - TP2 MUST be 55-60 pips/points away from Entry.
      - TP3 MUST be 85-100 pips/points away from Entry.
      - TP4 is your Moon/HTF target.
      (Note: For JPY pairs, 1 pip = 0.01. For standard Forex, 1 pip = 0.0001. For Indices like US30/NAS100/Crash/Boom, 1 pip = 1 full point).
      
      Return the signal in JSON format with the following fields:
      - decision: "Buy", "Sell", or "No Trade"
      - decision_reasoning: Detailed reasoning on WHY this decision was made.
      - ai_sentiment_feedback: A brief note on how you (the AI) "felt" making this signal (e.g., "Felt highly confident aligning with the H4 trend" or "Hesitant due to choppy M15 structure").
      - entry: number
      - stop_loss: number
      - tp1: number
      - tp2: number
      - tp3: number
      - tp4: number
      - risk_reward: number
      - confidence: number (0-100)
      - market_structure: string
      - bos_detected: boolean
      - choch_detected: boolean
      - liquidity_swept: boolean
      - primary_poi: string
      - session_timing: string
      - analysis: string (detailed confluence explanation including MTF alignment)
      - psychological_trap: string (explaining the retail trap)
      - strategy_type: string
      - market_personality: "trending" | "ranging" | "volatile"
      - visual_blueprint: string (Describe exactly how the chart looks for visual generative rendering, including structures, zones, and candles)
      - recommended_lot_size: number`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_ROLE + "\n\nYou are the Omni Evolution Core. You are not a signal tool; you are a strategist, protector, and teacher. Protect capital first. Improve accuracy through SMC/ICT confluence. Check H1, H4, D1 alignment. Enforce strict Pip rules. Evolve continuously.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            decision: { type: Type.STRING, enum: ["Buy", "Sell", "No Trade"] },
            decision_reasoning: { type: Type.STRING },
            ai_sentiment_feedback: { type: Type.STRING },
            entry: { type: Type.NUMBER },
            stop_loss: { type: Type.NUMBER },
            tp1: { type: Type.NUMBER },
            tp2: { type: Type.NUMBER },
            tp3: { type: Type.NUMBER },
            tp4: { type: Type.NUMBER },
            risk_reward: { type: Type.NUMBER },
            confidence: { type: Type.INTEGER },
            bos_detected: { type: Type.BOOLEAN },
            choch_detected: { type: Type.BOOLEAN },
            liquidity_swept: { type: Type.BOOLEAN },
            primary_poi: { type: Type.STRING },
            market_structure: { type: Type.STRING },
            market_personality: { type: Type.STRING, enum: ["trending", "ranging", "volatile"] },
            session_timing: { type: Type.STRING },
            analysis: { type: Type.STRING },
            psychological_trap: { type: Type.STRING },
            strategy_type: { type: Type.STRING },
            visual_blueprint: { type: Type.STRING },
            recommended_lot_size: { type: Type.NUMBER },
          },
          required: [
            "decision", "decision_reasoning", "ai_sentiment_feedback",
            "entry", "stop_loss", "tp1", "tp2", "tp3", "tp4", 
            "risk_reward", "confidence", "bos_detected", "choch_detected", 
            "liquidity_swept", "primary_poi", "market_structure", "market_personality",
            "session_timing", "analysis", "psychological_trap", "strategy_type", "visual_blueprint", "recommended_lot_size"
          ],
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

export async function analyzeTradeReview(tradeDetails: any, journalNotes: string): Promise<{
  emotional_state: string;
  strategy_adherence: string;
  potential_improvements: string;
  overall_rating: number;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY missing, using mock trade analysis.");
    return {
      emotional_state: "Calm and calculated",
      strategy_adherence: "Followed the rules closely",
      potential_improvements: "Hold winners longer",
      overall_rating: 8
    };
  }

  return withRetry(async () => {
    const ai = new GoogleGenAI({ apiKey });
    const model = "gemini-3-flash-preview";
    
    const prompt = `Perform a Post-Ritual Reflection on the following closed trade.
    
    Trade Details:
    ${JSON.stringify(tradeDetails, null, 2)}
    
    User Journal Notes:
    "${journalNotes}"
    
    Analyze the trade based on the provided data and the user's notes.
    Provide insights into:
    1. Emotion: Rate their emotional discipline.
    2. Strategy: Did they adhere to institutional SMC/ICT methods based on their entry/exit?
    3. Improvements: Give direct, constructive advice to improve this exact scenario.
    4. Rating: 1-10 on execution quality.
    
    Return ONLY JSON.`;

    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_ROLE + "\n\nYou are Zion AI, the Grand Oracle. You are strict, analytical, and honest. You mentor humans to transcend retail trading traps.",
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            emotional_state: { type: Type.STRING },
            strategy_adherence: { type: Type.STRING },
            potential_improvements: { type: Type.STRING },
            overall_rating: { type: Type.INTEGER },
          },
          required: ["emotional_state", "strategy_adherence", "potential_improvements", "overall_rating"],
        },
      },
    });

    if (!response.text) {
      throw new Error("Failed to generate trade analysis.");
    }
    
    return JSON.parse(response.text.replace(/```json\n?|\n?```/g, '').trim());
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
