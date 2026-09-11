import { User, Vehicle, Driver, Destination, Trip, Photo } from '../types';

export const DEMO_USERS: Record<string, User> = {
  'manager@company.com': {
    id: 'usr-mgr-001',
    name: 'Sunil Mehta (Operations Manager)',
    email: 'manager@company.com',
    role: 'MANAGER',
    phone: '+91 98100 11223'
  },
  'rahul@company.com': {
    id: 'usr-drv-001',
    name: 'Rahul Sharma (Senior Driver)',
    email: 'rahul@company.com',
    role: 'DRIVER',
    phone: '+91 98101 44556'
  },
  'amit@company.com': {
    id: 'usr-drv-002',
    name: 'Amit Verma (Express Driver)',
    email: 'amit@company.com',
    role: 'DRIVER',
    phone: '+91 98102 77889'
  },
  'rajesh@company.com': {
    id: 'usr-drv-003',
    name: 'Rajesh Kumar (Heavy Freight Driver)',
    email: 'rajesh@company.com',
    role: 'DRIVER',
    phone: '+91 98103 99001'
  },
  'driver@company.com': {
    id: 'usr-drv-001',
    name: 'Rahul Sharma (Test Driver)',
    email: 'driver@company.com',
    role: 'DRIVER',
    phone: '+91 98101 44556'
  }
};

const today = new Date().toISOString().split('T')[0];

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'v-001',
    vehicle_number: 'DL01 TA 4920',
    vehicle_type: 'Refrigerated Express',
    model: 'Tata Ultra T.7 (14ft High Deck)',
    assigned_driver_id: 'usr-drv-001',
    assigned_driver_name: 'Rahul Sharma',
    status: 'ON_TRIP',
    notes: 'Fitted with telematics, GPS tracker, and thermal sensor'
  },
  {
    id: 'v-002',
    vehicle_number: 'UP16 BT 9845',
    vehicle_type: 'Medium Freight',
    model: 'Ashok Leyland Ecomet Star 1115',
    assigned_driver_id: 'usr-drv-002',
    assigned_driver_name: 'Amit Verma',
    status: 'AVAILABLE',
    notes: 'Noida-NCR intercity permit active, maintenance passed'
  },
  {
    id: 'v-003',
    vehicle_number: 'DL1L AA 3180',
    vehicle_type: 'Heavy Freight',
    model: 'BharatBenz 1617R (24ft Container)',
    assigned_driver_id: 'usr-drv-003',
    assigned_driver_name: 'Rajesh Kumar',
    status: 'ON_TRIP',
    notes: 'Multi-axle heavy hauler for industrial machinery & FMCG'
  },
  {
    id: 'v-004',
    vehicle_number: 'UP14 EX 7621',
    vehicle_type: 'City Box Hauler',
    model: 'Mahindra Furio 12',
    status: 'MAINTENANCE',
    notes: 'Scheduled brake disc replacement at Okhla workshop'
  }
];

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'drv-001',
    user_id: 'usr-drv-001',
    name: 'Rahul Sharma',
    email: 'rahul@company.com',
    employee_id: 'EMP-DRV-101',
    phone: '+91 98101 44556',
    assigned_vehicle_id: 'v-001',
    assigned_vehicle_number: 'DL01 TA 4920',
    status: 'ON_TRIP'
  },
  {
    id: 'drv-002',
    user_id: 'usr-drv-002',
    name: 'Amit Verma',
    email: 'amit@company.com',
    employee_id: 'EMP-DRV-102',
    phone: '+91 98102 77889',
    assigned_vehicle_id: 'v-002',
    assigned_vehicle_number: 'UP16 BT 9845',
    status: 'AVAILABLE'
  },
  {
    id: 'drv-003',
    user_id: 'usr-drv-003',
    name: 'Rajesh Kumar',
    email: 'rajesh@company.com',
    employee_id: 'EMP-DRV-103',
    phone: '+91 98103 99001',
    assigned_vehicle_id: 'v-003',
    assigned_vehicle_number: 'DL1L AA 3180',
    status: 'ON_TRIP'
  }
];

