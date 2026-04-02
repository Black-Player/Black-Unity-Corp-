import React, { useState, useEffect } from 'react';
import { User, Mail, Shield, Zap, TrendingUp, TrendingDown, Clock, Edit2, Save, X, Camera, Globe, Twitter, Github, Linkedin, GraduationCap, Trophy, AlertTriangle, Send, Key } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Tier, AdvancementRequest } from '../types';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { doc, onSnapshot, updateDoc, collection, addDoc, query, where, getDocs, orderBy, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import KeyGenerator from './KeyGenerator';

interface ProfileProps {
  userProfile: UserProfile;
  targetUserId?: string;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function Profile({ userProfile, targetUserId, addToast }: ProfileProps) {
  const isOwnProfile = !targetUserId || targetUserId === userProfile.uid;
  const [profile, setProfile] = useState<UserProfile | null>(isOwnProfile ? userProfile : null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedBio, setEditedBio] = useState(userProfile.bio || '');
  const [editedUsername, setEditedUsername] = useState(userProfile.username || '');
  const [editedAvatar, setEditedAvatar] = useState(userProfile.avatar_url || '');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(!isOwnProfile);
  const [submittingRequest, setSubmittingRequest] = useState(false);

  useEffect(() => {
    if (!isOwnProfile && targetUserId) {
      setLoading(true);
      const unsubscribe = onSnapshot(doc(db, 'users', targetUserId), (snapshot) => {
        if (snapshot.exists()) {
          setProfile(snapshot.data() as UserProfile);
        }
        setLoading(false);
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${targetUserId}`);
        setLoading(false);
      });
      return () => unsubscribe();
    }
  }, [targetUserId, isOwnProfile]);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    try {
      const userRef = doc(db, 'users', profile.uid);
      await updateDoc(userRef, {
        username: editedUsername,
        bio: editedBio,
        avatar_url: editedAvatar
      });
      setIsEditing(false);
      addToast('Profile updated successfully', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${profile.uid}`);
    } finally {
      setSaving(false);
    }
  };

  const handleRequestAdvancement = async () => {
    if (!profile || profile.role !== 'student') return;
    setSubmittingRequest(true);
    try {
      const request: Partial<AdvancementRequest> = {
        user_id: profile.uid,
        current_tier: profile.student_tier!,
        target_tier: profile.student_tier === 'initiate' ? 'oracle' : (profile.student_tier === 'oracle' ? 'zion' : 'ascended'),
        status: 'pending',
        ap_at_request: profile.ap,
        created_at: new Date().toISOString()
      };
      await addDoc(collection(db, 'advancement_requests'), request);
      addToast('Advancement request submitted to the Creator.', 'success');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'advancement_requests');
    } finally {
      setSubmittingRequest(false);
    }
  };

  const handleFollow = async () => {
    if (!profile || isOwnProfile) return;
    const isFollowing = userProfile.followed_traders?.includes(profile.uid);
    
    try {
      const currentUserRef = doc(db, 'users', userProfile.uid);
      const targetUserRef = doc(db, 'users', profile.uid);

      if (isFollowing) {
        await updateDoc(currentUserRef, {
          followed_traders: arrayRemove(profile.uid),
          following_count: (userProfile.following_count || 1) - 1
        });
        await updateDoc(targetUserRef, {
          followers_count: (profile.followers_count || 1) - 1
        });
        addToast(`Unfollowed ${profile.username}`, 'info');
      } else {
        await updateDoc(currentUserRef, {
          followed_traders: arrayUnion(profile.uid),
          following_count: (userProfile.following_count || 0) + 1
        });
        await updateDoc(targetUserRef, {
          followers_count: (profile.followers_count || 0) + 1
        });
        addToast(`Following ${profile.username}`, 'success');
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin text-gold"><Zap size={48} /></div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="text-center py-20">
        <User className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-white">Oracle Not Found</h2>
        <p className="text-white/40">This user does not exist in the Zion network.</p>
      </div>
    );
  }

  const getTierColor = (tier: Tier) => {
    switch (tier) {
      case 'mythic': return 'text-purple-400';
      case 'legendary': return 'text-gold';
      case 'zion': return 'text-blue-400';
      case 'oracle': return 'text-emerald-400';
      default: return 'text-slate-400';
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Profile Header */}
      <div className="relative">
        <div className="h-48 rounded-3xl bg-gradient-to-r from-gold/20 via-purple-500/10 to-blue-500/20 border border-white/10 overflow-hidden">
          <div className="absolute inset-0 bg-[url('https://picsum.photos/seed/cosmic/1920/1080')] opacity-20 bg-cover bg-center" />
        </div>
        
        <div className="px-8 -mt-16 flex flex-col md:flex-row md:items-end gap-6 relative z-10">
          <div className="relative group">
            <div className="w-32 h-32 rounded-3xl bg-cosmic-black border-4 border-cosmic-black shadow-2xl overflow-hidden relative">
              {isEditing ? (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center cursor-pointer group">
                  <Camera className="text-white w-8 h-8 opacity-60 group-hover:opacity-100 transition-opacity" />
                  <input 
                    type="text" 
                    value={editedAvatar} 
                    onChange={(e) => setEditedAvatar(e.target.value)}
                    placeholder="Avatar URL"
                    className="absolute bottom-0 left-0 w-full bg-black/80 text-[10px] text-white p-1 focus:outline-none"
                  />
                </div>
              ) : null}
              {profile.avatar_url || editedAvatar ? (
                <img src={isEditing ? editedAvatar : profile.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5">
                  <User className="w-12 h-12 text-white/20" />
                </div>
              )}
            </div>
          </div>

          <div className="flex-1 pb-2">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                {isEditing ? (
                  <input
                    type="text"
                    value={editedUsername}
                    onChange={(e) => setEditedUsername(e.target.value)}
                    className="text-3xl font-bold bg-white/5 border border-white/10 rounded-xl px-3 py-1 text-white focus:outline-none focus:ring-2 focus:ring-gold/50"
                  />
                ) : (
                  <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                    {profile.username || profile.email.split('@')[0]}
                    <Zap className="w-6 h-6 text-gold fill-gold" />
                  </h1>
                )}
                <div className="flex items-center gap-4 mt-2">
                  <span className={`text-sm font-bold uppercase tracking-widest ${getTierColor(profile.tier)}`}>
                    {profile.tier} Oracle
                  </span>
                  <span className="text-white/40 text-sm flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Joined {new Date(profile.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-6 mt-4">
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-white">{profile.followers_count || 0}</span>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Followers</span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xl font-bold text-white">{profile.following_count || 0}</span>
                    <span className="text-[10px] text-white/40 uppercase tracking-widest font-bold">Following</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                {!isOwnProfile && (
                  <button
                    onClick={handleFollow}
                    className={`px-8 py-2.5 rounded-xl font-bold transition-all ${
                      userProfile.followed_traders?.includes(profile.uid)
                        ? 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                        : 'bg-gold text-black hover:bg-gold/80'
                    }`}
                  >
                    {userProfile.followed_traders?.includes(profile.uid) ? 'Following' : 'Follow Oracle'}
                  </button>
                )}
                {isOwnProfile && (
                  <button
                    onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                    disabled={saving}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                      isEditing 
                        ? 'bg-emerald-500 text-black hover:bg-emerald-400' 
                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                    }`}
                  >
                    {saving ? (
                      <Zap className="w-4 h-4 animate-spin" />
                    ) : isEditing ? (
                      <Save className="w-4 h-4" />
                    ) : (
                      <Edit2 className="w-4 h-4" />
                    )}
                    {isEditing ? 'Save Profile' : 'Edit Profile'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Creator Key Generator Section */}
      {profile.role === 'creator' && isOwnProfile && (
        <KeyGenerator addToast={addToast} />
      )}

      {/* Student Progression Section */}
      {profile.role === 'student' && isOwnProfile && (
        <div className="glass-card p-8 border-blue-500/20 bg-blue-500/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GraduationCap className="text-blue-400" size={24} />
              <h3 className="text-xl font-display font-bold uppercase tracking-widest">Student Progression</h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-400/10 text-blue-400 text-[10px] font-bold uppercase tracking-widest">
              {profile.student_tier} — {profile.student_rank}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-blue-400">
                <Trophy size={16} />
                <span className="text-[10px] uppercase font-bold tracking-widest">Advancement Points</span>
              </div>
              <p className="text-3xl font-mono font-bold">{profile.ap}</p>
              <p className="text-[10px] text-white/40 italic">Earned through discipline & results.</p>
            </div>

            <div className="p-4 rounded-2xl bg-white/5 border border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-rose-400">
                <AlertTriangle size={16} />
                <span className="text-[10px] uppercase font-bold tracking-widest">Penalties</span>
              </div>
              <p className="text-3xl font-mono font-bold">{profile.penalties}</p>
              <p className="text-[10px] text-white/40 italic">Deducted for rule violations.</p>
            </div>

            <div className="flex items-center">
              <button 
                onClick={handleRequestAdvancement}
                disabled={submittingRequest || profile.ap < 1000}
                className={`w-full py-4 rounded-xl font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${
                  profile.ap >= 1000 
                    ? 'bg-blue-500 text-white hover:bg-blue-400 shadow-lg shadow-blue-500/20' 
                    : 'bg-white/5 text-white/20 cursor-not-allowed'
                }`}
              >
                {submittingRequest ? <Zap className="animate-spin" size={18} /> : <Send size={18} />}
                Request Advancement
              </button>
            </div>
          </div>

          {profile.ap < 1000 && (
            <p className="text-xs text-white/40 text-center italic">
              You need at least <span className="text-blue-400 font-bold">1000 AP</span> to request advancement to the next tier.
            </p>
          )}
        </div>
      )}

      {/* Investor Nexus Section */}
      {profile.role === 'investor' && isOwnProfile && (
        <div className="glass-card p-8 border-emerald-500/20 bg-emerald-500/5 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Send className="text-emerald-400" size={24} />
              <h3 className="text-xl font-display font-bold uppercase tracking-widest">Investor Nexus</h3>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-400/10 text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
              Private Access
            </span>
          </div>
          <p className="text-sm text-white/60 leading-relaxed">
            As a verified Investor, you have exclusive access to the **Investor Nexus WhatsApp Group**. 
            Connect with the Creator and other high-level partners for private insights and strategy discussions.
          </p>
          <a 
            href="https://chat.whatsapp.com/example-investor-nexus" 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-8 py-3 rounded-xl bg-emerald-500 text-black font-bold hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
          >
            Join Investor Nexus
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Info */}
        <div className="space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-6">
            <h3 className="text-lg font-bold text-white">Cosmic Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Win Rate</p>
                <p className="text-2xl font-mono font-bold text-gold">{profile.win_rate}%</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Level</p>
                <p className="text-2xl font-mono font-bold text-purple-400">{profile.level}</p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Total P/L</p>
                <p className={`text-xl font-mono font-bold ${profile.total_pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ${profile.total_pnl.toLocaleString()}
                </p>
              </div>
              <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold mb-1">Rituals</p>
                <p className="text-2xl font-mono font-bold text-blue-400">{profile.stats?.total_trades || 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 space-y-4">
            <h3 className="text-lg font-bold text-white">Social Links</h3>
            <div className="space-y-3">
              <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                <Twitter className="w-5 h-5" />
                <span className="text-sm">Twitter / X</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                <Github className="w-5 h-5" />
                <span className="text-sm">GitHub</span>
              </button>
              <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all">
                <Linkedin className="w-5 h-5" />
                <span className="text-sm">LinkedIn</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Bio & Activity */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 space-y-4">
            <h3 className="text-xl font-bold text-white">Prophecy Bio</h3>
            {isEditing ? (
              <textarea
                value={editedBio}
                onChange={(e) => setEditedBio(e.target.value)}
                placeholder="Tell the Zion network about your trading journey..."
                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white placeholder:text-white/20 focus:outline-none focus:ring-2 focus:ring-gold/50 min-h-[150px] resize-none"
              />
            ) : (
              <p className="text-white/60 leading-relaxed whitespace-pre-wrap">
                {profile.bio || "This Oracle has not yet written their prophecy."}
              </p>
            )}
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-8">
            <h3 className="text-xl font-bold text-white mb-6">Recent Activity</h3>
            <div className="flex flex-col items-center justify-center py-12 opacity-40">
              <Clock className="w-12 h-12 mb-4" />
              <p className="text-sm">No recent activity recorded in the celestial feed.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
