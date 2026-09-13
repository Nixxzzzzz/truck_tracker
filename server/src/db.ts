import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';

const DB_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'truck_tracker.sqlite');

const rawDb = new DatabaseSync(DB_PATH);

// Enable WAL mode and foreign keys
rawDb.exec('PRAGMA journal_mode = WAL;');
rawDb.exec('PRAGMA foreign_keys = ON;');

// Provide transaction helper compatible with better-sqlite3
(rawDb as any).transaction = function <T>(fn: () => T) {
  return function () {
    rawDb.exec('BEGIN IMMEDIATE;');
    try {
      const res = fn();
      rawDb.exec('COMMIT;');
      return res;
    } catch (err) {
      rawDb.exec('ROLLBACK;');
      throw err;
    }
  };
};

export const db = rawDb as DatabaseSync & {
  transaction: <T>(fn: () => T) => () => T;
};

export function initDatabase() {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { runMigrations } = require('./migrations/runner');
  const result = runMigrations();
  return result;
}
