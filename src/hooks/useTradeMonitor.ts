import { useEffect, useState, useRef } from 'react';
import { db } from '../firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { Trade, UserProfile } from '../types';
import { useMarketContext } from '../MarketContext';

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

    const tradesRef = collection(db, 'users', userProfile.uid, 'trades');
    const q = query(tradesRef, where('status', '==', 'open'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const trades = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Trade));
      setOpenTrades(trades);
    }, (err) => {
      console.error("Trade monitor snapshot error:", err);
    });

    return () => unsubscribe();
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
                const tradeRef = doc(db, 'users', userProfile.uid, 'trades', trade.id);
                await updateDoc(tradeRef, {
                  tp_hits: arrayUnion(tp.level)
                });
                addToast(`Oracle Prophecy: ${trade.pair} hit ${tp.level}!`, 'success');
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
            close_reason: reason
          };

          if (onCloseTrade) {
            await onCloseTrade(updatedTrade, reason);
          }
        } else {
          // Update current P/L in Firestore for real-time dashboard updates
          const pnl = trade.type === 'buy' 
            ? (currentPrice - trade.entry_price) * 100 
            : (trade.entry_price - currentPrice) * 100;
          const pnl_percentage = (pnl / (trade.entry_price * 100)) * 100;

          if (Math.abs((trade.pnl || 0) - pnl) > 0.1) { // Increased threshold to 0.1 for fewer updates
            const tradeRef = doc(db, 'users', userProfile.uid, 'trades', trade.id);
            updateDoc(tradeRef, {
              current_price: currentPrice,
              pnl,
              pnl_percentage
            }).catch(() => {});
          }
        }
      });
    }, 2000); // Check every 2 seconds instead of every tick

    return () => clearInterval(monitorInterval);
  }, [openTrades, onCloseTrade, userProfile.uid, addToast]);
}
