import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, Plus, Trash2, Shield, Zap, MessageSquare, UserPlus, X, Search, LogOut, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { Tribe, UserProfile, DelegatedTask } from '../types';

interface TribesProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const TribeWorkspace: React.FC<{ tribe: Tribe; userProfile: UserProfile; onBack: () => void; addToast: (message: string, type?: 'success' | 'error' | 'info') => void }> = ({ tribe, userProfile, onBack, addToast }) => {
  const [tasks, setTasks] = useState<DelegatedTask[]>([]);
  const [members, setMembers] = useState<UserProfile[]>([]);
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignee_id: '', deadline: '' });

  useEffect(() => {
    const fetchWorkspaceData = async () => {
      // Fetch members
      const { data: mData } = await supabase.from('users').select('*').in('uid', tribe.members);
      if (mData) setMembers(mData as UserProfile[]);

      // Fetch tasks
      const { data: tData } = await supabase.from('tasks').select('*').eq('tribe_id', tribe.id);
      if (tData) setTasks(tData as DelegatedTask[]);
    };
    fetchWorkspaceData();

    const taskChannel = supabase.channel(`tasks:${tribe.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `tribe_id=eq.${tribe.id}` }, fetchWorkspaceData)
      .subscribe();

    return () => { supabase.removeChannel(taskChannel); };
  }, [tribe.id]);

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.assignee_id || !newTask.title || !newTask.deadline) return;

    try {
      const { error } = await supabase.from('tasks').insert([{
        assigner_id: userProfile.uid,
        assignee_id: newTask.assignee_id,
        title: newTask.title,
        description: newTask.description,
        status: 'pending',
        deadline: new Date(newTask.deadline).toISOString(),
        created_at: new Date().toISOString(),
        tribe_id: tribe.id
      }]);
      if (error) throw error;
      addToast('Task assigned successfully', 'success');
      setShowTaskForm(false);
      setNewTask({ title: '', description: '', assignee_id: '', deadline: '' });
    } catch (error) {
      addToast('Failed to assign task', 'error');
    }
  };

  const handleUpdateStatus = async (taskId: string, newStatus: string) => {
    try {
      const { error } = await supabase.from('tasks').update({ status: newStatus }).eq('id', taskId);
      if (error) throw error;
      addToast('Task status updated', 'success');
    } catch (error) {
      addToast('Failed to update task', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-white/10 pb-4">
        <button onClick={onBack} className="text-white/40 hover:text-white px-3 py-1 bg-white/5 rounded-lg border border-white/10">&larr; Back</button>
        <div>
          <h2 className="text-2xl font-bold text-emerald-400">{tribe.name} Workspace</h2>
          <p className="text-sm text-white/50">Manage operations and delegated tasks</p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-white">Delegated Tasks</h3>
        <button onClick={() => setShowTaskForm(!showTaskForm)} className="px-4 py-2 bg-emerald-500 text-white rounded-lg flex items-center gap-2 font-bold text-sm">
          <Plus className="w-4 h-4" /> Assign Task
        </button>
      </div>

      {showTaskForm && (
        <form onSubmit={handleAssignTask} className="glass-card p-6 space-y-4 border-emerald-500/20">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Title</label>
              <input required type="text" value={newTask.title} onChange={e => setNewTask({...newTask, title: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none" placeholder="Task title..." />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Assign To</label>
              <select required value={newTask.assignee_id} onChange={e => setNewTask({...newTask, assignee_id: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none">
                <option value="">Select Member</option>
                {members.map(m => (
                  <option key={m.uid} value={m.uid}>{m.username || m.email}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Description</label>
            <textarea required value={newTask.description} onChange={e => setNewTask({...newTask, description: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none min-h-[80px]" placeholder="Task details..." />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-widest text-white/40">Deadline</label>
            <input required type="datetime-local" value={newTask.deadline} onChange={e => setNewTask({...newTask, deadline: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-emerald-500/50 outline-none [color-scheme:dark]" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowTaskForm(false)} className="px-6 py-2 bg-white/5 text-white/60 rounded-xl text-sm font-bold hover:bg-white/10">Cancel</button>
            <button type="submit" className="px-6 py-2 bg-emerald-500 text-white rounded-xl text-sm font-bold hover:bg-emerald-600 shadow-lg shadow-emerald-500/20">Assign Task</button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {tasks.map(task => {
          const assignee = members.find(m => m.uid === task.assignee_id);
          const isAssignee = task.assignee_id === userProfile.uid;
          const isAssigner = task.assigner_id === userProfile.uid;
          
          return (
            <div key={task.id} className="glass-card p-5 border-white/5 space-y-4">
               <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white">{task.title}</h4>
                    <p className="text-xs text-emerald-400 mt-1">Assigned to: {assignee?.username || 'Unknown'}</p>
                  </div>
                  <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-widest ${
                    task.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' :
                    task.status === 'in_progress' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-white/10 text-white/40'
                  }`}>
                    {task.status.replace('_', ' ')}
                  </span>
               </div>
               <p className="text-sm text-white/60 line-clamp-2">{task.description}</p>
               <div className="flex justify-between items-center text-xs text-white/40">
                 <span className="flex items-center gap-1"><Clock size={12}/> Due: {new Date(task.deadline).toLocaleDateString()}</span>
               </div>
               
               {(isAssignee || isAssigner) && task.status !== 'completed' && (
                 <div className="flex gap-2 pt-2 border-t border-white/5">
                   {task.status === 'pending' && (
                     <button onClick={() => handleUpdateStatus(task.id, 'in_progress')} className="flex-1 py-1.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-blue-500/20">
                       <PlayCircle size={14}/> Start
                     </button>
                   )}
                   {task.status === 'in_progress' && (
                     <button onClick={() => handleUpdateStatus(task.id, 'completed')} className="flex-1 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1 hover:bg-emerald-500/20">
                       <CheckCircle2 size={14}/> Complete
                     </button>
                   )}
                 </div>
               )}
            </div>
          )
        })}
        {tasks.length === 0 && (
          <div className="col-span-full text-center p-8 text-white/30 italic">No tasks active in this tribe.</div>
        )}
      </div>
    </div>
  )
}

