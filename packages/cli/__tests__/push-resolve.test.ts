import { describe, it, expect, afterEach } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { resolveMigrationsPath } from '../src/commands/push';

describe('resolveMigrationsPath', () => {
  const prev = process.env.BETTERPAY_MIGRATIONS_PATH;

  afterEach(() => {
    if (prev === undefined) delete process.env.BETTERPAY_MIGRATIONS_PATH;
    else process.env.BETTERPAY_MIGRATIONS_PATH = prev;
  });

  it('finds monorepo drizzle-adapter migrations', () => {
    delete process.env.BETTERPAY_MIGRATIONS_PATH;
    const path = resolveMigrationsPath();
    expect(path).toBeTruthy();
    expect(existsSync(join(path!, '001_betterpay_schema.sql'))).toBe(true);
  });

  it('honors BETTERPAY_MIGRATIONS_PATH', () => {
    const monorepo = resolveMigrationsPath();
    expect(monorepo).toBeTruthy();
    process.env.BETTERPAY_MIGRATIONS_PATH = monorepo!;
    expect(resolveMigrationsPath()).toBe(monorepo);
  });
});
