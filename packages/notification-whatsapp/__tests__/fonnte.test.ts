import { describe, it, expect, vi } from 'vitest';
import {
  createFonnteChannel,
  notificationWhatsapp,
  normalizePhone,
} from '../src/index';

describe('normalizePhone', () => {
  it('converts 08… to 628…', () => {
    expect(normalizePhone('081234567890')).toBe('6281234567890');
  });

  it('keeps 62 prefix', () => {
    expect(normalizePhone('6281234567890')).toBe('6281234567890');
  });
});

describe('createFonnteChannel', () => {
  it('POSTs to Fonnte /send', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ status: true }),
      text: async () => '',
    });

    const ch = createFonnteChannel({
      apiKey: 'token_test',
      fetch: fetchFn as unknown as typeof fetch,
    });

    await ch.send({
      name: 'payment.failed',
      customerPhone: '081234567890',
      payload: { subscriptionId: 'sub_1' },
    });

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.fonnte.com/send');
    expect(init.headers.Authorization).toBe('token_test');
    expect(init.body).toContain('target=6281234567890');
    expect(init.body).toContain('payment.failed');
  });

  it('skips without phone', async () => {
    const fetchFn = vi.fn();
    const ch = createFonnteChannel({
      apiKey: 't',
      fetch: fetchFn as unknown as typeof fetch,
    });
    await ch.send({ name: 'invoice.created', payload: {} });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('throws on Fonnte logical failure', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      headers: { get: () => 'application/json' },
      json: async () => ({ status: false, reason: 'invalid token' }),
    });
    const ch = createFonnteChannel({
      apiKey: 'bad',
      defaultTarget: '628111',
      fetch: fetchFn as unknown as typeof fetch,
    });
    await expect(
      ch.send({ name: 'payment.failed', payload: {} }),
    ).rejects.toThrow(/invalid token/);
  });
});

describe('notificationWhatsapp plugin', () => {
  it('registers channel', () => {
    const p = notificationWhatsapp({ apiKey: 'tok' });
    expect(p.id).toBe('notification-whatsapp');
    expect(p.notificationChannels).toHaveLength(1);
  });

  it('requires apiKey', () => {
    expect(() => notificationWhatsapp({ apiKey: '' })).toThrow(/apiKey/);
  });
});
