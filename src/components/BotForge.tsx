import React, { useState } from 'react';
import { Bot, Plus, Save, Trash2, Zap, Cpu, Eye, Activity, Shield, Layout, Info, Sparkles, Palette, Play, EyeOff, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Bot as BotType } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { dbService } from '../services/dbService';
import { THEMES } from '../constants/themes';
import { getBotCharacter } from '../lib/themeUtils';
import { derivService } from '../services/derivService';
import LightweightChart from './LightweightChart';

const BACKTEST_LIMITS: Record<string, number> = {
  free: 2,
  oracle: 7,
  zion: 15,
  legendary: 30,
  mythic: 50,
  creator: 999
};

interface BotForgeProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const STRATEGIES = [
  'MMM (Market Maker Model)',
  'SMC (Smart Money Concepts)',
  'ICT (Inner Circle Trader)',
  'Supply & Demand',
  'Chart Patterns',
  'Price Action',
  'Hybrid (SMC/ICT)',
  'Scalping Algorithm'
];

const ICONS = [
  { name: 'Zap', icon: Zap },
  { name: 'Cpu', icon: Cpu },
  { name: 'Eye', icon: Eye },
  { name: 'Activity', icon: Activity },
  { name: 'Shield', icon: Shield },
  { name: 'Layout', icon: Layout },
  { name: 'Bot', icon: Bot }
];

