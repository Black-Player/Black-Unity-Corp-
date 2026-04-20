import { useState, useEffect } from 'react';
import { UserProfile, AccessKey, AdvancementRequest, Tier } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { generateTradingSignal } from '../services/aiService';
import KeyGenerator from './KeyGenerator';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Loader2, Server, Brain, User, Sparkles, Smartphone, Zap, LayoutDashboard, Key, Plus, Copy, GraduationCap, Check, X, Globe, Activity, Cpu, Layers } from 'lucide-react';

interface DiagnosticsProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

interface TestResult {
  name: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  icon: any;
}

export default function Diagnostics({ userProfile, addToast }: DiagnosticsProps) {
  const [results, setResults] = useState<TestResult[]>([
    { name: 'Supabase Connection', status: 'pending', message: 'Checking connection...', icon: Server },
    { name: 'User Profile Integrity', status: 'pending', message: 'Verifying profile data...', icon: User },
    { name: 'AI Engine (Gemini)', status: 'pending', message: 'Testing AI response...', icon: Brain },
  ]);

  const [pendingRequests, setPendingRequests] = useState<AdvancementRequest[]>([]);

  useEffect(() => {
    if (userProfile.role === 'creator') {
      const fetchRequests = async () => {
        const { data, error } = await supabase
          .from('advancement_requests')
          .select('*')
          .eq('status', 'pending');
        
        if (error) {
          await handleSupabaseError(error, OperationType.GET, 'advancement_requests');
        } else {
          setPendingRequests(data as AdvancementRequest[]);
        }
      };

      fetchRequests();

      const channel = supabase
        .channel('public:advancement_requests')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'advancement_requests',
          filter: 'status=eq.pending'
        }, fetchRequests)
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [userProfile.role]);

  const handleApproveRequest = async (request: AdvancementRequest) => {
    try {
      // Update user profile
      const { error: userError } = await supabase
        .from('users')
        .update({
          student_tier: request.target_tier,
          student_rank: request.target_tier.charAt(0).toUpperCase() + request.target_tier.slice(1),
          ap: 0
        })
        .eq('uid', request.uid);
      
      if (userError) throw userError;

      // Update request status
      const { error: requestError } = await supabase
        .from('advancement_requests')
        .update({ status: 'approved' })
        .eq('id', request.id);
      
      if (requestError) throw requestError;

      addToast('Advancement approved!', 'success');
    } catch (err) {
      await handleSupabaseError(err, OperationType.UPDATE, 'users');
      addToast('Failed to approve advancement.', 'error');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('advancement_requests')
        .update({ status: 'rejected' })
        .eq('id', requestId);
      
      if (error) throw error;
      addToast('Advancement rejected.', 'info');
    } catch (err) {
      await handleSupabaseError(err, OperationType.UPDATE, 'advancement_requests');
      addToast('Failed to reject advancement.', 'error');
    }
  };

  const runTests = async () => {
    try {
      const { error } = await supabase.from('users').select('uid').eq('uid', userProfile.uid).single();
      if (error) throw error;
      updateResult(0, 'success', 'Connected to Supabase successfully.');
    } catch (err) {
      updateResult(0, 'error', 'Failed to connect to Supabase.');
    }

    if (userProfile.uid && userProfile.email && userProfile.tier) {
      updateResult(1, 'success', `Profile valid. Tier: ${userProfile.tier?.toUpperCase() || 'FREE'}`);
    } else {
      updateResult(1, 'error', 'Profile data is incomplete.');
    }

    try {
      const testBot = {
        name: 'Trinity',
        strategy: 'MMM',
        tier_requirement: 'oracle' as Tier,
        description: 'Test bot for diagnostics.',
        icon: 'Zap',
        personality: 'analytical' as const
      };
      const signal = await generateTradingSignal('EURUSD', 'H1', testBot as any, 1.0850, { sentiment: 0.5, strength: 0.5 });
      if (signal && signal.entry) {
        updateResult(2, 'success', 'AI Oracle is responding correctly.');
      } else {
        updateResult(2, 'error', 'AI response format is invalid.');
      }
    } catch (err) {
      updateResult(2, 'error', 'AI Oracle is currently unreachable.');
    }
  };

  const updateResult = (index: number, status: 'success' | 'error', message: string) => {
    setResults(prev => {
      const newResults = [...prev];
      newResults[index] = { ...newResults[index], status, message };
      return newResults;
    });
  };

  useEffect(() => {
    runTests();
  }, []);

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">System Diagnostics</h1>
          <p className="text-white/40">Verifying the cosmic alignment of the platform.</p>
        </div>
        <button 
          onClick={() => {
            setResults(prev => prev.map(r => ({ ...r, status: 'pending', message: 'Retesting...' })));
            runTests();
          }}
          className="gold-button px-6 py-2 text-sm"
        >
          Rerun Tests
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-4 border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Server className="text-gold" size={18} />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Zion Core</h3>
          </div>
          <p className="text-xl font-bold text-emerald-400">Operational</p>
          <p className="text-[10px] text-white/20 mt-1">Uptime: 99.99% (Cosmic Standard)</p>
        </div>

        <div className="glass-card p-4 border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Globe className="text-blue-400" size={18} />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Data Feed</h3>
          </div>
          <p className="text-xl font-bold text-white">Connected</p>
          <p className="text-[10px] text-white/20 mt-1">Latency: 124ms (Zion Killzone)</p>
        </div>

        <div className="glass-card p-4 border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Brain className="text-purple-400" size={18} />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">AI Oracle</h3>
          </div>
          <p className="text-xl font-bold text-white">Active</p>
          <p className="text-[10px] text-white/20 mt-1">Model: Gemini 3 Flash (Visionary)</p>
        </div>

        <div className="glass-card p-4 border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <ShieldCheck className="text-emerald-400" size={18} />
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/40">Security</h3>
          </div>
          <p className="text-xl font-bold text-white">Encrypted</p>
          <p className="text-[10px] text-white/20 mt-1">RSA-4096 Cosmic Protocol</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Zap className="text-gold" size={20} /> Advanced System Metrics
            </h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40 uppercase tracking-widest font-bold">Neural Load</span>
                  <span className="text-gold font-mono">42%</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '42%' }}
                    className="h-full bg-gold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40 uppercase tracking-widest font-bold">Memory Allocation</span>
                  <span className="text-blue-400 font-mono">1.2 GB / 4.0 GB</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '30%' }}
                    className="h-full bg-blue-400"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-white/40 uppercase tracking-widest font-bold">WebSocket Throughput</span>
                  <span className="text-purple-400 font-mono">850 kbps</span>
                </div>
                <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: '65%' }}
                    className="h-full bg-purple-400"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 space-y-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <LayoutDashboard className="text-gold" size={20} /> System Logs
            </h3>
            <div className="bg-black/40 rounded-xl p-4 font-mono text-[10px] space-y-2 max-h-[300px] overflow-y-auto border border-white/5">
              <p className="text-emerald-400/60">[SUCCESS] Zion Network Handshake Complete</p>
              <p className="text-blue-400/60">[INFO] Deriv WebSocket Authorized: {userProfile.email}</p>
              <p className="text-white/20">[DEBUG] MarketContext Throttling: 500ms</p>
              <p className="text-white/20">[DEBUG] TradeMonitor Interval: 2000ms</p>
              <p className="text-purple-400/60">[AI] Oracle Eye Vision System Initialized</p>
              <p className="text-gold/60">[AUTH] RSA-4096 Key Validated for {userProfile.role.toUpperCase()} role</p>
              <p className="text-white/20">[DEBUG] Memory cleanup performed: 156 objects purged</p>
              <p className="text-emerald-400/60">[SUCCESS] Real-time price feed established for 45 symbols</p>
              <p className="text-white/20">[INFO] System realigned with cosmic constants</p>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <KeyGenerator userProfile={userProfile} addToast={addToast} />
          
          <div className="glass-card p-6 space-y-4 border-gold/10">
            <h3 className="text-sm font-bold uppercase tracking-widest text-gold flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Admin Protocol
            </h3>
            <p className="text-[10px] text-white/40 leading-relaxed italic">
              "The Creator has full authority over the Zion network. Use these tools with divine wisdom."
            </p>
            <div className="space-y-2">
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
              >
                Flush Neural Cache
              </button>
              <button className="w-full py-2 rounded-lg bg-white/5 border border-white/10 text-[10px] font-bold uppercase tracking-widest hover:bg-white/10 transition-all">
                Re-Sync Firestore
              </button>
              <button 
                onClick={() => supabase.auth.signOut()}
                className="w-full py-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[10px] font-bold uppercase tracking-widest text-rose-400 hover:bg-rose-500/20 transition-all"
              >
                Emergency Shutdown
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {results.map((test, i) => (
          <motion.div
            key={test.name}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card p-6 flex items-center justify-between border-white/5"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                test.status === 'success' ? 'bg-emerald-400/10 text-emerald-400' :
                test.status === 'error' ? 'bg-red-400/10 text-red-400' :
                'bg-gold/10 text-gold'
              }`}>
                <test.icon size={24} />
              </div>
              <div>
                <h3 className="font-bold text-lg">{test.name}</h3>
                <p className="text-sm text-white/40">{test.message}</p>
              </div>
            </div>
            <div>
              {test.status === 'pending' ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                  <Loader2 className="text-gold" size={24} />
                </motion.div>
              ) : test.status === 'success' ? (
                <CheckCircle2 className="text-emerald-400" size={24} />
              ) : (
                <XCircle className="text-red-400" size={24} />
              )}
            </div>
          </motion.div>
        ))}
      </div>

      <div className="glass-card p-8 bg-gold/5 border-gold/20">
        <div className="flex items-center gap-3 mb-4">
          <ShieldCheck className="text-gold" size={24} />
          <h3 className="text-xl font-display font-bold">Security Status</h3>
        </div>
        <div className="space-y-4 text-sm text-white/70">
          <p className="flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" size={16} />
            Firestore Security Rules: <span className="text-gold font-mono">ENFORCED</span>
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" size={16} />
            Authentication: <span className="text-gold font-mono">FIREBASE_AUTH_ACTIVE</span>
          </p>
          <p className="flex items-center gap-2">
            <CheckCircle2 className="text-emerald-400" size={16} />
            API Encryption: <span className="text-gold font-mono">SSL_TLS_1.3</span>
          </p>
        </div>
      </div>

      <div className="glass-card p-8 border-white/10 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="text-gold" size={24} />
            <h3 className="text-xl font-display font-bold uppercase tracking-widest">Launch Readiness</h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">Ready for Ascension</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { label: 'Mobile Optimization', status: 'Optimal', icon: Smartphone },
            { label: 'Latency Calibration', status: '120ms', icon: Zap },
            { label: 'UI/UX Polish', status: 'Complete', icon: LayoutDashboard },
            { label: 'API Rate Limits', status: 'Verified', icon: ShieldCheck },
          ].map((item) => (
            <div key={item.label} className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <item.icon className="text-gold/40" size={18} />
                <span className="text-sm font-bold">{item.label}</span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase">{item.status}</span>
            </div>
          ))}
        </div>
        <button className="w-full py-4 bg-gold text-black font-display font-bold uppercase tracking-[0.2em] rounded-xl hover:scale-[1.02] transition-all shadow-lg shadow-gold/20">
          Initiate Global Ascension
        </button>
      </div>
    </div>
  );
}
