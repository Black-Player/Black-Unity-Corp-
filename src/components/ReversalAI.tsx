import { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, Zap, Shield, Sparkles, Lock, ArrowRight, CheckCircle2, 
  Activity, Play, RefreshCw, Send, Share2, Layers, AlertCircle, 
  ChevronRight, TrendingUp, TrendingDown, Target, Brain, FileText, Copy
} from 'lucide-react';
import Markdown from 'react-markdown';
import { sendArbitraryMessageToTelegram } from '../services/communicationService';

interface ReversalAIProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function ReversalAI({ userProfile, addToast }: ReversalAIProps) {
  const isCreator = 
    userProfile.tier === 'creator' || 
    userProfile.role === 'creator' || 
    userProfile.email?.toLowerCase() === 'kanitezu@gmail.com' ||
    userProfile.email?.toLowerCase() === 'andilenqobile561@gmail.com';

  const [selectedPair, setSelectedPair] = useState('EUR/USD');
  const [isScanning, setIsScanning] = useState(false);
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [scanResult, setScanResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const steps = [
    {
      num: 1,
      timeframe: '15M',
      title: 'Range Identification',
      description: 'Identify 15min market range, key highs/lows, and consolidation boundaries.'
    },
    {
      num: 2,
      timeframe: '5M',
      title: '5Min Breakout',
      description: '5min aggressive expansion breaking out of the 15min range.'
    },
    {
      num: 3,
      timeframe: '5M / 15M',
      title: '5Min Sweep + Long Wick',
      description: '5min liquidity sweep leaving a prominent rejection wick on the 15min timeframe.'
    },
    {
      num: 4,
      timeframe: '15M',
      title: 'Direction Change (CHoCH)',
      description: 'Market structure shift in opposite direction creating displacement.'
    },
    {
      num: 5,
      timeframe: '15M / 5M',
      title: 'Gap Creation (FVG)',
      description: 'Fair Value Gap or Imbalance zone established on the impulse leg.'
    },
    {
      num: 6,
      timeframe: '1M',
      title: '1Min Rejection Entry',
      description: 'Price retraces into FVG, 1min rejection candle prints trigger on 2nd candle.'
    }
  ];

  const handleExecuteScan = async () => {
    if (!isCreator) {
      addToast('Reversal AI execution is locked to Creator credentials.', 'error');
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    // Simulate multi-step animation
    for (let i = 1; i <= 6; i++) {
      setActiveStep(i);
      await new Promise(r => setTimeout(r, 400));
    }

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{
            role: 'user',
            content: `Perform a strict 6-Step Multi-Timeframe Reversal strategy analysis for ${selectedPair}.
Evaluate:
1. 15M Range Boundaries
2. 5M Breakout & Liquidity Sweep
3. 15M Rejection Wick Confirmation
4. CHoCH Direction Shift
5. Fair Value Gap Creation
6. 1M Rejection Trigger Setup

Provide entry price, stop loss, and TP targets. MANDATE: Risk:Reward for TP1 MUST be at least 1:3.5 (If SL risk is $1.00, TP1 profit MUST be at least $3.50). Format nicely in Markdown.`
          }],
          model: 'gemini-3.1-pro-preview',
          systemInstruction: 'You are Reversal AI, an elite 6-step algorithmic reversal engine for Blāck-Unity Corp—RSA. Enforce strict 1:3.5+ RR ratios.'
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Failed to scan');

      setScanResult(data.text);
      addToast(`Reversal AI scan complete for ${selectedPair}!`, 'success');
    } catch (err: any) {
      console.error(err);
      addToast(err.message || 'Scan failed', 'error');
    } finally {
      setIsScanning(false);
      setActiveStep(null);
    }
  };

  const handleCopyToClipboard = () => {
    if (!scanResult) return;
    navigator.clipboard.writeText(scanResult);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    addToast('Reversal prophecy copied to clipboard', 'info');
  };

  const handleSendTelegram = async () => {
    if (!userProfile.integrations?.telegram_bot_token || !userProfile.integrations?.telegram_chat_id) {
      addToast('Please configure Telegram token and chat ID in Settings first.', 'error');
      return;
    }
    const success = await sendArbitraryMessageToTelegram(
      `⚡ *REVERSAL AI 6-STEP PROPHECY (${selectedPair})*\n\n${scanResult}`,
      userProfile.integrations
    );
    if (success) addToast('Dispatched Reversal prophecy to Telegram!', 'success');
    else addToast('Failed to dispatch to Telegram', 'error');
  };

