import { useState } from 'react';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, Zap, Shield, Target, Settings2, Play, Pause, Save, RefreshCw, Cpu, Activity, Info } from 'lucide-react';

export default function BotCustomizer({ userProfile, addToast }: { userProfile: UserProfile, addToast: (msg: string, type?: any) => void }) {
  const [botConfig, setBotConfig] = useState({
    name: 'Alpha Sentinel',
    riskLevel: 'moderate',
    assets: ['XAUUSD', 'BTCUSD'],
    strategy: 'Trend Following',
    isActive: false,
    maxDrawdown: 5,
    leverage: 10,
  });

  const handleSave = () => {
    addToast('Bot configuration uploaded to the Alchemist.', 'success');
  };

  const toggleBot = () => {
    setBotConfig(prev => ({ ...prev, isActive: !prev.isActive }));
    addToast(botConfig.isActive ? 'Sentinel deactivated.' : 'Sentinel initiated.', 'info');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">The Alchemist</h1>
          <p className="text-white/40">Forge and customize your autonomous AI trading sentinels.</p>
        </div>
        <button 
          onClick={toggleBot}
          className={`px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all ${
            botConfig.isActive ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 'gold-button'
          }`}
        >
          {botConfig.isActive ? <Pause size={18} /> : <Play size={18} />}
          {botConfig.isActive ? 'Deactivate Bot' : 'Initiate Bot'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <section className="glass-card p-8 space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                <Settings2 size={24} />
              </div>
              <h2 className="text-xl font-display font-bold">Core Configuration</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Sentinel Name</label>
                <input 
                  type="text"
                  value={botConfig.name}
                  onChange={e => setBotConfig(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full cosmic-input"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Primary Strategy</label>
                <select 
                  value={botConfig.strategy}
                  onChange={e => setBotConfig(prev => ({ ...prev, strategy: e.target.value }))}
                  className="w-full cosmic-input"
                >
                  <option>Trend Following</option>
                  <option>Mean Reversion</option>
                  <option>Breakout Hunter</option>
                  <option>Scalping Engine</option>
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Risk Profile</label>
              <div className="grid grid-cols-3 gap-4">
                {['conservative', 'moderate', 'aggressive'].map((level) => (
                  <button 
                    key={level}
                    onClick={() => setBotConfig(prev => ({ ...prev, riskLevel: level }))}
                    className={`p-4 rounded-xl border transition-all text-center ${
                      botConfig.riskLevel === level ? 'border-gold bg-gold/5 text-gold' : 'border-white/5 bg-white/5 text-white/40'
                    }`}
                  >
                    <p className="text-xs font-bold uppercase tracking-widest">{level}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <label className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Max Drawdown (%)</label>
                  <span className="text-gold font-bold">{botConfig.maxDrawdown}%</span>
                </div>
                <input 
                  type="range" min="1" max="20"
                  value={botConfig.maxDrawdown}
                  onChange={e => setBotConfig(prev => ({ ...prev, maxDrawdown: parseInt(e.target.value) }))}
                  className="w-full accent-gold"
                />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <label className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Leverage (x)</label>
                  <span className="text-gold font-bold">{botConfig.leverage}x</span>
                </div>
                <input 
                  type="range" min="1" max="100"
                  value={botConfig.leverage}
                  onChange={e => setBotConfig(prev => ({ ...prev, leverage: parseInt(e.target.value) }))}
                  className="w-full accent-gold"
                />
              </div>
            </div>

            <button onClick={handleSave} className="w-full py-4 rounded-xl border border-gold/20 text-gold font-bold hover:bg-gold/5 transition-all flex items-center justify-center gap-2">
              <Save size={18} /> Save Configuration
            </button>
          </section>
        </div>

        <div className="space-y-8">
          <section className="glass-card p-8 space-y-6">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Activity className="text-gold" size={20} /> Real-time Simulation
            </h3>
            <div className="p-6 rounded-2xl bg-black/40 border border-white/5 space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Expected Monthly ROI</span>
                <span className="text-emerald-400 font-bold">+12.4%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Win Rate Probability</span>
                <span className="text-gold font-bold">68.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-white/40">Sharpe Ratio</span>
                <span className="text-white font-bold">2.1</span>
              </div>
            </div>
            <div className="p-4 rounded-xl bg-gold/5 border border-gold/10 flex gap-3">
              <Info className="text-gold shrink-0" size={16} />
              <p className="text-[10px] text-gold/80 leading-relaxed">
                Simulated results are based on historical data and current market volatility. Actual performance may vary in the Mirror World.
              </p>
            </div>
          </section>

          <section className="glass-card p-8 space-y-6">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Cpu className="text-gold" size={20} /> Sentinel Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${botConfig.isActive ? 'bg-emerald-400 animate-pulse' : 'bg-red-400'}`} />
                  <span className="text-xs font-bold uppercase tracking-widest">Connectivity</span>
                </div>
                <span className="text-xs text-white/40">{botConfig.isActive ? 'Online' : 'Offline'}</span>
              </div>
              <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                <div className="flex items-center gap-3">
                  <RefreshCw className="text-white/20" size={16} />
                  <span className="text-xs font-bold uppercase tracking-widest">Last Sync</span>
                </div>
                <span className="text-xs text-white/40">Just now</span>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