export const INITIAL_DESTINATIONS: Destination[] = [
  {
    id: 'dst-del-okhla',
    name: 'Company North Central Depot',
    address: 'Okhla Industrial Area Phase-III, New Delhi',
    latitude: 28.5355,
    longitude: 77.268,
    contact_name: 'Rajesh Khanna',
    contact_number: '+91 98101 22334',
    geofence_radius_meters: 200,
    notes: 'Primary Fleet Hub & Dispatch Dock',
    is_active: 1
  },
  {
    id: 'dst-del-lajpat',
    name: 'Lajpat Nagar Central Transit Hub',
    address: 'Ring Road Commercial Complex, Lajpat Nagar, New Delhi',
    latitude: 28.5677,
    longitude: 77.2433,
    contact_name: 'Manoj Tiwari',
    contact_number: '+91 98102 33445',
    geofence_radius_meters: 150,
    notes: 'Loading Bay 2 at rear entry',
    is_active: 1
  },
  {
    id: 'dst-del-mayurvihar',
    name: 'Mayur Vihar Phase-1 Distribution Facility',
    address: 'Pocket 1, Commercial Sector, Mayur Vihar, East Delhi',
    latitude: 28.6015,
    longitude: 77.294,
    contact_name: 'Satish Chawla',
    contact_number: '+91 98103 44556',
    geofence_radius_meters: 150,
    notes: 'Delhi-Noida link transit depot',
    is_active: 1
  },
  {
    id: 'dst-del-ghazipur',
    name: 'Ghazipur Border Freight Terminal & Cold Hub',
    address: 'Delhi-UP Border Highway Junction, Ghazipur',
    latitude: 28.624,
    longitude: 77.331,
    contact_name: 'Anand Singh',
    contact_number: '+91 98104 55667',
    geofence_radius_meters: 200,
    notes: 'Border commercial tax & refrigerated cargo gate',
    is_active: 1
  },
  {
    id: 'dst-del-noida18',
    name: 'Noida Sector 18 Commercial Logistics Bay',
    address: 'Atta Market Logistics Lane, Sector 18, Noida',
    latitude: 28.5708,
    longitude: 77.326,
    contact_name: 'Vikas Malhotra',
    contact_number: '+91 98105 66778',
    geofence_radius_meters: 150,
    notes: 'Deliveries permitted 08:00 - 18:00 only',
    is_active: 1
  },
  {
    id: 'dst-del-noida62',
    name: 'Noida Sector 62 Electronic City Mega Hub',
    address: 'Block C, Electronic City, Sector 62, Noida',
    latitude: 28.628,
    longitude: 77.368,
    contact_name: 'Deepa Rastogi',
    contact_number: '+91 98106 77889',
    geofence_radius_meters: 250,
    notes: 'Automated Fulfillment Center Bay 4',
    is_active: 1
  },
  {
    id: 'dst-del-ecotech',
    name: 'Ecotech-III Logistics Park',
    address: 'Industrial Area, Ecotech-III, Greater Noida',
    latitude: 28.4744,
    longitude: 77.504,
    contact_name: 'Sandeep Yadav',
    contact_number: '+91 98107 88990',
    geofence_radius_meters: 250,
    notes: 'Heavy vehicle 24/7 container yard',
    is_active: 1
  },
  {
    id: 'dst-del-cp',
    name: 'Connaught Place Rapid Transit Depot',
    address: 'Barakhamba Road Annex, Connaught Place, New Delhi',
    latitude: 28.6315,
    longitude: 77.2167,
    contact_name: 'Harish Verma',
    contact_number: '+91 98108 99001',
    geofence_radius_meters: 150,
    notes: 'Early morning express supply window',
    is_active: 1
  }
];

// Reusable Realistic SVG Proofs for Instant Preview
const svgOdometer = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#0b0f19"/><rect x="20" y="20" width="760" height="460" rx="16" fill="#131b2e" stroke="#2a3349" stroke-width="2"/><circle cx="280" cy="240" r="130" fill="#0a0e17" stroke="#1f283d" stroke-width="6"/><line x1="280" y1="240" x2="230" y2="160" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/><circle cx="280" cy="240" r="10" fill="#c5a059"/><text x="280" y="295" font-family="sans-serif" font-size="28" font-weight="700" fill="#ffffff" text-anchor="middle">42 KM/H</text><rect x="460" y="140" width="280" height="130" rx="10" fill="#080b11" stroke="#334155" stroke-width="2"/><text x="490" y="195" font-family="monospace" font-size="28" font-weight="800" fill="#f5d485" letter-spacing="3">048215.4 KM</text><text x="490" y="235" font-family="sans-serif" font-size="13" fill="#10b981" font-weight="600">● TRIP DISTANCE: 14.8 KM</text><rect x="460" y="290" width="280" height="90" rx="8" fill="#141a29" stroke="#253047"/><text x="480" y="322" font-family="sans-serif" font-size="13" font-weight="700" fill="#f8fafc">VEHICLE: DL01 TA 4920</text><text x="480" y="344" font-family="sans-serif" font-size="12" fill="#94a3b8">DRIVER: Rahul Sharma (EMP-101)</text><rect x="35" y="35" width="730" height="40" rx="6" fill="#0f172a"/><text x="50" y="60" font-family="sans-serif" font-size="14" font-weight="700" fill="#c5a059">TRUCKTRACKER PROOF: START TRIP ODOMETER</text><rect x="35" y="425" width="730" height="40" rx="6" fill="#090d16"/><text x="50" y="450" font-family="monospace" font-size="12" fill="#cbd5e1">📍 28.5355° N, 77.2680° E • Okhla Logistics Depot, New Delhi • 08:05 AM</text></svg>`;