export const Tribes: React.FC<TribesProps> = ({ userProfile, addToast }) => {
  const [tribes, setTribes] = useState<Tribe[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [newTribe, setNewTribe] = useState({
    name: '',
    description: ''
  });
  const [selectedTribeId, setSelectedTribeId] = useState<string | null>(null);

  useEffect(() => {
    const fetchTribes = async () => {
      const { data, error } = await supabase
        .from('tribes')
        .select('*');
      
      if (error) {
        await handleSupabaseError(error, OperationType.GET, 'tribes');
      } else {
        setTribes(data as Tribe[]);
      }
    };

    fetchTribes();

    const channel = supabase
      .channel('public:tribes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tribes' }, fetchTribes)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase
        .from('tribes')
        .insert([{
          ...newTribe,
          creator_id: userProfile.uid,
          members: [userProfile.uid],
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      
      setShowCreate(false);
      setNewTribe({ name: '', description: '' });
      addToast('Tribe formed! Lead your people to glory.', 'success');
    } catch (error) {
      await handleSupabaseError(error, OperationType.CREATE, 'tribes');
      addToast('Failed to form tribe', 'error');
    }
  };

  const handleJoin = async (tribeId: string) => {
    try {
      const tribe = tribes.find(t => t.id === tribeId);
      if (!tribe) return;
      
      const newMembers = [...new Set([...tribe.members, userProfile.uid])];
      
      const { error } = await supabase
        .from('tribes')
        .update({ members: newMembers })
        .eq('id', tribeId);
      
      if (error) throw error;
      addToast('You have joined the tribe!', 'success');
    } catch (error) {
      await handleSupabaseError(error, OperationType.UPDATE, 'tribes');
      addToast('Failed to join tribe', 'error');
    }
  };

  const handleLeave = async (tribeId: string) => {
    try {
      const tribe = tribes.find(t => t.id === tribeId);
      if (!tribe) return;
      
      const newMembers = tribe.members.filter(m => m !== userProfile.uid);
      
      const { error } = await supabase
        .from('tribes')
        .update({ members: newMembers })
        .eq('id', tribeId);
      
      if (error) throw error;
      addToast('You have left the tribe.', 'info');
    } catch (error) {
      await handleSupabaseError(error, OperationType.UPDATE, 'tribes');
      addToast('Failed to leave tribe', 'error');
    }
  };

  const filteredTribes = tribes.filter(t => 
    t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (selectedTribeId) {
    const selectedTribe = tribes.find(t => t.id === selectedTribeId);
    if (selectedTribe) {
      return <TribeWorkspace tribe={selectedTribe} userProfile={userProfile} onBack={() => setSelectedTribeId(null)} addToast={addToast} />;
    }
  }

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
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedTribeId(tribe.id)}
                        className="flex-1 py-2.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-bold hover:bg-emerald-500/20 transition-all flex items-center justify-center gap-2"
                      >
                        <Zap className="w-4 h-4" />
                        Workspace
                      </button>
                      <button
                        onClick={() => handleLeave(tribe.id)}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-white/40 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all flex items-center justify-center"
                        title="Leave Tribe"
                      >
                        <LogOut className="w-4 h-4" />
                      </button>
                    </div>
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
