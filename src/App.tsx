import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase, handleSupabaseError, OperationType, isSupabaseConfigured } from './supabase';
import { User } from '@supabase/supabase-js';
import { Signal, Trade, BOTS, TIER_LIMITS, TIER_BOT_LIMITS, EconomicEvent, PriceAlert, MasterStrategy, Tribe, Challenge, MarketplaceItem, MarketNews, UserProgress, UserProfile } from './types';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Analytics from './components/Analytics';
import Leaderboard from './components/Leaderboard';
import Social from './components/Social';
import Profile from './components/Profile';
import { Tribes } from './components/Tribes';
import { Challenges } from './components/Challenges';
import { Marketplace } from './components/Marketplace';
import { Notifications } from './components/Notifications';
import { BotForge } from './components/BotForge';
import { Academy } from './components/Academy';
import { Portfolio } from './components/Portfolio';
import Referrals from './components/Referrals';
import NotificationCenter from './components/NotificationCenter';
import { EconomicCalendar } from './components/EconomicCalendar';
import AlertsManager from './components/AlertsManager';
import GlobalSearch from './components/GlobalSearch';
import TradingSessions from './components/TradingSessions';
import AdvancedChart from './components/AdvancedChart';
import Backtester from './components/Backtester';
import Council from './components/Council';
import Archive from './components/Archive';
import SignalStream from './components/SignalStream';
import Forge from './components/Forge';
import Arena from './components/Arena';
import ZionAI from './components/ZionAI';
import Abyss from './components/Abyss';
import CosmicFeed from './components/CosmicFeed';
import SignalOracle from './components/SignalOracle';
import OracleEye from './components/OracleEye';
import Gallery from './components/Gallery';
import Alchemist from './components/Alchemist';
import Nexus from './components/Nexus';
import Vault from './components/Vault';
import Chat from './components/Chat';
import Settings from './components/Settings';
import Subscription from './components/Subscription';
import Diagnostics from './components/Diagnostics';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Bell, CheckCircle2, XCircle, Info, LayoutDashboard, Globe, MessageSquare, BarChart3, Settings as SettingsIcon, Sparkles, Search, Bot, Menu, X as CloseIcon, Wallet, Clock, Trophy, Users, Eye, FlaskConical, GraduationCap, Shield, Hammer, Book, Zap, Video, Layers, Layout, Settings2, Target, ShoppingBag, Ghost } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

import { useMarketPrices } from './hooks/useMarketPrices';
import { useTradeMonitor } from './hooks/useTradeMonitor';
import { MOTIVATIONAL_SCRIPTURES } from './constants/themes';

import { derivService } from './services/derivService';

