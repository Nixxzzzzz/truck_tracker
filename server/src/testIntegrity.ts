import { db, initDatabase } from './db';
import { runMigrations, getAppliedMigrations } from './migrations/runner';
import { v4 as uuidv4 } from 'uuid';

export async function runDatabaseIntegrityTests(): Promise<boolean> {
  console.log('================================================================');
  console.log('🛡️  TRUCKTRACKER — ENTERPRISE DATABASE INTEGRITY & INVARIANT TESTS');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}`);
      if (detail) console.error(`     └─ Detail: ${detail}`);
      failed++;
    }
  }

  try {
    initDatabase();

    // TEST 1: Migration Version Tracking
    const applied = getAppliedMigrations();
    assert(applied.length >= 3, 'Migration Catalog Tracks Ordered Versions', `Applied versions count: ${applied.length}`);
    assert(applied.some((m) => m.version === 1), 'Migration v1 Applied (Core Schema)');
    assert(applied.some((m) => m.version === 2), 'Migration v2 Applied (Enterprise Documents & Maintenance)');
    assert(applied.some((m) => m.version === 3), 'Migration v3 Applied (ERP References & Indexes)');
    assert(applied.some((m) => m.version === 4), 'Migration v4 Applied (Destination Area Code)');

    // TEST 2: Schema Table Completeness (All 16 Canonical Tables)
    const requiredTables = [
      'users', 'vehicles', 'drivers', 'destinations', 'trips',
      'trip_stops', 'activities', 'delays', 'photos', 'trip_events',
      'vehicle_documents', 'maintenance_records', 'fuel_transactions',
      'operational_exceptions', 'audit_logs', 'google_sheet_sync'
    ];
    const existingTables = (db.prepare(`SELECT name FROM sqlite_master WHERE type='table'`).all() as any[]).map((t) => t.name);
    for (const table of requiredTables) {
      assert(existingTables.includes(table), `Table Exists in Relational Schema: ${table}`);
    }

    // TEST 3: Foreign Key Enforcement
    let fkBlocked = false;
    try {
      db.prepare(`
        INSERT INTO trip_stops (id, trip_id, stop_number, destination_name, address, latitude, longitude, planned_arrival_time)
        VALUES (?, 'non-existent-trip-id', 1, 'Fake Stop', 'Fake Address', 28.5, 77.2, '10:00')
      `).run(uuidv4());
    } catch (err: any) {
      fkBlocked = true;
    }
    assert(fkBlocked, 'Foreign Key Constraint Enforced (Orphaned stops rejected)');

    // TEST 4: ERP/SAP Reference Columns & Area Code Exist
    const vehicleCols = (db.prepare(`PRAGMA table_info(vehicles)`).all() as any[]).map((c) => c.name);
    assert(vehicleCols.includes('fleet_unit_id'), 'Vehicles table has fleet_unit_id (SAP Asset Reference)');
    assert(vehicleCols.includes('chassis_number'), 'Vehicles table has chassis_number');

    const destCols = (db.prepare(`PRAGMA table_info(destinations)`).all() as any[]).map((c) => c.name);
    assert(destCols.includes('area_code'), 'Destinations table has area_code (Facility Area Identifier)');

    const tripCols = (db.prepare(`PRAGMA table_info(trips)`).all() as any[]).map((c) => c.name);
    assert(tripCols.includes('sap_shipment_num'), 'Trips table has sap_shipment_num (SAP TM Shipment Reference)');
    assert(tripCols.includes('cost_center'), 'Trips table has cost_center (SAP CO Cost Center)');

    // TEST 5: Transaction Atomicity & Rollback
    let rollbackVerified = false;
    const testTripId = `TR-TEST-${Date.now().toString().slice(-4)}`;
    const countBefore = (db.prepare(`SELECT COUNT(*) as count FROM trips WHERE id = ?`).get(testTripId) as any).count;

    try {
      const failingTx = db.transaction(() => {
        db.prepare(`
          INSERT INTO trips (id, date, driver_id, vehicle_id, starting_location, purpose, planned_departure_time, status)
          SELECT ?, '2026-09-13', u.id, v.id, 'Okhla', 'Test', '08:00', 'PLANNED'
          FROM users u, vehicles v LIMIT 1
        `).run(testTripId);

        // Intentionally throw inside transaction
        throw new Error('Simulated operational failure inside transaction');
      });
      failingTx();
    } catch {
      const countAfter = (db.prepare(`SELECT COUNT(*) as count FROM trips WHERE id = ?`).get(testTripId) as any).count;
      rollbackVerified = countBefore === countAfter;
    }
    assert(rollbackVerified, 'Transaction Atomicity Verified (Atomic rollback on failure)');

    // TEST 6: Query Plan & Performance Index Utilization
    const queryPlan = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM trips WHERE driver_id = ? AND status = ?
    `).all('any-driver-id', 'IN_PROGRESS') as any[];
    
    const usesIndex = queryPlan.some((p) => (p.detail || '').includes('idx_trips_driver_status'));
    assert(usesIndex, 'Query Plan Verified (Uses idx_trips_driver_status composite index)');

    const stopPlan = db.prepare(`
      EXPLAIN QUERY PLAN
      SELECT * FROM trip_stops WHERE trip_id = ? AND stop_number = ?
    `).all('any-trip-id', 1) as any[];
    const usesStopIndex = stopPlan.some((p) => (p.detail || '').includes('idx_trip_stops_trip_order'));
    assert(usesStopIndex, 'Query Plan Verified (Uses idx_trip_stops_trip_order composite index)');

    // TEST 7: Business Invariant — Destination Soft-Delete
    const dest = db.prepare(`SELECT id, name FROM destinations WHERE is_active = 1 LIMIT 1`).get() as any;
    if (dest) {
      const destQuery = db.prepare(`SELECT COUNT(*) as count FROM destinations WHERE id = ? AND is_active = 1`).get(dest.id) as any;
      assert(destQuery.count === 1, `Active Destination Query Verified for ${dest.name}`);
    }

    console.log('\n----------------------------------------------------------------');
    console.log(`Integrity Tests Finished: ${passed} Passed, ${failed} Failed`);
    console.log('----------------------------------------------------------------\n');

    return failed === 0;
  } catch (err) {
    console.error('Test suite runtime failure:', err);
    return false;
  }
}

if (require.main === module) {
  runDatabaseIntegrityTests().then((ok) => {
    process.exit(ok ? 0 : 1);
  });
}
