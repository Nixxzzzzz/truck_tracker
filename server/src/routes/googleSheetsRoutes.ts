import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth';
import { googleSheetsService } from '../services/googleSheets';
import { db } from '../db';

const router = Router();

router.get('/status', requireAuth, requireRole('MANAGER'), (_req, res) => {
  const status = googleSheetsService.getStatus();
  return res.json(status);
});

router.post('/retry', requireAuth, requireRole('MANAGER'), async (_req, res) => {
  const result = await googleSheetsService.retryFailed();
  return res.json({ message: 'Retry completed', ...result });
});

router.post('/sync-all', requireAuth, requireRole('MANAGER'), async (_req, res) => {
  const trips = db.prepare(`SELECT id FROM trips`).all() as Array<{ id: string }>;
  let synced = 0;
  for (const t of trips) {
    await googleSheetsService.syncTrip(t.id);
    synced++;
  }
  return res.json({ message: `Initiated sync for ${synced} trips` });
});

export default router;
