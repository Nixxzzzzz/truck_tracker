# 📖 TruckTracker — Operations Manual

## Part 1: Field Driver Operations Manual

### 1. Daily Sign In
1. Open the **TruckTracker** app on your company-issued Android device.
2. Enter your Driver Email/ID and Password. Tap **SIGN IN**.
3. You will arrive at the **Driver Home** screen displaying your assigned vehicle and today's route.

### 2. Starting Your Route
1. When your vehicle is loaded and ready at the company depot, tap **START ROUTE**.
2. The app will record your departure time and initial depot location.

### 3. Arriving at a Destination
1. When parked safely at the destination warehouse or customer location, tap **ARRIVE AT STOP**.
2. The app checks your GPS against the location's 100–250m geofence.
3. If verified, tap **CONFIRM ARRIVAL**. If GPS is weak, tap **RETRY GPS CHECK**.

### 4. Completing Delivery / Activity & Capturing Proof
1. Enter the delivered quantity and the recipient's name or reference signature.
2. If marked **PHOTO REQUIRED**, tap **CAPTURE**.
3. Point your camera at the delivery cargo/waybill and tap the shutter button.
4. Review the image and tap **CONFIRM**.
5. Tap **COMPLETE ACTIVITY**.

### 5. Departing the Stop
1. After completing cargo activity, tap **DEPART STOP**.
2. The app advances your route counter: `"Stop 2 of 4 Completed"`.

### 6. Reporting an Operational Delay
1. If delayed by heavy traffic, mechanical breakdown, or waiting at customer premises, tap **REPORT DELAY**.
2. Select the reason (Traffic, Breakdown, Weather, Customer Unavailable, etc.) and add notes.
3. Tap **SUBMIT DELAY REPORT**. The screen will display a red **ACTIVE DELAY** banner.
4. Once transit resumes, tap **RESOLVE DELAY**. Duration is automatically calculated.

### 7. Returning to Base Depot & Trip Completion
1. When the final stop is completed, tap **START RETURN TO BASE**.
2. Upon reaching the company depot gate, tap **RECORD BASE ARRIVAL**.
3. Tap **COMPLETE ENTIRE TRIP**. Your vehicle status is released back to `AVAILABLE`.

---

## Part 2: Dispatch Manager Operations Manual

### 1. Creating a Multi-Stop Route
1. Log in to the Web Manager Dashboard at `http://localhost:5173`.
2. Click **Create Trip**.
3. Select an available **Driver** and **Vehicle**.
4. Set the planned departure time and base depot.
5. Click **Add Destination** to add Stop 1, Stop 2, Stop 3, etc.
6. For each stop, select whether a proof photo is required.
7. Reorder stops as necessary, then click **Save Trip**.

### 2. Monitoring Fleet Operations
1. View the **Manager Dashboard** for real-time KPIs: Today's Trips, Vehicles in Transit, Completed, Delayed.
2. Inspect the **Attention Required** feed to quickly address delayed routes or missing photos.
3. Open the **Route Map** to view depot locations, destination pins, geofence radius circles, and breadcrumb GPS events.

### 3. Generating Daily Reports & Exporting Data
1. Navigate to **Reports**.
2. Select the timeframe (**Daily**, **Weekly**, or **Monthly**).
3. Review total trip counts, on-time arrival %, average trip duration, and delay reasons.
4. Click **Export CSV** to download a spreadsheet for company accounting.

### 4. Google Sheets Synchronization
1. Navigate to **Google Sheets**.
2. Monitor synchronization across all 8 operational tabs.
3. If any rows indicate `FAILED` (e.g. due to temporary Google API downtime), click **Retry Failed Sync**.
