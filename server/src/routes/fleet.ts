import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { requireAuth, requireRole, logAudit, AuthenticatedRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ==========================================
// VEHICLES
// ==========================================

router.get('/vehicles', requireAuth, (req, res) => {
  const vehicles = db.prepare(`
    SELECT v.*, u.name as assigned_driver_name,
           (SELECT COUNT(*) FROM trips WHERE vehicle_id = v.id) as total_trips,
           (SELECT id FROM trips WHERE vehicle_id = v.id AND status IN ('IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING') LIMIT 1) as active_trip_id
    FROM vehicles v
    LEFT JOIN users u ON v.assigned_driver_id = u.id
    ORDER BY v.created_at DESC
  `).all();
  return res.json({ vehicles });
});

router.post('/vehicles', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { vehicle_number, vehicle_type, model, assigned_driver_id, status = 'AVAILABLE', notes } = req.body;

  if (!vehicle_number || !vehicle_type || !model) {
    return res.status(400).json({ error: 'Vehicle number, type, and model are required' });
  }

  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO vehicles (id, vehicle_number, vehicle_type, model, assigned_driver_id, status, notes)
      VALUES (?, UPPER(?), ?, ?, ?, ?, ?)
    `).run(id, vehicle_number, vehicle_type, model, assigned_driver_id || null, status, notes || null);

    logAudit({
      action: 'VEHICLE_CREATED',
      newValue: `Vehicle ${vehicle_number} (${model}) added`,
      changedBy: req.user!.id
    });

    return res.status(201).json({ message: 'Vehicle created', id });
  } catch (err: any) {
    return res.status(400).json({ error: 'Failed to create vehicle: ' + err.message });
  }
});

router.put('/vehicles/:id', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { vehicle_number, vehicle_type, model, assigned_driver_id, status, notes } = req.body;

  try {
    db.prepare(`
      UPDATE vehicles
      SET vehicle_number = COALESCE(UPPER(?), vehicle_number),
          vehicle_type = COALESCE(?, vehicle_type),
          model = COALESCE(?, model),
          assigned_driver_id = ?,
          status = COALESCE(?, status),
          notes = COALESCE(?, notes)
      WHERE id = ?
    `).run(
      vehicle_number || null,
      vehicle_type || null,
      model || null,
      assigned_driver_id || null,
      status || null,
      notes || null,
      id
    );

    return res.json({ message: 'Vehicle updated' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/vehicles/:id/history', requireAuth, (req, res) => {
  const { id } = req.params;
  const trips = db.prepare(`
    SELECT t.*, u.name as driver_name,
           (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id) as total_stops
    FROM trips t
    JOIN users u ON t.driver_id = u.id
    WHERE t.vehicle_id = ?
    ORDER BY t.date DESC, t.planned_departure_time DESC
  `).all(id);

  return res.json({ trips });
});

// ==========================================
// DRIVERS
// ==========================================

router.get('/drivers', requireAuth, (req, res) => {
  const drivers = db.prepare(`
    SELECT d.*, u.name, u.email, u.phone, v.vehicle_number as assigned_vehicle_number,
           (SELECT COUNT(*) FROM trips WHERE driver_id = u.id) as total_trips,
           (SELECT id FROM trips WHERE driver_id = u.id AND status IN ('IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING') LIMIT 1) as active_trip_id
    FROM drivers d
    JOIN users u ON d.user_id = u.id
    LEFT JOIN vehicles v ON d.assigned_vehicle_id = v.id
    ORDER BY u.name ASC
  `).all();
  return res.json({ drivers });
});

router.post('/drivers', requireAuth, requireRole('MANAGER'), async (req: AuthenticatedRequest, res: Response) => {
  const { name, email, password, phone, employee_id, assigned_vehicle_id, status = 'AVAILABLE' } = req.body;

  if (!name || !email || !password || !employee_id) {
    return res.status(400).json({ error: 'Name, email, password, and employee ID are required' });
  }

  const userId = uuidv4();
  const driverId = uuidv4();
  const hash = await bcrypt.hash(password, 10);

  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO users (id, name, email, password_hash, role, phone)
      VALUES (?, ?, LOWER(?), ?, 'DRIVER', ?)
    `).run(userId, name, email, hash, phone || null);

    db.prepare(`
      INSERT INTO drivers (id, user_id, employee_id, assigned_vehicle_id, status)
      VALUES (?, ?, UPPER(?), ?, ?)
    `).run(driverId, userId, employee_id, assigned_vehicle_id || null, status);

    logAudit({
      action: 'DRIVER_CREATED',
      newValue: `Driver ${name} (${employee_id}) created`,
      changedBy: req.user!.id
    });
  });

  try {
    tx();
    return res.status(201).json({ message: 'Driver created successfully', driverId, userId });
  } catch (err: any) {
    return res.status(400).json({ error: 'Failed to create driver: ' + err.message });
  }
});

