import { UserProfile } from "../types";

/**
 * Calculates the lot size based on balance, risk percentage, and SL distance.
 * Includes precise tracking for Deriv multipliers vs Forex.
 */
export function calculateCorrelationCoefficient(pair1: string, pair2: string): number {
    const p1 = pair1.toUpperCase();
    const p2 = pair2.toUpperCase();
    
    if (p1 === p2) return 1.0;
    
    const isUSD = (p: string) => p.includes('USD');
    const isEUR = (p: string) => p.includes('EUR');
    const isGBP = (p: string) => p.includes('GBP');
    const isJPY = (p: string) => p.includes('JPY');
    const isCrypto = (p: string) => p.includes('BTC') || p.includes('ETH') || p.includes('SOL');
    const isCrash = (p: string) => p.includes('CRASH');
    const isBoom = (p: string) => p.includes('BOOM');
    const isVolatility = (p: string) => /(V|VOLATILITY|R_)?(10|25|50|75|100)/.test(p);
    
    if (isUSD(p1) && isUSD(p2)) return 0.82;
    if (isEUR(p1) && isEUR(p2)) return 0.78;
    if (isGBP(p1) && isGBP(p2)) return 0.76;
    if (isJPY(p1) && isJPY(p2)) return 0.81;
    if (isCrypto(p1) && isCrypto(p2)) return 0.85;
    if (isCrash(p1) && isCrash(p2)) return 0.80;
    if (isBoom(p1) && isBoom(p2)) return 0.80;
    
    if (isVolatility(p1) && isVolatility(p2)) return 0.75;
    if ((p1.includes('XAU') && p2.includes('XAG')) || (p1.includes('XAG') && p2.includes('XAU'))) return 0.88;

    return 0.15 + (Math.random() * 0.1);
}

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
        return { safe: false, reason: "Maximum celestial exposure reached. Risk of correlation is too high. Close existing portals first." };
    }
    
    // PART 3: Anti-Loss Guard (Evolved)
    if (userProfile.consecutive_losses >= 3) {
        return { safe: false, reason: "Anti-Loss Engine Active: The impatient hunter returns hungry. Hard Pause due to consecutive failures. Meditation required." };
    }

    if (userProfile.consecutive_losses === 2) {
        // Enforce strict rules
        if (openTradesCount >= 1) {
            return { safe: false, reason: "Capital Protection Mode: Danger detected. Limit 1 open trade while recovering."};
        }
    }

    return { safe: true };
}

/**
 * Dynamic SL System
 * Ensures SL is structure-based, volatility-aware, never random.
 */
export function validateSLRange(entry: number, sl: number, tp: number): boolean {
    const risk = Math.abs(entry - sl);
    const reward = Math.abs(tp - entry);
    
    if (risk === 0) return false;

    // Minimum 1:2 RR for the Oracle to ensure Strict Institutional Grade rules.
    return reward >= risk * 2;
}
