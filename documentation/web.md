# 🖥️ TruckTracker — Web Manager Application Guide

## 1. Overview & Technology Stack

The Web application is the primary operations and dispatch command center for company managers, dispatchers, and fleet administrators.

| Component | Technology |
|---|---|
| **Framework** | React 19 + TypeScript 5.7 |
| **Build Tool** | Vite 6.1 (ESM, Fast HMR) |
| **Styling** | Custom Pure Vanilla CSS (Luxury Corporate Dark Design System) |
| **Interactive Mapping** | Leaflet.js 1.9 + OpenStreetMap CartoDB Dark |
| **Icons** | Lucide React |

---

## 2. Managerial Workflow & Navigation

Primary Navigation:
- **Dashboard**: High-level operational KPIs, active route cards, and Attention Required alerts.
- **Trips**: Complete list of planned, in-progress, delayed, and completed trips with filtering.
- **Active Trips**: Filtered real-time operational view of vehicles currently on the road.
- **Drivers**: Fleet driver registry, assigned vehicles, and availability status.
- **Vehicles**: Fleet vehicle registry, maintenance flags, and odometer tracking.
- **Destinations**: Pre-configured customer warehouses, retail stores, and depot coordinates.
- **Reports**: Daily, weekly, and monthly operational summaries with CSV and Excel export.
- **Settings & ERP**: System administration, driver/manager user access control, and SAP ONE Portal integration gateway.
- **Audit**: Comprehensive historical audit log tracking state modifications, cancellations, and user actions.

---

## 3. Key Operational Capabilities

### A. Manager KPI Command Dashboard
- Live database-calculated metrics: Today's Trips, Vehicles On Road, Completed Routes, Delayed Trips, Fleet Availability.
- Active fleet table detailing Trip ID, Driver, Vehicle Plate, Current Destination, Remaining Stops, and Status.
- **Attention Required Badge**: Surfaces delayed trips, unstarted overdue trips, missing proof photos, failed activities, and vehicles in maintenance.

### B. Multi-Stop Trip Builder
- Supports 1, 2, 3, 5, or 10+ destination stops per trip (`Base Depot → Stop 1 → Stop 2 → ... → Base Depot`).
- Intuitive drag-and-drop or sequential reordering prior to dispatch.
- Adding or deleting destination stops automatically re-indexes stop numbers (`stop_number: 1, 2, 3...`) with audit log preservation.

### C. Interactive Route Map
- Visualizes base depot (HQ marker), numbered destination stops, and vehicle breadcrumb GPS coordinates.
- Displays destination geofence circles (100–250m radius) for visual verification.
- Event markers for arrival points, departure points, and reported delay locations.

### D. Operational Reports & Exports
- Real-time aggregations calculated from SQLite database records:
  - Total trips, completed trips, delayed trips, cancelled trips.
  - Total delay duration (minutes) and average delay duration.
  - Average trip duration and on-time arrival percentage.
  - Vehicle fleet utilization and driver trip distribution.
  - Delay reason breakdowns (Traffic, Breakdown, Weather, Customer Unavailable, etc.).
- Instant one-click export to CSV.
