import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Zap, Shield, TrendingUp, Users, Search, Filter, Sparkles, MessageSquare, Lock, Unlock, Trophy, Target, FlaskConical, Settings, Sliders, Activity, Brain, Eye, EyeOff, Save, Trash2, AlertTriangle, Database, Globe, Server, Cpu, Layers } from 'lucide-react';
import { BOTS, UserProfile, TIER_BOT_LIMITS } from '../types';

export default function Alchemist({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [selectedBot, setSelectedBot] = useState(BOTS[0]);
  const [riskLevel, setRiskLevel] = useState(3);
  const [timeframe, setTimeframe] = useState('H1');
  const [preferredAssets, setPreferredAssets] = useState<string[]>(['EURUSD', 'GBPUSD']);
  const [neuralDepth, setNeuralDepth] = useState(75);
  const [sentimentWeight, setSentimentWeight] = useState(50);
  const [isSaving, setIsSaving] = useState(false);

  const assets = ['EURUSD', 'GBPUSD', 'XAUUSD', 'BTC', 'V75', 'V100', 'V10', 'V25', 'V50'];
  const timeframes = ['M1', 'M5', 'M15', 'M30', 'H1', 'H4', 'D1'];

  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      addToast(`${selectedBot.name} has been recalibrated in the Alchemist's Forge.`, 'success');
    }, 1500);
  };

  const toggleAsset = (asset: string) => {
    if (preferredAssets.includes(asset)) {
      setPreferredAssets(prev => prev.filter(a => a !== asset));
    } else {
      setPreferredAssets(prev => [...prev, asset]);
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient flex items-center gap-3">
            <FlaskConical className="text-gold" size={32} /> The Alchemist
          </h1>
          <p className="text-white/40">Tune and recalibrate your AI Oracles for maximum cosmic alignment.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="gold-button px-8 py-3 flex items-center gap-2 shadow-lg shadow-gold/20"
        >
          {isSaving ? <Zap className="animate-spin" size={18} /> : <Save size={18} />}
          {isSaving ? 'Recalibrating...' : 'Save Configuration'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="glass-card p-6 space-y-6 border-white/5">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Bot className="text-gold" size={20} /> Select Oracle
            </h3>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 scrollbar-hide">
              {BOTS.filter((_, i) => i < TIER_BOT_LIMITS[userProfile.tier]).map((bot) => (
                <button
                  key={bot.name}
                  onClick={() => setSelectedBot(bot)}
                  className={`w-full flex items-center gap-4 p-4 rounded-xl border transition-all ${
                    selectedBot.name === bot.name 
                      ? 'bg-gold/10 border-gold/50 text-gold' 
                      : 'bg-white/5 border-white/5 text-white/60 hover:bg-white/10'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selectedBot.name === bot.name ? 'bg-gold text-black' : 'bg-white/10'}`}>
                    <Bot size={20} />
                  </div>
                  <div className="text-left overflow-hidden">
                    <p className="text-sm font-bold truncate">{bot.name}</p>
                    <p className="text-[10px] opacity-60 uppercase tracking-widest truncate">{bot.strategy}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="glass-card p-6 bg-gold/5 border-gold/20 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Sparkles className="text-gold" size={20} /> Oracle Synergy
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Tuning your Oracle allows it to focus its neural energy on specific assets and timeframes, increasing accuracy but potentially reducing signal frequency.
            </p>
            <div className="pt-4 border-t border-white/5 space-y-3">
              <div className="flex justify-between items-center text-[10px] uppercase tracking-widest font-bold">
                <span className="text-white/40">Neural Depth</span>
                <span className="text-gold">{neuralDepth}%</span>
              </div>
              <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                <div className="h-full bg-gold" style={{ width: `${neuralDepth}%` }} />
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-8 border-white/5 space-y-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gold/10 border-2 border-gold/30 flex items-center justify-center text-gold">
                  <Cpu size={32} />
                </div>
                <div>
                  <h2 className="text-2xl font-display font-bold">{selectedBot.name} Calibration</h2>
                  <p className="text-sm text-white/40 uppercase tracking-widest font-bold">Neural Link: Active</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-400/10 border border-emerald-400/20 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                <Activity size={14} /> Optimal Alignment
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                      <Zap size={14} className="text-gold" /> Risk Appetite
                    </label>
                    <span className="text-gold font-mono text-xs">{riskLevel}/5</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="5" 
                    value={riskLevel}
                    onChange={(e) => setRiskLevel(parseInt(e.target.value))}
                    className="w-full accent-gold bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-[8px] text-white/20 font-bold uppercase tracking-widest">
                    <span>Conservative</span>
                    <span>Aggressive</span>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                      <Brain size={14} className="text-gold" /> Neural Depth
                    </label>
                    <span className="text-gold font-mono text-xs">{neuralDepth}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="100" 
                    value={neuralDepth}
                    onChange={(e) => setNeuralDepth(parseInt(e.target.value))}
                    className="w-full accent-gold bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer"
                  />
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                      <Layers size={14} className="text-gold" /> Sentiment Weight
                    </label>
                    <span className="text-gold font-mono text-xs">{sentimentWeight}%</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="100" 
                    value={sentimentWeight}
                    onChange={(e) => setSentimentWeight(parseInt(e.target.value))}
                    className="w-full accent-gold bg-white/5 h-1.5 rounded-full appearance-none cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                    <Target size={14} className="text-gold" /> Preferred Assets
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {assets.map(asset => (
                      <button
                        key={asset}
                        onClick={() => toggleAsset(asset)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                          preferredAssets.includes(asset)
                            ? 'bg-gold text-black border-gold'
                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                        }`}
                      >
                        {asset}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-xs font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
                    <Sliders size={14} className="text-gold" /> Master Timeframe
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {timeframes.map(tf => (
                      <button
                        key={tf}
                        onClick={() => setTimeframe(tf)}
                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all border ${
                          timeframe === tf
                            ? 'bg-gold text-black border-gold'
                            : 'bg-white/5 border-white/10 text-white/40 hover:border-white/20'
                        }`}
                      >
                        {tf}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-white/5 grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-gold">
                  <Shield size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Safety Protocol</span>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed">Auto-disable on 5% daily drawdown enabled.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-gold">
                  <Zap size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Execution Mode</span>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed">Aggressive entry with trailing stop-loss.</p>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-gold">
                  <Globe size={16} />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Data Source</span>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed">Multi-exchange dark pool liquidity feed.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
