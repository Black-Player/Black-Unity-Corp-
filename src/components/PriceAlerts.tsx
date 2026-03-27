import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Plus, Trash2, AlertCircle, TrendingUp, TrendingDown, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { PriceAlert, UserProfile } from '../types';
import { DERIV_SYMBOLS } from '../constants';

interface PriceAlertsProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const PriceAlerts: React.FC<PriceAlertsProps> = ({ userProfile, addToast }) => {
  const [alerts, setAlerts] = useState<PriceAlert[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newAlert, setNewAlert] = useState({
    pair: 'R_100',
    price: 0,
    condition: 'above' as 'above' | 'below'
  });

  useEffect(() => {
    const q = query(collection(db, 'users', userProfile.uid, 'alerts'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PriceAlert));
      setAlerts(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, `users/${userProfile.uid}/alerts`));

    return () => unsubscribe();
  }, [userProfile.uid]);

  const handleAddAlert = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'users', userProfile.uid, 'alerts'), {
        ...newAlert,
        user_id: userProfile.uid,
        active: true,
        created_at: new Date().toISOString()
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, `users/${userProfile.uid}/alerts`));
      
      setShowAdd(false);
      addToast('Price alert set successfully', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to set alert', 'error');
    }
  };

  const handleDeleteAlert = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'users', userProfile.uid, 'alerts', id))
        .catch(err => handleFirestoreError(err, OperationType.DELETE, `users/${userProfile.uid}/alerts/${id}`));
      addToast('Alert removed', 'info');
    } catch (error) {
      console.error(error);
      addToast('Failed to remove alert', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/20 rounded-lg border border-gold/30">
            <Bell className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Price Alerts</h2>
            <p className="text-sm text-white/40">Get notified when the cosmos aligns</p>
          </div>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gold text-black rounded-xl text-sm font-bold hover:scale-105 transition-all"
        >
          <Plus className="w-4 h-4" />
          Set Alert
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddAlert} className="glass-card p-6 space-y-4 border-gold/20">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-bold uppercase tracking-widest text-gold">New Price Alert</h3>
                <button type="button" onClick={() => setShowAdd(false)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Asset</label>
                  <select
                    value={newAlert.pair}
                    onChange={(e) => setNewAlert({ ...newAlert, pair: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gold/50 outline-none"
                  >
                    {DERIV_SYMBOLS.map(s => (
                      <option key={s.symbol} value={s.symbol}>{s.name}</option>
                    ))}
                  </select>
                </div>
                
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Condition</label>
                  <select
                    value={newAlert.condition}
                    onChange={(e) => setNewAlert({ ...newAlert, condition: e.target.value as 'above' | 'below' })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gold/50 outline-none"
                  >
                    <option value="above">Price Above</option>
                    <option value="below">Price Below</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Target Price</label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={newAlert.price}
                    onChange={(e) => setNewAlert({ ...newAlert, price: parseFloat(e.target.value) })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm focus:border-gold/50 outline-none"
                    placeholder="0.0000"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-gold text-black rounded-xl font-bold hover:bg-gold/90 transition-all"
              >
                Create Alert
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid gap-4">
        {alerts.length > 0 ? (
          alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="glass-card p-4 flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-lg ${alert.condition === 'above' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
                  {alert.condition === 'above' ? (
                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-red-400" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{alert.pair}</span>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">
                      {alert.condition}
                    </span>
                  </div>
                  <div className="text-lg font-mono font-bold text-gold">
                    {alert.price.toFixed(4)}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDeleteAlert(alert.id)}
                className="p-2 text-white/20 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </motion.div>
          ))
        ) : (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center">
            <AlertCircle className="w-10 h-10 text-white/10 mx-auto mb-4" />
            <p className="text-blue-200/40 italic">No active alerts. The cosmos is quiet.</p>
          </div>
        )}
      </div>
    </div>
  );
};
