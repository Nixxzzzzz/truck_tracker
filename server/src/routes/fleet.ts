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
    LEFT JOIN users u ON t.driver_id = u.id
    WHERE t.vehicle_id = ?
    ORDER BY t.date DESC, t.planned_departure_time DESC
  `).all(id);

  return res.json({ trips });
});

router.delete('/vehicles/:id', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const vehicle = db.prepare(`SELECT * FROM vehicles WHERE id = ?`).get(id) as any;
  if (!vehicle) return res.status(404).json({ error: 'Vehicle not found' });

  const activeTrip = db.prepare(`
    SELECT COUNT(*) as count FROM trips
    WHERE vehicle_id = ? AND status IN ('ASSIGNED', 'IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING')
  `).get(id) as { count: number };

  if (activeTrip.count > 0) {
    return res.status(409).json({
      error: `Cannot delete vehicle: it is currently assigned to ${activeTrip.count} active or scheduled trip(s). Complete or reassign those trips first.`
    });
  }

  const tripCount = db.prepare(`SELECT COUNT(*) as count FROM trips WHERE vehicle_id = ?`).get(id) as { count: number };

  if (tripCount.count > 0) {
    db.prepare(`UPDATE vehicles SET status = 'INACTIVE', assigned_driver_id = NULL WHERE id = ?`).run(id);
  } else {
    db.prepare(`DELETE FROM vehicles WHERE id = ?`).run(id);
  }

  logAudit({
    action: 'VEHICLE_DECOMMISSIONED',
    originalValue: vehicle.vehicle_number,
    changedBy: req.user!.id,
    reason: `Vehicle ${vehicle.vehicle_number} decommissioned by manager`
  });

  return res.json({ message: `Vehicle ${vehicle.vehicle_number} has been decommissioned.` });
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

router.delete('/drivers/:id', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const driver = db.prepare(`SELECT d.*, u.name FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.id = ?`).get(id) as any;
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  const activeTrip = db.prepare(`
    SELECT COUNT(*) as count FROM trips
    WHERE driver_id = ? AND status IN ('ASSIGNED', 'IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING')
  `).get(driver.user_id) as { count: number };

  if (activeTrip.count > 0) {
    return res.status(409).json({
      error: `Cannot delete driver: ${driver.name} is currently assigned to ${activeTrip.count} active or scheduled trip(s). Reassign or complete those trips first.`
    });
  }

  const tx = db.transaction(() => {
    db.prepare(`UPDATE vehicles SET assigned_driver_id = NULL WHERE assigned_driver_id = ?`).run(driver.user_id);
    db.prepare(`UPDATE drivers SET status = 'INACTIVE', assigned_vehicle_id = NULL WHERE id = ?`).run(id);
    db.prepare(`UPDATE users SET is_active = 0 WHERE id = ?`).run(driver.user_id);
  });

  try {
    tx();
    logAudit({
      action: 'DRIVER_DECOMMISSIONED',
      originalValue: driver.name,
      changedBy: req.user!.id,
      reason: `Driver ${driver.name} (${driver.employee_id}) removed by manager`
    });
    return res.json({ message: `Driver ${driver.name} has been removed from active roster.` });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
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
router.delete('/destinations/:id', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  const destination = db.prepare(`SELECT * FROM destinations WHERE id = ?`).get(id) as any;
  if (!destination) {
    return res.status(404).json({ error: 'Destination not found' });
  }

  // Check if any active/in-progress trips currently reference this destination
  const activeUsage = db.prepare(`
    SELECT COUNT(*) as count FROM trip_stops ts
    JOIN trips t ON ts.trip_id = t.id
    WHERE ts.destination_id = ? AND t.status IN ('ASSIGNED', 'IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING')
  `).get(id) as { count: number };

  if (activeUsage.count > 0) {
    return res.status(409).json({
      error: `Cannot deactivate destination: it is referenced by ${activeUsage.count} active or in-progress trip(s). Complete or cancel those trips first.`
    });
  }

  // Soft-delete: preserve historical trip/stop references
  db.prepare(`UPDATE destinations SET is_active = 0 WHERE id = ?`).run(id);

  logAudit({
    action: 'DESTINATION_DEACTIVATED',
    originalValue: destination.name,
    changedBy: req.user!.id,
    reason: `Destination '${destination.name}' soft-deleted by manager`
  });

  return res.json({ message: `Destination '${destination.name}' has been deactivated. Historical trip records are preserved.` });
});

// ==========================================
// VEHICLE COMPLIANCE DOCUMENTS
// ==========================================

router.get('/vehicles/:id/documents', requireAuth, (req, res) => {
  const { id } = req.params;
  const documents = db.prepare(`
    SELECT * FROM vehicle_documents
    WHERE vehicle_id = ?
    ORDER BY expiry_date ASC
  `).all(id);

  return res.json({ documents });
});

router.post('/vehicles/:id/documents', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { document_type, title, document_number, issue_date, expiry_date, issuing_authority, notes } = req.body;

  if (!document_type || !title || !document_number || !expiry_date) {
    return res.status(400).json({ error: 'Document type, title, number, and expiry date are required' });
  }

  const docId = uuidv4();
  const now = new Date();
  const exp = new Date(expiry_date);
  const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 3600 * 24));
  const status = diffDays < 0 ? 'EXPIRED' : diffDays <= 30 ? 'EXPIRING_SOON' : 'VALID';

  try {
    db.prepare(`
      INSERT INTO vehicle_documents (
        id, vehicle_id, document_type, title, document_number, issue_date, expiry_date, issuing_authority, status, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      id,
      document_type,
      title,
      document_number,
      issue_date || null,
      expiry_date,
      issuing_authority || null,
      status,
      notes || null
    );

    logAudit({
      action: 'VEHICLE_DOCUMENT_RECORDED',
      newValue: `${title} (${document_number}) added for vehicle ${id}`,
      changedBy: req.user!.id
    });

    return res.status(201).json({ message: 'Vehicle document recorded', id: docId });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// VEHICLE MAINTENANCE RECORDS
