import React, { useState, useEffect } from 'react';
import { MessageSquare, Heart, Share2, Send, User, Zap, TrendingUp, TrendingDown, Clock, MoreHorizontal, Image as ImageIcon, Link as LinkIcon, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SharedPost, UserProfile, Signal } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';

interface SocialProps {
  userProfile: UserProfile;
  setTargetUserId: (uid: string) => void;
  setActivePage: (page: string) => void;
}

export default function Social({ userProfile, setTargetUserId, setActivePage }: SocialProps) {
  const [posts, setPosts] = useState<SharedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPostContent, setNewPostContent] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentContent, setCommentContent] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [feedFilter, setFeedFilter] = useState<'all' | 'following'>('all');

  useEffect(() => {
    const fetchPosts = async () => {
      let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (feedFilter === 'following' && userProfile.followed_traders?.length) {
        query = query.in('uid', userProfile.followed_traders);
      } else if (feedFilter === 'following' && !userProfile.followed_traders?.length) {
        setPosts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await query;
      
      if (error) {
        await handleSupabaseError(error, OperationType.GET, 'posts');
      } else {
        setPosts(data as SharedPost[]);
      }
      setLoading(false);
    };

    fetchPosts();

    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, fetchPosts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [feedFilter, userProfile.followed_traders]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          uid: userProfile.uid,
          username: userProfile.username || userProfile.email.split('@')[0],
          avatar_url: userProfile.avatar_url,
          content: newPostContent,
          likes: [],
          comments: [],
          created_at: new Date().toISOString()
        }]);
      
      if (error) throw error;
      setNewPostContent('');
    } catch (error) {
      await handleSupabaseError(error, OperationType.CREATE, 'posts');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const newLikes = isLiked 
        ? post.likes.filter(id => id !== userProfile.uid)
        : [...new Set([...post.likes, userProfile.uid])];

      const { error } = await supabase
        .from('posts')
        .update({ likes: newLikes })
        .eq('id', postId);
      
      if (error) throw error;
    } catch (error) {
      await handleSupabaseError(error, OperationType.UPDATE, 'posts');
    }
  };

  const handleComment = async (postId: string) => {
    if (!commentContent.trim() || isCommenting) return;

    setIsCommenting(true);
    try {
      const post = posts.find(p => p.id === postId);
      if (!post) return;

      const newComment = {
        id: Math.random().toString(36).substring(7),
        uid: userProfile.uid,
        username: userProfile.username || userProfile.email.split('@')[0],
        content: commentContent,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('posts')
        .update({
          comments: [...(post.comments || []), newComment]
        })
        .eq('id', postId);
      
      if (error) throw error;
      setCommentContent('');
    } catch (error) {
      await handleSupabaseError(error, OperationType.UPDATE, 'posts');
    } finally {
      setIsCommenting(false);
    }
  };

  const handleUserClick = (uid: string) => {
    setTargetUserId(uid);
    setActivePage('profile');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-12">
      {/* Feed Header & Filters */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-display font-bold text-white">Celestial Feed</h2>
        <div className="flex bg-white/5 rounded-xl p-1 border border-white/5">
          <button
            onClick={() => setFeedFilter('all')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              feedFilter === 'all' ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            All Oracles
          </button>
          <button
            onClick={() => setFeedFilter('following')}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all ${
              feedFilter === 'following' ? 'bg-gold text-black' : 'text-white/40 hover:text-white'
            }`}
          >
            Following
          </button>
        </div>
      </div>

      {/* Create Post */}
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
        <form onSubmit={handleCreatePost} className="space-y-4">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
              {userProfile.avatar_url ? (
                <img src={userProfile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
              ) : (
                <User className="w-6 h-6 text-white/40" />
              )}
            </div>
            <textarea
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              placeholder="Share your market prophecy..."
              className="w-full bg-transparent border-none focus:ring-0 text-white placeholder:text-white/20 resize-none py-2 min-h-[100px]"
            />
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-white/5">
            <div className="flex items-center gap-2">
              <button type="button" className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-gold transition-colors">
                <ImageIcon className="w-5 h-5" />
              </button>
              <button type="button" className="p-2 hover:bg-white/5 rounded-lg text-white/40 hover:text-gold transition-colors">
                <LinkIcon className="w-5 h-5" />
              </button>
            </div>
            <button
              type="submit"
              disabled={!newPostContent.trim() || isSubmitting}
              className="bg-gold text-black px-6 py-2 rounded-xl font-bold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 transition-all"
            >
              {isSubmitting ? 'Channeling...' : (
                <>
                  <Send className="w-4 h-4" />
                  Prophesy
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Feed */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={`skeleton-${i}`} className="bg-white/5 border border-white/10 rounded-3xl p-6 animate-pulse">
                <div className="flex gap-4 mb-4">
                  <div className="w-12 h-12 rounded-full bg-white/10 shrink-0" />
                  <div className="space-y-2 w-full">
                    <div className="h-4 w-32 bg-white/10 rounded" />
                    <div className="h-3 w-24 bg-white/10 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 w-full bg-white/10 rounded" />
                  <div className="h-4 w-full bg-white/10 rounded" />
                  <div className="h-4 w-2/3 bg-white/10 rounded" />
                </div>
              </div>
            ))
          ) : (
            posts.map((post) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white/5 border border-white/10 rounded-3xl p-6 hover:border-white/20 transition-all group"
              >
                {/* Post Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3 cursor-pointer group/user" onClick={() => handleUserClick(post.uid)}>
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center border border-white/10 group-hover/user:border-gold/50 transition-colors">
                      {post.avatar_url ? (
                        <img src={post.avatar_url} alt={post.username} className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <User className="w-6 h-6 text-white/40" />
                      )}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-2 group-hover/user:text-gold transition-colors">
                        {post.username}
                        <Zap className="w-3 h-3 text-gold fill-gold" />
                      </div>
                      <div className="text-xs text-white/40 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Just now'}
                      </div>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-white/5 rounded-lg text-white/20 hover:text-white transition-colors">
                    <MoreHorizontal className="w-5 h-5" />
                  </button>
                </div>

                {/* Post Content */}
                <div className="text-white/80 leading-relaxed mb-6 whitespace-pre-wrap">
                  {post.content}
                </div>

                {/* Shared Signal Action */}
                {post.signal_id && (
                  <div className="mb-6 p-4 rounded-2xl bg-gold/5 border border-gold/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gold/20 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-gold" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Celestial Signal Attached</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest">Copy this Oracle's ritual</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        // In a real app, we'd fetch the signal and execute it
                        // For now, we'll just show a success message
                        alert("Copy Trading ritual initiated. Analyzing signal parameters...");
                      }}
                      className="px-4 py-2 rounded-lg bg-gold text-black text-xs font-bold hover:bg-gold/80 transition-all"
                    >
                      Copy Ritual
                    </button>
                  </div>
                )}

                {/* Post Actions */}
                <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                  <button
                    onClick={() => handleLike(post.id, post.likes.includes(userProfile.uid))}
                    className={`flex items-center gap-2 transition-colors ${
                      post.likes.includes(userProfile.uid) ? 'text-rose-400' : 'text-white/40 hover:text-rose-400'
                    }`}
                  >
                    <Heart className={`w-5 h-5 ${post.likes.includes(userProfile.uid) ? 'fill-current' : ''}`} />
                    <span className="text-sm font-bold">{post.likes.length}</span>
                  </button>
                  <button 
                    onClick={() => setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)}
                    className={`flex items-center gap-2 transition-colors ${
                      activeCommentPostId === post.id ? 'text-blue-400' : 'text-white/40 hover:text-blue-400'
                    }`}
                  >
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-sm font-bold">{post.comments.length}</span>
                  </button>
                  <button className="flex items-center gap-2 text-white/40 hover:text-gold transition-colors ml-auto">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Comments Section */}
                <AnimatePresence>
                  {activeCommentPostId === post.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-white/5 space-y-4 overflow-hidden"
                    >
                      <div className="space-y-3">
                        {post.comments.map((comment) => (
                          <div key={comment.id} className="flex gap-3">
                            <div 
                              className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0 cursor-pointer hover:border-gold/50 transition-colors"
                              onClick={() => handleUserClick(comment.uid)}
                            >
                              <User className="w-4 h-4 text-white/40" />
                            </div>
                            <div className="bg-white/5 rounded-2xl p-3 flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span 
                                  className="text-xs font-bold text-white cursor-pointer hover:text-gold transition-colors"
                                  onClick={() => handleUserClick(comment.uid)}
                                >
                                  {comment.username}
                                </span>
                                <span className="text-[10px] text-white/20">{new Date(comment.created_at).toLocaleDateString()}</span>
                              </div>
                              <p className="text-sm text-white/70">{comment.content}</p>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="flex gap-3 pt-2">
                        <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                          <User className="w-4 h-4 text-white/40" />
                        </div>
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={commentContent}
                            onChange={(e) => setCommentContent(e.target.value)}
                            placeholder="Add a comment..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-gold/50"
                            onKeyDown={(e) => e.key === 'Enter' && handleComment(post.id)}
                          />
                          <button
                            onClick={() => handleComment(post.id)}
                            disabled={!commentContent.trim() || isCommenting}
                            className="p-2 bg-gold text-black rounded-xl disabled:opacity-50"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
