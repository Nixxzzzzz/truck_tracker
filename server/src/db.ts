import dotenv from 'dotenv';
import pg from 'pg';
import sql from 'mssql';

dotenv.config();

const driver = process.env.DB_DRIVER || 'postgres';
const poolMax = Number.parseInt(process.env.DB_POOL_MAX || '10', 10);
if (!Number.isInteger(poolMax) || poolMax < 1) throw new Error('DB_POOL_MAX must be a positive integer.');

const postgresUrl = process.env.DATABASE_URL;
const postgresPool = driver === 'postgres' && postgresUrl ? new pg.Pool({
  connectionString: postgresUrl,
  max: poolMax,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== 'false' } : undefined
}) : null;

const sqlServerConfig: sql.config | null = driver === 'sqlserver' ? {
  server: process.env.DB_SERVER || '',
  port: Number.parseInt(process.env.DB_PORT || '1433', 10),
  database: process.env.DB_NAME || '',
  user: process.env.DB_USER || '',
  password: process.env.DB_PASSWORD || '',
  pool: { max: poolMax, min: 0, idleTimeoutMillis: 30_000 },
  options: {
    encrypt: process.env.DB_ENCRYPT !== 'false',
    trustServerCertificate: process.env.DB_TRUST_SERVER_CERTIFICATE === 'true'
  }
} : null;

if (driver === 'postgres' && !postgresUrl) throw new Error('DATABASE_URL is required when DB_DRIVER=postgres.');
if (driver === 'sqlserver' && (!sqlServerConfig?.server || !sqlServerConfig.database || !sqlServerConfig.user || !sqlServerConfig.password)) {
  throw new Error('DB_SERVER, DB_NAME, DB_USER, and DB_PASSWORD are required when DB_DRIVER=sqlserver.');
}
if (driver !== 'postgres' && driver !== 'sqlserver') throw new Error('DB_DRIVER must be postgres or sqlserver.');

export const pool = driver === 'postgres' ? postgresPool : new sql.ConnectionPool(sqlServerConfig!);
const poolReady = driver === 'postgres' ? Promise.resolve(postgresPool!) : (pool as sql.ConnectionPool).connect();

type QueryRow = object;
export type QueryResult<T extends QueryRow = QueryRow> = { rows: T[]; recordset?: T[] };
export interface QueryExecutor {
  query<T extends QueryRow = QueryRow>(text: string, values?: unknown[]): Promise<QueryResult<T>>;
}

function sqlServerBatch(text: string): string {
  let result = text
    .replace(/\bTIMESTAMPTZ\b/g, 'datetime2')
    .replace(/\bDOUBLE PRECISION\b/g, 'float')
    .replace(/\bNOW\(\)/g, 'SYSUTCDATETIME()')
    .replace(/CURRENT_DATE/g, 'CAST(SYSUTCDATETIME() AS date)');
  result = result.replace(/CREATE TABLE IF NOT EXISTS (\w+)/gi, "IF OBJECT_ID(N'$1', N'U') IS NULL BEGIN CREATE TABLE $1");
  result = result.replace(/CREATE UNIQUE INDEX IF NOT EXISTS (\w+) ON (\w+)/gi, "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = '$1' AND object_id = OBJECT_ID('$2')) BEGIN CREATE UNIQUE INDEX $1 ON $2");
  result = result.replace(/CREATE INDEX IF NOT EXISTS (\w+) ON (\w+)/gi, "IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = '$1' AND object_id = OBJECT_ID('$2')) BEGIN CREATE INDEX $1 ON $2");
  result = result.replace(/ALTER TABLE (\w+) ADD COLUMN IF NOT EXISTS (\w+) ([^;]+);/gi, "IF COL_LENGTH('$1', '$2') IS NULL ALTER TABLE $1 ADD $2 $3;");
  const openBlocks = (result.match(/BEGIN\s+(?:CREATE TABLE|CREATE INDEX|CREATE UNIQUE INDEX)/gi) || []).length;
  if (openBlocks) result += `\n${'END;\n'.repeat(openBlocks)}`;
  return result;
}

function bindSqlServerParameters(request: sql.Request, text: string, values: unknown[]): string {
  return text.replace(/\$(\d+)/g, (_match, position: string) => {
    const index = Number(position) - 1;
    if (index < 0 || index >= values.length) throw new Error(`Missing SQL parameter value for $${position}.`);
    request.input(`p${position}`, values[index] as any);
    return `@p${position}`;
  });
}

export class SqlClient {
  constructor(private readonly transaction?: sql.Transaction) {}
  async query<T extends QueryRow = QueryRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
    const request = this.transaction ? new sql.Request(this.transaction) : new sql.Request(await poolReady as sql.ConnectionPool);
    const result = await request.query<T>(bindSqlServerParameters(request, sqlServerBatch(text), values));
    return { rows: result.recordset as T[] };
  }
}

export async function query<T extends QueryRow = QueryRow>(text: string, values: unknown[] = []): Promise<QueryResult<T>> {
  if (driver === 'postgres') return (await (await poolReady as pg.Pool).query<T>(text, values)) as QueryResult<T>;
  return new SqlClient().query<T>(text, values);
}

export async function withTransaction<T>(callback: (client: QueryExecutor) => Promise<T>): Promise<T> {
  if (driver === 'postgres') {
    const client = await (await poolReady as pg.Pool).connect();
    const executor: QueryExecutor = { query: (text, values = []) => client.query(text, values) as unknown as Promise<QueryResult<any>> };
    try { await client.query('BEGIN'); const result = await callback(executor); await client.query('COMMIT'); return result; }
    catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  const transaction = new sql.Transaction(await poolReady as sql.ConnectionPool);
  await transaction.begin();
  try { const result = await callback(new SqlClient(transaction)); await transaction.commit(); return result; }
  catch (error) { await transaction.rollback(); throw error; }
}

export async function checkDatabaseConnection(): Promise<void> { await query('SELECT 1 AS connected'); }
export async function closeDatabase(): Promise<void> {
  if (driver === 'postgres') await (await poolReady as pg.Pool).end();
  else await (await poolReady as sql.ConnectionPool).close();
}
export async function initDatabase() { const { runMigrations } = await import('./migrations/runner'); return runMigrations(); }
