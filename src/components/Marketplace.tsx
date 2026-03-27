import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShoppingBag, Star, Zap, Shield, Search, Filter, ArrowUpRight, Tag, X } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { MarketplaceItem, UserProfile } from '../types';

interface MarketplaceProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const Marketplace: React.FC<MarketplaceProps> = ({ userProfile, addToast }) => {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState<'all' | 'strategy' | 'bot_config'>('all');
  const [showListModal, setShowListModal] = useState(false);
  const [newItem, setNewItem] = useState<Partial<MarketplaceItem>>({
    name: '',
    description: '',
    price: 0,
    type: 'strategy'
  });
  const [listing, setListing] = useState(false);

  useEffect(() => {
    const q = query(collection(db, 'marketplace'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MarketplaceItem));
      setItems(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'marketplace'));

    return () => unsubscribe();
  }, []);

  const handleList = async () => {
    if (!newItem.name || !newItem.description || !newItem.price) {
      addToast('Please fill in all fields', 'error');
      return;
    }

    setListing(true);
    try {
      const marketplaceRef = collection(db, 'marketplace');
      const { addDoc } = await import('firebase/firestore');
      await addDoc(marketplaceRef, {
        ...newItem,
        seller_id: userProfile.uid,
        created_at: new Date().toISOString()
      }).catch(err => handleFirestoreError(err, OperationType.WRITE, 'marketplace'));

      addToast('Your strategy has been listed in the Celestial Marketplace!', 'success');
      setShowListModal(false);
      setNewItem({ name: '', description: '', price: 0, type: 'strategy' });
    } catch (err: any) {
      addToast(err.message, 'error');
    } finally {
      setListing(false);
    }
  };

  const defaultItems: MarketplaceItem[] = [
    {
      id: '1',
      seller_id: 'system',
      name: 'The Golden Ratio Bot Config',
      description: 'Optimized Fibonacci settings for Volatility 75. High precision entries.',
      price: 500,
      type: 'bot_config',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      seller_id: 'system',
      name: 'SMC Masterclass Strategy',
      description: 'A complete set of rules for Smart Money Concepts trading.',
      price: 1200,
      type: 'strategy',
      created_at: new Date().toISOString()
    },
    {
      id: '3',
      seller_id: 'system',
      name: 'Crash/Boom Spike Hunter',
      description: 'Specialized bot configuration for catching massive spikes.',
      price: 800,
      type: 'bot_config',
      created_at: new Date().toISOString()
    }
  ];

  const displayItems = items.length > 0 ? items : defaultItems;

  const filteredItems = displayItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         item.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || item.type === filter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/20 rounded-lg border border-gold/30">
            <ShoppingBag className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Celestial Marketplace</h2>
            <p className="text-sm text-white/40">Acquire the tools of the masters</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              placeholder="Search marketplace..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-gold/50 outline-none w-full md:w-64"
            />
          </div>
          <div className="flex bg-white/5 rounded-xl p-1 border border-white/10">
            {(['all', 'strategy', 'bot_config'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                  filter === f ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredItems.map((item, index) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-6 flex flex-col justify-between group border-white/5 hover:border-gold/30 transition-all duration-500"
          >
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div className="p-3 bg-white/5 rounded-xl border border-white/10 group-hover:bg-gold/10 group-hover:border-gold/20 transition-all">
                  {item.type === 'strategy' ? <Shield className="w-6 h-6 text-blue-400" /> : <Zap className="w-6 h-6 text-gold" />}
                </div>
                <div className="flex items-center gap-1 px-2 py-1 bg-white/5 rounded-md text-[10px] font-bold text-white/40">
                  <Star className="w-3 h-3 text-gold" />
                  4.8 (120)
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Tag className="w-3 h-3 text-gold" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gold opacity-60">
                    {item.type.replace('_', ' ')}
                  </span>
                </div>
                <h3 className="text-xl font-bold text-white group-hover:text-gold transition-colors">
                  {item.name}
                </h3>
                <p className="text-sm text-white/40 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-white/5">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Price</span>
                  <span className="text-lg font-mono font-bold text-white">{item.price} Credits</span>
                </div>
                <button 
                  onClick={() => addToast('Insufficient credits. Complete challenges to earn more!', 'info')}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/60 hover:bg-gold hover:text-black hover:border-gold transition-all flex items-center gap-2"
                >
                  Acquire
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-gradient-to-r from-gold/10 to-transparent p-8 rounded-2xl border border-gold/20 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-white">Become a Celestial Merchant</h3>
          <p className="text-sm text-white/40 max-w-xl">
            Have you mastered a strategy? Share your wisdom with the community and earn Oracle Credits. 
            Top merchants gain access to exclusive developer tools.
          </p>
        </div>
        <button 
          onClick={() => setShowListModal(true)}
          className="px-8 py-3 bg-gold text-black rounded-xl font-bold hover:scale-105 transition-all shadow-lg shadow-gold/20"
        >
          List Your Strategy
        </button>
      </div>

      <AnimatePresence>
        {showListModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-card p-8 w-full max-w-xl space-y-6 border-gold/30"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-display font-bold gold-gradient flex items-center gap-2">
                  <ShoppingBag className="text-gold" size={20} /> List Celestial Asset
                </h3>
                <button onClick={() => setShowListModal(false)} className="text-white/40 hover:text-white">&times;</button>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Asset Name</label>
                  <input 
                    type="text" 
                    value={newItem.name}
                    onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                    placeholder="e.g. The Golden Ratio, Scalping King..."
                    className="w-full cosmic-input"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Type</label>
                    <select 
                      value={newItem.type}
                      onChange={(e) => setNewItem({ ...newItem, type: e.target.value as any })}
                      className="w-full cosmic-input"
                    >
                      <option value="strategy">Strategy</option>
                      <option value="bot_config">Bot Config</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Price (Credits)</label>
                    <input 
                      type="number" 
                      value={newItem.price}
                      onChange={(e) => setNewItem({ ...newItem, price: parseInt(e.target.value) })}
                      className="w-full cosmic-input"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-white/40 uppercase tracking-widest font-bold">Description</label>
                  <textarea 
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Describe your asset and its performance..."
                    className="w-full cosmic-input min-h-[100px] resize-none"
                  />
                </div>
              </div>

              <div className="flex gap-4 pt-4">
                <button 
                  onClick={() => setShowListModal(false)}
                  className="flex-1 py-3 rounded-xl bg-white/5 text-white/60 hover:bg-white/10 transition-all font-bold text-sm"
                >
                  Cancel
                </button>
                <button 
                  onClick={handleList}
                  disabled={listing}
                  className="flex-1 gold-button flex items-center justify-center gap-2"
                >
                  {listing ? <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" /> : <Tag size={18} />}
                  List Asset
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
