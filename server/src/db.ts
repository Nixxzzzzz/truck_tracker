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
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('DRIVER', 'MANAGER')) NOT NULL,
      phone TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      vehicle_number TEXT UNIQUE NOT NULL,
      vehicle_type TEXT NOT NULL,
      model TEXT NOT NULL,
      assigned_driver_id TEXT REFERENCES users(id),
      status TEXT CHECK(status IN ('AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'INACTIVE')) DEFAULT 'AVAILABLE',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      employee_id TEXT UNIQUE NOT NULL,
      assigned_vehicle_id TEXT REFERENCES vehicles(id),
      status TEXT CHECK(status IN ('AVAILABLE', 'ON_TRIP', 'OFF_DUTY', 'INACTIVE')) DEFAULT 'AVAILABLE',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS destinations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      contact_name TEXT,
      contact_number TEXT,
      geofence_radius_meters INTEGER DEFAULT 150,
      notes TEXT,
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trips (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      driver_id TEXT NOT NULL REFERENCES users(id),
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
      starting_location TEXT NOT NULL,
      starting_latitude REAL,
      starting_longitude REAL,
      purpose TEXT NOT NULL,
      reference_number TEXT,
      planned_departure_time TEXT NOT NULL,
      actual_start_time TEXT,
      return_start_time TEXT,
      base_arrival_time TEXT,
      completion_time TEXT,
      status TEXT CHECK(status IN ('PLANNED', 'ASSIGNED', 'IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING', 'COMPLETED', 'CANCELLED')) DEFAULT 'ASSIGNED',
      total_delay_minutes INTEGER DEFAULT 0,
      calculated_distance_km REAL,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trip_stops (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      destination_id TEXT REFERENCES destinations(id),
      stop_number INTEGER NOT NULL,
      destination_name TEXT NOT NULL,
      address TEXT NOT NULL,
      latitude REAL NOT NULL,
      longitude REAL NOT NULL,
      geofence_radius_meters INTEGER DEFAULT 150,
      planned_arrival_time TEXT NOT NULL,
      actual_arrival_time TEXT,
      actual_departure_time TEXT,
      arrival_latitude REAL,
      arrival_longitude REAL,
      departure_latitude REAL,
      departure_longitude REAL,
      arrival_status TEXT CHECK(arrival_status IN ('ON_TIME', 'EARLY', 'LATE', 'UNKNOWN')),
      arrival_diff_minutes INTEGER,
      status TEXT CHECK(status IN ('PENDING', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED', 'FAILED')) DEFAULT 'PENDING',
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS activities (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      stop_id TEXT NOT NULL REFERENCES trip_stops(id) ON DELETE CASCADE,
      activity_type TEXT NOT NULL,
      status TEXT CHECK(status IN ('COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED', 'OTHER')) DEFAULT 'COMPLETED',
      start_time TEXT,
      completion_time TEXT,
      quantity INTEGER,
      reference_number TEXT,
      recipient_name TEXT,
      notes TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS delays (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      stop_id TEXT REFERENCES trip_stops(id),
      driver_id TEXT NOT NULL REFERENCES users(id),
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
      reason TEXT NOT NULL,
      description TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT,
      duration_minutes INTEGER,
      latitude REAL,
      longitude REAL,
      gps_accuracy REAL,
      is_resolved INTEGER DEFAULT 0,
      photo_id TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS photos (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      stop_id TEXT REFERENCES trip_stops(id),
      driver_id TEXT NOT NULL REFERENCES users(id),
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
      photo_type TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      mime_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      latitude REAL,
      longitude REAL,
      gps_accuracy REAL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS trip_events (
      id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
      stop_id TEXT REFERENCES trip_stops(id),
      event_type TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      driver_id TEXT NOT NULL REFERENCES users(id),
      vehicle_id TEXT NOT NULL REFERENCES vehicles(id),
      latitude REAL,
      longitude REAL,
      gps_accuracy REAL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      trip_id TEXT,
      action TEXT NOT NULL,
      field_changed TEXT,
      original_value TEXT,
      new_value TEXT,
      changed_by TEXT NOT NULL REFERENCES users(id),
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS google_sheet_sync (
      id TEXT PRIMARY KEY,
      sheet_name TEXT NOT NULL,
      record_id TEXT NOT NULL,
      sync_status TEXT CHECK(sync_status IN ('SYNCED', 'PENDING', 'FAILED')) DEFAULT 'PENDING',
      error_message TEXT,
      last_synced_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Create performance indexes
    CREATE INDEX IF NOT EXISTS idx_trips_driver_status ON trips(driver_id, status);
    CREATE INDEX IF NOT EXISTS idx_trips_date ON trips(date);
    CREATE INDEX IF NOT EXISTS idx_trip_stops_trip_order ON trip_stops(trip_id, stop_number);
    CREATE INDEX IF NOT EXISTS idx_events_trip_time ON trip_events(trip_id, timestamp);
    CREATE INDEX IF NOT EXISTS idx_delays_trip ON delays(trip_id);
    CREATE INDEX IF NOT EXISTS idx_photos_trip ON photos(trip_id);
    CREATE INDEX IF NOT EXISTS idx_activities_stop ON activities(stop_id);
    CREATE INDEX IF NOT EXISTS idx_sheet_sync ON google_sheet_sync(sheet_name, sync_status);
  `);
}
