import { User, Vehicle, Driver, Destination, Trip } from '../types';

export const DEMO_USERS: Record<string, User> = {
  'manager@company.com': {
    id: 'usr-mgr-001',
    name: 'Sunil Mehta (Operations Manager)',
    email: 'manager@company.com',
    role: 'MANAGER',
    phone: '+91 98260 11223'
  },
  'rahul@company.com': {
    id: 'usr-drv-001',
    name: 'Rahul Sharma',
    email: 'rahul@company.com',
    role: 'DRIVER',
    phone: '+91 98261 44556'
  },
  'amit@company.com': {
    id: 'usr-drv-002',
    name: 'Amit Verma',
    email: 'amit@company.com',
    role: 'DRIVER',
    phone: '+91 98262 77889'
  },
  'driver@company.com': {
    id: 'usr-drv-001',
    name: 'Rahul Sharma (Test Driver)',
    email: 'driver@company.com',
    role: 'DRIVER',
    phone: '+91 98261 44556'
  }
};

const today = new Date().toISOString().split('T')[0];

export const INITIAL_VEHICLES: Vehicle[] = [
  {
    id: 'v-001',
    vehicle_number: 'MP04 XX 1234',
    vehicle_type: 'Heavy Hauler',
    model: 'Tata Prima 4028.S (16 Wheeler)',
    assigned_driver_id: 'usr-drv-001',
    assigned_driver_name: 'Rahul Sharma',
    status: 'ON_TRIP',
    notes: 'Fitted with GPS event transmitter and cold rack'
  },
  {
    id: 'v-002',
    vehicle_number: 'MP04 YY 5678',
    vehicle_type: 'Medium Truck',
    model: 'Ashok Leyland Ecomet 1215',
    assigned_driver_id: 'usr-drv-002',
    assigned_driver_name: 'Amit Verma',
    status: 'AVAILABLE',
    notes: 'Clean box container, daily maintenance passed'
  },
  {
    id: 'v-003',
    vehicle_number: 'MP04 ZZ 9012',
    vehicle_type: 'City Distribution',
    model: 'Mahindra Furio 14',
    status: 'AVAILABLE',
    notes: 'Ideal for urban narrow lanes'
  },
  {
    id: 'v-004',
    vehicle_number: 'MH12 AB 4321',
    vehicle_type: 'Heavy Duty',
    model: 'Eicher Pro 3019',
    status: 'MAINTENANCE',
    notes: 'Scheduled brake pad inspection'
  }
];

export const INITIAL_DRIVERS: Driver[] = [
  {
    id: 'drv-001',
    user_id: 'usr-drv-001',
    name: 'Rahul Sharma',
    email: 'rahul@company.com',
    employee_id: 'EMP-DRV-101',
    phone: '+91 98261 44556',
    assigned_vehicle_id: 'v-001',
    assigned_vehicle_number: 'MP04 XX 1234',
    status: 'ON_TRIP'
  },
  {
    id: 'drv-002',
    user_id: 'usr-drv-002',
    name: 'Amit Verma',
    email: 'amit@company.com',
    employee_id: 'EMP-DRV-102',
    phone: '+91 98262 77889',
    assigned_vehicle_id: 'v-002',
    assigned_vehicle_number: 'MP04 YY 5678',
    status: 'AVAILABLE'
  }
];

export const INITIAL_DESTINATIONS: Destination[] = [
  {
    id: 'dst-001',
    name: 'ABC Warehouse',
    address: 'Sector C, Industrial Area Phase 2, Bhopal',
    latitude: 23.2599,
    longitude: 77.4126,
    contact_name: 'Ramesh Gupta',
    contact_number: '+91 94250 55661',
    geofence_radius_meters: 150,
    notes: 'Loading Bay 4 at rear',
    is_active: 1
  },
  {
    id: 'dst-002',
    name: 'XYZ Retail Store',
    address: 'Commercial Hub Zone 1, MP Nagar, Bhopal',
    latitude: 23.2324,
    longitude: 77.4285,
    contact_name: 'Pooja Nair',
    contact_number: '+91 94251 77882',
    geofence_radius_meters: 150,
    notes: 'Unloading allowed only between 9 AM - 6 PM',
    is_active: 1
  },
  {
    id: 'dst-003',
    name: 'PQR Logistics Depot',
    address: 'Plot 45, Mandideep Industrial Area, Bhopal',
    latitude: 23.0722,
    longitude: 77.5255,
    contact_name: 'Harish Patel',
    contact_number: '+91 94252 99003',
    geofence_radius_meters: 200,
    notes: 'Requires gate pass clearance',
    is_active: 1
  },
  {
    id: 'dst-004',
    name: 'North Point Distribution Center',
    address: 'Bhopal Bypass Highway KM 14',
    latitude: 23.315,
    longitude: 77.382,
    contact_name: 'Karan Johar',
    contact_number: '+91 94253 11224',
    geofence_radius_meters: 250,
    notes: '24/7 Gate security check',
    is_active: 1
  }
];

