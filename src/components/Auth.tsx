import { useState } from 'react';
import { auth, googleProvider, db } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { UserProfile } from '../types';
import { LogIn, UserPlus, Chrome } from 'lucide-react';
import { motion } from 'motion/react';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const createUserProfile = async (user: any) => {
    const userRef = doc(db, 'users', user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      const creatorEmails = ['kanitezu@gmail.com', 'andilenqobile561@gmail.com'];
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        tier: creatorEmails.includes(user.email) ? 'creator' : 'free',
        xp: 0,
        level: 1,
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
          pairs: ['crash_500', 'boom_1000', 'volatility_75'],
        },
        stats: {
          total_trades: 0,
          wins: 0,
          losses: 0,
          profit_factor: 0,
          max_drawdown: 0,
        },
      };
      await setDoc(userRef, profile);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isLogin) {
        const { user } = await signInWithEmailAndPassword(auth, email, password);
        await createUserProfile(user);
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(user);
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
      const { user } = await signInWithPopup(auth, googleProvider);
      await createUserProfile(user);
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