const svgDelivery = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#0b0f19"/><rect x="20" y="20" width="760" height="460" rx="16" fill="#131b2c" stroke="#263147" stroke-width="2"/><rect x="70" y="140" width="260" height="240" fill="#0f172a" stroke="#334155" stroke-width="2"/><rect x="110" y="260" width="70" height="80" rx="4" fill="#92400e" stroke="#b45309" stroke-width="2"/><rect x="190" y="260" width="75" height="80" rx="4" fill="#92400e" stroke="#b45309" stroke-width="2"/><rect x="150" y="190" width="80" height="70" rx="4" fill="#92400e" stroke="#b45309" stroke-width="2"/><rect x="370" y="120" width="370" height="260" rx="8" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/><text x="395" y="160" font-family="sans-serif" font-size="18" font-weight="800" fill="#0f172a">CARGO DELIVERY RECEIPT</text><text x="395" y="185" font-family="monospace" font-size="12" fill="#475569">WAYBILL: WB-DEL-984210 • STOP #1</text><line x1="395" y1="195" x2="715" y2="195" stroke="#e2e8f0" stroke-width="2"/><text x="395" y="225" font-family="sans-serif" font-size="13" fill="#334155">DESTINATION: Lajpat Nagar Central Depot, Delhi</text><text x="395" y="250" font-family="sans-serif" font-size="13" fill="#334155">CONSIGNMENT: 40 FMCG &amp; Electronics Cartons</text><text x="395" y="275" font-family="sans-serif" font-size="13" fill="#334155">RECEIVER: Manoj Tiwari (Store Incharge)</text><rect x="560" y="300" width="150" height="42" rx="6" fill="#ecfdf5" stroke="#059669" stroke-width="2"/><text x="635" y="328" font-family="sans-serif" font-size="14" font-weight="800" fill="#059669" text-anchor="middle">✓ DELIVERED</text><rect x="35" y="35" width="730" height="40" rx="6" fill="#0f172a"/><text x="50" y="60" font-family="sans-serif" font-size="14" font-weight="700" fill="#10b981">DELIVERY PROOF VERIFIED • STOP 1 COMPLETED</text><rect x="35" y="425" width="730" height="40" rx="6" fill="#090d16"/><text x="50" y="450" font-family="monospace" font-size="12" fill="#cbd5e1">📍 28.5677° N, 77.2433° E • Lajpat Nagar Central Hub • 09:37 AM</text></svg>`;

const svgSeal = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#0f172a"/><rect x="20" y="20" width="760" height="460" rx="16" fill="#1e293b" stroke="#334155" stroke-width="2"/><rect x="370" y="80" width="24" height="340" rx="4" fill="#cbd5e1" stroke="#475569" stroke-width="2"/><rect x="370" y="210" width="24" height="90" rx="3" fill="#ef4444" stroke="#7f1d1d" stroke-width="2"/><circle cx="382" cy="225" r="14" fill="#b91c1c"/><rect x="440" y="150" width="290" height="200" rx="8" fill="#0b111e" stroke="#3b82f6" stroke-width="2"/><text x="460" y="185" font-family="sans-serif" font-size="16" font-weight="700" fill="#38bdf8">SECURITY SEAL AUDIT</text><line x1="460" y1="198" x2="705" y2="198" stroke="#1e293b"/><text x="460" y="225" font-family="sans-serif" font-size="13" fill="#cbd5e1">TAG NO: #SEAL-DL-9942</text><text x="460" y="250" font-family="sans-serif" font-size="13" fill="#cbd5e1">STOP: Mayur Vihar Distribution Hub</text><text x="460" y="275" font-family="sans-serif" font-size="13" fill="#cbd5e1">TAMPER AUDIT: Intact &amp; Verified</text><rect x="460" y="295" width="130" height="32" rx="4" fill="rgba(16, 185, 129, 0.2)" stroke="#10b981"/><text x="525" y="316" font-family="sans-serif" font-size="12" font-weight="700" fill="#10b981" text-anchor="middle">STATUS: PASSED</text><rect x="35" y="35" width="730" height="40" rx="6" fill="#0f172a"/><text x="50" y="60" font-family="sans-serif" font-size="14" font-weight="700" fill="#38bdf8">SECURITY SEAL VERIFIED • STOP 2</text><rect x="35" y="425" width="730" height="40" rx="6" fill="#090d16"/><text x="50" y="450" font-family="monospace" font-size="12" fill="#cbd5e1">📍 28.6015° N, 77.2940° E • Mayur Vihar Phase-1, East Delhi • 10:02 AM</text></svg>`;

