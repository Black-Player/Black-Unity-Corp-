import { useState, useEffect } from 'react';
import { Bell, BellDot, Settings, Trash2, Check, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { UserProfile } from '../types';

interface Notification {
  id: string;
  uid: string;
  title: string;
  message: string;
  type: 'signal' | 'system' | 'trade';
  read: boolean;
  created_at: string;
}

interface NotificationCenterProps {
  userProfile: UserProfile;
}

export default function NotificationCenter({ userProfile }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('uid', userProfile.uid)
          .order('created_at', { ascending: false })
          .limit(20);

        if (error) throw error;
        setNotifications(data as Notification[]);
        setUnreadCount(data?.filter(n => !n.read).length || 0);
      } catch (err) {
        await handleSupabaseError(err, OperationType.LIST, 'notifications');
      }
    };

    fetchNotifications();

    const channel = supabase
      .channel('notifications-center')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'notifications',
        filter: `uid=eq.${userProfile.uid}`
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid]);

  const markAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      await handleSupabaseError(err, OperationType.UPDATE, 'notifications');
    }
  };

  const clearAll = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('uid', userProfile.uid);
      if (error) throw error;
    } catch (err) {
      await handleSupabaseError(err, OperationType.DELETE, 'notifications');
    }
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 rounded-xl glass-card border-white/5 hover:border-gold/20 transition-all relative"
      >
        {unreadCount > 0 ? <BellDot className="text-gold" size={20} /> : <Bell className="text-white/60" size={20} />}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute right-0 mt-4 w-[calc(100vw-2rem)] sm:w-80 max-w-[320px] glass-card p-0 border-gold/20 shadow-2xl z-50 overflow-hidden"
            >
              <div className="p-4 border-b border-white/5 flex items-center justify-between bg-gold/5">
                <h3 className="font-bold text-sm uppercase tracking-widest">Cosmic Alerts</h3>
                <button 
                  onClick={clearAll}
                  className="text-[10px] text-white/40 hover:text-red-400 transition-all flex items-center gap-1"
                >
                  <Trash2 size={10} /> Clear All
                </button>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-white/20 italic text-sm">No new alerts from the Oracle.</div>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id}
                      className={`p-4 border-b border-white/5 hover:bg-white/5 transition-all cursor-pointer ${!n.read ? 'bg-gold/5' : ''}`}
                      onClick={() => markAsRead(n.id)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-bold ${!n.read ? 'text-gold' : 'text-white/80'}`}>{n.title}</p>
                          <p className="text-xs text-white/40 mt-1">{n.message}</p>
                          <p className="text-[10px] text-white/20 mt-2">{new Date(n.created_at).toLocaleTimeString()}</p>
                        </div>
                        {!n.read && <div className="w-2 h-2 bg-gold rounded-full mt-1.5" />}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
