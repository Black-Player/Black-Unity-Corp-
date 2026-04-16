import { useState, useEffect, useRef } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { UserProfile, Trade } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Video, MessageSquare, Users, Send, TrendingUp, TrendingDown, Clock, Shield, Sparkles, Zap, Activity } from 'lucide-react';

interface ChatMessage {
  id: string;
  uid: string;
  user_name: string;
  text: string;
  created_at: string;
}

export default function LiveTradingRoom({ userProfile }: { userProfile: UserProfile }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [activeTrades, setActiveTrades] = useState<Trade[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const { data, error } = await supabase
          .from('live_chat')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (error) throw error;
        setMessages((data as ChatMessage[]).reverse());
      } catch (err) {
        handleSupabaseError(err, OperationType.LIST, 'live_chat');
      }
    };

    fetchMessages();

    const channel = supabase
      .channel('live-chat-updates')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'live_chat' 
      }, () => {
        fetchMessages();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const fetchSignals = async () => {
      try {
        const { data, error } = await supabase
          .from('signals')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(5);
        
        if (error) throw error;
        setActiveTrades(data as Trade[]);
      } catch (err) {
        handleSupabaseError(err, OperationType.LIST, 'signals');
      }
    };

    fetchSignals();

    const channel = supabase
      .channel('signals-live-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'signals' 
      }, () => {
        fetchSignals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    try {
      const { error } = await supabase
        .from('live_chat')
        .insert([{
          uid: userProfile.uid,
          user_name: userProfile.email.split('@')[0],
          text: newMessage,
          created_at: new Date().toISOString(),
        }]);
      
      if (error) throw error;
      setNewMessage('');
    } catch (err) {
      handleSupabaseError(err, OperationType.WRITE, 'live_chat');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 h-[calc(100vh-12rem)]">
      <div className="lg:col-span-3 flex flex-col gap-6">
        <div className="relative aspect-video rounded-3xl overflow-hidden bg-black/40 border border-white/5 shadow-2xl">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-gold/10 flex items-center justify-center text-gold border-2 border-gold/20 animate-pulse mx-auto">
                <Video size={32} />
              </div>
              <p className="text-xl font-display font-bold gold-gradient">Live Oracle Stream</p>
              <p className="text-xs text-white/40 uppercase tracking-widest font-bold">Connecting to Celestial Frequencies...</p>
            </div>
          </div>
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <div className="px-3 py-1 bg-red-500 text-white text-[10px] font-bold uppercase tracking-widest rounded-full animate-pulse flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-white" /> LIVE
            </div>
            <div className="px-3 py-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold uppercase tracking-widest rounded-full flex items-center gap-2">
              <Users size={12} /> 1,248 Watching
            </div>
          </div>
        </div>

        <div className="flex-1 glass-card p-6 border-white/5 flex flex-col overflow-hidden">
          <h3 className="text-lg font-display font-bold flex items-center gap-2 mb-4">
            <Activity className="text-gold" size={20} /> Active Oracle Prophecies
          </h3>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
            {activeTrades.map((trade) => (
              <div key={trade.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between hover:border-gold/20 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${trade.type === 'buy' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-red-400/10 text-red-400'}`}>
                    {trade.type === 'buy' ? <TrendingUp size={20} /> : <TrendingDown size={20} />}
                  </div>
                  <div>
                    <p className="font-bold">{trade.pair}</p>
                    <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{trade.type} @ {trade.entry_price}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-display font-bold ${trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                    {trade.pnl >= 0 ? '+' : ''}{trade.pnl}%
                  </p>
                  <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Current P/L</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <aside className="glass-card border-white/5 flex flex-col overflow-hidden">
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <h3 className="font-display font-bold flex items-center gap-2">
            <MessageSquare className="text-gold" size={18} /> Celestial Chat
          </h3>
          <Shield className="text-white/20" size={16} />
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          {messages.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-gold uppercase tracking-widest">{msg.user_name}</span>
                <span className="text-[8px] text-white/20">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
              <p className="text-sm text-white/80 leading-relaxed">{msg.text}</p>
            </div>
          ))}
        </div>

        <form onSubmit={sendMessage} className="p-4 bg-white/5 border-t border-white/5">
          <div className="relative">
            <input 
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Whisper to the Oracle..."
              className="w-full bg-black/40 border border-white/10 rounded-xl pl-4 pr-12 py-3 text-sm focus:border-gold/50 outline-none transition-all"
            />
            <button 
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-gold hover:text-gold-light transition-all"
            >
              <Send size={18} />
            </button>
          </div>
        </form>
      </aside>
    </div>
  );
}
