-- Supabase Schema for Zion Oracle

-- Users Table
CREATE TABLE users (
  uid UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT UNIQUE NOT NULL,
  username TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'subscriber',
  tier TEXT DEFAULT 'free',
  student_tier TEXT,
  student_rank TEXT,
  ap INTEGER DEFAULT 0,
  penalties INTEGER DEFAULT 0,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  signals_used_today INTEGER DEFAULT 0,
  last_reset_date TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_pnl NUMERIC DEFAULT 0,
  win_rate NUMERIC DEFAULT 0,
  credits INTEGER DEFAULT 0,
  referral_code TEXT,
  notification_settings JSONB DEFAULT '{"new_signals": true, "signal_updates": true, "sound": true, "email_digest": false}',
  account_type TEXT DEFAULT 'demo',
  demo_balance NUMERIC DEFAULT 10000,
  live_balance NUMERIC DEFAULT 0,
  daily_pnl NUMERIC DEFAULT 0,
  custom_bots JSONB DEFAULT '[]',
  risk_settings JSONB DEFAULT '{"max_daily_loss": 50, "max_open_positions": 3, "risk_per_trade": 1, "stop_loss_buffer": 5}',
  auto_trade_settings JSONB DEFAULT '{"enabled": false, "min_confidence": 90, "max_trades_per_day": 5, "pairs": ["CRASH500", "BOOM1000", "R_75"]}',
  stats JSONB DEFAULT '{"total_trades": 0, "wins": 0, "losses": 0, "profit_factor": 0, "max_drawdown": 0}',
  theme TEXT DEFAULT 'cosmic',
  subscribed_sessions TEXT[] DEFAULT '{}'
);

-- Signals Table
CREATE TABLE signals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid UUID REFERENCES auth.users(id),
  pair TEXT NOT NULL,
  timeframe TEXT,
  entry NUMERIC,
  stop_loss NUMERIC,
  tp1 NUMERIC,
  tp2 NUMERIC,
  tp3 NUMERIC,
  tp4 NUMERIC,
  risk_reward NUMERIC,
  strategy TEXT,
  ai_bot TEXT,
  confidence NUMERIC,
  market_structure TEXT,
  liquidity_presence BOOLEAN,
  volatility_validation BOOLEAN,
  session_timing TEXT,
  confirmations_count INTEGER,
  analysis TEXT,
  recommended_lot_size NUMERIC,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  telegram_message_id TEXT
);

-- Trades Table
CREATE TABLE trades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid UUID REFERENCES auth.users(id),
  signal_id UUID REFERENCES signals(id),
  pair TEXT NOT NULL,
  entry_price NUMERIC,
  current_price NUMERIC,
  exit_price NUMERIC,
  tp1 NUMERIC,
  tp2 NUMERIC,
  tp3 NUMERIC,
  tp4 NUMERIC,
  stop_loss NUMERIC,
  pnl NUMERIC DEFAULT 0,
  pnl_percentage NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'open',
  type TEXT,
  account_type TEXT,
  close_reason TEXT,
  mae NUMERIC,
  mfe NUMERIC,
  tp_hits TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  closed_at TIMESTAMPTZ
);

-- Alerts Table
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid UUID REFERENCES auth.users(id),
  pair TEXT NOT NULL,
  price NUMERIC NOT NULL,
  condition TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications Table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'system',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Posts Table
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  uid UUID REFERENCES auth.users(id),
  username TEXT,
  avatar_url TEXT,
  content TEXT NOT NULL,
  likes UUID[] DEFAULT '{}',
  comments JSONB DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  signal_id UUID REFERENCES signals(id)
);

-- Access Keys Table
CREATE TABLE access_keys (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  key TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL,
  usage_count INTEGER DEFAULT 0,
  usage_limit INTEGER DEFAULT 1,
  expiry TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tribes Table
CREATE TABLE tribes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  creator_id TEXT,
  members TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tasks Table
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  assigner_id TEXT,
  assignee_id TEXT,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending',
  deadline TIMESTAMPTZ,
  tribe_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RPC for incrementing usage count
CREATE OR REPLACE FUNCTION increment_usage_count(key_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE access_keys
  SET usage_count = usage_count + 1
  WHERE id = key_id;
END;
$$ LANGUAGE plpgsql;

-- Enable Realtime for all tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE signals;
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE posts;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
