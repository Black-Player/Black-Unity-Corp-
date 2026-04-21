export type UserRole = 'creator' | 'investor' | 'student' | 'subscriber';

export type StudentTier = 'initiate' | 'oracle' | 'zion' | 'ascended';

export type StudentRank = 'Initiate' | 'Developing' | 'Disciplined' | 'Elite' | 'Ascended';

export type Tier = 'free' | 'oracle' | 'zion' | 'legendary' | 'mythic' | 'creator';

export type AppTheme = 'cosmic' | 'nebula-bleach' | 'nebula-jjk' | 'nebula-demonslayer' | 'nebula-naruto' | 'nebula-dbs' | 'nebula-kof' | 'nebula-sf' | 'nebula-mvc' | 'heavenly';

export interface UserProfile {
  uid: string;
  email: string;
  username?: string;
  role: UserRole;
  tier: Tier;
  student_tier?: StudentTier;
  student_rank?: StudentRank;
  ap: number; // Advancement Points
  penalties: number;
  theme?: AppTheme;
  signals_used_today: number;
  backtests_used_today?: number;
  last_reset_date: string;
  created_at: string;
  total_pnl: number;
  win_rate: number;
  credits: number;
  referral_code?: string;
  referred_by?: string;
  notification_settings: {
    new_signals: boolean;
    signal_updates: boolean;
    sound: boolean;
    email_digest: boolean;
  };
  subscribed_sessions?: string[];
  account_type: 'demo' | 'live';
  demo_balance: number;
  live_balance: number;
  risk_settings: {
    max_daily_loss: number;
    max_open_positions: number;
    risk_per_trade: number;
    stop_loss_buffer: number;
    max_daily_trades?: number;
    max_drawdown_limit?: number;
    prop_firm_mode?: boolean;
    trading_hours?: {
      start: string;
      end: string;
      enabled: boolean;
    };
  };
  auto_trade_settings: {
    enabled: boolean;
    min_confidence: number;
    max_trades_per_day: number;
    pairs: string[];
  };
  stats: {
    total_trades: number;
    wins: number;
    losses: number;
    profit_factor: number;
    max_drawdown: number;
  };
  portfolio?: {
    symbol: string;
    amount: number;
    avg_price: number;
    account_type: 'demo' | 'live';
  }[];
  custom_bots?: Bot[];
  daily_pnl: number;
  xp: number;
  level: number;
  consecutive_losses: number;
  followed_traders?: string[];
  followers_count?: number;
  following_count?: number;
  completed_lessons?: string[];
  active_challenges?: string[];
  owned_items?: string[];
  bio?: string;
  avatar_url?: string;
  is_public?: boolean;
  weekly_pnl?: number;
  monthly_pnl?: number;
  notification_count?: number;
  cooldown_active?: boolean;
  cooldown_until?: string;
  cooldown_reason?: string;
}

export interface AccessKey {
  id: string;
  key: string;
  type: 'student' | 'investor';
  expiry?: string;
  usage_limit: number;
  usage_count: number;
  created_at: string;
  signature: string;
}