const svgDelay = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#0b0f19"/><rect x="20" y="20" width="760" height="460" rx="16" fill="#1e293b" stroke="#2a364f" stroke-width="2"/><rect x="160" y="130" width="480" height="18" fill="#e2e8f0"/><rect x="180" y="148" width="24" height="100" fill="#cbd5e1"/><rect x="385" y="148" width="24" height="100" fill="#cbd5e1"/><rect x="600" y="148" width="24" height="100" fill="#cbd5e1"/><rect x="260" y="95" width="280" height="35" rx="4" fill="#1e3a8a"/><text x="400" y="118" font-family="sans-serif" font-size="13" font-weight="700" fill="#ffffff" text-anchor="middle">DELHI - UP BORDER FREIGHT TOLL</text><line x1="204" y1="220" x2="385" y2="200" stroke="#ef4444" stroke-width="6" stroke-dasharray="16 8"/><line x1="409" y1="220" x2="590" y2="200" stroke="#ef4444" stroke-width="6" stroke-dasharray="16 8"/><rect x="60" y="270" width="680" height="120" rx="10" fill="rgba(15, 23, 42, 0.95)" stroke="#f59e0b" stroke-width="2"/><text x="90" y="305" font-family="sans-serif" font-size="16" font-weight="800" fill="#f59e0b">⚠️ DELAY EVIDENCE: BORDER TAX TOLL CONGESTION</text><line x1="90" y1="318" x2="710" y2="318" stroke="#334155"/><text x="90" y="342" font-family="sans-serif" font-size="13" fill="#e2e8f0">LOCATION: Ghazipur Border Commercial Security Lane • Single Lane Diversion</text><text x="90" y="366" font-family="sans-serif" font-size="13" fill="#94a3b8">RECORDED DURATION: 22 MINUTES • REPORTED BY RAHUL SHARMA</text><rect x="585" y="335" width="120" height="36" rx="6" fill="rgba(245, 158, 11, 0.2)" stroke="#f59e0b"/><text x="645" y="358" font-family="sans-serif" font-size="14" font-weight="700" fill="#f59e0b" text-anchor="middle">+22 MINS</text><rect x="35" y="35" width="730" height="40" rx="6" fill="#0f172a"/><text x="50" y="60" font-family="sans-serif" font-size="14" font-weight="700" fill="#f59e0b">DELAY EVIDENCE PHOTO • GHAZIPUR BORDER</text><rect x="35" y="425" width="730" height="40" rx="6" fill="#090d16"/><text x="50" y="450" font-family="monospace" font-size="12" fill="#cbd5e1">📍 28.6240° N, 77.3310° E • Delhi-UP Border Highway Junction • 10:35 AM</text></svg>`;

const svgWarehouse = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><rect width="800" height="500" fill="#0f172a"/><rect x="20" y="20" width="760" height="460" rx="16" fill="#131b2e" stroke="#2a364f" stroke-width="2"/><line x1="120" y1="130" x2="120" y2="360" stroke="#38bdf8" stroke-width="4"/><line x1="260" y1="130" x2="260" y2="360" stroke="#38bdf8" stroke-width="4"/><line x1="100" y1="200" x2="300" y2="200" stroke="#0284c7" stroke-width="2"/><line x1="100" y1="280" x2="300" y2="280" stroke="#0284c7" stroke-width="2"/><rect x="135" y="160" width="40" height="36" rx="2" fill="#d97706"/><rect x="190" y="160" width="55" height="36" rx="2" fill="#d97706"/><rect x="140" y="240" width="50" height="36" rx="2" fill="#059669"/><rect x="360" y="130" width="370" height="230" rx="8" fill="#0f172a" stroke="#334155"/><text x="390" y="170" font-family="sans-serif" font-size="18" font-weight="800" fill="#ffffff">NOIDA SECTOR 62 MEGA HUB</text><text x="390" y="195" font-family="sans-serif" font-size="13" fill="#38bdf8">ELECTRONIC CITY FULFILLMENT CENTER</text><line x1="390" y1="208" x2="690" y2="208" stroke="#1e293b"/><text x="390" y="235" font-family="sans-serif" font-size="13" fill="#cbd5e1">BAY: Gate #4 (Inbound Logistics)</text><text x="390" y="260" font-family="sans-serif" font-size="13" fill="#cbd5e1">GEOFENCE RADIUS: 250 METERS</text><text x="390" y="285" font-family="sans-serif" font-size="13" fill="#cbd5e1">SUPERVISOR: Deepa Rastogi</text><rect x="390" y="305" width="160" height="34" rx="4" fill="rgba(56, 189, 248, 0.15)" stroke="#38bdf8"/><text x="470" y="327" font-family="sans-serif" font-size="12" font-weight="700" fill="#38bdf8" text-anchor="middle">FACILITY VERIFIED</text><rect x="35" y="35" width="730" height="40" rx="6" fill="#0f172a"/><text x="50" y="60" font-family="sans-serif" font-size="14" font-weight="700" fill="#38bdf8">DESTINATION PROFILE: NOIDA SECTOR 62</text><rect x="35" y="425" width="730" height="40" rx="6" fill="#090d16"/><text x="50" y="450" font-family="monospace" font-size="12" fill="#cbd5e1">📍 28.6280° N, 77.3680° E • Block C, Sector 62, Noida (UP) • Bay 4 Active</text></svg>`;

