import { useState, useRef, useEffect } from 'react';
import { dbService } from '../services/dbService';
import { where, orderBy, limit } from 'firebase/firestore';
import { BOTS, UserProfile, TIER_BOT_LIMITS } from '../types';
import { chatWithBot } from '../services/aiService';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { Bot, Send, User, Sparkles, MessageSquare, Zap, Globe, Users, Copy, CheckCircle2, Share2, Mic, MicOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { sendArbitraryMessageToTelegram } from '../services/communicationService';

interface ChatProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface Message {
  id?: string;
  role: 'user' | 'model' | 'system';
  text: string;
  username?: string;
  created_at: string;
}

export default function Chat({ userProfile, addToast }: ChatProps) {
  const [chatMode, setChatMode] = useState<'ai' | 'community'>('ai');
  const [selectedBot, setSelectedBot] = useState(BOTS[0]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [communityMessages, setCommunityMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    let unsubscribe: () => void;

    if (chatMode === 'ai') {
      const fetchAiMessages = async () => {
        try {
          const data = await dbService.list('ai_messages', [
            where('uid', '==', userProfile.uid),
            where('bot_name', '==', selectedBot.name),
            orderBy('created_at', 'asc'),
            limit(100)
          ]);
          setMessages(data as unknown as Message[]);
        } catch (error) {
          console.error("Fetch AI messages failed", error);
        }
      };

      fetchAiMessages();

      unsubscribe = dbService.subscribeCollection('ai_messages', [
        where('uid', '==', userProfile.uid),
        where('bot_name', '==', selectedBot.name),
        orderBy('created_at', 'asc'),
        limit(100)
      ], (data) => {
        setMessages(data as unknown as Message[]);
      });

    } else {
      const fetchCommunityMessages = async () => {
        try {
          const data = await dbService.list('community_chat', [
            orderBy('created_at', 'asc'),
            limit(100)
          ]);
          setCommunityMessages(data as unknown as Message[]);
        } catch (error) {
          console.error("Fetch community messages failed", error);
        }
      };

      fetchCommunityMessages();

      unsubscribe = dbService.subscribeCollection('community_chat', [
        orderBy('created_at', 'asc'),
        limit(100)
      ], (data) => {
        setCommunityMessages(data as unknown as Message[]);
      });
    }

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [selectedBot, userProfile.uid, chatMode]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, communityMessages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    
    if (chatMode === 'ai') {
      try {
        await dbService.create('ai_messages', {
            uid: userProfile.uid,
            bot_name: selectedBot.name,
            role: 'user',
            text: userMessage,
            created_at: new Date().toISOString()
        });
        
        setLoading(true);

        const response = await chatWithBot(
          selectedBot.name,
          selectedBot.strategy,
          userMessage,
          messages.map(m => ({ role: m.role as any, parts: [{ text: m.text }] }))
        );

        await dbService.create('ai_messages', {
            uid: userProfile.uid,
            bot_name: selectedBot.name,
            role: 'model',
            text: response,
            created_at: new Date().toISOString()
        });

      } catch (err) {
        addToast("The cosmic connection was interrupted. Please try again.", "error");
      } finally {
        setLoading(false);
      }
    } else {
      try {
        await dbService.create('community_chat', {
            uid: userProfile.uid,
            username: userProfile.username || 'Anonymous Oracle',
            role: 'user',
            text: userMessage,
            created_at: new Date().toISOString()
        });
      } catch (err) {
        console.error("Failed to send community message", err);
      }
    }
  };

  const availableBots = BOTS.filter((_, index) => index < TIER_BOT_LIMITS[userProfile.tier]);

  const currentMessages = chatMode === 'ai' ? messages : communityMessages;

  return (
    <div className="h-[calc(100vh-140px)] lg:h-[calc(100vh-110px)] flex flex-col lg:flex-row gap-4 lg:gap-8">
      <div className="w-full lg:w-72 flex flex-col gap-4 lg:gap-6 shrink-0">
        <div className="glass-card p-1.5 flex gap-1 border-white/5">
          <button
            onClick={() => setChatMode('ai')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              chatMode === 'ai' ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            <Bot size={14} /> AI Oracle
          </button>
          <button
            onClick={() => setChatMode('community')}
            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition-all ${
              chatMode === 'community' ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            <Users size={14} /> Community
          </button>
        </div>

        {chatMode === 'ai' ? (
          <div className="glass-card p-4 lg:p-6 space-y-4">
            <h2 className="text-lg lg:text-xl font-display font-bold flex items-center gap-2">
              <Bot className="text-gold" size={18} /> Select Oracle
            </h2>
            <div className="flex lg:flex-col gap-2 overflow-x-auto lg:overflow-y-auto pb-2 lg:pb-0 max-h-[300px] lg:max-h-none pr-2 scrollbar-hide">
              {availableBots.map((bot) => (
                <button
                  key={bot.name}
                  onClick={() => {
                    setSelectedBot(bot);
                    setMessages([]);
                  }}
                  className={`flex-none w-48 lg:w-full flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    selectedBot.name === bot.name 
                      ? 'bg-gold/10 border-gold/50 text-gold shadow-lg shadow-gold/5' 
                      : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedBot.name === bot.name ? 'bg-gold text-black' : 'bg-white/10'}`}>
                    <Bot size={16} />
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="text-sm font-bold truncate">{bot.name}</p>
                    <p className="text-[10px] opacity-60 uppercase tracking-widest truncate">{bot.strategy}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="glass-card p-6 space-y-4">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Globe className="text-gold" size={20} /> Global Feed
            </h2>
            <p className="text-xs text-white/40 leading-relaxed">
              Connect with other Oracles across the cosmos. Share insights, signals, and wisdom in real-time.
            </p>
            <div className="p-4 rounded-xl bg-gold/5 border border-gold/10 space-y-2">
              <div className="text-[10px] font-bold uppercase tracking-widest text-gold">Online Oracles</div>
              <div className="text-2xl font-bold text-white">1,248</div>
            </div>
          </div>
        )}

        <div className="glass-card p-6 bg-gold/5 border-gold/10 hidden lg:block">
          <h3 className="font-display font-bold text-gold flex items-center gap-2 mb-2">
            <Sparkles size={16} /> Oracle Wisdom
          </h3>
          <p className="text-xs text-white/60 leading-relaxed italic">
            {chatMode === 'ai' 
              ? "“Ask the Oracle about market trends, strategy insights, or specific asset analysis. The cosmos reveals all to those who listen.”"
              : "“The collective wisdom of the community is a powerful force. Listen to the whispers of the global feed.”"}
          </p>
        </div>
      </div>

      <div className="flex-1 glass-card flex flex-col overflow-hidden relative min-h-[500px]">
        <div className="p-3 lg:p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
              {chatMode === 'ai' ? <Bot className="text-gold" size={16} /> : <Users className="text-gold" size={16} />}
            </div>
            <div>
              <h3 className="text-sm lg:text-base font-bold">{chatMode === 'ai' ? selectedBot.name : 'Global Oracle Feed'}</h3>
              <p className="text-[8px] lg:text-[10px] text-emerald-400 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Online
              </p>
            </div>
          </div>
          <div className="hidden sm:block text-xs text-white/40 italic">“Where mortals trade, gods speak.”</div>
        </div>

        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-6 scroll-smooth"
        >
          {currentMessages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                <MessageSquare size={32} />
              </div>
              <p className="max-w-xs italic">The {chatMode === 'ai' ? 'Oracle' : 'Community'} awaits your inquiry. Start a conversation to begin.</p>
            </div>
          )}

          <AnimatePresence mode="popLayout">
            {currentMessages.map((msg, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
              >
                <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  msg.role === 'user' ? 'bg-gold text-black' : 'bg-white/10 text-gold'
                }`}>
                  {msg.role === 'user' ? <User size={18} /> : <Bot size={18} />}
                </div>
                <div className={`max-w-[95%] lg:max-w-[85%] p-4 lg:p-6 rounded-2xl relative group ${
                  msg.role === 'user' 
                    ? 'bg-gold/10 border border-gold/20 text-white' 
                    : 'bg-white/5 border border-white/10 text-white/90'
                }`}>
                  {chatMode === 'community' && msg.username && (
                    <div className="text-[10px] font-bold text-gold uppercase tracking-widest mb-2">{msg.username}</div>
                  )}
                  <div className="prose prose-invert prose-sm lg:prose-base max-w-none leading-relaxed">
                    <ReactMarkdown>{msg.text}</ReactMarkdown>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
                    <p className={`text-[8px] uppercase tracking-widest font-bold ${msg.role !== 'user' ? 'text-white/20' : 'text-gold/40'}`}>
                      {new Date(msg.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleCopy(msg.text, msg.id || i.toString())}
                        className={`opacity-60 hover:opacity-100 transition-opacity p-1.5 rounded-lg flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest
                          ${msg.role !== 'user' ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gold/60 hover:text-gold hover:bg-gold/10'} cursor-pointer`}
                        title="Copy message for educational purposes"
                      >
                        {copiedId === (msg.id || i.toString()) ? <CheckCircle2 size={12} className={msg.role !== 'user' ? 'text-emerald-400' : 'text-emerald-500'} /> : <Copy size={12} />}
                        {copiedId === (msg.id || i.toString()) ? 'Copied' : 'Copy'}
                      </button>
                      <button 
                        onClick={async () => {
                          if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
                            addToast("Please configure your Telegram credentials in Settings first.", "error");
                            return;
                          }
                          const fromWho = msg.role === 'user' ? (msg.username || 'Creator') : (selectedBot.name);
                          const success = await sendArbitraryMessageToTelegram(
                            `*From: ${fromWho}*\n\n${msg.text}`,
                            userProfile.integrations
                          );
                          if (success) {
                            addToast("Message successfully sent to Telegram!", "success");
                          } else {
                            addToast("Failed to send message. Please verify your bot configuration.", "error");
                          }
                        }}
                        className={`opacity-60 hover:opacity-100 transition-opacity p-1.5 rounded-lg flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest
                          ${msg.role !== 'user' ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-gold/60 hover:text-gold hover:bg-gold/10'} cursor-pointer`}
                        title="Send this message to Telegram"
                      >
                        <Share2 size={12} />
                        Share
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && chatMode === 'ai' && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4"
            >
              <div className="w-8 h-8 rounded-lg bg-white/10 text-gold flex items-center justify-center shrink-0">
                <Bot size={16} />
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-bounce"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-bounce [animation-delay:0.2s]"></span>
                <span className="w-1.5 h-1.5 rounded-full bg-gold/40 animate-bounce [animation-delay:0.4s]"></span>
              </div>
            </motion.div>
          )}
        </div>

        <form onSubmit={handleSend} className="p-4 bg-white/5 border-t border-white/10">
          <div className="relative">
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={chatMode === 'ai' ? `Message ${selectedBot.name}...` : "Broadcast to the cosmos..."}
              className="w-full cosmic-input pr-32 py-4"
              disabled={loading}
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button 
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  if (!input.trim()) {
                    addToast("Please type a message first.", "info");
                    return;
                  }
                  if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
                    addToast("Please configure your Telegram credentials in Settings first.", "error");
                    return;
                  }
                  const success = await sendArbitraryMessageToTelegram(input, userProfile.integrations);
                  if (success) {
                    addToast("Input sent directly to Telegram!", "success");
                    setInput('');
                  } else {
                    addToast("Failed to send message to Telegram.", "error");
                  }
                }}
                className="px-3 h-10 rounded-lg bg-white/10 text-gold hover:bg-gold/10 flex items-center justify-center font-mono font-bold text-xs hover:scale-105 active:scale-95 transition-all border border-gold/20 cursor-pointer"
                title="STT: Send current input directly to Telegram"
              >
                STT
              </button>
              <button 
                type="submit"
                disabled={loading || !input.trim()}
                className="w-10 h-10 rounded-lg bg-gold text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
