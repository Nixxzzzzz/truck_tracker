import dotenv from 'dotenv';
import { Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL environment variable is required.');
}

const poolMax = Number.parseInt(process.env.DB_POOL_MAX || '10', 10);
if (!Number.isInteger(poolMax) || poolMax < 1) {
  throw new Error('DB_POOL_MAX must be a positive integer.');
}

const sslEnabled = process.env.DB_SSL === 'true';
const rejectUnauthorized = process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false';

export const pool = new Pool({
  connectionString: databaseUrl,
  max: poolMax,
  ssl: sslEnabled ? { rejectUnauthorized } : undefined
});

export function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = []
): Promise<QueryResult<T>> {
  return pool.query<T>(text, values);
}

export async function withTransaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export async function checkDatabaseConnection(): Promise<void> {
  await pool.query('SELECT 1');
}

export async function closeDatabase(): Promise<void> {
  await pool.end();
}

export async function initDatabase() {
  const { runMigrations } = await import('./migrations/runner');
  return runMigrations();
}