export const INITIAL_TRIPS: Trip[] = [
  {
    id: 'TR-2026-00124',
    date: today,
    driver_id: 'usr-drv-001',
    driver_name: 'Rahul Sharma',
    driver_phone: '+91 98261 44556',
    vehicle_id: 'v-001',
    vehicle_number: 'MP04 XX 1234',
    vehicle_model: 'Tata Prima 4028.S (16 Wheeler)',
    starting_location: 'Company Central Depot (Mandideep Road)',
    starting_latitude: 23.21,
    starting_longitude: 77.4,
    purpose: 'Retail Restock & Wholesale Orders',
    reference_number: 'PO-2026-9812',
    planned_departure_time: '08:00',
    actual_start_time: `${today}T08:07:00.000Z`,
    status: 'DELAYED',
    total_delay_minutes: 22,
    calculated_distance_km: 18.4,
    notes: 'Urgent restock of FMCG cartons across 3 key retail points',
    created_by: 'usr-mgr-001',
    created_at: `${today}T07:30:00.000Z`,
    updated_at: `${today}T10:30:00.000Z`,
    stops: [
      {
        id: 'stp-001',
        trip_id: 'TR-2026-00124',
        destination_id: 'dst-001',
        stop_number: 1,
        destination_name: 'ABC Warehouse',
        address: 'Sector C, Industrial Area Phase 2, Bhopal',
        latitude: 23.2599,
        longitude: 77.4126,
        geofence_radius_meters: 150,
        planned_arrival_time: '09:00',
        actual_arrival_time: `${today}T09:14:00.000Z`,
        actual_departure_time: `${today}T09:42:00.000Z`,
        arrival_status: 'LATE',
        arrival_diff_minutes: 14,
        status: 'COMPLETED',
        notes: 'Delivered 40 cartons successfully'
      },
      {
        id: 'stp-002',
        trip_id: 'TR-2026-00124',
        destination_id: 'dst-002',
        stop_number: 2,
        destination_name: 'XYZ Retail Store',
        address: 'Commercial Hub Zone 1, MP Nagar, Bhopal',
        latitude: 23.2324,
        longitude: 77.4285,
        geofence_radius_meters: 150,
        planned_arrival_time: '10:15',
        actual_arrival_time: `${today}T10:38:00.000Z`,
        arrival_status: 'LATE',
        arrival_diff_minutes: 23,
        status: 'ARRIVED',
        notes: 'Delayed by traffic congestion on Raisen Road'
      },
      {
        id: 'stp-003',
        trip_id: 'TR-2026-00124',
        destination_id: 'dst-003',
        stop_number: 3,
        destination_name: 'PQR Logistics Depot',
        address: 'Plot 45, Mandideep Industrial Area, Bhopal',
        latitude: 23.0722,
        longitude: 77.5255,
        geofence_radius_meters: 200,
        planned_arrival_time: '11:45',
        status: 'PENDING',
        notes: 'Scheduled container handover'
      }
    ],
    delays: [
      {
        id: 'dly-001',
        trip_id: 'TR-2026-00124',
        stop_id: 'stp-002',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        reason: 'Heavy traffic congestion on Raisen Road / Board Office Square',
        start_time: `${today}T09:55:00.000Z`,
        end_time: `${today}T10:17:00.000Z`,
        duration_minutes: 22,
        is_resolved: 1,
        description: 'Road construction single lane diversion'
      }
    ],
    events: [
      {
        id: 'evt-001',
        trip_id: 'TR-2026-00124',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        event_type: 'TRIP_STARTED',
        timestamp: `${today}T08:07:00.000Z`,
        latitude: 23.21,
        longitude: 77.4,
        details: 'Trip initiated from Central Depot'
      },
      {
        id: 'evt-002',
        trip_id: 'TR-2026-00124',
        driver_id: 'usr-drv-001',
        vehicle_id: 'v-001',
        stop_id: 'stp-001',
        event_type: 'STOP_ARRIVED',
        timestamp: `${today}T09:14:00.000Z`,
        latitude: 23.2598,
        longitude: 77.4125,
        details: 'Geofence arrival detected at ABC Warehouse'
      }
    ]
  },
  {
    id: 'TR-2026-00125',
    date: today,
    driver_id: 'usr-drv-002',
    driver_name: 'Amit Verma',
    driver_phone: '+91 98262 77889',
    vehicle_id: 'v-002',
    vehicle_number: 'MP04 YY 5678',
    vehicle_model: 'Ashok Leyland Ecomet 1215',
    starting_location: 'Company Central Depot (Mandideep Road)',
    starting_latitude: 23.21,
    starting_longitude: 77.4,
    purpose: 'North Corridor Distribution',
    reference_number: 'PO-2026-9815',
    planned_departure_time: '14:00',
    status: 'PLANNED',
    total_delay_minutes: 0,
    calculated_distance_km: 24.5,
    notes: 'Afternoon scheduled dispatch',
    created_by: 'usr-mgr-001',
    created_at: `${today}T08:15:00.000Z`,
    updated_at: `${today}T08:15:00.000Z`,
    stops: [
      {
        id: 'stp-004',
        trip_id: 'TR-2026-00125',
        destination_id: 'dst-004',
        stop_number: 1,
        destination_name: 'North Point Distribution Center',
        address: 'Bhopal Bypass Highway KM 14',
        latitude: 23.315,
        longitude: 77.382,
        geofence_radius_meters: 250,
        planned_arrival_time: '14:45',
        status: 'PENDING'
      }
    ]
  }
];

class MockStore {
  private get<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    const stored = localStorage.getItem(`tt_mock_${key}`);
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
      localStorage.setItem(`tt_mock_${key}`, JSON.stringify(val));
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
      latitude: data.latitude || 23.25,
      longitude: data.longitude || 77.41,
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