export const DEMO_PHOTOS_MAP: Record<string, string> = {
  'p-del-001': `data:image/svg+xml;utf8,${encodeURIComponent(svgOdometer)}`,
  'p-del-002': `data:image/svg+xml;utf8,${encodeURIComponent(svgDelivery)}`,
  'p-del-003': `data:image/svg+xml;utf8,${encodeURIComponent(svgSeal)}`,
  'p-del-004': `data:image/svg+xml;utf8,${encodeURIComponent(svgDelay)}`,
  'p-del-005': `data:image/svg+xml;utf8,${encodeURIComponent(svgWarehouse)}`
};

export const INITIAL_PHOTOS: Photo[] = [
  {
    id: 'p-del-001',
    trip_id: 'TR-DEL-2026-01',
    driver_id: 'usr-drv-001',
    vehicle_id: 'v-001',
    photo_type: 'ODOMETER',
    file_path: 'photo-delhi-odometer.svg',
    file_size: 18420,
    mime_type: 'image/svg+xml',
    timestamp: `${today}T08:05:22.000Z`,
    latitude: 28.5355,
    longitude: 77.268,
    gps_accuracy: 6.0,
    destination_name: 'Company North Central Depot'
  },
  {
    id: 'p-del-002',
    trip_id: 'TR-DEL-2026-01',
    stop_id: 'stp-del-01',
    driver_id: 'usr-drv-001',
    vehicle_id: 'v-001',
    photo_type: 'DELIVERY_PROOF',
    file_path: 'photo-delhi-delivery-lajpat.svg',
    file_size: 24100,
    mime_type: 'image/svg+xml',
    timestamp: `${today}T09:37:14.000Z`,
    latitude: 28.5677,
    longitude: 77.2433,
    gps_accuracy: 8.5,
    destination_name: 'Lajpat Nagar Central Transit Hub',
    stop_number: 1
  },
  {
    id: 'p-del-003',
    trip_id: 'TR-DEL-2026-01',
    stop_id: 'stp-del-02',
    driver_id: 'usr-drv-001',
    vehicle_id: 'v-001',
    photo_type: 'SECURITY_SEAL',
    file_path: 'photo-delhi-seal-mayurvihar.svg',
    file_size: 19800,
    mime_type: 'image/svg+xml',
    timestamp: `${today}T10:02:18.000Z`,
    latitude: 28.6015,
    longitude: 77.294,
    gps_accuracy: 7.0,
    destination_name: 'Mayur Vihar Phase-1 Distribution Hub',
    stop_number: 2
  },
  {
    id: 'p-del-004',
    trip_id: 'TR-DEL-2026-01',
    stop_id: 'stp-del-03',
    driver_id: 'usr-drv-001',
    vehicle_id: 'v-001',
    photo_type: 'DELAY_PROOF',
    file_path: 'photo-delhi-delay-ghazipur.svg',
    file_size: 21500,
    mime_type: 'image/svg+xml',
    timestamp: `${today}T10:35:40.000Z`,
    latitude: 28.624,
    longitude: 77.331,
    gps_accuracy: 11.0,
    destination_name: 'Ghazipur Border Freight Terminal & Cold Hub',
    stop_number: 3
  },
  {
    id: 'p-del-005',
    trip_id: 'TR-DEL-2026-01',
    stop_id: 'stp-del-05',
    driver_id: 'usr-drv-001',
    vehicle_id: 'v-001',
    photo_type: 'DESTINATION_ARRIVAL',
    file_path: 'photo-noida-warehouse.svg',
    file_size: 16900,
    mime_type: 'image/svg+xml',
    timestamp: `${today}T07:45:00.000Z`,
    latitude: 28.628,
    longitude: 77.368,
    gps_accuracy: 5.0,
    destination_name: 'Noida Sector 62 Electronic City Mega Hub',
    stop_number: 5
  }
];

