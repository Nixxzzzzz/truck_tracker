import { Router, Response } from 'express';
import { db } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { isWithinGeofence, calculateCumulativeDistanceKm } from '../services/geo';
import { googleSheetsService } from '../services/googleSheets';
import { v4 as uuidv4 } from 'uuid';
import { Trip, TripStop } from '../types';

const router = Router();

// Helper to record a GPS Event
function recordEvent(params: {
  tripId: string;
  stopId?: string;
  eventType: string;
  driverId: string;
  vehicleId: string;
  latitude?: number;
  longitude?: number;
  gpsAccuracy?: number;
  details?: string;
  timestamp?: string;
}) {
  const eventId = uuidv4();
  const timestamp = params.timestamp || new Date().toISOString();

  db.prepare(`
    INSERT INTO trip_events (
      id, trip_id, stop_id, event_type, timestamp, 
      driver_id, vehicle_id, latitude, longitude, gps_accuracy, details
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    eventId,
    params.tripId,
    params.stopId || null,
    params.eventType,
    timestamp,
    params.driverId,
    params.vehicleId,
    params.latitude ?? null,
    params.longitude ?? null,
    params.gpsAccuracy ?? null,
    params.details || null
  );

  googleSheetsService.syncEvent(eventId).catch((e) => console.error('[Sync]', e.message));
  return eventId;
}

/**
 * GET /api/driver/trips/today
 * Returns trips assigned to the logged-in driver for today or currently active
 */
router.get('/trips/today', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const driverId = req.user!.id;
  const today = new Date().toISOString().split('T')[0];

  const trips = db.prepare(`
    SELECT t.*, v.vehicle_number, v.vehicle_type, v.model as vehicle_model
    FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.driver_id = ? AND (t.date = ? OR t.status IN ('ASSIGNED', 'IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING'))
    ORDER BY CASE 
      WHEN t.status IN ('IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING') THEN 1
      WHEN t.status = 'ASSIGNED' THEN 2
      ELSE 3
    END, t.planned_departure_time ASC
  `).all(driverId, today) as any[];

  // Attach stops summary to each trip
  for (const trip of trips) {
    trip.stops = db.prepare(`
      SELECT id, stop_number, destination_name, address, planned_arrival_time, actual_arrival_time, actual_departure_time, status
      FROM trip_stops
      WHERE trip_id = ?
      ORDER BY stop_number ASC
    `).all(trip.id);
  }

  return res.json({ trips });
});

/**
 * GET /api/driver/trips/:id
 * Returns complete operational trip details for driver
 */
router.get('/trips/:id', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const tripId = req.params.id;
  const driverId = req.user!.id;

  const trip = db.prepare(`
    SELECT t.*, v.vehicle_number, v.vehicle_type, v.model as vehicle_model
    FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.id = ? AND t.driver_id = ?
  `).get(tripId, driverId) as any;

  if (!trip) {
    return res.status(404).json({ error: 'Trip not found or not assigned to you' });
  }

  trip.stops = db.prepare(`
    SELECT * FROM trip_stops WHERE trip_id = ? ORDER BY stop_number ASC
  `).all(tripId);

  // Attach activities and photos to each stop
  for (const stop of trip.stops) {
    stop.activities = db.prepare(`SELECT * FROM activities WHERE stop_id = ?`).all(stop.id);
    stop.photos = db.prepare(`SELECT * FROM photos WHERE stop_id = ?`).all(stop.id);
  }

  trip.delays = db.prepare(`SELECT * FROM delays WHERE trip_id = ? ORDER BY start_time DESC`).all(tripId);
  trip.events = db.prepare(`SELECT * FROM trip_events WHERE trip_id = ? ORDER BY timestamp ASC`).all(tripId);
  trip.photos = db.prepare(`SELECT * FROM photos WHERE trip_id = ? ORDER BY timestamp DESC`).all(tripId);

  return res.json({ trip });
});

/**
 * POST /api/driver/trips/:id/start
 * Driver starts the trip
 */
router.post('/trips/:id/start', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const tripId = req.params.id;
  const driverId = req.user!.id;
  const { latitude, longitude, gps_accuracy } = req.body;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND driver_id = ?`).get(tripId, driverId) as Trip | undefined;
  if (!trip) {
    return res.status(404).json({ error: 'Trip not found' });
  }

  if (trip.status !== 'ASSIGNED' && trip.status !== 'PLANNED') {
    return res.status(400).json({ error: `Cannot start trip in status '${trip.status}'` });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE trips 
    SET status = 'IN_PROGRESS', actual_start_time = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, tripId);

  db.prepare(`UPDATE vehicles SET status = 'ON_TRIP' WHERE id = ?`).run(trip.vehicle_id);
  db.prepare(`UPDATE drivers SET status = 'ON_TRIP' WHERE user_id = ?`).run(driverId);

  recordEvent({
    tripId,
    eventType: 'TRIP_STARTED',
    driverId,
    vehicleId: trip.vehicle_id,
    latitude,
    longitude,
    gpsAccuracy: gps_accuracy,
    details: `Trip started at ${trip.starting_location}`,
    timestamp: now
  });

  googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));

  return res.json({ message: 'Trip started successfully', actual_start_time: now, status: 'IN_PROGRESS' });
});

