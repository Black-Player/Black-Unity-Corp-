import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, Shield, Zap, MessageSquare, UserPlus, X, Search } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, addDoc, deleteDoc, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { Tribe, UserProfile } from '../types';

interface TribesProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export const Tribes: React.FC<TribesProps> = ({ userProfile, addToast }) => {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTribe, setNewTribe] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    const q = query(collection(db, 'tribes'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tribe));
      setTribes(data);
    }, (err) => handleFirestoreError(err, OperationType.GET, 'tribes'));

    return () => unsubscribe();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'tribes'), {
        ...newTribe,
        creator_id: userProfile.uid,
        members: [userProfile.uid],
        created_at: new Date().toISOString()
      }).catch(err => handleFirestoreError(err, OperationType.CREATE, 'tribes'));
      
      setShowCreate(false);
      setNewTribe({ name: '', description: '' });
      addToast('Tribe formed! Lead your people to glory.', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to form tribe', 'error');
    }
  };

  const handleJoin = async (tribeId: string) => {
    try {
      await updateDoc(doc(db, 'tribes', tribeId), {
        members: arrayUnion(userProfile.uid)
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `tribes/${tribeId}`));
      addToast('You have joined the tribe!', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to join tribe', 'error');
    }
  };

  const handleLeave = async (tribeId: string) => {
    try {
      await updateDoc(doc(db, 'tribes', tribeId), {
        members: arrayRemove(userProfile.uid)
      }).catch(err => handleFirestoreError(err, OperationType.UPDATE, `tribes/${tribeId}`));
      addToast('You have left the tribe.', 'info');
    } catch (error) {
      console.error(error);
      addToast('Failed to leave tribe', 'error');
    }
  };

  const filteredTribes = tribes.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg border border-emerald-500/30">
            <Users className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Cosmic Tribes</h2>
            <p className="text-sm text-white/40">Join a community of like-minded Oracles</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              placeholder="Search tribes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-emerald-500/50 outline-none w-full md:w-64"
            />
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:scale-105 transition-all shadow-lg shadow-emerald-500/25 whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            Form Tribe
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleCreate} className="glass-card p-6 space-y-4 border-emerald-500/20">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-400">Form New Tribe</h3>
                <button type="button" onClick={() => setShowCreate(false)} className="text-white/40 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Tribe Name</label>
                  <input
                    type="text"
                    required
                    value={newTribe.name}
                    onChange={(e) => setNewTribe({ ...newTribe, name: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none"
                    placeholder="e.g., The Alpha Oracles"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Description</label>
                  <textarea
                    required
                    value={newTribe.description}
                    onChange={(e) => setNewTribe({ ...newTribe, description: e.target.value })}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none min-h-[100px]"
                    placeholder="What is your tribe's mission?"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all"
              >
                Form Tribe
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTribes.length > 0 ? (
          filteredTribes.map((tribe) => {
            const isMember = tribe.members.includes(userProfile.uid);
            const isCreator = tribe.creator_id === userProfile.uid;

            return (
              <motion.div
                key={tribe.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-6 flex flex-col justify-between group border-emerald-500/10 hover:border-emerald-500/30 transition-all"
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                      <Users className="w-6 h-6 text-emerald-400" />
                    </div>
                    {isCreator && (
                      <span className="px-2 py-1 bg-gold/10 border border-gold/20 rounded-md text-[8px] font-bold text-gold uppercase tracking-widest">
                        Founder
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {tribe.name}
                    </h3>
                    <p className="text-sm text-white/40 line-clamp-2 leading-relaxed">
                      {tribe.description}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 pt-4 border-t border-white/5">
                    <div className="flex items-center gap-1.5">
                      <Zap className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs font-bold text-white/60">{tribe.members.length} Members</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-3 h-3 text-emerald-400" />
                      <span className="text-xs font-bold text-white/60">Active</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  {isMember ? (
                    <button
                      onClick={() => handleLeave(tribe.id)}
                      className="w-full py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/40 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all"
                    >
                      Leave Tribe
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoin(tribe.id)}
                      className="w-full py-2.5 bg-emerald-500 text-white rounded-xl text-xs font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4 h-4" />
                      Join Tribe
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })
        ) : (
          <div className="col-span-full bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-20 text-center">
            <Users className="w-12 h-12 text-white/10 mx-auto mb-4" />
            <p className="text-blue-200/40 italic">No tribes found in this sector. Why not form your own?</p>
          </div>
        )}
      </div>
    </div>
  );
};
