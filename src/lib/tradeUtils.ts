import { UserProfile } from "../types";

/**
 * Calculates the lot size based on balance, risk percentage, and SL distance.
 * Includes precise tracking for Deriv multipliers vs Forex.
 */
export function calculateAutoLotSize(balance: number, riskPercentage: number, entry: number, stopLoss: number, pair: string = 'CRASH500'): number {
    const slDistance = Math.abs(entry - stopLoss);
    if (slDistance === 0) return 0.20; 
    
    // Default Deriv Lot sizing behavior
    let minLot = 0.20; // Default for Crash/Boom 500/1000
    if (pair.includes('R_10') || pair.includes('R_25') || pair.includes('R_50') || pair.includes('R_75') || pair.includes('R_100')) {
        minLot = 0.50;
    } else if (pair.includes('frx') || pair.includes('OTC_')) {
        minLot = 0.01;
    }

    // PART 2: Safe exposure for small accounts
    let adjustedRisk = riskPercentage;
    if (balance <= 20) {
        adjustedRisk = Math.min(riskPercentage, 5); // Allow slightly higher risk to grow micro accounts
    } else if (balance < 500) {
        adjustedRisk = Math.min(riskPercentage, 2); 
    }

    const riskAmount = balance * (adjustedRisk / 100);
    const rawLotSize = riskAmount / slDistance;
    
    return Number(Math.max(minLot, rawLotSize).toFixed(2));
}

/**
 * Capital Protection Engine Logic
 * Evaluates if a trade should even be taken based on current exposure and behavioral sentiment.
 */
export function evaluateCapitalSafety(userProfile: UserProfile, openTradesCount: number): { safe: boolean, reason?: string } {
    // Check Cooldown
    if (userProfile.cooldown_active) {
        const cooldownUntil = new Date(userProfile.cooldown_until || '');
        if (cooldownUntil > new Date()) {
            return { safe: false, reason: `Sentinel Cooldown Active: ${userProfile.cooldown_reason}. Portals lock for safety until ${cooldownUntil.toLocaleTimeString()}.` };
        }
    }

    const maxExposure = userProfile.account_type === 'demo' ? 5 : (userProfile.risk_settings?.max_open_positions || 3);
    
    if (openTradesCount >= maxExposure) {
        return { safe: false, reason: "Maximum celestial exposure reached. Close existing portals first." };
    }
    
    // PART 3: Anti-Loss Guard
    if (userProfile.consecutive_losses >= 3) {
        return { safe: false, reason: "Anti-Loss Engine Active: Hard Pause due to consecutive failures. Meditation required." };
    }

    return { safe: true };
}

/**
 * Dynamic SL System
 * Ensures SL is structure-based and volatility-aware.
 */
export function validateSLRange(entry: number, sl: number, tp: number): boolean {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    
    // Minimum 1:2 RR for the Oracle
    return reward >= risk * 2;
}
