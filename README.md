<p align="center">
  <img src="assets/hosexperts-logo.png" alt="HoseXperts — working with the flow" width="420" />
</p>

# 🚛 TruckTracker 2.0 — Enterprise Fleet Operations & Dispatch Logistics

> **Production-grade logistics management platform for HoseXperts fleet operators.**  
> All data is **live from the company SQLite database** — no hardcoded vehicles, no fake plates, no dummy challans, no placeholder documents.

[![Live Production](https://img.shields.io/badge/Production-truck--tracker--api--9yhq.onrender.com-059669.svg?logo=render)](https://truck-tracker-api-9yhq.onrender.com/)
[![Health Check](https://img.shields.io/badge/Health-200%20OK-059669.svg?logo=render)](https://truck-tracker-api-9yhq.onrender.com/api/health)
[![CI/CD Build](https://github.com/Nixxzzzzz/truck_tracker/actions/workflows/deploy.yml/badge.svg)](https://github.com/Nixxzzzzz/truck_tracker/actions)
[![Android APK](https://img.shields.io/badge/Android%20APK-v1.1.0-4f46e5.svg?logo=android)](https://github.com/Nixxzzzzz/truck_tracker/releases/tag/v1.1.0)
[![Stack](https://img.shields.io/badge/Stack-Node%2022%20%7C%20React%2019%20%7C%20TypeScript-2563eb.svg)](#)
[![Database](https://img.shields.io/badge/Database-SQLite%20WAL%20(16%20Tables)-d97706.svg)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

---

## 📌 What Is TruckTracker 2.0?

TruckTracker is an **internal enterprise fleet operations platform** built exclusively for HoseXperts. It connects two types of users:

- **Dispatch Operations Managers** — Plan multi-stop routes, assign drivers and vehicles, monitor live GPS fleet positions, manage statutory vehicle compliance documents, handle challan records, and generate SLA/delay analytics reports.
- **Field Route Drivers** — Receive trip manifests, log geofenced stop arrivals, capture proof-of-delivery photos, report delays, and access assigned vehicle papers — from the mobile web cockpit or Android APK.

**Data source**: All vehicles, drivers, trips, documents, and challans come from the live **SQLite database** (backed by SAP ONE Portal ERP references). There is **no Google Sheets dependency**, no mock data, and no static demo records in production.

---

## 🏛️ Production Architecture

```
Drivers (Android / Mobile Web)  ──► Render Web Service (Oregon)
Managers (Web Command Center)   ──►   Express API :10000
                                       • JWT Auth & RBAC
                                       • State Machine Guard
                                       • Geofence Validator
                                       • Static SPA Server
                                      ──► /data/truck_tracker.sqlite (WAL)
                                      ──► /data/uploads/photos/
                                ──► SAP ONE Portal (ERP Reference Sync)
```

### Trip Lifecycle

```
PLANNED → IN_PROGRESS → DELAYED ↔ IN_PROGRESS → RETURNING → COMPLETED
```

Server-enforced. Invalid transitions are rejected with 400 errors.

---

## 🚀 Quick Start — Local Development

### Prerequisites

| Tool | Min Version | Check |
|------|------------|-------|
| Node.js | v22.0.0+ or v24 LTS | `node -v` |
| npm | v10.0.0+ | `npm -v` |
| Git | Any | `git --version` |

### 1. Clone & Install

```bash
git clone https://github.com/Nixxzzzzz/truck_tracker.git
cd truck_tracker
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:

```env
NODE_ENV=development
PORT=5000
JWT_SECRET=your-strong-random-secret-min-32-chars
DB_PATH=./data/truck_tracker.sqlite
UPLOAD_DIR=./uploads
```

### 3. Initialize Database

```bash
# Run migrations (creates all 16 tables)
npm run migrate --workspace=server

# Seed initial demo users (development only)
npm run seed --workspace=server
```

> ⚠️ **Do NOT run seed in production.** Add real users and vehicles through the Manager interface.

### 4. Start Development Servers

```bash
# Terminal 1 — Backend API (Port 5000)
npm run dev --workspace=server

# Terminal 2 — Web Frontend (Port 5173)
npm run dev --workspace=web
```

| Service | URL |
|---------|-----|
| Web Console | `http://localhost:5173` |
| API Health | `http://localhost:5000/api/health` |

---

## 🔐 Login & User Setup

### No Hardcoded Users in Production

All users are stored in the **database**. You create them via the Manager UI or API — never via hardcoded credentials in code.

### Add a Driver or Manager (Manager Web UI)

1. Log in as Manager
2. Go to **Team & Users** panel
3. Click **+ Add User** → enter Name, Email, Password, Role (`DRIVER` or `MANAGER`)

### Add via API

```bash
curl -X POST https://your-app.onrender.com/api/auth/users \
  -H "Authorization: Bearer <your-manager-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Driver Full Name",
    "email": "driver@yourcompany.com",
    "password": "SecurePassword@2025",
    "role": "DRIVER",
    "phone": "+91-XXXXX-XXXXX"
  }'
```

### Development-Only Seed Credentials

> These only exist after running `npm run seed`. **Change passwords before going live.**

| Role | Email | Password |
|------|-------|----------|
| Operations Manager | `manager@company.com` | `manager123` |
| Driver | `rahul@company.com` | `driver123` |
| Driver | `amit@company.com` | `driver123` |

### Driver Login Behavior

- Driver has **active trip assigned** → sees manifest, vehicle info, route stops (all from live DB)
- Driver has **no trip assigned** → sees empty state ("No trip assigned") — no dummy vehicle, no fake plates
- Vehicle papers shown to driver come from the **fleet compliance database** — only real documents managers have added

---

## ☁️ Production Deployment — Render

Full guide: [`documentation/deployment.md`](documentation/deployment.md)

### Required Environment Variables (Render Dashboard)

| Variable | Value | Notes |
|----------|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render assigns automatically |
| `JWT_SECRET` | 32+ random chars | Never expose |
| `DB_PATH` | `/data/truck_tracker.sqlite` | Persistent disk |
| `UPLOAD_DIR` | `/data/uploads` | Proof photo storage |

### Render Config (`render.yaml` — already in repo)

```yaml
services:
  - type: web
    name: truck-tracker-api
    env: node
    region: oregon
    buildCommand: npm ci --include=dev && npm run build:all
    startCommand: npm run start
    disk:
      name: truck-tracker-data
      mountPath: /data
      sizeGB: 10
```

### Deploy Steps

1. Push to `main` → Render auto-deploys via GitHub integration
2. Monitor at: `https://dashboard.render.com`
3. Verify: `GET /api/health` → `200 OK`
4. Log in as Manager → create real users and vehicles
5. Do NOT seed demo data on production

---

## 🏢 SAP ONE Portal Integration

TruckTracker stores **SAP Business One ERP reference fields** on trips and vehicles. These link logistics records to SAP documents.

### ERP Fields

| Field | Table | SAP Reference |
|-------|-------|--------------|
| `sap_shipment_num` | `trips` | SAP TM Shipment Order |
| `erp_delivery_doc` | `trips` | SAP SD Delivery (ODLN) |
| `cost_center` | `trips` | SAP CO Cost Center |
| `fleet_unit_id` | `vehicles` | SAP PM Equipment Number |

### Configuration

```env
SAP_PORTAL_URL=https://oneportal.yourcompany.internal/api/v1
SAP_SERVICE_LAYER_TOKEN=your-sap-session-token
```

Managers enter SAP reference numbers when creating trips. The system stores them alongside operational data. For full bi-directional live sync, configure the SAP Service Layer endpoint above.

---

## 🗄️ Database — 16 Tables

| Category | Table | Purpose |
|----------|-------|---------|
| System | `_schema_migrations` | Migration version tracking |
| Identity | `users` | Managers & drivers (bcrypt) |
| Fleet | `vehicles` | Fleet inventory & registration |
| Compliance | `vehicle_documents` | RC, Insurance, Fitness, PUC |
| Maintenance | `maintenance_records` | Service history |
| Fuel | `fuel_transactions` | Fuel fills & costs |
| Trips | `trips` | Route runs with ERP references |
| Stops | `trip_stops` | Ordered delivery/pickup waypoints |
| Events | `trip_events` | Immutable GPS telemetry log |
| Delays | `trip_delays` | Delay records with root-cause |
| Exceptions | `operational_exceptions` | Escalations & alerts |
| Photos | `trip_photos` | Proof-of-delivery photos |
| Cargo | `cargo_activities` | Line items per stop |
| Offline | `offline_events` | Driver offline action queue |
| Hubs | `locations` | Depots, warehouses, hubs |
| Sync | `sync_status` | ERP sync state |

```bash
npm run migrate --workspace=server
```

---

## 📱 Android Driver App

Built with **Kotlin + Jetpack Compose**. Compiled by GitHub Actions on every `main` push.

**Download**: [GitHub Releases → v1.1.0 APK](https://github.com/Nixxzzzzz/truck_tracker/releases/tag/v1.1.0)

**Install Steps:**
1. Download APK from Releases
2. Device → Settings → Security → Enable **Install Unknown Apps**
3. Install APK → log in with driver credentials
4. App checks `/api/app-version` for update alerts on launch

---

## 🧪 Tests

```bash
npm test                                    # DB integrity & business rules
npm run test:scenarios --workspace=server   # Production edge cases (20 tests)
npm run test:workflow --workspace=server    # End-to-end dispatch workflow (20 tests)
npm run build:all                           # Full production build
```

---

## ✅ Features

| Feature | Notes |
|---------|-------|
| Zero dummy data | All from live DB — no `DL01TA4920`, no fake docs |
| JWT auth + RBAC | Manager (full control) / Driver (own trips only) |
| Server-enforced state machine | Invalid trip transitions rejected |
| Haversine geofenced arrivals | ≤250m radius check |
| Proof-of-delivery photo upload | Stored to persistent disk |
| Statutory compliance hub | RC, Insurance, Fitness, PUC, Permit |
| Traffic challan vault | Log, attach proof, settle |
| Tri-lingual driver UI | English / हिन्दी / Hinglish |
| Offline-first driver | Auto-sync queue on reconnect |
| Real-time fleet GPS radar | Leaflet live map |
| Delay attribution analytics | Management vs Driver trend analysis |
| SAP ONE Portal ERP refs | Shipment/Delivery/Cost Center fields |
| Native Android APK | Kotlin + Jetpack Compose + CameraX |
| GitHub Actions CI/CD | Auto Android build + Render deploy |

---

## 📚 Documentation

| File | Contents |
|------|---------|
| [`documentation/deployment.md`](documentation/deployment.md) | Render + GitHub + SAP ONE Portal rollout |
| [`documentation/api.md`](documentation/api.md) | REST API endpoint reference |
| [`documentation/architecture.md`](documentation/architecture.md) | System design & data model |
| [`documentation/operations-manual.md`](documentation/operations-manual.md) | Manager & driver SOP |
| [`documentation/android.md`](documentation/android.md) | Android build & install guide |
| [`documentation/testing.md`](documentation/testing.md) | Test suite reference |
| [`documentation/web.md`](documentation/web.md) | Web frontend guide |

---

## 📄 License

MIT License. See [`LICENSE`](LICENSE) for details.

© 2025 HoseXperts. Built for enterprise fleet operations excellence.
