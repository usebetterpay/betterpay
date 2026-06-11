import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MigrationRunner, createMigrationRunner, generateMigration } from '../src/database/migration-runner';
import { MigrationError } from '../src/errors/betterpay-error';
import { existsSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'fs';
import { join } from 'path';

describe('MigrationRunner', () => {
  const testMigrationsPath = join(__dirname, 'test-migrations');
  let runner: MigrationRunner;

  beforeEach(() => {
    // Create test migrations directory
    if (!existsSync(testMigrationsPath)) {
      mkdirSync(testMigrationsPath, { recursive: true });
    }

    runner = createMigrationRunner({
      databaseUrl: 'postgresql://test:test@localhost:5432/test',
      migrationsPath: testMigrationsPath,
      tableName: 'test_migrations',
    });
  });

  afterEach(() => {
    // Clean up test migrations
    if (existsSync(testMigrationsPath)) {
      rmSync(testMigrationsPath, { recursive: true, force: true });
    }
  });

  describe('getAvailableMigrations', () => {
    it('should return empty array when no migrations', () => {
      const migrations = runner.getAvailableMigrations();
      expect(migrations).toEqual([]);
    });

    it('should read migration files from directory', () => {
      writeFileSync(
        join(testMigrationsPath, '001_create_users.sql'),
        'CREATE TABLE users (id SERIAL PRIMARY KEY);',
      );

      const migrations = runner.getAvailableMigrations();
      expect(migrations).toHaveLength(1);
      expect(migrations[0].id).toBe('001_create_users');
      expect(migrations[0].sql).toContain('CREATE TABLE users');
      expect(migrations[0].hash).toHaveLength(64); // SHA-256 hex
    });

    it('should sort migrations by filename', () => {
      writeFileSync(join(testMigrationsPath, '002_add_email.sql'), 'ALTER TABLE users ADD email TEXT;');
      writeFileSync(join(testMigrationsPath, '001_create_users.sql'), 'CREATE TABLE users (id SERIAL PRIMARY KEY);');
      writeFileSync(join(testMigrationsPath, '003_add_index.sql'), 'CREATE INDEX idx_users_email ON users(email);');

      const migrations = runner.getAvailableMigrations();
      expect(migrations).toHaveLength(3);
      expect(migrations[0].id).toBe('001_create_users');
      expect(migrations[1].id).toBe('002_add_email');
      expect(migrations[2].id).toBe('003_add_index');
    });

    it('should ignore non-SQL files', () => {
      writeFileSync(join(testMigrationsPath, '001_create_users.sql'), 'CREATE TABLE users;');
      writeFileSync(join(testMigrationsPath, 'README.md'), '# Migrations');

      const migrations = runner.getAvailableMigrations();
      expect(migrations).toHaveLength(1);
    });
  });

  describe('generateMigration', () => {
    it('should generate migration content with header', () => {
      const sql = 'CREATE TABLE test (id SERIAL PRIMARY KEY);';
      const filePath = generateMigration('create_test', sql, testMigrationsPath);

      expect(filePath).toContain('create_test');
      expect(filePath).toMatch(/\.sql$/);
      expect(existsSync(filePath)).toBe(true);

      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('-- Migration: create_test');
      expect(content).toContain('-- Generated:');
      expect(content).toContain('-- Hash:');
      expect(content).toContain(sql);
    });

    it('should generate consistent hash', () => {
      const sql = 'CREATE TABLE test (id SERIAL PRIMARY KEY);';
      const filePath1 = generateMigration('create_test', sql, testMigrationsPath);
      const filePath2 = generateMigration('create_test', sql, testMigrationsPath);

      // Extract hash from both files
      const content1 = readFileSync(filePath1, 'utf-8');
      const content2 = readFileSync(filePath2, 'utf-8');
      const hash1 = content1.match(/-- Hash: ([a-f0-9]+)/)?.[1];
      const hash2 = content2.match(/-- Hash: ([a-f0-9]+)/)?.[1];

      expect(hash1).toBe(hash2);
    });
  });

  describe('constructor', () => {
    it('should create runner with config', () => {
      expect(runner).toBeInstanceOf(MigrationRunner);
    });

    it('should use default table name', () => {
      const defaultRunner = createMigrationRunner({
        databaseUrl: 'postgresql://test:test@localhost:5432/test',
        migrationsPath: testMigrationsPath,
      });

      expect(defaultRunner).toBeInstanceOf(MigrationRunner);
    });
  });

  // Note: Integration tests with real database would go here
  // They require a running PostgreSQL instance
  describe('integration (mocked)', () => {
    it('should throw MigrationError on connection failure', async () => {
      await expect(runner.connect()).rejects.toThrow(MigrationError);
    });

    it('should require connection before operations', async () => {
      await expect(runner.getAppliedMigrations()).rejects.toThrow('Database not connected');
    });
  });
});
