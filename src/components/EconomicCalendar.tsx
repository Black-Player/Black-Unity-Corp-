import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Calendar, AlertTriangle, Info, Clock, Globe, Shield, TrendingUp, TrendingDown, Target } from 'lucide-react';
import { getEconomicEvents } from '../services/aiService';
import { EconomicEvent } from '../types';

interface EconomicCalendarProps {
  compact?: boolean;
}

export const EconomicCalendar: React.FC<EconomicCalendarProps> = ({ compact = false }) => {
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const data = await getEconomicEvents();
        // If compact, only show high impact or first 3
        const filteredData = compact 
          ? data.filter(e => e.impact === 'high').slice(0, 3) 
          : data;
        setEvents(filteredData.length > 0 ? filteredData : data.slice(0, 2));
      } catch (err: any) {
        console.error("Failed to fetch economic events", err);
        if (err.message?.includes("quota") || err.message?.includes("429") || err.status === "RESOURCE_EXHAUSTED") {
            setError("Quota exceeded. Please check your Gemini API plan.");
        } else {
            setError("Oracle connection temporarily interrupted.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [compact]);

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-400 bg-red-400/10 border-red-400/20';
      case 'medium': return 'text-orange-400 bg-orange-400/10 border-orange-400/20';
      case 'low': return 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20';
      default: return 'text-blue-400 bg-blue-400/10 border-blue-400/20';
    }
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {!compact && (
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
      )}

      {compact && (
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gold" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Economic Oracle</h3>
          </div>
          <div className="flex items-center gap-1 px-2 py-0.5 bg-gold/10 border border-gold/20 rounded text-[10px] font-bold text-gold">
            High Impact
          </div>
        </div>
      )}

      {loading ? (
        <div className={`flex flex-col items-center justify-center ${compact ? 'py-10' : 'py-20'} space-y-4`}>
          <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-xs text-blue-200/60 animate-pulse">Consulting the cosmic timeline...</p>
        </div>
      ) : error ? (
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-2" />
          <p className="text-xs text-red-200">{error}</p>
        </div>
      ) : events.length > 0 ? (
        <div className="grid gap-4">
          {events.map((event, index) => (
            <motion.div
              key={event.id || index}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`group relative overflow-hidden bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl ${compact ? 'p-4' : 'p-5'} hover:bg-white/10 transition-all duration-300`}
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest border ${getImpactColor(event.impact)} mb-1`}>
                      {event.impact}
                    </div>
                    <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-semibold text-white group-hover:text-blue-400 transition-colors leading-tight`}>
                      {event.title}
                    </h3>
                    <div className="flex items-center gap-3 text-[10px] text-blue-200/40">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {event.currency}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(event.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={`${compact ? 'p-3' : 'p-4'} bg-blue-500/5 rounded-xl border border-blue-500/10 space-y-2`}>
                  <div className="flex items-start gap-2">
                    <Info className="w-3 h-3 text-blue-400 mt-0.5 shrink-0" />
                    <p className={`${compact ? 'text-[10px]' : 'text-sm'} text-blue-100/80 leading-relaxed italic`}>
                      {event.ai_analysis}
                    </p>
                  </div>
                  {!compact && (
                    <div className="pt-3 border-t border-blue-500/10 flex items-center gap-2">
                      <Shield className="w-3 h-3 text-emerald-400" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Strategy: {event.impact === 'high' ? 'Wait for Volatility' : 'Mean Reversion'}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 text-center">
          <AlertTriangle className="w-6 h-6 text-yellow-400 mx-auto mb-2 opacity-50" />
          <p className="text-xs text-blue-200/60">No high-impact events detected.</p>
        </div>
      )}
    </div>
  );
};
