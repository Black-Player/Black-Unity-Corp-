import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, Heart, MessageSquare, UserPlus, Zap, Trash2, CheckCircle2, Clock } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { collection, query, onSnapshot, doc, deleteDoc, updateDoc, orderBy, limit, where } from 'firebase/firestore';
import { UserProfile } from '../types';

interface Notification {
  id: string;
  type: 'like' | 'comment' | 'follow' | 'signal' | 'system';
  from_user_id?: string;
  from_username?: string;
  from_avatar?: string;
  post_id?: string;
  content?: string;
  created_at: string;
  read: boolean;
}

interface NotificationsProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setTargetUserId: (id: string) => void;
  setActivePage: (page: string) => void;
}

export const Notifications: React.FC<NotificationsProps> = ({ 
  userProfile, 
  addToast,
  setTargetUserId,
  setActivePage
}) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'users', userProfile.uid, 'notifications'),
      orderBy('created_at', 'desc'),
      limit(50)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification));
      setNotifications(data);
      setLoading(false);
    }, (err) => {
      handleFirestoreError(err, OperationType.GET, `users/${userProfile.uid}/notifications`);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  const markAsRead = async (id: string) => {
    try {
      const notifRef = doc(db, 'users', userProfile.uid, 'notifications', id);
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const notifRef = doc(db, 'users', userProfile.uid, 'notifications', id);
      await deleteDoc(notifRef);
      addToast('Notification removed', 'info');
    } catch (err) {
      console.error(err);
      addToast('Failed to remove notification', 'error');
    }
  };

  const markAllAsRead = async () => {
    try {
      const unread = notifications.filter(n => !n.read);
      for (const n of unread) {
        const notifRef = doc(db, 'users', userProfile.uid, 'notifications', n.id);
        await updateDoc(notifRef, { read: true });
      }
      addToast('All notifications marked as read', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);
    
    if (notif.from_user_id) {
      setTargetUserId(notif.from_user_id);
      setActivePage('profile');
    } else if (notif.post_id) {
      setActivePage('social');
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'like': return <Heart className="text-rose-400" size={16} />;
      case 'comment': return <MessageSquare className="text-blue-400" size={16} />;
      case 'follow': return <UserPlus className="text-emerald-400" size={16} />;
      case 'signal': return <Zap className="text-gold" size={16} />;
      default: return <Bell className="text-white/40" size={16} />;
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gold/20 rounded-lg border border-gold/30 shrink-0">
            <Bell className="w-5 h-5 text-gold" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight truncate">Cosmic Alerts</h2>
            <p className="text-xs sm:text-sm text-white/40 truncate">Stay synced with the Oracle network</p>
          </div>
        </div>

        {notifications.some(n => !n.read) && (
          <button 
            onClick={markAllAsRead}
            className="w-full sm:w-auto px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white/60 transition-all border border-white/10"
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4">
        {loading ? (
          <div className="py-20 flex justify-center">
            <div className="w-8 h-8 border-2 border-gold/20 border-t-gold rounded-full animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="glass-card p-12 sm:p-20 text-center space-y-4 border-white/5">
            <Bell className="mx-auto text-white/10" size={48} />
            <p className="text-sm text-white/40">The cosmic void is silent. No alerts found.</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {notifications.map((notif) => (
              <motion.div
                key={notif.id}
                layout
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`glass-card p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 group transition-all border-white/5 hover:border-gold/20 ${!notif.read ? 'bg-gold/5 border-gold/20' : ''}`}
              >
                <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                  <div 
                    className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/5 overflow-hidden flex-shrink-0 cursor-pointer border border-white/10"
                    onClick={() => handleNotificationClick(notif)}
                  >
                    {notif.from_avatar ? (
                      <img src={notif.from_avatar} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/20">
                        <Bell size={18} />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleNotificationClick(notif)}>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mb-1">
                      <span className="p-1 bg-white/5 rounded-md shrink-0">
                        {getIcon(notif.type)}
                      </span>
                      <span className="text-[10px] sm:text-xs font-bold text-white truncate max-w-[100px] sm:max-w-none">
                        {notif.from_username || 'System'}
                      </span>
                      <span className="text-[8px] sm:text-[10px] text-white/40 flex items-center gap-1 shrink-0">
                        <Clock size={8} className="sm:w-2.5 sm:h-2.5" />
                        {new Date(notif.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[10px] sm:text-sm text-white/60 line-clamp-2 sm:line-clamp-none">
                      {notif.content}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 sm:opacity-0 sm:group-hover:opacity-100 transition-all pt-2 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  {!notif.read && (
                    <button 
                      onClick={() => markAsRead(notif.id)}
                      className="p-2 bg-emerald-400/10 text-emerald-400 rounded-lg hover:bg-emerald-400/20 transition-colors"
                      title="Mark as read"
                    >
                      <CheckCircle2 size={16} />
                    </button>
                  )}
                  <button 
                    onClick={() => deleteNotification(notif.id)}
                    className="p-2 bg-rose-400/10 text-rose-400 rounded-lg hover:bg-rose-400/20 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};
