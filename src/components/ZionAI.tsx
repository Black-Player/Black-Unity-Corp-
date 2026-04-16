import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Bot, User, Sparkles, Loader2, Zap, Brain, Shield, Globe, TrendingUp, History, Info } from 'lucide-react';
import Markdown from 'react-markdown';
import { SYSTEM_ROLE } from '../constants/systemRole';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export default function ZionAI({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: "Greetings, Oracle. I am Zion AI, your cosmic guide through the markets. How can I assist your prophecies today?", timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing from environment.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            role: "user",
            parts: [{ text: `The user's profile: ${JSON.stringify(userProfile)}. 
              The user asks: ${input}. 
              Provide a response based on your core directives.` }]
          }
        ],
        config: {
          systemInstruction: SYSTEM_ROLE + "\n\nYou are currently in MENTOR MODE acting as Zion AI. Guide the user through the complexities of trading with precision and mystical insight.",
        }
      });

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text || "The cosmic winds are silent. Please try again.",
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      addToast('The Oracle connection was interrupted.', 'error');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-[calc(100vh-12rem)] flex flex-col gap-6">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold border border-gold/20 relative">
            <Bot size={24} />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-cosmic-black animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-bold gold-gradient">Zion AI Assistant</h1>
            <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Sentient Oracle Core • Online</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="p-2 rounded-xl glass-card border-white/5 text-white/40 hover:text-gold transition-all">
            <History size={20} />
          </button>
          <button className="p-2 rounded-xl glass-card border-white/5 text-white/40 hover:text-gold transition-all">
            <Info size={20} />
          </button>
        </div>
      </header>

      <div className="flex-1 glass-card border-white/5 flex flex-col overflow-hidden relative">
        <div className="absolute inset-0 bg-gold/5 rounded-full blur-[120px] -z-10 pointer-events-none opacity-20" />
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-4 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold shrink-0 border border-gold/20">
                    <Bot size={16} />
                  </div>
                )}
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'assistant' 
                    ? 'bg-white/5 border border-white/10 text-white/80' 
                    : 'bg-gold text-black font-medium'
                }`}>
                  <div className="markdown-body">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                  <p className={`text-[8px] mt-2 uppercase tracking-widest font-bold ${msg.role === 'assistant' ? 'text-white/20' : 'text-black/40'}`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/60 shrink-0 border border-white/10">
                    <User size={16} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {isLoading && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex gap-4 justify-start"
            >
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold shrink-0 border border-gold/20">
                <Bot size={16} />
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-2">
                <Loader2 size={16} className="animate-spin text-gold" />
                <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Zion is consulting the cosmic winds...</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-6 border-t border-white/5 bg-black/40">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Zion AI about the markets..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-4 text-white focus:border-gold/50 transition-all outline-none"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/20">
                <Sparkles size={16} />
              </div>
            </div>
            <button 
              onClick={handleSend}
              disabled={!input.trim() || isLoading}
              className="p-4 rounded-xl bg-gold text-black hover:shadow-lg hover:shadow-gold/20 transition-all disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </div>
          <div className="flex gap-4 mt-4 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { label: 'Market Sentiment', icon: TrendingUp },
              { label: 'Risk Analysis', icon: Shield },
              { label: 'Strategy Help', icon: Zap },
              { label: 'Platform Guide', icon: Globe },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => setInput(chip.label)}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/40 font-bold uppercase tracking-widest hover:border-gold/50 hover:text-gold transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <chip.icon size={12} /> {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
