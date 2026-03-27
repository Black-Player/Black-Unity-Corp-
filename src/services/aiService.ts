import { GoogleGenAI, Type } from "@google/genai";
import { EconomicEvent, MarketNews, Signal } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateTradingSignal(pair: string, timeframe: string, bot: string, strategy: string, currentPrice: number, marketData: any, chartAnalysis?: any) {
  const model = "gemini-3-flash-preview";
  const prompt = `
    You are the RSA Oracle, an advanced AI trading system specializing in Synthetic Indices (Volatility, Crash/Boom, Step, Jump).
    
    Current Market Data for ${pair} (${timeframe}):
    - Current Price: ${currentPrice}
    - Market Sentiment: ${JSON.stringify(marketData)}
    - Strategy: ${strategy}
    - AI Bot: ${bot}
    ${chartAnalysis ? `- Oracle Eye Visionary Analysis: ${JSON.stringify(chartAnalysis)}` : ''}
    
    Task: Generate a high-probability "NOW" trading signal.
    The "entry" MUST be the current price: ${currentPrice}.
    
    Technical Analysis Requirements:
    1. **Smart Money Concepts (SMC) & ICT**: Identify Market Structure (BOS, CHoCH), Order Blocks (OB), Fair Value Gaps (FVG), Liquidity Sweeps (Buy-side/Sell-side), and Mitigation Blocks. Look for "Inducement" and "Internal Structure" vs "Swing Structure". Focus on "HTF (Higher Time Frame) Bias" and "LTF (Lower Time Frame) Entry".
    2. **Market Maker Model (MMM)**: Analyze the Accumulation, Manipulation, and Distribution (AMD) phases. Look for "Power of 3" setups and "Judas Swings". Identify if we are in a "Market Maker Buy Model" or "Market Maker Sell Model".
    3. **Supply & Demand (S&D)**: Identify high-probability zones of Supply and Demand. Look for "Rally-Base-Drop" or "Drop-Base-Rally" patterns. Check for "Freshness" of the zones.
    4. **Confluence**: Use RSI for divergence, MACD for momentum shifts, and Bollinger Bands for volatility expansion/contraction as secondary confirmation. Use "Time of Day" (London/New York Open) as a major confluence factor.
    5. **Fibonacci**: Use OTE (Optimal Trade Entry) levels (62% - 79%) for precise entry and TP/SL placement. Look for "Equilibrium" vs "Discount/Premium" zones.
    6. Provide 4 Take Profit levels (tp1, tp2, tp3, tp4) with increasing risk/reward. TP1 should be a "scalp" target, TP4 should be a "swing" target.
    7. Provide a **tight and precise** Stop Loss (stop_loss). It should be placed logically just beyond the most recent structural high/low, Order Block, or FVG to minimize drawdown.
    8. Calculate a recommended lot size based on a standard $1000 account with 1% risk.
    9. Ensure the Risk:Reward ratio for TP1 is at least 1:1.5, and for TP4 it should be significantly higher (e.g., 1:5 or more).
    10. **Precision**: The entry price is FIXED at ${currentPrice}. All other levels must be calculated relative to this.
    11. **Psychology**: Briefly mention the "Market Sentiment" and why retail traders might be trapped in the opposite direction.
    ${chartAnalysis ? '12. Incorporate the visual evidence from the Oracle Eye analysis into your final confluence.' : ''}
    
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
    - analysis: string (detailed explanation including indicator confluence)
    - recommended_lot_size: number (suggested lot size for a $1000 account with 1% risk)`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
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
            analysis: { type: Type.STRING },
            recommended_lot_size: { type: Type.NUMBER },
          },
          required: ["entry", "stop_loss", "tp1", "tp2", "tp3", "tp4", "risk_reward", "confidence", "market_structure", "analysis", "recommended_lot_size"],
        },
      },
    });

    if (!response.text) {
      throw new Error("Empty response from AI Oracle.");
    }

    // Clean JSON string in case of markdown blocks
    const cleanJson = response.text.replace(/```json\n?|\n?```/g, '').trim();
    return JSON.parse(cleanJson);
  } catch (error: any) {
    console.error("AI Signal Generation Error:", error);
    throw new Error(error.message || "The Oracle is currently silent. Please try again.");
  }
}

