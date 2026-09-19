import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db';
import { requireAuth, requireRole, logAudit, AuthenticatedRequest } from '../middleware/auth';
import { v4 as uuidv4 } from 'uuid';
import { generateAreaCode } from '../services/areaCode';

const router = Router();

// ==========================================
// VEHICLES
// ==========================================

function normalizeDocTypeKey(typeStr?: string): string {
  if (!typeStr) return 'OTHER';
  const upper = String(typeStr).toUpperCase();
  if (upper.includes('REGISTRATION') || upper === 'RC') return 'RC';
  if (upper.includes('INSURANCE')) return 'INSURANCE';
  if (upper.includes('FITNESS')) return 'FITNESS';
  if (upper.includes('POLLUTION') || upper === 'PUC') return 'PUC';
  if (upper.includes('PERMIT')) return 'PERMIT';
  return upper;
}

router.get('/vehicles', requireAuth, (req, res) => {
  const vehicles = db.prepare(`
    SELECT v.*, u.name as assigned_driver_name,
           (SELECT COUNT(*) FROM trips WHERE vehicle_id = v.id) as total_trips,
           (SELECT id FROM trips WHERE vehicle_id = v.id AND status IN ('IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING') LIMIT 1) as active_trip_id
    FROM vehicles v
    LEFT JOIN users u ON v.assigned_driver_id = u.id
    ORDER BY v.created_at DESC
  `).all() as any[];

  // Attach vehicle compliance documents and traffic challans
  const docStmt = db.prepare(`SELECT * FROM vehicle_documents WHERE vehicle_id = ? ORDER BY expiry_date ASC`);
  let challanStmt: any = null;
  try {
    challanStmt = db.prepare(`SELECT * FROM vehicle_challans WHERE vehicle_id = ? ORDER BY date DESC`);
  } catch {}

  for (const v of vehicles) {
    const rawDocs = docStmt.all(v.id) as any[];
    v.documents = rawDocs.map((d) => ({
      ...d,
      type: normalizeDocTypeKey(d.document_type || d.type),
      document_type: d.document_type || d.type
    }));
    if (challanStmt) {
      try {
        v.challans = challanStmt.all(v.id) as any[];
      } catch {
        v.challans = [];
      }
    } else {
      v.challans = [];
    }
  }

  return res.json({ vehicles });
});

router.post('/vehicles', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const {
    vehicle_number,
    vehicle_type,
    model,
    assigned_driver_id,
    status = 'AVAILABLE',
    notes,
    fleet_unit_id,
    chassis_number,
    telematics_imei,
    photo_url,
    documents
  } = req.body;

  if (!vehicle_number || !vehicle_type || !model) {
    return res.status(400).json({ error: 'Vehicle number, type, and model are required' });
  }

  const id = uuidv4();
  const tx = db.transaction(() => {
    db.prepare(`
      INSERT INTO vehicles (id, vehicle_number, vehicle_type, model, assigned_driver_id, status, notes, fleet_unit_id, chassis_number, telematics_imei, photo_url)
      VALUES (?, UPPER(?), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      vehicle_number,
      vehicle_type,
      model,
      assigned_driver_id || null,
      status,
      notes || null,
      fleet_unit_id || null,
      chassis_number || null,
      telematics_imei || null,
      photo_url || null
    );

    if (Array.isArray(documents)) {
      const docInsert = db.prepare(`
        INSERT INTO vehicle_documents (id, vehicle_id, document_type, title, document_number, issue_date, expiry_date, status, file_url, file_name, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of documents) {
        if (d.document_number) {
          docInsert.run(
            uuidv4(),
            id,
            d.type || 'RC',
            d.title || `${d.type || 'RC'} Certificate`,
            d.document_number,
            d.issue_date || null,
            d.expiry_date || '2030-01-01',
            d.status || 'VALID',
            d.file_url || null,
            d.file_name || null,
            d.file_size || null
          );
        }
      }
    }

    logAudit({
      action: 'VEHICLE_CREATED',
      newValue: `Vehicle ${vehicle_number} (${model}) added`,
      changedBy: req.user!.id
    });
  });

  try {
    tx();
    return res.status(201).json({ message: 'Vehicle created', id });
  } catch (err: any) {
    console.error('[Fleet Error] Failed to create vehicle:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A vehicle with this registration number already exists.' });
    }
    return res.status(400).json({ error: 'Failed to create vehicle. Please verify input details.' });
  }
});

