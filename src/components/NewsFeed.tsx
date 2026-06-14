import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Newspaper, ExternalLink, MessageSquare, TrendingUp, TrendingDown, Clock, Sparkles } from 'lucide-react';
import { getMarketNews } from '../services/aiService';
import { MarketNews } from '../types';

export const NewsFeed: React.FC = () => {
  const [news, setNews] = useState<MarketNews[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        const data = await getMarketNews();
        setNews(data);
      } catch (err: any) {
        if (!String(err).includes('quota') && !String(err).includes('Quota') && err.status !== "RESOURCE_EXHAUSTED") {
            console.error('Failed to fetch news:', err);
        }
        if (err.message?.includes("quota") || err.message?.includes("429") || err.status === "RESOURCE_EXHAUSTED") {
            setError("Quota exceeded. Please check your Gemini API plan.");
        } else {
            setError("News stream temporarily interrupted.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
    const interval = setInterval(fetchNews, 300000); // Refresh every 5 minutes
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-24 bg-white/5 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
        <p className="text-xs text-red-300">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AnimatePresence mode="popLayout">
        {news.map((item, index) => (
          <motion.div
            key={item.id || index}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ delay: index * 0.1 }}
            className="glass-card p-4 group border-white/5 hover:border-gold/20 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest ${
                    item.sentiment === 'bullish' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    item.sentiment === 'bearish' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                    'bg-white/5 text-white/40 border border-white/10'
                  }`}>
                    {item.sentiment}
                  </span>
                  <span className="text-[10px] text-white/20 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {item.time}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-gold">
                  <Sparkles className="w-3 h-3" />
                  AI Analysis
                </div>
              </div>

              <h4 className="text-sm font-bold text-white group-hover:text-gold transition-colors line-clamp-2 leading-snug">
                {item.title}
              </h4>

              <p className="text-xs text-white/40 line-clamp-2 leading-relaxed italic">
                "{item.content}"
              </p>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 text-[10px] text-white/20">
                    <TrendingUp className="w-3 h-3 text-emerald-400" />
                    Impact: {item.impact}
                  </div>
                </div>
                <button className="p-1 text-white/20 hover:text-gold transition-colors">
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {news.length === 0 && (
        <div className="text-center py-8 text-white/20 italic text-sm">
          No celestial updates at this moment...
        </div>
      )}
    </div>
  );
};
