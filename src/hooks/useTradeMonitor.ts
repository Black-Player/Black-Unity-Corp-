import { useEffect, useState, useRef } from 'react';
import { dbService } from '../services/dbService';
import { where } from 'firebase/firestore';
import { Trade, UserProfile, Signal } from '../types';
import { useMarketContext } from '../MarketContext';
import { speak } from '../lib/voice';
import { getBotCharacter } from '../lib/themeUtils';
import { sendSignalUpdateToTelegram } from '../services/communicationService';
import { calculateAutoLotSize } from '../lib/tradeUtils';

export function useTradeMonitor(
  userProfile: UserProfile, 
  addToast: (msg: string, type?: 'success' | 'error' | 'info') => void,
  onCloseTrade?: (trade: Trade, reason: string) => Promise<void>
) {
  const { marketPrices } = useMarketContext();
  const [openTrades, setOpenTrades] = useState<Trade[]>([]);
  const [activeSignals, setActiveSignals] = useState<Signal[]>([]);
  const marketPricesRef = useRef(marketPrices);
  const openTradesRef = useRef(openTrades);
  const activeSignalsRef = useRef(activeSignals);
  const priceHistoryRef = useRef<Record<string, number[]>>({});
  const lastTriggerTimeRef = useRef<Record<string, number>>({});

  useEffect(() => {
    marketPricesRef.current = marketPrices;
  }, [marketPrices]);

  useEffect(() => {
    openTradesRef.current = openTrades;
  }, [openTrades]);

  useEffect(() => {
    activeSignalsRef.current = activeSignals;
  }, [activeSignals]);

  // Real-time Automated BOS/CHoCH Structural Scanner (Fully managed 24/7 by serverScanner.ts in the background)
  // Client-side automated signal generation is disabled to avoid duplicate trades and double-telegram messages.
  useEffect(() => {
    // Background server handles this securely.
  }, []);

  useEffect(() => {
    if (!userProfile.uid) return;

    // Initial fetch
    const fetchTrades = async () => {
      try {
        const data = await dbService.list('trades', [
          where('uid', '==', userProfile.uid),
          where('status', '==', 'open')
        ]);
        // Guard against offline fallback return of complete localTable
        const filtered = (data as Trade[]).filter(t => t.status === 'open' && t.uid === userProfile.uid);
        setOpenTrades(filtered);
      } catch (error) {
        console.error("Trade monitor fetch error:", error);
      }
    };

    const fetchSignals = async () => {
      try {
        const data = await dbService.list('signals', [
          where('uid', '==', userProfile.uid),
          where('status', '==', 'active')
        ]);
        const filtered = (data as Signal[]).filter(s => s.status === 'active' && s.uid === userProfile.uid);
        setActiveSignals(filtered);
      } catch (error) {
        console.error("Signal monitor fetch error:", error);
      }
    };

    fetchTrades();
    fetchSignals();

    // Subscribe to changes in trades
    const unsubscribeTrades = dbService.subscribeCollection('trades', [
      where('uid', '==', userProfile.uid),
      where('status', '==', 'open')
    ], (data) => {
      // Guard against offline fallback return of complete localTable
      const filtered = (data as Trade[]).filter(t => t.status === 'open' && t.uid === userProfile.uid);
      setOpenTrades(filtered);
    });

    // Subscribe to changes in signals
    const unsubscribeSignals = dbService.subscribeCollection('signals', [
      where('uid', '==', userProfile.uid),
      where('status', '==', 'active')
    ], (data) => {
      const filtered = (data as Signal[]).filter(s => s.status === 'active' && s.uid === userProfile.uid);
      setActiveSignals(filtered);
    });

    return () => {
      unsubscribeTrades();
      unsubscribeSignals();
    };
  }, [userProfile.uid]);

  // Monitor trades for TP/SL and update P/L
  useEffect(() => {
    const oracleChar = getBotCharacter('Oracle', userProfile.theme);
    const sentinelChar = getBotCharacter('Sentinel', userProfile.theme);

    const monitorInterval = setInterval(() => {
      const currentPrices = marketPricesRef.current;
      const trades = openTradesRef.current;
      if (trades.length === 0) return;
      
      trades.forEach(async (trade) => {
        const currentPrice = currentPrices[trade.pair]?.price;
        if (!currentPrice) return;

        let shouldClose = false;
        let reason = '';

        // Check SL
        if (trade.type === 'buy' && currentPrice <= trade.stop_loss) {
          shouldClose = true;
          reason = trade.stop_loss === trade.entry_price ? 'Break Even hit' : 'Stop Loss hit';
        } else if (trade.type === 'sell' && currentPrice >= trade.stop_loss) {
          shouldClose = true;
          reason = trade.stop_loss === trade.entry_price ? 'Break Even hit' : 'Stop Loss hit';
        }

        // Check Active TP or TP4
        if (!shouldClose) {
          const activeLevelPrice = trade[`tp${trade.active_tp || 4}` as keyof Trade] as number;
          if (trade.type === 'buy' && currentPrice >= activeLevelPrice) {
            shouldClose = true;
            reason = `Take Profit ${trade.active_tp || 4} hit`;
          } else if (trade.type === 'sell' && currentPrice <= activeLevelPrice) {
            shouldClose = true;
            reason = `Take Profit ${trade.active_tp || 4} hit`;
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
                const updateData: any = { tp_hits: newTpHits };

                // MOVE SL ACCORDING ON TP HITS
                if (tp.level === 'TP1') {
                  updateData.stop_loss = trade.entry_price;
                  addToast(`Celestial Shield Activated: ${trade.pair} SL moved to breakeven!`, 'info');
                  speak(`Guardian protection active. Stop loss for ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} has been moved to entry.`, userProfile.notification_settings?.sound, sentinelChar);
                  sendSignalUpdateToTelegram(trade, 'TP1_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram BE Update failed:", e));
                  
                } else if (tp.level === 'TP2') {
                  updateData.stop_loss = trade.tp1;
                  addToast(`Profit Secured: ${trade.pair} SL moved to TP1!`, 'success');
                  speak(`Profit secured. Stop loss for ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} has been moved to TP1.`, userProfile.notification_settings?.sound, oracleChar);
                  sendSignalUpdateToTelegram(trade, 'TP2_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram TP2 Update failed:", e));
                  
                } else if (tp.level === 'TP3') {
                  updateData.stop_loss = trade.tp2;
                  addToast(`Profit Secured: ${trade.pair} SL moved to TP2!`, 'success');
                  speak(`Profit secured. Stop loss for ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} has been moved to TP2.`, userProfile.notification_settings?.sound, oracleChar);
                  sendSignalUpdateToTelegram(trade, 'TP3_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram TP3 Update failed:", e));
                }

                await dbService.update('trades', trade.id, updateData);
                
                addToast(`Oracle Prophecy: ${trade.pair} hit ${tp.level}!`, 'success');
                speak(`Oracle Prophecy: ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} has hit ${tp.level}.`, userProfile.notification_settings?.sound, oracleChar);
              } catch (err) {
                console.error(`Error updating TP hit for ${tp.level}:`, err);
              }
            }
          }
        }

        if (shouldClose) {
          const finalPnl = trade.type === 'buy' 
            ? (currentPrice - trade.entry_price) * (trade.lot_size || 0.1) * 100 
            : (trade.entry_price - currentPrice) * (trade.lot_size || 0.1) * 100;
          const finalPnlPercentage = (finalPnl / (trade.entry_price * (trade.lot_size || 0.1) * 100)) * 100;
          
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

            try {
              if (trade.signal_id) {
                const signalResultStatus = finalPnl > 0 ? 'Won' : 'Lost';
                await dbService.update('signals', trade.signal_id, {
                  status: 'closed',
                  result: signalResultStatus
                });
              }
            } catch (e) {
              console.error("Failed to update signal status", e);
            }

            if (reason.toLowerCase().includes('take profit')) {
              sendSignalUpdateToTelegram(trade, 'TP_FINAL_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram TP final update failed:", e));
            } else if (reason.toLowerCase().includes('break even')) {
              sendSignalUpdateToTelegram(trade, 'BE_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram BE hit update failed:", e));
            } else if (reason.toLowerCase().includes('stop loss')) {
              sendSignalUpdateToTelegram(trade, 'SL_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram SL update failed:", e));
            }

            speak(`Ritual complete. ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} closed due to ${reason}.`, userProfile.notification_settings?.sound, oracleChar);
          }
        } else {
          const currentPnl = trade.type === 'buy' 
            ? (currentPrice - trade.entry_price) * (trade.lot_size || 0.1) * 100 
            : (trade.entry_price - currentPrice) * (trade.lot_size || 0.1) * 100;
          
          const newMae = trade.mae !== undefined ? Math.min(trade.mae, currentPnl) : currentPnl;
          const newMfe = trade.mfe !== undefined ? Math.max(trade.mfe, currentPnl) : currentPnl;

          if (newMae !== trade.mae || newMfe !== trade.mfe || trade.current_price !== currentPrice) {
            // Update local state ONLY so the UI updates in real-time, but write nothing to Firestore to prevent quota limits!
            setOpenTrades(prev => prev.map(t => {
              if (t.id === trade.id) {
                return {
                  ...t,
                  mae: newMae,
                  mfe: newMfe,
                  current_price: currentPrice,
                  pnl: currentPnl,
                  pnl_percentage: (currentPnl / (t.entry_price * (t.lot_size || 0.1) * 100)) * 100
                };
              }
              return t;
            }));
          }
        }
      });

      // Monitor Active Signals that DO NOT have an open trade
      const signals = activeSignalsRef.current;
      if (signals.length > 0) {
        signals.forEach(async (signal) => {
          const currentPrice = currentPrices[signal.pair]?.price;
          if (!currentPrice) return;

          // Only monitor signals that do NOT have a corresponding open trade (since those are monitored via trades)
          const hasOpenTrade = trades.some(t => t.signal_id === signal.id);
          if (hasOpenTrade) return;

          const isBuy = signal.decision === 'Buy' || signal.tp1 > signal.entry;
          let shouldClose = false;
          let reason = '';
          let updateType: 'TP1_HIT' | 'TP2_HIT' | 'TP3_HIT' | 'TP_FINAL_HIT' | 'SL_HIT' | 'BE_HIT' | null = null;
          const tp_hits = signal.tp_hits || [];

          // Check SL / BE Trailed hits
          if (isBuy && currentPrice <= signal.stop_loss) {
            shouldClose = true;
            reason = signal.stop_loss === signal.entry ? 'Break Even hit' : 'Stop Loss hit';
            updateType = signal.stop_loss === signal.entry ? 'BE_HIT' : 'SL_HIT';
          } else if (!isBuy && currentPrice >= signal.stop_loss) {
            shouldClose = true;
            reason = signal.stop_loss === signal.entry ? 'Break Even hit' : 'Stop Loss hit';
            updateType = signal.stop_loss === signal.entry ? 'BE_HIT' : 'SL_HIT';
          }

          // Check TP4 (final target)
          if (!shouldClose) {
            const tp4Price = signal.tp4 || (isBuy ? signal.tp3 * 1.1 : signal.tp3 * 0.9);
            if (isBuy && currentPrice >= tp4Price) {
              shouldClose = true;
              reason = 'Take Profit 4 hit';
              updateType = 'TP_FINAL_HIT';
            } else if (!isBuy && currentPrice <= tp4Price) {
              shouldClose = true;
              reason = 'Take Profit 4 hit';
              updateType = 'TP_FINAL_HIT';
            }
          }

          // Check partial targets (TP1, TP2, TP3)
          if (!shouldClose) {
            const tps = [
              { level: 'TP1', price: signal.tp1, updateType: 'TP1_HIT' as const },
              { level: 'TP2', price: signal.tp2, updateType: 'TP2_HIT' as const },
              { level: 'TP3', price: signal.tp3, updateType: 'TP3_HIT' as const }
            ];

            for (const tp of tps) {
              if (!tp.price) continue;
              const hit = isBuy ? currentPrice >= tp.price : currentPrice <= tp.price;
              const alreadyHit = tp_hits.includes(tp.level);

              if (hit && !alreadyHit) {
                try {
                  const newTpHits = [...tp_hits, tp.level];
                  const updateData: any = { 
                    tp_hits: newTpHits,
                    status: tp.level.toLowerCase() + '_hit'
                  };

                  if (tp.level === 'TP1') {
                    updateData.stop_loss = signal.entry;
                    addToast(`Celestial Shield Activated: Signal ${signal.pair} SL moved to breakeven!`, 'info');
                    speak(`Guardian protection active. Stop loss for signal ${signal.pair.replace('frx', '').replace('R_', 'Volatility ')} has been moved to entry.`, userProfile.notification_settings?.sound, sentinelChar);
                  } else if (tp.level === 'TP2') {
                    updateData.stop_loss = signal.tp1;
                    addToast(`Profit Secured: Signal ${signal.pair} SL moved to TP1!`, 'success');
                    speak(`Profit secured. Stop loss for signal ${signal.pair.replace('frx', '').replace('R_', 'Volatility ')} has been moved to TP1.`, userProfile.notification_settings?.sound, oracleChar);
                  } else if (tp.level === 'TP3') {
                    updateData.stop_loss = signal.tp2;
                    addToast(`Profit Secured: Signal ${signal.pair} SL moved to TP2!`, 'success');
                    speak(`Profit secured. Stop loss for signal ${signal.pair.replace('frx', '').replace('R_', 'Volatility ')} has been moved to TP2.`, userProfile.notification_settings?.sound, oracleChar);
                  }

                  await dbService.update('signals', signal.id, updateData);
                  addToast(`Oracle Prophecy: Signal ${signal.pair} hit ${tp.level}!`, 'success');
                  speak(`Oracle Prophecy: Signal ${signal.pair.replace('frx', '').replace('R_', 'Volatility ')} has hit ${tp.level}.`, userProfile.notification_settings?.sound, oracleChar);

                  // Update local state instantly to avoid loops
                  setActiveSignals(prev => prev.map(s => s.id === signal.id ? { ...s, ...updateData } : s));

                  // Send to Telegram
                  sendSignalUpdateToTelegram(signal, tp.updateType, currentPrice, userProfile.integrations).catch(e => console.error("Telegram Signal hit update failed:", e));
                } catch (err) {
                  console.error(`Error updating signal TP hit for ${tp.level}:`, err);
                }
              }
            }
          }

          if (shouldClose && updateType) {
            try {
              const updatedStatus = updateType === 'SL_HIT' ? 'sl_hit' : updateType === 'BE_HIT' ? 'be_hit' : 'closed';
              await dbService.update('signals', signal.id, {
                status: updatedStatus,
                result: updateType.includes('TP') ? 'Won' : 'Lost',
                exit_price: currentPrice,
                closed_at: new Date().toISOString()
              });

              addToast(`Signal Resolved: ${signal.pair} closed due to ${reason}!`, updateType.includes('TP') ? 'success' : 'error');
              speak(`Signal complete. ${signal.pair.replace('frx', '').replace('R_', 'Volatility ')} closed due to ${reason}.`, userProfile.notification_settings?.sound, oracleChar);

              // Update local state
              setActiveSignals(prev => prev.filter(s => s.id !== signal.id));

              // Send closure to Telegram
              sendSignalUpdateToTelegram(signal, updateType, currentPrice, userProfile.integrations).catch(e => console.error("Telegram Signal closure failed:", e));
            } catch (err) {
              console.error(`Error closing signal ${signal.id}:`, err);
            }
          }
        });
      }
    }, 2000);

    return () => clearInterval(monitorInterval);
  }, [onCloseTrade, userProfile.uid, userProfile.theme, userProfile.notification_settings?.sound, addToast]);
}
