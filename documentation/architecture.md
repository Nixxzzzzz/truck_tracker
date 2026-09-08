# 🏛️ TruckTracker — System Architecture Documentation

## 1. Architectural Overview

TruckTracker is an internal logistics operational system designed for company fleets, field drivers, and dispatch managers. It consists of:
1. **Native Android Driver Application (`android/`)**: Primary mobile field client for drivers.
2. **Web Manager Application (`web/`)**: Primary desktop/tablet command center for dispatch managers and administrators.
3. **Shared Contracts & Models (`shared/`)**: Canonical data models, event definitions, and API contracts.
4. **Authoritative Shared Backend (`server/`)**: Express + Node.js 24 + SQLite (WAL mode) enforcing all business rules, authentication, event integrity, photo storage, reporting, and Google Sheets synchronization.

```text
┌─────────────────────────────────────────────────────────┐
│               FIELD OPERATIONS (DRIVERS)                │
│         Native Android Client (Kotlin / Compose)        │
│    • CameraX Photo Proof    • Fused Location Services   │
│    • Room Offline Queue     • Geofence Verification     │
└───────────────────────────┬─────────────────────────────┘
                            │
                            │ HTTPS / REST (JWT Bearer)
                            │
┌───────────────────────────▼─────────────────────────────┐
│             DISPATCH COMMAND (MANAGERS / ADMINS)        │
│          Web Application (React 19 / TypeScript)        │
│    • Command Center Dashboard   • Leaflet Route Map     │
│    • Multi-Stop Trip Builder    • Operational Reports   │
└───────────────────────────┬─────────────────────────────┘
                            │
                            │ HTTPS / REST (JWT Bearer)
                            │
┌───────────────────────────▼─────────────────────────────┐
│                 SHARED BACKEND & API ENGINE             │
│            Node.js 24 + Express + TypeScript            │
│  ┌───────────────────────────────────────────────────┐  │
│  │ State Machine & Business Rule Validator           │  │
│  │ Server-Authoritative Timestamp Engine             │  │
│  │ Geofence & GPS Accuracy Verifier                  │  │
│  │ Offline Idempotency & De-duplication Handler      │  │
│  │ Photo Storage & Security Streamer                 │  │
│  │ Operational Reporting & Aggregations              │  │
│  │ Google Sheets 8-Tab Real-Time Sync Engine         │  │
│  └───────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│                 PRIMARY SOURCE OF TRUTH                 │
│              SQLite Relational Database (WAL)           │
│    Trips • Stops • Events • Delays • Photos • Audit     │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Principles

### A. Backend as the Sole Source of Truth
- Neither the Android app nor the Web app connect directly to SQLite or read/write database files.
- All operations flow through authenticated REST API endpoints guarded by JWT authentication and Role-Based Access Control (RBAC).
- The backend independently validates state transitions, arrival distances, and required photos before modifying database state.

### B. Single Trip, Multiple Destinations
- A route containing 1, 2, 3, 5, or 10+ stops is treated as **ONE Trip** (`Trip`) containing multiple sequential stops (`TripStop`):
  ```text
  Trip TR-2026-00001
  ├── Stop 1: ABC Warehouse (Delivery, Quantity: 20)
  ├── Stop 2: XYZ Retail (Pickup, Quantity: 5)
  ├── Stop 3: Central Depot (Delivery, Quantity: 15)
  └── Base Depot Return
  ```
- Reordering stops prior to trip dispatch preserves the parent trip ID and automatically re-indexes stop numbers (`stop_number: 1, 2, 3...`) with audit log preservation.

### C. Server-Authoritative Timestamps
- Operational event timestamps (`actual_start_time`, `actual_arrival_time`, `actual_departure_time`, `delay_start_time`, `delay_end_time`, `return_start_time`, `base_arrival_time`, `trip_completion_time`) are generated on the server using `new Date().toISOString()`.
- Tampering with the driver's Android phone clock has zero effect on operational records.
- Planned arrival times are immutable baselines; variance is calculated and displayed separately (+/- minutes) and never overwrites planned targets.

### D. GPS & Geofence Integrity
- The system **never fabricates GPS coordinates**.
- If GPS is disabled, blocked, or unavailable, the system records `GPS UNAVAILABLE` with `NULL` coordinates.
- Geofence radius is configurable per destination (default 100–250m) and evaluated using the Haversine formula against actual device coordinates.
- Location coordinates with low accuracy (>300m) are faithfully logged with their accuracy metric and flagged.

### E. Offline Resilience & Idempotency
- When mobile network connectivity drops, events are stored locally in Room (`offline_events`) with unique UUID idempotency keys.
- Upon network restoration, the queue drains automatically. If a network dropout occurs mid-request, the backend safely treats repeated requests idempotently based on `idempotency_key`, preventing duplicate operational events.

### F. Google Sheets Synchronization
- The SQLite database remains the authoritative operational record.
- Google Sheets acts as an asynchronous reporting replica across 8 dedicated tabs (*Trips, Stops, Events, Delays, Activities, Photos, Drivers, Vehicles*).
- If Google Sheets API credentials are missing or the Google API fails, the application records a failed sync record in the database for later retry, without interrupting driver operations.
