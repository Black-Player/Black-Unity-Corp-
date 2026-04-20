import { useEffect, useState, useRef } from 'react';
import { dbService } from '../services/dbService';
import { where } from 'firebase/firestore';
import { Trade, UserProfile } from '../types';
import { useMarketContext } from '../MarketContext';
import { speak } from '../lib/voice';
import { getBotCharacter } from '../lib/themeUtils';

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
                const updateData: any = { tp_hits: newTpHits };

                // PART 2: AT TP1 -> MOVE SL TO BREAKEVEN
                if (tp.level === 'TP1') {
                  updateData.stop_loss = trade.entry_price;
                  addToast(`Celestial Shield Activated: ${trade.pair} SL moved to breakeven!`, 'info');
                  speak(`Guardian protection active. Stop loss for ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} has been moved to entry.`, userProfile.notification_settings.sound, sentinelChar);
                }

                await dbService.update('trades', trade.id, updateData);
                
                addToast(`Oracle Prophecy: ${trade.pair} hit ${tp.level}!`, 'success');
                speak(`Oracle Prophecy: ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} has hit ${tp.level}.`, userProfile.notification_settings.sound, oracleChar);
              } catch (err) {
                console.error(`Error updating TP hit for ${tp.level}:`, err);
              }
            }
          }

          // PART 4: TRAILING PROFIT SYSTEM
          // If in profit > TP1, trail SL behind price by a structural distance (e.g., half distance to TP1)
          const profitPips = trade.type === 'buy' ? currentPrice - trade.entry_price : trade.entry_price - currentPrice;
          const distToTp1 = Math.abs(trade.tp1 - trade.entry_price);
          
          if (profitPips > distToTp1) {
            const trailBuffer = distToTp1 * 0.5;
            const newSl = trade.type === 'buy' ? currentPrice - trailBuffer : currentPrice + trailBuffer;
            
            // Only move SL if it's an improvement (trailing)
            const isImprovement = trade.type === 'buy' ? newSl > trade.stop_loss : newSl < trade.stop_loss;
            
            if (isImprovement) {
               try {
                 await dbService.update('trades', trade.id, { stop_loss: newSl });
                 if (Math.abs(newSl - trade.stop_loss) > (distToTp1 * 0.1)) { // Only notify for significant moves
                    addToast(`Profit Locked: Trailing ${trade.pair} SL to ${newSl.toFixed(4)}`, 'info');
                 }
               } catch (err) {
                 console.error("Trailing stop update failed", err);
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
            speak(`Ritual complete. ${trade.pair.replace('frx', '').replace('R_', 'Volatility ')} closed due to ${reason}.`, userProfile.notification_settings.sound, oracleChar);
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
              await dbService.update('trades', trade.id, {
                  mae: newMae,
                  mfe: newMfe,
                  current_price: currentPrice,
                  pnl: currentPnl,
                  pnl_percentage: (currentPnl / (trade.entry_price * 100)) * 100
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
