import { Bot, Layers, Zap, Cpu, Eye, Activity, Grid, Shield, Layout } from 'lucide-react';
import { Bot as BotType, Tier } from './types';

export const BOTS: BotType[] = [
  { name: 'Trinity', strategy: 'MMM', tier_requirement: 'free', description: 'The Mother of all bots. Reliable and steady.', icon: 'Zap' },
  { name: 'Neo', strategy: 'SMC', tier_requirement: 'oracle', description: 'Smart Money Concepts specialist. Sees the code in the charts.', icon: 'Cpu' },
  { name: 'Morpheus', strategy: 'ICT', tier_requirement: 'oracle', description: 'Inner Circle Trader. Master of liquidity and gaps.', icon: 'Eye' },
  { name: 'Oracle', strategy: 'Supply/Demand', tier_requirement: 'oracle', description: 'Predicts where the big players are buying and selling.', icon: 'Activity' },
  { name: 'Zion', strategy: 'Chart Patterns', tier_requirement: 'zion', description: 'Master of geometry and psychological levels.', icon: 'Grid' },
  { name: 'Sentinel', strategy: 'ICT/SMC Hybrid', tier_requirement: 'zion', description: 'Advanced hybrid bot for high-precision entries.', icon: 'Shield' },
  { name: 'Architect', strategy: 'All Strategies', tier_requirement: 'zion', description: 'The ultimate bot. Combines all strategies for maximum confidence.', icon: 'Layout' },
];

export interface Article {
  id: string;
  title: string;
  category: string;
  content: string;
  image_url: string;
  created_at: string;
  read_time?: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
}

export const DERIV_SYMBOLS = [
  // Derived Indices
  { symbol: 'R_10', name: 'Volatility 10' },
  { symbol: 'R_25', name: 'Volatility 25' },
  { symbol: 'R_50', name: 'Volatility 50' },
  { symbol: 'R_75', name: 'Volatility 75' },
  { symbol: 'R_100', name: 'Volatility 100' },
  { symbol: '1HZ10V', name: 'Volatility 10 (1s)' },
  { symbol: '1HZ25V', name: 'Volatility 25 (1s)' },
  { symbol: '1HZ50V', name: 'Volatility 50 (1s)' },
  { symbol: '1HZ75V', name: 'Volatility 75 (1s)' },
  { symbol: '1HZ100V', name: 'Volatility 100 (1s)' },
  { symbol: 'BOOM300', name: 'Boom 300' },
  { symbol: 'BOOM500', name: 'Boom 500' },
  { symbol: 'BOOM1000', name: 'Boom 1000' },
  { symbol: 'CRASH300', name: 'Crash 300' },
  { symbol: 'CRASH500', name: 'Crash 500' },
  { symbol: 'CRASH1000', name: 'Crash 1000' },
  { symbol: 'STP', name: 'Step Index' },
  { symbol: 'JD10', name: 'Jump 10' },
  { symbol: 'JD25', name: 'Jump 25' },
  { symbol: 'JD50', name: 'Jump 50' },
  { symbol: 'JD75', name: 'Jump 75' },
  { symbol: 'JD100', name: 'Jump 100' },
  
  // Forex
  { symbol: 'frxEURUSD', name: 'EUR/USD' },
  { symbol: 'frxGBPUSD', name: 'GBP/USD' },
  { symbol: 'frxUSDJPY', name: 'USD/JPY' },
  { symbol: 'frxAUDUSD', name: 'AUD/USD' },
  { symbol: 'frxUSDCAD', name: 'USD/CAD' },
  
  // Indices
  { symbol: 'OTC_NDX', name: 'US 100' },
  { symbol: 'OTC_DJI', name: 'US 30' },
  { symbol: 'OTC_GDAXI', name: 'GER 40' },
  
  // Commodities
  { symbol: 'frxXAUUSD', name: 'Gold/USD' },
  { symbol: 'frxXAGUSD', name: 'Silver/USD' },
  { symbol: 'frxWTI', name: 'Oil/USD' },
  
  // Crypto
  { symbol: 'cryBTCUSD', name: 'BTC/USD' },
  { symbol: 'cryETHUSD', name: 'ETH/USD' },
];

export const ACADEMY_ARTICLES: Article[] = [
  {
    id: '1',
    title: 'The Art of Cosmic Scalping',
    category: 'Strategy',
    content: 'Master the high-frequency movements of the market using AI-driven indicators. Scalping requires intense focus and a deep understanding of order flow. In the cosmic realm, we look for liquidity pools that act as magnets for price. When the Oracle identifies a high-probability setup, execution must be swift and precise.',
    image_url: 'https://picsum.photos/seed/trading1/800/400',
    created_at: new Date().toISOString(),
    read_time: '5 min',
    difficulty: 'Intermediate'
  },
  {
    id: '2',
    title: 'Understanding Liquidity Sweeps',
    category: 'SMC',
    content: 'Learn how institutional players manipulate price to trap retail traders. A liquidity sweep occurs when price moves beyond a previous high or low to collect stop orders before reversing. This is the bread and butter of Smart Money Concepts. By identifying these sweeps, you can enter trades with the big banks rather than against them.',
    image_url: 'https://picsum.photos/seed/trading2/800/400',
    created_at: new Date().toISOString(),
    read_time: '8 min',
    difficulty: 'Advanced'
  },
  {
    id: '3',
    title: 'Risk Management for Oracles',
    category: 'Psychology',
    content: 'The most important skill in trading is not winning, but not losing. Risk management is the shield that protects your capital from the volatility of the markets. Never risk more than 1% of your account on a single trade. Use stop losses religiously and understand that every trade is a game of probabilities.',
    image_url: 'https://picsum.photos/seed/trading3/800/400',
    created_at: new Date().toISOString(),
    read_time: '12 min',
    difficulty: 'Beginner'
  },
  {
    id: '4',
    title: 'The Psychology of the Void',
    category: 'Psychology',
    content: 'Trading is 90% mental. When you enter the void of the market, your emotions will be tested. Fear and greed are the two greatest enemies of the Oracle. Learn to detach from the outcome of a single trade and focus on the process. Consistency is born from a calm and disciplined mind.',
    image_url: 'https://picsum.photos/seed/psychology/800/400',
    created_at: new Date().toISOString(),
    read_time: '10 min',
    difficulty: 'Intermediate'
  },
  {
    id: '5',
    title: 'Mastering the MMM Strategy',
    category: 'Strategy',
    content: 'The Market Maker Method (MMM) is a powerful strategy that identifies the cycles of the market. By understanding the three-day cycle and the patterns of the market makers, you can predict reversals with high accuracy. Look for the "M" and "W" patterns at the peaks and troughs of the cycle.',
    image_url: 'https://picsum.photos/seed/strategy/800/400',
    created_at: new Date().toISOString(),
    read_time: '15 min',
    difficulty: 'Advanced'
  }
];
