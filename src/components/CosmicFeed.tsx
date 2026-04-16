import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Heart, Share2, TrendingUp, Zap, Globe, Users, Sparkles, Send } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase, handleSupabaseError, OperationType } from '../supabase';

interface Post {
  id: string;
  author_id: string;
  author_name: string;
  author_avatar: string;
  content: string;
  created_at: any;
  likes: string[];
  comments_count: number;
  type: 'Analysis' | 'Win' | 'Prophecy' | 'General';
  image?: string;
}

export default function CosmicFeed({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [newPost, setNewPost] = useState('');
  const [postType, setPostType] = useState<'Analysis' | 'Win' | 'Prophecy' | 'General'>('General');

  useEffect(() => {
    // Initial fetch
    const fetchPosts = async () => {
      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);
      
      if (error) {
        handleSupabaseError(error, OperationType.GET, 'posts');
      } else {
        setPosts(data as Post[]);
      }
      setLoading(false);
    };

    fetchPosts();

    // Subscribe to changes
    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'posts' 
      }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setPosts(prev => [payload.new as Post, ...prev.slice(0, 19)]);
        } else if (payload.eventType === 'UPDATE') {
          setPosts(prev => prev.map(p => p.id === (payload.new as Post).id ? payload.new as Post : p));
        } else if (payload.eventType === 'DELETE') {
          setPosts(prev => prev.filter(p => p.id !== (payload.old as Post).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    try {
      const { error } = await supabase
        .from('posts')
        .insert([{
          uid: userProfile.uid,
          username: userProfile.email.split('@')[0],
          avatar_url: `https://picsum.photos/seed/${userProfile.uid}/100/100`,
          content: newPost,
          created_at: new Date().toISOString(),
          likes: [],
          comments_count: 0,
          type: postType
        }]);
      
      if (error) throw error;
      
      setNewPost('');
      addToast('Prophecy shared with the tribe.', 'success');
    } catch (error) {
      console.error(error);
      addToast('Failed to share ritual', 'error');
    }
  };

  const handleLike = async (postId: string, currentLikes: string[]) => {
    const isLiked = currentLikes.includes(userProfile.uid);
    const newLikes = isLiked 
      ? currentLikes.filter(id => id !== userProfile.uid)
      : [...currentLikes, userProfile.uid];

    try {
      const { error } = await supabase
        .from('posts')
        .update({
          likes: newLikes
        })
        .eq('id', postId);
      
      if (error) throw error;
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 pb-12">
      <header>
        <h1 className="text-3xl font-display font-bold gold-gradient">Cosmic Feed</h1>
        <p className="text-white/40">Connect with the tribe and share your trading rituals.</p>
      </header>

      <div className="glass-card p-6 space-y-4 border-gold/20 bg-gold/5">
        <div className="flex gap-4">
          <img 
            src={`https://picsum.photos/seed/${userProfile.uid}/100/100`} 
            alt="Avatar" 
            className="w-12 h-12 rounded-full border-2 border-gold/50"
            referrerPolicy="no-referrer"
          />
          <textarea 
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What does the Oracle reveal to you today?"
            className="flex-1 bg-transparent border-none text-white placeholder:text-white/20 focus:ring-0 resize-none py-2"
            rows={2}
          />
        </div>
        <div className="flex items-center justify-between pt-4 border-t border-white/5">
          <div className="flex gap-4">
            <select 
              value={postType}
              onChange={(e) => setPostType(e.target.value as any)}
              className="bg-white/5 border border-white/10 rounded-lg text-[10px] font-bold uppercase tracking-widest text-white/60 px-2 py-1 outline-none"
            >
              <option value="General">General</option>
              <option value="Analysis">Analysis</option>
              <option value="Win">Win</option>
              <option value="Prophecy">Prophecy</option>
            </select>
          </div>
          <button 
            onClick={handlePost}
            className="gold-button px-6 py-2 flex items-center gap-2"
          >
            <Send size={16} /> Share Ritual
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="text-center py-20">
            <Sparkles className="w-8 h-8 text-gold/20 animate-pulse mx-auto mb-4" />
            <p className="text-white/20 italic">Consulting the cosmic archives...</p>
          </div>
        ) : (
          <AnimatePresence>
            {posts.map((post, index) => (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="glass-card overflow-hidden group"
              >
                <div className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <img src={post.author_avatar} alt={post.author_name} className="w-10 h-10 rounded-full border border-gold/30" referrerPolicy="no-referrer" />
                      <div>
                        <p className="font-bold text-sm">{post.author_name}</p>
                        <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">
                          {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                      post.type === 'Win' ? 'bg-emerald-400/10 text-emerald-400 border border-emerald-400/20' :
                      post.type === 'Prophecy' ? 'bg-gold/10 text-gold border border-gold/20' :
                      'bg-white/5 text-white/40 border border-white/10'
                    }`}>
                      {post.type}
                    </span>
                  </div>

                  <p className="text-white/80 leading-relaxed">{post.content}</p>

                  {post.image && (
                    <div className="rounded-xl overflow-hidden border border-white/10">
                      <img src={post.image} alt="Post content" className="w-full h-auto" referrerPolicy="no-referrer" />
                    </div>
                  )}

                  <div className="flex items-center gap-6 pt-4 border-t border-white/5">
                    <button 
                      onClick={() => handleLike(post.id, post.likes)}
                      className={`flex items-center gap-2 transition-all text-xs font-bold ${
                        post.likes.includes(userProfile.uid) ? 'text-red-400' : 'text-white/40 hover:text-red-400'
                      }`}
                    >
                      <Heart size={16} fill={post.likes.includes(userProfile.uid) ? 'currentColor' : 'none'} /> {post.likes.length}
                    </button>
                    <button className="flex items-center gap-2 text-white/40 hover:text-gold transition-all text-xs font-bold">
                      <MessageSquare size={16} /> {post.comments_count}
                    </button>
                    <button className="flex items-center gap-2 text-white/40 hover:text-gold transition-all text-xs font-bold ml-auto">
                      <Share2 size={16} />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
