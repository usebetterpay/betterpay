import { describe, it, expect, beforeEach } from 'vitest';
import {
  CronEndpoint,
  createCronEndpoint,
  generateCronTemplates,
} from '../src/cron/cron-endpoint';

describe('CronEndpoint', () => {
  let endpoint: CronEndpoint;
  const cronSecret = 'test-cron-secret-with-enough-length-12345';

  beforeEach(() => {
    endpoint = createCronEndpoint({ cronSecret });
  });

  describe('constructor', () => {
    it('should create endpoint with valid secret', () => {
      expect(endpoint).toBeInstanceOf(CronEndpoint);
    });

    it('should throw with short secret', () => {
      expect(() => createCronEndpoint({ cronSecret: 'short' })).toThrow(
        'at least 32 characters',
      );
    });
  });

  describe('generateSignature', () => {
    it('should generate consistent signature', () => {
      const timestamp = 1234567890;
      const sig1 = endpoint.generateSignature(timestamp);
      const sig2 = endpoint.generateSignature(timestamp);

      expect(sig1).toBe(sig2);
      expect(sig1).toHaveLength(64); // SHA-256 hex
    });

    it('should generate different signatures for different timestamps', () => {
      const sig1 = endpoint.generateSignature(1234567890);
      const sig2 = endpoint.generateSignature(1234567891);

      expect(sig1).not.toBe(sig2);
    });
  });

  describe('validateSignature', () => {
    it('should validate correct signature', () => {
      const timestamp = Date.now();
      const signature = endpoint.generateSignature(timestamp);

      expect(endpoint.validateSignature({ timestamp, signature })).toBe(true);
    });

    it('should reject invalid signature', () => {
      const timestamp = Date.now();
      const signature = 'invalid-signature';

      expect(endpoint.validateSignature({ timestamp, signature })).toBe(false);
    });

    it('should reject tampered signature', () => {
      const timestamp = Date.now();
      const signature = endpoint.generateSignature(timestamp) + 'tampered';

      expect(endpoint.validateSignature({ timestamp, signature })).toBe(false);
    });
  });

  describe('validateTimestamp', () => {
    it('should accept recent timestamp', () => {
      const timestamp = Date.now();
      expect(endpoint.validateTimestamp(timestamp)).toBe(true);
    });

    it('should reject old timestamp', () => {
      const timestamp = Date.now() - 600000; // 10 minutes ago
      expect(endpoint.validateTimestamp(timestamp)).toBe(false);
    });

    it('should accept future timestamp within tolerance', () => {
      const timestamp = Date.now() + 60000; // 1 minute in future
      expect(endpoint.validateTimestamp(timestamp)).toBe(true);
    });

    it('should respect custom maxAge', () => {
      const timestamp = Date.now() - 120000; // 2 minutes ago
      expect(endpoint.validateTimestamp(timestamp, 60000)).toBe(false);
      expect(endpoint.validateTimestamp(timestamp, 180000)).toBe(true);
    });
  });

  describe('validateIP', () => {
    it('should allow any IP when not configured', () => {
      expect(endpoint.validateIP('1.2.3.4')).toBe(true);
      expect(endpoint.validateIP(undefined)).toBe(true);
    });

    it('should allow configured IP', () => {
      const ep = createCronEndpoint({
        cronSecret,
        allowedIPs: ['1.2.3.4', '5.6.7.8'],
      });
      expect(ep.validateIP('1.2.3.4')).toBe(true);
    });

    it('should reject non-configured IP', () => {
      const ep = createCronEndpoint({
        cronSecret,
        allowedIPs: ['1.2.3.4'],
      });
      expect(ep.validateIP('9.9.9.9')).toBe(false);
    });

    it('should reject missing IP when configured', () => {
      const ep = createCronEndpoint({
        cronSecret,
        allowedIPs: ['1.2.3.4'],
      });
      expect(ep.validateIP(undefined)).toBe(false);
    });
  });

  describe('authenticate', () => {
    it('should authenticate valid request', () => {
      const timestamp = Date.now();
      const signature = endpoint.generateSignature(timestamp);

      const result = endpoint.authenticate({ timestamp, signature });
      expect(result.valid).toBe(true);
    });

    it('should reject expired timestamp', () => {
      const timestamp = Date.now() - 600000;
      const signature = endpoint.generateSignature(timestamp);

      const result = endpoint.authenticate({ timestamp, signature });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('should reject invalid signature', () => {
      const timestamp = Date.now();
      const signature = 'invalid';

      const result = endpoint.authenticate({ timestamp, signature });
      expect(result.valid).toBe(false);
      expect(result.error).toContain('signature');
    });
  });

  describe('generateCronUrl', () => {
    it('should generate valid URL', () => {
      const url = endpoint.generateCronUrl('https://example.com');
      expect(url).toMatch(/^https:\/\/example\.com\/api\/cron\/billing\?/);
      expect(url).toContain('timestamp=');
      expect(url).toContain('signature=');
    });
  });

  describe('createCronHeaders', () => {
    it('should create valid headers', () => {
      const headers = endpoint.createCronHeaders();
      expect(headers['X-Cron-Timestamp']).toMatch(/^\d+$/);
      expect(headers['X-Cron-Signature']).toHaveLength(64);
    });
  });
});

describe('generateCronTemplates', () => {
  it('should generate all templates', () => {
    const templates = generateCronTemplates({
      baseUrl: 'https://example.com',
      cronSecret: 'test-secret-with-enough-length-12345',
    });

    expect(templates.vercel).toBeDefined();
    expect(templates.railway).toBeDefined();
    expect(templates.nodeCron).toBeDefined();
    expect(templates.kubernetes).toBeDefined();
    expect(templates.githubActions).toBeDefined();
    expect(templates.awsEventBridge).toBeDefined();
  });

  it('should include base URL in templates', () => {
    const templates = generateCronTemplates({
      baseUrl: 'https://myapp.com',
      cronSecret: 'test-secret-with-enough-length-12345',
    });

    // Vercel uses relative paths, not full URLs
    expect(templates.vercel).toContain('/api/cron/billing');
    expect(templates.railway).toContain('myapp.com');
    expect(templates.nodeCron).toContain('myapp.com');
  });
});
