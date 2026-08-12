import { useState } from 'react';
import { auth as firebaseAuth, googleProvider, signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from '../firebase';
import { dbService } from '../services/dbService';
import { UserProfile, AccessKey, UserRole, Tier, BlessedTierEmail } from '../types';
import { LogIn, UserPlus, Chrome, Key } from 'lucide-react';
import { motion } from 'motion/react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateAccessKey = async (keyStr: string, userEmail?: string): Promise<{ 
    role: UserRole; 
    tier: Tier; 
    keyId?: string; 
    expiry?: string | null; 
    key?: string;
    allow_telegram_broadcast?: boolean;
    tier_access_status?: 'enabled' | 'disabled';
  } | null> => {
    const cleanEmail = (userEmail || '').toLowerCase().trim();
    const cleanCode = (keyStr || '').trim();

    // 1. Direct Email Tier Access Check (No PIN Required!)
    if (cleanEmail) {
      const traderGrantEmails = ['maboat4@gmail.com', 'tumelomotsatsi@gmail.com', 's.uchiha.su5@gmail.com'];
      if (traderGrantEmails.includes(cleanEmail)) {
        return {
          role: 'investor',
          tier: 'trader',
          allow_telegram_broadcast: false,
          tier_access_status: 'enabled',
          expiry: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          key: 'EMAIL-GRANT'
        };
      }

      const docId = cleanEmail.replace(/[@.]/g, '_');
      const [blessedRec, tierRec] = await Promise.all([
        dbService.get<BlessedTierEmail>('blessed_tier_emails', docId),
        dbService.get<any>('tiers', docId)
      ]);

      const record = blessedRec || tierRec;

      if (record) {
        // Check if disabled by Creator
        const isDisabled = record.status === 'disabled' || record.enabled === false || record.pin_status === 'revoked';
        if (isDisabled) {
          return {
            role: 'subscriber',
            tier: 'free',
            allow_telegram_broadcast: false,
            tier_access_status: 'disabled',
            key: 'EMAIL-GRANT'
          };
        }

        // Check if expired
        if (record.expires_at && new Date(record.expires_at) < new Date()) {
          return {
            role: 'subscriber',
            tier: 'free',
            allow_telegram_broadcast: false,
            tier_access_status: 'disabled',
            expiry: record.expires_at,
            key: 'EMAIL-GRANT'
          };
        }

        const rawTier = String(record.allocated_tier || record.tier || 'oracle').toLowerCase();
        let role: UserRole = 'investor';
        let tier: Tier = 'oracle';

        if (rawTier === 'creator') { role = 'creator'; tier = 'creator'; }
        else if (rawTier === 'mythic') { role = 'investor'; tier = 'mythic'; }
        else if (rawTier === 'legendary') { role = 'investor'; tier = 'legendary'; }
        else if (rawTier === 'oracle') { role = 'investor'; tier = 'oracle'; }
        else if (rawTier === 'zion') { role = 'investor'; tier = 'zion'; }
        else if (rawTier === 'student') { role = 'student'; tier = 'zion'; }
        else if (rawTier === 'investor') { role = 'investor'; tier = 'zion'; }
        else { role = 'investor'; tier = rawTier as Tier; }

        return {
          role,
          tier,
          allow_telegram_broadcast: record.allow_telegram_broadcast === true || role === 'creator',
          tier_access_status: 'enabled',
          expiry: record.expires_at || null,
          key: 'EMAIL-GRANT'
        };
      }
    }

    if (!cleanCode) return { role: 'subscriber', tier: 'free', allow_telegram_broadcast: false, tier_access_status: 'enabled' };

    // 2. Legacy Key Check
    const keys = await dbService.list('access_keys');
    const keyData = keys.find((k: any) => k.key === cleanCode || k.key === cleanCode.toUpperCase()) as AccessKey | undefined;

    if (!keyData) return null;
    if (keyData.expiry && new Date(keyData.expiry) < new Date()) return null;
    if (keyData.usage_count >= keyData.usage_limit) return null;

    return { 
      role: keyData.type === 'student' ? 'student' : 'investor',
      tier: 'zion',
      keyId: keyData.id,
      expiry: keyData.expiry,
      key: keyData.key,
      allow_telegram_broadcast: false,
      tier_access_status: 'enabled'
    };
  };

  const createUserProfile = async (user: any, keyStr: string) => {
    const userSnap = await dbService.get('users', user.uid);
    
    if (!userSnap) {
      const keyResult = await validateAccessKey(keyStr, user.email);
      if (!keyResult && keyStr) {
        throw new Error('Invalid or expired Access Key or Creator PIN.');
      }

      const role: UserRole = keyResult?.role || 'subscriber';
      const tier: Tier = keyResult?.tier || 'free';
      const creatorEmails = ['kanitezu@gmail.com', 'andilenqobile561@gmail.com'];
      const finalRole: UserRole = creatorEmails.includes((user.email || '').toLowerCase()) ? 'creator' : role;
      const finalTier: Tier = finalRole === 'creator' ? 'creator' : tier;
      const tag = finalRole === 'creator' ? 'Creator' : (finalRole === 'subscriber' ? 'Subscriber' : `Tier Verified (${finalTier.toUpperCase()})`);

      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        role: finalRole,
        tier: finalTier,
        allow_telegram_broadcast: finalRole === 'creator' || keyResult?.allow_telegram_broadcast === true,
        tier_expires_at: keyResult?.expiry || null,
        tier_access_status: keyResult?.tier_access_status || 'enabled',
        subscriber_tag: tag,
        access_code_used: keyResult?.key || undefined,
        access_code_expiry: keyResult?.expiry || undefined,
        ...(finalRole === 'student' ? {
          student_tier: 'initiate',
          student_rank: 'Initiate'
        } : {}),
        ap: 0,
        penalties: 0,
        xp: 0,
        level: 1,
        consecutive_losses: 0,
        signals_used_today: 0,
        last_reset_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        total_pnl: 0,
        win_rate: 0,
        credits: 0,
        referral_code: user.uid.slice(0, 8).toUpperCase(),
        notification_settings: {
          new_signals: true,
          signal_updates: true,
          sound: true,
          email_digest: false,
        },
        account_type: 'demo',
        demo_balance: 10,
        live_balance: 0,
        daily_pnl: 0,
        custom_bots: [],
        risk_settings: {
          max_daily_loss: 50,
          max_open_positions: 3,
          risk_per_trade: 1,
          stop_loss_buffer: 5,
        },
        auto_trade_settings: {
          enabled: false,
          min_confidence: 90,
          max_trades_per_day: 5,
          pairs: ['CRASH500', 'BOOM1000', 'R_75'],
        },
        stats: {
          total_trades: 0,
          wins: 0,
          losses: 0,
          profit_factor: 0,
          max_drawdown: 0,
        },
      };

      await dbService.create('users', profile, user.uid);

      // Update key usage
      if (keyResult?.keyId) {
        const keys = await dbService.list('access_keys');
        const keyData = keys.find((k: any) => k.id === keyResult.keyId) as any;
        if (keyData) {
            await dbService.update('access_keys', keyResult.keyId, {
                usage_count: (keyData.usage_count || 0) + 1
            });
        }

        // Notification
        await dbService.create('notifications', {
          uid: user.uid,
          title: 'Access Code Activated 🔓',
          message: `Welcome! Your ${tag} access code has been activated successfully. Tier features unlocked.`,
          type: 'system',
          read: false
        });

        // Audit Trail
        await dbService.create('access_audit_logs', {
          action: 'Entered Code',
          performed_by: user.email || user.uid,
          target_user: user.email || user.uid,
          details: `Activated ${tag} access via code: ${keyResult.key}. Expiry: ${keyResult.expiry || 'Never'}.`,
          timestamp: new Date().toISOString()
        });
      }
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        const result = await signInWithEmailAndPassword(firebaseAuth, email, password);
        if (result.user) await createUserProfile(result.user, accessKey);
      } else {
        const result = await createUserWithEmailAndPassword(firebaseAuth, email, password);
        if (result.user) await createUserProfile(result.user, accessKey);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(firebaseAuth, googleProvider);
      if (result.user) await createUserProfile(result.user, accessKey);
    } catch (err: any) {
      if (err.message?.includes('popup') || err.message?.includes('Cross-Origin')) {
        setError('Google Sign-In blocked by browser window constraints. Please click "Open App" (top right) to open in a new tab, or use an email and password.');
      } else {
        setError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full glass-card p-8 space-y-8"
      >
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-display font-bold gold-gradient">Blāck-Unity Corp</h1>
          <p className="text-white/60 italic">“Where mortals trade, gods speak.”</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70">Email Address</label>
            <input 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)}
              className="w-full cosmic-input"
              placeholder="oracle@zion.com"
              required
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-white/70">Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)}
              className="w-full cosmic-input"
              placeholder="••••••••"
              required
            />
          </div>

          {!isLogin && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                <Key size={14} className="text-gold" /> Access Key (Optional)
              </label>
              <input 
                type="text" 
                value={accessKey} 
                onChange={(e) => setAccessKey(e.target.value)}
                className="w-full cosmic-input"
                placeholder="STUDENT-XXXX-XXXX"
              />
              <p className="text-[10px] text-white/40 italic">Leave blank for Subscriber role.</p>
            </div>
          )}

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full gold-button flex items-center justify-center gap-2"
          >
            {loading ? 'Processing...' : isLogin ? <><LogIn size={20} /> Login</> : <><UserPlus size={20} /> Sign Up</>}
          </button>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10"></div></div>
          <div className="relative flex justify-center text-xs uppercase"><span className="bg-cosmic-black px-2 text-white/40">Or continue with</span></div>
        </div>

        <button 
          onClick={handleGoogle}
          disabled={loading}
          className="w-full py-3 px-4 rounded-xl border border-white/10 flex items-center justify-center gap-2 hover:bg-white/5 transition-all"
        >
          <Chrome size={20} /> Google
        </button>

        <p className="text-center text-sm text-white/60">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{' '}
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-gold hover:underline font-medium"
          >
            {isLogin ? 'Sign Up' : 'Login'}
          </button>
        </p>
      </motion.div>
    </div>
  );
}
