import { useState } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { auth as firebaseAuth } from '../firebase';
import { dbService } from '../services/dbService';
import { 
  sendWeeklySummaryToTelegram,
  sendMonthlyOracleIntroduction,
  sendDailyMorningBrief,
  sendSimulatedCommandResponse
} from '../services/communicationService';
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
  const [integrations, setIntegrations] = useState({
    deriv_api_token: '',
    telegram_bot_token: '',
    telegram_chat_id: '',
    notification_email: userProfile.email || '',
    meta_api_token: '',
    meta_api_account_id: '',
    telegram_automation_enabled: true,
    telegram_cmd_status: '/status',
    telegram_cmd_balance: '/balance',
    telegram_cmd_market: '/market',
    telegram_cmd_education: '/education',
    ...(userProfile.integrations || {})
  });
  const [saving, setSaving] = useState(false);
  const [activeTheme, setActiveTheme] = useState<AppTheme>(userProfile.theme || 'cosmic');

  const handleSaveIntegrations = async () => {
    setSaving(true);
    try {
      await dbService.update('users', userProfile.uid, { integrations });
      addToast('Integrations synchronized successfully.', 'success');
    } catch (err) {
      addToast('Failed to align integrations.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleTestTelegram = async () => {
    if (!integrations.telegram_bot_token || !integrations.telegram_chat_id) {
      addToast('Please save your Telegram Token and Chat ID first.', 'error');
      return;
    }
    
    // Calculate dynamic session based on current hour
    const hour = new Date().getUTCHours();
    let currentSession = 'London Session';
    if (hour >= 8 && hour < 17) currentSession = 'London Session';
    else if (hour >= 13 && hour < 22) currentSession = 'New York Session';
    else if (hour >= 0 && hour < 9) currentSession = 'Tokyo Session';
    else if (hour >= 22 || hour < 7) currentSession = 'Sydney Session';
    else currentSession = 'Synthetics/Crypto Session';

    const localTimeStr = new Date().toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const testSignalMsg = `🚀 **BLĀCK-PLĀYER SYSTEM TEST SIGNAL** (Real-Time Verification)
━━━━━━━━━━━━━━━━━━━━
🎯 **Verified At:** ${localTimeStr}
● **Market:** Forex Majors
● **Asset:** EUR USD
● **Session:** ${currentSession}
● **Timeframe:** H1
● **Direction:** BUY (SMC Reversal Zone)
━━━━━━━━━━━━━━━━━━━━
📊 **Target Parameters:**
• **Entry Zone:** 1.08450
• **Stop Loss:** 1.08250 (Risk: 20 pips)
• **Take Profit 1:** 1.08850 (1:2 Risk-Reward)
• **Take Profit 2:** 1.09250 (1:4 Risk-Reward)
• **Take Profit 3:** 1.09650 (1:6 Risk-Reward)
• **Confidence Score:** 94.5% (High Confluence)
━━━━━━━━━━━━━━━━━━━━
🧠 **Real-Time Market Confluences:**
• **Liquidity Sweeps:** Sell-side liquidity pool successfully swept at Asian Session lows.
• **Order Flow:** Bullish market structure shift (MSS) confirmed on the 15-minute timeframe.
• **Oracle Sentiment:** 78% Bullish institutional accumulation.

⚠️ *This is a real-time validation broadcast. Please verify that your integration is active.*`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(`https://api.telegram.org/bot${integrations.telegram_bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: integrations.telegram_chat_id,
          text: testSignalMsg,
          parse_mode: 'Markdown'
        }),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      
      if (res.ok) {
        addToast('Real-time test signal sent to Telegram!', 'success');
      } else {
        addToast('Telegram API Error. Check Token & Chat ID.', 'error');
      }
    } catch(err) {
      addToast('Failed to connect to Telegram or connection timed out.', 'error');
    }
  };

  const [broadcastingWeekly, setBroadcastingWeekly] = useState(false);
  const [broadcastingMonthly, setBroadcastingMonthly] = useState(false);
  const [broadcastingMorning, setBroadcastingMorning] = useState(false);
  const [simulatingCommand, setSimulatingCommand] = useState(false);
  const [selectedSimCmd, setSelectedSimCmd] = useState('/status');
  const [simResponseLog, setSimResponseLog] = useState('');

  const handleBroadcastMonthly = async () => {
    if (!integrations.telegram_bot_token || !integrations.telegram_chat_id) {
      addToast('Please save your Telegram Token and Chat ID first.', 'error');
      return;
    }
    setBroadcastingMonthly(true);
    try {
      const success = await sendMonthlyOracleIntroduction(integrations);
      if (success) {
        addToast('Monthly Oracle Introduction and Evolution Report published to Telegram!', 'success');
      } else {
        addToast('Failed to publish monthly introduction. Check Telegram settings.', 'error');
      }
    } catch (e) {
      addToast('Error broadcasting monthly introduction.', 'error');
    } finally {
      setBroadcastingMonthly(false);
    }
  };

  const handleBroadcastMorning = async () => {
    if (!integrations.telegram_bot_token || !integrations.telegram_chat_id) {
      addToast('Please save your Telegram Token and Chat ID first.', 'error');
      return;
    }
    setBroadcastingMorning(true);
    try {
      const success = await sendDailyMorningBrief(integrations);
      if (success) {
        addToast('Morning Brief (07:00 SAST) dispatched to Telegram!', 'success');
      } else {
        addToast('Failed to dispatch Morning Brief. Check Telegram settings.', 'error');
      }
    } catch (e) {
      addToast('Error broadcasting morning brief.', 'error');
    } finally {
      setBroadcastingMorning(false);
    }
  };

  const handleSimulateCommand = async (cmd: string) => {
    if (!integrations.telegram_bot_token || !integrations.telegram_chat_id) {
      addToast('Please save your Telegram Token and Chat ID first.', 'error');
      return;
    }
    setSimulatingCommand(true);
    setSimResponseLog('Invoking Telegram bot core...');
    try {
      const res = await sendSimulatedCommandResponse(cmd, integrations);
      if (res.success) {
        addToast(`Simulated command ${cmd} response sent to Telegram!`, 'success');
        setSimResponseLog(`[SUCCESS] Bot dispatched response to Group ID ${integrations.telegram_chat_id}:\n\n${res.text}`);
      } else {
        addToast(`Simulation failed: ${res.text}`, 'error');
        setSimResponseLog(`[FAILURE] Telegram API rejected request:\n${res.text}`);
      }
    } catch (e: any) {
      addToast('Error simulating bot command.', 'error');
      setSimResponseLog(`[ERROR] Server or Network error:\n${e.message}`);
    } finally {
      setSimulatingCommand(false);
    }
  };

  const handleBroadcastWeekly = async () => {
    if (!integrations.telegram_bot_token || !integrations.telegram_chat_id) {
      addToast('Please save your Telegram Token and Chat ID first.', 'error');
      return;
    }
    setBroadcastingWeekly(true);
    try {
      const success = await sendWeeklySummaryToTelegram(integrations);
      if (success) {
        addToast('Weekly Performance Summary broadcasted to Telegram!', 'success');
      } else {
        addToast('Failed to broadcast weekly summary. Check Telegram configurations.', 'error');
      }
    } catch (e) {
      addToast('Error broadcasting weekly summary.', 'error');
    } finally {
      setBroadcastingWeekly(false);
    }
  };

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

          <section className="glass-card p-8 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-display font-bold flex items-center gap-2">
                <Zap className="text-gold" size={20} /> Broker & Notifications API
              </h2>
              <button 
                onClick={handleSaveIntegrations}
                disabled={saving}
                className="px-4 py-2 bg-gold text-black font-bold rounded-lg text-xs tracking-widest hover:bg-gold/80 transition-all"
              >
                {saving ? 'Syncing...' : 'Save Keys'}
              </button>
            </div>
            <p className="text-sm text-white/60">Connect MetaAPI for automated executions (Deriv/Exness/HFM) and Telegram for remote Oracle whispers.</p>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Deriv API Token</label>
                <input 
                  type="password" 
                  value={integrations.deriv_api_token || ''}
                  onChange={(e) => setIntegrations({...integrations, deriv_api_token: e.target.value})}
                  placeholder="e.g. pat_165192ec637f5... or other Deriv token" 
                  className="w-full cosmic-input bg-black/40 border border-gold/20 focus:border-gold/60 text-gold" 
                />
                <p className="text-[10px] text-white/40 leading-relaxed">
                  Provide your Deriv Personal Access Token or Developer API Key to authorize and stream authentic market data.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Telegram Bot Token</label>
                <input 
                  type="password" 
                  value={integrations.telegram_bot_token}
                  onChange={(e) => setIntegrations({...integrations, telegram_bot_token: e.target.value})}
                  placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11" 
                  className="w-full cosmic-input bg-black/40" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Telegram Chat ID</label>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    value={integrations.telegram_chat_id}
                    onChange={(e) => setIntegrations({...integrations, telegram_chat_id: e.target.value})}
                    placeholder="Your personal or group chat ID" 
                    className="w-full cosmic-input bg-black/40" 
                  />
                  <button onClick={handleTestTelegram} className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-bold hover:bg-white/10 transition-all whitespace-nowrap">
                    Test Whisper
                  </button>
                </div>
              </div>

              {/* BUC Telegram Automation Hub & Oracle Protocol Console */}
              <div className="pt-4 mt-2 border-t border-white/5 space-y-4">
                <div className="bg-gold/5 border border-gold/20 rounded-xl p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded bg-gold/10 text-gold text-lg">🦁</span>
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-gold">BUC Telegram Oracle Protocol</h4>
                        <p className="text-[11px] text-white/50">Configure triggers, automated routines, and remote commands.</p>
                      </div>
                    </div>
                    
                    {/* Creator Control Toggle */}
                    <div className="flex items-center gap-2 bg-black/40 px-3 py-1.5 rounded-lg border border-white/5">
                      <span className="text-[10px] uppercase font-bold text-white/40">Automation Link:</span>
                      <button
                        onClick={() => setIntegrations({
                          ...integrations,
                          telegram_automation_enabled: !integrations.telegram_automation_enabled
                        })}
                        className={`text-[10px] font-bold px-2 py-0.5 rounded transition-all uppercase ${
                          integrations.telegram_automation_enabled 
                            ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" 
                            : "bg-red-500/20 text-red-400 border border-red-500/30"
                        }`}
                      >
                        {integrations.telegram_automation_enabled ? "Active (True)" : "Paused (False)"}
                      </button>
                    </div>
                  </div>

                  {!integrations.telegram_automation_enabled && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-[11px] text-red-400">
                      ⚠️ <strong>Creator Override Lock:</strong> Since automation is <strong>False</strong>, all automatic posts, signals, and scheduled messages are paused. The bot will only respond to manual commands.
                    </div>
                  )}

                  {/* Configurable Bot Trigger Commands */}
                  <div className="pt-2 space-y-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gold block">
                      ⚙️ Configurable Bot Trigger Commands
                    </span>
                    <p className="text-[11px] text-white/40 -mt-1">Define custom triggers that users can execute directly in your group to consult the Oracle.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-white/40">Status Command</label>
                        <input
                          type="text"
                          value={integrations.telegram_cmd_status}
                          onChange={(e) => setIntegrations({...integrations, telegram_cmd_status: e.target.value})}
                          placeholder="/status"
                          className="w-full text-xs py-1.5 px-3 rounded bg-black/40 border border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-white/40">Balance Command</label>
                        <input
                          type="text"
                          value={integrations.telegram_cmd_balance}
                          onChange={(e) => setIntegrations({...integrations, telegram_cmd_balance: e.target.value})}
                          placeholder="/balance"
                          className="w-full text-xs py-1.5 px-3 rounded bg-black/40 border border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-white/40">Market Sentiment Command</label>
                        <input
                          type="text"
                          value={integrations.telegram_cmd_market}
                          onChange={(e) => setIntegrations({...integrations, telegram_cmd_market: e.target.value})}
                          placeholder="/market"
                          className="w-full text-xs py-1.5 px-3 rounded bg-black/40 border border-white/10 text-white"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase font-bold text-white/40">Education Nuggets Command</label>
                        <input
                          type="text"
                          value={integrations.telegram_cmd_education}
                          onChange={(e) => setIntegrations({...integrations, telegram_cmd_education: e.target.value})}
                          placeholder="/education"
                          className="w-full text-xs py-1.5 px-3 rounded bg-black/40 border border-white/10 text-white"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Copy Commands List Card */}
                  <div className="bg-black/40 border border-white/5 rounded-xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/60">
                        📋 Compiled Telegram Command Settings
                      </span>
                      <button
                        onClick={() => {
                          const listText = `Available Bot Commands:\n${integrations.telegram_cmd_status || '/status'} - Check Oracle status & automation state\n${integrations.telegram_cmd_balance || '/balance'} - Query current demo and real capital balances\n${integrations.telegram_cmd_market || '/market'} - View live market sentiment and confluences\n${integrations.telegram_cmd_education || '/education'} - Fetch professional SMC/ICT trading education nuggets`;
                          navigator.clipboard.writeText(listText);
                          addToast('Commands copied to clipboard!', 'success');
                        }}
                        className="text-[10px] font-bold text-gold hover:underline uppercase tracking-widest"
                      >
                        Copy Command List
                      </button>
                    </div>
                    <div className="text-[11px] font-mono text-white/50 bg-black/20 p-2.5 rounded border border-white/5 space-y-1 select-all">
                      <div>{integrations.telegram_cmd_status || '/status'} - Oracle System Pulse & Automation Info</div>
                      <div>{integrations.telegram_cmd_balance || '/balance'} - System Simulated Capital & Balances</div>
                      <div>{integrations.telegram_cmd_market || '/market'} - Live Institutional Market Sentiment</div>
                      <div>{integrations.telegram_cmd_education || '/education'} - SMC/ICT Strategic Trading Nuggets</div>
                    </div>
                  </div>

                  {/* Manual Automation Dispatchers */}
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-gold block">
                      🚀 Manual Automation Overrides & Scheduled Dispatchers
                    </span>
                    <p className="text-[11px] text-white/40 -mt-1">Instantly trigger the official Blāck-Plāyer RSA scheduled reports to your connected group on-demand.</p>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2 pt-1">
                      <button
                        onClick={handleBroadcastWeekly}
                        disabled={broadcastingWeekly}
                        className="py-2.5 px-2 bg-gold/10 hover:bg-gold/20 border border-gold/20 rounded-lg text-gold text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {broadcastingWeekly ? (
                          <>
                            <span className="w-3 h-3 border border-gold border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <span>📊</span> Friday Weekly Summary
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleBroadcastMonthly}
                        disabled={broadcastingMonthly}
                        className="py-2.5 px-2 bg-gold/10 hover:bg-gold/20 border border-gold/20 rounded-lg text-gold text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {broadcastingMonthly ? (
                          <>
                            <span className="w-3 h-3 border border-gold border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <span>🌟</span> Monthly Intro & Report
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleBroadcastMorning}
                        disabled={broadcastingMorning}
                        className="py-2.5 px-2 bg-gold/10 hover:bg-gold/20 border border-gold/20 rounded-lg text-gold text-[10px] font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {broadcastingMorning ? (
                          <>
                            <span className="w-3 h-3 border border-gold border-t-transparent rounded-full animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <span>☀️</span> Daily Morning Brief
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Interactive Command Simulation Console */}
                  <div className="pt-3 border-t border-white/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-gold block">
                        🔮 Oracle Command Simulation Console
                      </span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-white/50">
                        Interactive Live Test
                      </span>
                    </div>
                    <p className="text-[11px] text-white/40 -mt-2">Simulate a remote subscriber sending a command to your group. This triggers the real bot output on Telegram instantly!</p>
                    
                    <div className="flex gap-2">
                      <select
                        value={selectedSimCmd}
                        onChange={(e) => setSelectedSimCmd(e.target.value)}
                        className="flex-1 text-xs py-2 px-3 rounded bg-black/40 border border-white/10 text-white focus:outline-none focus:border-gold"
                      >
                        <option value={integrations.telegram_cmd_status}>Status ({integrations.telegram_cmd_status})</option>
                        <option value={integrations.telegram_cmd_balance}>Balance ({integrations.telegram_cmd_balance})</option>
                        <option value={integrations.telegram_cmd_market}>Market Sentiment ({integrations.telegram_cmd_market})</option>
                        <option value={integrations.telegram_cmd_education}>Education Nugget ({integrations.telegram_cmd_education})</option>
                      </select>
                      
                      <button
                        onClick={() => handleSimulateCommand(selectedSimCmd)}
                        disabled={simulatingCommand}
                        className="px-4 py-2 bg-gold text-black font-bold text-xs rounded-lg hover:bg-gold/80 transition-all cursor-pointer whitespace-nowrap flex items-center gap-1"
                      >
                        {simulatingCommand ? (
                          <>
                            <span className="w-3 h-3 border-2 border-black border-t-transparent rounded-full animate-spin" />
                            Simulating...
                          </>
                        ) : (
                          <>
                            <span>⚡</span> Simulate Trigger
                          </>
                        )}
                      </button>
                    </div>

                    {simResponseLog && (
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase font-bold text-white/40 block">Simulation Console Output Log</span>
                        <pre className="text-[10px] font-mono text-emerald-400 bg-black/50 p-3 rounded-lg border border-white/5 overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed">
                          {simResponseLog}
                        </pre>
                      </div>
                    )}
                  </div>

                  {/* Creator Insights */}
                  <div className="pt-2 mt-2 border-t border-white/5 space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-gold flex items-center gap-1">
                      <span>💡</span> Helpful Bot Creator Features (Tips & Suggestions)
                    </span>
                    <ul className="text-[11px] text-white/60 space-y-1 list-disc pl-4">
                      <li><strong>Subscriber Access Control:</strong> Build a payment authorization checker to instantly manage subscriber groups.</li>
                      <li><strong>Interactive Sentiment Polls:</strong> Schedule automated community polls to increase subscriber interaction.</li>
                      <li><strong>Volatility Pulse Notifications:</strong> Instantly notify users of upcoming critical CPI/news spikes.</li>
                      <li><strong>Trade Integration Webhooks:</strong> Broadcast trades to MT4/MT5 accounts for automatic copies.</li>
                    </ul>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-white/5 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">MetaAPI Token (MT4/MT5)</label>
                <input 
                  type="password" 
                  value={integrations.meta_api_token}
                  onChange={(e) => setIntegrations({...integrations, meta_api_token: e.target.value})}
                  placeholder="Retrieve from metaapi.cloud" 
                  className="w-full cosmic-input bg-black/40" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">MetaAPI Account ID</label>
                <input 
                  type="text" 
                  value={integrations.meta_api_account_id}
                  onChange={(e) => setIntegrations({...integrations, meta_api_account_id: e.target.value})}
                  placeholder="e.g. 1029384756" 
                  className="w-full cosmic-input bg-black/40" 
                />
              </div>

              <div className="pt-4 border-t border-white/5 space-y-2">
                <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Notification Email (Fallback)</label>
                <input 
                  type="email" 
                  value={integrations.notification_email}
                  onChange={(e) => setIntegrations({...integrations, notification_email: e.target.value})}
                  placeholder="email@example.com" 
                  className="w-full cosmic-input bg-black/40" 
                />
              </div>
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
                { 
                  name: 'Deriv', 
                  status: integrations.deriv_api_token ? 'Connected' : 'Disconnected', 
                  id: integrations.deriv_api_token ? (integrations.deriv_api_token.length > 12 ? `${integrations.deriv_api_token.slice(0, 8)}...` : 'Authorized') : '-', 
                  icon: 'https://picsum.photos/seed/deriv/40/40' 
                },
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

          <div className="glass-card p-6 space-y-4 border border-gold/30 bg-gold/5">
            <h3 className="font-display font-bold text-gold flex items-center gap-2">
              <Sparkles size={16} /> Developer Portal
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Toggle your access permissions to unlock Admin panels, the **Telegram Center**, and **Diagnostics** for testing.
            </p>
            <div className="space-y-2">
              <button 
                onClick={async () => {
                  try {
                    const isCurrentlyCreator = userProfile.role === 'creator' && userProfile.tier === 'creator';
                    const newRole = isCurrentlyCreator ? 'subscriber' : 'creator';
                    const newTier = isCurrentlyCreator ? 'free' : 'creator';
                    
                    if (!isCurrentlyCreator) {
                      localStorage.setItem('dev_mode_enabled', 'true');
                    } else {
                      localStorage.removeItem('dev_mode_enabled');
                    }
                    
                    await dbService.update('users', userProfile.uid, { 
                      role: newRole, 
                      tier: newTier 
                    });
                    
                    addToast(`Role upgraded to ${newRole.toUpperCase()}! Synchronizing live access...`, 'success');
                    setTimeout(() => {
                      window.location.reload();
                    }, 1000);
                  } catch (e: any) {
                    addToast(`Failed to toggle developer role: ${e.message}`, 'error');
                  }
                }}
                className="w-full py-2.5 rounded-xl bg-gold text-black text-xs font-bold hover:bg-gold/80 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {userProfile.role === 'creator' ? 'Deactivate Creator Mode' : 'Activate Creator Mode'}
              </button>
              <p className="text-[10px] text-white/40 text-center">
                Current Role: <span className="font-mono text-gold">{userProfile.role}</span> | Tier: <span className="font-mono text-gold">{userProfile.tier}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
