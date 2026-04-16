import { useState, useEffect } from 'react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { UserProfile } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, BellOff, Plus, Trash2, TrendingUp, TrendingDown, AlertCircle, Check, X, Zap, Save } from 'lucide-react';

interface PriceAlert {
  id: string;
  uid: string;
  pair: string;
  price: number;
  condition: 'above' | 'below';
  active: boolean;
  created_at: string;
}

interface AlertsManagerProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function AlertsManager({ userProfile, addToast }: AlertsManagerProps) {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newAlert, setNewAlert] = useState({
    pair: 'EURUSD',
    price: '',
    condition: 'above' as 'above' | 'below'
  });

  useEffect(() => {
    const fetchAlerts = async () => {
      const { data, error } = await supabase
        .from('alerts')
        .select('*')
        .eq('uid', userProfile.uid)
        .order('created_at', { ascending: false });
      
      if (error) {
        handleSupabaseError(error, OperationType.GET, 'alerts');
      } else {
        setAlerts(data as PriceAlert[]);
      }
    };

    fetchAlerts();

    const channel = supabase
      .channel(`public:alerts:manager:uid=eq.${userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'alerts', 
        filter: `uid=eq.${userProfile.uid}` 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setAlerts(prev => [payload.new as PriceAlert, ...prev]);
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as PriceAlert;
          setAlerts(prev => prev.map(a => a.id === updated.id ? updated : a));
        } else if (payload.eventType === 'DELETE') {
          setAlerts(prev => prev.filter(a => a.id !== (payload.old as PriceAlert).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid]);

  const handleAddAlert = async () => {
    if (!newAlert.price) return;

    const alertData: Omit<PriceAlert, 'id'> = {
      uid: userProfile.uid,
      pair: newAlert.pair,
      price: parseFloat(newAlert.price),
      condition: newAlert.condition,
      active: true,
      created_at: new Date().toISOString(),
    };

    try {
      const { error } = await supabase
        .from('alerts')
        .insert([alertData]);
      
      if (error) throw error;

      setNewAlert({ pair: 'EURUSD', price: '', condition: 'above' });
      setIsAdding(false);
      addToast('Celestial Alert set successfully.', 'success');
    } catch (err) {
      handleSupabaseError(err, OperationType.CREATE, 'alerts');
      addToast('Failed to set alert.', 'error');
    }
  };

  const toggleAlert = async (id: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .update({ active: !currentStatus })
        .eq('id', id);
      
      if (error) throw error;
    } catch (err) {
      handleSupabaseError(err, OperationType.UPDATE, 'alerts');
      addToast('Failed to update alert.', 'error');
    }
  };

  const deleteAlert = async (id: string) => {
    try {
      const { error } = await supabase
        .from('alerts')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      addToast('Alert removed from the heavens.', 'info');
    } catch (err) {
      handleSupabaseError(err, OperationType.DELETE, 'alerts');
      addToast('Failed to delete alert.', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold gold-gradient">Celestial Alerts</h1>
          <p className="text-white/40">Set custom price alerts and let the Oracles notify you of market shifts.</p>
        </div>
        <button 
          onClick={() => setIsAdding(true)}
          className="gold-button px-6 py-2 flex items-center gap-2"
        >
          <Plus size={16} /> Set Alert
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`glass-card p-6 border-white/5 transition-all flex flex-col space-y-4 ${
                !alert.active ? 'opacity-50 grayscale' : 'border-gold/20 bg-gold/5'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border transition-all ${
                  alert.active ? 'bg-gold/10 border-gold/20 text-gold' : 'bg-white/5 border-white/10 text-white/20'
                }`}>
                  {alert.active ? <Bell size={24} /> : <BellOff size={24} />}
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => toggleAlert(alert.id, alert.active)}
                    className={`p-2 rounded-lg transition-all ${
                      alert.active ? 'text-emerald-400 hover:bg-emerald-400/10' : 'text-white/20 hover:bg-white/10'
                    }`}
                  >
                    {alert.active ? <Check size={16} /> : <Zap size={16} />}
                  </button>
                  <button 
                    onClick={() => deleteAlert(alert.id)}
                    className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-display font-bold">{alert.pair}</h3>
                <p className="text-sm text-white/40 flex items-center gap-2">
                  {alert.condition === 'above' ? <TrendingUp size={14} className="text-emerald-400" /> : <TrendingDown size={14} className="text-red-400" />}
                  Price {alert.condition} <span className="font-mono font-bold text-white">{alert.price}</span>
                </p>
              </div>

              <div className="pt-4 border-t border-white/5 flex justify-between items-center">
                <span className="text-[10px] text-white/20 uppercase tracking-widest font-bold">Status</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest ${alert.active ? 'text-emerald-400' : 'text-white/20'}`}>
                  {alert.active ? 'Monitoring' : 'Paused'}
                </span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {alerts.length === 0 && !isAdding && (
          <div className="lg:col-span-3 py-20 text-center space-y-4">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto text-white/20">
              <BellOff size={40} />
            </div>
            <p className="text-white/40 italic">The heavens are quiet. Set your first price alert.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isAdding && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm"
              onClick={() => setIsAdding(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-lg glass-card p-8 border-gold/20 shadow-2xl"
            >
              <h2 className="text-2xl font-display font-bold gold-gradient mb-6 flex items-center gap-3">
                <Bell className="text-gold" size={24} /> Set Celestial Alert
              </h2>

              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Asset</label>
                    <select 
                      value={newAlert.pair}
                      onChange={(e) => setNewAlert({...newAlert, pair: e.target.value})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none appearance-none"
                    >
                      {['EURUSD', 'GBPUSD', 'USDJPY', 'XAUUSD', 'BTCUSD', 'US100'].map(p => (
                        <option key={p} value={p} className="bg-zinc-900">{p}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Condition</label>
                    <select 
                      value={newAlert.condition}
                      onChange={(e) => setNewAlert({...newAlert, condition: e.target.value as any})}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none appearance-none"
                    >
                      <option value="above" className="bg-zinc-900">Price Above</option>
                      <option value="below" className="bg-zinc-900">Price Below</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Target Price</label>
                  <input 
                    type="number"
                    step="0.0001"
                    value={newAlert.price}
                    onChange={(e) => setNewAlert({...newAlert, price: e.target.value})}
                    placeholder="e.g. 1.0850"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-gold/50 transition-all outline-none font-mono"
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    onClick={() => setIsAdding(false)}
                    className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 font-bold uppercase tracking-widest hover:bg-white/10 transition-all"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleAddAlert}
                    disabled={!newAlert.price}
                    className="flex-1 py-3 rounded-xl bg-gold text-black font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-gold/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Save size={16} /> Set Alert
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
