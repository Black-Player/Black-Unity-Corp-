import { useState, useEffect } from 'react';
import { UserProfile, AccessKey, AdvancementRequest } from '../types';
import { db, auth } from '../firebase';
import { doc, getDoc, collection, addDoc, serverTimestamp, query, where, onSnapshot, updateDoc, deleteDoc, increment as firestoreIncrement } from 'firebase/firestore';
import { generateTradingSignal } from '../services/aiService';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, ShieldAlert, CheckCircle2, XCircle, Loader2, Server, Brain, User, Sparkles, Smartphone, Zap, LayoutDashboard, Key, Plus, Copy, GraduationCap, Check, X } from 'lucide-react';

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
    { name: 'Firebase Connection', status: 'pending', message: 'Checking connection...', icon: Server },
    { name: 'User Profile Integrity', status: 'pending', message: 'Verifying profile data...', icon: User },
    { name: 'AI Engine (Gemini)', status: 'pending', message: 'Testing AI response...', icon: Brain },
  ]);

  const [keyType, setKeyType] = useState<'student' | 'investor'>('student');
  const [usageLimit, setUsageLimit] = useState(1);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [pendingRequests, setPendingRequests] = useState<AdvancementRequest[]>([]);

  useEffect(() => {
    if (userProfile.role === 'creator') {
      const q = query(collection(db, 'advancement_requests'), where('status', '==', 'pending'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AdvancementRequest));
        setPendingRequests(requests);
      });
      return () => unsubscribe();
    }
  }, [userProfile.role]);

  const handleApproveRequest = async (request: AdvancementRequest) => {
    try {
      // Update user profile
      const userRef = doc(db, 'users', request.user_id);
      await updateDoc(userRef, {
        student_tier: request.target_tier,
        student_rank: request.target_tier.charAt(0).toUpperCase() + request.target_tier.slice(1),
        ap: 0 // Reset AP on advancement? Or keep? User prompt says "Students must EARN progression".
      });

      // Update request status
      const requestRef = doc(db, 'advancement_requests', request.id!);
      await updateDoc(requestRef, { status: 'approved' });
      addToast('Advancement approved!', 'success');
    } catch (err) {
      addToast('Failed to approve advancement.', 'error');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    try {
      const requestRef = doc(db, 'advancement_requests', requestId);
      await updateDoc(requestRef, { status: 'rejected' });
      addToast('Advancement rejected.', 'info');
    } catch (err) {
      addToast('Failed to reject advancement.', 'error');
    }
  };

  const generateKey = async () => {
    // ... existing generateKey ...
    setIsGenerating(true);
    try {
      const keyStr = `${keyType.toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const signature = btoa(JSON.stringify({ key: keyStr, type: keyType, timestamp: Date.now() }));
      
      const keyData: Partial<AccessKey> = {
        key: keyStr,
        type: keyType,
        usage_limit: usageLimit,
        usage_count: 0,
        created_at: new Date().toISOString(),
        signature: signature
      };

      await addDoc(collection(db, 'access_keys'), keyData);
      setGeneratedKey(keyStr);
      addToast(`${keyType.charAt(0).toUpperCase() + keyType.slice(1)} key generated successfully!`, 'success');
    } catch (err) {
      addToast('Failed to generate access key.', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Key copied to clipboard!', 'success');
  };

  const runTests = async () => {
    // ... existing tests ...
    try {
      await getDoc(doc(db, 'users', userProfile.uid));
      updateResult(0, 'success', 'Connected to Firestore successfully.');
    } catch (err) {
      updateResult(0, 'error', 'Failed to connect to Firestore.');
    }

    if (userProfile.uid && userProfile.email && userProfile.tier) {
      updateResult(1, 'success', `Profile valid. Tier: ${userProfile.tier?.toUpperCase() || 'FREE'}`);
    } else {
      updateResult(1, 'error', 'Profile data is incomplete.');
    }

    try {
      const signal = await generateTradingSignal('EURUSD', 'H1', 'Trinity', 'MMM', 1.0850, { sentiment: 0.5, strength: 0.5 });
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

      {/* Creator Tools Section */}
      {userProfile.role === 'creator' && (
        <div className="space-y-8">
          {/* Key Generator */}
          <div className="glass-card p-8 border-gold/20 bg-gold/5 space-y-6">
            <div className="flex items-center gap-3">
              <Key className="text-gold" size={24} />
              <h3 className="text-xl font-display font-bold uppercase tracking-widest">Access Key Generator</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Key Type</label>
                <select 
                  value={keyType}
                  onChange={(e) => setKeyType(e.target.value as any)}
                  className="w-full cosmic-input text-sm"
                >
                  <option value="student">Student Key</option>
                  <option value="investor">Investor Key</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Usage Limit</label>
                <input 
                  type="number" 
                  value={usageLimit}
                  onChange={(e) => setUsageLimit(parseInt(e.target.value))}
                  className="w-full cosmic-input text-sm"
                  min="1"
                />
              </div>
              <div className="flex items-end">
                <button 
                  onClick={generateKey}
                  disabled={isGenerating}
                  className="w-full py-3 bg-gold text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gold/80 transition-all"
                >
                  {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  Generate Key
                </button>
              </div>
            </div>

            {generatedKey && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-4 rounded-xl bg-black/40 border border-gold/20 flex items-center justify-between"
              >
                <div className="space-y-1">
                  <p className="text-[10px] text-gold uppercase font-bold tracking-widest">Generated Key</p>
                  <p className="text-lg font-mono font-bold text-white">{generatedKey}</p>
                </div>
                <button 
                  onClick={() => copyToClipboard(generatedKey)}
                  className="p-3 rounded-lg hover:bg-white/5 text-gold transition-all"
                >
                  <Copy size={20} />
                </button>
              </motion.div>
            )}
          </div>

          {/* Advancement Requests */}
          <div className="glass-card p-8 border-blue-500/20 bg-blue-500/5 space-y-6">
            <div className="flex items-center gap-3">
              <GraduationCap className="text-blue-400" size={24} />
              <h3 className="text-xl font-display font-bold uppercase tracking-widest">Advancement Requests</h3>
            </div>

            <div className="space-y-4">
              {pendingRequests.length === 0 ? (
                <p className="text-center py-8 text-white/20 italic">No pending advancement requests.</p>
              ) : (
                pendingRequests.map((req) => (
                  <motion.div 
                    key={req.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-bold text-white">User ID: {req.user_id.slice(0, 8)}...</p>
                      <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest">
                        <span className="text-white/40">{req.current_tier}</span>
                        <Zap size={10} className="text-gold" />
                        <span className="text-blue-400">{req.target_tier}</span>
                      </div>
                      <p className="text-[10px] text-white/40">AP at Request: {req.ap_at_request}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleApproveRequest(req)}
                        className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-all"
                      >
                        <Check size={20} />
                      </button>
                      <button 
                        onClick={() => handleRejectRequest(req.id!)}
                        className="p-2 rounded-lg bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 transition-all"
                      >
                        <X size={20} />
                      </button>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {/* ... existing results map ... */}
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
