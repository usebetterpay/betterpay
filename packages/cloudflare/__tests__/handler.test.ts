import { describe, it, expect, vi } from 'vitest';
import { payHandler } from '../src/index';

describe('@betterpay/cloudflare handler', () => {
  it('returns a function', () => {
    const mockPay = { handler: vi.fn() } as any;
    const handler = payHandler(mockPay);
    expect(typeof handler).toBe('function');
  });

  it('delegates to pay.handler ignoring extra CF args', async () => {
    const mockResponse = new Response('{"ok":true}', { status: 200 });
    const mockPay = { handler: vi.fn().mockResolvedValue(mockResponse) } as any;
    const handler = payHandler(mockPay);

    const request = new Request('http://localhost/pay/api/webhook/midtrans', {
      method: 'POST',
      body: '{"order_id":"o1"}',
    });

    // CF Workers passes env and ctx as additional args
    const mockEnv = { DATABASE_URL: 'pg://...' };
    const mockCtx = { waitUntil: vi.fn() };

    const response = await handler(request, mockEnv, mockCtx);
    expect(mockPay.handler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });
});
