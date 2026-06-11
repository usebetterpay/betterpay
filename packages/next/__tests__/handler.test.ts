import { describe, it, expect, vi } from 'vitest';
import { payHandler } from '../src/index';

describe('@betterpay/next handler', () => {
  it('returns GET and POST handlers', () => {
    const mockPay = { handler: vi.fn() } as any;
    const result = payHandler(mockPay);

    expect(result).toHaveProperty('GET');
    expect(result).toHaveProperty('POST');
    expect(typeof result.GET).toBe('function');
    expect(typeof result.POST).toBe('function');
  });

  it('GET delegates to pay.handler', async () => {
    const mockResponse = new Response('{"ok":true}', { status: 200 });
    const mockPay = { handler: vi.fn().mockResolvedValue(mockResponse) } as any;
    const { GET } = payHandler(mockPay);

    const request = new Request('http://localhost/pay/api/status/o1');
    const response = await GET(request);

    expect(mockPay.handler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });

  it('POST delegates to pay.handler', async () => {
    const mockResponse = new Response('{"orderId":"o1"}', { status: 200 });
    const mockPay = { handler: vi.fn().mockResolvedValue(mockResponse) } as any;
    const { POST } = payHandler(mockPay);

    const request = new Request('http://localhost/pay/api/create-transaction', {
      method: 'POST',
      body: JSON.stringify({ orderId: 'o1' }),
    });
    const response = await POST(request);

    expect(mockPay.handler).toHaveBeenCalledWith(request);
    expect(response.status).toBe(200);
  });
});
