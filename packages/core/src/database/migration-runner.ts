// Database Migration Runner
// Manages schema migrations using Drizzle Kit

import { Pool } from 'pg';
import { readFileSync, readdirSync, existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import { MigrationError } from '../errors/betterpay-error';

export interface MigrationConfig {
  databaseUrl: string;
  migrationsPath: string;
  tableName?: string;
  timeout?: number;
}

export interface Migration {
  id: string;
  name: string;
  sql: string;
  hash: string;
  appliedAt?: Date;
}

export interface MigrationResult {
  applied: string[];
  skipped: string[];
  failed?: { migration: string; error: string };
}

export class MigrationRunner {
  private config: Required<MigrationConfig>;
  private pool: Pool | null = null;

  constructor(config: MigrationConfig) {
    this.config = {
      databaseUrl: config.databaseUrl,
      migrationsPath: config.migrationsPath,
      tableName: config.tableName || 'betterpay_migrations',
      timeout: config.timeout || 30000,
    };
  }

  /**
   * Initialize database connection.
   */
  async connect(): Promise<void> {
    if (this.pool) return;

    this.pool = new Pool({
      connectionString: this.config.databaseUrl,
      max: 1,
      connectionTimeoutMillis: this.config.timeout,
    });

    // Test connection
    try {
      const client = await this.pool.connect();
      client.release();
    } catch (error) {
      throw new MigrationError(
        'Failed to connect to database',
        { databaseUrl: this.config.databaseUrl },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Close database connection.
   */
  async disconnect(): Promise<void> {
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  /**
   * Ensure migrations table exists.
   */
  async ensureMigrationsTable(): Promise<void> {
    if (!this.pool) {
      throw new MigrationError('Database not connected');
    }

    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.config.tableName} (
        id VARCHAR(255) PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        hash VARCHAR(64) NOT NULL,
        applied_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    try {
      await this.pool.query(createTableSQL);
    } catch (error) {
      throw new MigrationError(
        'Failed to create migrations table',
        { tableName: this.config.tableName },
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get list of applied migrations.
   */
  async getAppliedMigrations(): Promise<Migration[]> {
    if (!this.pool) {
      throw new MigrationError('Database not connected');
    }

    try {
      const result = await this.pool.query(
        `SELECT id, name, hash, applied_at FROM ${this.config.tableName} ORDER BY applied_at`,
      );

      return result.rows.map((row) => ({
        id: row.id,
        name: row.name,
        hash: row.hash,
        appliedAt: row.applied_at,
        sql: '', // SQL not stored in DB
      }));
    } catch (error) {
      throw new MigrationError(
        'Failed to fetch applied migrations',
        undefined,
        error instanceof Error ? error : undefined,
      );
    }
  }

  /**
   * Get list of available migrations from filesystem.
   */
  getAvailableMigrations(): Migration[] {
    if (!existsSync(this.config.migrationsPath)) {
      return [];
    }

    const files = readdirSync(this.config.migrationsPath)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    return files.map((file) => {
      const filePath = join(this.config.migrationsPath, file);
      const sql = readFileSync(filePath, 'utf-8');
      const hash = createHash('sha256').update(sql).digest('hex');
      const name = file.replace('.sql', '');

      return {
        id: name,
        name,
        sql,
        hash,
      };
    });
  }

  /**
   * Get pending migrations (not yet applied).
   */
  async getPendingMigrations(): Promise<Migration[]> {
    const applied = await this.getAppliedMigrations();
    const available = this.getAvailableMigrations();

    const appliedIds = new Set(applied.map((m) => m.id));

    return available.filter((m) => !appliedIds.has(m.id));
  }

  /**
   * Validate migration hashes (detect tampering).
   */
  async validateMigrationHashes(): Promise<{ valid: boolean; mismatches: string[] }> {
    const applied = await this.getAppliedMigrations();
    const available = this.getAvailableMigrations();

    const mismatches: string[] = [];

    for (const appliedMigration of applied) {
      const availableMigration = available.find((m) => m.id === appliedMigration.id);
      
      if (availableMigration && availableMigration.hash !== appliedMigration.hash) {
        mismatches.push(appliedMigration.id);
      }
    }

    return {
      valid: mismatches.length === 0,
      mismatches,
    };
  }

  /**
   * Apply a single migration.
   */
  async applyMigration(migration: Migration): Promise<void> {
    if (!this.pool) {
      throw new MigrationError('Database not connected');
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Apply migration SQL
      await client.query(migration.sql);

      // Record migration
      await client.query(
        `INSERT INTO ${this.config.tableName} (id, name, hash) VALUES ($1, $2, $3)`,
        [migration.id, migration.name, migration.hash],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw new MigrationError(
        `Failed to apply migration: ${migration.name}`,
        { migrationId: migration.id },
        error instanceof Error ? error : undefined,
      );
    } finally {
      client.release();
    }
  }

  /**
   * Run all pending migrations.
   */
  async migrate(): Promise<MigrationResult> {
    await this.connect();
    await this.ensureMigrationsTable();

    // Validate existing migrations
    const validation = await this.validateMigrationHashes();
    if (!validation.valid) {
      throw new MigrationError(
        'Migration hash mismatch detected',
        { mismatches: validation.mismatches },
      );
    }

    const pending = await this.getPendingMigrations();
    const applied: string[] = [];
    const skipped: string[] = [];

    for (const migration of pending) {
      try {
        await this.applyMigration(migration);
        applied.push(migration.name);
      } catch (error) {
        return {
          applied,
          skipped,
          failed: {
            migration: migration.name,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    }

    return { applied, skipped };
  }

  /**
   * Dry run - show what migrations would be applied.
   */
  async dryRun(): Promise<MigrationResult> {
    await this.connect();
    await this.ensureMigrationsTable();

    const pending = await this.getPendingMigrations();

    return {
      applied: [],
      skipped: [],
      // Return pending as "would be applied"
      ...(pending.length > 0 && {
        applied: pending.map((m) => m.name),
      }),
    };
  }

  /**
   * Rollback last migration (if supported).
   */
  async rollback(): Promise<string | null> {
    if (!this.pool) {
      throw new MigrationError('Database not connected');
    }

    const applied = await this.getAppliedMigrations();
    if (applied.length === 0) {
      return null;
    }

    // Note: Rollback requires down.sql files which are not implemented here
    // This is a placeholder for future implementation
    throw new MigrationError('Rollback not implemented - manual intervention required');
  }

  /**
   * Get migration status.
   */
  async status(): Promise<{
    applied: Migration[];
    pending: Migration[];
    valid: boolean;
    mismatches: string[];
  }> {
    await this.connect();
    await this.ensureMigrationsTable();

    const applied = await this.getAppliedMigrations();
    const pending = await this.getPendingMigrations();
    const validation = await this.validateMigrationHashes();

    return {
      applied,
      pending,
      valid: validation.valid,
      mismatches: validation.mismatches,
    };
  }
}

/**
 * Create migration runner.
 */
export function createMigrationRunner(config: MigrationConfig): MigrationRunner {
  return new MigrationRunner(config);
}

/**
 * Generate migration file from schema changes.
 */
export function generateMigration(
  name: string,
  sql: string,
  outputPath: string,
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
  const filename = `${timestamp}_${name}.sql`;
  const filePath = join(outputPath, filename);

  // Ensure output directory exists
  if (!existsSync(outputPath)) {
    mkdirSync(outputPath, { recursive: true });
  }

  // Add header comment
  const content = `-- Migration: ${name}
-- Generated: ${new Date().toISOString()}
-- Hash: ${createHash('sha256').update(sql).digest('hex')}

${sql}
`;

  writeFileSync(filePath, content, 'utf-8');
  return filePath;
}