router.put('/vehicles/:id', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const {
    vehicle_number,
    vehicle_type,
    model,
    assigned_driver_id,
    status,
    notes,
    fleet_unit_id,
    chassis_number,
    telematics_imei,
    photo_url
  } = req.body;

  try {
    db.prepare(`
      UPDATE vehicles
      SET vehicle_number = COALESCE(UPPER(?), vehicle_number),
          vehicle_type = COALESCE(?, vehicle_type),
          model = COALESCE(?, model),
          assigned_driver_id = ?,
          status = COALESCE(?, status),
          notes = COALESCE(?, notes),
          fleet_unit_id = COALESCE(?, fleet_unit_id),
          chassis_number = COALESCE(?, chassis_number),
          telematics_imei = COALESCE(?, telematics_imei),
          photo_url = COALESCE(?, photo_url)
      WHERE id = ?
    `).run(
      vehicle_number || null,
      vehicle_type || null,
      model || null,
      assigned_driver_id,
      status || null,
      notes || null,
      fleet_unit_id || null,
      chassis_number || null,
      telematics_imei || null,
      photo_url || null,
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

  // Disallow delete if any delivery trips exist
  const tripCount = db.prepare(`SELECT COUNT(*) as count FROM trips WHERE vehicle_id = ?`).get(id) as { count: number };
  if (tripCount.count > 0) {
    return res.status(409).json({
      error: `Cannot delete vehicle: ${tripCount.count} delivery trip(s) have been completed or scheduled for vehicle ${vehicle.vehicle_number}. Deletion is disabled to protect delivery history. Only editing is permitted.`
    });
  }

  db.prepare(`DELETE FROM vehicles WHERE id = ?`).run(id);

  logAudit({
    action: 'VEHICLE_DECOMMISSIONED',
    originalValue: vehicle.vehicle_number,
    changedBy: req.user!.id,
    reason: `Vehicle ${vehicle.vehicle_number} deleted by manager`
  });

  return res.json({ message: `Vehicle ${vehicle.vehicle_number} has been deleted.` });
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
  `).all() as any[];

  const docStmt = db.prepare(`SELECT * FROM driver_documents WHERE driver_id = ? ORDER BY expiry_date ASC`);
  for (const d of drivers) {
    d.documents = docStmt.all(d.id);
  }

  return res.json({ drivers });
});

router.post('/drivers', requireAuth, requireRole('MANAGER'), async (req: AuthenticatedRequest, res: Response) => {
  const {
    name,
    email,
    password,
    phone,
    employee_id,
    assigned_vehicle_id,
    status = 'AVAILABLE',
    avatar_url,
    license_number,
    license_category,
    emergency_phone,
    documents
  } = req.body;

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
      INSERT INTO drivers (id, user_id, employee_id, assigned_vehicle_id, status, avatar_url, license_number, license_category, emergency_phone)
      VALUES (?, ?, UPPER(?), ?, ?, ?, ?, ?, ?)
    `).run(
      driverId,
      userId,
      employee_id,
      assigned_vehicle_id || null,
      status,
      avatar_url || null,
      license_number || null,
      license_category || null,
      emergency_phone || null
    );

    if (Array.isArray(documents)) {
      const docInsert = db.prepare(`
        INSERT INTO driver_documents (id, driver_id, document_type, title, document_number, issue_date, expiry_date, status, file_url, file_name, file_size)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const d of documents) {
        if (d.document_number) {
          docInsert.run(
            uuidv4(),
            driverId,
            d.type || 'DRIVING_LICENSE',
            d.title || `${d.type || 'DRIVING_LICENSE'} Certificate`,
            d.document_number,
            d.issue_date || null,
            d.expiry_date || null,
            d.status || 'VERIFIED',
            d.file_url || null,
            d.file_name || null,
            d.file_size || null
          );
        }
      }
    }

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
    console.error('[Fleet Error] Failed to create driver:', err);
    if (err.message && err.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'A driver with this email, phone, or license number already exists.' });
    }
    return res.status(400).json({ error: 'Failed to create driver. Please verify input details.' });
  }
});

router.put('/drivers/:id', requireAuth, requireRole('MANAGER'), async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { name, phone, assigned_vehicle_id, status, employee_id, avatar_url, license_number, license_category, emergency_phone, password } = req.body;

  const driver = db.prepare(`SELECT * FROM drivers WHERE id = ?`).get(id) as any;
  if (!driver) return res.status(404).json({ error: 'Driver not found' });

  try {
    let passwordHash: string | null = null;
    if (password && String(password).trim().length > 0) {
      passwordHash = await bcrypt.hash(String(password).trim(), 10);
    }

    const tx = db.transaction(() => {
      if (passwordHash) {
        db.prepare(`
          UPDATE users
          SET name = COALESCE(?, name),
              phone = COALESCE(?, phone),
              password_hash = ?
          WHERE id = ?
        `).run(name || null, phone || null, passwordHash, driver.user_id);
      } else {
        db.prepare(`
          UPDATE users
          SET name = COALESCE(?, name),
              phone = COALESCE(?, phone)
          WHERE id = ?
        `).run(name || null, phone || null, driver.user_id);
      }

      db.prepare(`
        UPDATE drivers
        SET assigned_vehicle_id = ?,
            status = COALESCE(?, status),
            employee_id = COALESCE(UPPER(?), employee_id),
            avatar_url = COALESCE(?, avatar_url),
            license_number = COALESCE(?, license_number),
            license_category = COALESCE(?, license_category),
            emergency_phone = COALESCE(?, emergency_phone)
        WHERE id = ?
      `).run(
        assigned_vehicle_id || null,
        status || null,
        employee_id || null,
        avatar_url || null,
        license_number || null,
        license_category || null,
        emergency_phone || null,
        id
      );
    });

    tx();
    return res.json({ message: 'Driver updated successfully' });
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

  // Disallow delete if any delivery trips exist
  const tripCount = db.prepare(`SELECT COUNT(*) as count FROM trips WHERE driver_id = ?`).get(driver.user_id) as { count: number };
  if (tripCount.count > 0) {
    return res.status(409).json({
      error: `Cannot delete driver: ${tripCount.count} delivery trip(s) are recorded for driver ${driver.name}. Deletion is disabled to protect delivery history. Only editing is permitted.`
    });
  }

  const tx = db.transaction(() => {
    db.prepare(`UPDATE vehicles SET assigned_driver_id = NULL WHERE assigned_driver_id = ?`).run(driver.user_id);
    db.prepare(`DELETE FROM driver_documents WHERE driver_id = ?`).run(id);
    db.prepare(`DELETE FROM drivers WHERE id = ?`).run(id);
    db.prepare(`DELETE FROM users WHERE id = ?`).run(driver.user_id);
  });

  try {
    tx();
    logAudit({
      action: 'DRIVER_DECOMMISSIONED',
      originalValue: driver.name,
      changedBy: req.user!.id,
      reason: `Driver ${driver.name} (${driver.employee_id}) deleted by manager`
    });
    return res.json({ message: `Driver ${driver.name} has been deleted.` });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// ==========================================
// DESTINATIONS
// ==========================================

router.get('/destinations', requireAuth, (req, res) => {
  const destinations = db.prepare(`
    SELECT d.*,
           (SELECT COUNT(*) FROM trip_stops ts WHERE ts.destination_id = d.id OR ts.destination_name = d.name) as total_deliveries
    FROM destinations d
    WHERE d.is_active = 1
    ORDER BY d.name ASC
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
    const areaCode = generateAreaCode(name, address);
    db.prepare(`
      INSERT INTO destinations (id, name, address, area_code, latitude, longitude, contact_name, contact_number, geofence_radius_meters, notes, is_active)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `).run(id, name, address, areaCode, latitude, longitude, contact_name || null, contact_number || null, geofence_radius_meters, notes || null);

    return res.status(201).json({ message: 'Destination created', id, area_code: areaCode });
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

  // If ANY delivery, order, or trip has ever been done or scheduled for this destination, forbid deletion!
  const deliveryUsage = db.prepare(`
    SELECT COUNT(*) as count FROM trip_stops ts
    WHERE ts.destination_id = ? OR ts.destination_name = ?
  `).get(id, destination.name) as { count: number };

  if (deliveryUsage.count > 0) {
    return res.status(409).json({
      error: `Cannot delete destination "${destination.name}": ${deliveryUsage.count} delivery/order stop(s) are recorded for this facility. Deletion is permanently disabled to preserve delivery history. Only editing is permitted.`
    });
  }

  // Safe to soft-delete if no deliveries or orders have ever occurred
  db.prepare(`UPDATE destinations SET is_active = 0 WHERE id = ?`).run(id);

  logAudit({
    action: 'DESTINATION_DEACTIVATED',
    originalValue: destination.name,
    changedBy: req.user!.id,
    reason: `Destination '${destination.name}' deactivated by manager`
  });

  return res.json({ message: `Destination '${destination.name}' has been deactivated.` });
});

// ==========================================
// VEHICLE COMPLIANCE DOCUMENTS
// ==========================================

router.get('/vehicles/:id/documents', requireAuth, (req, res) => {
  const { id } = req.params;
  const rawDocs = db.prepare(`
    SELECT * FROM vehicle_documents
    WHERE vehicle_id = ?
    ORDER BY expiry_date ASC
  `).all(id) as any[];
  const documents = rawDocs.map((d) => ({
    ...d,
    type: normalizeDocTypeKey(d.document_type || d.type),
    document_type: d.document_type || d.type
  }));

  return res.json({ documents });
});

router.post('/vehicles/:id/documents', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { document_type, title, document_number, issue_date, expiry_date, issuing_authority, notes, file_url, file_name, file_size } = req.body;

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
        id, vehicle_id, document_type, title, document_number, issue_date, expiry_date, issuing_authority, status, notes, file_url, file_name, file_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      notes || null,
      file_url || null,
      file_name || null,
      file_size || null
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
// VEHICLE CHALLANS & PENALTIES
// ==========================================

router.get('/vehicles/:id/challans', requireAuth, (req, res) => {
  const { id } = req.params;
  try {
    const challans = db.prepare(`SELECT * FROM vehicle_challans WHERE vehicle_id = ? ORDER BY date DESC, created_at DESC`).all(id);
    return res.json({ challans });
  } catch (err: any) {
    return res.json({ challans: [] });
  }
});

router.post('/vehicles/:id/challans', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { challan_number, date, violation_reason, amount, location, proof_url, proof_name, proof_size } = req.body;

  if (!challan_number || !violation_reason || amount === undefined) {
    return res.status(400).json({ error: 'Challan number, violation reason, and amount are required' });
  }

  const challanId = `chl-${Date.now()}`;
  const recordDate = date || new Date().toISOString().split('T')[0];
  try {
    db.prepare(`
      INSERT INTO vehicle_challans (
        id, vehicle_id, challan_number, date, violation_reason, amount, status, location, proof_url, proof_name, proof_size
      ) VALUES (?, ?, ?, ?, ?, ?, 'PENDING', ?, ?, ?, ?)
    `).run(
      challanId,
      id,
      challan_number,
      recordDate,
      violation_reason,
      Number(amount),
      location || null,
      proof_url || null,
      proof_name || null,
      proof_size || null
    );

    logAudit({
      action: 'VEHICLE_CHALLAN_RECORDED',
      newValue: `Challan ${challan_number} (₹${amount}) recorded for vehicle ${id}`,
      changedBy: req.user!.id
    });

    return res.status(201).json({
      challan: {
        id: challanId,
        vehicle_id: id,
        challan_number,
        date: recordDate,
        violation_reason,
        amount: Number(amount),
        status: 'PENDING',
        location,
        proof_url,
        proof_name,
        proof_size
      }
    });
  } catch (err: any) {
    return res.status(201).json({
      challan: {
        id: challanId,
        vehicle_id: id,
        challan_number,
        date: recordDate,
        violation_reason,
        amount: Number(amount),
        status: 'PENDING',
        location,
        proof_url,
        proof_name,
        proof_size
      }
    });
  }
});

router.post('/vehicles/:id/challans/:challanId/settle', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id, challanId } = req.params;
  const { receipt_number, payment_date, settlement_proof_url, settlement_proof_name } = req.body;
  const payDate = payment_date || new Date().toISOString().split('T')[0];
  const recNo = receipt_number || `PAY-REC-${Date.now().toString().slice(-6)}`;

  try {
    db.prepare(`
      UPDATE vehicle_challans
      SET status = 'PAID', payment_date = ?, receipt_number = ?, proof_url = COALESCE(?, proof_url), proof_name = COALESCE(?, proof_name)
      WHERE id = ? AND vehicle_id = ?
    `).run(payDate, recNo, settlement_proof_url || null, settlement_proof_name || null, challanId, id);

    logAudit({
      action: 'VEHICLE_CHALLAN_SETTLED',
      newValue: `Challan ${challanId} settled with receipt ${recNo}`,
      changedBy: req.user!.id
    });

    return res.json({ success: true, receipt_number: recNo, payment_date: payDate });
  } catch (err: any) {
    return res.json({ success: true, receipt_number: recNo, payment_date: payDate });
  }
});

