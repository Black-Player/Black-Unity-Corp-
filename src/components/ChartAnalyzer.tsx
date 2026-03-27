import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Eye, Upload, Image as ImageIcon, Loader2, Sparkles, Target, Shield, TrendingUp, TrendingDown, Info, X } from 'lucide-react';
import { analyzeChartImage } from '../services/aiService';
import { UserProfile } from '../types';

interface ChartAnalysis {
  market_structure: string;
  identified_elements: string[];
  patterns: string[];
  visionary_insight: string;
  suggested_setup?: {
    entry: number;
    stop_loss: number;
    tp: number;
  };
  confidence: number;
}

export default function ChartAnalyzer({ userProfile, addToast }: { userProfile: UserProfile, addToast: (msg: string, type?: any) => void }) {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ChartAnalysis | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 4 * 1024 * 1024) {
        addToast('The image is too heavy for the cosmic link. Max 4MB.', 'error');
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

  const runAnalysis = async () => {
    if (!selectedImage) return;
    
    setIsAnalyzing(true);
    try {
      const base64Data = selectedImage.split(',')[1];
      const mimeType = selectedImage.split(',')[0].split(':')[1].split(';')[0];
      const result = await analyzeChartImage(base64Data, mimeType);
      setAnalysis(result);
      addToast('The Oracle Eye has deciphered the patterns.', 'success');
    } catch (error: any) {
      addToast(error.message, 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearImage = () => {
    setSelectedImage(null);
    setAnalysis(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">The Oracle Eye</h1>
        <p className="text-white/40">Upload a chart screenshot for instant AI-powered technical analysis.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div 
            className={`glass-card p-8 border-dashed border-2 transition-all flex flex-col items-center justify-center min-h-[400px] relative overflow-hidden ${
              selectedImage ? 'border-gold/50' : 'border-white/10 hover:border-gold/30'
            }`}
          >
            {selectedImage ? (
              <div className="relative w-full h-full group">
                <img 
                  src={selectedImage} 
                  alt="Chart Preview" 
                  className="w-full h-full object-contain rounded-xl"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                  <button 
                    onClick={clearImage}
                    className="p-3 bg-red-500/20 text-red-500 rounded-full hover:bg-red-500/40 transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              </div>
            ) : (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center space-y-4 cursor-pointer text-white/40 hover:text-gold transition-colors"
              >
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                  <Upload size={32} />
                </div>
                <div className="text-center">
                  <p className="font-bold uppercase tracking-widest text-xs">Drop your screenshot here</p>
                  <p className="text-[10px] mt-1">or click to browse (PNG, JPG)</p>
                </div>
              </div>
            )}
            <input 
              type="file" 
              ref={fileInputRef}
              onChange={handleImageUpload}
              accept="image/*"
              className="hidden"
            />
          </div>

          <button 
            onClick={runAnalysis}
            disabled={!selectedImage || isAnalyzing}
            className="w-full gold-button py-4 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isAnalyzing ? <Loader2 className="animate-spin" size={20} /> : <Eye size={20} />}
            {isAnalyzing ? 'Deciphering Cosmic Patterns...' : 'Analyze Chart'}
          </button>
        </div>

        {/* Results Section */}
        <div className="space-y-6">
          <AnimatePresence mode="wait">
            {isAnalyzing ? (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-12 flex flex-col items-center justify-center space-y-6 min-h-[400px]"
              >
                <div className="relative w-24 h-24">
                  <div className="absolute inset-0 bg-gold/20 rounded-full animate-ping"></div>
                  <div className="relative w-full h-full bg-gold/10 rounded-full flex items-center justify-center border border-gold/30">
                    <Eye className="text-gold animate-pulse" size={40} />
                  </div>
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-display font-bold">The Eye is Watching</h3>
                  <p className="text-white/40 text-sm">Scanning for Order Blocks and Fair Value Gaps...</p>
                </div>
              </motion.div>
            ) : analysis ? (
              <motion.div 
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Market Structure */}
                <div className="glass-card p-6 border-gold/20 bg-gold/5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-gold flex items-center gap-2">
                      <TrendingUp size={14} /> Market Structure
                    </h3>
                    <div className="px-3 py-1 rounded-full bg-gold/10 text-gold text-[10px] font-bold border border-gold/20">
                      {analysis.confidence}% Confidence
                    </div>
                  </div>
                  <p className="text-2xl font-display font-bold">{analysis.market_structure}</p>
                </div>

                {/* Identified Elements */}
                <div className="glass-card p-6 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Target size={14} /> Technical Elements
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {analysis.identified_elements.map((el, i) => (
                      <div key={i} className="p-3 rounded-xl bg-white/5 border border-white/5 text-xs font-medium flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-gold"></div>
                        {el}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Visionary Insight */}
                <div className="glass-card p-6 border-white/10 space-y-4">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-white/40 flex items-center gap-2">
                    <Sparkles size={14} /> Visionary Insight
                  </h3>
                  <p className="text-sm text-white/80 leading-relaxed italic">
                    "{analysis.visionary_insight}"
                  </p>
                </div>

                {/* Suggested Setup */}
                {analysis.suggested_setup && (
                  <div className="glass-card p-6 border-emerald-500/20 bg-emerald-500/5 space-y-4">
                    <h3 className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                      <Shield size={14} /> Suggested Setup
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-[10px] text-white/20 uppercase font-bold mb-1">Entry</p>
                        <p className="text-lg font-display font-bold">{analysis.suggested_setup.entry}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/20 uppercase font-bold mb-1">Stop Loss</p>
                        <p className="text-lg font-display font-bold text-red-400">{analysis.suggested_setup.stop_loss}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-white/20 uppercase font-bold mb-1">Take Profit</p>
                        <p className="text-lg font-display font-bold text-emerald-400">{analysis.suggested_setup.tp}</p>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <div className="glass-card p-12 flex flex-col items-center justify-center space-y-4 min-h-[400px] text-white/20">
                <ImageIcon size={48} />
                <p className="italic">Analysis results will appear here once the Oracle Eye has spoken.</p>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
