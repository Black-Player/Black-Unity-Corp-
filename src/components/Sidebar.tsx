import { LayoutDashboard, History, Bot, MessageSquare, Settings, LogOut, Zap, CreditCard, Sparkles, ShieldCheck, BarChart3, Globe, Trophy, Hammer, GraduationCap, Wallet, Users, Calendar, Layers, Bell, Shield, Clock, Eye, FlaskConical, Target, ShoppingBag, Video, FileText, Book, Settings2, Layout, Search, Lock, User, Ghost, Activity, Cpu } from 'lucide-react';
import { supabase } from '../supabase';
import { auth as firebaseAuth } from '../firebase';
import { UserProfile, Tier, hasTierAccess } from '../types';
import { motion } from 'motion/react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  userProfile: UserProfile | null;
}

export default function Sidebar({ activePage, setActivePage, userProfile }: SidebarProps) {
  const menuGroups = [
    {
      label: 'Core',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
        { id: 'closed-trades', label: 'Closed Trades', icon: History },
        { id: 'notifications', label: 'Cosmic Alerts', icon: Bell, badge: userProfile?.notification_count },
        { id: 'feed', label: 'Cosmic Feed', icon: Globe },
        { id: 'zion', label: 'Zion AI', icon: Bot },
        { id: 'chat', label: 'Oracle Chat', icon: MessageSquare },
        { id: 'nexus', label: 'The Nexus', icon: Globe },
        { id: 'oon', label: 'Oversight (OON)', icon: ShieldCheck },
      ]
    },
    {
      label: 'Trading',
      items: [
        { id: 'portfolio', label: 'Portfolio', icon: Wallet },
        { id: 'analytics', label: 'Analytics', icon: BarChart3 },
        { id: 'vision', label: 'Oracle Vision', icon: Sparkles },
        { id: 'eye', label: 'Oracle Eye', icon: Eye },
        { id: 'sessions', label: 'Sessions', icon: Clock },
        { id: 'signal-stream', label: 'Signal Stream', icon: Zap, requiredTier: 'oracle' },
        { id: 'signal-oracle', label: 'Signal Oracle', icon: Target, requiredTier: 'oracle' },
      ]
    },
    {
      label: 'Laboratory',
      items: [
        { id: 'simulator', label: 'Trading Simulator', icon: Activity },
        { id: 'backtest', label: 'The Prophet', icon: FlaskConical },
        { id: 'optimization', label: 'AI Optimization', icon: Cpu },
        { id: 'alchemist', label: 'The Alchemist', icon: Settings2, requiredTier: 'zion' },
        { id: 'strategy-builder', label: 'The Weaver', icon: Layers, requiredTier: 'legendary' },
        { id: 'forge', label: 'The Forge', icon: Hammer, requiredTier: 'zion' },
        { id: 'vault', label: 'Zion Vault', icon: Shield, requiredTier: 'oracle' },
      ]
    },
    {
      label: 'Social & Market',
      items: [
        { id: 'profile', label: 'My Profile', icon: User },
        { id: 'social', label: 'Social Feed', icon: Globe },
        { id: 'tribes', label: 'Cosmic Tribes', icon: Users },
        { id: 'challenges', label: 'Warrior Trials', icon: Trophy },
        { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
        { id: 'arena', label: 'The Arena', icon: Target },
        { id: 'abyss', label: 'The Abyss', icon: Ghost, requiredTier: 'legendary' },
        { id: 'gallery', label: 'The Gallery', icon: ShoppingBag },
        { id: 'council', label: 'Council', icon: Users, requiredTier: 'mythic' },
        { id: 'academy', label: 'The Library', icon: GraduationCap },
      ]
    }
  ];

  return (
    <div className="hidden lg:flex w-64 h-screen glass-card rounded-none border-y-0 border-l-0 flex-col p-6 space-y-8 fixed left-0 top-0">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gold rounded-lg flex items-center justify-center shadow-lg shadow-gold/20">
          <Zap className="text-black" size={24} />
        </div>
        <div>
          <h2 className="font-display font-bold text-lg gold-gradient leading-tight">Blāck-Unity</h2>
          <p className="text-[10px] text-white/40 tracking-widest uppercase">Corp—RSA</p>
        </div>
      </div>

        <nav className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.label} className="space-y-2">
              <p className="text-[10px] text-white/20 uppercase tracking-widest px-4 font-bold">{group.label}</p>
              <div className="space-y-1">
                {group.items.map((item) => {
                  const hasAccess = !item.requiredTier || (userProfile && hasTierAccess(userProfile.tier, item.requiredTier as Tier));
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => hasAccess ? setActivePage(item.id) : setActivePage('subscription')}
                      className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl transition-all ${
                        activePage === item.id 
                          ? 'bg-gold/10 text-gold border border-gold/20' 
                          : hasAccess ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-white/20 cursor-not-allowed'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <item.icon size={18} />
                        <span className="text-sm font-medium">{item.label}</span>
                        {(item as any).badge > 0 && (
                          <span className="px-1.5 py-0.5 bg-rose-500 text-white text-[8px] font-bold rounded-full animate-pulse">
                            {(item as any).badge}
                          </span>
                        )}
                      </div>
                      {!hasAccess && <Lock size={12} className="text-white/20" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {(userProfile?.tier === 'creator' || userProfile?.role === 'creator' || localStorage.getItem('dev_mode_enabled') === 'true') && (
            <div className="pt-4 border-t border-white/5 space-y-1">
              <p className="text-[10px] text-white/20 uppercase tracking-widest px-4 mb-2">Admin</p>
              <button
                onClick={() => setActivePage('diagnostics')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activePage === 'diagnostics' 
                    ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <ShieldCheck size={20} />
                <span className="font-medium">Diagnostics</span>
              </button>
              <button
                onClick={() => setActivePage('telegram')}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  activePage === 'telegram' 
                    ? 'bg-gold/10 text-gold border border-gold/20' 
                    : 'text-white/60 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Bot size={20} />
                <span className="font-medium">Telegram Center</span>
              </button>
            </div>
          )}
        </nav>

      <div className="space-y-4">
        {userProfile && (
          <div className="p-4 glass-card border-gold/10 bg-gold/5 space-y-3">
            <div>
              <p className="text-[10px] text-gold uppercase font-bold tracking-widest mb-1">Role</p>
              <p className="text-sm font-display font-bold uppercase flex items-center gap-2">
                {userProfile.role === 'creator' && <ShieldCheck size={14} className="text-emerald-400" />}
                {userProfile.role === 'investor' && <CreditCard size={14} className="text-gold" />}
                {userProfile.role === 'student' && <GraduationCap size={14} className="text-blue-400" />}
                {userProfile.role === 'subscriber' && <Users size={14} className="text-white/40" />}
                {userProfile.role}
              </p>
            </div>

            {userProfile.role === 'student' && (
              <div>
                <div className="flex justify-between items-center mb-1">
                  <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest">Student Tier</p>
                  <span className="text-[10px] text-white/40 font-mono">{userProfile.ap} AP</span>
                </div>
                <p className="text-xs font-bold uppercase text-white/80">{userProfile.student_tier} — {userProfile.student_rank}</p>
                <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, (userProfile.ap / 1000) * 100)}%` }}
                    className="h-full bg-blue-400"
                  />
                </div>
              </div>
            )}

            <div>
              <p className="text-[10px] text-white/40 uppercase font-bold tracking-widest mb-1">Subscription</p>
              <p className="text-xs font-bold uppercase">{userProfile.tier}</p>
            </div>

            {userProfile.tier !== 'zion' && userProfile.tier !== 'creator' && userProfile.role !== 'investor' && (
              <button 
                onClick={() => setActivePage('subscription')}
                className="w-full py-2 bg-gold text-black text-[10px] font-bold uppercase rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={12} />
                Upgrade
              </button>
            )}
          </div>
        )}

        <button 
          onClick={async () => {
            try {
              await firebaseAuth.signOut();
              window.location.reload();
            } catch (err) {
              console.error(err);
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
