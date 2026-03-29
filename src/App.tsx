import { useState, useEffect } from 'react';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { Signal, Trade, BOTS, TIER_LIMITS, TIER_BOT_LIMITS, EconomicEvent, PriceAlert, MasterStrategy, Tribe, Challenge, MarketplaceItem, MarketNews, UserProgress, UserProfile } from './types';
import Auth from './components/Auth';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import History from './components/History';
import Analytics from './components/Analytics';
import Leaderboard from './components/Leaderboard';
import { BotForge } from './components/BotForge';
import { Academy } from './components/Academy';
import { Portfolio } from './components/Portfolio';
import Referrals from './components/Referrals';
import NotificationCenter from './components/NotificationCenter';
import { EconomicCalendar } from './components/EconomicCalendar';
import StrategyBuilder from './components/StrategyBuilder';
import AlertsManager from './components/AlertsManager';
import SecuritySettings from './components/SecuritySettings';
import GlobalSearch from './components/GlobalSearch';
import TradingSessions from './components/TradingSessions';
import AdvancedChart from './components/AdvancedChart';
import { Tribes } from './components/Tribes';
import { Challenges } from './components/Challenges';
import Backtester from './components/Backtester';
import BotGallery from './components/BotGallery';
import { Marketplace } from './components/Marketplace';
import BotCustomizer from './components/BotCustomizer';
import LiveTradingRoom from './components/LiveTradingRoom';
import PerformanceReports from './components/PerformanceReports';
import Council from './components/Council';
import Archive from './components/Archive';
import SignalStream from './components/SignalStream';
import Forge from './components/Forge';
import Arena from './components/Arena';
import ZionAI from './components/ZionAI';
import Abyss from './components/Abyss';
import CosmicFeed from './components/CosmicFeed';
import ChartAnalyzer from './components/ChartAnalyzer';
import Chat from './components/Chat';
import Settings from './components/Settings';
import Subscription from './components/Subscription';
import Diagnostics from './components/Diagnostics';
import ErrorBoundary from './components/ErrorBoundary';
import { motion, AnimatePresence } from 'motion/react';
import { Loader2, Bell, CheckCircle2, XCircle, Info, LayoutDashboard, Globe, MessageSquare, BarChart3, Settings as SettingsIcon, Sparkles, Search, Bot, Menu, X as CloseIcon, Wallet, Clock, Trophy, Users, Eye, FlaskConical, GraduationCap, Shield, Hammer, Book, Zap, Video, Layers, Layout, Settings2 } from 'lucide-react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

import { useMarketPrices } from './hooks/useMarketPrices';

export default function App() {
  const marketPrices = useMarketPrices();
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('dashboard');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    (window as any).openSearch = () => setIsSearchOpen(true);
  }, []);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(7);
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      if (!user) {
        setUserProfile(null);
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      const unsubscribe = onSnapshot(doc(db, 'users', user.uid), (snapshot) => {
        if (snapshot.exists()) {
          setUserProfile(snapshot.data() as UserProfile);
          setLoading(false);
        } else {
          // If profile doesn't exist yet, we might still be creating it
          // or there was an error. We should probably wait a bit or handle it.
          console.warn('User profile not found in Firestore');
          // Don't set loading to false yet, or handle the null profile case in UI
          setLoading(false);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${user.uid}`);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [user]);

  useEffect(() => {
    if (user && userProfile) {
      const today = new Date().toDateString();
      const lastReset = new Date(userProfile.last_reset_date).toDateString();
      
      if (today !== lastReset) {
        const userRef = doc(db, 'users', user.uid);
        updateDoc(userRef, {
          signals_used_today: 0,
          last_reset_date: new Date().toISOString()
        }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`));
      }
    }
  }, [user, userProfile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-cosmic-black flex items-center justify-center">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="text-gold"
        >
          <Loader2 size={48} />
        </motion.div>
      </div>
    );
  }

  if (!user) {
    return <Auth />;
  }

  const renderPage = () => {
    if (!userProfile) return null;
    
    const props = { userProfile, addToast, setActivePage };
    
    switch (activePage) {
      case 'dashboard':
        return <Dashboard {...props} />;
      case 'feed':
        return <CosmicFeed userProfile={userProfile} addToast={addToast} />;
      case 'zion':
        return <ZionAI {...props} />;
      case 'chat':
        return <Chat {...props} />;
      case 'abyss':
        return <Abyss {...props} />;
      case 'chart-vision':
        return <ChartAnalyzer {...props} />;
      case 'forge':
        return <Forge {...props} />;
      case 'backtest':
        return <Backtester {...props} />;
      case 'academy':
        return <Academy userProfile={userProfile} addToast={addToast} setActiveTab={setActivePage} />;
      case 'security':
        return <SecuritySettings {...props} />;
      case 'settings':
        return <Settings {...props} />;
      case 'sessions':
        return <TradingSessions {...props} />;
      case 'council':
        return <Council {...props} />;
      case 'analytics':
        return <Analytics {...props} />;
      case 'portfolio':
        return <Portfolio {...props} marketPrices={marketPrices} />;
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
      case 'bot-gallery':
        return <BotGallery {...props} />;
      case 'bot-customizer':
        return <BotCustomizer {...props} />;
      case 'live-room':
        return <LiveTradingRoom {...props} />;
      case 'strategy-builder':
        return <StrategyBuilder {...props} />;
      case 'marketplace':
        return <Marketplace {...props} />;
      default:
        return <Dashboard {...props} />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-cosmic-black flex relative">
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
                    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
                    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                    { id: 'sessions', label: 'Sessions', icon: Clock },
                    { id: 'arena', label: 'The Arena', icon: Trophy },
                    { id: 'archive', label: 'The Archive', icon: Book },
                    { id: 'signal-stream', label: 'Signal Stream', icon: Zap },
                    { id: 'bot-gallery', label: 'Bot Gallery', icon: Layout },
                    { id: 'bot-customizer', label: 'The Alchemist', icon: Settings2 },
                    { id: 'live-room', label: 'The Nexus', icon: Video },
                    { id: 'strategy-builder', label: 'The Weaver', icon: Layers },
                    { id: 'marketplace', label: 'Marketplace', icon: Search },
                    { id: 'council', label: 'Council', icon: Users },
                    { id: 'chart-vision', label: 'Oracle Eye', icon: Eye },
                    { id: 'abyss', label: 'The Abyss', icon: Eye },
                    { id: 'forge', label: 'The Forge', icon: Hammer },
                    { id: 'backtest', label: 'The Prophet', icon: FlaskConical },
                    { id: 'academy', label: 'The Library', icon: GraduationCap },
                    { id: 'security', label: 'Zion Vault', icon: Shield },
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
                    onClick={() => auth.signOut()}
                    className="w-full py-3 bg-red-500/10 text-red-400 font-bold rounded-xl border border-red-500/20"
                  >
                    Logout
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
        
        <main className="flex-1 lg:ml-64 p-4 lg:p-8 min-h-screen pb-24 lg:pb-8">
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
              <div className="text-center space-y-4">
                <Loader2 className="text-gold animate-spin mx-auto" size={48} />
                <p className="text-white/60">Initializing your cosmic profile...</p>
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
