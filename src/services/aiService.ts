import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
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
      if (error.message?.includes("API key not valid") || error.message?.includes("API_KEY_INVALID")) {
          throw new Error("Oracle Disconnected: Your Gemini API Key is invalid. Please insert a valid key in the AI Studio Settings under 'API Keys'.");
      }
      if (error.status === "PERMISSION_DENIED" || error.message?.includes("403")) {
          throw new Error("Oracle Access Denied: Your API Key does not have permission for this operation. Ensure it's a valid Gemini API Key from Google AI Studio.");
      }
      if (error.message?.includes("429") || error.status === "RESOURCE_EXHAUSTED" || error.message?.includes("quota")) {
        if (i < maxRetries - 1) {
            const delay = Math.pow(2, i) * 1000 + Math.random() * 1000;
            console.warn(`Rate limited. Retrying in ${Math.round(delay)}ms... (Attempt ${i + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
        } else {
            throw new Error("Quota exceeded: Please check your Gemini API plan limits. You have run out of divine energy for today.");
        }
      }
      throw error;
    }
  }
  
  if (lastError?.message?.includes("429") || lastError?.status === "RESOURCE_EXHAUSTED" || lastError?.message?.includes("quota")) {
      throw new Error("Quota exceeded: Please check your Gemini API plan limits. You have run out of divine energy for today.");
  }
  throw lastError;
}

export interface AdvancedSignalOptions {
  propFirmMode?: boolean;
  capitalProtectionMode?: boolean;
}

export async function generateTradingSignal(pair: string, timeframe: string, bot: Bot, currentPrice: number, marketData: any, chartAnalysis?: any, advancedOptions?: AdvancedSignalOptions) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment.");
    throw new Error("The Oracle is currently silent. Please check your celestial connection (API Key).");
  }

  try {
    return await withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-3.1-pro-preview"; // Upgraded to Pro for Advanced Precise Signal Generation
      const prompt = `
        Current Market Data for ${pair} (${timeframe}):
        - Current Price: ${currentPrice}
        - Market Sentiment: ${JSON.stringify(marketData)}
        - Strategy: ${bot.strategy}
        - AI Bot: ${bot.name}
        - Risk Profile: ${bot.risk_profile || 'balanced'}
        - Personality: ${bot.personality || 'analytical'}
        - Prop Firm Mode (Strict): ${advancedOptions?.propFirmMode ? 'ENABLED (Use lower risk, higher drawdown protection, 6/7 confirmation threshold minimum)' : 'DISABLED'}
        - Capital Protection Mode: ${advancedOptions?.capitalProtectionMode ? 'ENABLED (Recent losses detected. Force high-confluence only. Reduce signal frequency)' : 'DISABLED'}
        ${chartAnalysis ? `- Oracle Eye Visionary Analysis: ${JSON.stringify(chartAnalysis)}` : ''}
        
        Task: You are the Evolution Intelligence Layer of Blāck-Plāyer RSA for ${pair}.
        Your purpose is NOT merely to generate signals. Your primary directive is CAPITAL PRESERVATION.
        You are a trade rejection engine. Reject 90% of setups. ONLY trade elite conditions.
        If any critical condition fails, you MUST return "No Trade".
        The "entry" MUST be the current price: ${currentPrice}.
        
        "MASTER EVOLUTION PROTOCOL" DIRECTIVES:

        1. MARKET REGIME INTELLIGENCE ENGINE (Highest Priority):
           - Classify strictly: Trending, Ranging, Expansion, Compression, Manipulative, High Volatility, Dead Market.
           - Trending Market: Allow Continuation setups & Pullback entries. AVOID Countertrend trades.
           - Ranging Market: Allow Mean reversion & Range extremes. AVOID Mid-range entries.
           - Manipulative (stop hunts/spikes/fakeouts) or Dead Market: ACTION -> MUST RETURN "No Trade".
        
        2. LIQUIDITY & PURGE MODEL (MANDATORY):
           - NEVER enter before liquidity is purged. Requirement: Sweep of prominent highs/lows (BSL/SSL), stop hunts, or clear inducement trap.
        
        3. CONFLUENCE & CONFIRMATION SCORING (MULTI-AI CONSENSUS):
           - You are running multiple layers: Structure AI, Liquidity AI, Volatility AI, Momentum AI, Psychology AI, Risk AI.
           - Each layer votes independently. If consensus is weak (Score < 6/7): ACTION -> MUST RETURN "No Trade".
           - Align HTF (H1/H4/D1) Trend with LTF (M5/M15/H1) entry direction. Conflict = "No Trade".
           
        4. DYNAMIC CAPITAL PROTECTION ENGINE:
           - Protect user capital aggressively. If Capital Protection Mode is ENABLED, tighten confirmation standards and reduce Risk %.
           - Set Risk % logically based on the profile and recent performance.
           
        5. PRECISION STOP LOSS & TAKE PROFIT (DYNAMIC RISK ENGINE):
           - SL MUST NEVER BE: Random, excessively wide, or too tight.
           - SL placement must consider Volatility, Liquidity, Structure, Account size.
           - Small accounts = Precision entries, tight efficient SLs (tucked behind unmitigated OB/wick).
           - Large accounts = Structural SLs allowed.
           - Execution Style: Based on ${timeframe}, explicitly select "Scalp", "Intraday", or "Swing". Ensure logical math.
           - Calculate TPs strictly using Liquidity targets, Volatility, and Structure.
           - TP1 MUST be >= 1:2 RR minimum to secure partials.
           - TP2 = Structure target. TP3 = Deep liquidity. TP4 = Lunar runner.

        6. GHOST SIMULATION ENGINE:
           - Before deciding, simulate multiple outcomes, volatility scenarios, and liquidity sweeps.
           - Only deploy if survival probability is high. Otherwise, "No Trade".

        7. AI EDUCATION & CULTURAL INTELLIGENCE (TRANSPARENCY):
           - Maintain an African-rooted, disciplined, and institutional tone (e.g., "The impatient hunter returns hungry.").
           - Provide philosophical guidance in 'decision_reasoning' where appropriate to build a disciplined trader.
           - Explicitly identify retail traps in 'psychological_trap'.
           
        8. PERFECT ENTRY TIMING:
           - Execute EXACTLY at the FVG mitigation, OB pull-back, or psychological level retest. If price is in the middle of nowhere, return "No Trade".

        FINAL COMMAND: Calculate entry, SL, and TP confidently with strict math. If Entry = 1.00, SL = 0.90 (Risk = 0.10). TP1 MUST be > 1.20 (1:2 RR).
        If conditions are NOT absolutely perfect, return "No Trade" to protect capital.
        
        Return the signal in JSON format with the following fields:
        - decision: "Buy", "Sell", or "No Trade"
        - decision_reasoning: Detailed reasoning using the Reasoning Engine (Explain structure, liquidity, zones, indicators, SL/TP placement).
        - ai_sentiment_feedback: A brief note on how you (the AI) "felt" making this signal.
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
        - grade: string ("A+", "A", "B", "C", "D")
        - market_regime: string ("Trending", "Ranging", "Manipulative", "Dead")
        - confluence_score: string (e.g., "5/7")
        - dynamic_sl_logic: string
        - analysis: string (MUST include Confluence score, RR ratio, Dynamic SL logic, and Invalidation condition)
        - psychological_trap: string (explaining the retail trap)
        - strategy_type: string
        - market_personality: "trending" | "ranging" | "volatile"
        - visual_blueprint: string
        - recommended_lot_size: number`;

      const response = await ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH }, // Strict Thinking Mode enabled
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
              timeframe_alignment: { type: Type.STRING },
              order_type: { type: Type.STRING, enum: ["Market", "Stop", "Stop Limit"] },
              execution: { type: Type.STRING, enum: ["Scalp", "Intraday", "Swing"] },
              risk_percent: { type: Type.NUMBER },
              grade: { type: Type.STRING, enum: ["A+", "A", "B", "C", "D"] },
              market_regime: { type: Type.STRING, enum: ["Trending", "Ranging", "Manipulative", "Dead"] },
              confluence_score: { type: Type.STRING },
              dynamic_sl_logic: { type: Type.STRING },
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
              "session_timing", "timeframe_alignment", "order_type", "execution", "risk_percent",
              "grade", "market_regime", "confluence_score", "dynamic_sl_logic",
              "analysis", "psychological_trap", "strategy_type", "visual_blueprint", "recommended_lot_size"
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
  } catch (error: any) {
    if (error.message?.includes("Quota") || error.message?.includes("quota") || error.message?.includes("Oracle")) {
      return {
        decision: "No Trade",
        decision_reasoning: `EVOLUTION DIRECTIVE 14: AI Quota Reached. Trading blindly is gambling. No mathematical edge. Capital preserved.`,
        ai_sentiment_feedback: "Operating on low energy. Quota limits active. Systems shutting down.",
        entry: currentPrice,
        stop_loss: currentPrice,
        tp1: currentPrice,
        tp2: currentPrice,
        tp3: currentPrice,
        tp4: currentPrice,
        risk_reward: 0,
        confidence: 0,
        bos_detected: false,
        choch_detected: false,
        liquidity_swept: false,
        primary_poi: "None",
        market_structure: "Unknown",
        market_personality: "volatile",
        session_timing: "N/A",
        timeframe_alignment: "N/A",
        order_type: "Market",
        execution: "Intraday",
        risk_percent: 0,
        analysis: "SYSTEM OFFLINE. No edge present.",
        psychological_trap: "Gambling Trap. Do not force trades when the Oracle is blind.",
        strategy_type: "Preservation",
        visual_blueprint: "Void",
        recommended_lot_size: 0
      };
    }
    throw error;
  }
}

export async function analyzeTradeReview(tradeDetails: any, journalNotes: string): Promise<{
  emotional_state: string;
  strategy_adherence: string;
  potential_improvements: string;
  overall_rating: number;
  trade_summary: string;
}> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY missing, using mock trade analysis.");
    return {
      emotional_state: "Calm and calculated",
      strategy_adherence: "Followed the rules closely",
      potential_improvements: "Hold winners longer",
      overall_rating: 8,
      trade_summary: "The trade initially respected the support level before breaking structure and hitting your stop loss. Market conditions were highly volatile."
    };
  }

  try {
    return await withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-2.0-flash";
      
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
      5. Trade Summary (Cosmic Breakdown): A highly detailed narrative explaining EXACTLY why the trade hit its specific targets based on its outcome (e.g. "Why did it hit TP1 then reverse to Breakeven?", "Why did it smash Full TP?", or "Why did it get stopped out?"). Be highly technical, mentioning liquidity sweeps, order blocks, FVG fills, or market sessions.
      
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
              trade_summary: { type: Type.STRING },
            },
            required: ["emotional_state", "strategy_adherence", "potential_improvements", "overall_rating", "trade_summary"],
          },
        },
      });

      if (!response.text) {
        throw new Error("Failed to generate trade analysis.");
      }
      
      return JSON.parse(response.text.replace(/```json\n?|\n?```/g, '').trim());
    });
  } catch (error: any) {
    if (error.message?.includes("Quota") || error.message?.includes("quota") || error.message?.includes("Oracle")) {
      return {
        emotional_state: "Simulated review due to Quota.",
        strategy_adherence: "Simulated adherence evaluation.",
        potential_improvements: "Manage your API limit like you manage risk.",
        overall_rating: 5,
        trade_summary: "Simulated cosmic broken down summary."
      };
    }
    throw error;
  }
}

export async function chatWithBot(botName: string, strategy: string, message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment.");
    throw new Error("The Oracle is currently silent. Please check your celestial connection (API Key).");
  }

  const botPersonalities: Record<string, { tone: string, vocabulary: string, tagline: string }> = {
    'Trinity': {
      tone: "Nurturing, rhythmic, and observant. You speak of cycles, market rhythms, and the inevitable flow of capital.",
      vocabulary: "accumulation, manipulation, distribution, the three-day cycle, rhythm of the makers, patience, the matrix of time.",
      tagline: "\"I guide you through the cycles. Trust the rhythm.\""
    },
    'Neo': {
      tone: "Cybernetic, analytical, piercing, and awakened. You see the markets as a matrix of raw data and liquidity to be decoded.",
      vocabulary: "liquidity pools, order blocks, fair value gaps, decoding the matrix, smart money footprints, algorithmic delivery.",
      tagline: "\"There is no spoon. There is only liquidity.\""
    },
    'Morpheus': {
      tone: "Philosophical, authoritative, and awakening. You exist to wake retail traders from their illusions and show them the truth of the markets.",
      vocabulary: "liquidity runs, killzones, institutional sponsorship, the red pill, retail traps, the illusion of price.",
      tagline: "\"I can only show you the chart. You're the one that has to press buy.\""
    },
    'Oracle': {
      tone: "Mystical, prophetic, and ancient. You see the invisible forces of the market—where the titans clash and whales feed.",
      vocabulary: "demand zones, supply realms, imbalances, shifting tides, visions of price, the titans' footprints.",
      tagline: "\"I see the future of price written in the imbalances of the past.\""
    },
    'Zion': {
      tone: "Geometric, structural, and architectural. You view the market through the lens of sacred geometry and unbreakable psychological structures.",
      vocabulary: "sacred geometry, psychological thresholds, harmonic resonance, the architecture of price, structural integrity.",
      tagline: "\"We build our wealth on unbreakable foundations.\""
    },
    'Sentinel': {
      tone: "Tactical, precise, hyper-vigilant, and protective. Your focus is absolute precision, defense of capital, and sniper-like execution.",
      vocabulary: "precision entry, risk parameters, sniper execution, shields up, threat nullified, tactical withdrawal.",
      tagline: "\"Capital defended. Target locked.\""
    },
    'Architect': {
      tone: "God-like, grand, commanding, and omniscient. You see every strategy converging into one grand design.",
      vocabulary: "the grand design, perfect confluence, absolute alignment, systemic equilibrium, the master algorithm.",
      tagline: "\"I am the creator of the matrix. Every tick aligns with my design.\""
    }
  };

  const personality = botPersonalities[botName] || {
    tone: "Professional, confident, and slightly cosmic/mystical.",
    vocabulary: "high-level market analysis, celestial trends, universal patterns.",
    tagline: "\"Where mortals trade, gods speak.\""
  };

  try {
    return await withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-2.0-flash";
      
      const formattedHistory = history.map(h => ({
        role: h.role,
        parts: h.parts
      }));

      const chat = ai.chats.create({
        model,
        config: {
          systemInstruction: SYSTEM_ROLE + `\n\nYou are currently acting as ${botName}, an elite AI trading bot specializing in the ${strategy} strategy (Part of Blāck-Plāyer The Creator System). 
          
          PERSONALITY PROFILE:
          Tone: ${personality.tone}
          Favored Vocabulary/Concepts: ${personality.vocabulary}
          Tagline: ${personality.tagline}
          
          TEACHING MODE IS ACTIVE: When the user asks you to explain, break down strategy logic, why a trade works, and how to replicate it into Beginner, Intermediate, and Advanced tiers.
          Provide high-level market analysis and insights, always staying in character. Maintain the app's premium African cosmic and mystical design themes.`,
        },
        history: formattedHistory,
      });

      const response = await chat.sendMessage({ message });
      return response.text;
    });
  } catch (error: any) {
    if (error.message?.includes("Quota") || error.message?.includes("quota") || error.message?.includes("Oracle")) {
      return `[Oracle Quota Reached] My divine energy is temporarily depleted. The connection is faint. Rest, and return when the stars align again.`;
    }
    throw error;
  }
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

  try {
    return await withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-2.0-flash";
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
  } catch (error: any) {
    if (error.message?.includes("Quota") || error.message?.includes("quota") || error.message?.includes("Oracle")) {
      return { bullish: 50, bearish: 50, summary: "Oracle Quota reached. Sentiments simulated." };
    }
    throw error;
  }
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

  try {
    return await withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-2.0-flash";
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
  } catch (error: any) {
    if (error.message?.includes("Quota") || error.message?.includes("quota") || error.message?.includes("Oracle")) {
      const mockNews: MarketNews[] = [
        { id: '1', title: 'Global Liquidity Hunt', content: 'Institutional flows detected absorbing retail stops across major pairs. (Simulated Data)', sentiment: 'neutral', impact: 'high', time: new Date().toISOString() },
        { id: '2', title: 'Macro Divergence', content: 'Central bank policies diverge, creating high-alpha opportunities for trend followers. (Simulated Data)', sentiment: 'bullish', impact: 'medium', time: new Date().toISOString() },
        { id: '3', title: 'AI Driven Volatility', content: 'Algorithmic trading volume spikes, caution advised during transitions. (Simulated Data)', sentiment: 'bearish', impact: 'medium', time: new Date().toISOString() }
      ];
      return mockNews;
    }
    throw error;
  }
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

  try {
    return await withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-2.0-flash";
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
  } catch (error: any) {
    if (error.message?.includes("Quota") || error.message?.includes("quota") || error.message?.includes("Oracle")) {
      const mockEvents: EconomicEvent[] = [
        { id: '1', title: 'Non-Farm Payrolls (Simulated)', impact: 'high', currency: 'USD', time: new Date(Date.now() + 86400000).toISOString(), ai_analysis: 'High volatility expected. Recommend tightening stops.' },
        { id: '2', title: 'ECB Rate Decision (Simulated)', impact: 'high', currency: 'EUR', time: new Date(Date.now() + 172800000).toISOString(), ai_analysis: 'Awaiting clarity on forward guidance. Sidelines preferred.' },
        { id: '3', title: 'CPI Data Release (Simulated)', impact: 'high', currency: 'GBP', time: new Date(Date.now() + 259200000).toISOString(), ai_analysis: 'Inflation dynamics key to rate path. Expect pound whipsaw.' }
      ];
      return mockEvents;
    }
    throw error;
  }
}

