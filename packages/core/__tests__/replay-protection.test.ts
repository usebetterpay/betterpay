import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  validateTimestamp,
  parseTimestampHeader,
  createTimestampHeader,
  DEFAULT_REPLAY_OPTIONS,
} from '../src/webhook/replay-protection';

describe('Replay Protection', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('validateTimestamp', () => {
    it('should accept timestamp within window', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = validateTimestamp(now - 60); // 1 minute ago
      expect(result.valid).toBe(true);
    });

    it('should reject timestamp too old', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = validateTimestamp(now - 400); // 6.6 minutes ago
      expect(result.valid).toBe(false);
      expect(result.error).toContain('too old');
    });

    it('should reject timestamp in future beyond clock skew', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = validateTimestamp(now + 60); // 1 minute in future
      expect(result.valid).toBe(false);
      expect(result.error).toContain('in the future');
    });

    it('should accept timestamp within clock skew tolerance', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = validateTimestamp(now + 20); // 20 seconds in future (within 30s skew)
      expect(result.valid).toBe(true);
    });

    it('should respect custom maxAge', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = validateTimestamp(now - 120, { maxAge: 60000 }); // 2 min ago, max 1 min
      expect(result.valid).toBe(false);
    });

    it('should respect custom clockSkew', () => {
      const now = Math.floor(Date.now() / 1000);
      const result = validateTimestamp(now + 15, { clockSkew: 10000 }); // 15s future, max 10s skew
      expect(result.valid).toBe(false);
    });
  });

  describe('parseTimestampHeader', () => {
    it('should parse valid header', () => {
      const result = parseTimestampHeader('t=1234567890,v1=abc123');
      expect(result).toEqual({
        timestamp: 1234567890,
        signature: 'abc123',
      });
    });

    it('should return null for missing timestamp', () => {
      const result = parseTimestampHeader('v1=abc123');
      expect(result).toBeNull();
    });

    it('should return null for missing signature', () => {
      const result = parseTimestampHeader('t=1234567890');
      expect(result).toBeNull();
    });

    it('should return null for malformed header', () => {
      const result = parseTimestampHeader('invalid');
      expect(result).toBeNull();
    });
  });

  describe('createTimestampHeader', () => {
    it('should create valid header', () => {
      const header = createTimestampHeader('test payload', 'secret');
      expect(header).toMatch(/^t=\d+,v1=[a-f0-9]{64}$/);
    });

    it('should include current timestamp', () => {
      const now = Math.floor(Date.now() / 1000);
      const header = createTimestampHeader('test', 'secret');
      const parsed = parseTimestampHeader(header);
      expect(parsed!.timestamp).toBe(now);
    });
  });
});
