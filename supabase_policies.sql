-- ===============================================================
-- Supabase RLS Policies (Zion Trading System)
-- ===============================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE advancement_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tribes ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_chat ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE academy_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE backtests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE access_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE indicators ENABLE ROW LEVEL SECURITY;
ALTER TABLE journal ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace ENABLE ROW LEVEL SECURITY;

-- Helper Functions
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT role = 'creator' 
    FROM users 
    WHERE uid = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users Table
CREATE POLICY "Users can read their own profile"
ON users FOR SELECT
USING (auth.uid() = uid OR is_admin());

CREATE POLICY "Users can update their own profile (restricted fields)"
ON users FOR UPDATE
USING (auth.uid() = uid)
WITH CHECK (
  auth.uid() = uid AND 
  (
    -- Prevent self-escalation
    (SELECT role FROM users WHERE uid = auth.uid()) = 'creator' OR
    (
      OLD.role = NEW.role AND 
      OLD.tier = NEW.tier AND 
      OLD.ap = NEW.ap AND
      OLD.credits = NEW.credits
    )
  )
);

-- Signals Table
CREATE POLICY "Anyone can read signals"
ON signals FOR SELECT
USING (true);

CREATE POLICY "Only creators can manage signals"
ON signals FOR ALL
USING (is_admin());

-- Trades Table
CREATE POLICY "Users can read their own trades"
ON trades FOR SELECT
USING (auth.uid() = uid OR is_admin());

CREATE POLICY "Users can insert their own trades"
ON trades FOR INSERT
WITH CHECK (auth.uid() = uid);

CREATE POLICY "Users can update their own trades"
ON trades FOR UPDATE
USING (auth.uid() = uid)
WITH CHECK (auth.uid() = uid AND OLD.uid = NEW.uid);

-- Posts Table
CREATE POLICY "Anyone can read posts"
ON posts FOR SELECT
USING (true);

CREATE POLICY "Users can create posts"
ON posts FOR INSERT
WITH CHECK (auth.uid() = uid);

CREATE POLICY "Users can update/delete their own posts"
ON posts FOR ALL
USING (auth.uid() = uid OR is_admin());

-- API Keys (Vault) - CRITICAL
CREATE POLICY "Users can only see their own API keys"
ON api_keys FOR SELECT
USING (auth.uid() = uid);

CREATE POLICY "Users can only manage their own API keys"
ON api_keys FOR ALL
USING (auth.uid() = uid);

-- AI Messages
CREATE POLICY "Users can manage their own AI messages"
ON ai_messages FOR ALL
USING (auth.uid() = uid);

-- Community Chat
CREATE POLICY "Anyone can read community chat"
ON community_chat FOR SELECT
USING (true);

CREATE POLICY "Users can post to community chat"
ON community_chat FOR INSERT
WITH CHECK (auth.uid() = uid);

-- Advancement Requests
CREATE POLICY "Users can manage their own requests"
ON advancement_requests FOR ALL
USING (auth.uid() = uid OR is_admin());

-- Tribes
CREATE POLICY "Anyone can read tribes"
ON tribes FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own tribes"
ON tribes FOR ALL
USING (auth.uid() = creator_id OR is_admin());

-- Notifications
CREATE POLICY "Users can manage their own notifications"
ON notifications FOR ALL
USING (auth.uid() = uid);

-- Marketplace
CREATE POLICY "Anyone can read marketplace"
ON marketplace FOR SELECT
USING (true);

CREATE POLICY "Users can manage their own marketplace items"
ON marketplace FOR ALL
USING (auth.uid() = seller_id OR is_admin());