export interface AdvancementRequest {
  id: string;
  uid: string;
  current_tier: StudentTier;
  target_tier: StudentTier;
  ap_score?: number; // Deprecated in favor of ap_at_request
  ap_at_request: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

export interface Signal {
  id: string;
  uid: string;
  pair: string;
  timeframe: string;
  decision?: 'Buy' | 'Sell' | 'No Trade';
  decision_reasoning?: string;
  visual_blueprint?: string;
  ai_sentiment_feedback?: string;
  entry: number;
  stop_loss: number;
  tp1: number;
  tp2: number;
  tp3: number;
  tp4: number;
  risk_reward: number;
  strategy: string;
  ai_bot: string;
  confidence: number;
  market_structure?: string; // BOS / CHOCH
  liquidity_presence?: boolean;
  volatility_validation?: boolean;
  session_timing?: string;
  confirmations_count?: number;
  analysis: string;
  recommended_lot_size: number;
  status: 'active' | 'tp1_hit' | 'tp2_hit' | 'tp3_hit' | 'tp4_hit' | 'sl_hit';
  created_at: string;
  is_shared?: boolean;
  likes_count?: number;
  shares_count?: number;
  telegram_message_id?: string;
}

export interface Trade {
  id: string;
  uid: string;
  signal_id: string;
  pair: string;
  entry_price: number;
  current_price: number;
  tp1: number;
  tp2: number;
  tp3: number;
  tp4: number;
  active_tp?: 1 | 2 | 3 | 4;
  lot_size?: number;
  stop_loss: number;
  pnl: number;
  pnl_percentage: number;
  status: 'open' | 'closed';
  type: 'buy' | 'sell';
  account_type: 'demo' | 'live';
  created_at: string;
  closed_at?: string;
  exit_price?: number;
  close_reason?: string;
  tp_hits?: string[];
  mae?: number;
  mfe?: number;
  max_pnl?: number;
  min_pnl?: number;
  notes?: string;
  emotion?: 'neutral' | 'confident' | 'anxious' | 'greedy' | 'fearful';
  is_ghost?: boolean;
}

export interface Bot {
  id?: string;
  name: string;
  strategy: string;
  tier_requirement: Tier;
  description: string;
  icon: string;
  character?: string;
  risk_profile?: string;
  preferred_pairs?: string[];
  preferred_timeframes?: string[];
  personality?: 'stoic' | 'aggressive' | 'mystical' | 'analytical';
  created_at?: string;
}

export interface EconomicEvent {
  id: string;
  title: string;
  impact: 'low' | 'medium' | 'high';
  currency: string;
  time: string;
  ai_analysis: string;
}

export interface PriceAlert {
  id: string;
  uid: string;
  pair: string;
  price: number;
  condition: 'above' | 'below';
  active: boolean;
  created_at: string;
}

export interface MasterStrategy {
  id: string;
  uid: string;
  name: string;
  bots: string[];
  risk_weight: number;
  created_at: string;
}

export interface Tribe {
  id: string;
  name: string;
  description: string;
  creator_id: string;
  members: string[];
  created_at: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  target_pnl: number;
  reward: string;
  active: boolean;
}

export const BOTS: Bot[] = [
  { name: 'Trinity', strategy: 'MMM', tier_requirement: 'free', description: 'The Mother of all bots. Reliable and steady.', icon: 'Zap' },
  { name: 'Neo', strategy: 'SMC', tier_requirement: 'oracle', description: 'Smart Money Concepts specialist. Sees the code in the charts.', icon: 'Cpu' },
  { name: 'Morpheus', strategy: 'ICT', tier_requirement: 'oracle', description: 'Inner Circle Trader. Master of liquidity and gaps.', icon: 'Eye' },
  { name: 'Oracle', strategy: 'Supply/Demand', tier_requirement: 'oracle', description: 'Predicts where the big players are buying and selling.', icon: 'Activity' },
  { name: 'Zion', strategy: 'Chart Patterns', tier_requirement: 'zion', description: 'Master of geometry and psychological levels.', icon: 'Grid' },
  { name: 'Sentinel', strategy: 'ICT/SMC Hybrid', tier_requirement: 'zion', description: 'Advanced hybrid bot for high-precision entries.', icon: 'Shield' },
  { name: 'Architect', strategy: 'All Strategies', tier_requirement: 'zion', description: 'The ultimate bot. Combines all strategies for maximum confidence.', icon: 'Layout' },
  { name: 'Hyperion', strategy: 'Institutional Order Flow', tier_requirement: 'legendary', description: 'Titan of the markets. Analyzes depth of book and massive institutional moves.', icon: 'Zap' },
];

export const TIER_ORDER: Tier[] = ['free', 'oracle', 'zion', 'legendary', 'mythic', 'creator'];

export function hasTierAccess(userTier: Tier, requiredTier: Tier): boolean {
  return TIER_ORDER.indexOf(userTier) >= TIER_ORDER.indexOf(requiredTier);
}

export const TIER_LIMITS: Record<Tier, number> = {
  free: 2,
  oracle: 7,
  zion: 15,
  legendary: 30,
  mythic: 100,
  creator: 999999,
};

export const TIER_BOT_LIMITS: Record<Tier, number> = {
  free: 1,
  oracle: 4,
  zion: 7,
  legendary: 10,
  mythic: 15,
  creator: 15,
};

export const TIER_PRICES: Record<Tier, number> = {
  free: 0,
  oracle: 299, // ZAR
  zion: 599, // ZAR
  legendary: 1299, // ZAR
  mythic: 2999, // ZAR
  creator: 0,
};

export const TIER_FEATURES: Record<Tier, string[]> = {
  free: ['2 Signals Daily', '1 AI Bot Access', 'Basic Community Chat', 'Demo Account Only'],
  oracle: ['7 Signals Daily', '4 AI Bot Access', 'Advanced AI Chat', 'Economic Calendar Analysis', 'Live Account Trading'],
  zion: ['15 Signals Daily', '7 AI Bot Access', 'Custom Bot Forge', 'Portfolio Health Analytics', 'Priority Support'],
  legendary: ['30 Signals Daily', '10 AI Bot Access', 'Master Strategy Builder', 'Performance Reports', 'Early Access Features'],
  mythic: ['Unlimited Signals', 'All AI Bots', 'Direct Oracle Feed', 'Personal Account Manager', 'Exclusive Tribes'],
  creator: ['Platform Owner Privileges', 'Unlimited Everything'],
};

export interface MarketplaceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  type: 'bot_config' | 'strategy';
  seller_id: string;
  created_at: string;
}

export interface MarketNews {
  id: string;
  title: string;
  content: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  impact: 'low' | 'medium' | 'high';
  time: string;
}

export interface UserProgress {
  xp: number;
  level: number;
  completed_lessons: string[];
}

export interface SharedPost {
  id: string;
  uid: string;
  username: string;
  avatar_url?: string;
  content: string;
  signal_id?: string;
  likes: string[]; // array of user ids
  comments: Comment[];
  created_at: string;
}

export interface Comment {
  id: string;
  uid: string;
  username: string;
  content: string;
  created_at: string;
}

export interface LeaderboardEntry {
  uid: string;
  username: string;
  avatar_url?: string;
  total_pnl: number;
  win_rate: number;
  level: number;
  tier: Tier;
  win_streak?: number;
  best_asset?: string;
}
