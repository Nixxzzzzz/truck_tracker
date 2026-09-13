# TruckTracker REST API Catalog

This document details all active HTTP API endpoints provided by the Express backend.

---

## Base URL
- **Local Development**: `http://localhost:5000/api`
- **Render Production**: `https://truck-tracker-api-9yhq.onrender.com/api`

All authenticated endpoints require an HTTP header:
```http
Authorization: Bearer <JWT_TOKEN>
```

---

## 1. Authentication & Session

### `POST /api/auth/login`
- **Purpose**: Authenticate user credentials and receive a signed JWT.
- **Request Body**:
  ```json
  {
    "email": "manager@company.com",
    "password": "manager123"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "usr-uuid",
      "name": "Sunil Mehta",
      "email": "manager@company.com",
      "role": "MANAGER",
      "phone": "+91 98100 11223"
    }
  }
  ```

### `GET /api/auth/me`
- **Purpose**: Validate existing JWT token and retrieve active user profile.
- **Response `200 OK`**: `{ "user": { ... } }`

---

## 2. Dispatch Manifests & Trips

### `GET /api/trips`
- **Role**: `MANAGER`
- **Query Parameters**:
  - `date` (optional): `YYYY-MM-DD`
  - `status` (optional): `'PLANNED'`, `'IN_PROGRESS'`, `'COMPLETED'`, etc.
  - `search` (optional): Text search across trip ID, vehicle plate, driver name.
  - `limit` (optional): Integer (default 50).
  - `offset` (optional): Integer (default 0).
- **Response `200 OK`**: `{ "trips": [ ... ] }`

### `GET /api/trips/:id`
- **Role**: `MANAGER`
- **Response `200 OK`**: Complete trip manifest with stops, activities, photos, delays, events, and audit logs.

### `POST /api/trips`
- **Role**: `MANAGER`
- **Request Body**:
  ```json
  {
    "date": "2026-09-14",
    "driver_id": "driver-uuid",
    "vehicle_id": "vehicle-uuid",
    "starting_location": "Company North Central Depot",
    "purpose": "Commercial Restocking",
    "reference_number": "PO-2026-9912",
    "planned_departure_time": "08:30",
    "notes": "Fragile electronic cargo",
    "stops": [
      {
        "destination_id": "dest-uuid",
        "destination_name": "Lajpat Nagar Hub",
        "address": "Ring Road, Lajpat Nagar",
        "latitude": 28.5677,
        "longitude": 77.2433,
        "geofence_radius_meters": 150,
        "planned_arrival_time": "09:30"
      }
    ]
  }
  ```
- **Response `201 Created`**: `{ "message": "Trip created", "tripId": "TR-2026-00004" }`

---

## 3. Fleet Assets & Compliance

### `GET /api/fleet/vehicles`
- **Role**: Authenticated
- **Response `200 OK`**: `{ "vehicles": [ ... ] }`

### `POST /api/fleet/vehicles`
- **Role**: `MANAGER`
- **Request Body**: `{ "vehicle_number": "DL01 TA 4920", "vehicle_type": "Refrigerated Express", "model": "Tata Ultra T.7" }`

### `GET /api/fleet/vehicles/:id/documents`
- **Role**: Authenticated
- **Response `200 OK`**: `{ "documents": [ ... ] }` (RC, Insurance, Fitness, PUC with status and expiry dates)

### `GET /api/fleet/vehicles/:id/maintenance`
- **Role**: Authenticated
- **Response `200 OK`**: `{ "maintenanceRecords": [ ... ] }`

### `GET /api/fleet/exceptions`
- **Role**: Authenticated
- **Query Parameters**: `status` (`OPEN` | `ACKNOWLEDGED` | `RESOLVED`), `severity`
- **Response `200 OK`**: `{ "exceptions": [ ... ] }`

---

## 4. Reports & Analytics

### `GET /api/reports/daily?date=YYYY-MM-DD`
- **Role**: `MANAGER`
- **Response `200 OK`**:
  ```json
  {
    "date": "2026-09-13",
    "overview": {
      "totalTrips": 3,
      "completedTrips": 1,
      "activeTrips": 2,
      "delayedTrips": 1,
      "totalDestinations": 8,
      "totalDelayMinutes": 22,
      "totalDelayFormatted": "0h 22m",
      "onTimePercentage": 88
    },
    "trips": [ ... ],
    "delayReasons": [ ... ],
    "driverSummary": [ ... ],
    "vehicleSummary": [ ... ]
  }
  ```

### `GET /api/reports/periodic?period=weekly|monthly`
- **Role**: `MANAGER`
- **Response `200 OK`**: Rolling window metrics, aggregate throughput, driver summaries, and delay Pareto distributions.

### `GET /api/reports/export?date=YYYY-MM-DD`
- **Role**: `MANAGER`
- **Response `200 OK`**: `Content-Type: text/csv` spreadsheet export.