export const INITIAL_TRIPS: Trip[] = [
  {
    id: 'TR-DEL-2026-01',
    date: today,
    driver_id: 'usr-drv-001',
    driver_name: 'Rahul Sharma (Senior Driver)',
    driver_phone: '+91 98101 44556',
    vehicle_id: 'v-001',
    vehicle_number: 'DL01 TA 4920',
    vehicle_model: 'Tata Ultra T.7 (14ft High Deck)',
    starting_location: 'Okhla Industrial Area Phase-III, New Delhi',
    starting_latitude: 28.5355,
    starting_longitude: 77.268,
    purpose: 'Delhi-NCR Inter-City Express Freight & Restock Corridor',
    reference_number: 'PO-NCR-88492',
    planned_departure_time: '08:00',
    actual_start_time: `${today}T08:07:00.000Z`,
    status: 'DELAYED',
    total_delay_minutes: 22,
    calculated_distance_km: 46.8,
    notes: 'High-priority dispatch across Delhi, Mayur Vihar, Ghazipur Border, and Noida Sector 18 & 62',
    created_by: 'usr-mgr-001',
    created_at: `${today}T07:30:00.000Z`,
    updated_at: `${today}T10:40:00.000Z`,
    stops: [
      {
        id: 'stp-del-01',
        trip_id: 'TR-DEL-2026-01',
        destination_id: 'dst-del-lajpat',
        stop_number: 1,
        destination_name: 'Lajpat Nagar Central Transit Hub',
        address: 'Ring Road Commercial Complex, Lajpat Nagar, New Delhi',
        latitude: 28.5677,
        longitude: 77.2433,
        geofence_radius_meters: 150,
        planned_arrival_time: '08:35',
        actual_arrival_time: `${today}T08:42:00.000Z`,
        actual_departure_time: `${today}T09:12:00.000Z`,
        arrival_status: 'LATE',
        arrival_diff_minutes: 7,
        status: 'COMPLETED',
        notes: 'Delivered 40 cartons FMCG goods, signed by Manoj Tiwari'
      },
      {
        id: 'stp-del-02',
        trip_id: 'TR-DEL-2026-01',
        destination_id: 'dst-del-mayurvihar',
        stop_number: 2,
        destination_name: 'Mayur Vihar Phase-1 Distribution Facility',
        address: 'Pocket 1, Commercial Sector, Mayur Vihar, East Delhi',
        latitude: 28.6015,
        longitude: 77.294,
        geofence_radius_meters: 150,
        planned_arrival_time: '09:30',
        actual_arrival_time: `${today}T09:38:00.000Z`,
        actual_departure_time: `${today}T10:08:00.000Z`,
        arrival_status: 'LATE',
        arrival_diff_minutes: 8,
        status: 'COMPLETED',
        notes: 'Loaded 18 crates electronic accessories & inspected bolt seal'
      },
      {
        id: 'stp-del-03',
        trip_id: 'TR-DEL-2026-01',
        destination_id: 'dst-del-ghazipur',
        stop_number: 3,
        destination_name: 'Ghazipur Border Freight Terminal & Cold Hub',
        address: 'Delhi-UP Border Highway Junction, Ghazipur',
        latitude: 28.624,
        longitude: 77.331,
        geofence_radius_meters: 200,
        planned_arrival_time: '10:20',
        actual_arrival_time: `${today}T10:35:00.000Z`,
        arrival_status: 'LATE',
        arrival_diff_minutes: 15,
        status: 'ARRIVED',
        notes: 'Vehicle held in UP commercial tax queue at border junction'
      },
      {
        id: 'stp-del-04',
        trip_id: 'TR-DEL-2026-01',
        destination_id: 'dst-del-noida18',
        stop_number: 4,
        destination_name: 'Noida Sector 18 Commercial Logistics Bay',
        address: 'Atta Market Logistics Lane, Sector 18, Noida',
        latitude: 28.5708,
        longitude: 77.326,
        geofence_radius_meters: 150,
        planned_arrival_time: '11:45',
        status: 'PENDING',
        notes: 'Pending delivery of retail crates'
      },
      {
        id: 'stp-del-05',
        trip_id: 'TR-DEL-2026-01',
        destination_id: 'dst-del-noida62',
        stop_number: 5,
        destination_name: 'Noida Sector 62 Electronic City Mega Hub',
        address: 'Block C, Electronic City, Sector 62, Noida',
        latitude: 28.628,
        longitude: 77.368,
        geofence_radius_meters: 250,
        planned_arrival_time: '13:00',
        status: 'PENDING',
        notes: 'Final drop-off point at Bay 4 Fulfillment'
      }
    ],
    delays: [
      {
        id: 'dly-del-01',
        trip_id: 'TR-DEL-2026-01',
        stop_id: 'stp-del-03',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        reason: 'Heavy border commercial tax queue and single lane diversion',
        start_time: `${today}T10:36:00.000Z`,
        duration_minutes: 22,
        is_resolved: 0,
        description: 'Single lane security check bottleneck on Delhi-UP Ghazipur toll'
      }
    ],
    events: [
      {
        id: 'evt-del-01',
        trip_id: 'TR-DEL-2026-01',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        event_type: 'TRIP_STARTED',
        timestamp: `${today}T08:07:00.000Z`,
        latitude: 28.5355,
        longitude: 77.268,
        details: 'Trip dispatched from Okhla Central Hub'
      },
      {
        id: 'evt-del-02',
        trip_id: 'TR-DEL-2026-01',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        event_type: 'ODOMETER_LOGGED',
        timestamp: `${today}T08:08:00.000Z`,
        latitude: 28.5355,
        longitude: 77.268,
        details: 'Odometer 48,215 KM confirmed via Camera'
      },
      {
        id: 'evt-del-03',
        trip_id: 'TR-DEL-2026-01',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        stop_id: 'stp-del-01',
        event_type: 'STOP_ARRIVED',
        timestamp: `${today}T08:42:00.000Z`,
        latitude: 28.5676,
        longitude: 77.2434,
        details: 'Arrived at Stop 1: Lajpat Nagar (+7m late)'
      },
      {
        id: 'evt-del-04',
        trip_id: 'TR-DEL-2026-01',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        stop_id: 'stp-del-01',
        event_type: 'ACTIVITY_COMPLETED',
        timestamp: `${today}T09:10:00.000Z`,
        latitude: 28.5677,
        longitude: 77.2433,
        details: 'Delivered 40 cartons, proof photo captured'
      },
      {
        id: 'evt-del-05',
        trip_id: 'TR-DEL-2026-01',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        stop_id: 'stp-del-01',
        event_type: 'STOP_DEPARTED',
        timestamp: `${today}T09:12:00.000Z`,
        latitude: 28.5678,
        longitude: 77.2432,
        details: 'Departed Lajpat Nagar towards Mayur Vihar'
      },
      {
        id: 'evt-del-06',
        trip_id: 'TR-DEL-2026-01',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        stop_id: 'stp-del-02',
        event_type: 'STOP_ARRIVED',
        timestamp: `${today}T09:38:00.000Z`,
        latitude: 28.6016,
        longitude: 77.2939,
        details: 'Arrived at Stop 2: Mayur Vihar Phase-1'
      },
      {
        id: 'evt-del-07',
        trip_id: 'TR-DEL-2026-01',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        stop_id: 'stp-del-02',
        event_type: 'ACTIVITY_COMPLETED',
        timestamp: `${today}T10:05:00.000Z`,
        latitude: 28.6015,
        longitude: 77.294,
        details: 'Cargo loaded & security bolt seal verified'
      },
      {
        id: 'evt-del-08',
        trip_id: 'TR-DEL-2026-01',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        stop_id: 'stp-del-02',
        event_type: 'STOP_DEPARTED',
        timestamp: `${today}T10:08:00.000Z`,
        latitude: 28.6014,
        longitude: 77.2941,
        details: 'Departed Mayur Vihar towards Ghazipur border'
      },
      {
        id: 'evt-del-09',
        trip_id: 'TR-DEL-2026-01',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        stop_id: 'stp-del-03',
        event_type: 'STOP_ARRIVED',
        timestamp: `${today}T10:35:00.000Z`,
        latitude: 28.6241,
        longitude: 77.3312,
        details: 'Arrived at Stop 3: Ghazipur Border Hub (+15m late)'
      },
      {
        id: 'evt-del-10',
        trip_id: 'TR-DEL-2026-01',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        stop_id: 'stp-del-03',
        event_type: 'DELAY_REPORTED',
        timestamp: `${today}T10:36:00.000Z`,
        latitude: 28.624,
        longitude: 77.331,
        details: 'Delay reported: Traffic bottleneck at border tax gate (+22 mins)'
      }
    ],
    photos: INITIAL_PHOTOS
  },
  {
    id: 'TR-DEL-2026-02',
    date: today,
    driver_id: 'usr-drv-002',
    driver_name: 'Amit Verma (Express Driver)',
    driver_phone: '+91 98102 77889',
    vehicle_id: 'v-002',
    vehicle_number: 'UP16 BT 9845',
    vehicle_model: 'Ashok Leyland Ecomet Star 1115',
    starting_location: 'Okhla Industrial Area Phase-III, New Delhi',
    starting_latitude: 28.5355,
    starting_longitude: 77.268,
    purpose: 'Automotive Components Morning Express',
    reference_number: 'PO-AUTO-4421',
    planned_departure_time: '06:30',
    actual_start_time: `${today}T06:35:00.000Z`,
    return_start_time: `${today}T09:15:00.000Z`,
    base_arrival_time: `${today}T09:50:00.000Z`,
    completion_time: `${today}T09:55:00.000Z`,
    status: 'COMPLETED',
    total_delay_minutes: 0,
    calculated_distance_km: 52.4,
    notes: 'Completed on-time morning shuttle to Noida Sector 18 and Greater Noida Ecotech park',
    created_by: 'usr-mgr-001',
    created_at: `${today}T06:00:00.000Z`,
    updated_at: `${today}T10:00:00.000Z`,
    stops: [
      {
        id: 'stp-del-201',
        trip_id: 'TR-DEL-2026-02',
        destination_id: 'dst-del-noida18',
        stop_number: 1,
        destination_name: 'Noida Sector 18 Commercial Logistics Bay',
        address: 'Atta Market Logistics Lane, Sector 18, Noida',
        latitude: 28.5708,
        longitude: 77.326,
        geofence_radius_meters: 150,
        planned_arrival_time: '07:15',
        actual_arrival_time: `${today}T07:12:00.000Z`,
        actual_departure_time: `${today}T07:45:00.000Z`,
        arrival_status: 'ON_TIME',
        status: 'COMPLETED'
      },
      {
        id: 'stp-del-202',
        trip_id: 'TR-DEL-2026-02',
        destination_id: 'dst-del-ecotech',
        stop_number: 2,
        destination_name: 'Ecotech-III Logistics Park',
        address: 'Industrial Area, Ecotech-III, Greater Noida',
        latitude: 28.4744,
        longitude: 77.504,
        geofence_radius_meters: 250,
        planned_arrival_time: '08:30',
        actual_arrival_time: `${today}T08:28:00.000Z`,
        actual_departure_time: `${today}T09:10:00.000Z`,
        arrival_status: 'ON_TIME',
        status: 'COMPLETED'
      }
    ]
  },
  {
    id: 'TR-DEL-2026-03',
    date: today,
    driver_id: 'usr-drv-003',
    driver_name: 'Rajesh Kumar (Heavy Freight Driver)',
    driver_phone: '+91 98103 99001',
    vehicle_id: 'v-003',
    vehicle_number: 'DL1L AA 3180',
    vehicle_model: 'BharatBenz 1617R (24ft Container)',
    starting_location: 'Okhla Industrial Area Phase-III, New Delhi',
    starting_latitude: 28.5355,
    starting_longitude: 77.268,
    purpose: 'Central Delhi Commercial Supply & Noida Evening Handover',
    reference_number: 'PO-CP-7712',
    planned_departure_time: '14:00',
    status: 'ASSIGNED',
    total_delay_minutes: 0,
    calculated_distance_km: 38.2,
    notes: 'Scheduled for afternoon dispatch upon vehicle inspection signoff',
    created_by: 'usr-mgr-001',
    created_at: `${today}T08:30:00.000Z`,
    updated_at: `${today}T08:30:00.000Z`,
    stops: [
      {
        id: 'stp-del-301',
        trip_id: 'TR-DEL-2026-03',
        destination_id: 'dst-del-cp',
        stop_number: 1,
        destination_name: 'Connaught Place Rapid Transit Depot',
        address: 'Barakhamba Road Annex, Connaught Place, New Delhi',
        latitude: 28.6315,
        longitude: 77.2167,
        geofence_radius_meters: 150,
        planned_arrival_time: '14:45',
        status: 'PENDING'
      },
      {
        id: 'stp-del-302',
        trip_id: 'TR-DEL-2026-03',
        destination_id: 'dst-del-mayurvihar',
        stop_number: 2,
        destination_name: 'Mayur Vihar Phase-1 Distribution Facility',
        address: 'Pocket 1, Commercial Sector, Mayur Vihar, East Delhi',
        latitude: 28.6015,
        longitude: 77.294,
        geofence_radius_meters: 150,
        planned_arrival_time: '15:45',
        status: 'PENDING'
      },
      {
        id: 'stp-del-303',
        trip_id: 'TR-DEL-2026-03',
        destination_id: 'dst-del-noida62',
        stop_number: 3,
        destination_name: 'Noida Sector 62 Electronic City Mega Hub',
        address: 'Block C, Electronic City, Sector 62, Noida',
        latitude: 28.628,
        longitude: 77.368,
        geofence_radius_meters: 250,
        planned_arrival_time: '16:45',
        status: 'PENDING'
      }
    ]
  }
];

