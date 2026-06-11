// Dunning Logic - Failed Payment Retry + Suspend + Expire
// Handles subscription payment failures with graceful degradation

export interface DunningConfig {
  /** Maximum retry attempts before suspending */
  maxRetryAttempts: number;
  /** Days between retry attempts */
  retryIntervalDays: number;
  /** Days after suspension before expiration */
  gracePeriodDays: number;
  /** Whether to send notifications at each stage */
  notifyOnRetry: boolean;
  notifyOnSuspend: boolean;
  notifyOnExpire: boolean;
}

export const DEFAULT_DUNNING_CONFIG: DunningConfig = {
  maxRetryAttempts: 3,
  retryIntervalDays: 3,
  gracePeriodDays: 7,
  notifyOnRetry: true,
  notifyOnSuspend: true,
  notifyOnExpire: true,
};

export type DunningStage = 'active' | 'retrying' | 'suspended' | 'expired';

export interface DunningState {
  stage: DunningStage;
  retryAttempts: number;
  lastRetryAt: Date | null;
  nextRetryAt: Date | null;
  suspendedAt: Date | null;
  expiresAt: Date | null;
}

export interface DunningEvent {
  type: 'retry_attempt' | 'retry_succeeded' | 'suspended' | 'expired' | 'reactivated';
  subscriptionId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export class DunningManager {
  private events: DunningEvent[] = [];

  constructor(private config: DunningConfig = DEFAULT_DUNNING_CONFIG) {}

  /**
   * Initialize dunning state for a subscription.
   */
  initializeState(): DunningState {
    return {
      stage: 'active',
      retryAttempts: 0,
      lastRetryAt: null,
      nextRetryAt: null,
      suspendedAt: null,
      expiresAt: null,
    };
  }

  /**
   * Handle payment failure - determine next action.
   */
  handlePaymentFailure(state: DunningState): {
    action: 'retry' | 'suspend' | 'expire' | 'none';
    newState: DunningState;
    event: DunningEvent;
  } {
    const now = new Date();

    // If already expired, do nothing
    if (state.stage === 'expired') {
      return {
        action: 'none',
        newState: state,
        event: {
          type: 'expired',
          subscriptionId: '',
          timestamp: now,
        },
      };
    }

    // If already suspended, check if grace period expired
    if (state.stage === 'suspended') {
      if (state.expiresAt && now >= state.expiresAt) {
        const newState: DunningState = {
          ...state,
          stage: 'expired',
        };
        return {
          action: 'expire',
          newState,
          event: {
            type: 'expired',
            subscriptionId: '',
            timestamp: now,
          },
        };
      }
      return {
        action: 'none',
        newState: state,
        event: {
          type: 'suspended',
          subscriptionId: '',
          timestamp: now,
        },
      };
    }

    // Check if we should retry
    if (state.retryAttempts < this.config.maxRetryAttempts) {
      const nextRetryAt = new Date(now);
      nextRetryAt.setDate(nextRetryAt.getDate() + this.config.retryIntervalDays);

      const newState: DunningState = {
        ...state,
        stage: 'retrying',
        retryAttempts: state.retryAttempts + 1,
        lastRetryAt: now,
        nextRetryAt,
      };

      return {
        action: 'retry',
        newState,
        event: {
          type: 'retry_attempt',
          subscriptionId: '',
          timestamp: now,
          metadata: {
            attempt: newState.retryAttempts,
            nextRetryAt,
          },
        },
      };
    }

    // Max retries reached, suspend
    const suspendedAt = now;
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + this.config.gracePeriodDays);

    const newState: DunningState = {
      ...state,
      stage: 'suspended',
      suspendedAt,
      expiresAt,
    };

    return {
      action: 'suspend',
      newState,
      event: {
        type: 'suspended',
        subscriptionId: '',
        timestamp: now,
        metadata: {
          retryAttempts: state.retryAttempts,
          expiresAt,
        },
      },
    };
  }

  /**
   * Handle successful payment - reset dunning state.
   */
  handlePaymentSuccess(state: DunningState): {
    newState: DunningState;
    event: DunningEvent;
  } {
    const now = new Date();
    const wasSuspended = state.stage === 'suspended' || state.stage === 'retrying';

    const newState: DunningState = {
      ...this.initializeState(),
    };

    return {
      newState,
      event: {
        type: wasSuspended ? 'reactivated' : 'retry_succeeded',
        subscriptionId: '',
        timestamp: now,
        metadata: {
          previousStage: state.stage,
        },
      },
    };
  }

  /**
   * Check if subscription needs dunning action.
   */
  needsAction(state: DunningState, now: Date = new Date()): boolean {
    if (state.stage === 'expired') return false;
    if (state.stage === 'active') return false;

    if (state.stage === 'retrying' && state.nextRetryAt) {
      return now >= state.nextRetryAt;
    }

    if (state.stage === 'suspended' && state.expiresAt) {
      return now >= state.expiresAt;
    }

    return false;
  }

  /**
   * Get all dunning events for a subscription.
   */
  getEvents(subscriptionId: string): DunningEvent[] {
    return this.events.filter(e => e.subscriptionId === subscriptionId);
  }

  /**
   * Record a dunning event.
   */
  recordEvent(event: DunningEvent): void {
    this.events.push(event);
  }

  /**
   * Get subscriptions that need dunning action.
   */
  getSubscriptionsNeedingAction(
    subscriptions: Array<{ id: string; dunningState: DunningState }>,
    now: Date = new Date(),
  ): Array<{ id: string; dunningState: DunningState; action: 'retry' | 'suspend' | 'expire' }> {
    return subscriptions
      .filter(sub => this.needsAction(sub.dunningState, now))
      .map(sub => {
        const result = this.handlePaymentFailure(sub.dunningState);
        return {
          id: sub.id,
          dunningState: result.newState,
          action: result.action as 'retry' | 'suspend' | 'expire',
        };
      });
  }
}

/**
 * Create dunning manager instance.
 */
export function createDunningManager(config?: Partial<DunningConfig>): DunningManager {
  return new DunningManager({ ...DEFAULT_DUNNING_CONFIG, ...config });
}
