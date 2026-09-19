import fs from 'fs';
import path from 'path';
import { DatabaseSync } from 'node:sqlite';

const DB_DIR = process.env.DATA_DIR || path.resolve(__dirname, '../../data');
const BACKUPS_DIR = path.join(DB_DIR, 'backups');
const SOURCE_DB_PATH = path.join(DB_DIR, 'truck_tracker.sqlite');

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

/**
 * Creates a verified point-in-time backup of the SQLite database
 */
export function createBackup(): { success: boolean; backupPath: string; stats: any } {
  if (!fs.existsSync(SOURCE_DB_PATH)) {
    throw new Error(`Source database file not found at: ${SOURCE_DB_PATH}`);
  }

  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .replace('T', '_')
    .slice(0, 19);

  const backupFilename = `truck_tracker_backup_${timestamp}.sqlite`;
  const targetPath = path.join(BACKUPS_DIR, backupFilename);

  // In WAL mode, checkpoint before copy
  try {
    const activeDb = new DatabaseSync(SOURCE_DB_PATH);
    activeDb.exec('PRAGMA wal_checkpoint(TRUNCATE);');
    activeDb.close();
  } catch (e: any) {
    console.warn('[Backup] Checkpoint warning (proceeding with copy):', e.message);
  }

  // Copy primary sqlite database
  fs.copyFileSync(SOURCE_DB_PATH, targetPath);

  // Verify the backup file by opening it and checking tables
  const backupDb = new DatabaseSync(targetPath);
  const tripCount = (backupDb.prepare(`SELECT COUNT(*) as count FROM trips`).get() as any).count;
  const userCount = (backupDb.prepare(`SELECT COUNT(*) as count FROM users`).get() as any).count;
  const eventCount = (backupDb.prepare(`SELECT COUNT(*) as count FROM trip_events`).get() as any).count;
  backupDb.close();

  const stats = {
    fileSize: fs.statSync(targetPath).size,
    tripCount,
    userCount,
    eventCount,
    createdAt: new Date().toISOString()
  };

  console.log(`[Backup] Successfully created verified backup at: ${targetPath}`);
  console.log(`[Backup] Stats: ${tripCount} trips, ${eventCount} events, ${stats.fileSize} bytes.`);

  return {
    success: true,
    backupPath: targetPath,
    stats
  };
}

/**
 * Verifies and restores a backup to the active database
 */
export function restoreBackup(backupPath: string): boolean {
  if (!fs.existsSync(backupPath)) {
    throw new Error(`Backup file not found at: ${backupPath}`);
  }

  // 1. Verify integrity of the backup file first
  const testDb = new DatabaseSync(backupPath);
  const testRow = testDb.prepare(`SELECT COUNT(*) as count FROM trips`).get() as any;
  testDb.close();

  if (typeof testRow?.count !== 'number') {
    throw new Error('Backup verification failed: Invalid SQLite database structure');
  }

  // 2. Clean up WAL and SHM files of current active db
  const walPath = `${SOURCE_DB_PATH}-wal`;
  const shmPath = `${SOURCE_DB_PATH}-shm`;
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

  // 3. Overwrite current DB with backup
  fs.copyFileSync(backupPath, SOURCE_DB_PATH);
  console.log(`[Restore] Successfully restored database from: ${backupPath}`);
  return true;
}

if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'backup';

  if (command === 'backup') {
    createBackup();
  } else if (command === 'restore') {
    const target = args[1];
    if (!target) {
      console.error('Please specify the backup file path to restore.');
      process.exit(1);
    }
    restoreBackup(target);
  } else {
    console.log('Usage: npx tsx src/backup.ts [backup|restore <file>]');
  }
}
