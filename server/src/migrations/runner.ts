import { db } from '../db';
import fs from 'fs';
import path from 'path';
import { generateAreaCode } from '../services/areaCode';

export interface MigrationRecord {
  version: number;
  name: string;
  applied_at: string;
}

export interface MigrationResult {
  currentVersion: number;
  appliedCount: number;
  migrations: MigrationRecord[];
}

/**
 * Ensures the migration catalog table exists.
 */
function ensureMigrationCatalog(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

/**
 * Returns all migration versions already applied to this database.
 */
export function getAppliedMigrations(): MigrationRecord[] {
  ensureMigrationCatalog();
  return (db.prepare(`SELECT version, name, applied_at FROM _schema_migrations ORDER BY version ASC`).all() as unknown) as MigrationRecord[];
}

/**
 * Canonical ordered migrations.
 * Each migration is executed inside a single atomic transaction.
 */
const MIGRATIONS: Array<{ version: number; name: string; up: () => void }> = [
  {
    version: 1,
    name: '001_initial_core_schema',
    up: () => {
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
  },
  {
    version: 2,
    name: '002_add_enterprise_compliance_and_maintenance',
    up: () => {
      db.exec(`
        CREATE TABLE IF NOT EXISTS vehicle_documents (
          id TEXT PRIMARY KEY,
          vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          document_type TEXT NOT NULL CHECK(document_type IN ('REGISTRATION_CERTIFICATE', 'INSURANCE_POLICY', 'FITNESS_CERTIFICATE', 'POLLUTION_UNDER_CONTROL', 'NATIONAL_PERMIT', 'OTHER')),
          title TEXT NOT NULL,
          document_number TEXT NOT NULL,
          issue_date TEXT,
          expiry_date TEXT NOT NULL,
          issuing_authority TEXT,
          status TEXT CHECK(status IN ('VALID', 'EXPIRING_SOON', 'EXPIRED', 'PENDING_VERIFICATION')) DEFAULT 'VALID',
          file_path TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS maintenance_records (
          id TEXT PRIMARY KEY,
          vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          service_date TEXT NOT NULL,
          odometer_km INTEGER NOT NULL,
          maintenance_type TEXT NOT NULL CHECK(maintenance_type IN ('PREVENTIVE', 'CORRECTIVE', 'TIRE_ROTATION', 'STATUTORY_INSPECTION', 'BREAKDOWN')),
          description TEXT NOT NULL,
          service_center TEXT NOT NULL,
          cost_amount REAL NOT NULL,
          currency TEXT DEFAULT 'INR',
          invoice_reference TEXT,
          status TEXT CHECK(status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')) DEFAULT 'COMPLETED',
          performed_by TEXT,
          next_service_due_km INTEGER,
          next_service_due_date TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS fuel_transactions (
          id TEXT PRIMARY KEY,
          vehicle_id TEXT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
          driver_id TEXT REFERENCES users(id),
          trip_id TEXT REFERENCES trips(id),
          fueling_date TEXT NOT NULL,
          quantity_liters REAL NOT NULL,
          rate_per_liter REAL NOT NULL,
          total_cost REAL NOT NULL,
          odometer_km INTEGER NOT NULL,
          fuel_station TEXT NOT NULL,
          payment_mode TEXT CHECK(payment_mode IN ('FLEET_CARD', 'CASH', 'CORPORATE_UPI', 'DIRECT_BILLING')) DEFAULT 'FLEET_CARD',
          receipt_reference TEXT,
          notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS operational_exceptions (
          id TEXT PRIMARY KEY,
          severity TEXT CHECK(severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')) NOT NULL,
          category TEXT CHECK(category IN ('DELIVERY_DELAY', 'ROUTE_DEVIATION', 'EXTENDED_STOP', 'DOCUMENT_EXPIRING', 'GEOFENCE_VIOLATION', 'MAINTENANCE_DUE', 'SYSTEM_SYNC')) NOT NULL,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          vehicle_id TEXT REFERENCES vehicles(id),
          driver_id TEXT REFERENCES users(id),
          trip_id TEXT REFERENCES trips(id),
          location_context TEXT,
          is_acknowledged INTEGER DEFAULT 0,
          acknowledged_by TEXT REFERENCES users(id),
          acknowledged_at DATETIME,
          resolution_status TEXT CHECK(resolution_status IN ('OPEN', 'ACKNOWLEDGED', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED')) DEFAULT 'OPEN',
          resolution_notes TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle ON vehicle_documents(vehicle_id, expiry_date);
        CREATE INDEX IF NOT EXISTS idx_maintenance_vehicle ON maintenance_records(vehicle_id, service_date);
        CREATE INDEX IF NOT EXISTS idx_fuel_vehicle ON fuel_transactions(vehicle_id, fueling_date);
        CREATE INDEX IF NOT EXISTS idx_exceptions_status ON operational_exceptions(resolution_status, severity);
        CREATE INDEX IF NOT EXISTS idx_exceptions_trip ON operational_exceptions(trip_id);
      `);
    }
  },
  {
    version: 3,
    name: '003_add_erp_references_and_performance_indexes',
    up: () => {
      // Safely alter tables if columns do not exist
      const vehicleCols = (db.prepare(`PRAGMA table_info(vehicles)`).all() as any[]).map((c) => c.name);
      if (!vehicleCols.includes('fleet_unit_id')) {
        db.exec(`ALTER TABLE vehicles ADD COLUMN fleet_unit_id TEXT;`);
      }
      if (!vehicleCols.includes('chassis_number')) {
        db.exec(`ALTER TABLE vehicles ADD COLUMN chassis_number TEXT;`);
      }
      if (!vehicleCols.includes('telematics_imei')) {
        db.exec(`ALTER TABLE vehicles ADD COLUMN telematics_imei TEXT;`);
      }

      const tripCols = (db.prepare(`PRAGMA table_info(trips)`).all() as any[]).map((c) => c.name);
      if (!tripCols.includes('sap_shipment_num')) {
        db.exec(`ALTER TABLE trips ADD COLUMN sap_shipment_num TEXT;`);
      }
      if (!tripCols.includes('erp_delivery_doc')) {
        db.exec(`ALTER TABLE trips ADD COLUMN erp_delivery_doc TEXT;`);
      }
      if (!tripCols.includes('cost_center')) {
        db.exec(`ALTER TABLE trips ADD COLUMN cost_center TEXT;`);
      }

      // Additional performance indexes for multi-stop queries
      db.exec(`
        CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips(created_at);
        CREATE INDEX IF NOT EXISTS idx_destinations_active ON destinations(is_active);
      `);
    }
  },
  {
    version: 4,
    name: '004_add_destination_area_code',
    up: () => {
      const destCols = (db.prepare(`PRAGMA table_info(destinations)`).all() as any[]).map((c) => c.name);
      if (!destCols.includes('area_code')) {
        db.exec(`ALTER TABLE destinations ADD COLUMN area_code TEXT;`);
      }
      db.exec(`CREATE INDEX IF NOT EXISTS idx_destinations_area_code ON destinations(area_code);`);
    }
  },
  {
    version: 5,
    name: '005_generate_destination_area_codes',
    up: () => {
      const destinations = db.prepare(`
        SELECT id, name, address FROM destinations
        WHERE area_code IS NULL OR area_code = ''
        ORDER BY created_at ASC, id ASC
      `).all() as { id: string; name: string; address: string }[];

      for (const destination of destinations) {
        db.prepare(`UPDATE destinations SET area_code = ? WHERE id = ?`)
          .run(generateAreaCode(destination.name, destination.address), destination.id);
      }

      db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_destinations_area_code_unique ON destinations(area_code);`);
    }
  },
  {
    version: 6,
    name: '006_add_driver_vehicle_docs_and_photos',
    up: () => {
      // 1. Add photo_url to vehicles
      const vehicleCols = (db.prepare(`PRAGMA table_info(vehicles)`).all() as any[]).map((c) => c.name);
      if (!vehicleCols.includes('photo_url')) {
        db.exec(`ALTER TABLE vehicles ADD COLUMN photo_url TEXT;`);
      }

      // 2. Add columns to drivers
      const driverCols = (db.prepare(`PRAGMA table_info(drivers)`).all() as any[]).map((c) => c.name);
      if (!driverCols.includes('avatar_url')) {
        db.exec(`ALTER TABLE drivers ADD COLUMN avatar_url TEXT;`);
      }
      if (!driverCols.includes('license_number')) {
        db.exec(`ALTER TABLE drivers ADD COLUMN license_number TEXT;`);
      }
      if (!driverCols.includes('license_category')) {
        db.exec(`ALTER TABLE drivers ADD COLUMN license_category TEXT;`);
      }
      if (!driverCols.includes('emergency_phone')) {
        db.exec(`ALTER TABLE drivers ADD COLUMN emergency_phone TEXT;`);
      }

      // 3. Create driver_documents table
      db.exec(`
        CREATE TABLE IF NOT EXISTS driver_documents (
          id TEXT PRIMARY KEY,
          driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
          document_type TEXT NOT NULL,
          title TEXT NOT NULL,
          document_number TEXT NOT NULL,
          issue_date TEXT,
          expiry_date TEXT,
          status TEXT CHECK(status IN ('VERIFIED', 'PENDING', 'EXPIRED')) DEFAULT 'VERIFIED',
          file_path TEXT,
          file_url TEXT,
          file_name TEXT,
          file_size INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_driver_docs_driver ON driver_documents(driver_id);
      `);

      // 4. Ensure vehicle_documents has file_url, file_name, file_size
      const vDocCols = (db.prepare(`PRAGMA table_info(vehicle_documents)`).all() as any[]).map((c) => c.name);
      if (!vDocCols.includes('file_url')) {
        db.exec(`ALTER TABLE vehicle_documents ADD COLUMN file_url TEXT;`);
      }
      if (!vDocCols.includes('file_name')) {
        db.exec(`ALTER TABLE vehicle_documents ADD COLUMN file_name TEXT;`);
      }
      if (!vDocCols.includes('file_size')) {
        db.exec(`ALTER TABLE vehicle_documents ADD COLUMN file_size INTEGER;`);
      }
    }
  }
];

/**
 * Executes all pending schema migrations idempotently.
 */
export function runMigrations(): MigrationResult {
  ensureMigrationCatalog();
  const applied = getAppliedMigrations();
  const appliedVersions = new Set(applied.map((m) => m.version));

  let appliedCount = 0;

  for (const migration of MIGRATIONS) {
    if (!appliedVersions.has(migration.version)) {
      console.log(`[Migrations] Applying version ${migration.version}: ${migration.name}...`);
      
      const execute = db.transaction(() => {
        migration.up();
        db.prepare(`
          INSERT INTO _schema_migrations (version, name, applied_at)
          VALUES (?, ?, CURRENT_TIMESTAMP)
        `).run(migration.version, migration.name);
      });

      execute();
      appliedCount++;
      console.log(`[Migrations] ✓ Version ${migration.version} applied successfully.`);
    }
  }

  const finalApplied = getAppliedMigrations();
  const currentVersion = finalApplied.length > 0 ? finalApplied[finalApplied.length - 1].version : 0;

  return {
    currentVersion,
    appliedCount,
    migrations: finalApplied
  };
}

if (require.main === module) {
  try {
    const result = runMigrations();
    console.log(`[Migrations] Execution complete. Current schema version: ${result.currentVersion} (${result.appliedCount} applied this run).`);
    process.exit(0);
  } catch (err) {
    console.error('[Migrations] Execution failed:', err);
    process.exit(1);
  }
}
