# 🚛 TruckTracker — Internal Fleet & Vehicle Trip Tracking System

> **A professional, high-reliability logistics operational software designed specifically for company-owned fleets, drivers, and dispatch managers.**

[![Status: Production Ready](https://img.shields.io/badge/Status-Production%20Ready-34d399.svg)](#)
[![Stack: Node 24 + SQLite + Vite React 19](https://img.shields.io/badge/Stack-Node%2024%20%7C%20SQLite%20%7C%20React%2019-c5a059.svg)](#)
[![Theme: Luxury Dark Corporate](https://img.shields.io/badge/Design-Luxury%20Corporate%20Dark-c5a059.svg)](#)

---

## 📋 Product Overview

**TruckTracker** is an internal company logistics application built to streamline operations between dispatch managers and company drivers.

### 🚫 What this application is NOT:
- Not a public delivery marketplace or customer app
- Not an Uber/Porter/Swiggy/Delhivery clone
- Not a bloated HR/payroll portal
- Not an expensive SaaS subscription platform

### 🎯 Core Principles:
1. **SIMPLE FOR THE DRIVER**: A mobile-first, step-by-step guided action flow designed for safe use when stopped (`START` → `ARRIVE` → `ACTIVITY` → `PHOTO` → `DEPART` → `RETURN` → `BASE` → `COMPLETE`).
2. **CLEAR FOR THE MANAGER**: Real-time operational visibility, "Attention Required" exception monitoring, chronological event timelines, interactive GPS route maps, and daily reports.
3. **ACCURATE FOR THE COMPANY**: Automatic server-side timestamps, non-fabricatable GPS event points, geofencing verification (100–250m radius), photo proof records, delay tracking, and Google Sheets operational sync.

---

## 🗺️ Single Trip, Multiple Destinations (Core Architecture)

A critical requirement of TruckTracker is that **one trip can contain 1, 2, 3, 5, or 10+ destination stops**:

```text
COMPANY DEPOT (HQ)
       │
       ▼
   STOP 1: ABC Warehouse  ───► Arrived 09:14 AM  •  Activity (Delivery)  •  Departed 09:42 AM
       │
       ▼
   STOP 2: XYZ Store      ───► Arrived 10:31 AM  •  Delay (Traffic 22m)  •  Departed 11:20 AM
       │
       ▼
   STOP 3: PQR Depot      ───► Arrived 12:05 PM  •  Activity (Pickup)    •  Departed 12:35 PM
       │
       ▼
   RETURN JOURNEY         ───► Started 12:36 PM
       │
       ▼
   COMPANY DEPOT (HQ)     ───► Arrived 01:42 PM  •  Trip Completed 01:45 PM
```

All stops and events belong to the **same parent trip record**, maintaining continuity of operational timeline, distance calculation, delays, and photo proofs.

---

## 🏗️ Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| **Backend Runtime** | Node.js 24 + Express + TypeScript | Modern, ultra-fast asynchronous I/O |
| **Relational Database** | Node 24 Native `DatabaseSync` (`node:sqlite`) | High concurrency, zero external daemon requirements, zero native build issues, full WAL mode and foreign key cascading |
| **Frontend Framework** | Vite + React 19 + TypeScript | Instant HMR, minimal bundle size, fast mobile rendering |
| **Styling & Aesthetics** | Pure Vanilla CSS Design System | Custom luxury corporate dark tokens (Charcoal `#0e1013`, Slate `#1a1e26`, Champagne Gold `#c5a059`), zero heavy utility frameworks |
| **Mapping Engine** | Leaflet.js + OpenStreetMap (CartoDB Dark) | Clean visual mapping of HQ depot, numbered stops, GPS breadcrumb coordinates, and vehicle route |
| **Camera & Geolocation** | HTML5 MediaDevices & Geolocation API | Live camera stream with canvas snapshot + file picker fallback; high-accuracy GPS with accuracy variance |
| **Offline Protection** | LocalStorage Event Queue with Idempotency | Automatic queueing during network dropouts; auto-drain upon reconnection |
| **Operational Sync** | Google Sheets Synchronization Engine | Real-time synchronization for 8 operational tabs with retry mechanism |

---

## ⚡ Quick Start & Setup

### 1. Prerequisites
- **Node.js**: v22.5.0 or v24+ (Node 24 recommended)
- **Git**

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/Nixxzzzzz/truck_tracker.git
cd truck_tracker

# Install server and client dependencies
cd server && npm install
cd ../client && npm install
cd ..
```

### 3. Seed Database with Realistic Fleet Data
```bash
cd server
npx tsx src/seed.ts
cd ..
```

### 4. Run Development Servers
```bash
# Terminal 1: Backend Server (Port 5000)
cd server
npx tsx src/index.ts

# Terminal 2: Frontend Client (Port 5173)
cd client
npm run dev
```

Open your browser at **`http://localhost:5173`**.

---

## 🔑 Default Seed Accounts

The database comes pre-seeded with realistic logistics company data:

| Role | Email | Password | Intended Interface |
|---|---|---|---|
| **Operations Manager** | `manager@company.com` | `manager123` | Desktop / Tablet Command Dashboard |
| **Lead Driver (Rahul)** | `rahul@company.com` | `driver123` | Mobile-First Guided Driver Interface |
| **Driver (Amit)** | `amit@company.com` | `driver123` | Mobile-First Guided Driver Interface |
| **Driver Test Alias** | `driver@company.com` | `driver123` | Mobile-First Guided Driver Interface |

> 💡 *A floating **QA Role Switcher** is pinned to the bottom-left corner of the interface, allowing immediate switching between the Mobile Driver View and Desktop Manager Command Center without re-authenticating.*

---

## 📊 Google Sheets Operational Sync

TruckTracker keeps company database records as the **primary source of truth**. Data is synchronized to 8 operational sheets:

1. **`Trips`**: Trip ID, Date, Driver, Vehicle, Status, Starting Location, Planned Departure, Actual Start, Base Arrival, Completion, Delays, Distance
2. **`Stops`**: Trip ID, Stop ID, Stop Number, Destination, Planned/Actual Arrival, Activity, Departure, Status, Delay Variance
3. **`Events`**: Event ID, Trip ID, Event Type, Timestamp, Driver, Vehicle, Latitude, Longitude, GPS Accuracy
4. **`Delays`**: Delay ID, Trip ID, Reason, Duration Minutes, Start/End Time, Driver, Location
5. **`Activities`**: Activity ID, Type, Status, Completion Time, Quantity, Reference Number, Signoff
6. **`Photos`**: Photo ID, Category, Driver, Vehicle, Timestamp, GPS, Storage URL
7. **`Drivers`**: Driver ID, Name, Phone, Employee ID, Status, Assigned Vehicle
8. **`Vehicles`**: Vehicle Plate Number, Model, Type, Status, Assigned Driver

### Configuring Live Google Sheets:
Set the following environment variables in `.env`:
```env
GOOGLE_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account",...}
```
*If credentials are not supplied, TruckTracker automatically runs in **Local Operational Logging Mode**, maintaining sync logs with status `SYNCED`/`FAILED` and full retry capability.*

---

## 🧪 Automated Testing & Production Hardening

TruckTracker includes two complete automated verification suites covering end-to-end operational lifecycles and real-world edge cases.

### 1. Production Hardening Test Suite (20 Real-World Scenarios)
Verifies all 20 specific real-world edge cases specified in Section 29:
```bash
cd server
npx tsx src/testProductionScenarios.ts
```
**Results: 20 PASSED, 0 FAILED**
- ✅ **TEST 01**: Single destination normal trip (HQ → Stop 1 → Return → Base → Complete)
- ✅ **TEST 02**: Two destination normal trip (HQ → Stop 1 → Stop 2 → Return → Base)
- ✅ **TEST 03**: Five destination normal trip (Sequence preservation & stop counts)
- ✅ **TEST 04**: Multiple destination trip with delay reporting
- ✅ **TEST 05**: Multiple destination trip with multiple consecutive delays
- ✅ **TEST 06**: Required delivery photo enforcement (strictly blocks completion without photo)
- ✅ **TEST 07**: Optional photo allows continuation without blocker
- ✅ **TEST 08**: GPS unavailable handling (records `GPS UNAVAILABLE`, never fabricates coordinates)
- ✅ **TEST 09**: Poor GPS accuracy recorded faithfully (marks variance if > 300m)
- ✅ **TEST 10**: Network unavailable offline event queue with idempotency keys
- ✅ **TEST 11**: Network returns and synchronizes queue without duplicates
- ✅ **TEST 12**: Failed activity flagged in manager's Attention Required feed
- ✅ **TEST 13**: Invalid driver action state machine rejections (blocks premature departure, double completion, delay after completion)
- ✅ **TEST 14**: Trip cancellation with mandatory audit log reason
- ✅ **TEST 15**: Google Sheets sync failure logging (DB remains unaffected source of truth)
- ✅ **TEST 16**: Google Sheets retry mechanism (retries and resolves failed syncs)
- ✅ **TEST 17**: Manager edits trip before start with audit log tracking
- ✅ **TEST 18**: Manager reorders destinations before start with automatic stop renumbering
- ✅ **TEST 19**: Unauthorized driver access security guard (Driver A cannot access Driver B's trips)
- ✅ **TEST 20**: Complete 10-stop trip & report calculations verification (trips, stops, delays, CSV export)

### 2. Baseline Operational Lifecycle Test Suite (20 Workflow Steps)
```bash
cd server
npx tsx src/testWorkflow.ts
```
**Results: 20 PASSED, 0 FAILED**

---

## 💾 Database Backup & Restore Procedure

TruckTracker uses Node 24 native SQLite in **WAL (Write-Ahead Logging)** mode for superior concurrency and durability.

### Automated Backup Command
To perform a live, zero-downtime backup with WAL checkpointing and integrity verification:
```bash
cd server
npx tsx src/backup.ts backup
```
This produces a verified snapshot in `server/data/backups/truck_tracker_backup_<timestamp>.sqlite` and outputs table row counts.

### Restore Command
To restore from a backup snapshot:
```bash
cd server
npx tsx src/backup.ts restore server/data/backups/truck_tracker_backup_<timestamp>.sqlite
```

---

## 🔒 Security, Integrity & Offline Resilience

- **Anti-Tampering Timestamps**: All operational timestamps (`actual_start_time`, `actual_arrival_time`, `actual_departure_time`, `delay_start_time`, `delay_end_time`, `return_start_time`, `base_arrival_time`, `trip_completion_time`) are generated strictly by the server. Changing the driver's phone clock has zero effect on operational records.
- **Planned vs Actual Separation**: Planned arrival times are immutable records. Differences are recorded as operational variance metrics and never overwrite planned targets.
- **Driver Trip Isolation**: Drivers can only query, view, or mutate trips explicitly assigned to their driver ID (`trip.driver_id === req.user.id`). Unauthorized requests return HTTP 404/403.
- **Offline Event Queue**: When mobile network connectivity drops, events are stored locally in IndexedDB/LocalStorage with unique UUID idempotency keys. Upon network restoration, events are drained sequentially without duplicate creation.
- **Google Sheets Resilience**: SQLite database remains the sole authoritative source of truth. Google Sheets is an asynchronous reporting replica; if Google Sheets API fails or network drops, failed records are logged and retried automatically without interrupting fleet operations.

---

## 📄 License
Internal Company Logistics Proprietary Software. All rights reserved.
