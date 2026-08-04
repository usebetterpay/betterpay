import { describe, expect, it } from 'vitest';
import { createOyHeaders, verifyOyWebhook, verifyOyIp } from '../src/signature';

describe('OY! signatures — headers & IP', () => {
  it('creates correct headers', () => {
    const h = createOyHeaders('user1', 'key123');
    expect(h['X-OY-Username']).toBe('user1');
    expect(h['X-Api-Key']).toBe('key123');
  });

  it('verifies IP allowlist', () => {
    expect(verifyOyIp('1.2.3.4', ['1.2.3.4', '5.6.7.8'])).toBe(true);
    expect(verifyOyIp('9.9.9.9', ['1.2.3.4'])).toBe(false);
    expect(verifyOyIp('1.2.3.4', [])).toBe(true);
    expect(verifyOyIp(undefined, ['1.2.3.4'])).toBe(false);
  });

  it('verifies webhook with IP allowlist', () => {
    expect(verifyOyWebhook({ 'x-oy-username': 'user1' }, '1.2.3.4', ['1.2.3.4'])).toBe(true);
    expect(verifyOyWebhook({}, '9.9.9.9', ['1.2.3.4'])).toBe(false);
  });

  it('verifies webhook without IP but with headers', () => {
    expect(verifyOyWebhook({ 'x-oy-username': 'user1' }, undefined, undefined)).toBe(true);
    expect(verifyOyWebhook({}, undefined, undefined)).toBe(false);
  });
});