// ==========================================

router.get('/vehicles/:id/maintenance', requireAuth, (req, res) => {
  const { id } = req.params;
  const maintenanceRecords = db.prepare(`
    SELECT * FROM maintenance_records
    WHERE vehicle_id = ?
    ORDER BY service_date DESC
  `).all(id);

  return res.json({ maintenanceRecords });
});

router.post('/vehicles/:id/maintenance', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    service_date,
    odometer_km,
    maintenance_type = 'PREVENTIVE',
    description,
    service_center,
    cost_amount,
    currency = 'INR',
    invoice_reference,
    status = 'COMPLETED',
    performed_by,
    next_service_due_km,
    next_service_due_date
  } = req.body;

  if (!service_date || odometer_km === undefined || !description || !service_center || cost_amount === undefined) {
    return res.status(400).json({ error: 'Service date, odometer, description, service center, and cost amount are required' });
  }

  const recordId = uuidv4();
  try {
    db.prepare(`
      INSERT INTO maintenance_records (
        id, vehicle_id, service_date, odometer_km, maintenance_type, description, service_center,
        cost_amount, currency, invoice_reference, status, performed_by, next_service_due_km, next_service_due_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      recordId,
      id,
      service_date,
      odometer_km,
      maintenance_type,
      description,
      service_center,
      cost_amount,
      currency,
      invoice_reference || null,
      status,
      performed_by || null,
      next_service_due_km ?? null,
      next_service_due_date || null
    );

    logAudit({
      action: 'VEHICLE_MAINTENANCE_LOGGED',
      newValue: `Maintenance: ${description} (INR ${cost_amount}) for vehicle ${id}`,
      changedBy: req.user!.id
    });

    return res.status(201).json({ message: 'Maintenance record logged', id: recordId });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// VEHICLE FUEL TRANSACTIONS
// ==========================================

router.get('/vehicles/:id/fuel', requireAuth, (req, res) => {
  const { id } = req.params;
  const fuelTransactions = db.prepare(`
    SELECT f.*, u.name as driver_name
    FROM fuel_transactions f
    LEFT JOIN users u ON f.driver_id = u.id
    WHERE f.vehicle_id = ?
    ORDER BY f.fueling_date DESC
  `).all(id);

  return res.json({ fuelTransactions });
});

router.post('/vehicles/:id/fuel', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    driver_id,
    trip_id,
    fueling_date,
    quantity_liters,
    rate_per_liter,
    total_cost,
    odometer_km,
    fuel_station,
    payment_mode = 'FLEET_CARD',
    receipt_reference,
    notes
  } = req.body;

  if (!fueling_date || !quantity_liters || !rate_per_liter || !odometer_km || !fuel_station) {
    return res.status(400).json({ error: 'Fueling date, quantity, rate, odometer, and fuel station are required' });
  }

  const calculatedCost = total_cost ?? Math.round(quantity_liters * rate_per_liter * 100) / 100;
  const fuelId = uuidv4();

  try {
    db.prepare(`
      INSERT INTO fuel_transactions (
        id, vehicle_id, driver_id, trip_id, fueling_date, quantity_liters, rate_per_liter,
        total_cost, odometer_km, fuel_station, payment_mode, receipt_reference, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fuelId,
      id,
      driver_id || null,
      trip_id || null,
      fueling_date,
      quantity_liters,
      rate_per_liter,
      calculatedCost,
      odometer_km,
      fuel_station,
      payment_mode,
      receipt_reference || null,
      notes || null
    );

    return res.status(201).json({ message: 'Fuel transaction logged', id: fuelId });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// OPERATIONAL EXCEPTIONS & ALERTS
// ==========================================

router.get('/exceptions', requireAuth, (req, res) => {
  const { status = 'OPEN', severity, limit = 50 } = req.query;

  let query = `
    SELECT e.*, v.vehicle_number, u.name as driver_name, t.reference_number as trip_ref
    FROM operational_exceptions e
    LEFT JOIN vehicles v ON e.vehicle_id = v.id
    LEFT JOIN users u ON e.driver_id = u.id
    LEFT JOIN trips t ON e.trip_id = t.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (status && status !== 'ALL') {
    query += ` AND e.resolution_status = ?`;
    params.push(status);
  }
  if (severity) {
    query += ` AND e.severity = ?`;
    params.push(severity);
  }

  query += ` ORDER BY e.created_at DESC LIMIT ?`;
  params.push(parseInt(limit as string, 10) || 50);

  const exceptions = db.prepare(query).all(...params);
  return res.json({ exceptions });
});

router.post('/exceptions/:id/acknowledge', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { resolution_notes } = req.body;
  const userId = req.user!.id;
  const now = new Date().toISOString();

  try {
    db.prepare(`
      UPDATE operational_exceptions
      SET resolution_status = 'ACKNOWLEDGED',
          is_acknowledged = 1,
          acknowledged_by = ?,
          acknowledged_at = ?,
          resolution_notes = COALESCE(?, resolution_notes)
      WHERE id = ?
    `).run(userId, now, resolution_notes || null, id);

    logAudit({
      action: 'EXCEPTION_ACKNOWLEDGED',
      newValue: `Exception ${id} acknowledged by manager`,
      changedBy: userId
    });

    return res.json({ message: 'Exception acknowledged successfully' });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

export default router;
