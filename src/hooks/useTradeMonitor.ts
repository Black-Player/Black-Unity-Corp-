import { useEffect, useState, useRef } from 'react';
import { dbService } from '../services/dbService';
import { where } from 'firebase/firestore';
import { Trade, UserProfile } from '../types';
import { useMarketContext } from '../MarketContext';
import { speak } from '../lib/voice';
import { getBotCharacter } from '../lib/themeUtils';
import { sendSignalUpdateToTelegram } from '../services/communicationService';

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
      try {
        const data = await dbService.list('trades', [
          where('uid', '==', userProfile.uid),
          where('status', '==', 'open')
        ]);
        setOpenTrades(data as Trade[]);
      } catch (error) {
        console.error("Trade monitor fetch error:", error);
      }
    };

    fetchTrades();

    // Subscribe to changes
    const unsubscribe = dbService.subscribeCollection('trades', [
      where('uid', '==', userProfile.uid),
      where('status', '==', 'open')
    ], (data) => {
      setOpenTrades(data as Trade[]);
    });

    return () => unsubscribe();
  }, [userProfile.uid]);

  // Monitor trades for TP/SL and update P/L
  useEffect(() => {
    if (openTrades.length === 0) return;

    const oracleChar = getBotCharacter('Oracle', userProfile.theme);
    const sentinelChar = getBotCharacter('Sentinel', userProfile.theme);

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
          reason = trade.stop_loss === trade.entry_price ? 'Break Even hit' : 'Stop Loss hit';
        } else if (trade.type === 'sell' && currentPrice >= trade.stop_loss) {
          shouldClose = true;
          reason = trade.stop_loss === trade.entry_price ? 'Break Even hit' : 'Stop Loss hit';
        }

        // Check Active TP or TP4
        if (!shouldClose) {
          // If active_tp is set, exit entirely when that specific TP is hit.
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

                // PART 2: AT TP HIT -> MOVE SL ACCORDINGLY
                if (tp.level === 'TP1') {
                  updateData.stop_loss = trade.entry_price;
                  addToast(`Celestial Shield Activated: ${trade.pair} SL moved to breakeven!`, 'info');
                  speak(`Guardian protection active. Stop loss for ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} has been moved to entry.`, userProfile.notification_settings.sound, sentinelChar);
                  
                  // Auto-broadcast TP1 hit to Telegram with BE level explanation
                  sendSignalUpdateToTelegram(trade, 'TP1_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram BE Update failed:", e));
                  
                } else if (tp.level === 'TP2') {
                  updateData.stop_loss = trade.tp1;
                  addToast(`Profit Secured: ${trade.pair} SL moved to TP1!`, 'success');
                  speak(`Profit secured. Stop loss for ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} has been moved to TP1.`, userProfile.notification_settings.sound, oracleChar);
                  
                  // Auto-broadcast TP2 hit to Telegram
                  sendSignalUpdateToTelegram(trade, 'TP2_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram TP2 Update failed:", e));
                  
                } else if (tp.level === 'TP3') {
                  updateData.stop_loss = trade.tp2;
                  addToast(`Profit Secured: ${trade.pair} SL moved to TP2!`, 'success');
                  speak(`Profit secured. Stop loss for ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} has been moved to TP2.`, userProfile.notification_settings.sound, oracleChar);
                  
                  // Auto-broadcast TP3 hit to Telegram
                  sendSignalUpdateToTelegram(trade, 'TP3_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram TP3 Update failed:", e));
                }

                await dbService.update('trades', trade.id, updateData);
                
                addToast(`Oracle Prophecy: ${trade.pair} hit ${tp.level}!`, 'success');
                speak(`Oracle Prophecy: ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} has hit ${tp.level}.`, userProfile.notification_settings.sound, oracleChar);
              } catch (err) {
                console.error(`Error updating TP hit for ${tp.level}:`, err);
              }
            }
          }

          // Dynamic trailing disabled as per explicit TP trailing rules.
        }

        if (shouldClose) {
          // Calculate final P/L
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

            // Fetch the signal and mark its status as LOST or WON
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

            // Auto-broadcast final close status to Telegram with SMC educational explanation
            if (reason.toLowerCase().includes('take profit')) {
              sendSignalUpdateToTelegram(trade, 'TP_FINAL_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram TP final update failed:", e));
            } else if (reason.toLowerCase().includes('break even')) {
              sendSignalUpdateToTelegram(trade, 'BE_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram BE hit update failed:", e));
            } else if (reason.toLowerCase().includes('stop loss')) {
              sendSignalUpdateToTelegram(trade, 'SL_HIT', currentPrice, userProfile.integrations).catch(e => console.error("Telegram SL update failed:", e));
            }

            speak(`Ritual complete. ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} closed due to ${reason}.`, userProfile.notification_settings.sound, oracleChar);
          }
        } else {
          // Update current P/L and MAE/MFE while open
          const currentPnl = trade.type === 'buy' 
            ? (currentPrice - trade.entry_price) * (trade.lot_size || 0.1) * 100 
            : (trade.entry_price - currentPrice) * (trade.lot_size || 0.1) * 100;
          
          const newMae = trade.mae !== undefined ? Math.min(trade.mae, currentPnl) : currentPnl;
          const newMfe = trade.mfe !== undefined ? Math.max(trade.mfe, currentPnl) : currentPnl;

          if (newMae !== trade.mae || newMfe !== trade.mfe) {
            try {
              await dbService.update('trades', trade.id, {
                  mae: newMae,
                  mfe: newMfe,
                  current_price: currentPrice,
                  pnl: currentPnl,
                  pnl_percentage: (currentPnl / (trade.entry_price * (trade.lot_size || 0.1) * 100)) * 100
              });
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
