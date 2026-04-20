import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Lock, Key, Eye, EyeOff, Copy, Save, Trash2, AlertTriangle, Zap, Fingerprint, Database, Globe, Server } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';

interface ApiKey {
  id: string;
  uid: string;
  name: string;
  key: string;
  secret?: string;
  provider: 'Deriv' | 'Binance' | 'MetaTrader' | 'Custom';
  status: 'active' | 'revoked';
  created_at: string;
  last_used?: string;
}

export default function Vault({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNewKeyForm, setShowNewKeyForm] = useState(false);
  const [showSensitive, setShowSensitive] = useState<Record<string, boolean>>({});
  
  const [newKey, setNewKey] = useState({
    name: '',
    key: '',
    secret: '',
    provider: 'Deriv' as const
  });

  useEffect(() => {
    const fetchKeys = async () => {
      try {
        const { data, error } = await supabase
          .from('api_keys')
          .select('*')
          .eq('uid', userProfile.uid)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        setKeys(data as ApiKey[]);
      } catch (err) {
        await handleSupabaseError(err, OperationType.LIST, 'api_keys');
      } finally {
        setLoading(false);
      }
    };

    fetchKeys();

    const channel = supabase
      .channel('api-keys-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'api_keys',
        filter: `uid=eq.${userProfile.uid}`
      }, () => {
        fetchKeys();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid]);

  const handleAddKey = async () => {
    if (!newKey.name || !newKey.key) {
      addToast('Please provide a name and the API key.', 'error');
      return;
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .insert([{
          uid: userProfile.uid,
          name: newKey.name,
          key: newKey.key,
          secret: newKey.secret,
          provider: newKey.provider,
          status: 'active',
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;

      setNewKey({ name: '', key: '', secret: '', provider: 'Deriv' });
      setShowNewKeyForm(false);
      addToast('API Key secured in the Zion Vault.', 'success');
    } catch (error) {
      await handleSupabaseError(error, OperationType.CREATE, 'api_keys');
      addToast('Failed to secure the key.', 'error');
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      addToast('Key removed from the Vault.', 'info');
    } catch (error) {
      await handleSupabaseError(error, OperationType.DELETE, `api_keys/${id}`);
    }
  };

  const toggleSensitive = (id: string) => {
    setShowSensitive(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    addToast('Copied to clipboard.', 'success');
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient flex items-center gap-3">
            <Shield className="text-gold" size={32} /> Zion Vault
          </h1>
          <p className="text-white/40">Securely manage your API keys and connection protocols.</p>
        </div>
        <button 
          onClick={() => setShowNewKeyForm(true)}
          className="gold-button px-6 py-2 flex items-center gap-2"
        >
          <Key size={18} /> New Connection
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <AnimatePresence>
            {showNewKeyForm && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="glass-card p-6 border-gold/30 bg-gold/5 space-y-4"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-lg font-display font-bold text-gold uppercase tracking-widest">Secure New Key</h3>
                  <button onClick={() => setShowNewKeyForm(false)} className="text-white/40 hover:text-white">Close</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Connection Name</label>
                    <input 
                      type="text" 
                      value={newKey.name}
                      onChange={(e) => setNewKey({ ...newKey, name: e.target.value })}
                      placeholder="e.g. Deriv Main Account"
                      className="cosmic-input w-full"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Provider</label>
                    <select 
                      value={newKey.provider}
                      onChange={(e) => setNewKey({ ...newKey, provider: e.target.value as any })}
                      className="cosmic-input w-full"
                    >
                      <option value="Deriv">Deriv</option>
                      <option value="Binance">Binance</option>
                      <option value="MetaTrader">MetaTrader</option>
                      <option value="Custom">Custom API</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">API Key / Token</label>
                  <input 
                    type="password" 
                    value={newKey.key}
                    onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                    placeholder="Enter your secure API key"
                    className="cosmic-input w-full"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Secret Key (Optional)</label>
                  <input 
                    type="password" 
                    value={newKey.secret}
                    onChange={(e) => setNewKey({ ...newKey, secret: e.target.value })}
                    placeholder="Enter your secret key if required"
                    className="cosmic-input w-full"
                  />
                </div>
                <div className="flex items-center gap-3 p-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-xs">
                  <AlertTriangle size={16} className="shrink-0" />
                  <p>Never share your API keys. Zion Vault encrypts your keys, but you should always use keys with restricted permissions (e.g. Read/Trade only, no Withdrawals).</p>
                </div>
                <button 
                  onClick={handleAddKey}
                  className="w-full py-3 bg-gold text-black font-display font-bold uppercase tracking-widest rounded-xl hover:scale-[1.02] transition-all"
                >
                  Secure Connection
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Zap className="text-gold animate-pulse" size={48} />
              </div>
            ) : keys.length === 0 ? (
              <div className="glass-card p-20 text-center space-y-4 border-white/5">
                <Lock className="mx-auto text-white/10" size={64} />
                <p className="text-white/40 italic">The Vault is empty. Secure your first connection to begin.</p>
              </div>
            ) : (
              keys.map((key) => (
                <motion.div
                  key={key.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="glass-card p-6 border-white/5 hover:border-gold/20 transition-all group"
                >
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-gold/10 flex items-center justify-center text-gold border border-gold/20">
                        <Database size={24} />
                      </div>
                      <div>
                        <h3 className="text-lg font-display font-bold">{key.name}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{key.provider}</span>
                          <span className="w-1 h-1 rounded-full bg-white/20"></span>
                          <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold">Active</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => toggleSensitive(key.id)}
                        className="p-2 text-white/20 hover:text-gold transition-all"
                      >
                        {showSensitive[key.id] ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteKey(key.id)}
                        className="p-2 text-white/20 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">API Key</p>
                      <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 font-mono text-xs overflow-hidden">
                        <span className="flex-1 truncate">
                          {showSensitive[key.id] ? key.key : '••••••••••••••••••••••••'}
                        </span>
                        <button onClick={() => copyToClipboard(key.key)} className="text-white/20 hover:text-gold">
                          <Copy size={14} />
                        </button>
                      </div>
                    </div>
                    {key.secret && (
                      <div className="space-y-2">
                        <p className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Secret Key</p>
                        <div className="flex items-center gap-2 p-3 rounded-xl bg-white/5 border border-white/5 font-mono text-xs overflow-hidden">
                          <span className="flex-1 truncate">
                            {showSensitive[key.id] ? key.secret : '••••••••••••••••••••••••'}
                          </span>
                          <button onClick={() => copyToClipboard(key.secret!)} className="text-white/20 hover:text-gold">
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between text-[10px] text-white/20 font-bold uppercase tracking-widest">
                    <div className="flex items-center gap-4">
                      <span className="flex items-center gap-1"><Server size={12} /> Edge Node: Africa-South-1</span>
                      <span className="flex items-center gap-1"><Fingerprint size={12} /> Encrypted: AES-256-GCM</span>
                    </div>
                    <span>Added: {key.created_at ? new Date(key.created_at).toLocaleDateString() : 'Just now'}</span>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6 bg-gold/5 border-gold/20 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Shield className="text-gold" size={20} /> Vault Protocols
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold shrink-0">
                  <Lock size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">End-to-End Encryption</p>
                  <p className="text-[10px] text-white/40 leading-relaxed">Your keys are encrypted before they ever leave your browser. Zion never sees your raw keys.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-gold/10 flex items-center justify-center text-gold shrink-0">
                  <Globe size={16} />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Global Edge Network</p>
                  <p className="text-[10px] text-white/40 leading-relaxed">Execute trades across the globe with sub-50ms latency through our distributed node network.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 border-white/5 space-y-4">
            <h3 className="text-lg font-display font-bold flex items-center gap-2">
              <Zap className="text-gold" size={20} /> Quick Connect
            </h3>
            <p className="text-xs text-white/60 leading-relaxed">
              Connect your Deriv account using an API token to enable real-time trading signals and automated execution.
            </p>
            <a 
              href="https://app.deriv.com/account/api-token" 
              target="_blank" 
              rel="noopener noreferrer"
              className="w-full py-3 bg-white/5 hover:bg-white/10 text-white/60 text-[10px] font-bold uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2"
            >
              Get Deriv Token <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function ExternalLink({ size }: { size: number }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}