class MockStore {
  private get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    const stored = localStorage.getItem(`tt_mock_${key}_delhi`);
    if (!stored) {
      this.set(key, fallback);
      return fallback;
    }
    try {
      return JSON.parse(stored);
    } catch {
      return fallback;
    }
  }

  private set<T>(key: string, val: T): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`tt_mock_${key}_delhi`, JSON.stringify(val));
    }
  }

  getVehicles(): Vehicle[] {
    return this.get('vehicles', INITIAL_VEHICLES);
  }

  getDrivers(): Driver[] {
    return this.get('drivers', INITIAL_DRIVERS);
  }

  getDestinations(): Destination[] {
    return this.get('destinations', INITIAL_DESTINATIONS);
  }

  getTrips(): Trip[] {
    return this.get('trips', INITIAL_TRIPS);
  }

  getPhotos(tripId: string): Photo[] {
    const trips = this.getTrips();
    const trip = trips.find((t) => t.id === tripId);
    return trip?.photos || INITIAL_PHOTOS;
  }

  saveTrip(trip: Trip): void {
    const trips = this.getTrips();
    const idx = trips.findIndex((t) => t.id === trip.id);
    if (idx >= 0) {
      trips[idx] = trip;
    } else {
      trips.unshift(trip);
    }
    this.set('trips', trips);
  }

  createDestination(data: Partial<Destination>): Destination {
    const dests = this.getDestinations();
    const newDest: Destination = {
      id: `dst-${Date.now()}`,
      name: data.name || 'New Destination',
      address: data.address || '',
      latitude: data.latitude || 28.55,
      longitude: data.longitude || 77.3,
      geofence_radius_meters: data.geofence_radius_meters || 150,
      contact_name: data.contact_name,
      contact_number: data.contact_number,
      notes: data.notes,
      is_active: 1
    };
    dests.push(newDest);
    this.set('destinations', dests);
    return newDest;
  }
}

export const mockStore = new MockStore();
