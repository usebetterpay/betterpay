import { describe, it, expect, vi } from 'vitest';
import { payHandler } from '../src/index';
import { Readable } from 'node:stream';

// Mock Express request/response
function createMockReq(options: {
  method?: string;
  url?: string;
  headers?: Record<string, string>;
  body?: string;
}) {
  const method = options.method ?? 'GET';
  const url = options.url ?? '/pay/api/status/o1';
  const headers = { host: 'localhost:3000', ...options.headers };

  const req = {
    method,
    url,
    headers,
    on: vi.fn(),
  };

  // Simulate body events for POST
  if (options.body) {
    req.on.mockImplementation((event: string, cb: (...args: any[]) => void) => {
      if (event === 'data') {
        cb(Buffer.from(options.body!));
      }
      if (event === 'end') {
        // Call end after data
        setTimeout(() => cb(), 0);
      }
    });
  } else {
    req.on.mockImplementation((event: string, cb: (...args: any[]) => void) => {
      if (event === 'end') {
        setTimeout(() => cb(), 0);
      }
    });
  }

  return req;
}

function createMockRes() {
  const res: any = {
    writeHead: vi.fn(),
    end: vi.fn(),
  };
  return res;
}

describe('@betterpay/express handler', () => {
  it('returns a function', () => {
    const mockPay = { handler: vi.fn() } as any;
    const handler = payHandler(mockPay);
    expect(typeof handler).toBe('function');
  });

  it('converts GET request and delegates to pay.handler', async () => {
    const mockResponse = new Response('{"orderId":"o1"}', {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
    const mockPay = { handler: vi.fn().mockResolvedValue(mockResponse) } as any;
    const handler = payHandler(mockPay);

    const req = createMockReq({ method: 'GET', url: '/pay/api/status/o1' });
    const res = createMockRes();
    const next = vi.fn();

    await handler(req as any, res, next);

    expect(mockPay.handler).toHaveBeenCalledOnce();
    expect(res.writeHead).toHaveBeenCalledWith(200, expect.any(Object));
    expect(res.end).toHaveBeenCalledOnce();
  });
});
