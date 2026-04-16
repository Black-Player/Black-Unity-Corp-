import { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabase';
import { Trade, UserProfile } from '../types';
import { useMarketContext } from '../MarketContext';
import { speak } from '../lib/voice';

export function useTradeMonitor(
  userProfile: UserProfile, 
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void,
  onCloseTrade?: (trade: Trade, reason: string) => Promise<void>
) {
  const { marketPrices } = useMarketContext();
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const marketPricesRef = useRef(marketPrices);

  useEffect(() => {
    marketPricesRef.current = marketPrices;
  }, [marketPrices]);

  useEffect(() => {
    if (!userProfile.uid) return;

    // Initial fetch
    const fetchTrades = async () => {
      const { data, error } = await supabase
        .from('trades')
        .select('*')
        .eq('uid', userProfile.uid)
        .eq('status', 'open');
      
      if (error) {
        console.error("Trade monitor fetch error:", error);
      } else {
        setOpenTrades(data as Trade[]);
      }
    };

    fetchTrades();

    // Subscribe to changes
    const channel = supabase
      .channel(`public:trades:uid=eq.${userProfile.uid}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'trades', 
        filter: `uid=eq.${userProfile.uid}` 
      }, (payload) => {
        // This is a bit more complex because we need to filter by status 'open'
        // For simplicity, we'll just re-fetch or update the local state
        if (payload.eventType === 'INSERT' && (payload.new as Trade).status === 'open') {
          setOpenTrades(prev => [...prev, payload.new as Trade]);
        } else if (payload.eventType === 'UPDATE') {
          const updated = payload.new as Trade;
          if (updated.status === 'open') {
            setOpenTrades(prev => prev.map(t => t.id === updated.id ? updated : t));
          } else {
            setOpenTrades(prev => prev.filter(t => t.id !== updated.id));
          }
        } else if (payload.eventType === 'DELETE') {
          setOpenTrades(prev => prev.filter(t => t.id !== (payload.old as Trade).id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userProfile.uid]);

  // Monitor trades for TP/SL and update P/L
  useEffect(() => {
    if (openTrades.length === 0) return;

    const monitorInterval = setInterval(() => {
      const currentPrices = marketPricesRef.current;
      
      openTrades.forEach(async (trade) => {
        const currentPrice = currentPrices[trade.pair]?.price;
        if (!currentPrice) return;

        let shouldClose = false;
        let reason = '';

        // Check SL
        if (trade.type === 'buy' && currentPrice <= trade.stop_loss) {
          shouldClose = true;
          reason = 'Stop Loss hit';
        } else if (trade.type === 'sell' && currentPrice >= trade.stop_loss) {
          shouldClose = true;
          reason = 'Stop Loss hit';
        }

        // Check TP4 (Final TP)
        if (!shouldClose) {
          if (trade.type === 'buy' && currentPrice >= trade.tp4) {
            shouldClose = true;
            reason = 'Take Profit 4 hit';
          } else if (trade.type === 'sell' && currentPrice <= trade.tp4) {
            shouldClose = true;
            reason = 'Take Profit 4 hit';
          }
        }

        // Check TPs for notifications
        if (!shouldClose) {
          const tps = [
            { level: 'TP1', price: trade.tp1 },
            { level: 'TP2', price: trade.tp2 },
            { level: 'TP3', price: trade.tp3 }
          ];

          for (const tp of tps) {
            const hit = trade.type === 'buy' ? currentPrice >= tp.price : currentPrice <= tp.price;
            const alreadyHit = trade.tp_hits?.includes(tp.level);

            if (hit && !alreadyHit) {
              try {
                const newTpHits = [...(trade.tp_hits || []), tp.level];
                await supabase
                  .from('trades')
                  .update({
                    tp_hits: newTpHits
                  })
                  .eq('id', trade.id);
                
                addToast(`Oracle Prophecy: ${trade.pair} hit ${tp.level}!`, 'success');
                speak(`Oracle Prophecy: ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} has hit ${tp.level}.`, userProfile.notification_settings.sound);
              } catch (err) {
                console.error(`Error updating TP hit for ${tp.level}:`, err);
              }
            }
          }
        }

        if (shouldClose) {
          // Calculate final P/L
          const finalPnl = trade.type === 'buy' 
            ? (currentPrice - trade.entry_price) * 100 
            : (trade.entry_price - currentPrice) * 100;
          const finalPnlPercentage = (finalPnl / (trade.entry_price * 100)) * 100;
          
          const updatedTrade = { 
            ...trade, 
            pnl: finalPnl, 
            pnl_percentage: finalPnlPercentage,
            exit_price: currentPrice,
            close_reason: reason,
            mae: trade.mae ? Math.min(trade.mae, finalPnl) : finalPnl,
            mfe: trade.mfe ? Math.max(trade.mfe, finalPnl) : finalPnl
          };

          if (onCloseTrade) {
            await onCloseTrade(updatedTrade, reason);
            speak(`Ritual complete. ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} closed due to ${reason}.`, userProfile.notification_settings.sound);
          }
        } else {
          // Update current P/L and MAE/MFE while open
          const currentPnl = trade.type === 'buy' 
            ? (currentPrice - trade.entry_price) * 100 
            : (trade.entry_price - currentPrice) * 100;
          
          const newMae = trade.mae !== undefined ? Math.min(trade.mae, currentPnl) : currentPnl;
          const newMfe = trade.mfe !== undefined ? Math.max(trade.mfe, currentPnl) : currentPnl;

          if (newMae !== trade.mae || newMfe !== trade.mfe) {
            try {
              await supabase
                .from('trades')
                .update({
                  mae: newMae,
                  mfe: newMfe,
                  current_price: currentPrice,
                  pnl: currentPnl,
                  pnl_percentage: (currentPnl / (trade.entry_price * 100)) * 100
                })
                .eq('id', trade.id);
            } catch (err) {
              console.error("Error updating trade metrics:", err);
            }
          }
        }
      });
    }, 2000); // Check every 2 seconds instead of every tick

    return () => clearInterval(monitorInterval);
  }, [openTrades, onCloseTrade, userProfile.uid, addToast]);
}
