import { LayoutDashboard, History, Bot, MessageSquare, Settings, LogOut, Zap, CreditCard, Sparkles, ShieldCheck, BarChart3, Globe, Trophy, Hammer, GraduationCap, Wallet, Users, Calendar, Layers, Bell, Shield, Clock, Eye, FlaskConical, Target, ShoppingBag, Video, FileText, Book, Settings2, Layout, Search, Lock } from 'lucide-react';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { UserProfile, Tier, hasTierAccess } from '../types';
import { motion } from 'motion/react';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  userProfile: UserProfile | null;
}

export default function Sidebar({ activePage, setActivePage, userProfile }: SidebarProps) {
  const menuItems: { id: string; label: string; icon: any; requiredTier?: Tier }[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'feed', label: 'Cosmic Feed', icon: Globe },
    { id: 'zion', label: 'Zion AI', icon: Bot },
    { id: 'chat', label: 'Oracle Chat', icon: MessageSquare },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
    { id: 'sessions', label: 'Sessions', icon: Clock },
    { id: 'arena', label: 'The Arena', icon: Trophy },
    { id: 'archive', label: 'The Archive', icon: Book },
    { id: 'signal-stream', label: 'Signal Stream', icon: Zap, requiredTier: 'oracle' },
    { id: 'bot-gallery', label: 'Bot Gallery', icon: Layout },
    { id: 'bot-customizer', label: 'The Alchemist', icon: Settings2, requiredTier: 'zion' },
    { id: 'live-room', label: 'The Nexus', icon: Video, requiredTier: 'oracle' },
    { id: 'strategy-builder', label: 'The Weaver', icon: Layers, requiredTier: 'legendary' },
    { id: 'marketplace', label: 'Marketplace', icon: Search, requiredTier: 'mythic' },
    { id: 'council', label: 'Council', icon: Users, requiredTier: 'mythic' },
    { id: 'chart-vision', label: 'Oracle Eye', icon: Eye },
    { id: 'abyss', label: 'The Abyss', icon: Eye },
    { id: 'forge', label: 'The Forge', icon: Hammer, requiredTier: 'zion' },
    { id: 'backtest', label: 'The Prophet', icon: FlaskConical },
    { id: 'academy', label: 'The Library', icon: GraduationCap },
    { id: 'security', label: 'Zion Vault', icon: Shield },
    { id: 'settings', label: 'Settings', icon: Settings },
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

        <nav className="flex-1 space-y-2 overflow-y-auto pr-2 custom-scrollbar">
          {menuItems.map((item) => {
            const hasAccess = !item.requiredTier || (userProfile && hasTierAccess(userProfile.tier, item.requiredTier));
            
            return (
              <button
                key={item.id}
                onClick={() => hasAccess ? setActivePage(item.id) : setActivePage('subscription')}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  activePage === item.id 
                    ? 'bg-gold/10 text-gold border border-gold/20' 
                    : hasAccess ? 'text-white/60 hover:bg-white/5 hover:text-white' : 'text-white/20 cursor-not-allowed'
                }`}
              >
                <div className="flex items-center gap-3">
                  <item.icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </div>
                {!hasAccess && <Lock size={14} className="text-white/20" />}
              </button>
            );
          })}

          {userProfile?.tier === 'creator' && (
            <div className="pt-4 mt-4 border-t border-white/5">
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
            </div>
          )}
        </nav>

      <div className="space-y-4">
        {userProfile && (
          <div className="p-4 glass-card border-gold/10 bg-gold/5">
            <p className="text-[10px] text-gold uppercase font-bold tracking-widest mb-1">Current Tier</p>
            <p className="text-sm font-display font-bold uppercase">{userProfile.tier}</p>
            <div className="mt-2 h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${(userProfile.signals_used_today / 15) * 100}%` }}
                className="h-full bg-gold"
              />
            </div>
            {userProfile.tier !== 'zion' && userProfile.tier !== 'creator' && (
              <button 
                onClick={() => setActivePage('subscription')}
                className="mt-3 w-full py-2 bg-gold text-black text-[10px] font-bold uppercase rounded-lg hover:shadow-lg hover:shadow-gold/20 transition-all flex items-center justify-center gap-2"
              >
                <Sparkles size={12} />
                Upgrade
              </button>
            )}
          </div>
        )}

        <button 
          onClick={() => signOut(auth)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition-all"
        >
          <LogOut size={20} />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
