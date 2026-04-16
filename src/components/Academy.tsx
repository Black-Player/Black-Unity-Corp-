import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GraduationCap, BookOpen, CheckCircle2, Star, Clock, ArrowRight, Search, Lock } from 'lucide-react';
import { supabase, handleSupabaseError, OperationType } from '../supabase';
import { UserProfile, UserProgress, Tier, hasTierAccess } from '../types';
import { ACADEMY_ARTICLES, Article } from '../constants';

interface AcademyProps {
  userProfile: UserProfile;
  addToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  setActiveTab: (tab: string) => void;
}

export const Academy: React.FC<AcademyProps> = ({ userProfile, addToast, setActiveTab }) => {
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);

  useEffect(() => {
    const fetchProgress = async () => {
      const { data, error } = await supabase
        .from('academy_progress')
        .select('*')
        .eq('uid', userProfile.uid)
        .maybeSingle();
      
      if (error) {
        handleSupabaseError(error, OperationType.GET, `academy_progress/${userProfile.uid}`);
      } else if (data) {
        setProgress(data as UserProgress);
      } else {
        setProgress({ xp: 0, level: 1, completed_lessons: [] });
      }
    };

    fetchProgress();

    // Subscribe to changes
    const channel = supabase
      .channel(`public:academy_progress:uid=eq.${userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'academy_progress', 
        filter: `uid=eq.${userProfile.uid}` 
      }, (payload) => {
        setProgress(payload.new as UserProgress);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid]);

  const handleComplete = async (articleId: string) => {
    if (progress?.completed_lessons.includes(articleId)) return;

    try {
      const newCompleted = [...(progress?.completed_lessons || []), articleId];
      const newXp = (progress?.xp || 0) + 100;

      const { error } = await supabase
        .from('academy_progress')
        .upsert({
          uid: userProfile.uid,
          completed_lessons: newCompleted,
          xp: newXp,
          level: Math.floor(newXp / 1000) + 1
        });
      
      if (error) throw error;
      addToast('Lesson completed! +100 XP earned.', 'success');
    } catch (error) {
      handleSupabaseError(error, OperationType.UPDATE, `academy_progress/${userProfile.uid}`);
    }
  };

  const filteredArticles = ACADEMY_ARTICLES.filter(a => 
    a.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <GraduationCap className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Oracle Academy</h2>
            <p className="text-sm text-white/40">Master the art of celestial trading</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input
              type="text"
              placeholder="Search academy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm focus:border-blue-500/50 outline-none w-full md:w-64"
            />
          </div>
          <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-xl flex items-center gap-3">
            <Star className="w-4 h-4 text-gold" />
            <span className="text-sm font-bold text-white">{progress?.xp || 0} XP</span>
          </div>
        </div>
      </div>

      {selectedArticle ? (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <button 
            onClick={() => setSelectedArticle(null)}
            className="flex items-center gap-2 text-sm text-white/40 hover:text-white transition-colors"
          >
            <ArrowRight className="w-4 h-4 rotate-180" />
            Back to Academy
          </button>

          <div className="glass-card p-8 space-y-8 border-blue-500/10">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-2 py-1 bg-blue-500/10 border border-blue-500/20 rounded text-[10px] font-bold text-blue-400 uppercase tracking-widest">
                  {selectedArticle.category}
                </span>
                <span className="text-xs text-white/20">{selectedArticle.read_time} read</span>
              </div>
              <h1 className="text-3xl font-bold text-white tracking-tight">{selectedArticle.title}</h1>
            </div>

            <img 
              src={selectedArticle.image_url} 
              alt={selectedArticle.title}
              className="w-full h-64 object-cover rounded-2xl border border-white/10"
              referrerPolicy="no-referrer"
            />

            <div className="prose prose-invert max-w-none">
              <p className="text-lg text-white/60 leading-relaxed">
                {selectedArticle.content}
              </p>
            </div>

            <div className="pt-8 border-t border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-white/20">Difficulty</span>
                  <span className="text-sm font-bold text-white">{selectedArticle.difficulty}</span>
                </div>
              </div>
              {!progress?.completed_lessons.includes(selectedArticle.id) ? (
                <button
                  onClick={() => handleComplete(selectedArticle.id)}
                  className="px-8 py-3 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg shadow-blue-500/20"
                >
                  Mark as Completed (+100 XP)
                </button>
              ) : (
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <CheckCircle2 className="w-5 h-5" />
                  Completed
                </div>
              )}
            </div>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredArticles.map((article, index) => {
            const isCompleted = progress?.completed_lessons.includes(article.id);
            const hasAccess = !article.requiredTier || hasTierAccess(userProfile.tier, article.requiredTier as Tier);
            
            return (
              <motion.div
                key={article.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                onClick={() => {
                  if (hasAccess) {
                    setSelectedArticle(article);
                  } else {
                    addToast(`${article.title} requires ${article.requiredTier} Tier or higher.`, 'info');
                    setActiveTab('subscription');
                  }
                }}
                className={`glass-card group cursor-pointer border-white/5 hover:border-blue-500/30 transition-all duration-500 overflow-hidden ${!hasAccess ? 'opacity-75' : ''}`}
              >
                <div className="relative h-40">
                  <img 
                    src={article.image_url} 
                    alt={article.title}
                    className={`w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ${!hasAccess ? 'grayscale' : ''}`}
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                  {isCompleted && (
                    <div className="absolute top-4 right-4 p-1.5 bg-emerald-500 rounded-full shadow-lg">
                      <CheckCircle2 className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {!hasAccess && (
                    <div className="absolute top-4 right-4 p-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10">
                      <Lock className="w-3 h-3 text-gold" />
                    </div>
                  )}
                  <div className="absolute bottom-4 left-4 flex items-center gap-2">
                    <span className="px-2 py-1 bg-blue-500/20 backdrop-blur-md border border-blue-500/30 rounded text-[8px] font-bold text-blue-400 uppercase tracking-widest">
                      {article.category}
                    </span>
                    {article.requiredTier && article.requiredTier !== 'free' && (
                      <span className="px-2 py-1 bg-gold/20 backdrop-blur-md border border-gold/30 rounded text-[8px] font-bold text-gold uppercase tracking-widest">
                        {article.requiredTier}
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                    {article.title}
                  </h3>
                  <p className="text-xs text-white/40 line-clamp-2 leading-relaxed">
                    {article.content}
                  </p>
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-3 text-[10px] font-bold text-white/20 uppercase tracking-widest">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {article.read_time}
                      </span>
                      <span className="flex items-center gap-1">
                        <BookOpen className="w-3 h-3" />
                        {article.difficulty}
                      </span>
                    </div>
                    <ArrowRight className="w-4 h-4 text-white/20 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
