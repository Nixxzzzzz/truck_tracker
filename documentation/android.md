# 📱 TruckTracker — Android Application Guide

## 1. Overview & Technology Stack

The TruckTracker Android application is a native client designed exclusively for company logistics drivers operating in the field.

| Component | Library / API |
|---|---|
| **Language & Tooling** | Kotlin 2.0.21, Android SDK 34, AGP 8.7.3 |
| **UI Framework** | Jetpack Compose & Material 3 |
| **Local Persistence** | Android Room Database (Offline Queue) |
| **Secure Storage** | EncryptedSharedPreferences (AES256-SIV / AES256-GCM) |
| **Networking** | Retrofit 2.11 + OkHttp 4.12 + HttpLoggingInterceptor |
| **Hardware Camera** | CameraX 1.4.1 (CameraCore, Camera2, Lifecycle, View) |
| **Location Services** | Google Play Services Fused Location Provider |
| **Network Monitoring** | Android `ConnectivityManager` NetworkCallback |

---

## 2. Driver UX Principles

The mobile interface is designed for fast, one-handed operational interaction while a vehicle is parked or stopped:
- **No Complex Dashboards**: The driver sees only their current route, active destination, and primary action.
- **Large Touch Targets**: All primary action buttons have a minimum height of 56dp.
- **High-Contrast Dark Theme**: Styled in Luxury Charcoal (`#0E1013`) and Slate (`#1A1E26`) with Champagne Gold (`#C5A059`) accents.
- **Clear Exception States**: Persistent warning banners for delays, offline status, or GPS unavailability.

---

## 3. The 20 Driver Screens & States

1. **Splash Screen & Session Loader**: Validates existing JWT tokens and redirects directly to Home if authenticated.
2. **Login Screen**: Authenticates drivers against `/api/auth/login`. Pre-filled demo credentials: `rahul@company.com` / `driver123`.
3. **Driver Home**: Active vehicle display, progress summary ("2 of 4 stops completed"), next destination, and primary action.
4. **Today's Trips Screen**: Dispatched routes assigned to the driver.
5. **Trip Details Screen**: Complete multi-stop trip sequence overview (`Base → Stop 1 → Stop 2 → ... → Base`).
6. **Stop Details Screen**: Customer address, contact person, instructions, and cargo info.
7. **Arrival & Geofence Screen**: Live FusedLocation check against the destination's 100–250m radius.
8. **Activity Screen**: Delivery/pickup signoff, quantity confirmation, and photo check.
9. **Camera Screen**: CameraX hardware capture with viewfinder and orientation lock.
10. **Photo Review Screen**: Preview captured proof photo, select category, and confirm.
11. **Delay Report Screen**: Reason selection (Traffic, Breakdown, Weather, Customer Unavailable, etc.) and notes.
12. **Active Delay Banner**: Persistent visual banner with elapsed timer and "Resolve Delay" action.
13. **Return Journey Screen**: Trigger departure from final stop back to company base.
14. **Base Arrival Screen**: Record arrival at company depot gate.
15. **Trip Completion Summary**: Statistical summary of stops visited, operational duration, and delays.
16. **Trip History Screen**: Historical completed trips.
17. **Driver Profile Screen**: Driver name, employee ID, assigned truck plate, and logout.
18. **Offline Queue Screen**: Pending events counter with "Saved — waiting for network" and manual sync.
19. **Error / GPS Unavailable Screen**: Clean recoverable error states with retry controls; coordinates are never fabricated.
20. **Runtime Permission Requester**: Android runtime permission handler for Fine Location and Camera.

---

## 4. Hardware Integrations

### Location & Geofencing
- `FusedLocationProviderClient` requests `PRIORITY_HIGH_ACCURACY`.
- Accuracy variance (>300m) is flagged in event payloads.
- Geofence calculation uses the Haversine formula against `destination.latitude`, `destination.longitude`, and `destination.geofence_radius`.
- If GPS is disabled or denied, the app displays `"Location unavailable. Please enable location and try again"` and transmits `GPS UNAVAILABLE` with `NULL` coordinates.

### CameraX & Photo Proofs
- Captures JPEG images to internal app storage (`context.filesDir/photos/`).
- Enforces photo requirement before completing delivery activities if `photo_required == 1`.
- Attaches application metadata: Trip ID, Stop ID, Driver ID, Vehicle Plate, Photo Category, Server Timestamp, and GPS accuracy.

---

## 5. Offline Queue & Idempotency

When the device loses network connectivity:
1. The driver action is serialized as an `OfflineEventEntity` with a unique UUID `idempotency_key` and saved in Room.
2. The UI displays `"Saved — waiting for network"`.
3. When `NetworkMonitor` detects network availability, `SyncManager` automatically drains the queue sequentially.
4. The server receives the `idempotency_key` and processes the event without creating duplicates.