export default function App() {

  useEffect(() => {
    derivService.connect();
    
    // Connection test
    const testConnection = async () => {
      try {
        const { error } = await supabase.from('users').select('uid').limit(1).single();
        if (error && error.message.includes('failed to fetch')) {
          console.error("Supabase connection failed. Please check your configuration.");
        }
      } catch (err) {
        console.error("Supabase connection error:", err);
      }
    };
    if (isSupabaseConfigured) testConnection();
  }, []);
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [targetUserId, setTargetUserId] = useState<string | undefined>(undefined);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    (window as any).openSearch = () => setIsSearchOpen(true);
  }, []);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const lastResetRef = useRef<string | null>(null);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUserProfile(null);
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      setError(null);
      
      // Initial fetch
      const fetchProfile = async () => {
        try {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('uid', user.id)
            .single();
          
          if (error) {
            if (error.code === 'PGRST116') {
              console.warn('User profile not found in Supabase');
              setError('User profile not found. Please ensure you are registered correctly.');
            } else {
              await handleSupabaseError(error, OperationType.GET, 'users');
            }
          } else {
            setUserProfile(data as UserProfile);
          }
          setLoading(false);
        } catch (err) {
          console.error('Supabase fetch error:', err);
          setError('Could not reach the database. Please check your connection or configuration.');
          setLoading(false);
        }
      };

      fetchProfile();

      // Subscribe to changes
      const channel = supabase
        .channel(`public:users:uid=eq.${user.id}`)
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'users', 
          filter: `uid=eq.${user.id}` 
        }, (payload) => {
          setUserProfile(payload.new as UserProfile);
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  useEffect(() => {
    if (user && userProfile?.last_reset_date) {
      const today = new Date().toDateString();
      const lastResetDate = new Date(userProfile.last_reset_date);
      
      if (!isNaN(lastResetDate.getTime())) {
        const lastReset = lastResetDate.toDateString();
        
        if (today !== lastReset && lastResetRef.current !== today) {
          lastResetRef.current = today;
          
          supabase
            .from('users')
            .update({
              signals_used_today: 0,
              last_reset_date: new Date().toISOString()
            })
            .eq('uid', user.id)
            .then(({ error }) => {
              if (error) await handleSupabaseError(error, OperationType.UPDATE, 'users');
            });
        }
      }
    }
  }, [user?.id, userProfile?.last_reset_date]);

  useEffect(() => {
    if (userProfile?.theme) {
      document.documentElement.setAttribute('data-theme', userProfile.theme);
    } else {
      document.documentElement.setAttribute('data-theme', 'cosmic');
    }
  }, [userProfile?.theme]);

  const handleCloseTrade = useCallback(async (trade: Trade, reason: string = 'Manual Close') => {
    if (!userProfile) return;
    try {
      const finalPnl = trade.pnl || 0;
      const finalPnlPercentage = trade.pnl_percentage || 0;
      const exitPrice = trade.exit_price || trade.entry_price;

      const { error: tradeError } = await supabase
        .from('trades')
        .update({
          status: 'closed',
          closed_at: new Date().toISOString(),
          pnl: finalPnl,
          pnl_percentage: finalPnlPercentage,
          exit_price: exitPrice,
          close_reason: reason
        })
        .eq('id', trade.id);
      
      if (tradeError) throw tradeError;
      
      // Update User Stats
      const isWin = finalPnl > 0;
      const balanceField = trade.account_type === 'live' ? 'live_balance' : 'demo_balance';
      
      const { error: userError } = await supabase.rpc('increment_user_stats', {
        user_id: userProfile.uid,
        pnl_change: finalPnl,
        is_win: isWin,
        balance_field: balanceField
      });

      if (userError) {
        // Fallback if RPC doesn't exist yet
        await supabase
          .from('users')
          .update({
            [balanceField]: (userProfile as any)[balanceField] + finalPnl,
            total_pnl: userProfile.total_pnl + finalPnl,
            'stats.total_trades': (userProfile.stats?.total_trades || 0) + 1,
            'stats.wins': (userProfile.stats?.wins || 0) + (isWin ? 1 : 0),
            'stats.losses': (userProfile.stats?.losses || 0) + (isWin ? 0 : 1)
          })
          .eq('uid', userProfile.uid);
      }

      // Heavenly Order Motivation
      if (userProfile.theme === 'heavenly') {
        const scripture = MOTIVATIONAL_SCRIPTURES[Math.floor(Math.random() * MOTIVATIONAL_SCRIPTURES.length)];
        addToast(scripture, 'info');
      }

      // Create notification
      await supabase
        .from('notifications')
        .insert([{
          uid: userProfile.uid,
          title: `Trade Closed: ${reason}`,
          message: `${(trade.account_type || 'demo').toUpperCase()} trade for ${trade.pair} closed with ${trade.pnl >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)} P/L. Reason: ${reason}`,
          type: 'trade',
          read: false,
          created_at: new Date().toISOString()
        }]);

      addToast(`Trade closed: ${trade.pair} (${trade.pnl >= 0 ? '+' : ''}${(trade.pnl || 0).toFixed(2)}) - ${reason}`, trade.pnl >= 0 ? 'success' : 'error');
    } catch (err) {
      console.error(err);
      addToast('Failed to close trade.', 'error');
    }
  }, [userProfile, addToast]);

  useTradeMonitor(userProfile || {} as UserProfile, addToast, handleCloseTrade);

  if (!isSupabaseConfigured) {
    return (
      <div className="min-h-screen bg-[#050505] text-white flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-card p-8 space-y-6 text-center">
          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <Settings2 className="w-8 h-8 text-gold animate-spin-slow" />
          </div>
          <h1 className="text-2xl font-bold text-gold tracking-tight">Supabase Setup Required</h1>
          <p className="text-white/60 leading-relaxed">
            To activate the Zion Trading System, you must connect your Supabase instance.
          </p>
          <div className="bg-black/40 rounded-xl p-4 text-left space-y-4 border border-white/5">
            <p className="text-xs font-bold uppercase tracking-widest text-white/40">Instructions:</p>
            <ol className="text-sm space-y-3 text-white/80 list-decimal list-inside">
              <li>Open the <span className="text-gold">Settings</span> menu (bottom left).</li>
              <li>Go to the <span className="text-gold">Secrets</span> tab.</li>
              <li>Add <code className="bg-white/10 px-1 rounded text-gold">VITE_SUPABASE_URL</code></li>
              <li>Add <code className="bg-white/10 px-1 rounded text-gold">VITE_SUPABASE_ANON_KEY</code></li>
            </ol>
          </div>
          <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
            The system will automatically restart once configured.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic-black flex flex-col items-center justify-center space-y-6 p-8">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="text-gold"
        >
          <Loader2 size={48} />
        </motion.div>
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-display font-bold gold-gradient animate-pulse">Synchronizing Zion Network</h2>
          <p className="text-white/40 text-xs uppercase tracking-[0.3em] font-bold">Connecting to the Oracle Feed...</p>
          
          <div className="pt-8">
            <button 
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-[10px] text-white/40 font-bold uppercase tracking-widest transition-all"
            >
              Force Reconnect
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const renderPage = () => {
    if (!userProfile) return null;
    
    const props = { userProfile, addToast, setActivePage, handleCloseTrade };
    
    switch (activePage) {
      case 'dashboard':
        return <Dashboard {...props} />;
      case 'feed':
        return <CosmicFeed userProfile={userProfile} addToast={addToast} />;
      case 'leaderboard':
        return <Leaderboard setTargetUserId={setTargetUserId} setActivePage={setActivePage} />;
      case 'social':
        return <Social userProfile={userProfile} setTargetUserId={setTargetUserId} setActivePage={setActivePage} />;
      case 'profile':
        return <Profile userProfile={userProfile} targetUserId={targetUserId} addToast={addToast} />;
      case 'tribes':
        return <Tribes userProfile={userProfile} addToast={addToast} />;
      case 'challenges':
        return <Challenges userProfile={userProfile} addToast={addToast} />;
      case 'notifications':
        return <Notifications userProfile={userProfile} addToast={addToast} setTargetUserId={setTargetUserId} setActivePage={setActivePage} />;
      case 'zion':
        return <ZionAI {...props} />;
      case 'chat':
        return <Chat {...props} />;
      case 'abyss':
        return <Abyss {...props} />;
      case 'eye':
        return <OracleEye {...props} />;
      case 'forge':
        return <Forge {...props} />;
      case 'backtest':
        return <Backtester {...props} />;
      case 'academy':
        return <Academy userProfile={userProfile} addToast={addToast} setActiveTab={setActivePage} />;
      case 'vault':
        return <Vault {...props} />;
      case 'settings':
        return <Settings {...props} />;
      case 'sessions':
        return <TradingSessions {...props} />;
      case 'council':
        return <Council {...props} />;
      case 'analytics':
        return <Analytics {...props} />;
      case 'vision':
        return <AdvancedChart />;
      case 'portfolio':
        return <Portfolio {...props} />;
      case 'arena':
        return <Arena {...props} />;
      case 'subscription':
        return <Subscription {...props} />;
      case 'diagnostics':
        return <Diagnostics {...props} />;
      case 'archive':
        return <Archive {...props} />;
      case 'signal-stream':
        return <SignalStream {...props} />;
      case 'signal-oracle':
        return <SignalOracle {...props} />;
      case 'gallery':
        return <Gallery {...props} />;
      case 'alchemist':
        return <Alchemist {...props} />;
      case 'nexus':
        return <Nexus {...props} />;
      case 'marketplace':
        return <Marketplace userProfile={userProfile} addToast={addToast} />;
      default:
        return <Dashboard {...props} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cosmic-black flex relative overflow-x-hidden">
        <GlobalSearch 
          isOpen={isSearchOpen} 
          onClose={() => setIsSearchOpen(false)} 
          setActivePage={setActivePage} 
        />
        <Sidebar 
          activePage={activePage} 
          setActivePage={setActivePage} 
          userProfile={userProfile}
        />

        {/* Mobile Nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 glass-card rounded-none border-x-0 border-b-0 z-[100] flex items-center justify-around px-2 pb-safe">
          <button onClick={() => setActivePage('dashboard')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${activePage === 'dashboard' ? 'text-gold' : 'text-white/40'}`}>
            <LayoutDashboard size={20} />
            <span className="text-[10px] font-bold">Home</span>
          </button>
          <button onClick={() => setActivePage('feed')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${activePage === 'feed' ? 'text-gold' : 'text-white/40'}`}>
            <Globe size={20} />
            <span className="text-[10px] font-bold">Feed</span>
          </button>
          <button onClick={() => setActivePage('chat')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${activePage === 'chat' ? 'text-gold' : 'text-white/40'}`}>
            <MessageSquare size={20} />
            <span className="text-[10px] font-bold">Oracle</span>
          </button>
          <button onClick={() => setActivePage('analytics')} className={`p-2 rounded-xl flex flex-col items-center gap-1 transition-all ${activePage === 'analytics' ? 'text-gold' : 'text-white/40'}`}>
            <BarChart3 size={20} />
            <span className="text-[10px] font-bold">Stats</span>
          </button>
          <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 rounded-xl flex flex-col items-center gap-1 text-white/40">
            <Menu size={20} />
            <span className="text-[10px] font-bold">More</span>
          </button>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsMobileMenuOpen(false)}
                className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[110] lg:hidden"
              />
              <motion.div
                initial={{ x: '100%' }}
                animate={{ x: 0 }}
                exit={{ x: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 right-0 w-80 bg-cosmic-black border-l border-white/10 z-[120] lg:hidden flex flex-col"
              >
                <div className="p-6 border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gold rounded-lg flex items-center justify-center">
                      <Bot className="text-black" size={18} />
                    </div>
                    <span className="font-display font-bold gold-gradient text-lg">Menu</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-white/40 hover:text-white">
                    <CloseIcon size={24} />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-1">
                  {[
                    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
                    { id: 'feed', label: 'Cosmic Feed', icon: Globe },
                    { id: 'zion', label: 'Zion AI', icon: Bot },
                    { id: 'chat', label: 'Oracle Chat', icon: MessageSquare },
                    { id: 'nexus', label: 'The Nexus', icon: Globe },
                    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
                    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                    { id: 'eye', label: 'Oracle Eye', icon: Eye },
                    { id: 'sessions', label: 'Sessions', icon: Clock },
                    { id: 'arena', label: 'The Arena', icon: Trophy },
                    { id: 'archive', label: 'The Archive', icon: Book },
                    { id: 'signal-stream', label: 'Signal Stream', icon: Zap },
                    { id: 'signal-oracle', label: 'Signal Oracle', icon: Target },
                    { id: 'gallery', label: 'The Gallery', icon: ShoppingBag },
                    { id: 'alchemist', label: 'The Alchemist', icon: Settings2 },
                    { id: 'marketplace', label: 'Marketplace', icon: Search },
                    { id: 'council', label: 'Council', icon: Users },
                    { id: 'abyss', label: 'The Abyss', icon: Ghost },
                    { id: 'forge', label: 'The Forge', icon: Hammer },
                    { id: 'backtest', label: 'The Prophet', icon: FlaskConical },
                    { id: 'academy', label: 'The Library', icon: GraduationCap },
                    { id: 'vault', label: 'Zion Vault', icon: Shield },
                    { id: 'settings', label: 'Settings', icon: SettingsIcon },
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActivePage(item.id);
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${
                        activePage === item.id 
                          ? 'bg-gold/10 text-gold border border-gold/20' 
                          : 'text-white/60 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <item.icon size={20} />
                      <span className="font-medium">{item.label}</span>
                    </button>
                  ))}
                </div>
                <div className="p-6 border-t border-white/10">
                  <button 
                    onClick={() => supabase.auth.signOut()}
                    className="w-full py-3 bg-red-500/10 text-red-400 font-bold rounded-xl border border-red-500/20"
                  >
                    Logout
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        <main className="flex-1 lg:ml-64 p-4 lg:p-8 min-h-screen pb-24 lg:pb-8 overflow-x-hidden">
          {userProfile ? (
            <>
              <header className="flex items-center justify-between mb-8 gap-4">
                <div className="flex items-center gap-6 overflow-hidden">
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                      <Sparkles size={20} className="lg:w-6 lg:h-6" />
                    </div>
                    <div className="hidden sm:block">
                      <h2 className="text-lg lg:text-xl font-display font-bold gold-gradient truncate max-w-[150px] lg:max-w-none">Welcome, Oracle</h2>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest truncate max-w-[150px] lg:max-w-none">{userProfile.email}</p>
                    </div>
                  </div>
                  <div className="hidden md:flex items-center gap-4">
                    <button 
                      onClick={() => setIsDemoMode(!isDemoMode)}
                      className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all border ${
                        isDemoMode 
                          ? 'bg-emerald-400/10 border-emerald-400 text-emerald-400' 
                          : 'bg-white/5 border-white/10 text-white/40'
                      }`}
                    >
                      {isDemoMode ? 'Mirror World (Demo)' : 'Real World'}
                    </button>
                    {isDemoMode && (
                      <span className="text-[10px] text-emerald-400/60 animate-pulse font-bold uppercase tracking-widest">
                        Simulated Environment Active
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setIsSearchOpen(true)}
                    className="p-2 rounded-xl glass-card border-white/5 hover:border-gold/20 transition-all text-white/40 flex items-center gap-2"
                  >
                    <Search size={18} />
                    <span className="text-[10px] font-bold uppercase tracking-widest hidden md:block">Search (Cmd+K)</span>
                  </button>
                  <NotificationCenter userProfile={userProfile} />
                  <button 
                    onClick={() => setActivePage('settings')}
                    className="p-2 rounded-xl glass-card border-white/5 hover:border-gold/20 transition-all text-white/60"
                  >
                    <SettingsIcon size={20} />
                  </button>
                </div>
              </header>

              <AnimatePresence mode="wait">
                <motion.div
                  key={activePage}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {renderPage()}
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-4 max-w-md px-6">
                {error ? (
                  <>
                    <XCircle className="text-red-400 mx-auto" size={48} />
                    <h3 className="text-xl font-bold text-white">Initialization Error</h3>
                    <p className="text-white/60">{error}</p>
                    <button 
                      onClick={() => window.location.reload()}
                      className="px-6 py-2 bg-gold text-black font-bold rounded-xl hover:bg-gold/80 transition-all"
                    >
                      Retry Connection
                    </button>
                  </>
                ) : (
                  <>
                    <Loader2 className="text-gold animate-spin mx-auto" size={48} />
                    <p className="text-white/60">Initializing your cosmic profile...</p>
                  </>
                )}
              </div>
            </div>
          )}
        </main>

        {/* Toasts */}
        <div className="fixed bottom-8 right-8 z-[100] space-y-4">
          <AnimatePresence>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                initial={{ opacity: 0, x: 20, scale: 0.9 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20, scale: 0.9 }}
                className={`glass-card p-4 flex items-center gap-3 shadow-2xl min-w-[300px] ${
                  toast.type === 'success' ? 'border-emerald-400/50 bg-emerald-400/10' :
                  toast.type === 'error' ? 'border-red-400/50 bg-red-400/10' :
                  'border-gold/50 bg-gold/10'
                }`}
              >
                {toast.type === 'success' ? <CheckCircle2 className="text-emerald-400" size={20} /> :
                 toast.type === 'error' ? <XCircle className="text-red-400" size={20} /> :
                 <Info className="text-gold" size={20} />}
                <p className="text-sm font-medium">{toast.message}</p>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Cosmic Background Accents */}
        <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-gold/5 rounded-full blur-[120px] -z-10 pointer-events-none"></div>
        <div className="fixed bottom-0 left-64 w-[300px] h-[300px] bg-cosmic-accent/20 rounded-full blur-[100px] -z-10 pointer-events-none"></div>
      </div>
    </ErrorBoundary>
  );
}
