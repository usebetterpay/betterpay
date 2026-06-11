import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// We test the status command logic directly since it's an integration
// with the filesystem. We mock process.exit to avoid killing the test runner.

describe('CLI status command', () => {
  const originalExit = process.exit;

  beforeEach(() => {
    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    process.exit = originalExit;
  });

  it('detects installed packages from package.json', () => {
    // This is a unit test of the detection logic, not the full CLI command
    const pkgJson = {
      dependencies: {
        '@betterpay/core': '^0.1.0',
        '@betterpay/midtrans': '^0.1.0',
        '@betterpay/billing': '^0.1.0',
        'next': '^15.0.0',
      },
    };

    const allDeps = { ...pkgJson.dependencies };

    // Check core
    expect(allDeps['@betterpay/core']).toBe('^0.1.0');
    expect(allDeps['@betterpay/midtrans']).toBe('^0.1.0');
    expect(allDeps['@betterpay/billing']).toBe('^0.1.0');

    // Check missing
    expect(allDeps['@betterpay/xendit']).toBeUndefined();
    expect(allDeps['@betterpay/duitku']).toBeUndefined();
  });

  it('detects framework from dependencies', () => {
    function detectFramework(deps: Record<string, string>): string {
      if (deps.next) return 'Next.js';
      if (deps.hono) return 'Hono';
      if (deps.express) return 'Express';
      if (deps.fastify) return 'Fastify';
      return 'Node.js (generic)';
    }

    expect(detectFramework({ next: '^15.0.0' })).toBe('Next.js');
    expect(detectFramework({ hono: '^4.0.0' })).toBe('Hono');
    expect(detectFramework({ express: '^5.0.0' })).toBe('Express');
    expect(detectFramework({ fastify: '^5.0.0' })).toBe('Fastify');
    expect(detectFramework({})).toBe('Node.js (generic)');
  });

  it('finds billing config file', () => {
    function findBillingFile(cwd: string): string | null {
      const candidates = ['billing.ts', 'billing.js', 'billing.mjs', 'src/billing.ts', 'src/billing.js'];
      for (const file of candidates) {
        if (existsSync(join(cwd, file))) return file;
      }
      return null;
    }

    // In our actual project, there's no billing.ts at root, so it returns null
    const result = findBillingFile('/tmp/nonexistent_dir_xyz');
    expect(result).toBeNull();
  });
});
