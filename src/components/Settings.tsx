import { useState } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { auth as firebaseAuth } from '../firebase';
import { dbService } from '../services/dbService';
import { UserProfile, AppTheme } from '../types';
import { Settings as SettingsIcon, Bell, Volume2, Mail, Shield, CreditCard, User, Zap, LogOut, Trash2, Palette, Moon, Sun, Sparkles, Key } from 'lucide-react';
import { motion } from 'motion/react';

interface SettingsProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const THEMES = [
  { id: 'cosmic', label: 'Cosmic Gold', color: 'bg-gold' },
  { id: 'solar', label: 'Solar Flare', color: 'bg-orange-500' },
  { id: 'lunar', label: 'Lunar Silver', color: 'bg-slate-400' },
  { id: 'void', label: 'The Void', color: 'bg-zinc-900' },
];

export default function Settings({ userProfile, addToast }: SettingsProps) {
  const [settings, setSettings] = useState(userProfile.notification_settings);
  const [saving, setSaving] = useState(false);
  const [activeTheme, setActiveTheme] = useState<AppTheme>(userProfile.theme || 'cosmic');

  const handleToggle = async (key: keyof UserProfile['notification_settings']) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    
    setSaving(true);
    try {
      await supabase
        .from('users')
        .update({
          notification_settings: newSettings
        })
        .eq('uid', userProfile.uid);
      
      addToast('Cosmic frequencies adjusted.', 'success');
    } catch (err) {
      await handleSupabaseError(err, OperationType.UPDATE, `users/${userProfile.uid}`);
      addToast('Failed to align settings.', 'error');
      // Rollback
      setSettings(settings);
    } finally {
      setSaving(false);
    }
  };

  const handleThemeChange = async (themeId: string) => {
    setActiveTheme(themeId as AppTheme);
    document.documentElement.setAttribute('data-theme', themeId);
    
    try {
      await supabase
        .from('users')
        .update({
          theme: themeId
        })
        .eq('uid', userProfile.uid);
      
      addToast(`Theme shifted to ${themeId}.`, 'success');
    } catch (err) {
      await handleSupabaseError(err, OperationType.UPDATE, `users/${userProfile.uid}`);
      addToast('Failed to save theme preference.', 'error');
    }
  };

  const handleSignOut = async () => {
    try {
      await firebaseAuth.signOut();
      addToast('Safely disconnected from the Oracle.', 'success');
      window.location.reload();
    } catch (err) {
      console.error(err);
      addToast('Failed to disconnect.', 'error');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">Oracle Settings</h1>
        <p className="text-white/40">Configure your cosmic connection and preferences.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-8">
          <section className="glass-card p-8 space-y-6">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Palette className="text-gold" size={20} /> Appearance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {THEMES.map((theme) => (
                <button 
                  key={theme.id}
                  onClick={() => handleThemeChange(theme.id)}
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-3 ${
                    activeTheme === theme.id ? 'border-gold bg-gold/5' : 'border-white/5 bg-white/5 hover:border-white/10'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-full ${theme.color} shadow-lg`} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/60">{theme.label}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="glass-card p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Bell className="text-gold" size={20} /> Notifications
              </h2>
              <button 
                onClick={() => addToast('The Oracle has whispered a test prophecy.', 'info')}
                className="text-[10px] font-bold uppercase tracking-widest text-gold hover:underline"
              >
                Test Whisper
              </button>
            </div>
            
            <div className="space-y-4">
              {[
                { id: 'new_signals', label: 'New Signal Alerts', description: 'Get notified when a new AI signal is generated.', icon: Zap },
                { id: 'signal_updates', label: 'Signal Updates', description: 'Receive alerts when TP or SL is hit.', icon: Bell },
                { id: 'sound', label: 'Sound Alerts', description: 'Play a cosmic chime for new signals.', icon: Volume2 },
                { id: 'email_digest', label: 'Email Digest', description: 'Daily summary of all generated signals.', icon: Mail },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5 hover:border-gold/20 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gold/10 flex items-center justify-center text-gold">
                      <item.icon size={20} />
                    </div>
                    <div>
                      <p className="font-bold">{item.label}</p>
                      <p className="text-xs text-white/40">{item.description}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleToggle(item.id as any)}
                    disabled={saving}
                    className={`w-12 h-6 rounded-full transition-all relative ${
                      settings[item.id as keyof typeof settings] ? 'bg-gold' : 'bg-white/10'
                    }`}
                  >
                    <motion.div 
                      animate={{ x: settings[item.id as keyof typeof settings] ? 24 : 4 }}
                      className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm"
                    />
                  </button>
                </div>
              ))}
            </div>
          </section>

          {/* PHASE 15 & 25: SECURITY ENGINE */}
          <section className="glass-card p-8 space-y-6">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Shield className="text-gold" size={20} /> Omni Security Engine
            </h2>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-bold flex items-center gap-2"><Key className="text-gold" size={14} /> Key Abuse Prevention</p>
                  <p className="text-xs text-white/40">Actively monitoring access tokens for IP displacement and multisession abuse.</p>
                </div>
                <div className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[10px] tracking-widest border border-emerald-500/20">
                    Active
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
                <div>
                  <p className="font-bold flex items-center gap-2"><Shield size={14} className="text-gold" /> Role Escalation Blocker</p>
                  <p className="text-xs text-white/40">Security engine strictly locks tier progression to Creator AP approval only.</p>
                </div>
                <div className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 font-bold uppercase text-[10px] tracking-widest border border-emerald-500/20">
                    Active
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card p-8 space-y-6">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Zap className="text-gold" size={20} /> Experimental Lab & Capital
            </h2>
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                <p className="font-bold">Demo Capital Management</p>
                <p className="text-xs text-white/40 leading-relaxed mb-4">Set your starting demo balance or process a simulated withdrawal. Default is $10 to test your psychological resilience in growing a small account.</p>
                <div className="flex gap-4">
                  <div className="flex-1 space-y-1">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">New Demo Balance ($)</label>
                    <input type="number" id="demoBalanceInput" defaultValue={userProfile.demo_balance} className="w-full cosmic-input bg-black/40" />
                  </div>
                  <button 
                    onClick={async () => {
                      const val = parseFloat((document.getElementById('demoBalanceInput') as HTMLInputElement).value);
                      if (val > 0) {
                        try {
                          await dbService.update('users', userProfile.uid, { demo_balance: val });
                          addToast(`Demo balance updated to $${val}`, 'success');
                        } catch (e) {
                          addToast('Failed to update balance', 'error');
                        }
                      }
                    }}
                    className="mt-5 px-6 gold-button flex items-center justify-center shrink-0"
                  >
                    Set Balance
                  </button>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/5 border border-white/5 space-y-3">
                <p className="font-bold">Simulated Withdrawal</p>
                <p className="text-[10px] text-white/40 uppercase tracking-widest">Withdraw profits from your demo account to test your mental strategy.</p>
                <div className="flex gap-4">
                  <input type="number" id="demoWithdrawInput" placeholder="Amount to withdraw" className="flex-1 cosmic-input bg-black/40" />
                  <button 
                    onClick={async () => {
                      const val = parseFloat((document.getElementById('demoWithdrawInput') as HTMLInputElement).value);
                      if (val > 0 && val <= (userProfile.demo_balance || 0)) {
                        try {
                          await dbService.update('users', userProfile.uid, { demo_balance: (userProfile.demo_balance || 0) - val });
                          addToast(`Successfully withdrew $${val} from Demo Account.`, 'success');
                        } catch (e) {
                          addToast('Failed to withdraw.', 'error');
                        }
                      } else {
                        addToast('Invalid amount or insufficient demo funds.', 'error');
                      }
                    }}
                    className="px-6 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold rounded-lg transition-all"
                  >
                    Withdraw
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section className="glass-card p-8 space-y-6">
            <h2 className="text-xl font-display font-bold flex items-center gap-2">
              <Zap className="text-gold" size={20} /> Broker Connections
            </h2>
            <div className="space-y-4">
              {[
                { name: 'Deriv', status: 'Connected', id: 'CR123456', icon: 'https://picsum.photos/seed/deriv/40/40' },
                { name: 'Exness', status: 'Disconnected', id: '-', icon: 'https://picsum.photos/seed/exness/40/40' },
                { name: 'IC Markets', status: 'Disconnected', id: '-', icon: 'https://picsum.photos/seed/icmarkets/40/40' },
              ].map((broker) => (
                <div key={broker.name} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between group hover:border-gold/20 transition-all">
                  <div className="flex items-center gap-4">
                    <img src={broker.icon} alt={broker.name} className="w-10 h-10 rounded-lg grayscale group-hover:grayscale-0 transition-all" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-bold">{broker.name}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                        {broker.status === 'Connected' ? `Account: ${broker.id}` : 'Not Connected'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => addToast(broker.status === 'Connected' ? `Disconnecting from ${broker.name}...` : `Connecting to ${broker.name}...`, 'info')}
                    className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                      broker.status === 'Connected' ? 'bg-red-400/10 text-red-400 border border-red-400/20' : 'bg-gold/10 text-gold border border-gold/20'
                    }`}
                  >
                    {broker.status === 'Connected' ? 'Disconnect' : 'Connect'}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="space-y-8">
          <section className="glass-card p-6 space-y-6 bg-gradient-to-b from-gold/10 to-transparent border-gold/20">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 rounded-full bg-gold/20 border-2 border-gold mx-auto flex items-center justify-center">
                <User className="text-gold" size={40} />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold">{userProfile.email.split('@')[0]}</h2>
                <p className="text-xs text-white/40">{userProfile.email}</p>
              </div>
              <div className="inline-block px-4 py-1 rounded-full bg-gold text-black text-[10px] font-bold uppercase tracking-widest">
                {userProfile.tier} Tier
              </div>
            </div>

            <div className="space-y-3 pt-4 border-t border-white/10">
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Member Since</span>
                <span className="font-bold">{new Date(userProfile.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-white/40">Total Signals</span>
                <span className="font-bold">124</span>
              </div>
            </div>

            <button 
              onClick={() => addToast('Subscription management is handled by PayFast.', 'info')}
              className="w-full gold-button flex items-center justify-center gap-2"
            >
              <CreditCard size={18} /> Manage Subscription
            </button>

            <button 
              onClick={handleSignOut}
              className="w-full py-3 rounded-xl border border-red-400/20 text-red-400 text-sm font-bold hover:bg-red-400/5 transition-all flex items-center justify-center gap-2"
            >
              <LogOut size={18} /> Sign Out
            </button>
          </section>

          <div className="glass-card p-6 space-y-4">
            <h3 className="font-display font-bold text-white/70">Danger Zone</h3>
            <p className="text-xs text-white/40 leading-relaxed">Permanently delete your account and all associated prophecies. This action is irreversible.</p>
            <button 
              onClick={() => addToast('Account deletion requires manual verification for security.', 'info')}
              className="w-full py-3 rounded-xl border border-red-400/20 text-red-400 text-xs font-bold hover:bg-red-400/5 transition-all flex items-center justify-center gap-2"
            >
              <Trash2 size={14} /> Delete Account
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
