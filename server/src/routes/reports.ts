import { Router, Response } from 'express';
import { db } from '../db';
import { requireAuth, requireRole } from '../middleware/auth';

const router = Router();

/**
 * GET /api/reports/daily
 * Daily logistics report metrics and breakdown
 */
router.get('/daily', requireAuth, requireRole('MANAGER'), (req, res) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  // Trip stats for date
  const trips = db.prepare(`
    SELECT t.*, u.name as driver_name, v.vehicle_number 
    FROM trips t
    JOIN users u ON t.driver_id = u.id
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.date = ?
  `).all(date) as any[];

  const totalTrips = trips.length;
  const completedTrips = trips.filter((t) => t.status === 'COMPLETED').length;
  const activeTrips = trips.filter((t) =>
    ['IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING'].includes(t.status)
  ).length;
  const delayedTrips = trips.filter((t) => (t.total_delay_minutes || 0) > 0).length;
  const cancelledTrips = trips.filter((t) => t.status === 'CANCELLED').length;

  const totalDelayMinutes = trips.reduce(
    (acc, t) => acc + (t.total_delay_minutes || 0),
    0
  );

  // Stops and On-time calculation
  const stops = db.prepare(`
    SELECT ts.* 
    FROM trip_stops ts
    JOIN trips t ON ts.trip_id = t.id
    WHERE t.date = ?
  `).all(date) as any[];

  const totalDestinations = stops.length;
  const completedStops = stops.filter((s) => s.status === 'COMPLETED');
  const onTimeStops = completedStops.filter((s) => s.arrival_status === 'ON_TIME' || s.arrival_status === 'EARLY').length;
  const onTimePercentage = completedStops.length > 0 ? Math.round((onTimeStops / completedStops.length) * 100) : 100;

  // Delay reason distribution
  const delayReasons = db.prepare(`
    SELECT d.reason, COUNT(*) as count, SUM(d.duration_minutes) as total_minutes
    FROM delays d
    JOIN trips t ON d.trip_id = t.id
    WHERE t.date = ?
    GROUP BY d.reason
    ORDER BY count DESC
  `).all(date);

  // Driver summary
  const driverSummary = db.prepare(`
    SELECT u.name as driver_name, COUNT(t.id) as trip_count, 
           SUM(CASE WHEN t.status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
           SUM(t.total_delay_minutes) as total_delay
    FROM trips t
    JOIN users u ON t.driver_id = u.id
    WHERE t.date = ?
    GROUP BY t.driver_id
  `).all(date);

  // Vehicle summary
  const vehicleSummary = db.prepare(`
    SELECT v.vehicle_number, v.model, COUNT(t.id) as trip_count,
           SUM(t.calculated_distance_km) as total_distance_km
    FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.date = ?
    GROUP BY t.vehicle_id
  `).all(date);

  return res.json({
    date,
    overview: {
      totalTrips,
      completedTrips,
      activeTrips,
      delayedTrips,
      cancelledTrips,
      totalDestinations,
      totalDelayMinutes,
      totalDelayFormatted: `${Math.floor(totalDelayMinutes / 60)}h ${totalDelayMinutes % 60}m`,
      onTimePercentage
    },
    trips,
    delayReasons,
    driverSummary,
    vehicleSummary
  });
});

/**
 * GET /api/reports/periodic (Weekly / Monthly)
 */
router.get('/periodic', requireAuth, requireRole('MANAGER'), (req, res) => {
  const period = (req.query.period as string) || 'weekly'; // weekly or monthly
  const days = period === 'monthly' ? 30 : 7;

  const trips = db.prepare(`
    SELECT t.*, u.name as driver_name, v.vehicle_number
    FROM trips t
    JOIN users u ON t.driver_id = u.id
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.date >= date('now', '-' || ? || ' days')
    ORDER BY t.date DESC
  `).all(days) as any[];

  const totalTrips = trips.length;
  const completedTrips = trips.filter((t) => t.status === 'COMPLETED').length;
  const delayedTrips = trips.filter((t) => (t.total_delay_minutes || 0) > 0).length;
  const totalDelayMinutes = trips.reduce((acc, t) => acc + (t.total_delay_minutes || 0), 0);
  const avgDelayMinutes = totalTrips > 0 ? Math.round(totalDelayMinutes / totalTrips) : 0;

  const totalDistance = trips.reduce((acc, t) => acc + (t.calculated_distance_km || 0), 0);

  const delayDistribution = db.prepare(`
    SELECT d.reason, COUNT(*) as count, SUM(d.duration_minutes) as minutes
    FROM delays d
    JOIN trips t ON d.trip_id = t.id
    WHERE t.date >= date('now', '-' || ? || ' days')
    GROUP BY d.reason
    ORDER BY count DESC
  `).all(days);

  return res.json({
    period,
    daysAnalyzed: days,
    metrics: {
      totalTrips,
      completedTrips,
      delayedTrips,
      totalDelayMinutes,
      avgDelayMinutes,
      totalDistanceKm: Math.round(totalDistance * 10) / 10
    },
    delayDistribution,
    recentTrips: trips.slice(0, 50)
  });
});

/**
 * GET /api/reports/export (CSV export)
 */
router.get('/export', requireAuth, requireRole('MANAGER'), (req, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];

  const trips = db.prepare(`
    SELECT t.id, t.date, u.name as driver_name, v.vehicle_number, t.starting_location,
           t.planned_departure_time, t.actual_start_time, t.base_arrival_time, t.completion_time,
           t.status, t.total_delay_minutes, t.calculated_distance_km,
           (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id) as total_stops,
           (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id AND status = 'COMPLETED') as completed_stops
    FROM trips t
    JOIN users u ON t.driver_id = u.id
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.date = ?
    ORDER BY t.planned_departure_time ASC
  `).all(date) as any[];

  // Build CSV headers and rows
  const headers = [
    'Trip ID',
    'Date',
    'Driver',
    'Vehicle',
    'Starting Location',
    'Total Destinations',
    'Completed Destinations',
    'Planned Departure',
    'Actual Start',
    'Base Arrival',
    'Completed Time',
    'Status',
    'Delay (Mins)',
    'Approx Distance (KM)'
  ];

  const rows = trips.map((t) => [
    t.id,
    t.date,
    `"${(t.driver_name || '').replace(/"/g, '""')}"`,
    t.vehicle_number,
    `"${(t.starting_location || '').replace(/"/g, '""')}"`,
    t.total_stops,
    t.completed_stops,
    t.planned_departure_time,
    t.actual_start_time || 'N/A',
    t.base_arrival_time || 'N/A',
    t.completion_time || 'N/A',
    t.status,
    t.total_delay_minutes || 0,
    t.calculated_distance_km || 'N/A'
  ]);

  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="logistics_report_${date}.csv"`);
  return res.send(csvContent);
});

export default router;
