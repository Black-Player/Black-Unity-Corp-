import { useState } from 'react';
import { auth as firebaseAuth, googleProvider } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { dbService } from '../services/dbService';
import { UserProfile, AccessKey, UserRole } from '../types';
import { LogIn, UserPlus, Chrome, Key } from 'lucide-react';
import { motion } from 'motion/react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessKey, setAccessKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const validateAccessKey = async (keyStr: string): Promise<{ role: UserRole; keyId?: string } | null> => {
    if (!keyStr) return { role: 'subscriber' };

    const keys = await dbService.list('access_keys');
    const keyData = keys.find((k: any) => k.key === keyStr) as AccessKey | undefined;

    if (!keyData) return null;

    // Check expiry
    if (keyData.expiry && new Date(keyData.expiry) < new Date()) return null;

    // Check usage limit
    if (keyData.usage_count >= keyData.usage_limit) return null;

    return { 
      role: keyData.type === 'student' ? 'student' : 'investor',
      keyId: keyData.id 
    };
  };

  const createUserProfile = async (user: any, keyStr: string) => {
    const userSnap = await dbService.get('users', user.uid);
    
    if (!userSnap) {
      const keyResult = await validateAccessKey(keyStr);
      if (!keyResult && keyStr) {
        throw new Error('Invalid or expired Access Key.');
      }

      const role: UserRole = keyResult?.role || 'subscriber';
      const creatorEmails = ['kanitezu@gmail.com', 'andilenqobile561@gmail.com'];
      const finalRole: UserRole = creatorEmails.includes(user.email) ? 'creator' : role;

      const profile: UserProfile = {
        uid: user.uid,
        email: user.email || '',
        role: finalRole,
        tier: finalRole === 'creator' ? 'creator' : (finalRole === 'investor' ? 'zion' : 'free'),
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
        demo_balance: 10000,
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
      setError(err.message);
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
