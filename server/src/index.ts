import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { initDatabase, db } from './db';
import authRoutes from './routes/auth';
import driverRoutes from './routes/driver';
import tripsRoutes from './routes/trips';
import fleetRoutes from './routes/fleet';
import reportsRoutes from './routes/reports';
import photosRoutes from './routes/photos';
import googleSheetsRoutes from './routes/googleSheetsRoutes';
import { UPLOADS_DIR } from './services/photoStorage';

dotenv.config();

// Initialize database schema
initDatabase();

// Ensure clean initial credentials if database is empty, without seeding dummy trips or data
try {
  const userCountRow = db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number } | undefined;
  if (!userCountRow || userCountRow.count === 0) {
    if (process.env.AUTO_SEED === 'true') {
      console.log('🌱 AUTO_SEED=true — seeding demo routes and test fleet...');
      import('./seed').then(({ seed }) => seed()).catch((e) => console.error('[Auto-Seed Failed]', e));
    } else {
      console.log('🔒 Production mode: Provisioning initial manager credentials without dummy data...');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const bcrypt = require('bcryptjs');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { v4: uuidv4 } = require('uuid');
      const managerPasswordHash = bcrypt.hashSync(process.env.INITIAL_ADMIN_PASSWORD || 'manager123', 10);
      db.prepare(`
        INSERT INTO users (id, name, email, password_hash, role, phone)
        VALUES (?, ?, LOWER(?), ?, 'MANAGER', ?)
      `).run(
        uuidv4(),
        'Operations Manager',
        process.env.INITIAL_ADMIN_EMAIL || 'manager@company.com',
        managerPasswordHash,
        '+91 98100 00000'
      );
      console.log('✅ Initial manager user ready (0 dummy trips, 0 dummy fleet data).');
    }
  }
} catch (e) {
  console.error('[DB Init Check Failed]', e);
}

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static file serving for photo uploads
app.use('/uploads/photos', express.static(UPLOADS_DIR));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/driver', driverRoutes);
app.use('/api/trips', tripsRoutes);
app.use('/api/fleet', fleetRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/photos', photosRoutes);
app.use('/api/google-sheets', googleSheetsRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'TruckTracker Operational API'
  });
});

// App version & APK release telemetry for Android mobile clients
app.get('/api/app-version', (_req, res) => {
  res.json({
    version: '1.1.0',
    versionCode: 2,
    downloadUrl: 'https://github.com/Nixxzzzzz/truck_tracker/releases/download/v1.1.0/TruckTracker-Driver-v1.1.0-debug.apk',
    latestReleaseUrl: 'https://github.com/Nixxzzzzz/truck_tracker/releases/latest',
    mandatoryUpdate: false
  });
});

// Serve frontend client in production if built
const webDist = path.resolve(__dirname, '../../web/dist');
const clientDist = path.resolve(__dirname, '../../client/dist');
const staticDist = fs.existsSync(webDist) ? webDist : clientDist;

app.use(express.static(staticDist));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
    return next();
  }
  const indexPath = path.join(staticDist, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) next();
  });
});

// Global error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[TruckTracker Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal operational server error'
  });
});

app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 TruckTracker Server active on http://localhost:${PORT}`);
  console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=================================================`);
});
