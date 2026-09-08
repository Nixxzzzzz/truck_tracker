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

## 🧪 Automated End-to-End Test Suite

Run the comprehensive 19-step workflow test suite verifying the entire product lifecycle:
```bash
cd server
npx tsx src/testWorkflow.ts
```

**Workflow Steps Tested:**
1. Manager Authentication
2. Fleet & Driver Querying
3. Manager Multi-Stop Trip Creation
4. Driver Authentication
5. Driver Assigned Trip Inspection
6. Driver Starts Trip (`IN_PROGRESS`, start timestamp + GPS recorded)
7. State Machine Guard (Prevents completion without visiting stops / base arrival)
8. Driver Arrives at Stop 1 (`ARRIVED`, geofence verified, variance recorded)
9. Driver Completes Delivery Activity (Quantity 25, recipient name)
10. Driver Departs Stop 1 (`COMPLETED`, remaining stops updated)
11. Driver Reports Delay (Reason: Traffic, GPS captured, status `DELAYED`)
12. Driver Resolves Delay (Duration calculated automatically)
13. Stop 2 Completion & Departure
14. Driver Starts Return Journey (`RETURNING`)
15. Driver Arrives at Base (`base_arrival_time` recorded)
16. Driver Completes Entire Trip (Distance calculated from GPS points, vehicle released to `AVAILABLE`)
17. Manager Timeline Generation (8+ chronological events)
18. Daily Operational Report & CSV Export
19. Google Sheets Synchronization Verification

---

## 🔒 Security & Offline Resilience

- **JWT Authentication**: Secure Bearer tokens with 30-day sessions
- **Password Protection**: BCrypt salted hashing
- **Role Guards**: Backend API middleware (`requireRole('MANAGER')` vs driver endpoints)
- **Local Storage Event Queue**: Captures actions if network drops; automatically drains with idempotency keys upon reconnection
- **Photo Security**: Protected photo file streaming endpoint (`/api/photos/:id/file`) with MIME type validation

---

## 📄 License
Internal Company Logistics Proprietary Software. All rights reserved.
