import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db, initDatabase } from './db';

export async function seed() {
  console.log('🌱 Seeding TruckTracker database with Delhi-Noida logistics demo data...');
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

  const managerPasswordHash = await bcrypt.hash('manager123', 10);
  const driverPasswordHash = await bcrypt.hash('driver123', 10);

  // 1. Users
  const managerId = uuidv4();
  const driver1UserId = uuidv4();
  const driver2UserId = uuidv4();
  const driver3UserId = uuidv4();
  const driverTestUserId = uuidv4();

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, email, password_hash, role, phone)
    VALUES (?, ?, LOWER(?), ?, ?, ?)
  `);

  insertUser.run(managerId, 'Sunil Mehta (Operations Manager)', 'manager@company.com', managerPasswordHash, 'MANAGER', '+91 98100 11223');
  insertUser.run(driver1UserId, 'Rahul Sharma (Senior Driver)', 'rahul@company.com', driverPasswordHash, 'DRIVER', '+91 98101 44556');
  insertUser.run(driver2UserId, 'Amit Verma (Express Driver)', 'amit@company.com', driverPasswordHash, 'DRIVER', '+91 98102 77889');
  insertUser.run(driver3UserId, 'Rajesh Kumar (Freight Driver)', 'rajesh@company.com', driverPasswordHash, 'DRIVER', '+91 98103 99001');
  insertUser.run(driverTestUserId, 'Rahul Sharma (Test Driver)', 'driver@company.com', driverPasswordHash, 'DRIVER', '+91 98101 44556');

  // 2. Vehicles
  const v1Id = uuidv4();
  const v2Id = uuidv4();
  const v3Id = uuidv4();
  const v4Id = uuidv4();

  const insertVehicle = db.prepare(`
    INSERT INTO vehicles (id, vehicle_number, vehicle_type, model, assigned_driver_id, status, notes)
    VALUES (?, UPPER(?), ?, ?, ?, ?, ?)
  `);

  insertVehicle.run(v1Id, 'DL01 TA 4920', 'Refrigerated Express', 'Tata Ultra T.7 (14ft High Deck)', driver1UserId, 'ON_TRIP', 'Fitted with telematics, GPS tracker, and thermal sensor');
  insertVehicle.run(v2Id, 'UP16 BT 9845', 'Medium Freight', 'Ashok Leyland Ecomet Star 1115', driver2UserId, 'AVAILABLE', 'Noida-NCR intercity permit active, maintenance passed');
  insertVehicle.run(v3Id, 'DL1L AA 3180', 'Heavy Freight', 'BharatBenz 1617R (24ft Container)', driver3UserId, 'ON_TRIP', 'Multi-axle heavy hauler for industrial machinery & FMCG');
  insertVehicle.run(v4Id, 'UP14 EX 7621', 'City Box Hauler', 'Mahindra Furio 12', null, 'MAINTENANCE', 'Scheduled brake disc replacement at Okhla workshop');

  // 3. Drivers Profile
  const insertDriver = db.prepare(`
    INSERT INTO drivers (id, user_id, employee_id, assigned_vehicle_id, status)
    VALUES (?, ?, UPPER(?), ?, ?)
  `);

  insertDriver.run(uuidv4(), driver1UserId, 'EMP-DRV-101', v1Id, 'ON_TRIP');
  insertDriver.run(uuidv4(), driver2UserId, 'EMP-DRV-102', v2Id, 'AVAILABLE');
  insertDriver.run(uuidv4(), driver3UserId, 'EMP-DRV-103', v3Id, 'ON_TRIP');
  insertDriver.run(uuidv4(), driverTestUserId, 'EMP-DRV-100', v1Id, 'ON_TRIP');

  // 4. Saved Destinations across Delhi, Noida, and Transit Points
  const destOkhlaId = uuidv4();
  const destLajpatId = uuidv4();
  const destMayurViharId = uuidv4();
  const destGhazipurId = uuidv4();
  const destNoida18Id = uuidv4();
  const destNoida62Id = uuidv4();
  const destGreaterNoidaId = uuidv4();
  const destConnaughtPlaceId = uuidv4();

  const insertDest = db.prepare(`
    INSERT INTO destinations (id, name, address, latitude, longitude, contact_name, contact_number, geofence_radius_meters, notes, is_active)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
  `);

  insertDest.run(destOkhlaId, 'Company North Central Depot', 'Okhla Industrial Area Phase-III, New Delhi', 28.5355, 77.2680, 'Rajesh Khanna', '+91 98101 22334', 200, 'Primary Fleet Hub & Dispatch Dock');
  insertDest.run(destLajpatId, 'Lajpat Nagar Central Transit Hub', 'Ring Road Commercial Complex, Lajpat Nagar, New Delhi', 28.5677, 77.2433, 'Manoj Tiwari', '+91 98102 33445', 150, 'Loading Bay 2 at rear entry');
  insertDest.run(destMayurViharId, 'Mayur Vihar Phase-1 Distribution Facility', 'Pocket 1, Commercial Sector, Mayur Vihar, East Delhi', 28.6015, 77.2940, 'Satish Chawla', '+91 98103 44556', 150, 'Delhi-Noida link transit depot');
  insertDest.run(destGhazipurId, 'Ghazipur Border Freight Terminal & Cold Hub', 'Delhi-UP Border Highway Junction, Ghazipur', 28.6240, 77.3310, 'Anand Singh', '+91 98104 55667', 200, 'Border commercial tax & refrigerated cargo gate');
  insertDest.run(destNoida18Id, 'Noida Sector 18 Commercial Logistics Bay', 'Atta Market Logistics Lane, Sector 18, Noida', 28.5708, 77.3260, 'Vikas Malhotra', '+91 98105 66778', 150, 'Deliveries permitted 08:00 - 18:00 only');
  insertDest.run(destNoida62Id, 'Noida Sector 62 Electronic City Mega Hub', 'Block C, Electronic City, Sector 62, Noida', 28.6280, 77.3680, 'Deepa Rastogi', '+91 98106 77889', 250, 'Automated Fulfillment Center Bay 4');
  insertDest.run(destGreaterNoidaId, 'Ecotech-III Logistics Park', 'Industrial Area, Ecotech-III, Greater Noida', 28.4744, 77.5040, 'Sandeep Yadav', '+91 98107 88990', 250, 'Heavy vehicle 24/7 container yard');
  insertDest.run(destConnaughtPlaceId, 'Connaught Place Rapid Transit Depot', 'Barakhamba Road Annex, Connaught Place, New Delhi', 28.6315, 77.2167, 'Harish Verma', '+91 98108 99001', 150, 'Early morning express supply window');

  const today = new Date().toISOString().split('T')[0];

  // =========================================================================
  // TRIP 1: Flagship Delhi -> Noida Corridor (In-Progress & Delayed at Border)
  // =========================================================================
  const trip1Id = 'TR-DEL-2026-01';
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
    'Okhla Industrial Area Phase-III, New Delhi',
    28.5355,
    77.2680,
    'Delhi-NCR Inter-City Express Freight & Restock Corridor',
    'PO-NCR-88492',
    '08:00',
    `${today}T08:07:00.000Z`,
    'DELAYED',
    22,
    46.8,
    'High-priority dispatch across Delhi, Mayur Vihar, Ghazipur Border, and Noida Sector 18 & 62',
    managerId
  );

  // Stop 1 (Delhi): Lajpat Nagar (Completed)
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
    destLajpatId,
    1,
    'Lajpat Nagar Central Transit Hub',
    'Ring Road Commercial Complex, Lajpat Nagar, New Delhi',
    28.5677,
    77.2433,
    150,
    '08:35',
    `${today}T08:42:00.000Z`,
    `${today}T09:12:00.000Z`,
    28.5676,
    77.2434,
    28.5678,
    77.2432,
    'LATE',
    7,
    'COMPLETED',
    'Delivered 40 cartons FMCG goods, signed by Manoj Tiwari'
  );

  // Stop 2 (Between Delhi-Noida): Mayur Vihar Phase-1 (Completed)
  const trip1Stop2Id = uuidv4();
  db.prepare(`
    INSERT INTO trip_stops (
      id, trip_id, destination_id, stop_number, destination_name, address, latitude, longitude,
      geofence_radius_meters, planned_arrival_time, actual_arrival_time, actual_departure_time,
      arrival_latitude, arrival_longitude, departure_latitude, departure_longitude,
      arrival_status, arrival_diff_minutes, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip1Stop2Id,
    trip1Id,
    destMayurViharId,
    2,
    'Mayur Vihar Phase-1 Distribution Facility',
    'Pocket 1, Commercial Sector, Mayur Vihar, East Delhi',
    28.6015,
    77.2940,
    150,
    '09:30',
    `${today}T09:38:00.000Z`,
    `${today}T10:08:00.000Z`,
    28.6016,
    77.2939,
    28.6014,
    77.2941,
    'LATE',
    8,
    'COMPLETED',
    'Loaded 18 crates electronic accessories & inspected bolt seal'
  );

  // Stop 3 (Border point): Ghazipur Border Hub (Arrived & Delayed)
  const trip1Stop3Id = uuidv4();
  db.prepare(`
    INSERT INTO trip_stops (
      id, trip_id, destination_id, stop_number, destination_name, address, latitude, longitude,
      geofence_radius_meters, planned_arrival_time, actual_arrival_time,
      arrival_latitude, arrival_longitude, arrival_status, arrival_diff_minutes, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip1Stop3Id,
    trip1Id,
    destGhazipurId,
    3,
    'Ghazipur Border Freight Terminal & Cold Hub',
    'Delhi-UP Border Highway Junction, Ghazipur',
    28.6240,
    77.3310,
    200,
    '10:20',
    `${today}T10:35:00.000Z`,
    28.6241,
    77.3312,
    'LATE',
    15,
    'ARRIVED',
    'Vehicle held in UP commercial tax queue at border junction'
  );

  // Stop 4 (Noida): Sector 18 (Pending)
  const trip1Stop4Id = uuidv4();
  db.prepare(`
    INSERT INTO trip_stops (
      id, trip_id, destination_id, stop_number, destination_name, address, latitude, longitude,
      geofence_radius_meters, planned_arrival_time, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(
    trip1Stop4Id,
    trip1Id,
    destNoida18Id,
    4,
    'Noida Sector 18 Commercial Logistics Bay',
    'Atta Market Logistics Lane, Sector 18, Noida',
    28.5708,
    77.3260,
    150,
    '11:45',
    'Pending delivery of retail crates'
  );

  // Stop 5 (Noida): Sector 62 Electronic City Mega Hub (Pending)
  const trip1Stop5Id = uuidv4();
  db.prepare(`
    INSERT INTO trip_stops (
      id, trip_id, destination_id, stop_number, destination_name, address, latitude, longitude,
      geofence_radius_meters, planned_arrival_time, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(
    trip1Stop5Id,
    trip1Id,
    destNoida62Id,
    5,
    'Noida Sector 62 Electronic City Mega Hub',
    'Block C, Electronic City, Sector 62, Noida',
    28.6280,
    77.3680,
    250,
    '13:00',
    'Final drop-off point at Bay 4 Fulfillment'
  );

  // Active Delay on Trip 1
  const delay1Id = uuidv4();
  db.prepare(`
    INSERT INTO delays (
      id, trip_id, stop_id, driver_id, vehicle_id, reason, description, start_time,
      latitude, longitude, gps_accuracy, is_resolved
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    delay1Id,
    trip1Id,
    trip1Stop3Id,
    driver1UserId,
    v1Id,
    'Traffic Bottleneck',
    'Heavy commercial traffic queue at Delhi-UP border security tax gate and lane diversion',
    `${today}T10:36:00.000Z`,
    28.6240,
    77.3310,
    12.0
  );

  // Activities
  db.prepare(`
    INSERT INTO activities (id, trip_id, stop_id, activity_type, status, start_time, completion_time, quantity, reference_number, recipient_name, notes)
    VALUES (?, ?, ?, 'Delivery', 'COMPLETED', ?, ?, 40, 'INV-DEL-101', 'Manoj Tiwari', 'Unloaded and verified')
  `).run(uuidv4(), trip1Id, trip1Stop1Id, `${today}T08:45:00.000Z`, `${today}T09:10:00.000Z`);

  db.prepare(`
    INSERT INTO activities (id, trip_id, stop_id, activity_type, status, start_time, completion_time, quantity, reference_number, recipient_name, notes)
    VALUES (?, ?, ?, 'Pickup', 'COMPLETED', ?, ?, 18, 'INV-MV-204', 'Satish Chawla', 'Loaded in cold rack section')
  `).run(uuidv4(), trip1Id, trip1Stop2Id, `${today}T09:42:00.000Z`, `${today}T10:05:00.000Z`);

  // Photos for Trip 1
  const insertPhoto = db.prepare(`
    INSERT INTO photos (id, trip_id, stop_id, driver_id, vehicle_id, photo_type, file_path, file_size, mime_type, timestamp, latitude, longitude, gps_accuracy)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertPhoto.run(
    'p-del-001',
    trip1Id,
    null,
    driver1UserId,
    v1Id,
    'ODOMETER',
    'photo-delhi-odometer.svg',
    18420,
    'image/svg+xml',
    `${today}T08:05:22.000Z`,
    28.5355,
    77.2680,
    6.0
  );

  insertPhoto.run(
    'p-del-002',
    trip1Id,
    trip1Stop1Id,
    driver1UserId,
    v1Id,
    'DELIVERY_PROOF',
    'photo-delhi-delivery-lajpat.svg',
    24100,
    'image/svg+xml',
    `${today}T09:37:14.000Z`,
    28.5677,
    77.2433,
    8.5
  );

  insertPhoto.run(
    'p-del-003',
    trip1Id,
    trip1Stop2Id,
    driver1UserId,
    v1Id,
    'SECURITY_SEAL',
    'photo-delhi-seal-mayurvihar.svg',
    19800,
    'image/svg+xml',
    `${today}T10:02:18.000Z`,
    28.6015,
    77.2940,
    7.0
  );

  insertPhoto.run(
    'p-del-004',
    trip1Id,
    trip1Stop3Id,
    driver1UserId,
    v1Id,
    'DELAY_PROOF',
    'photo-delhi-delay-ghazipur.svg',
    21500,
    'image/svg+xml',
    `${today}T10:35:40.000Z`,
    28.6240,
    77.3310,
    11.0
  );

  insertPhoto.run(
    'p-del-005',
    trip1Id,
    trip1Stop5Id,
    driver1UserId,
    v1Id,
    'DESTINATION_ARRIVAL',
    'photo-noida-warehouse.svg',
    16900,
    'image/svg+xml',
    `${today}T07:45:00.000Z`,
    28.6280,
    77.3680,
    5.0
  );

  // Events for Trip 1
  const insertEvent = db.prepare(`
    INSERT INTO trip_events (id, trip_id, stop_id, event_type, timestamp, driver_id, vehicle_id, latitude, longitude, gps_accuracy, details)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertEvent.run(uuidv4(), trip1Id, null, 'TRIP_STARTED', `${today}T08:07:00.000Z`, driver1UserId, v1Id, 28.5355, 77.2680, 6.0, 'Trip dispatched from Okhla Central Hub');
  insertEvent.run(uuidv4(), trip1Id, null, 'ODOMETER_VERIFIED', `${today}T08:08:00.000Z`, driver1UserId, v1Id, 28.5355, 77.2680, 6.0, 'Odometer 48,215 KM confirmed via Camera');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop1Id, 'ARRIVED_DESTINATION', `${today}T08:42:00.000Z`, driver1UserId, v1Id, 28.5676, 77.2434, 7.0, 'Arrived at Stop 1: Lajpat Nagar (+7m late)');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop1Id, 'ACTIVITY_COMPLETED', `${today}T09:10:00.000Z`, driver1UserId, v1Id, 28.5677, 77.2433, 7.0, 'Delivered 40 cartons, photo proof captured');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop1Id, 'DEPARTED_DESTINATION', `${today}T09:12:00.000Z`, driver1UserId, v1Id, 28.5678, 77.2432, 8.0, 'Departed Lajpat Nagar towards Mayur Vihar');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop2Id, 'ARRIVED_DESTINATION', `${today}T09:38:00.000Z`, driver1UserId, v1Id, 28.6016, 77.2939, 7.5, 'Arrived at Stop 2: Mayur Vihar Phase-1');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop2Id, 'ACTIVITY_COMPLETED', `${today}T10:05:00.000Z`, driver1UserId, v1Id, 28.6015, 77.2940, 7.0, 'Cargo loaded & security bolt seal verified');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop2Id, 'DEPARTED_DESTINATION', `${today}T10:08:00.000Z`, driver1UserId, v1Id, 28.6014, 77.2941, 8.0, 'Departed Mayur Vihar towards Ghazipur border');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop3Id, 'ARRIVED_DESTINATION', `${today}T10:35:00.000Z`, driver1UserId, v1Id, 28.6241, 77.3312, 11.0, 'Arrived at Stop 3: Ghazipur Border Hub (+15m late)');
  insertEvent.run(uuidv4(), trip1Id, trip1Stop3Id, 'DELAY_REPORTED', `${today}T10:36:00.000Z`, driver1UserId, v1Id, 28.6240, 77.3310, 12.0, 'Delay reported: Traffic bottleneck at border tax gate (+22 mins)');

  // =========================================================================
  // TRIP 2: Completed Morning Run (Okhla -> Noida Sector 18 -> Greater Noida)
  // =========================================================================
  const trip2Id = 'TR-DEL-2026-02';
  db.prepare(`
    INSERT INTO trips (
      id, date, driver_id, vehicle_id, starting_location, starting_latitude, starting_longitude,
      purpose, reference_number, planned_departure_time, actual_start_time, return_start_time,
      base_arrival_time, completion_time, status, total_delay_minutes, calculated_distance_km, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    trip2Id,
    today,
    driver2UserId,
    v2Id,
    'Okhla Industrial Area Phase-III, New Delhi',
    28.5355,
    77.2680,
    'Automotive Components Morning Express',
    'PO-AUTO-4421',
    '06:30',
    `${today}T06:35:00.000Z`,
    `${today}T09:15:00.000Z`,
    `${today}T09:50:00.000Z`,
    `${today}T09:55:00.000Z`,
    'COMPLETED',
    0,
    52.4,
    'Completed on-time morning shuttle to Noida Sector 18 and Greater Noida Ecotech park',
    managerId
  );

  db.prepare(`
    INSERT INTO trip_stops (id, trip_id, destination_id, stop_number, destination_name, address, latitude, longitude, planned_arrival_time, actual_arrival_time, actual_departure_time, arrival_status, status)
    VALUES (?, ?, ?, 1, 'Noida Sector 18 Commercial Logistics Bay', 'Atta Market Logistics Lane, Sector 18, Noida', 28.5708, 77.3260, '07:15', '${today}T07:12:00.000Z', '${today}T07:45:00.000Z', 'ON_TIME', 'COMPLETED'),
           (?, ?, ?, 2, 'Ecotech-III Logistics Park', 'Industrial Area, Ecotech-III, Greater Noida', 28.4744, 77.5040, '08:30', '${today}T08:28:00.000Z', '${today}T09:10:00.000Z', 'ON_TIME', 'COMPLETED')
  `).run(
    uuidv4(), trip2Id, destNoida18Id,
    uuidv4(), trip2Id, destGreaterNoidaId
  );

  // =========================================================================
  // TRIP 3: Scheduled / Assigned Afternoon Run (Okhla -> Connaught Place -> Noida)
  // =========================================================================
  const trip3Id = 'TR-DEL-2026-03';
  db.prepare(`
    INSERT INTO trips (
      id, date, driver_id, vehicle_id, starting_location, starting_latitude, starting_longitude,
      purpose, reference_number, planned_departure_time, status, total_delay_minutes, calculated_distance_km, notes, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', 0, 38.2, ?, ?)
  `).run(
    trip3Id,
    today,
    driver3UserId,
    v3Id,
    'Okhla Industrial Area Phase-III, New Delhi',
    28.5355,
    77.2680,
    'Central Delhi Commercial Supply & Noida Evening Handover',
    'PO-CP-7712',
    '14:00',
    'Scheduled for afternoon dispatch upon vehicle inspection signoff',
    managerId
  );

  db.prepare(`
    INSERT INTO trip_stops (id, trip_id, destination_id, stop_number, destination_name, address, latitude, longitude, planned_arrival_time, status)
    VALUES (?, ?, ?, 1, 'Connaught Place Rapid Transit Depot', 'Barakhamba Road Annex, Connaught Place, New Delhi', 28.6315, 77.2167, '14:45', 'PENDING'),
           (?, ?, ?, 2, 'Mayur Vihar Phase-1 Distribution Facility', 'Pocket 1, Commercial Sector, Mayur Vihar, East Delhi', 28.6015, 77.2940, '15:45', 'PENDING'),
           (?, ?, ?, 3, 'Noida Sector 62 Electronic City Mega Hub', 'Block C, Electronic City, Sector 62, Noida', 28.6280, 77.3680, '16:45', 'PENDING')
  `).run(
    uuidv4(), trip3Id, destConnaughtPlaceId,
    uuidv4(), trip3Id, destMayurViharId,
    uuidv4(), trip3Id, destNoida62Id
  );

  console.log('✅ Database seeded with Delhi-Noida demo data successfully!');
  console.log('-------------------------------------------------');
  console.log('🔑 Credentials:');
  console.log('   Manager: manager@company.com / manager123');
  console.log('   Driver:  rahul@company.com   / driver123 (also driver@company.com)');
  console.log('   Driver:  amit@company.com    / driver123');
  console.log('   Driver:  rajesh@company.com  / driver123');
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
