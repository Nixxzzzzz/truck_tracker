# 🚀 TruckTracker — Deployment & Operations Guide

## 1. Production Architecture Topology

```mermaid
graph TD
    subgraph Clients["Fleet & Operations Clients"]
        Drivers["📱 Android Phones (Field Drivers)<br/>(HTTPS / 4G / 5G / Wi-Fi)"]
        Managers["💻 Web Browsers (Dispatch Managers)<br/>(HTTPS / Desktop LAN)"]
    end

    subgraph Edge["Edge & Security Layer"]
        Proxy["🛡️ Nginx / Caddy / Cloudflare Proxy<br/>(TLS 1.3 Termination :443)"]
    end

    subgraph Application["TruckTracker Application Tier"]
        ExpressApp["⚙️ Node.js 24 + Express Server (:5000)<br/>• REST API Endpoints<br/>• Static Photo Streamer"]
        StaticWeb["🌐 Web Dashboard Static Bundle<br/>(/web/dist)"]
    end

    subgraph DataTier["Data Persistence Tier"]
        SQLiteDB[("🗄️ SQLite Database (WAL Mode)<br/>truck_tracker.sqlite")]
        PhotoDir[("📁 Local Photo Proof Directory<br/>/server/uploads/photos/")]
        Backups[("💾 Automated Hot Backups<br/>/server/data/backups/")]
    end

    subgraph Cloud["External Replica"]
        GSheets[("📈 Google Cloud Sheets API<br/>(8 Operational Tabs)")]
    end

    Drivers -->|HTTPS :443| Proxy
    Managers -->|HTTPS :443| Proxy

    Proxy -->|Proxy Pass /api & /uploads| ExpressApp
    Proxy -->|Serve Static SPA| StaticWeb

    ExpressApp --> SQLiteDB
    ExpressApp --> PhotoDir
    ExpressApp -.->|Asynchronous Sync| GSheets
    SQLiteDB -.->|Nightly Backup| Backups
```

---

- **Server Runtime**: Node.js v22.5+ or v24+ (Node 24 recommended for native `node:sqlite` DatabaseSync)
- **Android Build Environment**: Android SDK 34, JDK 17, Gradle 8.7+
- **Web Runtime**: Modern browser (Chrome, Edge, Firefox, Safari)

---

## 2. Server Configuration (`.env`)

Create or update `.env` in the project root:

```env
# Server Configuration
PORT=5000
NODE_ENV=production
JWT_SECRET=company_super_secure_jwt_secret_2026

# Google Sheets Integration (Optional)
GOOGLE_SPREADSHEET_ID=your_google_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}

# Storage Paths
DATABASE_PATH=./data/truck_tracker.sqlite
PHOTO_UPLOAD_DIR=./uploads/photos
```

*Note: If Google Sheets credentials are not supplied, the system operates in fallback local sync mode with full audit logging and retry queues.*

---

## 3. Database Initialization & Seeding

```bash
cd server
# Seed database with company HQ, drivers, vehicles, and destinations
npx tsx src/seed.ts
```

The database initializes in **SQLite WAL (Write-Ahead Logging)** mode with `busy_timeout = 5000` and `foreign_keys = ON`.

---

## 4. Web Application Production Build

```bash
cd web
npm install
npm run build
```

The production assets are generated in `web/dist/`. In production, these static assets can be served by Nginx, Cloudflare, or directly by Express via static middleware.

---

## 5. Android Application Build

### Building Debug APK
```bash
cd android
./gradlew assembleDebug
```
Output artifact: `android/app/build/outputs/apk/debug/app-debug.apk`

### Building Release APK
1. Configure keystore in `android/gradle.properties`:
   ```properties
   MYAPP_UPLOAD_STORE_FILE=my-upload-key.jks
   MYAPP_UPLOAD_KEY_ALIAS=my-key-alias
   MYAPP_UPLOAD_STORE_PASSWORD=*****
   MYAPP_UPLOAD_KEY_PASSWORD=*****
   ```
2. Run build:
   ```bash
   cd android
   ./gradlew assembleRelease
   ```
Output artifact: `android/app/build/outputs/apk/release/app-release.apk`

---

## 6. HTTPS & Mobile Network Setup

For drivers using physical Android phones on the road:
1. Deploy the backend behind a reverse proxy (Nginx or Caddy) with a valid SSL/TLS certificate (Let's Encrypt).
2. Android enforces cleartext traffic restrictions by default. Production builds connect via HTTPS (`https://logistics.company.com/`).
3. For local field testing on the company LAN, `usesCleartextTraffic="true"` is enabled in the debug manifest.

---

## 7. Automated SQLite Backup Procedure

### Performing Live Backup Snapshot
```bash
cd server
npx tsx src/backup.ts backup
```
Produces timestamped snapshots in `server/data/backups/truck_tracker_backup_<timestamp>.sqlite` with atomic WAL checkpoints (`PRAGMA wal_checkpoint(TRUNCATE)`).

### Restoring from Snapshot
```bash
cd server
npx tsx src/backup.ts restore server/data/backups/truck_tracker_backup_<timestamp>.sqlite
```

---

## 8. 100% Free Forever Deployment Guide ($0 Cost)

TruckTracker can be run and hosted **completely free of charge** ($0/month) with zero credit card requirements:

### Tier 1: 100% Free Web Dashboard (Vercel & GitHub Pages)
* **Vercel Hobby Tier ($0 Forever)**:
  * Connect `Nixxzzzzz/truck_tracker` on Vercel.
  * Root Directory: `web` (handled automatically by `vercel.json`).
  * Free unlimited builds, global CDN, automated HTTPS. No credit card required.
* **GitHub Pages ($0 Forever)**:
  * Automatically built and deployed on every push to `main` via `.github/workflows/deploy.yml`.
  * In GitHub Settings → Pages, set Source to **Deploy from branch: `gh-pages`**.

### Tier 2: 100% Free Backend ($0 Forever)
* **Option A: Self-Hosted / Office PC + Free Cloudflare Tunnel (Recommended)**:
  * Runs on any computer, home PC, or office laptop:
    ```bash
    npm run start
    ```
  * The Express server serves both the **REST API** and the compiled **Web Dashboard** at `http://localhost:5000`.
  * To give drivers on 4G/5G mobile phones secure public HTTPS access for $0:
    ```bash
    # Run free Cloudflare Tunnel (no port forwarding, no static IP, 100% free)
    cloudflared tunnel --url http://localhost:5000
    ```
  * Gives you a free `https://xxxx.trycloudflare.com` URL that works worldwide for both web managers and Android drivers!

* **Option B: Free Cloud Web Service (Render Free Tier)**:
  * Use the included `render.yaml` with `plan: free`.
  * 100% free hosting for testing and lightweight operational monitoring.

