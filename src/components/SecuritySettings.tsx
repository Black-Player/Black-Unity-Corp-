import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, Key, Smartphone, LogOut, History, Globe, Lock, Eye, EyeOff, Check, X, Shield, Zap } from 'lucide-react';
import { UserProfile } from '../types';

interface SecuritySettingsProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function SecuritySettings({ userProfile, addToast }: SecuritySettingsProps) {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false);
  const [showSessions, setShowSessions] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [derivKeys, setDerivKeys] = useState([
    { id: '1', label: 'Main Account', key: 'eGYgMolJfh9pBQ4', active: true },
    { id: '2', label: 'Scalping Bot', key: '••••••••••••••••', active: false },
  ]);

  const sessions = [
    { id: '1', device: 'Chrome on macOS', location: 'Cape Town, ZA', lastActive: 'Active now', current: true },
    { id: '2', device: 'Safari on iPhone', location: 'Johannesburg, ZA', lastActive: '2 hours ago', current: false },
    { id: '3', device: 'Firefox on Windows', location: 'Lagos, NG', lastActive: 'Yesterday', current: false },
  ];

  const handleUpdatePassword = () => {
    if (!currentPassword || !newPassword) return;
    addToast('Password updated successfully.', 'success');
    setCurrentPassword('');
    setNewPassword('');
  };

  const toggle2FA = () => {
    setIs2FAEnabled(!is2FAEnabled);
    addToast(is2FAEnabled ? '2FA disabled.' : '2FA enabled successfully.', is2FAEnabled ? 'info' : 'success');
  };

  return (
    <div className="space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">Zion's Vault</h1>
        <p className="text-white/40">Enhanced security and privacy settings for your Oracle account.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="glass-card p-8 space-y-8 border-white/5">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <Globe className="text-gold" size={20} /> The Cosmic Bridge
            </h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Link multiple Deriv accounts to the Oracle network. You can switch between accounts for different strategies or automated execution.
            </p>
            <div className="space-y-4">
              {derivKeys.map((key) => (
                <div key={key.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${key.active ? 'bg-gold/10 text-gold' : 'bg-white/5 text-white/20'}`}>
                      <Zap size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold flex items-center gap-2">
                        {key.label}
                        {key.active && <span className="px-1.5 py-0.5 rounded bg-gold/10 text-gold text-[8px] font-bold uppercase tracking-widest">Active</span>}
                      </p>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold font-mono">{key.key}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {!key.active && (
                      <button 
                        onClick={() => {
                          setDerivKeys(derivKeys.map(k => ({ ...k, active: k.id === key.id })));
                          addToast(`Switched to ${key.label}`, 'success');
                        }}
                        className="p-2 text-white/20 hover:text-gold hover:bg-gold/10 rounded-lg transition-all"
                      >
                        <Check size={16} />
                      </button>
                    )}
                    <button className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button className="w-full py-4 border border-dashed border-white/10 hover:border-gold/40 hover:bg-gold/5 text-white/40 hover:text-gold text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
                <Zap size={14} /> Link New Deriv Account
              </button>
            </div>
          </div>

          <div className="glass-card p-8 space-y-8 border-white/5">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <Key className="text-gold" size={20} /> Update Password
            </h3>
            <div className="space-y-4 max-w-md">
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Current Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none"
                  />
                  <button 
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white transition-all"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">New Password</label>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none"
                />
              </div>
              <button 
                onClick={handleUpdatePassword}
                disabled={!currentPassword || !newPassword}
                className="gold-button px-8 py-3 flex items-center gap-2 disabled:opacity-50"
              >
                Update Password
              </button>
            </div>
          </div>

          <div className="glass-card p-8 space-y-8 border-white/5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-bold flex items-center gap-2">
                <Smartphone className="text-gold" size={20} /> Two-Factor Authentication
              </h3>
              <button 
                onClick={toggle2FA}
                className={`w-12 h-6 rounded-full transition-all relative ${is2FAEnabled ? 'bg-emerald-400' : 'bg-white/10'}`}
              >
                <motion.div 
                  animate={{ x: is2FAEnabled ? 24 : 4 }}
                  className="w-4 h-4 bg-white rounded-full absolute top-1"
                />
              </button>
            </div>
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gold/5 border border-gold/10">
              <ShieldCheck className="text-gold shrink-0" size={24} />
              <div className="space-y-1">
                <p className="text-sm font-bold">Recommended Security Measure</p>
                <p className="text-xs text-white/60 leading-relaxed">
                  Protect your account with an extra layer of security. We'll ask for a code whenever you sign in from a new device.
                </p>
              </div>
            </div>
          </div>

          <div className="glass-card p-8 space-y-8 border-white/5">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <History className="text-gold" size={20} /> Active Sessions
            </h3>
            <div className="space-y-4">
              {sessions.map((session) => (
                <div key={session.id} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/40">
                      <Globe size={20} />
                    </div>
                    <div>
                      <p className="text-sm font-bold flex items-center gap-2">
                        {session.device}
                        {session.current && <span className="px-1.5 py-0.5 rounded bg-emerald-400/10 text-emerald-400 text-[8px] font-bold uppercase tracking-widest">Current</span>}
                      </p>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{session.location} • {session.lastActive}</p>
                    </div>
                  </div>
                  {!session.current && (
                    <button className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all">
                      <LogOut size={16} />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button className="w-full py-3 bg-red-400/5 hover:bg-red-400/10 text-red-400 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2">
              <ShieldAlert size={14} /> Log Out All Other Sessions
            </button>
          </div>

          <div className="glass-card p-8 space-y-8 border-white/5">
            <h3 className="text-xl font-display font-bold flex items-center gap-2">
              <ShieldCheck className="text-gold" size={20} /> Trade Audit Vault
            </h3>
            <div className="space-y-4">
              {[
                { action: 'Trade Executed', asset: 'BTCUSD', time: '10 mins ago', status: 'Verified' },
                { action: 'Withdrawal Initiated', asset: '500 USDT', time: '2 hours ago', status: 'Pending' },
                { action: 'Strategy Modified', asset: 'Neo SMC', time: 'Yesterday', status: 'Verified' },
              ].map((log, i) => (
                <div key={i} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                      <Shield size={16} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{log.action}</p>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{log.asset} • {log.time}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                    log.status === 'Verified' ? 'bg-emerald-400/10 text-emerald-400' : 'bg-gold/10 text-gold'
                  }`}>
                    {log.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-8 space-y-8 border-gold/20 bg-gold/5">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-display font-bold flex items-center gap-2">
                <Lock className="text-gold" size={20} /> P2P Escrow Vault
              </h3>
              <button className="text-[10px] font-bold uppercase tracking-widest text-gold hover:underline">New Contract</button>
            </div>
            <p className="text-xs text-white/40 leading-relaxed">
              Secure your P2P trades with the Zion Escrow. Funds are held in the cosmic vault until both parties fulfill their ritual obligations.
            </p>
            <div className="space-y-4">
              {[
                { id: 'ESC-782', partner: 'Zulu Warrior', amount: '1,200 USDT', status: 'In Escrow' },
                { id: 'ESC-901', partner: 'Mansa Musa', amount: '5,000 USDT', status: 'Completed' },
              ].map((escrow) => (
                <div key={escrow.id} className="p-4 rounded-xl bg-black/40 border border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-white/40">
                      <Lock size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-bold">{escrow.partner}</p>
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">{escrow.id} • {escrow.amount}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-[8px] font-bold uppercase tracking-widest ${
                    escrow.status === 'In Escrow' ? 'bg-gold text-black' : 'bg-white/10 text-white/40'
                  }`}>
                    {escrow.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-8 bg-gold/5 border-gold/20 space-y-6">
            <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mx-auto border-2 border-gold/20">
              <Shield size={32} className="text-gold" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-display font-bold">Security Score</h3>
              <p className="text-3xl font-display font-bold text-gold">85%</p>
              <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                <div className="w-[85%] h-full bg-gold" />
              </div>
            </div>
            <div className="space-y-3 pt-4 border-t border-white/5">
              {[
                { label: 'Strong Password', status: true },
                { label: '2FA Enabled', status: is2FAEnabled },
                { label: 'Email Verified', status: true },
                { label: 'Recovery Email', status: false },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between text-[10px] uppercase tracking-widest font-bold">
                  <span className="text-white/40">{item.label}</span>
                  {item.status ? <Check size={12} className="text-emerald-400" /> : <X size={12} className="text-red-400" />}
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card p-8 space-y-4 border-white/5">
            <h3 className="text-lg font-display font-bold flex items-center gap-2 text-white/60">
              <Zap size={20} /> Privacy Mode
            </h3>
            <p className="text-xs text-white/40 leading-relaxed">
              Hide your profile from the Leaderboard and Cosmic Feed. Your data will remain private to you and the Oracles.
            </p>
            <button className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/40 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all">
              Enable Privacy Mode
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
