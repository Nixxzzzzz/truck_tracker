import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase } from './db';

export async function seed() {
  console.log('🌱 Seeding TruckTracker database with realistic company logistics data...');
  initDatabase();

  // Clear existing records
  db.exec(`
    DELETE FROM google_sheet_sync;
    DELETE FROM audit_logs;
    DELETE FROM trip_events;
    DELETE FROM photos;
    DELETE FROM delays;
    DELETE FROM activities;
    DELETE FROM trip_stops;
    DELETE FROM trips;
    DELETE FROM destinations;
    DELETE FROM drivers;
    DELETE FROM vehicles;
    DELETE FROM users;
  `);

  const passwordHash = await bcrypt.hash('password123', 10);
  const managerPasswordHash = await bcrypt.hash('manager123', 10);
  const driverPasswordHash = await bcrypt.hash('driver123', 10);

  // 1. Users
  const managerId = uuidv4();
  const driver1UserId = uuidv4();
  const driver2UserId = uuidv4();
  const driver3UserId = uuidv4();

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone)
    VALUES (?, ?, LOWER(?), ?, ?, ?)
  `);

  insertUser.run(managerId, 'Sunil Mehta (Operations Manager)', 'manager@company.com', managerPasswordHash, 'MANAGER', '+91 98260 11223');
  insertUser.run(driver1UserId, 'Rahul Sharma', 'rahul@company.com', driverPasswordHash, 'DRIVER', '+91 98261 44556');
  insertUser.run(driver2UserId, 'Amit Verma', 'amit@company.com', driverPasswordHash, 'DRIVER', '+91 98262 77889');
  insertUser.run(driver3UserId, 'Vikram Singh', 'vikram@company.com', driverPasswordHash, 'DRIVER', '+91 98263 99001');

  // Also add 'driver@company.com' alias for easy testing
  const driverTestUserId = uuidv4();
  insertUser.run(driverTestUserId, 'Rahul Sharma (Test Driver)', 'driver@company.com', driverPasswordHash, 'DRIVER', '+91 98261 44556');

  // 2. Vehicles
  const v1Id = uuidv4();
  const v2Id = uuidv4();
  const v3Id = uuidv4();
  const v4Id = uuidv4();

  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (id, vehicle_number, vehicle_type, model, assigned_driver_id, status, notes)
    VALUES (?, UPPER(?), ?, ?, ?, ?, ?)
  `);

  insertVehicle.run(v1Id, 'MP04 XX 1234', 'Heavy Hauler', 'Tata Prima 4028.S (16 Wheeler)', driver1UserId, 'ON_TRIP', 'Fitted with GPS event transmitter and cold rack');
  insertVehicle.run(v2Id, 'MP04 YY 5678', 'Medium Truck', 'Ashok Leyland Ecomet 1215', driver2UserId, 'AVAILABLE', 'Clean box container, daily maintenance passed');
  insertVehicle.run(v3Id, 'MP04 ZZ 9012', 'City Distribution', 'Mahindra Furio 14', driver3UserId, 'AVAILABLE', 'Ideal for urban narrow lanes');
  insertVehicle.run(v4Id, 'MH12 AB 4321', 'Heavy Duty', 'Eicher Pro 3019', null, 'MAINTENANCE', 'Scheduled brake pad inspection');

  // 3. Drivers Profile
  const insertDriver = db.prepare(`
    INSERT INTO drivers (id, user_id, employee_id, assigned_vehicle_id, status)
    VALUES (?, ?, UPPER(?), ?, ?)
  `);

  insertDriver.run(uuidv4(), driver1UserId, 'EMP-DRV-101', v1Id, 'ON_TRIP');
  insertDriver.run(uuidv4(), driver2UserId, 'EMP-DRV-102', v2Id, 'AVAILABLE');
  insertDriver.run(uuidv4(), driver3UserId, 'EMP-DRV-103', v3Id, 'AVAILABLE');
  insertDriver.run(uuidv4(), driverTestUserId, 'EMP-DRV-100', v1Id, 'ON_TRIP');

  // 4. Saved Destinations
  const dest1Id = uuidv4();
  const dest2Id = uuidv4();
  const dest3Id = uuidv4();
  const dest4Id = uuidv4();
  const dest5Id = uuidv4();

  const insertDest = db.prepare(`
    INSERT INTO destinations (id, name, address, latitude, longitude, contact_name, contact_number, geofence_radius_meters, notes, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  insertDest.run(dest1Id, 'ABC Warehouse', 'Sector C, Industrial Area Phase 2, Bhopal', 23.2599, 77.4126, 'Ramesh Gupta', '+91 94250 55661', 150, 'Loading Bay 4 at rear');
  insertDest.run(dest2Id, 'XYZ Retail Store', 'Commercial Hub Zone 1, MP Nagar, Bhopal', 23.2324, 77.4285, 'Pooja Nair', '+91 94251 77882', 150, 'Unloading allowed only between 9 AM - 6 PM');
  insertDest.run(dest3Id, 'PQR Logistics Depot', 'Plot 45, Mandideep Industrial Area, Bhopal', 23.0722, 77.5255, 'Harish Patel', '+91 94252 99003', 200, 'Requires gate pass clearance');
  insertDest.run(dest4Id, 'North Point Distribution Center', 'Bhopal Bypass Highway KM 14', 23.3150, 77.3820, 'Karan Johar', '+91 94253 11224', 250, '24/7 Gate security check');
  insertDest.run(dest5Id, 'Metro Cold Storage Hub', 'Govindpura Heavy Industrial Sector', 23.2620, 77.4580, 'Suresh Tiwari', '+91 94254 33445', 150, 'Maintain refrigerator temp at 4°C');

  // 5. Sample Trips
  const today = new Date().toISOString().split('T')[0];

  // TRIP 1: Active Trip with Multiple Destinations (Stop 1 completed, Stop 2 active with reported delay)
  const trip1Id = 'TR-2026-00124';
  db.prepare(`
    INSERT INTO trips (
      id, date, driver_id, vehicle_id, starting_location, starting_latitude, starting_longitude,
      purpose, reference_number, planned_departure_time, actual_start_time, status, total_delay_minutes,
      calculated_distance_km, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip1Id,
    today,
    driver1UserId,
    v1Id,
    'Company Central Depot (Mandideep Road)',
    23.2100,
    77.4000,
    'Retail Restock & Wholesale Orders',
    'PO-2026-9812',
    '08:00',
    `${today}T08:07:00.000Z`,
    'DELAYED',
    22,
    18.4,
    'Urgent restock of FMCG cartons across 3 key retail points',
    managerId
  );

  // Stop 1 of Trip 1 (Completed)
  const trip1Stop1Id = uuidv4();
  db.prepare(`
    INSERT INTO trip_stops (
      id, trip_id, destination_id, stop_number, destination_name, address, latitude, longitude,
      geofence_radius_meters, planned_arrival_time, actual_arrival_time, actual_departure_time,
      arrival_latitude, arrival_longitude, departure_latitude, departure_longitude,
      arrival_status, arrival_diff_minutes, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip1Stop1Id,
    trip1Id,
    dest1Id,
    1,
    'ABC Warehouse',
    'Sector C, Industrial Area Phase 2, Bhopal',
    23.2599,
    77.4126,
    150,
    '09:00',
    `${today}T09:14:00.000Z`,
    `${today}T09:42:00.000Z`,
    23.2598,
    77.4125,
    23.2597,
    77.4128,
    'LATE',
    14,
    'COMPLETED',
    'Delivered 40 cartons successfully'
  );

  // Activity for Stop 1
  db.prepare(`
    INSERT INTO activities (id, trip_id, stop_id, activity_type, status, start_time, completion_time, quantity, reference_number, recipient_name, notes)
    VALUES (?, ?, ?, 'Delivery', 'COMPLETED', ?, ?, 40, 'INV-8812', 'Ramesh Gupta', 'Received in good condition')
  `).run(uuidv4(), trip1Id, trip1Stop1Id, `${today}T09:18:00.000Z`, `${today}T09:37:00.000Z`);

  // Stop 2 of Trip 1 (Arrived, currently delayed due to traffic)
  const trip1Stop2Id = uuidv4();
  db.prepare(`
    INSERT INTO trip_stops (
      id, trip_id, destination_id, stop_number, destination_name, address, latitude, longitude,
      geofence_radius_meters, planned_arrival_time, actual_arrival_time, arrival_latitude, arrival_longitude,
      arrival_status, arrival_diff_minutes, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip1Stop2Id,
    trip1Id,
    dest2Id,
    2,
    'XYZ Retail Store',
    'Commercial Hub Zone 1, MP Nagar, Bhopal',
    23.2324,
    77.4285,
    150,
    '10:15',
    `${today}T10:31:00.000Z`,
    23.2323,
    77.4286,
    'LATE',
    16,
    'ARRIVED',
    'Arrived at unloading lane'
  );

  // Stop 3 of Trip 1 (Pending)
  const trip1Stop3Id = uuidv4();
  db.prepare(`
    INSERT INTO trip_stops (
      id, trip_id, destination_id, stop_number, destination_name, address, latitude, longitude,
      geofence_radius_meters, planned_arrival_time, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(
    trip1Stop3Id,
    trip1Id,
    dest3Id,
    3,
    'PQR Logistics Depot',
    'Plot 45, Mandideep Industrial Area, Bhopal',
    23.0722,
    77.5255,
    200,
    '12:00',
    'Gate 2 clearance pass required'
  );

  // Active delay on Trip 1
  const delay1Id = uuidv4();
  db.prepare(`
    INSERT INTO delays (
      id, trip_id, stop_id, driver_id, vehicle_id, reason, description, start_time,
      latitude, longitude, gps_accuracy, is_resolved
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    delay1Id,
    trip1Id,
    trip1Stop2Id,
    driver1UserId,
    v1Id,
    'Traffic',
    'Heavy road construction and VIP movement on Chetak Bridge route',
    `${today}T10:45:00.000Z`,
    23.2330,
    77.4280,
    12.5
  );

  // Events for Trip 1
  const insertEvent = db.prepare(`
    INSERT INTO trip_events (id, trip_id, stop_id, event_type, timestamp, driver_id, vehicle_id, latitude, longitude, gps_accuracy, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEvent.run(uuidv4(), trip1Id, null, 'TRIP_STARTED', `${today}T08:07:00.000Z`, driver1UserId, v1Id, 23.2100, 77.4000, 8.0, 'Trip started at Company Central Depot');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop1Id, 'ARRIVED_DESTINATION', `${today}T09:14:00.000Z`, driver1UserId, v1Id, 23.2598, 77.4125, 10.0, 'Arrived at Stop 1: ABC Warehouse (Location Verified, +14m late)');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop1Id, 'ACTIVITY_COMPLETED', `${today}T09:37:00.000Z`, driver1UserId, v1Id, 23.2598, 77.4125, 10.0, 'Activity Delivery completed for Stop 1');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop1Id, 'DEPARTED_DESTINATION', `${today}T09:42:00.000Z`, driver1UserId, v1Id, 23.2597, 77.4128, 9.5, 'Departed Stop 1: ABC Warehouse');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop2Id, 'ARRIVED_DESTINATION', `${today}T10:31:00.000Z`, driver1UserId, v1Id, 23.2323, 77.4286, 11.2, 'Arrived at Stop 2: XYZ Retail Store (+16m late)');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop2Id, 'DELAY_REPORTED', `${today}T10:45:00.000Z`, driver1UserId, v1Id, 23.2330, 77.4280, 12.5, 'Delay reported: Traffic — Heavy road construction');

  // TRIP 2: Planned/Assigned Trip ready for the Driver to start right away
  const trip2Id = 'TR-2026-00125';
  db.prepare(`
    INSERT INTO trips (
      id, date, driver_id, vehicle_id, starting_location, starting_latitude, starting_longitude,
      purpose, reference_number, planned_departure_time, status, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, ?)
  `).run(
    trip2Id,
    today,
    driver2UserId,
    v2Id,
    'Company Central Warehouse',
    23.2500,
    77.4100,
    'Express Cold-Chain Delivery',
    'REF-EX-449',
    '11:00',
    'Temperature critical goods. Take temperature proof photo.',
    managerId
  );

  db.prepare(`
    INSERT INTO trip_stops (id, trip_id, destination_id, stop_number, destination_name, address, latitude, longitude, planned_arrival_time, status)
    VALUES (?, ?, ?, 1, 'Metro Cold Storage Hub', 'Govindpura Heavy Industrial Sector', 23.2620, 77.4580, '11:45', 'PENDING'),
           (?, ?, ?, 2, 'North Point Distribution Center', 'Bhopal Bypass Highway KM 14', 23.3150, 77.3820, '13:00', 'PENDING')
  `).run(
    uuidv4(), trip2Id, dest5Id,
    uuidv4(), trip2Id, dest4Id
  );

  // TRIP 3: Completed Trip with full timeline and distance
  const trip3Id = 'TR-2026-00120';
  db.prepare(`
    INSERT INTO trips (
      id, date, driver_id, vehicle_id, starting_location, purpose, planned_departure_time,
      actual_start_time, return_start_time, base_arrival_time, completion_time,
      status, total_delay_minutes, calculated_distance_km, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'COMPLETED', 15, 34.8, ?, ?)
  `).run(
    trip3Id,
    today,
    driver3UserId,
    v3Id,
    'Company Central Warehouse',
    'Morning Multi-drop Supply Run',
    '06:30',
    `${today}T06:35:00.000Z`,
    `${today}T09:10:00.000Z`,
    `${today}T09:45:00.000Z`,
    `${today}T09:50:00.000Z`,
    'Completed with minor tyre pressure check delay',
    managerId
  );

  console.log('✅ Database seeded successfully!');
  console.log('-------------------------------------------------');
  console.log('🔑 Credentials:');
  console.log('   Manager: manager@company.com / manager123');
  console.log('   Driver:  rahul@company.com   / driver123 (also driver@company.com)');
  console.log('   Driver:  amit@company.com    / driver123');
  console.log('-------------------------------------------------');
}

if (require.main === module) {
  seed()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('❌ Seeding failed:', err);
      process.exit(1);
    });
}