/**
 * POST /api/driver/trips/:id/stops/:stopId/arrive
 * Driver reaches a destination stop
 */
router.post('/trips/:id/stops/:stopId/arrive', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id: tripId, stopId } = req.params;
  const driverId = req.user!.id;
  const { latitude, longitude, gps_accuracy } = req.body;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND driver_id = ?`).get(tripId, driverId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  if (trip.status !== 'IN_PROGRESS' && trip.status !== 'DELAYED') {
    return res.status(400).json({ error: 'Trip must be in progress to record stop arrival' });
  }

  const stop = db.prepare(`SELECT * FROM trip_stops WHERE id = ? AND trip_id = ?`).get(stopId, tripId) as TripStop | undefined;
  if (!stop) return res.status(404).json({ error: 'Stop not found' });

  if (stop.status !== 'PENDING') {
    return res.status(400).json({ error: `Stop is already in status '${stop.status}'` });
  }

  // Verify previous stops are completed
  const uncompletedPrior = db.prepare(`
    SELECT COUNT(*) as count FROM trip_stops 
    WHERE trip_id = ? AND stop_number < ? AND status NOT IN ('COMPLETED', 'SKIPPED')
  `).get(tripId, stop.stop_number) as { count: number };

  if (uncompletedPrior.count > 0) {
    return res.status(400).json({ error: 'Prior destination stops must be completed before arriving at this stop' });
  }

  const now = new Date();
  const nowIso = now.toISOString();

  // Geofence check
  const geofenceResult = isWithinGeofence(
    latitude,
    longitude,
    stop.latitude,
    stop.longitude,
    stop.geofence_radius_meters || 150
  );

  // Time diff calculation
  let arrivalStatus: 'ON_TIME' | 'EARLY' | 'LATE' | 'UNKNOWN' = 'ON_TIME';
  let diffMinutes = 0;

  try {
    const todayStr = trip.date;
    const plannedDate = new Date(`${todayStr}T${stop.planned_arrival_time}:00`);
    if (!isNaN(plannedDate.getTime())) {
      diffMinutes = Math.round((now.getTime() - plannedDate.getTime()) / 60000);
      if (diffMinutes > 10) arrivalStatus = 'LATE';
      else if (diffMinutes < -10) arrivalStatus = 'EARLY';
      else arrivalStatus = 'ON_TIME';
    }
  } catch (e) {
    arrivalStatus = 'UNKNOWN';
  }

  db.prepare(`
    UPDATE trip_stops
    SET status = 'ARRIVED',
        actual_arrival_time = ?,
        arrival_latitude = ?,
        arrival_longitude = ?,
        arrival_status = ?,
        arrival_diff_minutes = ?
    WHERE id = ?
  `).run(nowIso, latitude ?? null, longitude ?? null, arrivalStatus, diffMinutes, stopId);

  db.prepare(`UPDATE trips SET status = 'AT_DESTINATION', updated_at = ? WHERE id = ?`).run(nowIso, tripId);

  recordEvent({
    tripId,
    stopId,
    eventType: 'ARRIVED_DESTINATION',
    driverId,
    vehicleId: trip.vehicle_id,
    latitude,
    longitude,
    gpsAccuracy: gps_accuracy,
    details: `Arrived at Stop ${stop.stop_number}: ${stop.destination_name} (${geofenceResult.message}, ${diffMinutes > 0 ? `+${diffMinutes}m late` : diffMinutes < 0 ? `${diffMinutes}m early` : 'on time'})`,
    timestamp: nowIso
  });

  googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));

  return res.json({
    message: 'Arrival recorded successfully',
    actual_arrival_time: nowIso,
    arrival_status: arrivalStatus,
    arrival_diff_minutes: diffMinutes,
    geofence: geofenceResult
  });
});

/**
 * POST /api/driver/trips/:id/stops/:stopId/complete-activity
 * Driver completes delivery/pickup/loading activity at stop
 */
router.post('/api/driver/trips/:id/stops/:stopId/complete-activity', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  // mapped under /stops/:stopId/complete-activity
});

router.post('/trips/:id/stops/:stopId/complete-activity', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id: tripId, stopId } = req.params;
  const driverId = req.user!.id;
  const { activity_type, status, quantity, reference_number, recipient_name, notes, require_photo } = req.body;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND driver_id = ?`).get(tripId, driverId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const stop = db.prepare(`SELECT * FROM trip_stops WHERE id = ? AND trip_id = ?`).get(stopId, tripId) as TripStop | undefined;
  if (!stop) return res.status(404).json({ error: 'Stop not found' });

  if (stop.status !== 'ARRIVED' && stop.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'You must arrive at the destination before completing activities' });
  }

  // Photo requirement validation
  if (require_photo) {
    const photoCount = db.prepare(`SELECT COUNT(*) as count FROM photos WHERE stop_id = ?`).get(stopId) as { count: number };
    if (photoCount.count === 0) {
      return res.status(400).json({
        error: 'Required photo proof is missing. Please capture at least one photo before completing this activity.'
      });
    }
  }

  const now = new Date().toISOString();
  const activityId = uuidv4();

  db.prepare(`
    INSERT INTO activities (
      id, trip_id, stop_id, activity_type, status, start_time, completion_time, 
      quantity, reference_number, recipient_name, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    activityId,
    tripId,
    stopId,
    activity_type || 'Delivery',
    status || 'COMPLETED',
    stop.actual_arrival_time || now,
    now,
    quantity ? parseInt(quantity, 10) : null,
    reference_number || null,
    recipient_name || null,
    notes || null
  );

  db.prepare(`UPDATE trip_stops SET status = 'IN_PROGRESS' WHERE id = ?`).run(stopId);

  recordEvent({
    tripId,
    stopId,
    eventType: 'ACTIVITY_COMPLETED',
    driverId,
    vehicleId: trip.vehicle_id,
    details: `Activity ${activity_type || 'Delivery'} (${status || 'COMPLETED'}) finished for Stop ${stop.stop_number}`,
    timestamp: now
  });

  return res.json({ message: 'Activity completed successfully', activityId });
});

/**
 * POST /api/driver/trips/:id/stops/:stopId/depart
 * Driver departs from destination stop
 */
router.post('/trips/:id/stops/:stopId/depart', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id: tripId, stopId } = req.params;
  const driverId = req.user!.id;
  const { latitude, longitude, gps_accuracy } = req.body;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND driver_id = ?`).get(tripId, driverId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found' });

  const stop = db.prepare(`SELECT * FROM trip_stops WHERE id = ? AND trip_id = ?`).get(stopId, tripId) as TripStop | undefined;
  if (!stop) return res.status(404).json({ error: 'Stop not found' });

  if (stop.status !== 'ARRIVED' && stop.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'Cannot depart a stop that has not been arrived at' });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE trip_stops
    SET status = 'COMPLETED',
        actual_departure_time = ?,
        departure_latitude = ?,
        departure_longitude = ?
    WHERE id = ?
  `).run(now, latitude ?? null, longitude ?? null, stopId);

  // Check remaining stops
  const remaining = db.prepare(`
    SELECT COUNT(*) as count FROM trip_stops WHERE trip_id = ? AND status = 'PENDING'
  `).get(tripId) as { count: number };

  db.prepare(`UPDATE trips SET status = 'IN_PROGRESS', updated_at = ? WHERE id = ?`).run(now, tripId);

  recordEvent({
    tripId,
    stopId,
    eventType: 'DEPARTED_DESTINATION',
    driverId,
    vehicleId: trip.vehicle_id,
    latitude,
    longitude,
    gpsAccuracy: gps_accuracy,
    details: `Departed Stop ${stop.stop_number}: ${stop.destination_name}`,
    timestamp: now
  });

  googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));

  return res.json({
    message: 'Departure recorded',
    allStopsCompleted: remaining.count === 0,
    remainingStops: remaining.count
  });
});

/**
 * POST /api/driver/trips/:id/delay
 * Driver reports a delay
 */
router.post('/trips/:id/delay', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const tripId = req.params.id;
  const driverId = req.user!.id;
  const { reason, description, stopId, latitude, longitude, gps_accuracy, photoId } = req.body;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND driver_id = ?`).get(tripId, driverId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found or not assigned to you' });

  if (trip.status === 'PLANNED' || trip.status === 'ASSIGNED') {
    return res.status(400).json({ error: 'Cannot report delay on a trip that has not started yet' });
  }

  if (trip.status === 'COMPLETED' || trip.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Cannot report delay on a completed or cancelled trip' });
  }

  const delayId = uuidv4();
  const now = new Date().toISOString();

  // Validate GPS coordinates: never fabricate
  const hasGps = typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude);
  const isPoorAccuracy = hasGps && typeof gps_accuracy === 'number' && gps_accuracy > 300;

  db.prepare(`
    INSERT INTO delays (
      id, trip_id, stop_id, driver_id, vehicle_id, reason, description, 
      start_time, latitude, longitude, gps_accuracy, photo_id, is_resolved
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
  `).run(
    delayId,
    tripId,
    stopId || null,
    driverId,
    trip.vehicle_id,
    reason || 'Traffic',
    description || null,
    now,
    hasGps ? latitude : null,
    hasGps ? longitude : null,
    hasGps ? gps_accuracy ?? null : null,
    photoId || null
  );

  db.prepare(`UPDATE trips SET status = 'DELAYED', updated_at = ? WHERE id = ?`).run(now, tripId);

  const gpsNotice = hasGps
    ? (isPoorAccuracy ? ` (Poor GPS accuracy: ±${Math.round(gps_accuracy!)}m)` : '')
    : ' (GPS UNAVAILABLE)';

  recordEvent({
    tripId,
    stopId,
    eventType: 'DELAY_REPORTED',
    driverId,
    vehicleId: trip.vehicle_id,
    latitude: hasGps ? latitude : undefined,
    longitude: hasGps ? longitude : undefined,
    gpsAccuracy: hasGps ? gps_accuracy : undefined,
    details: `Delay reported: ${reason}${description ? ` — ${description}` : ''}${gpsNotice}`,
    timestamp: now
  });

  googleSheetsService.syncDelay(delayId).catch((e) => console.error('[Sync]', e.message));

  return res.json({ message: 'Delay reported', delayId, start_time: now });
});

