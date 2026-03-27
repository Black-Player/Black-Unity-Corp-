import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, Command, ArrowRight, Zap, Bot, Globe, Trophy, GraduationCap, Wallet, Users, Settings, History, BarChart3, Book, Target, Hammer, FlaskConical, MessageSquare } from 'lucide-react';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  setActivePage: (page: string) => void;
}

import { ACADEMY_ARTICLES, BOTS } from '../constants';

export default function GlobalSearch({ isOpen, onClose, setActivePage }: GlobalSearchProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) onClose();
        else (window as any).openSearch?.();
      }
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Zap, category: 'Navigation' },
    { id: 'portfolio', label: 'Portfolio', icon: Wallet, category: 'Navigation' },
    { id: 'history', label: 'History', icon: History, category: 'Navigation' },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, category: 'Navigation' },
    { id: 'feed', label: 'Cosmic Feed', icon: Globe, category: 'Navigation' },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy, category: 'Navigation' },
    { id: 'council', label: 'The Council', icon: Users, category: 'Navigation' },
    { id: 'zion', label: 'Zion AI', icon: Bot, category: 'Navigation' },
    { id: 'arena', label: 'The Arena', icon: Target, category: 'Navigation' },
    { id: 'forge', label: 'Bot Forge', icon: Hammer, category: 'Navigation' },
    { id: 'indicator-forge', label: 'Indicator Forge', icon: FlaskConical },
    { id: 'archive', label: 'The Archive', icon: Book, category: 'Navigation' },
    { id: 'stream', label: 'Signal Stream', icon: Zap, category: 'Navigation' },
    { id: 'academy', label: 'Academy', icon: GraduationCap, category: 'Navigation' },
    { id: 'marketplace', label: 'Marketplace', icon: Users, category: 'Navigation' },
    { id: 'settings', label: 'Settings', icon: Settings, category: 'Navigation' },
  ];

  const botResults = BOTS.filter(bot => 
    bot.name.toLowerCase().includes(query.toLowerCase()) || 
    bot.strategy.toLowerCase().includes(query.toLowerCase())
  ).map(bot => ({
    id: 'alchemist',
    label: bot.name,
    icon: Bot,
    category: 'Bots',
    description: bot.strategy
  }));

  const academyResults = ACADEMY_ARTICLES.filter(article => 
    article.title.toLowerCase().includes(query.toLowerCase())
  ).map(article => ({
    id: 'academy',
    label: article.title,
    icon: GraduationCap,
    category: 'Academy',
    description: article.category
  }));

  const filteredItems = [
    ...navigationItems.filter(item => item.label.toLowerCase().includes(query.toLowerCase())),
    ...botResults,
    ...academyResults
  ];

  const handleSelect = (id: string) => {
    setActivePage(id);
    onClose();
    setQuery('');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="relative w-full max-w-2xl glass-card border-gold/20 shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="flex items-center gap-4 px-6 py-4 border-b border-white/10 bg-white/5">
              <Search className="text-gold" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the Oracle network... (Cmd+K)"
                className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-white/20 font-display text-lg"
              />
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-white/5 border border-white/10 text-[10px] text-white/40 font-mono">
                <Command size={10} /> K
              </div>
              <button onClick={onClose} className="p-1 hover:bg-white/5 rounded-lg transition-all text-white/20 hover:text-white">
                <X size={20} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-4 space-y-6 no-scrollbar">
              {filteredItems.length > 0 ? (
                <div className="space-y-2">
                  <p className="px-2 text-[10px] text-white/20 uppercase tracking-widest font-bold">Navigation</p>
                  <div className="grid grid-cols-1 gap-1">
                    {filteredItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSelect(item.id)}
                        className="flex items-center justify-between p-3 rounded-xl hover:bg-gold/10 group transition-all text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40 group-hover:bg-gold/20 group-hover:text-gold transition-all">
                            <item.icon size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-white group-hover:text-gold transition-all">{item.label}</p>
                            <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">
                              {(item as any).description ? (item as any).description : `Jump to ${item.id}`}
                            </p>
                          </div>
                        </div>
                        <ArrowRight className="text-white/0 group-hover:text-gold group-hover:translate-x-1 transition-all" size={16} />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="py-12 text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
                    <Search size={32} />
                  </div>
                  <p className="text-white/40 italic">No cosmic wisdom found for "{query}"</p>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-white/10 bg-white/5 flex items-center justify-between text-[10px] text-white/20 uppercase tracking-widest font-bold">
              <div className="flex gap-4">
                <span className="flex items-center gap-1"><span className="px-1 py-0.5 rounded bg-white/10 text-white/40">↑↓</span> Navigate</span>
                <span className="flex items-center gap-1"><span className="px-1 py-0.5 rounded bg-white/10 text-white/40">Enter</span> Select</span>
              </div>
              <span className="flex items-center gap-1"><span className="px-1 py-0.5 rounded bg-white/10 text-white/40">Esc</span> Close</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
