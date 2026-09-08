import { Router, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { db } from '../db';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';
import { uploadPhotoMiddleware, savePhotoRecord, UPLOADS_DIR } from '../services/photoStorage';
import { PhotoType } from '../types';

const router = Router();

/**
 * POST /api/photos/upload
 * Accepts multipart photo upload with metadata
 */
router.post(
  '/upload',
  requireAuth,
  uploadPhotoMiddleware.single('photo'),
  async (req: AuthenticatedRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No photo file provided' });
    }

    const {
      trip_id,
      stop_id,
      photo_type = 'Delivery Proof',
      latitude,
      longitude,
      gps_accuracy,
      timestamp
    } = req.body;

    if (!trip_id) {
      // Clean up orphaned uploaded file
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'trip_id is required' });
    }

    const trip = db.prepare(`SELECT * FROM trips WHERE id = ?`).get(trip_id) as any;
    if (!trip) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Trip not found' });
    }

    try {
      const photo = await savePhotoRecord({
        tripId: trip_id,
        stopId: stop_id || undefined,
        driverId: req.user!.id,
        vehicleId: trip.vehicle_id,
        photoType: photo_type as PhotoType,
        filePath: req.file.filename,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        latitude: latitude ? parseFloat(latitude) : undefined,
        longitude: longitude ? parseFloat(longitude) : undefined,
        gpsAccuracy: gps_accuracy ? parseFloat(gps_accuracy) : undefined,
        timestamp: timestamp || new Date().toISOString()
      });

      return res.status(201).json({
        message: 'Photo uploaded successfully',
        photo
      });
    } catch (err: any) {
      return res.status(500).json({ error: 'Failed to record photo', details: err.message });
    }
  }
);

/**
 * GET /api/photos/:id/file
 * Secure photo file streaming
 */
router.get('/:id/file', (req, res) => {
  const photo = db.prepare(`SELECT * FROM photos WHERE id = ?`).get(req.params.id) as any;
  if (!photo) {
    return res.status(404).json({ error: 'Photo record not found' });
  }

  const filePath = path.join(UPLOADS_DIR, photo.file_path);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Photo file missing from storage' });
  }

  res.setHeader('Content-Type', photo.mime_type || 'image/jpeg');
  return res.sendFile(filePath);
});

export default router;
