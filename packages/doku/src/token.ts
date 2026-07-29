import { createDokuTokenSignature } from './signature';

export interface DokuTokenClientOptions {
  clientId: string;
  privateKey: string;
  baseUrl: string;
  fetch?: typeof globalThis.fetch;
  tokenSkewSeconds?: number;
}

export interface DokuTokenResponse { accessToken?: string; tokenType?: string; expiresIn?: number; responseCode?: string; responseMessage?: string; }

export class DokuTokenClient {
  private readonly options: DokuTokenClientOptions;
  private cached?: { value: string; expiresAt: number };
  constructor(options: DokuTokenClientOptions) { this.options = options; }

  async getAccessToken(): Promise<string> {
    const now = Date.now();
    const skew = (this.options.tokenSkewSeconds ?? 30) * 1000;
    if (this.cached && this.cached.expiresAt - skew > now) return this.cached.value;
    const timestamp = new Date(now).toISOString();
    const response = await (this.options.fetch ?? fetch)(`${this.options.baseUrl}/authorization/v1/access-token/b2b`, {
      method: 'POST', headers: {
        'Content-Type': 'application/json', 'X-CLIENT-KEY': this.options.clientId,
        'X-TIMESTAMP': timestamp, 'X-SIGNATURE': createDokuTokenSignature(this.options.clientId, timestamp, this.options.privateKey),
      }, body: JSON.stringify({ grantType: 'client_credentials' }),
    });
    const raw = await response.text();
    let data: DokuTokenResponse;
    try { data = JSON.parse(raw) as DokuTokenResponse; } catch { throw new Error(`DOKU token failed: ${response.status} ${raw}`); }
    if (!response.ok || !data.accessToken) throw new Error(`DOKU token failed: ${response.status} ${data.responseMessage ?? raw}`);
    const expiresIn = Number(data.expiresIn ?? 900);
    this.cached = { value: data.accessToken, expiresAt: now + expiresIn * 1000 };
    return data.accessToken;
  }
}
