import { describe, it, expect, beforeEach } from 'vitest';
import {
  DunningManager,
  createDunningManager,
  DunningState,
  DEFAULT_DUNNING_CONFIG,
} from '../src/dunning/dunning-manager';

describe('DunningManager', () => {
  let manager: DunningManager;

  beforeEach(() => {
    manager = createDunningManager();
  });

  describe('initializeState', () => {
    it('should create active state', () => {
      const state = manager.initializeState();
      expect(state.stage).toBe('active');
      expect(state.retryAttempts).toBe(0);
      expect(state.lastRetryAt).toBeNull();
      expect(state.nextRetryAt).toBeNull();
      expect(state.suspendedAt).toBeNull();
      expect(state.expiresAt).toBeNull();
    });
  });

  describe('handlePaymentFailure', () => {
    it('should retry on first failure', () => {
      const state = manager.initializeState();
      const result = manager.handlePaymentFailure(state);

      expect(result.action).toBe('retry');
      expect(result.newState.stage).toBe('retrying');
      expect(result.newState.retryAttempts).toBe(1);
      expect(result.newState.nextRetryAt).toBeInstanceOf(Date);
      expect(result.event.type).toBe('retry_attempt');
    });

    it('should retry up to max attempts', () => {
      let state = manager.initializeState();

      for (let i = 0; i < DEFAULT_DUNNING_CONFIG.maxRetryAttempts; i++) {
        const result = manager.handlePaymentFailure(state);
        expect(result.action).toBe('retry');
        state = result.newState;
      }

      // Next failure should suspend
      const result = manager.handlePaymentFailure(state);
      expect(result.action).toBe('suspend');
      expect(result.newState.stage).toBe('suspended');
      expect(result.newState.suspendedAt).toBeInstanceOf(Date);
      expect(result.newState.expiresAt).toBeInstanceOf(Date);
    });

    it('should expire after grace period', () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));

      let state = manager.initializeState();

      // Exhaust retries
      for (let i = 0; i <= DEFAULT_DUNNING_CONFIG.maxRetryAttempts; i++) {
        state = manager.handlePaymentFailure(state).newState;
      }

      expect(state.stage).toBe('suspended');

      // Advance time past grace period
      const futureDate = new Date('2026-01-01T00:00:00Z');
      futureDate.setDate(futureDate.getDate() + DEFAULT_DUNNING_CONFIG.gracePeriodDays + 1);
      vi.setSystemTime(futureDate);

      const result = manager.handlePaymentFailure(state);
      expect(result.action).toBe('expire');
      expect(result.newState.stage).toBe('expired');

      vi.useRealTimers();
    });

    it('should do nothing if already expired', () => {
      const state: DunningState = {
        ...manager.initializeState(),
        stage: 'expired',
      };

      const result = manager.handlePaymentFailure(state);
      expect(result.action).toBe('none');
    });
  });

  describe('handlePaymentSuccess', () => {
    it('should reset state on success', () => {
      let state = manager.initializeState();
      state = manager.handlePaymentFailure(state).newState;
      state = manager.handlePaymentFailure(state).newState;

      expect(state.stage).toBe('retrying');
      expect(state.retryAttempts).toBe(2);

      const result = manager.handlePaymentSuccess(state);
      expect(result.newState.stage).toBe('active');
      expect(result.newState.retryAttempts).toBe(0);
      expect(result.event.type).toBe('reactivated');
    });

    it('should return retry_succeeded for active subscription', () => {
      const state = manager.initializeState();
      const result = manager.handlePaymentSuccess(state);

      expect(result.event.type).toBe('retry_succeeded');
    });
  });

  describe('needsAction', () => {
    it('should return false for active subscription', () => {
      const state = manager.initializeState();
      expect(manager.needsAction(state)).toBe(false);
    });

    it('should return false for expired subscription', () => {
      const state: DunningState = {
        ...manager.initializeState(),
        stage: 'expired',
      };
      expect(manager.needsAction(state)).toBe(false);
    });

    it('should return true when retry is due', () => {
      const state: DunningState = {
        ...manager.initializeState(),
        stage: 'retrying',
        nextRetryAt: new Date(Date.now() - 1000), // Past due
      };
      expect(manager.needsAction(state)).toBe(true);
    });

    it('should return false when retry is not due', () => {
      const state: DunningState = {
        ...manager.initializeState(),
        stage: 'retrying',
        nextRetryAt: new Date(Date.now() + 86400000), // Tomorrow
      };
      expect(manager.needsAction(state)).toBe(false);
    });

    it('should return true when grace period expired', () => {
      const state: DunningState = {
        ...manager.initializeState(),
        stage: 'suspended',
        expiresAt: new Date(Date.now() - 1000), // Past due
      };
      expect(manager.needsAction(state)).toBe(true);
    });
  });

  describe('getSubscriptionsNeedingAction', () => {
    it('should return subscriptions needing action', () => {
      const subscriptions = [
        {
          id: 'sub1',
          dunningState: {
            ...manager.initializeState(),
            stage: 'retrying' as const,
            nextRetryAt: new Date(Date.now() - 1000),
          },
        },
        {
          id: 'sub2',
          dunningState: manager.initializeState(),
        },
        {
          id: 'sub3',
          dunningState: {
            ...manager.initializeState(),
            stage: 'suspended' as const,
            expiresAt: new Date(Date.now() - 1000),
          },
        },
      ];

      const result = manager.getSubscriptionsNeedingAction(subscriptions);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('sub1');
      expect(result[0].action).toBe('retry');
      expect(result[1].id).toBe('sub3');
      expect(result[1].action).toBe('expire');
    });
  });
});
