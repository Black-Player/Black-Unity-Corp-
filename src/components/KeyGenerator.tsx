import React, { useState, useEffect } from 'react';
import { Key, Plus, Copy, Check, Trash2, Shield, Clock, Users, Zap, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { AccessKey, UserProfile } from '../types';

export default function KeyGenerator({ addToast, userProfile }: { addToast: any, userProfile?: UserProfile }) {
  const [keys, setKeys] = useState<AccessKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Form state
  const [type, setType] = useState<'student' | 'investor'>('student');
  const [usageLimit, setUsageLimit] = useState(1);
  const [expiryDays, setExpiryDays] = useState(7);

  useEffect(() => {
    // Initial fetch
    const fetchKeys = async () => {
      const { data, error } = await supabase
        .from('access_keys')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, OperationType.LIST, 'access_keys');
      } else {
        setKeys(data as AccessKey[]);
      }
      setLoading(false);
    };

    fetchKeys();

    // Subscribe to changes
    const channel = supabase
      .channel('public:access_keys')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'access_keys' 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setKeys(prev => [payload.new as AccessKey, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          setKeys(prev => prev.map(k => k.id === (payload.new as AccessKey).id ? payload.new as AccessKey : k));
        } else if (payload.eventType === 'DELETE') {
          setKeys(prev => prev.filter(k => k.id !== (payload.old as AccessKey).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const generateKey = async () => {
    setGenerating(true);
    try {
      const randomString = Math.random().toString(36).substring(2, 15).toUpperCase();
      const prefix = type === 'student' ? 'STU' : 'INV';
      const keyString = `${prefix}-${randomString}`;
      
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + expiryDays);

      const newKey: Omit<AccessKey, 'id'> = {
        key: keyString,
        type,
        usage_limit: usageLimit,
        usage_count: 0,
        expiry: expiryDate.toISOString(),
        created_at: new Date().toISOString(),
        signature: 'BP-RSA-SECURE-SIG'
      };

      const { error } = await supabase
        .from('access_keys')
        .insert([newKey]);
      
      if (error) throw error;
      addToast(`Generated ${type} key: ${keyString}`, 'success');
    } catch (error) {
      handleSupabaseError(error, OperationType.CREATE, 'access_keys');
    } finally {
      setGenerating(false);
    }
  };

  const deleteKey = async (id: string) => {
    try {
      const { error } = await supabase
        .from('access_keys')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      addToast('Access key revoked', 'info');
    } catch (error) {
      handleSupabaseError(error, OperationType.DELETE, `access_keys/${id}`);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    addToast('Key copied to clipboard', 'success');
  };

  return (
    <div className="space-y-6">
      <div className="glass-card p-6 border-gold/20 bg-gold/5">
        <div className="flex items-center gap-3 mb-6">
          <Key className="text-gold" size={24} />
          <h3 className="text-xl font-display font-bold uppercase tracking-widest">Access Key Generator</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-2">
            <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Key Type</label>
            <select 
              value={type}
              onChange={(e) => setType(e.target.value as any)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-gold/50 outline-none"
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
              min="1"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-gold/50 outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] text-white/40 uppercase font-bold tracking-widest">Expiry (Days)</label>
            <input 
              type="number"
              value={expiryDays}
              onChange={(e) => setExpiryDays(parseInt(e.target.value))}
              min="1"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:border-gold/50 outline-none"
            />
          </div>

          <button 
            onClick={generateKey}
            disabled={generating}
            className="w-full bg-gold text-black font-bold py-2.5 rounded-xl hover:bg-gold/80 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {generating ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
            Generate Key
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <h4 className="text-sm font-bold uppercase tracking-widest text-white/60 flex items-center gap-2">
          <Shield size={16} /> Active Access Keys
        </h4>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-gold" size={32} />
          </div>
        ) : keys.length === 0 ? (
          <div className="glass-card p-12 text-center border-white/5 opacity-40">
            <Key className="mx-auto mb-4" size={48} />
            <p className="text-sm italic">No active keys found in the vault.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <AnimatePresence initial={false}>
              {keys.map((key) => (
                <motion.div
                  key={key.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="glass-card p-4 border-white/5 hover:border-gold/20 transition-all group"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                      key.type === 'student' ? 'bg-blue-400/10 text-blue-400' : 'bg-emerald-400/10 text-emerald-400'
                    }`}>
                      {key.type}
                    </span>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => copyToClipboard(key.key, key.id)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-gold transition-all"
                      >
                        {copiedId === key.id ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                      <button 
                        onClick={() => deleteKey(key.id)}
                        className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-rose-400 transition-all"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-mono font-bold text-white tracking-wider">{key.key}</p>
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold uppercase">
                        <Users size={10} /> {key.usage_count} / {key.usage_limit}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-white/40 font-bold uppercase">
                        <Clock size={10} /> {new Date(key.expiry!).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