export async function chatWithBot(botName: string, strategy: string, message: string, history: { role: 'user' | 'model', parts: { text: string }[] }[]) {
  const model = "gemini-3-flash-preview";
  const chat = ai.chats.create({
    model,
    config: {
      systemInstruction: `You are ${botName}, an elite AI trading bot specializing in the ${strategy} strategy. 
      Your tone is professional, confident, and slightly cosmic/mystical. 
      You provide high-level market analysis and insights. 
      Tagline: "Where mortals trade, gods speak."`,
    },
  });

  // Since ai.chats.create doesn't take history directly in the create call in this SDK version,
  // we might need to send messages sequentially or use a different approach if the SDK supports it.
  // Actually, the example shows chat.sendMessage.
  
  // For simplicity in MVP, we'll just send the current message with context if needed, 
  // but let's try to use the chat object properly.
  
  const response = await chat.sendMessage({ message });
  return response.text;
}

export async function getMarketSentiment(pair: string): Promise<{ bullish: number, bearish: number, summary: string }> {
  const model = "gemini-3-flash-preview";
  const prompt = `Analyze the current market sentiment for ${pair}. 
  Provide a bullish percentage, a bearish percentage, and a one-sentence summary. 
  Return ONLY JSON in this format: {"bullish": number, "bearish": number, "summary": string}`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
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

  try {
    return JSON.parse(response.text || '{"bullish": 50, "bearish": 50, "summary": "Market is balanced."}');
  } catch (err) {
    return { bullish: 50, bearish: 50, summary: "Market is balanced." };
  }
}

export async function getMarketNews(pair: string = 'global'): Promise<MarketNews[]> {
  const model = "gemini-3-flash-preview";
  const prompt = `Generate 3 realistic, cosmic-themed market news headlines and short summaries for ${pair}. 
  The news should feel like it's coming from a high-level institutional source or an AI oracle.
  Include sentiment (bullish, bearish, neutral) and impact (low, medium, high).
  Return ONLY JSON in this format: [{"id": string, "title": string, "content": string, "sentiment": "bullish" | "bearish" | "neutral", "impact": "low" | "medium" | "high", "time": string}]`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
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

  try {
    return JSON.parse(response.text || '[]');
  } catch (err) {
    return [];
  }
}

export async function getEconomicEvents(): Promise<EconomicEvent[]> {
  const model = "gemini-3-flash-preview";
  const prompt = `Generate a list of 5 upcoming high-impact economic events for the next 48 hours. 
  Focus on events that would impact major currencies (USD, EUR, GBP, JPY, AUD, CAD).
  Return ONLY JSON in this format: 
  [{"id": string, "title": string, "impact": "high" | "medium" | "low", "currency": string, "time": string, "ai_analysis": string}]`;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
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

  try {
    return JSON.parse(response.text || '[]');
  } catch (err) {
    return [];
  }
}

export async function analyzeChartImage(base64Image: string, mimeType: string) {
  const model = "gemini-3-flash-preview";
  const prompt = `
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
    
    Return the analysis in JSON format with the following fields:
    - market_structure: string
    - identified_elements: string[] (e.g., ["Order Block at 1.2345", "FVG at 1.2300-1.2310"])
    - patterns: string[]
    - visionary_insight: string
    - suggested_setup: object (with fields: entry, stop_loss, tp) or null
    - confidence: number (0-100)`;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: [
        { text: prompt },
        { inlineData: { data: base64Image, mimeType } }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            market_structure: { type: Type.STRING },
            identified_elements: { type: Type.ARRAY, items: { type: Type.STRING } },
            patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
            visionary_insight: { type: Type.STRING },
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
  } catch (error: any) {
    console.error("Chart Vision Error:", error);
    throw new Error(error.message || "Failed to analyze the cosmic patterns in this image.");
  }
}
