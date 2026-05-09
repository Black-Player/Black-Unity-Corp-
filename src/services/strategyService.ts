import { GoogleGenAI, Type } from "@google/genai";
import { dbService } from "./dbService";
import { SYSTEM_ROLE } from "../constants/systemRole";
import { Bot, UserProfile } from "../types";

export interface TradingStrategy {
    id: string;
    uid?: string;
    name: string;
    description: string;
    indicators: string[];
    risk_reward_target: number;
    win_rate_target: number;
    logic: string;
    performance?: {
        win_rate: number;
        drawdown: number;
        profit_factor: number;
        total_trades: number;
    };
    is_active: boolean;
    created_at: string;
    last_optimized: string;
}

export class StrategyService {
    private static apiKey = process.env.GEMINI_API_KEY?.trim();

    static async createAutonomousStrategy(bot: Bot): Promise<TradingStrategy> {
        if (!this.apiKey) throw new Error("API Key missing");

        const ai = new GoogleGenAI({ apiKey: this.apiKey });
        const model = "gemini-2.0-flash";
        
        const prompt = `
            Task: Create an autonomous, high-performance trading strategy for a bot named ${bot.name} using ${bot.strategy} as a base.
            
            CORE PRINCIPLES:
            - Price Action (BOS, CHOCH, S&D)
            - Advanced Indicators (RSI, MACD, Moving Averages)
            - Institutional Liquidity Logic (SMC/ICT)
            - Dynamic Risk Management
            
            Return in JSON:
            - name: Unique strategy name
            - description: Detailed summary
            - indicators: Array of indicators used
            - risk_reward_target: Target RR (e.g., 2.5)
            - win_rate_target: Target win rate
            - logic: Detailed step-by-step entry/exit logic
        `;

        try {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    systemInstruction: SYSTEM_ROLE + "\n\nYou are in STRATEGY CREATION MODE. Innovate, test, and evolve.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            indicators: { type: Type.ARRAY, items: { type: Type.STRING } },
                            risk_reward_target: { type: Type.NUMBER },
                            win_rate_target: { type: Type.NUMBER },
                            logic: { type: Type.STRING },
                        },
                        required: ["name", "description", "indicators", "risk_reward_target", "win_rate_target", "logic"],
                    }
                }
            });

            const strategyData = JSON.parse(response.text || '{}');
            const strategy: TradingStrategy = {
                ...strategyData,
                id: crypto.randomUUID(),
                is_active: true,
                created_at: new Date().toISOString(),
                last_optimized: new Date().toISOString()
            };

            return strategy;
        } catch (error: any) {
            if (error.message?.includes("API key not valid") || error.message?.includes("API_KEY_INVALID")) {
                throw new Error("Oracle Disconnected: Your Gemini API Key is invalid. Please insert a valid key in the AI Studio Settings under 'API Keys'.");
            }
            throw error;
        }
    }

    static async fuseStrategies(target: TradingStrategy, source: TradingStrategy): Promise<TradingStrategy> {
        if (!this.apiKey) throw new Error("API Key missing");

        const ai = new GoogleGenAI({ apiKey: this.apiKey });
        const model = "gemini-2.0-flash";

        const prompt = `
            Task: Perform "Strategy Fusion" (PART 9) to combine the strengths of two successful trading strategies into one Apex strategy.
            
            Strategy A (Target):
            Name: ${target.name}
            Logic: ${target.logic}
            Indicators: ${target.indicators.join(', ')}

            Strategy B (Source):
            Name: ${source.name}
            Logic: ${source.logic}
            Indicators: ${source.indicators.join(', ')}
            
            Return in JSON:
            - name: A hybridized name (e.g., "Apex Genesis")
            - description: Explanation of how the two styles were fused.
            - indicators: Array of merged indicators
            - risk_reward_target: Blended target RR
            - win_rate_target: Blended target win rate
            - logic: Detailed step-by-step entry/exit logic taking the best rules from both.
        `;

        try {
            const response = await ai.models.generateContent({
                model,
                contents: prompt,
                config: {
                    systemInstruction: SYSTEM_ROLE + "\n\nYou are in STRATEGY FUSION MODE. Eliminate weaknesses, combine strengths.",
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            description: { type: Type.STRING },
                            indicators: { type: Type.ARRAY, items: { type: Type.STRING } },
                            risk_reward_target: { type: Type.NUMBER },
                            win_rate_target: { type: Type.NUMBER },
                            logic: { type: Type.STRING },
                        },
                        required: ["name", "description", "indicators", "risk_reward_target", "win_rate_target", "logic"],
                    }
                }
            });

            const strategyData = JSON.parse(response.text || '{}');
            const strategy: TradingStrategy = {
                ...strategyData,
                id: crypto.randomUUID(),
                is_active: true,
                created_at: new Date().toISOString(),
                last_optimized: new Date().toISOString()
            };

            return strategy;
        } catch (error: any) {
            if (error.message?.includes("API key not valid") || error.message?.includes("API_KEY_INVALID")) {
                throw new Error("Oracle Disconnected: Your Gemini API Key is invalid. Please insert a valid key in the AI Studio Settings under 'API Keys'.");
            }
            throw error;
        }
    }

    static async backtestStrategy(strategy: TradingStrategy, historicalData: any[]): Promise<any> {
        // Simulation logic for backtesting
        const winRate = strategy.win_rate_target * (0.8 + Math.random() * 0.4); // Simulate variation
        const drawdown = (5 + Math.random() * 10);
        const profitFactor = (1.5 + Math.random() * 1);
        
        return {
            win_rate: winRate,
            drawdown: drawdown,
            profit_factor: profitFactor,
            total_trades: historicalData.length
        };
    }

    static async optimizeStrategy(strategy: TradingStrategy, history: any[]): Promise<TradingStrategy> {
        if (!this.apiKey) throw new Error("API Key missing");

        const ai = new GoogleGenAI({ apiKey: this.apiKey });
        const model = "gemini-2.0-flash";

        const prompt = `
            Optimize the following trading strategy: ${JSON.stringify(strategy)}
            Based on recent history: ${JSON.stringify(history.slice(-10))}
            
            Identify performance gaps and refine entry/exit rules to increase win rate and reduce drawdown.
            Return the refined strategy object.
        `;

        // Implementation of AI optimization logic...
        const response = await ai.models.generateContent({ model, contents: prompt });
        // Parse and return updated strategy...
        return strategy; // Placeholder
    }
}
