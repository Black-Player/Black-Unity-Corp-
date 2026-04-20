-- ==========================================
-- Supabase RLS Policies (PostgreSQL)
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- 1. USERS Table Policies
CREATE POLICY "Users can view their own profile" 
ON users FOR SELECT 
USING (auth.uid() = uid);

CREATE POLICY "Users can update their own profile" 
ON users FOR UPDATE 
USING (auth.uid() = uid)
WITH CHECK (
  auth.uid() = uid AND 
  role = OLD.role AND 
  tier = OLD.tier
);

-- 2. SIGNALS Table Policies
CREATE POLICY "Authenticated users can view signals" 
ON signals FOR SELECT 
USING (auth.role() = 'authenticated');

CREATE POLICY "Users can create their own signals" 
ON signals FOR INSERT 
WITH CHECK (auth.uid() = uid);

-- 3. TRADES Table Policies
CREATE POLICY "Users can view their own trades" 
ON trades FOR SELECT 
USING (auth.uid() = uid);

CREATE POLICY "Users can create their own trades" 
ON trades FOR INSERT 
WITH CHECK (auth.uid() = uid);

CREATE POLICY "Users can update their own trades" 
ON trades FOR UPDATE 
USING (auth.uid() = uid);

-- 4. NOTIFICATIONS Table Policies
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = uid);

CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = uid);

-- 5. ADMIN/CREATOR Bypass
-- (Usually handled by a service role or a specific policy using a function)
CREATE OR REPLACE FUNCTION is_admin() RETURNS boolean AS $$
BEGIN
  RETURN (SELECT role FROM users WHERE uid = auth.uid()) = 'creator';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE POLICY "Admins have full access" 
ON users FOR ALL 
USING (is_admin());
