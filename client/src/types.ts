export type UserRole = 'DRIVER' | 'MANAGER';

export type TripStatus =
  | 'PLANNED'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'AT_DESTINATION'
  | 'DELAYED'
  | 'RETURNING'
  | 'COMPLETED'
  | 'CANCELLED';

export type StopStatus =
  | 'PENDING'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'FAILED';

export type VehicleStatus = 'AVAILABLE' | 'ON_TRIP' | 'MAINTENANCE' | 'INACTIVE';
export type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'OFF_DUTY' | 'INACTIVE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
}

export interface Vehicle {
  id: string;
  vehicle_number: string;
  vehicle_type: string;
  model: string;
  assigned_driver_id?: string;
  assigned_driver_name?: string;
  status: VehicleStatus;
  notes?: string;
  total_trips?: number;
  active_trip_id?: string;
}

export interface Driver {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone?: string;
  employee_id: string;
  assigned_vehicle_id?: string;
  assigned_vehicle_number?: string;
  status: DriverStatus;
  total_trips?: number;
  active_trip_id?: string;
}

export interface Destination {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  contact_name?: string;
  contact_number?: string;
  geofence_radius_meters: number;
  notes?: string;
  is_active: number;
}

export interface Activity {
  id: string;
  trip_id: string;
  stop_id: string;
  activity_type: string;
  status: string;
  start_time?: string;
  completion_time?: string;
  quantity?: number;
  reference_number?: string;
  recipient_name?: string;
  notes?: string;
  created_at: string;
}

export interface Photo {
  id: string;
  trip_id: string;
  stop_id?: string;
  driver_id: string;
  vehicle_id: string;
  photo_type: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  timestamp: string;
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  destination_name?: string;
  stop_number?: number;
}

export interface Delay {
  id: string;
  trip_id: string;
  stop_id?: string;
  driver_id: string;
  vehicle_id: string;
  reason: string;
  description?: string;
  start_time: string;
  end_time?: string;
  duration_minutes?: number;
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  is_resolved: number;
  photo_id?: string;
}

export interface TripEvent {
  id: string;
  trip_id: string;
  stop_id?: string;
  event_type: string;
  timestamp: string;
  driver_id: string;
  vehicle_id: string;
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
  details?: string;
}

export interface AuditLog {
  id: string;
  trip_id?: string;
  action: string;
  field_changed?: string;
  original_value?: string;
  new_value?: string;
  changed_by: string;
  changed_by_name?: string;
  reason?: string;
  created_at: string;
}

export interface TripStop {
  id: string;
  trip_id: string;
  destination_id?: string;
  stop_number: number;
  destination_name: string;
  address: string;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  planned_arrival_time: string;
  actual_arrival_time?: string;
  actual_departure_time?: string;
  arrival_status?: 'ON_TIME' | 'EARLY' | 'LATE' | 'UNKNOWN';
  arrival_diff_minutes?: number;
  status: StopStatus;
  notes?: string;
  activities?: Activity[];
  photos?: Photo[];
}

export interface Trip {
  id: string;
  date: string;
  driver_id: string;
  driver_name?: string;
  driver_phone?: string;
  vehicle_id: string;
  vehicle_number?: string;
  vehicle_type?: string;
  vehicle_model?: string;
  starting_location: string;
  starting_latitude?: number;
  starting_longitude?: number;
  purpose: string;
  reference_number?: string;
  planned_departure_time: string;
  actual_start_time?: string;
  return_start_time?: string;
  base_arrival_time?: string;
  completion_time?: string;
  status: TripStatus;
  total_delay_minutes: number;
  calculated_distance_km?: number;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  total_stops?: number;
  completed_stops?: number;
  current_destination?: string;
  stops?: TripStop[];
  events?: TripEvent[];
  delays?: Delay[];
  photos?: Photo[];
  auditLogs?: AuditLog[];
}