/**
 * POST /api/driver/trips/:id/delay/:delayId/resolve
 * Driver marks active delay resolved
 */
router.post('/trips/:id/delay/:delayId/resolve', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const { id: tripId, delayId } = req.params;
  const driverId = req.user!.id;

  // Strict check: trip must exist and belong to the authenticated driver
  const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND driver_id = ?`).get(tripId, driverId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found or not assigned to you' });

  const delay = db.prepare(`SELECT * FROM delays WHERE id = ? AND trip_id = ?`).get(delayId, tripId) as any;
  if (!delay) return res.status(404).json({ error: 'Delay record not found' });

  if (delay.is_resolved) {
    return res.status(400).json({ error: 'Delay is already resolved' });
  }

  const now = new Date();
  const nowIso = now.toISOString();
  const startDate = new Date(delay.start_time);
  const durationMinutes = Math.max(1, Math.round((now.getTime() - startDate.getTime()) / 60000));

  db.prepare(`
    UPDATE delays
    SET end_time = ?, duration_minutes = ?, is_resolved = 1
    WHERE id = ?
  `).run(nowIso, durationMinutes, delayId);

  // Recalculate total trip delay
  const sumDelay = db.prepare(`
    SELECT SUM(duration_minutes) as total FROM delays WHERE trip_id = ?
  `).get(tripId) as { total: number | null };

  const totalDelay = sumDelay.total || 0;

  // Restore trip status: check if returning, at a stop, or in progress
  let newStatus: string = 'IN_PROGRESS';
  if (trip.return_start_time) {
    newStatus = 'RETURNING';
  } else {
    const atStop = db.prepare(`
      SELECT COUNT(*) as count FROM trip_stops WHERE trip_id = ? AND status IN ('ARRIVED', 'IN_PROGRESS')
    `).get(tripId) as { count: number };
    newStatus = atStop.count > 0 ? 'AT_DESTINATION' : 'IN_PROGRESS';
  }

  db.prepare(`
    UPDATE trips
    SET total_delay_minutes = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(totalDelay, newStatus, nowIso, tripId);

  recordEvent({
    tripId,
    stopId: delay.stop_id,
    eventType: 'DELAY_RESOLVED',
    driverId,
    vehicleId: trip.vehicle_id,
    details: `Delay resolved: ${delay.reason} (Duration: ${durationMinutes} mins)`,
    timestamp: nowIso
  });

  googleSheetsService.syncDelay(delayId).catch((e) => console.error('[Sync]', e.message));

  return res.json({
    message: 'Delay resolved',
    duration_minutes: durationMinutes,
    total_delay_minutes: totalDelay,
    status: newStatus
  });
});

