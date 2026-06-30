import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Upload, Image as ImageIcon, Sparkles, Zap, Shield, TrendingUp, TrendingDown, Target, Activity, Brain, Loader2, AlertTriangle, Search, CheckCircle2, XCircle, Bot, Share2, Download } from 'lucide-react';
import { UserProfile } from '../types';
import { GoogleGenAI } from "@google/genai";
import ReactMarkdown from 'react-markdown';

export default function OracleEye({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAnalysis(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const analyzeChart = async () => {
    if (!selectedImage) return;

    setIsAnalyzing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY?.trim() });
      
      const base64Data = selectedImage.split(',')[1];
      const result = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          "Analyze this trading chart. Identify key support and resistance levels, current trend, potential patterns (like head and shoulders, double top, etc.), and provide a high-probability trading recommendation (Buy/Sell/Wait) with Entry, SL, and TP. Use a professional, cosmic-themed tone.",
          {
            inlineData: {
              data: base64Data,
              mimeType: "image/jpeg"
            }
          }
        ]
      });

      setAnalysis(result.text || "The Oracle Eye is silent. No analysis could be generated.");
      addToast('The Oracle Eye has revealed the chart secrets.', 'success');
    } catch (error: any) {
      if (!String(error).includes('quota') && !String(error).includes('Quota') && error.status !== "RESOURCE_EXHAUSTED") {
          console.error(error);
      }
      if (error.message?.includes("API key not valid") || error.message?.includes("API_KEY_INVALID")) {
          addToast("Oracle Disconnected: Your Gemini API Key is invalid. Please insert a valid key in the AI Studio Settings under 'API Keys'.", "error");
      } else if (error.status === "INVALID_ARGUMENT") {
          addToast("Oracle Error: Invalid image or argument format sent. " + error.message, "error");
      } else if (error.message?.includes("quota") || error.message?.includes("429") || error.status === "RESOURCE_EXHAUSTED") {
          addToast("Quota exceeded: Please check your Gemini API plan limits.", "error");
      } else {
          addToast('The Oracle Eye is clouded. Please try again.', 'error');
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient flex items-center gap-3">
            <Eye className="text-gold" size={32} /> Oracle Eye
          </h1>
          <p className="text-white/40">Upload your charts and let the AI Vision analyze market patterns with divine precision.</p>
        </div>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="glass-card border-gold/20 text-gold px-6 py-2 flex items-center gap-2 hover:bg-gold hover:text-black transition-all font-bold uppercase tracking-widest text-[10px]"
          >
            <Upload size={16} /> Upload Chart
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImageUpload} 
            accept="image/*" 
            className="hidden" 
          />
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div 
            className={`glass-card aspect-video flex flex-col items-center justify-center border-2 border-dashed transition-all relative overflow-hidden ${
              selectedImage ? 'border-gold/50' : 'border-white/10 hover:border-white/20'
            }`}
            onClick={() => !selectedImage && fileInputRef.current?.click()}
          >
            {selectedImage ? (
              <>
                <img src={selectedImage} alt="Chart" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-all flex items-center justify-center gap-4">
                  <button 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    className="p-3 rounded-full bg-gold text-black hover:scale-110 transition-all"
                  >
                    <Upload size={20} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(null); setAnalysis(null); }}
                    className="p-3 rounded-full bg-red-400 text-white hover:scale-110 transition-all"
                  >
                    <XCircle size={20} />
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 p-12">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/20">
                  <ImageIcon size={40} />
                </div>
                <div>
                  <p className="text-lg font-bold">Drop your chart here</p>
                  <p className="text-sm text-white/40">Supports PNG, JPG, WEBP</p>
                </div>
                <button className="gold-button px-8 py-3">Select File</button>
              </div>
            )}
          </div>

          <div className="glass-card p-6 bg-gold/5 border-gold/20 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Brain className="text-gold" size={20} /> Neural Vision Protocol
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              The Oracle Eye uses advanced computer vision to identify patterns, trendlines, and liquidity zones that are often invisible to the mortal eye.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
              <div className="space-y-1">
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Analysis Depth</p>
                <p className="text-lg font-display font-bold text-gold">Ultra-High</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Pattern Library</p>
                <p className="text-lg font-display font-bold text-emerald-400">1,000+</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card flex-1 min-h-[500px] flex flex-col border-white/5 overflow-hidden">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
                  <Eye className="text-gold" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold">Vision Analysis</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Oracle Insight Feed</p>
                </div>
              </div>
              {analysis && (
                <div className="flex items-center gap-2">
                  <button className="p-2 text-white/40 hover:text-gold transition-all"><Share2 size={18} /></button>
                  <button className="p-2 text-white/40 hover:text-gold transition-all"><Download size={18} /></button>
                </div>
              )}
            </div>

            <div className="flex-1 p-8 overflow-y-auto">
              {isAnalyzing ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6">
                  <div className="relative">
                    <motion.div 
                      animate={{ rotate: 360 }} 
                      transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                      className="w-24 h-24 rounded-full border-2 border-gold/20 border-t-gold"
                    />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Sparkles className="text-gold animate-pulse" size={32} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-display font-bold gold-gradient animate-pulse">Consulting the Oracle Eye</h3>
                    <p className="text-sm text-white/40 italic">Scanning neural pathways for market patterns...</p>
                  </div>
                </div>
              ) : analysis ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="prose prose-invert prose-sm lg:prose-base max-w-none"
                >
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-40">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                    <Search size={32} />
                  </div>
                  <p className="max-w-xs italic">Upload a chart and initiate the Vision Protocol to receive divine analysis.</p>
                  {selectedImage && (
                    <button 
                      onClick={analyzeChart}
                      className="gold-button px-8 py-3 mt-4"
                    >
                      Initiate Vision Protocol
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
