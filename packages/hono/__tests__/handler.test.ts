import { describe, it, expect, vi } from 'vitest';
import { payHandler } from '../src/index';

describe('@betterpay/hono handler', () => {
  it('returns a function', () => {
    const mockPay = { handler: vi.fn() } as any;
    const handler = payHandler(mockPay);
    expect(typeof handler).toBe('function');
  });

  it('delegates to pay.handler with raw request', async () => {
    const mockResponse = new Response('{"ok":true}', { status: 200 });
    const mockPay = { handler: vi.fn().mockResolvedValue(mockResponse) } as any;
    const handler = payHandler(mockPay);

    const request = new Request('http://localhost/pay/api/status/o1');
    const mockCtx = { req: { raw: request } };

    const response = await handler(mockCtx as any);
    expect(mockPay.handler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });
});
