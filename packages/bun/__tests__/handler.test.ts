import { describe, it, expect, vi } from 'vitest';
import { payHandler } from '../src/index';

describe('@betterpay/bun handler', () => {
  it('returns a function', () => {
    const mockPay = { handler: vi.fn() } as any;
    const handler = payHandler(mockPay);
    expect(typeof handler).toBe('function');
  });

  it('delegates to pay.handler', async () => {
    const mockResponse = new Response('{"orderId":"o1"}', { status: 200 });
    const mockPay = { handler: vi.fn().mockResolvedValue(mockResponse) } as any;
    const handler = payHandler(mockPay);

    const request = new Request('http://localhost/pay/api/status/o1');
    const response = await handler(request);

    expect(mockPay.handler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.orderId).toBe('o1');
  });

  it('passes through errors', async () => {
    const mockPay = {
      handler: vi.fn().mockRejectedValue(new Error('boom')),
    } as any;
    const handler = payHandler(mockPay);

    const request = new Request('http://localhost/pay/api/broken');
    await expect(handler(request)).rejects.toThrow('boom');
  });
});