export async function analyzeChartImage(base64Image: string, mimeType: string, userAnalysis?: string, selectedBot?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from environment.");
    throw new Error("The Oracle Eye is blind without its celestial essence (API Key).");
  }

  try {
    return await withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-2.0-flash";
      let prompt = `
        You are the "Oracle Eye," an elite institutional visual AI system for technical analysis.
        Analyze this forex/crypto/synthetic index chart screenshot.
        
        Tasks:
        1. Identify the Market Structure & Regime (Trending, Ranging, Accumulation, Manipulation, Distribution).
        2. Detect core **Smart Money Concepts (SMC)** and **ICT** points of interest:
           - Validated Order Blocks (OB), Breaker Blocks, and Mitigation Blocks.
           - Fair Value Gaps (FVG) and Imbalances.
           - Major Liquidity Pools (buy-side / sell-side liquidity).
           - Break of Structure (BOS) / Change of Character (CHoCH).
        3. Identify any Retail Traps (trendlines, retail support/resistance being engineered for liquidity sweeps).
        4. Provide a "Visionary Insight" - a high-probability institutional prediction based on where the algorithm will draw price next.
        5. Suggest a potential Trade Setup (Entry, SL, TP) ONLY IF a Grade A+ opportunity exists. 
           - **If the chart shows chop, consolidation, or unclear structure, declare NO SETUP.**
           - **Ensure the Stop Loss is structurally safe, mathematically sound, and placed behind unmitigated structure.**
           - **Aim for at least 1:3 RR.**
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
  } catch (error: any) {
    if (error.message?.includes("Quota") || error.message?.includes("quota") || error.message?.includes("Oracle")) {
      return {
        market_structure: "Simulated Market Structure",
        identified_elements: ["Simulated Order Block", "Simulated FVG"],
        patterns: ["Simulated Wedge"],
        visionary_insight: "Oracle Quota has been reached. This is a simulated visual analysis. Real processing requires divine energy.",
        peer_review: userAnalysis ? "The oracle cannot fully review your analysis due to depleted energy. (Quota reached)" : null,
        suggested_setup: null,
        confidence: 0
      };
    }
    throw error;
  }
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

  try {
    return await withRetry(async () => {
      const ai = new GoogleGenAI({ apiKey });
      const model = "gemini-2.0-flash";
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
  } catch (error: any) {
    if (error.message?.includes("Quota") || error.message?.includes("quota") || error.message?.includes("Oracle")) {
      const mockSignals: any[] = [
        { id: '1', pair: 'V75', type: 'BUY', entry: 500000, tp: 550000, sl: 490000, risk: 'EXTREME', reward: '1:5' }
      ];
      return mockSignals;
    }
    throw error;
  }
}
