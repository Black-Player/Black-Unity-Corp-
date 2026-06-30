import { UserProfile, Trade } from "../types";
import { dbService } from "../services/dbService";
import { where, orderBy, limit } from "firebase/firestore";
import { GoogleGenAI } from "@google/genai";

/**
 * Omni Evolution Core: Behavioral Intelligence Engine
 * Tracks user behavior patterns to identify emotional trading, revenge trading, and over-leverage.
 */
export const BehavioralService = {
    /**
     * Auto-Journaling: Records user habits and patterns knowing the user fully.
     */
    async journalActivity(uid: string, action: string, metadata: any) {
        try {
            const entry = {
                uid,
                action,
                metadata,
                timestamp: new Date().toISOString(),
                type: 'behavioral_log'
            };
            await dbService.create('user_journal', entry);
        } catch (err) {
            console.error("Journaling failed", err);
        }
    },

    /**
     * Recommends Growth Ways for accounts based on patterns.
     */
    async getGrowthRecommendations(uid: string): Promise<string[]> {
        const dna = await this.getUserDNA(uid);
        const recs: string[] = [];

        if (dna.winRate < 40) {
            recs.push("The Oracle suggests tightening your structure validation. Only enter near high-timeframe order blocks.");
        }
        if (dna.avgLoss > dna.avgWin) {
            recs.push("Your Risk/Reward alignment is fractured. Target a minimum of 1:3 RR to restore cosmic balance.");
        }
        if (dna.revengeTradingCount > 0) {
            recs.push("The Meditation Cooldown is designed for your protection. Respect the silence after a loss.");
        }
        
        return recs.length > 0 ? recs : ["Your discipline reflects excellence. Continue the path of the enlightened strategist."];
    },

    /**
     * Phase 7: OMNI-TIER ASCENSION SYSTEM
     * Evaluates user performance and automatically ranks them up.
     */
    async evaluateAscension(userProfile: UserProfile): Promise<UserProfile | null> {
        try {
            const dna = await this.getUserDNA(userProfile.uid);
            let newRank = userProfile.student_rank;
            let newTier = userProfile.student_tier;
            let upgraded = false;

            if (dna.totalTrades >= 50 && dna.winRate >= 70 && dna.avgWin > dna.avgLoss) {
                newRank = 'Ascended';
                newTier = 'ascended';
                upgraded = true;
            } else if (dna.totalTrades >= 20 && dna.winRate >= 60) {
                newRank = 'Elite';
                newTier = 'zion';
                upgraded = true;
            } else if (dna.totalTrades >= 10 && dna.winRate >= 50) {
                newRank = 'Disciplined';
                newTier = 'oracle';
                upgraded = true;
            }

            // Only update if rank actually progressed positively (basic check)
            if (upgraded && newRank !== userProfile.student_rank) {
                await dbService.update('users', userProfile.uid, {
                    student_rank: newRank,
                    student_tier: newTier
                });
                return { ...userProfile, student_rank: newRank, student_tier: newTier };
            }
            return null;
        } catch (err) {
            console.error("Ascension evaluation failed", err);
            return null;
        }
    },

    /**
     * Detects if the user is in a state of 'Revenge Trading'.
     * Defined as: Taking a large trade immediately after a loss with higher risk.
     */
    async detectRevengeTrading(uid: string, lastPnl: number): Promise<boolean> {
        if (lastPnl >= 0) return false;

        const recentTrades = await dbService.list('trades', [
            where('uid', '==', uid),
            orderBy('created_at', 'desc'),
            limit(2)
        ]);

        if (recentTrades.length < 2) return false;

        const [current, previous] = recentTrades as Trade[];
        
        // If the current trade was opened within 15 minutes of the previous one (which was a loss)
        const timeDiff = new Date(current.created_at).getTime() - new Date(previous.closed_at || '').getTime();
        const fifteenMinutes = 15 * 60 * 1000;

        return timeDiff < fifteenMinutes && previous.pnl < 0;
    },

    /**
     * Evaluates User DNA - consistent patterns in trading.
     */
    async getUserDNA(uid: string) {
        const history = await dbService.list('trades', [
            where('uid', '==', uid),
            where('status', '==', 'closed'),
            orderBy('closed_at', 'desc'),
            limit(50)
        ]);

        const stats: any = (history as any[]).reduce((acc: any, trade: any) => {
            acc.total += 1;
            if (trade.pnl > 0) acc.wins += 1;
            else {
                acc.losses += 1;
                acc.totalLossAmount += Math.abs(trade.pnl);
            }
            
            acc.avgHoldTime += (new Date(trade.closed_at).getTime() - new Date(trade.created_at).getTime());
            return acc;
        }, { total: 0, wins: 0, losses: 0, totalLossAmount: 0, avgHoldTime: 0, winRate: 0, avgWin: 0, avgLoss: 0, revengeTradingCount: 0 });

        if (stats.total > 0) {
            stats.winRate = (stats.wins / stats.total) * 100;
            stats.avgHoldTime /= stats.total;
            stats.avgLoss = stats.losses > 0 ? stats.totalLossAmount / stats.losses : 0;
            // Simplified revenge trading count for DNA
            stats.revengeTradingCount = 0; // Would ideally be calculated from temporal gaps
        }

        return stats;
    },

    /**
     * Triggers cooldown if unsafe behavior detected.
     */
    async triggerCooldown(uid: string, reason: string) {
        await dbService.update('users', uid, {
            'risk_settings.cooldown_active': true,
            'risk_settings.cooldown_reason': reason,
            'risk_settings.cooldown_until': new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString() // 2 hour cooldown
        });
    }
};