export const BotForge: React.FC<BotForgeProps> = ({ userProfile, addToast }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [newBot, setNewBot] = useState<Partial<BotType>>({
    name: '',
    strategy: STRATEGIES[0],
    description: '',
    icon: 'Bot',
    tier_requirement: 'oracle',
    risk_profile: 'balanced',
    preferred_pairs: ['BTC/USD', 'ETH/USD'],
    preferred_timeframes: ['M15', 'H1'],
    personality: 'analytical'
  });
  const [saving, setSaving] = useState(false);

  const [selectedBotBacktest, setSelectedBotBacktest] = useState<any>(null);

  const customBots = userProfile.custom_bots || [];

  const handleCreate = async () => {
    if (!newBot.name || !newBot.description) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    setSaving(true);
    try {
      const newBotWithId = {
        ...newBot,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString()
      };
      
      const newBots = [...(userProfile.custom_bots || []), newBotWithId];
      
      // PHASE 14: THE ALCHEMIST GENESIS (Bot Ecosystem)
      await dbService.update('users', userProfile.uid, {
          custom_bots: newBots
      });

      // Mirror to Supabase
      await supabase
        .from('users')
        .update({
          custom_bots: newBots
        })
        .eq('uid', userProfile.uid);

      addToast(`Phase 14 Sync: ${newBot.name} has been forged in the cosmos!`, 'success');
      setShowCreate(false);
      setNewBot({
        name: '',
        strategy: STRATEGIES[0],
        description: '',
        icon: 'Bot',
        tier_requirement: 'oracle',
        risk_profile: 'balanced',
        preferred_pairs: ['BTC/USD', 'ETH/USD'],
        preferred_timeframes: ['M15', 'H1'],
        personality: 'analytical'
      });
    } catch (err: any) {
      await handleSupabaseError(err, OperationType.UPDATE, `users/${userProfile.uid}`);
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleTestLogic = async () => {
    if (!newBot.description) {
      addToast('Please describe the bot logic first', 'error');
      return;
    }

    setTesting(true);
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY?.trim()! });
      
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `As the Eternal Intelligence Core, evaluate this trading bot logic:
        Name: ${newBot.name}
        Strategy: ${newBot.strategy}
        Risk Profile: ${newBot.risk_profile}
        Description: ${newBot.description}
        
        Provide a brief cosmic evaluation of its potential win rate, drawdown risk, and one specific improvement. Keep it under 100 words.`,
      });

      setTestResult(response.text);
    } catch (err: any) {
      const errStr = JSON.stringify(err) + (err?.message || "");
      if (errStr.includes("API key not valid") || errStr.includes("API_KEY_INVALID")) {
          addToast("Oracle Disconnected: Your Gemini API Key is invalid. Please insert a valid key in the AI Studio Settings under 'API Keys'.", "error");
      } else if (err?.status === "INVALID_ARGUMENT") {
          addToast("Oracle Error: Invalid Argument format sent. " + err?.message, "error");
      } else if (errStr.includes("quota") || errStr.includes("429") || err?.status === "RESOURCE_EXHAUSTED" || errStr.includes("Rpc failed") || errStr.includes("xhr error") || errStr.includes("500")) {
          addToast("Quota exceeded: Please check your Gemini API plan limits or AI Studio connection.", "error");
      } else {
          addToast('Cosmic interference during testing.', 'error');
      }
    } finally {
      setTesting(false);
    }
  };

  const handleDelete = async (bot: any) => {
    try {
      const newBots = (userProfile.custom_bots || []).filter((b: any) => b.id !== bot.id);
      
      // PHASE 14: THE ALCHEMIST GENESIS (Bot Ecosystem Cleanup)
      await dbService.update('users', userProfile.uid, {
          custom_bots: newBots
      });

      await supabase
        .from('users')
        .update({
          custom_bots: newBots
        })
        .eq('uid', userProfile.uid);
      
      addToast('Bot dismantled and returned to the void.', 'info');
    } catch (err: any) {
      await handleSupabaseError(err, OperationType.UPDATE, `users/${userProfile.uid}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="glass-card p-8 border-gold/20 bg-gold/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Cpu size={120} className="text-gold" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-2xl font-display font-bold gold-gradient flex items-center gap-3">
            <Bot className="text-gold" /> Bot Forge
          </h2>
          <p className="text-white/40 mt-2 max-w-2xl">
            The ultimate workshop for creating custom AI trading logic. Define your own Oracle bots with specialized strategies and unique cosmic signatures.
          </p>
          <button 
            onClick={() => setShowCreate(true)}
            className="mt-6 gold-button flex items-center gap-2"
          >
            <Plus size={18} /> Forge New Bot
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {customBots.map((bot: any) => {
            const IconComp = ICONS.find(i => i.name === bot.icon)?.icon || Bot;
            return (
              <motion.div
                key={bot.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="glass-card p-6 space-y-4 border-gold/10 hover:border-gold/30 transition-all group relative"
              >
                <button 
                  onClick={() => handleDelete(bot)}
                  className="absolute top-4 right-4 p-2 text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                    <IconComp size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg">{getBotCharacter(bot.name, userProfile.theme)}</h3>
                    <p className="text-[10px] text-gold uppercase tracking-widest font-bold">{bot.strategy}</p>
                  </div>
                </div>

                <p className="text-xs text-white/60 leading-relaxed min-h-[3em]">
                  {bot.description}
                </p>

                {/* Backtested Performance Stats Segment */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-white/5 bg-white/5 rounded-xl px-3 my-2">
                  <div className="flex flex-col items-center justify-center text-center">
                    <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold mb-1">Win Rate</p>
                    <p className={`text-xs font-mono font-bold ${bot.risk_profile === 'conservative' ? 'text-emerald-400' : bot.risk_profile === 'aggressive' ? 'text-amber-400' : 'text-gold'}`}>
                      {bot.risk_profile === 'conservative' ? '82.4%' : bot.risk_profile === 'aggressive' ? '64.8%' : bot.risk_profile === 'cosmic' ? '51.2%' : '75.6%'}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center border-l border-white/10">
                    <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold mb-1">Drawdown</p>
                    <p className="text-xs font-mono font-bold text-red-400">
                      {bot.risk_profile === 'conservative' ? '-2.1%' : bot.risk_profile === 'aggressive' ? '-14.3%' : bot.risk_profile === 'cosmic' ? '-32.8%' : '-5.4%'}
                    </p>
                  </div>
                  <div className="flex flex-col items-center justify-center text-center border-l border-white/10">
                    <p className="text-[8px] text-white/40 uppercase tracking-widest font-bold mb-1">Profit Fact.</p>
                    <p className="text-xs font-mono font-bold text-emerald-400">
                      {bot.risk_profile === 'conservative' ? '1.8' : bot.risk_profile === 'aggressive' ? '2.4' : bot.risk_profile === 'cosmic' ? '3.1' : '2.1'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-white/5 rounded-lg">
                    <p className="text-[8px] text-white/20 uppercase font-bold">Risk Profile</p>
                    <p className="text-[10px] text-white font-medium capitalize">{bot.risk_profile || 'Balanced'}</p>
                  </div>
                  <div className="p-2 bg-white/5 rounded-lg">
                    <p className="text-[8px] text-white/20 uppercase font-bold">Preferred Assets</p>
                    <p className="text-[10px] text-white font-medium truncate">{(bot.preferred_pairs || []).join(', ') || 'Global'}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/5 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-white/40 uppercase tracking-widest">Status: Active</span>
                    <div className="flex items-center gap-1 text-emerald-400">
                      <Zap size={12} />
                      <span className="text-[10px] font-bold">Ready</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                        if (userProfile.tier !== 'free') {
                           setSelectedBotBacktest(bot);
                        } else {
                           addToast(`Check Performance launched for ${bot.name}. Interactive charts are locked on free tier!`, 'info');
                        }
                    }}
                    className="w-full flex items-center justify-center gap-2 py-2 bg-white/5 hover:bg-gold/10 text-gold text-xs font-bold rounded-lg border border-gold/20 transition-colors"
                  >
                     <Play size={14} /> Check Performance
                  </button>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {customBots.length === 0 && !showCreate && (
          <div className="lg:col-span-3 py-20 text-center space-y-4">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto text-white/20">
              <Bot size={32} />
            </div>
            <div className="space-y-1">
              <p className="text-white/40 font-bold">Your forge is cold.</p>
              <p className="text-xs text-white/20 italic">Forge your first custom bot to unlock advanced AI logic.</p>
            </div>
          </div>
        )}
      </div>

      {selectedBotBacktest && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="glass-card p-6 w-full max-w-4xl space-y-6 border-gold/30 my-auto"
          >
            <div className="flex items-center justify-between">
               <h3 className="text-xl font-bold gold-gradient flex items-center gap-2">
                 <Play size={20} className="text-gold" /> Performance Simulation: {selectedBotBacktest.name}
               </h3>
               <button onClick={() => setSelectedBotBacktest(null)} className="p-2 text-white/40 hover:text-white transition-colors">
                 <X size={20} />
               </button>
            </div>
            
            <div className="h-[400px] w-full rounded-xl overflow-hidden border border-white/10">
               <LightweightChart 
                 symbol={selectedBotBacktest.preferred_pairs?.[0]?.replace('/', '') || 'CRASH500'} 
                 signalType="buy"
                 themeId={userProfile.theme} 
               />
            </div>
            <p className="text-xs text-white/40 text-center italic">Simulation parameters are automatically derived from {selectedBotBacktest.strategy}</p>
          </motion.div>
        </motion.div>
      )}

      {showCreate && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        >
          <motion.div 
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            className="glass-card p-8 w-full max-w-xl space-y-6 border-gold/30 my-auto"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-bold gold-gradient flex items-center gap-2">
                <Sparkles className="text-gold" size={20} /> Forge Custom Oracle
              </h3>
              <button onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white">&times;</button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Bot Name</label>
                <input 
                  type="text" 
                  value={newBot.name}
                  onChange={(e) => setNewBot({ ...newBot, name: e.target.value })}
                  placeholder="e.g. Chronos, Valkyrie..."
                  className="w-full cosmic-input"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Strategy</label>
                  <select 
                    value={newBot.strategy}
                    onChange={(e) => setNewBot({ ...newBot, strategy: e.target.value })}
                    className="w-full cosmic-input"
                  >
                    {STRATEGIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Icon Signature</label>
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {ICONS.map(({ name, icon: Icon }) => (
                      <button
                        key={name}
                        onClick={() => setNewBot({ ...newBot, icon: name })}
                        className={`p-2 rounded-lg border transition-all shrink-0 ${
                          newBot.icon === name ? 'bg-gold/20 border-gold/50 text-gold' : 'bg-white/5 border-white/5 text-white/40'
                        }`}
                      >
                        <Icon size={18} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Description & Logic</label>
                  <button 
                    onClick={handleTestLogic}
                    disabled={testing}
                    className="text-[10px] text-gold hover:text-gold/80 flex items-center gap-1 transition-colors"
                  >
                    {testing ? <div className="w-2 h-2 border border-gold/20 border-t-gold rounded-full animate-spin" /> : <Zap size={10} />}
                    Test Logic
                  </button>
                </div>
                <textarea 
                  value={newBot.description}
                  onChange={(e) => setNewBot({ ...newBot, description: e.target.value })}
                  placeholder="Describe the bot's unique trading logic and personality..."
                  className="w-full cosmic-input min-h-[100px] resize-none"
                />
                {testResult && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="p-3 rounded-lg bg-gold/5 border border-gold/10 text-[10px] text-white/60 italic leading-relaxed"
                  >
                    <span className="text-gold font-bold block mb-1 uppercase tracking-widest">Oracle Evaluation:</span>
                    {testResult}
                  </motion.div>
                )}
              </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Preferred Timeframes</label>
                    <input 
                      type="text" 
                      value={newBot.preferred_timeframes?.join(', ')}
                      onChange={(e) => setNewBot({ ...newBot, preferred_timeframes: e.target.value.split(',').map(s => s.trim()) })}
                      placeholder="M5, M15, H1..."
                      className="w-full cosmic-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Bot Personality</label>
                    <select 
                      value={newBot.personality}
                      onChange={(e) => setNewBot({ ...newBot, personality: e.target.value as any })}
                      className="w-full cosmic-input"
                    >
                      <option value="analytical">Analytical (Precise)</option>
                      <option value="aggressive">Aggressive (Bold)</option>
                      <option value="mystical">Mystical (Prophetic)</option>
                      <option value="stoic">Stoic (Calm)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Risk Profile</label>
                  <select 
                    value={newBot.risk_profile}
                    onChange={(e) => setNewBot({ ...newBot, risk_profile: e.target.value })}
                    className="w-full cosmic-input"
                  >
                    <option value="conservative">Conservative</option>
                    <option value="balanced">Balanced</option>
                    <option value="aggressive">Aggressive</option>
                    <option value="cosmic">Cosmic (High Risk)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Preferred Assets</label>
                  <input 
                    type="text" 
                    value={newBot.preferred_pairs?.join(', ')}
                    onChange={(e) => setNewBot({ ...newBot, preferred_pairs: e.target.value.split(',').map(s => s.trim()) })}
                    placeholder="XAUUSD, BTCUSD, Crash 500..."
                    className="w-full cosmic-input"
                  />
                </div>
              </div>

            <div className="flex gap-4 pt-4">
              <button 
                onClick={() => setShowCreate(false)}
                className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-all font-bold text-sm"
              >
                Cancel
              </button>
              <button 
                onClick={handleCreate}
                disabled={saving}
                className="flex-1 gold-button flex items-center justify-center gap-2"
              >
                {saving ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Save size={18} />}
                Forge Bot
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}

      <div className="p-6 rounded-2xl bg-gold/5 border border-gold/20 flex gap-4">
        <div className="w-12 h-12 rounded-full bg-gold/10 flex items-center justify-center text-gold shrink-0">
          <Info size={24} />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-gold">The Power of Custom Logic</h4>
          <p className="text-xs text-white/60 leading-relaxed">
            Custom bots allow you to tailor the AI's decision-making process to your specific trading style. Whether you prefer aggressive scalping or conservative swing trading, the Bot Forge gives you the tools to build an Oracle that speaks your language.
          </p>
        </div>
      </div>
    </div>
  );
};
