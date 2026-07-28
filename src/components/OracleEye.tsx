import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Upload, Image as ImageIcon, Sparkles, Zap, Shield, TrendingUp, TrendingDown, Target, Activity, Brain, Loader2, AlertTriangle, Search, CheckCircle2, XCircle, Bot, Share2, Download } from 'lucide-react';
import { UserProfile } from '../types';
import ReactMarkdown from 'react-markdown';

export default function OracleEye({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [thinkingMode, setThinkingMode] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 15 * 1024 * 1024) {
        addToast("Image size exceeds 15MB limit.", "error");
        return;
      }
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
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.substring(selectedImage.indexOf(":") + 1, selectedImage.indexOf(";")) || "image/jpeg";

      const response = await fetch('/api/gemini/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: base64Data,
          mimeType,
          thinkingMode,
          prompt: "Analyze this trading chart in detail. Identify key support/resistance levels, trend directions, Order Blocks (OB), Fair Value Gaps (FVG), Liquidity Sweeps, and any 6-Step Multi-Timeframe Reversal setups. Provide exact Entry, Stop Loss, Take Profit 1/2/3 recommendations with high accuracy."
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to analyze chart via Gemini API");
      }

      setAnalysis(data.text || "The Oracle Eye is silent. No analysis could be generated.");
      addToast('The Oracle Eye has revealed the chart secrets via Gemini Vision.', 'success');
    } catch (error: any) {
      console.error(error);
      addToast(error.message || 'The Oracle Eye is clouded. Please try again.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient flex items-center gap-3">
            <Eye className="text-gold" size={32} /> Oracle Eye Vision
          </h1>
          <p className="text-white/40">Upload your trading chart screenshots for deep Gemini multimodal analysis & pattern detection.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setThinkingMode(!thinkingMode)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border flex items-center gap-2 cursor-pointer ${
              thinkingMode 
                ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 shadow-lg shadow-purple-500/20' 
                : 'bg-white/5 border-white/10 text-white/50'
            }`}
          >
            <Brain size={16} className={thinkingMode ? 'animate-pulse text-purple-400' : ''} />
            <span>High Thinking Mode ({thinkingMode ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash'})</span>
          </button>

          <button 
            onClick={() => fileInputRef.current?.click()}
            className="glass-card border-gold/20 text-gold px-6 py-2.5 flex items-center gap-2 hover:bg-gold hover:text-black transition-all font-bold uppercase tracking-widest text-[10px] cursor-pointer"
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
            className={`glass-card aspect-video flex flex-col items-center justify-center border-2 border-dashed transition-all relative overflow-hidden rounded-2xl cursor-pointer ${
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
                    className="p-3 rounded-full bg-gold text-black hover:scale-110 transition-all cursor-pointer"
                  >
                    <Upload size={20} />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedImage(null); setAnalysis(null); }}
                    className="p-3 rounded-full bg-rose-500 text-white hover:scale-110 transition-all cursor-pointer"
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
                  <p className="text-lg font-bold">Drop your chart screenshot here</p>
                  <p className="text-sm text-white/40">Supports PNG, JPG, WEBP (Max 15MB)</p>
                </div>
                <button className="gold-button px-8 py-3">Select File</button>
              </div>
            )}
          </div>

          <div className="glass-card p-6 bg-gold/5 border-gold/20 space-y-4 rounded-2xl">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-gold">
              <Brain className="text-gold" size={20} /> Neural Vision Protocol
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              The Oracle Eye uses Gemini Vision intelligence to identify liquidity pools, Order Blocks, FVGs, and 6-Step Multi-Timeframe Reversal setups with high mathematical confidence.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/10">
              <div className="space-y-1">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Model Engine</p>
                <p className="text-sm font-mono font-bold text-gold">{thinkingMode ? 'gemini-3.1-pro-preview' : 'gemini-3.5-flash'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Reasoning Mode</p>
                <p className="text-sm font-display font-bold text-purple-400">{thinkingMode ? 'High Thinking Level' : 'Standard Speed'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card flex-1 min-h-[500px] flex flex-col border-white/10 overflow-hidden rounded-2xl">
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center border border-gold/30">
                  <Eye className="text-gold" size={18} />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Vision Analysis Output</h3>
                  <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Oracle Insight Feed</p>
                </div>
              </div>
            </div>

            <div className="flex-1 p-6 overflow-y-auto">
              {isAnalyzing ? (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-6 py-12">
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
                    <h3 className="text-xl font-display font-bold gold-gradient animate-pulse">Scanning with Gemini Vision</h3>
                    <p className="text-sm text-white/40 italic">Evaluating market structure, liquidity sweeps, and entry levels...</p>
                  </div>
                </div>
              ) : analysis ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="markdown-body"
                >
                  <ReactMarkdown>{analysis}</ReactMarkdown>
                </motion.div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center space-y-4 opacity-60 py-12">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                    <Search size={32} />
                  </div>
                  <p className="max-w-xs text-sm italic text-white/60">Upload a chart image and initiate the Vision Protocol to receive analysis.</p>
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
