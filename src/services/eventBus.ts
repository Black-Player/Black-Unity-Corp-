/**
 * BLĀCK-PLĀYER RSA
 * LAYER 9 — EVENT-DRIVEN AUTOMATION & CENTRALIZED EVENT BUS
 * 
 * Coordinates multi-channel events, automated state transitions (e.g. TP1 -> Move SL to Break Even),
 * Telegram broadcasts, and cross-oracle synchronization without UI blocking.
 */

export type SystemEventType =
  | 'SIGNAL_GENERATED'
  | 'SIGNAL_VALIDATED'
  | 'SIGNAL_BLOCKED'
  | 'SIGNAL_ACTIVATED'
  | 'TP1_HIT'
  | 'TP2_HIT'
  | 'TP3_HIT'
  | 'TP4_HIT'
  | 'BREAK_EVEN_ACTIVATED'
  | 'SL_HIT'
  | 'SIGNAL_CANCELLED'
  | 'PRICE_UPDATED'
  | 'TELEGRAM_MESSAGE_SENT'
  | 'REVISE_RISK'
  | 'ORACLE_ALERT';

export interface SystemEventPayload {
  id: string;
  type: SystemEventType;
  source: string; // e.g. 'DeterministicTradingEngine', 'SignalFirewall', 'ServerScanner', 'AI_Council'
  timestamp: string;
  data: any;
  message: string;
}

type SystemEventHandler = (payload: SystemEventPayload) => void | Promise<void>;

class CentralEventBus {
  private handlers: Map<SystemEventType, Set<SystemEventHandler>> = new Map();
  private eventHistory: SystemEventPayload[] = [];
  private maxHistory = 100;

  /**
   * Subscribe to a system event
   */
  public on(type: SystemEventType, handler: SystemEventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, new Set());
    }
    this.handlers.get(type)!.add(handler);

    // Return unbind function
    return () => {
      this.handlers.get(type)?.delete(handler);
    };
  }

  /**
   * Emit an event across the platform
   */
  public async emit(type: SystemEventType, source: string, data: any, message: string): Promise<SystemEventPayload> {
    const payload: SystemEventPayload = {
      id: `EVT_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      type,
      source,
      timestamp: new Date().toISOString(),
      data,
      message
    };

    // Store in history
    this.eventHistory.unshift(payload);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.pop();
    }

    // Notify registered handlers asynchronously
    const targetHandlers = this.handlers.get(type);
    if (targetHandlers) {
      targetHandlers.forEach(async (h) => {
        try {
          await h(payload);
        } catch (err) {
          console.error(`[EventBus] Error executing handler for ${type}:`, err);
        }
      });
    }

    return payload;
  }

  /**
   * Returns recent event logs for audit and monitoring
   */
  public getRecentEvents(limit = 20): SystemEventPayload[] {
    return this.eventHistory.slice(0, limit);
  }
}

export const eventBus = new CentralEventBus();
