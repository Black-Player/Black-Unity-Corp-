import { useState, useRef, useEffect } from 'react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, Send, Bot, User, Sparkles, Loader2, Zap, Brain, 
  Shield, Globe, TrendingUp, History, Info, FileText, Upload, 
  CheckCircle2, Copy, Share2, Image as ImageIcon, Cpu, ChevronDown, Trash2, Sliders
} from 'lucide-react';
import Markdown from 'react-markdown';
import { SYSTEM_ROLE } from '../constants/systemRole';
import { sendArbitraryMessageToTelegram } from '../services/communicationService';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
  thinkingEnabled?: boolean;
  fileData?: {
    name: string;
    type: string;
    previewUrl?: string;
  };
}

export default function ZionAI({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [messages, setMessages] = useState<Message[]>([
    { 
      id: '1', 
      role: 'assistant', 
      content: "Greetings, Oracle. I am **Zion AI**, your cosmic guide powered by Gemini intelligence. I can analyze charts, market screenshots, strategy documents, and execute multi-turn trading intelligence.\n\nChoose your Gemini Model engine below or toggle **High Thinking Mode** for complex market analysis!", 
      timestamp: new Date().toISOString(),
      modelUsed: 'gemini-3.5-flash'
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState<'gemini-3.1-pro-preview' | 'gemini-3.5-flash' | 'gemini-3.1-flash-lite'>('gemini-3.5-flash');
  const [thinkingMode, setThinkingMode] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{ name: string; data: string; type: string; previewUrl?: string } | null>(null);
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
      if (file.size > 15 * 1024 * 1024) {
        addToast("File is too large. Dimensional limit is 15MB.", "error");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        const isImage = file.type.startsWith('image/');
        setUploadedFile({
          name: file.name,
          data: base64.split(',')[1],
          type: file.type,
          previewUrl: isImage ? base64 : undefined
        });
        addToast(`File linked: ${file.name}`, "success");
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!input.trim() && !uploadedFile) || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input || (uploadedFile ? `[Uploaded File / Image: ${uploadedFile.name}]` : ''),
      timestamp: new Date().toISOString(),
      fileData: uploadedFile ? { 
        name: uploadedFile.name, 
        type: uploadedFile.type,
        previewUrl: uploadedFile.previewUrl 
      } : undefined
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    const currentFile = uploadedFile;
    setUploadedFile(null);
    setIsLoading(true);

    try {
      const activeModel = thinkingMode ? 'gemini-3.1-pro-preview' : selectedModel;
      
      // Construct chat history for multi-turn thread
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...chatHistory, { role: 'user', content: userMsg.content }],
          model: activeModel,
          thinkingMode,
          systemInstruction: `${SYSTEM_ROLE}\n\nYou are Zion AI, an elite AI Trading Oracle for Blāck-Unity Corp—RSA. Provide clear, well-structured trading insights, strategy breakdowns, risk management calculations, and market analysis. Always break down technical details cleanly.`,
          image: currentFile ? {
            base64: currentFile.data,
            mimeType: currentFile.type
          } : undefined
        })
      });

      const data = await res.json();

      if (!data.success) {
        throw new Error(data.error || 'Server returned an error for Gemini API');
      }

      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.text || "The cosmic winds are silent. Please try again.",
        timestamp: new Date().toISOString(),
        modelUsed: data.modelUsed,
        thinkingEnabled: data.thinkingEnabled
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'The Gemini Oracle connection was interrupted.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      { 
        id: Date.now().toString(), 
        role: 'assistant', 
        content: "Chat history reset. How can Zion AI assist your trading prophecies now?", 
        timestamp: new Date().toISOString(),
        modelUsed: selectedModel
      }
    ]);
    addToast("Chat thread cleared.", "info");
  };

  return (
    <div className="h-[calc(100vh-140px)] lg:h-[calc(100vh-110px)] flex flex-col gap-4 lg:gap-6">
      {/* Header Controls */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-4 rounded-2xl border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20 relative">
            <Bot size={22} />
            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-cosmic-black animate-pulse" />
          </div>
          <div>
            <h1 className="text-xl font-display font-bold gold-gradient flex items-center gap-2">
              Zion AI Assistant <Sparkles size={16} className="text-gold" />
            </h1>
            <p className="text-[10px] text-white/50 uppercase tracking-widest font-bold">
              Multi-Turn Gemini Engine • {selectedModel}
            </p>
          </div>
        </div>

        {/* Model Selector & Thinking Mode Toggle */}
        <div className="flex items-center flex-wrap gap-2 w-full sm:w-auto">
          {/* Model Switcher */}
          <div className="relative flex-1 sm:flex-initial">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as any)}
              className="w-full sm:w-auto bg-black/60 border border-white/15 rounded-xl px-3 py-2 text-xs text-gold font-bold focus:border-gold outline-none cursor-pointer appearance-none pr-8"
            >
              <option value="gemini-3.5-flash">⚡ Gemini 3.5 Flash (General Intelligence)</option>
              <option value="gemini-3.1-pro-preview">🧠 Gemini 3.1 Pro (Deep Research & Reasoning)</option>
              <option value="gemini-3.1-flash-lite">🚀 Gemini 3.1 Flash Lite (Ultra Low Latency)</option>
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gold/60 pointer-events-none" />
          </div>

          {/* High Thinking Mode Toggle */}
          <button
            onClick={() => {
              const next = !thinkingMode;
              setThinkingMode(next);
              if (next) {
                setSelectedModel('gemini-3.1-pro-preview');
                addToast("High Thinking Mode activated (gemini-3.1-pro-preview)", "info");
              } else {
                addToast("High Thinking Mode deactivated", "info");
              }
            }}
            className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
              thinkingMode 
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-lg shadow-purple-500/20' 
                : 'bg-white/5 border-white/10 text-white/50 hover:text-white'
            }`}
            title="Enable High Thinking Level reasoning for complex queries"
          >
            <Brain size={15} className={thinkingMode ? 'animate-bounce text-purple-400' : ''} />
            <span>High Thinking</span>
          </button>

          <button
            onClick={clearChat}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:text-rose-400 transition-all cursor-pointer"
            title="Clear Chat Thread"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </header>

      {/* Main Chat Thread */}
      <div className="flex-1 glass-card border-white/10 flex flex-col overflow-hidden relative rounded-2xl">
        <div className="absolute inset-0 bg-gold/5 rounded-full blur-[120px] -z-10 pointer-events-none opacity-20" />
        
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 scrollbar-hide">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={`flex gap-3 ${msg.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
              >
                {msg.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold shrink-0 border border-gold/20 mt-1">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`max-w-[85%] sm:max-w-[75%] p-4 rounded-2xl text-sm leading-relaxed relative group ${
                  msg.role === 'assistant' 
                    ? 'bg-white/5 border border-white/10 text-white/90 shadow-lg' 
                    : 'bg-gold text-black font-medium'
                }`}>
                  {/* File/Image Preview inside message */}
                  {msg.fileData && (
                    <div className="mb-3 p-2 bg-black/30 rounded-xl border border-white/10 flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        {msg.fileData.previewUrl ? <ImageIcon size={16} className="text-gold" /> : <FileText size={16} className="text-gold" />}
                        <span className="text-xs font-bold truncate text-white/90">{msg.fileData.name}</span>
                      </div>
                      {msg.fileData.previewUrl && (
                        <img 
                          src={msg.fileData.previewUrl} 
                          alt="Uploaded Chart Preview" 
                          className="max-h-48 rounded-lg object-contain bg-black/50 border border-white/10"
                        />
                      )}
                    </div>
                  )}

                  <div className="markdown-body">
                    <Markdown>{msg.content}</Markdown>
                  </div>

                  {/* Message Footer Badges */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-current/10 text-[9px]">
                    <div className="flex items-center gap-2">
                      <span className={`uppercase tracking-widest font-bold ${msg.role === 'assistant' ? 'text-white/30' : 'text-black/50'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {msg.modelUsed && (
                        <span className="px-1.5 py-0.5 rounded bg-black/40 text-gold border border-gold/20 font-mono text-[8px]">
                          {msg.modelUsed}
                        </span>
                      )}
                      {msg.thinkingEnabled && (
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono text-[8px] flex items-center gap-1">
                          <Brain size={10} /> Thinking High
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className={`opacity-60 hover:opacity-100 transition-opacity p-1 rounded flex items-center gap-1 uppercase font-bold tracking-widest
                          ${msg.role === 'assistant' ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-black/50 hover:text-black hover:bg-black/10'} cursor-pointer`}
                        title="Copy message content"
                      >
                        {copiedId === msg.id ? <CheckCircle2 size={12} className={msg.role === 'assistant' ? 'text-emerald-400' : 'text-emerald-800'} /> : <Copy size={12} />}
                        {copiedId === msg.id ? 'Copied' : 'Copy'}
                      </button>

                      <button 
                        onClick={async () => {
                          if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
                            addToast("Please configure your Telegram credentials in Settings first.", "error");
                            return;
                          }
                          const fromWho = msg.role === 'user' ? 'User' : 'Zion AI';
                          const success = await sendArbitraryMessageToTelegram(
                            `*From: ${fromWho}*\n\n${msg.content}`,
                            userProfile.integrations
                          );
                          if (success) {
                            addToast("Dispatched to Telegram!", "success");
                          } else {
                            addToast("Failed to send message to Telegram.", "error");
                          }
                        }}
                        className={`opacity-60 hover:opacity-100 transition-opacity p-1 rounded flex items-center gap-1 uppercase font-bold tracking-widest
                          ${msg.role === 'assistant' ? 'text-white/40 hover:text-white hover:bg-white/10' : 'text-black/50 hover:text-black hover:bg-black/10'} cursor-pointer`}
                        title="Send message to Telegram"
                      >
                        <Share2 size={12} /> Telegram
                      </button>
                    </div>
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/70 shrink-0 border border-white/10 mt-1">
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
              className="flex gap-3 justify-start"
            >
              <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold shrink-0 border border-gold/20">
                <Bot size={16} />
              </div>
              <div className="bg-white/5 border border-white/10 p-4 rounded-2xl flex items-center gap-3">
                <Loader2 size={18} className="animate-spin text-gold" />
                <div className="flex flex-col">
                  <span className="text-xs text-gold font-bold">
                    Zion AI processing with {thinkingMode ? 'gemini-3.1-pro-preview (High Thinking)' : selectedModel}...
                  </span>
                  <span className="text-[10px] text-white/40">Evaluating market parameters & reasoning...</span>
                </div>
              </div>
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* File attachment bar */}
        {uploadedFile && (
          <div className="mx-4 mb-2 p-3 bg-gold/10 border border-gold/30 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              {uploadedFile.previewUrl ? (
                <img src={uploadedFile.previewUrl} alt="Preview" className="w-10 h-10 rounded-lg object-cover border border-gold/30" />
              ) : (
                <FileText size={20} className="text-gold" />
              )}
              <div>
                <p className="text-xs font-bold text-white">{uploadedFile.name}</p>
                <p className="text-[10px] text-emerald-400 font-mono">Ready for Gemini Multimodal Analysis</p>
              </div>
            </div>
            <button 
              onClick={() => setUploadedFile(null)}
              className="p-1.5 hover:bg-white/10 rounded-lg text-white/40 hover:text-white transition-all text-xs font-bold"
            >
              Remove
            </button>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 sm:p-6 border-t border-white/10 bg-black/50">
          <div className="flex gap-3">
            <input 
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept=".png,.jpg,.jpeg,.webp,.pdf"
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="p-3.5 rounded-xl glass-card border-white/10 text-white/60 hover:text-gold hover:border-gold/40 transition-all cursor-pointer"
              title="Upload chart screenshot or document (Gemini Vision)"
            >
              <Upload size={20} />
            </button>

            <div className="flex-1 relative">
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder={thinkingMode ? "Ask Zion AI (High Thinking Mode Active)..." : "Ask Zion AI or paste strategy rules..."}
                className="w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 py-3.5 text-sm text-white focus:border-gold/60 transition-all outline-none"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gold/40">
                <Sparkles size={16} />
              </div>
            </div>

            <button 
              onClick={handleSend}
              disabled={(!input.trim() && !uploadedFile) || isLoading}
              className="p-3.5 rounded-xl bg-gold text-black hover:shadow-lg hover:shadow-gold/20 transition-all font-bold disabled:opacity-50 cursor-pointer"
            >
              <Send size={20} />
            </button>
          </div>

          {/* Quick Prompts */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 scrollbar-hide">
            {[
              { label: '6-Step Reversal Rules', icon: Cpu },
              { label: 'Analyze Chart Screenshot', icon: ImageIcon, fileTrigger: true },
              { label: 'High Thinking SMC Deep Research', icon: Brain, model: 'gemini-3.1-pro-preview' },
              { label: 'Fast Risk Calculation', icon: Zap, model: 'gemini-3.1-flash-lite' },
            ].map((chip) => (
              <button
                key={chip.label}
                onClick={() => {
                  if (chip.fileTrigger) {
                    fileInputRef.current?.click();
                  } else {
                    if (chip.model) {
                      setSelectedModel(chip.model as any);
                    }
                    setInput(chip.label);
                  }
                }}
                className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-[10px] text-white/60 font-bold uppercase tracking-widest hover:border-gold/50 hover:text-gold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <chip.icon size={12} className="text-gold" /> {chip.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
