import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPayClient } from '../src/index';

describe('createPayClient', () => {
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockFetch = vi.fn();
  });

  function mockResponse(data: unknown, status = 200) {
    mockFetch.mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: async () => data,
      text: async () => JSON.stringify(data),
    });
  }

  it('uses default baseURL /pay', async () => {
    const client = createPayClient({ fetch: mockFetch });
    mockResponse({ orderId: 'o1', status: 'active' });

    await client.createTransaction({
      orderId: 'o1',
      amount: 100000,
      customerEmail: 'test@test.com',
    });

    expect(mockFetch).toHaveBeenCalledOnce();
    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe('/pay/api/create-transaction');
  });

  it('uses custom baseURL', async () => {
    const client = createPayClient({ baseURL: '/api/betterpay', fetch: mockFetch });
    mockResponse({ orderId: 'o1', status: 'active' });

    await client.createTransaction({
      orderId: 'o1',
      amount: 100000,
      customerEmail: 'test@test.com',
    });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe('/api/betterpay/api/create-transaction');
  });

  it('strips trailing slash from baseURL', async () => {
    const client = createPayClient({ baseURL: '/pay/', fetch: mockFetch });
    mockResponse({ orderId: 'o1' });

    await client.createTransaction({
      orderId: 'o1',
      amount: 100,
      customerEmail: 'x@x.com',
    });

    const url = mockFetch.mock.calls[0][0];
    expect(url).toBe('/pay/api/create-transaction');
  });

  it('createTransaction sends POST with body', async () => {
    const client = createPayClient({ fetch: mockFetch });
    mockResponse({ orderId: 'o1', paymentUrl: 'https://pay.test/abc', status: 'active' });

    const result = await client.createTransaction({
      orderId: 'o1',
      amount: 199000,
      currency: 'IDR',
      customerEmail: 'budi@test.com',
    });

    expect(result.orderId).toBe('o1');
    expect(result.status).toBe('active');

    const [, init] = mockFetch.mock.calls[0];
    expect(init.method).toBe('POST');
    const body = JSON.parse(init.body);
    expect(body.orderId).toBe('o1');
    expect(body.amount).toBe(199000);
  });

  it('status sends GET request', async () => {
    const client = createPayClient({ fetch: mockFetch });
    mockResponse({ orderId: 'o1', status: 'completed', amount: 100000 });

    const result = await client.status({ orderId: 'o1' });

    expect(result.status).toBe('completed');
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/pay/api/status/o1');
    expect(init.method).toBe('GET');
  });

  it('throws on API error', async () => {
    const client = createPayClient({ fetch: mockFetch });
    mockResponse({ error: 'Not found' }, 404);

    await expect(client.status({ orderId: 'nonexistent' })).rejects.toThrow('BetterPay API error 404');
  });

  it('call() with data sends POST', async () => {
    const client = createPayClient({ fetch: mockFetch });
    mockResponse({ custom: 'response' });

    const result = await client.call('/api/some-endpoint', { key: 'value' });
    expect(result).toEqual({ custom: 'response' });

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/pay/api/some-endpoint');
    expect(init.method).toBe('POST');
  });

  it('call() without data sends GET', async () => {
    const client = createPayClient({ fetch: mockFetch });
    mockResponse({ data: 'here' });

    await client.call('/api/list');

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe('/pay/api/list');
    expect(init.method).toBe('GET');
  });

  it('proxy dispatches unknown methods to /api/kebab-case', async () => {
    const client = createPayClient({ fetch: mockFetch });
    mockResponse({ result: 'ok' });

    // call a non-standard method via proxy
    const result = await (client as any).someCustomEndpoint({ foo: 'bar' });
    expect(result).toEqual({ result: 'ok' });

    const [url] = mockFetch.mock.calls[0];
    expect(url).toBe('/pay/api/some-custom-endpoint');
  });

  it('includes custom headers', async () => {
    const client = createPayClient({
      fetch: mockFetch,
      headers: { Authorization: 'Bearer token123' },
    });
    mockResponse({ ok: true });

    await client.createTransaction({
      orderId: 'o1',
      amount: 100,
      customerEmail: 'x@x.com',
    });

    const [, init] = mockFetch.mock.calls[0];
    expect(init.headers.Authorization).toBe('Bearer token123');
  });
});
