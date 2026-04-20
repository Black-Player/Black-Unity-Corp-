import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Globe, Users, Zap, TrendingUp, TrendingDown, MessageSquare, Send, Sparkles, Activity, Shield, Trophy, Target, Bot, User, Share2, ExternalLink } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';

interface NexusMessage {
  id: string;
  uid: string;
  username: string;
  text: string;
  type: 'signal' | 'chat' | 'system';
  created_at: any;
  asset?: string;
  direction?: 'buy' | 'sell';
}

export default function Nexus({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [messages, setMessages] = useState<NexusMessage[]>([]);
  const [input, setInput] = useState('');
  const [onlineCount, setOnlineCount] = useState(1248);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initial fetch
    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(100);
      
      if (error) {
        await handleSupabaseError(error, OperationType.LIST, 'chat_messages');
      } else {
        setMessages(data as NexusMessage[]);
      }
    };

    fetchMessages();

    // Subscribe to changes
    const channel = supabase
      .channel('public:chat_messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'chat_messages' 
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as NexusMessage].slice(-100));
      })
      .subscribe();

    const interval = setInterval(() => {
      setOnlineCount(prev => prev + Math.floor(Math.random() * 11) - 5);
    }, 5000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert([{
          uid: userProfile.uid,
          username: userProfile.username || userProfile.email.split('@')[0],
          text: input,
          type: 'chat',
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      setInput('');
    } catch (error) {
      await handleSupabaseError(error, OperationType.CREATE, 'chat_messages');
    }
  };

  return (
    <div className="h-[calc(100vh-180px)] lg:h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-4 lg:gap-8">
      <div className="w-full lg:w-80 flex flex-col gap-6 shrink-0">
        <div className="glass-card p-6 space-y-6 border-gold/20 bg-gold/5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-display font-bold gold-gradient flex items-center gap-2">
              <Globe size={20} /> The Nexus
            </h2>
            <div className="flex items-center gap-1.5 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> {onlineCount} Live
            </div>
          </div>
          <p className="text-xs text-white/40 leading-relaxed">
            The central hub of the African Nebula. Real-time collaboration, signal sharing, and collective market analysis.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-1">Signals Today</p>
              <p className="text-lg font-display font-bold text-gold">428</p>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold mb-1">Win Rate</p>
              <p className="text-lg font-display font-bold text-emerald-400">84%</p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-4 border-white/5 flex-1 overflow-hidden flex flex-col">
          <h3 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
            <Trophy size={16} className="text-gold" /> Top Warriors
          </h3>
          <div className="space-y-4 overflow-y-auto pr-2 scrollbar-hide">
            {[
              { name: 'MansaMusa', pnl: '+12,480', win: '92%' },
              { name: 'ZuluKing', pnl: '+8,240', win: '88%' },
              { name: 'CosmicTrader', pnl: '+5,120', win: '85%' },
              { name: 'NebulaOracle', pnl: '+4,800', win: '82%' },
              { name: 'ZionWarrior', pnl: '+3,950', win: '80%' },
            ].map((warrior, i) => (
              <div key={warrior.name} className="flex items-center justify-between p-3 rounded-xl bg-white/5 border border-white/5 hover:bg-white/10 transition-all">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-display font-bold text-white/20">#0{i + 1}</span>
                  <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold text-xs font-bold">
                    {warrior.name[0]}
                  </div>
                  <span className="text-xs font-bold">{warrior.name}</span>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-emerald-400">{warrior.pnl}</p>
                  <p className="text-[8px] text-white/20 uppercase tracking-widest">{warrior.win} Win</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 glass-card flex flex-col overflow-hidden relative border-white/5">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
              <Users className="text-gold" size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold">Nexus Live Feed</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Global Transmission Active</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {/* PHASE 18: LIVE ROOM SENTIMENT (Nexus Integration) */}
            <div className="hidden sm:flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-full border border-white/5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span className="text-[10px] font-bold text-emerald-400">Bullish Bias (Live)</span>
            </div>
            <button className="text-white/40 hover:text-gold transition-all"><Share2 size={18} /></button>
            <button className="text-white/40 hover:text-gold transition-all"><ExternalLink size={18} /></button>
          </div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-6 space-y-6 scroll-smooth"
        >
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <MessageSquare size={32} />
              </div>
              <p className="max-w-xs italic">The Nexus is quiet. Be the first to broadcast your prophecy.</p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {messages.map((msg, i) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.uid === userProfile.uid ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  msg.uid === userProfile.uid ? 'bg-gold text-black' : 'bg-white/10 text-gold'
                }`}>
                  {msg.uid === userProfile.uid ? <User size={20} /> : <Bot size={20} />}
                </div>
                <div className={`max-w-[80%] space-y-1 ${msg.uid === userProfile.uid ? 'items-end' : ''}`}>
                  <div className={`flex items-center gap-2 mb-1 ${msg.uid === userProfile.uid ? 'flex-row-reverse' : ''}`}>
                    <span className="text-[10px] font-bold text-gold uppercase tracking-widest">{msg.username}</span>
                    <span className="text-[8px] text-white/20 uppercase font-bold">
                      {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className={`p-4 rounded-2xl ${
                    msg.uid === userProfile.uid 
                      ? 'bg-gold/10 border border-gold/20 text-white' 
                      : 'bg-white/5 border border-white/10 text-white/90'
                  }`}>
                    {msg.type === 'signal' && (
                      <div className="flex items-center gap-3 mb-3 p-2 rounded-lg bg-black/40 border border-white/10">
                        <div className={`p-2 rounded-lg ${msg.direction === 'buy' ? 'bg-emerald-400/20 text-emerald-400' : 'bg-red-400/20 text-red-400'}`}>
                          {msg.direction === 'buy' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-white">{msg.asset}</p>
                          <p className={`text-[10px] font-bold uppercase ${msg.direction === 'buy' ? 'text-emerald-400' : 'text-red-400'}`}>{msg.direction} SIGNAL</p>
                        </div>
                      </div>
                    )}
                    <p className="text-sm leading-relaxed">{msg.text}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10">
          <div className="relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Broadcast to the Nexus..."
              className="w-full cosmic-input pr-12 py-4"
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-lg bg-gold text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