router.put('/drivers/:id', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, phone, assigned_vehicle_id, status, employee_id } = req.body;

  const driver = db.prepare(`SELECT * FROM drivers WHERE id = ?`).get(id) as any;
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const tx = db.transaction(() => {
    db.prepare(`
      UPDATE users
      SET name = COALESCE(?, name),
          phone = COALESCE(?, phone)
      WHERE id = ?
    `).run(name || null, phone || null, driver.user_id);

    db.prepare(`
      UPDATE drivers
      SET assigned_vehicle_id = ?,
          status = COALESCE(?, status),
          employee_id = COALESCE(UPPER(?), employee_id)
      WHERE id = ?
    `).run(assigned_vehicle_id || null, status || null, employee_id || null, id);
  });

  try {
    tx();
    return res.json({ message: 'Driver updated' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.get('/drivers/:id/history', requireAuth, (req, res) => {
  const { id } = req.params;
  const driver = db.prepare(`SELECT user_id FROM drivers WHERE id = ?`).get(id) as any;
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const trips = db.prepare(`
    SELECT t.*, v.vehicle_number,
           (SELECT COUNT(*) FROM trip_stops WHERE trip_id = t.id) as total_stops
    FROM trips t
    JOIN vehicles v ON t.vehicle_id = v.id
    WHERE t.driver_id = ?
    ORDER BY t.date DESC, t.planned_departure_time DESC
  `).all(driver.user_id);

  return res.json({ trips });
});

// ==========================================
// DESTINATIONS
// ==========================================

router.get('/destinations', requireAuth, (req, res) => {
  const destinations = db.prepare(`
    SELECT * FROM destinations WHERE is_active = 1 ORDER BY name ASC
  `).all();
  return res.json({ destinations });
});

router.post('/destinations', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { name, address, latitude, longitude, contact_name, contact_number, geofence_radius_meters = 150, notes } = req.body;

  if (!name || !address || latitude === undefined || longitude === undefined) {
    return res.status(400).json({ error: 'Name, address, latitude, and longitude are required' });
  }

  const id = uuidv4();
  try {
    db.prepare(`
      INSERT INTO destinations (id, name, address, latitude, longitude, contact_name, contact_number, geofence_radius_meters, notes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, name, address, latitude, longitude, contact_name || null, contact_number || null, geofence_radius_meters, notes || null);

    return res.status(201).json({ message: 'Destination created', id });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

router.put('/destinations/:id', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, address, latitude, longitude, contact_name, contact_number, geofence_radius_meters, notes, is_active } = req.body;

  try {
    db.prepare(`
      UPDATE destinations
      SET name = COALESCE(?, name),
          address = COALESCE(?, address),
          latitude = COALESCE(?, latitude),
          longitude = COALESCE(?, longitude),
          contact_name = COALESCE(?, contact_name),
          contact_number = COALESCE(?, contact_number),
          geofence_radius_meters = COALESCE(?, geofence_radius_meters),
          notes = COALESCE(?, notes),
          is_active = COALESCE(?, is_active)
      WHERE id = ?
    `).run(
      name || null,
      address || null,
      latitude ?? null,
      longitude ?? null,
      contact_name || null,
      contact_number || null,
      geofence_radius_meters || null,
      notes || null,
      is_active !== undefined ? is_active : null,
      id
    );

    return res.json({ message: 'Destination updated' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
