# Database Architecture & Persistence Strategy

## 1. Relational Engine Specification
TruckTracker utilizes the Node 22 native synchronous SQLite engine (`node:sqlite.DatabaseSync`).

### Key PRAGMAs & Guarantees
- **`PRAGMA journal_mode = WAL;`**:
  Write-Ahead Logging provides concurrent read access while write operations execute, eliminating reader-writer lock contention during high-frequency GPS telemetry pings.
- **`PRAGMA foreign_keys = ON;`**:
  Strict referential integrity enforcement. Foreign key violations (such as creating stops without a valid `trip_id` or assigning trips to non-existent drivers) are rejected at the database engine level.
- **`BEGIN IMMEDIATE;`**:
  Transactional operations (e.g. creating a multi-stop trip manifest with activities) execute in immediate mode, preventing deadlock and ensuring atomic rollback on failure.

---

## 2. Render Persistence Audit & Storage Realities

### Free Tier Single-Instance Environment
- **Container Disk Nature**: The filesystem on Render Web Services (`plan: free`) is **ephemeral**.
- **Persistence Reality**: If the free web service spins down after 15 minutes of inactivity or upon deployment of a new commit, local files (including `data/truck_tracker.sqlite`) are recreated fresh.
- **Auto-Boot Mitigation**:
  The application migration runner (`server/src/migrations/runner.ts`) executes idempotently on startup (`initDatabase()`). If the database file is fresh, it constructs all 16 relational tables and default seed data automatically, ensuring zero runtime failure on cold boot.

### Production Enterprise Path (PostgreSQL Migration)
For multi-node, high-availability deployments, the persistence layer can be switched to PostgreSQL:
1. SQLite queries use standard ANSI SQL (`SELECT`, `INSERT`, `UPDATE`, `JOIN`, `GROUP BY`, `ORDER BY`).
2. Schema migrations (`001`, `002`, `003`) map 1:1 to standard PostgreSQL data types:
   - `TEXT` → `VARCHAR` / `TEXT`
   - `INTEGER` → `INT` / `BIGINT`
   - `REAL` → `DOUBLE PRECISION`
   - `DATETIME` → `TIMESTAMPTZ`
3. A connection adapter wrapping `pg` or `pg-promise` satisfies the identical query interface without rewriting business logic in `routes/trips.ts` or `routes/fleet.ts`.

---

## 3. Indexing Strategy & Query Plans

Indexes were introduced based on actual query access patterns:

| Index Name | Table & Columns | Target Query Pattern |
| :--- | :--- | :--- |
| `idx_trips_driver_status` | `trips(driver_id, status)` | Filter driver active trips on mobile terminal startup (`GET /api/driver/trips/active`) |
| `idx_trips_date` | `trips(date)` | Manager daily manifest dispatch query & reporting aggregation (`GET /api/trips?date=...`) |
| `idx_trip_stops_trip_order` | `trip_stops(trip_id, stop_number)` | Chronological stops retrieval for manifest detail (`GET /api/trips/:id`) |
| `idx_events_trip_time` | `trip_events(trip_id, timestamp)` | Timeline event stream generation in audit dossier |
| `idx_delays_trip` | `delays(trip_id)` | Active unresolved delays retrieval for manager attention feed |
| `idx_vehicle_docs_vehicle` | `vehicle_documents(vehicle_id, expiry_date)` | Vehicle compliance certificate expiration audit |
| `idx_sheet_sync` | `google_sheet_sync(sheet_name, sync_status)` | Google Sheets outbox sync worker polling pending records |
