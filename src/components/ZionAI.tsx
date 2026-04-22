import { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, Bot, User, Sparkles, Loader2, Zap, Brain, Shield, Globe, TrendingUp, History, Info, FileText, Upload, CheckCircle2, Copy } from 'lucide-react';
import Markdown from 'react-markdown';
import { SYSTEM_ROLE } from '../constants/systemRole';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  fileData?: {
    name: string;
    type: string;
  };
}

export default function ZionAI({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', role: 'assistant', content: "Greetings, Oracle. I am Zion AI, your cosmic guide through the markets. I can now analyze your strategy PDFs, screenshots, and guides to evolve our collective intelligence. How can I assist your prophecies today?", timestamp: new Date().toISOString() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string, data: string, type: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 15MB size limit requested
      if (file.size > 15 * 1024 * 1024) {
          addToast("File is too large. Dimensional limit is 15MB.", "error");
          return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setUploadedFile({
          name: file.name,
          data: base64.split(',')[1],
          type: file.type
        });
        addToast(`Library integration linked with ${file.name} (Max 15MB)`, "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !uploadedFile) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input || (uploadedFile ? `Analyzed document: ${uploadedFile.name}` : ''),
      timestamp: new Date().toISOString(),
      fileData: uploadedFile ? { name: uploadedFile.name, type: uploadedFile.type } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const currentFile = uploadedFile;
    setUploadedFile(null);
    setIsLoading(true);

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error("GEMINI_API_KEY is missing from environment.");
      }
      const ai = new GoogleGenAI({ apiKey });
      const modelName = "gemini-3-flash-preview";
      
      const contents: any[] = [
        {
          role: "user",
          parts: [
            { text: `The user's profile: ${JSON.stringify(userProfile)}. 
              The user asks: ${input || 'Please analyze this document and extract the core trading rules.'}. 
              Provide a response based on your core directives. 
              IF a document is provided, focus on PART 6: DOCUMENT LEARNING ENGINE. Extract Entry rules, Exit rules, Indicators, and Risk models.` }
          ]
        }
      ];

      if (currentFile) {
        contents[0].parts.push({
          inlineData: {
            data: currentFile.data,
            mimeType: currentFile.type
          }
        });
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: SYSTEM_ROLE + "\n\nYou are the Omni Evolution Core acting as Zion AI. You are a teacher and protector. Follow PART 6: DOCUMENT LEARNING ENGINE strictly for document analysis. Guide the user with mystical and professional precision.",
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
    <div className="h-[calc(100vh-140px)] lg:h-[calc(100vh-110px)] flex flex-col gap-4 lg:gap-6">
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
                <div className={`max-w-[80%] p-4 rounded-2xl text-sm leading-relaxed relative group ${
                  msg.role === 'assistant' 
                    ? 'bg-white/5 border border-white/10 text-white/80' 
                    : 'bg-gold text-black font-medium'
                }`}>
                  {msg.fileData && (
                    <div className="flex items-center gap-2 mb-2 p-2 bg-black/20 rounded-lg border border-white/10">
                      <FileText size={16} className={msg.role === 'assistant' ? 'text-gold' : 'text-black'} />
                      <span className="text-[10px] font-bold truncate">{msg.fileData.name}</span>
                    </div>
                  )}
                  <div className="markdown-body">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-current/10">
                    <p className={`text-[8px] uppercase tracking-widest font-bold ${msg.role === 'assistant' ? 'text-white/20' : 'text-black/40'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                    <button 
                      onClick={() => handleCopy(msg.content, msg.id)}
                      className={`opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg flex items-center gap-1 text-[10px] uppercase font-bold tracking-widest
                        ${msg.role === 'assistant' ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-black/40 hover:text-black hover:bg-black/10'}`}
                      title="Copy message for educational purposes"
                    >
                      {copiedId === msg.id ? <CheckCircle2 size={12} className={msg.role === 'assistant' ? 'text-emerald-400' : 'text-emerald-700'} /> : <Copy size={12} />}
                      {copiedId === msg.id ? 'Copied' : 'Copy'}
                    </button>
                  </div>
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
          {uploadedFile && (
            <div className="mb-4 p-3 bg-gold/10 border border-gold/20 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText size={16} className="text-gold" />
                <span className="text-xs font-bold text-white">{uploadedFile.name}</span>
                <CheckCircle2 size={12} className="text-emerald-400" />
              </div>
              <button 
                onClick={() => setUploadedFile(null)}
                className="text-white/20 hover:text-white/40 transition-all font-bold text-[10px] uppercase tracking-widest"
              >
                Clear
              </button>
            </div>
          )}
          <div className="flex gap-4">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.png,.jpg,.jpeg"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-4 rounded-xl glass-card border-white/10 text-white/40 hover:text-gold transition-all"
              title="Upload strategy document or screenshot"
            >
              <Upload size={20} />
            </button>
            <div className="flex-1 relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Zion AI or provide a strategy doc..."
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-12 py-4 text-white focus:border-gold/50 transition-all outline-none"
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 text-white/20">
                <Sparkles size={16} />
              </div>
            </div>
            <button 
              onClick={handleSend}
              disabled={(!input.trim() && !uploadedFile) || isLoading}
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
