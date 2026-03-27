import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, AlertTriangle, Info, Clock, Globe, Shield, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { getEconomicEvents } from '../services/aiService';
import { EconomicEvent } from '../types';

export const EconomicCalendar: React.FC = () => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getEconomicEvents();
        setEvents(data);
      } catch (error) {
        console.error("Failed to fetch economic events", error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'medium': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'low': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30">
            <Calendar className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Economic Calendar</h2>
            <p className="text-sm text-blue-200/60">AI-analyzed high-impact market events</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-blue-200/60 animate-pulse">Consulting the cosmic timeline...</p>
        </div>
      ) : events.length > 0 ? (
        <div className="grid gap-4">
          {events.map((event, index) => (
            <motion.div
              key={event.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-all duration-300"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border ${getImpactColor(event.impact)}`}>
                    {event.impact} Impact
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-white group-hover:text-blue-400 transition-colors">
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs text-blue-200/40">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {event.currency}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.time).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-3">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-blue-400 mt-0.5" />
                  <p className="text-sm text-blue-100/80 leading-relaxed italic">
                    "{event.ai_analysis}"
                  </p>
                </div>
                <div className="pt-3 border-t border-blue-500/10 flex items-center gap-2">
                  <Shield className="w-3 h-3 text-emerald-400" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Strategy: {event.impact === 'high' ? 'Wait for Volatility' : 'Mean Reversion'}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-10 text-center">
          <AlertTriangle className="w-10 h-10 text-yellow-400 mx-auto mb-4 opacity-50" />
          <p className="text-blue-200/60">No high-impact events detected in the immediate future.</p>
        </div>
      )}
    </div>
  );
};
