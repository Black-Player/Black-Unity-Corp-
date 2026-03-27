import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Heart, Share2, TrendingUp, Zap, Globe, Users, Sparkles, Send } from 'lucide-react';
import { UserProfile } from '../types';

interface Post {
  id: string;
  author: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
  comments: number;
  type: 'Analysis' | 'Win' | 'Prophecy' | 'General';
  image?: string;
}

export default function CosmicFeed({ userProfile, addToast }: { userProfile: UserProfile, addToast: any }) {
  const [posts, setPosts] = useState<Post[]>([
    {
      id: '1',
      author: 'Zion Master',
      avatar: 'https://picsum.photos/seed/zion/100/100',
      content: 'Just caught a massive 1:5 RR on V75s using the new Zion Trend indicator! The cosmic alignment was perfect.',
      timestamp: '2h ago',
      likes: 124,
      comments: 18,
      type: 'Win',
      image: 'https://picsum.photos/seed/trade1/800/400'
    },
    {
      id: '2',
      author: 'Cosmic Oracle',
      avatar: 'https://picsum.photos/seed/oracle/100/100',
      content: 'The solar frequencies suggest a high volatility period for the next 4 hours. Tighten your stops, warriors.',
      timestamp: '4h ago',
      likes: 89,
      comments: 12,
      type: 'Prophecy'
    },
    {
      id: '3',
      author: 'Zulu Trader',
      avatar: 'https://picsum.photos/seed/zulu/100/100',
      content: 'Who else is watching the Gold retest at 2150? Looking for a liquidity sweep before the pump.',
      timestamp: '6h ago',
      likes: 56,
      comments: 24,
      type: 'Analysis'
    }
  ]);

  const [newPost, setNewPost] = useState('');

  const handlePost = () => {
    if (!newPost.trim()) return;
    const post: Post = {
      id: Math.random().toString(36).substring(7),
      author: userProfile.email.split('@')[0],
      avatar: `https://picsum.photos/seed/${userProfile.uid}/100/100`,
      content: newPost,
      timestamp: 'Just now',
      likes: 0,
      comments: 0,
      type: 'General'
    };
    setPosts([post, ...posts]);
    setNewPost('');
    addToast('Prophecy shared with the tribe.', 'success');
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
            <button className="text-white/40 hover:text-gold transition-all"><Globe size={18} /></button>
            <button className="text-white/40 hover:text-gold transition-all"><Users size={18} /></button>
            <button className="text-white/40 hover:text-gold transition-all"><Zap size={18} /></button>
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
                    <img src={post.avatar} alt={post.author} className="w-10 h-10 rounded-full border border-gold/30" referrerPolicy="no-referrer" />
                    <div>
                      <p className="font-bold text-sm">{post.author}</p>
                      <p className="text-[10px] text-white/40 uppercase tracking-widest font-bold">{post.timestamp}</p>
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
                  <button className="flex items-center gap-2 text-white/40 hover:text-red-400 transition-all text-xs font-bold">
                    <Heart size={16} /> {post.likes}
                  </button>
                  <button className="flex items-center gap-2 text-white/40 hover:text-gold transition-all text-xs font-bold">
                    <MessageSquare size={16} /> {post.comments}
                  </button>
                  <button className="flex items-center gap-2 text-white/40 hover:text-gold transition-all text-xs font-bold ml-auto">
                    <Share2 size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
