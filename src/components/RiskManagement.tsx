import React, { useState } from 'react';
import { UserProfile } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { motion } from 'motion/react';
import { 
  Shield, 
  AlertTriangle, 
  Percent, 
  Layers, 
  Target, 
  Save,
  Info,
  Clock
} from 'lucide-react';

interface RiskManagementProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const RiskManagement: React.FC<RiskManagementProps> = ({ userProfile, addToast }) => {
  const [settings, setSettings] = useState(userProfile.risk_settings || {
    max_daily_loss: 5,
    max_open_positions: 3,
    risk_per_trade: 1,
    stop_loss_buffer: 5,
    max_daily_trades: 10,
    max_drawdown_limit: 15,
    trading_hours: {
      start: '08:00',
      end: '20:00',
      enabled: false
    }
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const userRef = doc(db, 'users', userProfile.uid);
      await updateDoc(userRef, {
        risk_settings: settings
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `users/${userProfile.uid}`));
      
      addToast('Risk Management Settings Updated!', 'success');
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="glass-card p-8 border-gold/20 bg-gold/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
          <Shield size={120} className="text-gold" />
        </div>
        
        <div className="relative z-10">
          <h2 className="text-2xl font-display font-bold gold-gradient flex items-center gap-3">
            <Shield className="text-gold" /> Sentinel Risk Suite
          </h2>
          <p className="text-white/40 mt-2 max-w-2xl">
            Configure the automated risk management system. Sentinel AI will enforce these limits to protect your capital from emotional trading and market volatility.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <AlertTriangle className="text-red-400" size={20} /> Loss Protection
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Max Daily Loss (%)</label>
                <span className="text-sm font-bold text-gold">{settings.max_daily_loss}%</span>
              </div>
              <input 
                type="range" 
                min="1" 
                max="10" 
                step="0.5"
                value={settings.max_daily_loss}
                onChange={(e) => setSettings({ ...settings, max_daily_loss: parseFloat(e.target.value) })}
                className="w-full accent-gold"
              />
              <p className="text-[10px] text-white/20 italic">
                The Oracle will stop generating signals if your daily drawdown exceeds this limit.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Risk Per Trade (%)</label>
                <span className="text-sm font-bold text-gold">{settings.risk_per_trade}%</span>
              </div>
              <input 
                type="range" 
                min="0.1" 
                max="5" 
                step="0.1"
                value={settings.risk_per_trade}
                onChange={(e) => setSettings({ ...settings, risk_per_trade: parseFloat(e.target.value) })}
                className="w-full accent-gold"
              />
              <p className="text-[10px] text-white/20 italic">
                Recommended risk is 1% per trade for sustainable growth.
              </p>
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-6">
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <Layers className="text-blue-400" size={20} /> Position Management
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Max Open Positions</label>
                <span className="text-sm font-bold text-gold">{settings.max_open_positions}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 5, 10].map((num) => (
                  <button
                    key={num}
                    onClick={() => setSettings({ ...settings, max_open_positions: num })}
                    className={`py-2 rounded-lg text-xs font-bold transition-all ${
                      settings.max_open_positions === num ? 'bg-gold text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Max Daily Trades</label>
                <span className="text-sm font-bold text-gold">{settings.max_daily_trades || 10}</span>
              </div>
              <input 
                type="number" 
                value={settings.max_daily_trades || 10}
                onChange={(e) => setSettings({ ...settings, max_daily_trades: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-gold/50 outline-none transition-all"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Stop Loss Buffer (Pips)</label>
                <span className="text-sm font-bold text-gold">{settings.stop_loss_buffer}</span>
              </div>
              <input 
                type="number" 
                value={settings.stop_loss_buffer}
                onChange={(e) => setSettings({ ...settings, stop_loss_buffer: parseInt(e.target.value) })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-gold/50 outline-none transition-all"
              />
            </div>
          </div>
        </div>

        <div className="glass-card p-6 space-y-6 md:col-span-2">
          <h3 className="text-lg font-display font-bold flex items-center gap-2">
            <Clock className="text-purple-400" size={20} /> Trading Hours (Session Control)
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Start Time</label>
              <input 
                type="time" 
                value={settings.trading_hours?.start || '08:00'}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  trading_hours: { ...settings.trading_hours!, start: e.target.value } 
                })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-gold/50 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs text-white/40 uppercase tracking-widest font-bold">End Time</label>
              <input 
                type="time" 
                value={settings.trading_hours?.end || '20:00'}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  trading_hours: { ...settings.trading_hours!, end: e.target.value } 
                })}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:border-gold/50 outline-none transition-all"
              />
            </div>
            <div className="flex items-center gap-3 p-3 bg-white/5 border border-white/10 rounded-xl">
              <input 
                type="checkbox" 
                checked={settings.trading_hours?.enabled || false}
                onChange={(e) => setSettings({ 
                  ...settings, 
                  trading_hours: { ...settings.trading_hours!, enabled: e.target.checked } 
                })}
                className="w-4 h-4 accent-gold"
              />
              <span className="text-sm font-bold text-white">Enable Session Control</span>
            </div>
          </div>
          <p className="text-[10px] text-white/20 italic">
            When enabled, the Oracle will only generate signals and execute trades during these hours.
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="gold-button flex items-center gap-2 px-8"
        >
          {saving ? (
            <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
          ) : (
            <Save size={18} />
          )}
          Save Risk Configuration
        </button>
      </div>

      <div className="p-6 rounded-2xl bg-blue-500/5 border border-blue-500/20 flex gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
          <Info size={24} />
        </div>
        <div className="space-y-1">
          <h4 className="font-bold text-blue-400">Why Risk Management Matters?</h4>
          <p className="text-xs text-white/60 leading-relaxed">
            Trading is a game of probabilities. Even the most accurate AI can have losing streaks. Proper risk management ensures that no single trade or single day can wipe out your account. By enforcing these limits, you are trading like an institution, not a gambler.
          </p>
        </div>
      </div>
    </div>
  );
};