  if (!isCreator) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 text-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-xl glass-card p-8 rounded-3xl border-rose-500/30 space-y-6 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-rose-500 via-purple-500 to-amber-500" />
          <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
            <Lock size={32} />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase tracking-widest">
              Creator Access Restricted
            </span>
            <h2 className="text-2xl font-display font-bold text-white">Reversal AI Engine</h2>
            <p className="text-xs text-white/60 leading-relaxed">
              The 6-Step Multi-Timeframe Reversal AI Bot is restricted to Creator level access. This proprietary algorithm coordinates 15M Range, 5M Sweep, 15M FVG, and 1M Trigger executions with a strict minimum 1:3.5 Risk-to-Reward ratio.
            </p>
          </div>

          {/* 6 Steps Preview */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-2 text-left">
            {steps.map(s => (
              <div key={s.num} className="p-2.5 rounded-xl bg-white/5 border border-white/10 space-y-1">
                <span className="text-[9px] text-purple-400 font-mono font-bold">Step {s.num} • {s.timeframe}</span>
                <p className="text-[11px] font-bold text-white/90 truncate">{s.title}</p>
              </div>
            ))}
          </div>

          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
            Current Tier: <span className="font-bold uppercase">{userProfile.tier}</span>. Please upgrade to Creator Tier or contact Admin for access.
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-card p-6 rounded-3xl border-purple-500/20">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-400 shadow-lg shadow-purple-500/20">
            <Cpu size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-display font-bold gold-gradient">Reversal AI Engine</h1>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold uppercase tracking-widest flex items-center gap-1">
                <Sparkles size={10} /> Creator Tier
              </span>
            </div>
            <p className="text-xs text-white/50">6-Step Multi-Timeframe Algorithmic Reversal Core (15M Range → 5M Sweep → 1M Entry, Min 1:3.5 RR)</p>
          </div>
        </div>

        {/* Pair Switcher & Scan Trigger */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedPair}
            onChange={(e) => setSelectedPair(e.target.value)}
            className="bg-black/60 border border-white/15 rounded-xl px-3 py-2.5 text-xs text-gold font-bold focus:border-gold outline-none cursor-pointer"
          >
            {['EUR/USD', 'GBP/USD', 'USD/JPY', 'XAU/USD', 'BTC/USD', 'Volatility 100', 'Crash 500', 'Boom 1000'].map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>

          <button
            onClick={handleExecuteScan}
            disabled={isScanning}
            className="gold-button px-6 py-2.5 flex items-center gap-2 cursor-pointer font-bold text-xs uppercase tracking-wider"
          >
            {isScanning ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
            {isScanning ? 'Scanning...' : 'Execute 6-Step Scan'}
          </button>
        </div>
      </header>

      {/* 6-Step Pipeline Visualizer */}
      <section className="space-y-3">
        <h2 className="text-sm font-bold text-white/70 uppercase tracking-wider flex items-center gap-2">
          <Layers size={16} className="text-purple-400" /> 6-Step Strategy Mechanics
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {steps.map((step) => {
            const isActive = activeStep === step.num;
            return (
              <div
                key={step.num}
                className={`p-4 rounded-2xl transition-all relative overflow-hidden border ${
                  isActive
                    ? 'bg-purple-500/20 border-purple-400 shadow-lg shadow-purple-500/20 scale-105'
                    : 'glass-card border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center ${
                    isActive ? 'bg-purple-500 text-white' : 'bg-white/10 text-white/60'
                  }`}>
                    {step.num}
                  </span>
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-black/40 text-gold border border-gold/20">
                    {step.timeframe}
                  </span>
                </div>
                <h3 className="text-xs font-bold text-white mb-1">{step.title}</h3>
                <p className="text-[10px] text-white/50 leading-relaxed">{step.description}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Analysis Output Output */}
      <section className="glass-card p-6 rounded-3xl border-white/10 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gold/10 border border-gold/30 flex items-center justify-center text-gold">
              <Brain size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Reversal AI Prophecy Output</h3>
              <p className="text-[10px] text-white/40 uppercase tracking-widest">Active Pair: {selectedPair}</p>
            </div>
          </div>

          {scanResult && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyToClipboard}
                className="p-2 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={handleSendTelegram}
                className="p-2 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-300 hover:bg-sky-500/30 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Send size={14} /> Telegram
              </button>
            </div>
          )}
        </div>

        {isScanning ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="animate-spin text-purple-400" size={36} />
            <p className="text-sm font-bold text-white/80">Reversal AI evaluating 15M Range & 1M Entry Triggers...</p>
            <p className="text-xs text-white/40">Step {activeStep || 1} of 6 processing...</p>
          </div>
        ) : scanResult ? (
          <div className="markdown-body text-sm leading-relaxed text-white/90">
            <Markdown>{scanResult}</Markdown>
          </div>
        ) : (
          <div className="py-16 text-center space-y-3 opacity-60">
            <Cpu size={40} className="mx-auto text-purple-400" />
            <p className="text-sm text-white/60">Click "Execute 6-Step Scan" to launch the Reversal AI Engine for {selectedPair}.</p>
          </div>
        )}
      </section>
    </div>
  );
}
