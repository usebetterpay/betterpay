// Cron Endpoint for Billing Cycle Automation
// Provides secure HTTP endpoint to trigger billing cycles

import { createHmac } from 'crypto';

export interface CronConfig {
  /** Secret for authenticating cron requests */
  cronSecret: string;
  /** Allowed IPs (optional, for additional security) */
  allowedIPs?: string[];
  /** Request timeout in milliseconds */
  timeoutMs?: number;
}

export interface CronRequest {
  timestamp: number;
  signature: string;
  ipAddress?: string;
}

export interface CronResponse {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  errors: Array<{ subscriptionId: string; error: string }>;
  durationMs: number;
}

export class CronEndpoint {
  constructor(private config: CronConfig) {
    if (!config.cronSecret || config.cronSecret.length < 32) {
      throw new Error('Cron secret must be at least 32 characters');
    }
  }

  /**
   * Generate signature for cron request.
   */
  generateSignature(timestamp: number): string {
    const payload = `${timestamp}:${this.config.cronSecret}`;
    return createHmac('sha256', this.config.cronSecret)
      .update(payload)
      .digest('hex');
  }

  /**
   * Validate cron request signature.
   */
  validateSignature(request: CronRequest): boolean {
    const expectedSignature = this.generateSignature(request.timestamp);
    
    // Constant-time comparison to prevent timing attacks
    if (expectedSignature.length !== request.signature.length) {
      return false;
    }

    let mismatch = 0;
    for (let i = 0; i < expectedSignature.length; i++) {
      mismatch |= expectedSignature.charCodeAt(i) ^ request.signature.charCodeAt(i);
    }

    return mismatch === 0;
  }

  /**
   * Validate request timestamp (prevent replay attacks).
   */
  validateTimestamp(timestamp: number, maxAgeMs: number = 300000): boolean {
    const now = Date.now();
    const age = Math.abs(now - timestamp);
    return age <= maxAgeMs;
  }

  /**
   * Validate IP address if configured.
   */
  validateIP(ipAddress?: string): boolean {
    if (!this.config.allowedIPs || this.config.allowedIPs.length === 0) {
      return true;
    }

    if (!ipAddress) {
      return false;
    }

    return this.config.allowedIPs.includes(ipAddress);
  }

  /**
   * Authenticate cron request.
   */
  authenticate(request: CronRequest): { valid: boolean; error?: string } {
    // Check timestamp
    if (!this.validateTimestamp(request.timestamp)) {
      return { valid: false, error: 'Request timestamp expired' };
    }

    // Check signature
    if (!this.validateSignature(request)) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Check IP if configured
    if (!this.validateIP(request.ipAddress)) {
      return { valid: false, error: 'IP address not allowed' };
    }

    return { valid: true };
  }

  /**
   * Generate cron URL with authentication.
   */
  generateCronUrl(baseUrl: string): string {
    const timestamp = Date.now();
    const signature = this.generateSignature(timestamp);
    return `${baseUrl}/api/cron/billing?timestamp=${timestamp}&signature=${signature}`;
  }

  /**
   * Create cron headers for HTTP request.
   */
  createCronHeaders(): Record<string, string> {
    const timestamp = Date.now();
    const signature = this.generateSignature(timestamp);
    return {
      'X-Cron-Timestamp': timestamp.toString(),
      'X-Cron-Signature': signature,
    };
  }
}

/**
 * Create cron endpoint handler for Express/Fastify/Hono.
 */
export function createCronHandler(
  cronEndpoint: CronEndpoint,
  runBillingCycle: () => Promise<CronResponse>,
) {
  return async (req: any, res: any) => {
    const startTime = Date.now();

    try {
      // Extract authentication from headers or query params
      const timestamp = parseInt(
        req.headers['x-cron-timestamp'] || req.query.timestamp || '0',
        10,
      );
      const signature =
        req.headers['x-cron-signature'] || req.query.signature || '';
      const ipAddress =
        req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        req.ip ||
        req.socket?.remoteAddress;

      // Authenticate request
      const auth = cronEndpoint.authenticate({
        timestamp,
        signature,
        ipAddress,
      });

      if (!auth.valid) {
        res.status(401).json({
          error: 'Unauthorized',
          message: auth.error,
        });
        return;
      }

      // Run billing cycle
      const result = await runBillingCycle();
      const durationMs = Date.now() - startTime;

      res.status(200).json({
        ...result,
        durationMs,
      });
    } catch (error) {
      const durationMs = Date.now() - startTime;
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs,
      });
    }
  };
}

/**
 * Generate cron job templates for different platforms.
 */
export function generateCronTemplates(config: {
  baseUrl: string;
  cronSecret: string;
  schedule?: string;
}): Record<string, string> {
  const endpoint = new CronEndpoint({ cronSecret: config.cronSecret });
  const schedule = config.schedule || '0 0 * * *'; // Daily at midnight
  const cronUrl = endpoint.generateCronUrl(config.baseUrl);

  return {
    // Vercel Cron
    vercel: JSON.stringify(
      {
        crons: [
          {
            path: '/api/cron/billing',
            schedule,
          },
        ],
      },
      null,
      2,
    ),

    // Railway Cron
    railway: `# railway.toml
[cron]
schedule = "${schedule}"
command = "curl -X POST '${cronUrl}'"`,

    // Node-cron
    nodeCron: `import cron from 'node-cron';
import fetch from 'node-fetch';

cron.schedule('${schedule}', async () => {
  try {
    const response = await fetch('${cronUrl}', {
      method: 'POST',
    });
    const result = await response.json();
    console.log('Billing cycle completed:', result);
  } catch (error) {
    console.error('Billing cycle failed:', error);
  }
});`,

    // Kubernetes CronJob
    kubernetes: `apiVersion: batch/v1
kind: CronJob
metadata:
  name: betterpay-billing
spec:
  schedule: "${schedule}"
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: billing-cron
            image: curlimages/curl
            args:
            - /bin/sh
            - -c
            - curl -X POST '${cronUrl}'
          restartPolicy: OnFailure`,

    // GitHub Actions
    githubActions: `name: Billing Cycle
on:
  schedule:
    - cron: '${schedule.split(' ').reverse().join(' ')}' # Convert to GitHub cron format

jobs:
  run-billing:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger billing cycle
        run: |
          curl -X POST '${cronUrl}'`,

    // AWS EventBridge + Lambda
    awsEventBridge: `{
  "name": "betterpay-billing",
  "scheduleExpression": "cron(${schedule.split(' ').join(' ')})",
  "targets": [
    {
      "id": "billing-lambda",
      "arn": "arn:aws:lambda:region:account:function:billing-handler",
      "input": "{\\"url\\": \\"${cronUrl}\\"}"
    }
  ]
}`,
  };
}

/**
 * Create cron endpoint instance.
 */
export function createCronEndpoint(config: CronConfig): CronEndpoint {
  return new CronEndpoint(config);
}