/**
 * POST /api/driver/trips/:id/start-return
 * Driver finishes all stops and starts journey back to base
 */
router.post('/trips/:id/start-return', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const tripId = req.params.id;
  const driverId = req.user!.id;
  const { latitude, longitude, gps_accuracy } = req.body;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND driver_id = ?`).get(tripId, driverId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found or not assigned to you' });

  if (trip.status === 'RETURNING') {
    return res.status(400).json({ error: 'Return journey is already in progress' });
  }

  if (trip.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Trip is already completed' });
  }

  if (trip.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Cannot start return on a cancelled trip' });
  }

  if (trip.status === 'ASSIGNED' || trip.status === 'PLANNED') {
    return res.status(400).json({ error: 'Cannot start return journey before starting the trip' });
  }

  // Ensure all required destinations are completed or skipped/failed
  const incompleteStops = db.prepare(`
    SELECT COUNT(*) as count FROM trip_stops 
    WHERE trip_id = ? AND status NOT IN ('COMPLETED', 'SKIPPED', 'FAILED')
  `).get(tripId) as { count: number };

  if (incompleteStops.count > 0) {
    return res.status(400).json({ 
      error: `Cannot start return journey: ${incompleteStops.count} destination stop(s) remain incomplete or un-departed` 
    });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE trips
    SET status = 'RETURNING', return_start_time = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, tripId);

  const hasGps = typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude);

  recordEvent({
    tripId,
    eventType: 'RETURN_STARTED',
    driverId,
    vehicleId: trip.vehicle_id,
    latitude: hasGps ? latitude : undefined,
    longitude: hasGps ? longitude : undefined,
    gpsAccuracy: hasGps ? gps_accuracy : undefined,
    details: `Return journey to base initiated${hasGps ? '' : ' (GPS UNAVAILABLE)'}`,
    timestamp: now
  });

  googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));

  return res.json({ message: 'Return journey started', status: 'RETURNING' });
});

/**
 * POST /api/driver/trips/:id/arrive-base
 * Driver arrives at company base
 */
router.post('/trips/:id/arrive-base', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const tripId = req.params.id;
  const driverId = req.user!.id;
  const { latitude, longitude, gps_accuracy } = req.body;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND driver_id = ?`).get(tripId, driverId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found or not assigned to you' });

  if (trip.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Trip is already completed' });
  }

  if (trip.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Cannot record base arrival on a cancelled trip' });
  }

  if (trip.base_arrival_time) {
    return res.status(400).json({ error: 'Base arrival has already been recorded' });
  }

  if (trip.status !== 'RETURNING' && trip.status !== 'IN_PROGRESS') {
    return res.status(400).json({ error: 'Trip must be in returning status before base arrival can be recorded' });
  }

  const now = new Date().toISOString();

  db.prepare(`
    UPDATE trips
    SET base_arrival_time = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, tripId);

  const hasGps = typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude);

  recordEvent({
    tripId,
    eventType: 'ARRIVED_BASE',
    driverId,
    vehicleId: trip.vehicle_id,
    latitude: hasGps ? latitude : undefined,
    longitude: hasGps ? longitude : undefined,
    gpsAccuracy: hasGps ? gps_accuracy : undefined,
    details: `Vehicle arrived back at base (${trip.starting_location})${hasGps ? '' : ' (GPS UNAVAILABLE)'}`,
    timestamp: now
  });

  googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));

  return res.json({ message: 'Base arrival recorded', base_arrival_time: now });
});

/**
 * POST /api/driver/trips/:id/complete
 * Driver completes the trip
 */
router.post('/trips/:id/complete', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  const tripId = req.params.id;
  const driverId = req.user!.id;
  const { latitude, longitude, gps_accuracy } = req.body;

  const trip = db.prepare(`SELECT * FROM trips WHERE id = ? AND driver_id = ?`).get(tripId, driverId) as Trip | undefined;
  if (!trip) return res.status(404).json({ error: 'Trip not found or not assigned to you' });

  if (trip.status === 'COMPLETED') {
    return res.status(400).json({ error: 'Trip is already completed' });
  }

  if (trip.status === 'CANCELLED') {
    return res.status(400).json({ error: 'Cannot complete a cancelled trip' });
  }

  if (trip.status === 'ASSIGNED' || trip.status === 'PLANNED') {
    return res.status(400).json({ error: 'Cannot complete a trip that has not been started' });
  }

  // Enforce base arrival
  if (!trip.base_arrival_time) {
    return res.status(400).json({ error: 'You must arrive at company base before completing the trip' });
  }

  const now = new Date().toISOString();

  // Compute total distance from chronological GPS events
  const events = db.prepare(`
    SELECT latitude, longitude FROM trip_events WHERE trip_id = ? ORDER BY timestamp ASC
  `).all(tripId) as Array<{ latitude?: number; longitude?: number }>;

  const calculatedDistance = calculateCumulativeDistanceKm(events);

  db.prepare(`
    UPDATE trips
    SET status = 'COMPLETED',
        completion_time = ?,
        calculated_distance_km = ?,
        updated_at = ?
    WHERE id = ?
  `).run(now, calculatedDistance, now, tripId);

  // Set vehicle and driver status back to AVAILABLE
  db.prepare(`UPDATE vehicles SET status = 'AVAILABLE' WHERE id = ?`).run(trip.vehicle_id);
  db.prepare(`UPDATE drivers SET status = 'AVAILABLE' WHERE user_id = ?`).run(driverId);

  const hasGps = typeof latitude === 'number' && typeof longitude === 'number' && !isNaN(latitude) && !isNaN(longitude);

  recordEvent({
    tripId,
    eventType: 'TRIP_COMPLETED',
    driverId,
    vehicleId: trip.vehicle_id,
    latitude: hasGps ? latitude : undefined,
    longitude: hasGps ? longitude : undefined,
    gpsAccuracy: hasGps ? gps_accuracy : undefined,
    details: `Trip marked completed. Distance: ${calculatedDistance ? `${calculatedDistance} km` : 'approximate/unavailable'}`,
    timestamp: now
  });

  googleSheetsService.syncTrip(tripId).catch((e) => console.error('[Sync]', e.message));

  return res.json({
    message: 'Trip completed successfully',
    completion_time: now,
    calculated_distance_km: calculatedDistance,
    status: 'COMPLETED'
  });
});

export default router;
