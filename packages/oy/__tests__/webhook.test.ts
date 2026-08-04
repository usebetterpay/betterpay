import { describe, expect, it } from 'vitest';
import { oyProvider } from '../src/adapter';

describe('OY! provider — webhook', () => {
  it('verifies with allowlisted IP', async () => {
    const provider = oyProvider({ username: 'user1', apiKey: 'key123', allowedIps: ['1.2.3.4'] });
    expect(await provider.verifyWebhook({ body: '{}', headers: { 'x-forwarded-for': '1.2.3.4', 'x-oy-username': 'user1' } })).toBe(true);
    expect(await provider.verifyWebhook({ body: '{}', headers: { 'x-forwarded-for': '9.9.9.9' } })).toBe(false);
  });

  it('normalizes payout.completed event', async () => {
    const provider = oyProvider({ username: 'user1', apiKey: 'key123' });
    const ev = await provider.normalizeWebhook({
      body: JSON.stringify({ trxId: 'trx-123', status: 'SUCCESS', amount: '100000' }),
      headers: {},
    });
    expect(ev[0]?.name).toBe('payout.completed');
    expect(ev[0]?.providerEventId).toBe('trx-123');
  });

  it('normalizes payout.pending for unknown code', async () => {
    const provider = oyProvider({ username: 'user1', apiKey: 'key123' });
    const ev = await provider.normalizeWebhook({
      body: JSON.stringify({ trxId: 'trx-123', status: 'PENDING' }),
      headers: {},
    });
    expect(ev[0]?.name).toBe('payout.pending');
  });

  it('returns empty on malformed JSON', async () => {
    const provider = oyProvider({ username: 'user1', apiKey: 'key123' });
    expect(await provider.normalizeWebhook({ body: 'not json', headers: {} })).toEqual([]);
  });
});
