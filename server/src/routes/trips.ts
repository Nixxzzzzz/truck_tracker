import { Router, Response } from 'express';
import { db } from '../db';
import { requireAuth, requireRole, logAudit, AuthenticatedRequest } from '../middleware/auth';
import { googleSheetsService } from '../services/googleSheets';
import { v4 as uuidv4 } from 'uuid';
import { Trip, TripStop } from '../types';

const router = Router();

function generateTripId(): string {
  const year = new Date().getFullYear();
  const countRow = db.prepare(`SELECT COUNT(*) as count FROM trips`).get() as { count: number };
  const nextNum = (countRow.count + 1).toString().padStart(5, '0');
  return `TR-${year}-${nextNum}`;
}

/**
 * GET /api/trips/overview/attention
 * Returns items requiring manager attention: delayed trips, overdue trips, failed activities, sync failures
 */
router.get('/overview/attention', requireAuth, requireRole('MANAGER'), (_req, res) => {
  const now = new Date().toISOString();
  const today = now.split('T')[0];

  // 1. Currently active delayed trips
  const delayedTrips = db.prepare(`
    SELECT t.id, t.status, t.total_delay_minutes, u.name as driver_name, v.vehicle_number,
           (SELECT reason FROM delays WHERE trip_id = t.id AND is_resolved = 0 ORDER BY start_time DESC LIMIT 1) as delay_reason
    FROM trips t
    JOIN users u ON t.driver_id = u.id
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.status = 'DELAYED'
  `).all();

  // 2. Failed activities
  const failedActivities = db.prepare(`
    SELECT a.*, ts.destination_name, ts.stop_number, u.name as driver_name, v.vehicle_number
    FROM activities a
    JOIN trip_stops ts ON a.stop_id = ts.id
    JOIN trips t ON a.trip_id = t.id
    JOIN users u ON t.driver_id = u.id
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE a.status = 'FAILED'
    ORDER BY a.created_at DESC LIMIT 10
  `).all();

  // 3. Failed Google Sheets Sync items
  const syncFailures = db.prepare(`
    SELECT * FROM google_sheet_sync WHERE sync_status = 'FAILED' ORDER BY created_at DESC LIMIT 10
  `).all();

  // 4. Overdue unstarted trips (Planned departure was > 30 mins ago and trip is still ASSIGNED)
  const overdueTrips = db.prepare(`
    SELECT t.id, t.planned_departure_time, t.date, u.name as driver_name, v.vehicle_number
    FROM trips t
    JOIN users u ON t.driver_id = u.id
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.status = 'ASSIGNED' AND t.date = ?
  `).all(today) as any[];

  // 5. Vehicles under maintenance or inactive
  const maintenanceVehicles = db.prepare(`
    SELECT id, vehicle_number, model, status, notes FROM vehicles WHERE status IN ('MAINTENANCE', 'INACTIVE')
  `).all();

  return res.json({
    delayedTrips,
    failedActivities,
    syncFailures,
    overdueTrips,
    maintenanceVehicles,
    totalAttentionCount: delayedTrips.length + failedActivities.length + syncFailures.length + maintenanceVehicles.length
  });
});

/**
 * GET /api/trips
 * Manager trips listing with search and filter parameters
 */