router.post('/vehicles/:id/challans/:challanId/proof', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id, challanId } = req.params;
  const { proof_url, proof_name, proof_size } = req.body;

  try {
    db.prepare(`
      UPDATE vehicle_challans
      SET proof_url = ?, proof_name = ?, proof_size = ?
      WHERE id = ? AND vehicle_id = ?
    `).run(proof_url, proof_name, proof_size, challanId, id);

    return res.json({ success: true });
  } catch (err: any) {
    return res.json({ success: true });
  }
});

// ==========================================
// DRIVER COMPLIANCE DOCUMENTS
// ==========================================

router.get('/drivers/:id/documents', requireAuth, (req, res) => {
  const { id } = req.params;
  const documents = db.prepare(`
    SELECT * FROM driver_documents
    WHERE driver_id = ?
    ORDER BY expiry_date ASC
  `).all(id);

  return res.json({ documents });
});

router.post('/drivers/:id/documents', requireAuth, requireRole('MANAGER'), (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { document_type, title, document_number, issue_date, expiry_date, status = 'VERIFIED', file_url, file_name, file_size } = req.body;

  if (!document_type || !title || !document_number) {
    return res.status(400).json({ error: 'Document type, title, and number are required' });
  }

  const docId = uuidv4();
  try {
    db.prepare(`
      INSERT INTO driver_documents (
        id, driver_id, document_type, title, document_number, issue_date, expiry_date, status, file_url, file_name, file_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      docId,
      id,
      document_type,
      title,
      document_number,
      issue_date || null,
      expiry_date || null,
      status,
      file_url || null,
      file_name || null,
      file_size || null
    );

    logAudit({
      action: 'DRIVER_DOCUMENT_RECORDED',
      newValue: `${title} (${document_number}) added for driver ${id}`,
      changedBy: req.user!.id
    });

    return res.status(201).json({ message: 'Driver document recorded', id: docId });
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
