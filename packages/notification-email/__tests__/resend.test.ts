import { describe, it, expect, vi } from 'vitest';
import { createResendChannel, notificationEmail } from '../src/index';

describe('notificationEmail / Resend', () => {
  it('sends email via Resend API', async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '',
    });

    const ch = createResendChannel({
      apiKey: 're_test',
      from: 'billing@example.com',
      fetch: fetchFn as unknown as typeof fetch,
    });

    await ch.send({
      name: 'invoice.created',
      customerEmail: 'user@example.com',
      payload: { amount: 1000 },
    });

    expect(fetchFn).toHaveBeenCalledOnce();
    const [url, init] = fetchFn.mock.calls[0];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(['user@example.com']);
    expect(body.from).toBe('billing@example.com');
    expect(body.subject).toContain('Invoice');
  });

  it('skips when no customerEmail', async () => {
    const fetchFn = vi.fn();
    const ch = createResendChannel({
      apiKey: 're_test',
      from: 'billing@example.com',
      fetch: fetchFn as unknown as typeof fetch,
    });
    await ch.send({ name: 'payment.failed', payload: {} });
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('plugin exposes notificationChannels', () => {
    const plugin = notificationEmail({
      apiKey: 're_test',
      from: 'a@b.c',
    });
    expect(plugin.id).toBe('notification-email');
    expect(plugin.notificationChannels).toHaveLength(1);
  });

  it('throws without apiKey', () => {
    expect(() =>
      notificationEmail({ apiKey: '', from: 'a@b.c' }),
    ).toThrow(/apiKey/);
  });
});