router.get('/', requireAuth, requireRole('MANAGER'), (req, res) => {
  const { date, driverId, vehicleId, status, search, limit = 50, offset = 0 } = req.query;

  let query = `
    SELECT t.*, u.name as driver_name, v.vehicle_number, v.model as vehicle_model,
           (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id) as total_stops,
           (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id AND status = 'COMPLETED') as completed_stops,
           (SELECT destination_name FROM trip_stops WHERE trip_id = t.id AND status IN ('PENDING', 'ARRIVED', 'IN_PROGRESS') ORDER BY stop_number ASC LIMIT 1) as current_destination
    FROM trips t
    JOIN users u ON t.driver_id = u.id
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (date) {
    query += ` AND t.date = ?`;
    params.push(date);
  }
  if (driverId) {
    query += ` AND t.driver_id = ?`;
    params.push(driverId);
  }
  if (vehicleId) {
    query += ` AND t.vehicle_id = ?`;
    params.push(vehicleId);
  }
  if (status) {
    query += ` AND t.status = ?`;
    params.push(status);
  }
  if (search) {
    query += ` AND (t.id LIKE ? OR v.vehicle_number LIKE ? OR u.name LIKE ? OR t.reference_number LIKE ?)`;
    const s = `%${search}%`;
    params.push(s, s, s, s);
  }

  query += ` ORDER BY t.created_at DESC LIMIT ? OFFSET ?`;
  params.push(parseInt(limit as string, 10), parseInt(offset as string, 10));

  const trips = db.prepare(query).all(...params);
  return res.json({ trips });
});

/**
 * GET /api/trips/:id
 * Full Manager Trip Detail View
 */
router.get('/:id', requireAuth, requireRole('MANAGER'), (req, res) => {
  const tripId = req.params.id;

  const trip = db.prepare(`
    SELECT t.*, u.name as driver_name, u.phone as driver_phone, v.vehicle_number, v.vehicle_type, v.model as vehicle_model
    FROM trips t
    JOIN users u ON t.driver_id = u.id
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.id = ?
  `).get(tripId) as any;

  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  // Stops with activities and photos
  const stops = db.prepare(`SELECT * FROM trip_stops WHERE trip_id = ? ORDER BY stop_number ASC`).all(tripId) as any[];
  for (const stop of stops) {
    stop.activities = db.prepare(`SELECT * FROM activities WHERE stop_id = ?`).all(stop.id);
    stop.photos = db.prepare(`SELECT * FROM photos WHERE stop_id = ?`).all(stop.id);
  }
  trip.stops = stops;

  // Complete chronological timeline events
  trip.events = db.prepare(`
    SELECT * FROM trip_events WHERE trip_id = ? ORDER BY timestamp ASC
  `).all(tripId);

  // All photos taken on this trip
  trip.photos = db.prepare(`
    SELECT p.*, ts.destination_name, ts.stop_number 
    FROM photos p 
    LEFT JOIN trip_stops ts ON p.stop_id = ts.id
    WHERE p.trip_id = ? 
    ORDER BY p.timestamp ASC
  `).all(tripId);

  // All delays
  trip.delays = db.prepare(`
    SELECT * FROM delays WHERE trip_id = ? ORDER BY start_time ASC
  `).all(tripId);

  // Audit trail
  trip.auditLogs = db.prepare(`
    SELECT a.*, u.name as changed_by_name
    FROM audit_logs a
    LEFT JOIN users u ON a.changed_by = u.id
    WHERE a.trip_id = ?
    ORDER BY a.created_at DESC
  `).all(tripId);

  return res.json({ trip });
});

/**
 * POST /api/trips
 * Manager creates a new trip with 1..N stops
 */
router.post('/', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const {
    date,
    driver_id,
    vehicle_id,
    starting_location = 'Company Central Depot',
    starting_latitude,
    starting_longitude,
    purpose = 'Client Delivery',
    reference_number,
    planned_departure_time,
    notes,
    stops,
    sap_shipment_num,
    erp_delivery_doc,
    cost_center
  } = req.body;

  if (!date || !driver_id || !vehicle_id || !planned_departure_time) {
    return res.status(400).json({ error: 'Date, Driver, Vehicle, and Planned Departure Time are required' });
  }

  if (!Array.isArray(stops) || stops.length === 0) {
    return res.status(400).json({ error: 'A trip must contain at least 1 destination stop' });
  }

  const tripId = generateTripId();
  const userId = req.user!.id;
  const now = new Date().toISOString();

  // Transactionally create trip and stops
  const insertTrip = db.transaction(() => {
    db.prepare(`
      INSERT INTO trips (
        id, date, driver_id, vehicle_id, starting_location, starting_latitude, starting_longitude,
        purpose, reference_number, planned_departure_time, status, notes, created_by, created_at, updated_at,
        sap_shipment_num, erp_delivery_doc, cost_center
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ASSIGNED', ?, ?, ?, ?, ?, ?, ?)
    `).run(
      tripId,
      date,
      driver_id,
      vehicle_id,
      starting_location,
      starting_latitude ?? null,
      starting_longitude ?? null,
      purpose,
      reference_number || null,
      planned_departure_time,
      notes || null,
      userId,
      now,
      now,
      sap_shipment_num || null,
      erp_delivery_doc || null,
      cost_center || null
    );

    const insertStopStmt = db.prepare(`
      INSERT INTO trip_stops (
        id, trip_id, destination_id, stop_number, destination_name, address, 
        latitude, longitude, geofence_radius_meters, planned_arrival_time, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
    `);

    stops.forEach((stop: any, index: number) => {
      insertStopStmt.run(
        uuidv4(),
        tripId,
        stop.destination_id || null,
        index + 1,
        stop.destination_name || `Destination ${index + 1}`,
        stop.address || 'Standard Address',
        stop.latitude || 0,
        stop.longitude || 0,
        stop.geofence_radius_meters || 150,
        stop.planned_arrival_time || planned_departure_time,
        stop.notes || null
      );
    });

    logAudit({
      tripId,
      action: 'TRIP_CREATED',
      newValue: `Trip ${tripId} created with ${stops.length} stops`,
      changedBy: userId
    });
  });

  try {
    insertTrip();
    googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));
    return res.status(201).json({ message: 'Trip created successfully', tripId });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to create trip', details: err.message });
  }
});

/**
 * PUT /api/trips/:id
 * Manager edits trip information before it starts
 */
router.put('/:id', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const tripId = req.params.id;
  const userId = req.user!.id;
  const { driver_id, vehicle_id, planned_departure_time, purpose, reference_number, notes, reason, sap_shipment_num, erp_delivery_doc, cost_center } = req.body;

  const currentTrip = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(tripId) as Trip | undefined;
  if (!currentTrip) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  if (currentTrip.status === 'COMPLETED' || currentTrip.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Cannot edit completed or cancelled trips' });
  }

  // Audit track driver change
  if (driver_id && driver_id !== currentTrip.driver_id) {
    logAudit({
      tripId,
      action: 'DRIVER_REASSIGNED',
      fieldChanged: 'driver_id',
      originalValue: currentTrip.driver_id,
      newValue: driver_id,
      changedBy: userId,
      reason: reason || 'Manager reassigned driver'
    });
  }

  // Audit track vehicle change
  if (vehicle_id && vehicle_id !== currentTrip.vehicle_id) {
    logAudit({
      tripId,
      action: 'VEHICLE_REASSIGNED',
      fieldChanged: 'vehicle_id',
      originalValue: currentTrip.vehicle_id,
      newValue: vehicle_id,
      changedBy: userId,
      reason: reason || 'Manager reassigned vehicle'
    });
  }

  db.prepare(`
    UPDATE trips
    SET driver_id = COALESCE(?, driver_id),
        vehicle_id = COALESCE(?, vehicle_id),
        planned_departure_time = COALESCE(?, planned_departure_time),
        purpose = COALESCE(?, purpose),
        reference_number = COALESCE(?, reference_number),
        notes = COALESCE(?, notes),
        sap_shipment_num = COALESCE(?, sap_shipment_num),
        erp_delivery_doc = COALESCE(?, erp_delivery_doc),
        cost_center = COALESCE(?, cost_center),
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `).run(
    driver_id || null,
    vehicle_id || null,
    planned_departure_time || null,
    purpose || null,
    reference_number || null,
    notes || null,
    sap_shipment_num || null,
    erp_delivery_doc || null,
    cost_center || null,
    tripId
  );

  googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));

  return res.json({ message: 'Trip updated successfully' });
});

/**
 * PUT /api/trips/:id/stops/reorder
 * Manager reorders destinations before trip starts
 */
router.put('/:id/stops/reorder', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const tripId = req.params.id;
  const userId = req.user!.id;
  const { stopIds } = req.body; // Array of stop IDs in desired order

  if (!Array.isArray(stopIds)) {
    return res.status(400).json({ error: 'stopIds array required' });
  }

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(tripId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  if (trip.status !== 'ASSIGNED' && trip.status !== 'PLANNED') {
    return res.status(400).json({ error: 'Cannot reorder stops once trip has started' });
  }

  const reorderTx = db.transaction(() => {
    stopIds.forEach((id: string, index: number) => {
      db.prepare(`UPDATE trip_stops SET stop_number = ? WHERE id = ? AND trip_id = ?`).run(
        index + 1,
        id,
        tripId
      );
    });

    logAudit({
      tripId,
      action: 'STOPS_REORDERED',
      newValue: `Stops reordered: ${stopIds.join(' -> ')}`,
      changedBy: userId
    });
  });

  try {
    reorderTx();
    return res.json({ message: 'Stops reordered successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to reorder stops', details: err.message });
  }
});

/**
 * POST /api/trips/:id/stops
 * Add a destination stop before trip starts
 */
router.post('/:id/stops', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const tripId = req.params.id;
  const userId = req.user!.id;
  const { destination_id, destination_name, address, latitude, longitude, geofence_radius_meters = 150, planned_arrival_time, notes } = req.body;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(tripId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  if (trip.status !== 'ASSIGNED' && trip.status !== 'PLANNED') {
    return res.status(400).json({ error: 'Cannot add stops once trip has started' });
  }

  const stopCountRow = db.prepare(`SELECT COUNT(*) as count FROM trip_stops WHERE trip_id = ?`).get(tripId) as { count: number };
  const nextStopNumber = stopCountRow.count + 1;
  const stopId = uuidv4();

  db.prepare(`
    INSERT INTO trip_stops (
      id, trip_id, destination_id, stop_number, destination_name, address, 
      latitude, longitude, geofence_radius_meters, planned_arrival_time, status, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PENDING', ?)
  `).run(
    stopId,
    tripId,
    destination_id || null,
    nextStopNumber,
    destination_name || `Destination ${nextStopNumber}`,
    address || 'Company Site',
    latitude || 0,
    longitude || 0,
    geofence_radius_meters,
    planned_arrival_time || trip.planned_departure_time,
    notes || null
  );

  logAudit({
    tripId,
    action: 'STOP_ADDED',
    newValue: `Added Stop ${nextStopNumber}: ${destination_name}`,
    changedBy: userId
  });

  googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));

  return res.status(201).json({ message: 'Stop added successfully', stopId, stop_number: nextStopNumber });
});

/**
 * PUT /api/trips/:id/stops/:stopId
 * Edit a destination stop before trip starts
 */
router.put('/:id/stops/:stopId', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id: tripId, stopId } = req.params;
  const userId = req.user!.id;
  const { destination_name, address, latitude, longitude, geofence_radius_meters, planned_arrival_time, notes } = req.body;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(tripId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  if (trip.status !== 'ASSIGNED' && trip.status !== 'PLANNED') {
    return res.status(400).json({ error: 'Cannot edit stops once trip has started' });
  }

  const currentStop = db.prepare(`SELECT * FROM trip_stops WHERE id = ? AND trip_id = ?`).get(stopId, tripId) as TripStop | undefined;
  if (!currentStop) return res.status(404).json({ error: 'Stop not found on this trip' });

  db.prepare(`
    UPDATE trip_stops
    SET destination_name = COALESCE(?, destination_name),
        address = COALESCE(?, address),
        latitude = COALESCE(?, latitude),
        longitude = COALESCE(?, longitude),
        geofence_radius_meters = COALESCE(?, geofence_radius_meters),
        planned_arrival_time = COALESCE(?, planned_arrival_time),
        notes = COALESCE(?, notes)
    WHERE id = ? AND trip_id = ?
  `).run(
    destination_name || null,
    address || null,
    latitude ?? null,
    longitude ?? null,
    geofence_radius_meters ?? null,
    planned_arrival_time || null,
    notes || null,
    stopId,
    tripId
  );

  logAudit({
    tripId,
    action: 'STOP_EDITED',
    fieldChanged: 'destination_name',
    originalValue: currentStop.destination_name,
    newValue: destination_name || currentStop.destination_name,
    changedBy: userId,
    reason: 'Manager edited stop details'
  });

  googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));

  return res.json({ message: 'Stop updated successfully' });
});

/**
 * DELETE /api/trips/:id/stops/:stopId
 * Remove a destination stop before trip starts
 */
router.delete('/:id/stops/:stopId', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id: tripId, stopId } = req.params;
  const userId = req.user!.id;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(tripId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  if (trip.status !== 'ASSIGNED' && trip.status !== 'PLANNED') {
    return res.status(400).json({ error: 'Cannot remove stops once trip has started' });
  }

  const totalStopsRow = db.prepare(`SELECT COUNT(*) as count FROM trip_stops WHERE trip_id = ?`).get(tripId) as { count: number };
  if (totalStopsRow.count <= 1) {
    return res.status(400).json({ error: 'A trip must contain at least 1 destination stop' });
  }

  const currentStop = db.prepare(`SELECT * FROM trip_stops WHERE id = ? AND trip_id = ?`).get(stopId, tripId) as TripStop | undefined;
  if (!currentStop) return res.status(404).json({ error: 'Stop not found' });

  const deleteTx = db.transaction(() => {
    db.prepare(`DELETE FROM trip_stops WHERE id = ? AND trip_id = ?`).run(stopId, tripId);

    // Re-index remaining stop numbers
    const remainingStops = db.prepare(`SELECT id FROM trip_stops WHERE trip_id = ? ORDER BY stop_number ASC`).all(tripId) as Array<{ id: string }>;
    remainingStops.forEach((s, idx) => {
      db.prepare(`UPDATE trip_stops SET stop_number = ? WHERE id = ?`).run(idx + 1, s.id);
    });

    logAudit({
      tripId,
      action: 'STOP_REMOVED',
      originalValue: currentStop.destination_name,
      changedBy: userId
    });
  });

  try {
    deleteTx();
    googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));
    return res.json({ message: 'Stop removed successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to remove stop', details: err.message });
  }
});

/**
 * POST /api/trips/:id/cancel
 * Cancel trip
 */
router.post('/:id/cancel', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const tripId = req.params.id;
  const userId = req.user!.id;
  const { reason } = req.body;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(tripId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  db.prepare(`UPDATE trips SET status = 'CANCELLED', updated_at = CURRENT_TIMESTAMP WHERE id = ?`).run(tripId);
  db.prepare(`UPDATE vehicles SET status = 'AVAILABLE' WHERE id = ?`).run(trip.vehicle_id);
  db.prepare(`UPDATE drivers SET status = 'AVAILABLE' WHERE user_id = ?`).run(trip.driver_id);

  logAudit({
    tripId,
    action: 'TRIP_CANCELLED',
    changedBy: userId,
    reason: reason || 'Manager cancelled trip'
  });

  googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));

  return res.json({ message: 'Trip cancelled' });
});

export default router;
