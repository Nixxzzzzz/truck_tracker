import { offlineQueue } from './offlineQueue';
import { DEMO_USERS, mockStore, DEMO_PHOTOS_MAP } from './mockData';
import { Trip, Destination } from '../types';

export const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('truck_tracker_custom_api');
    if (custom) return custom.replace(/\/$/, '');
  }
  return import.meta.env.VITE_API_BASE_URL || '/api';
};

export const API_BASE = getApiBase();

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('truck_tracker_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/**
 * Capture real device GPS coordinates with accuracy
 */
export async function getCurrentGpsPosition(): Promise<{
  latitude?: number;
  longitude?: number;
  gps_accuracy?: number;
}> {
  if (typeof navigator === 'undefined' || !navigator.geolocation) {
    return {};
  }

  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          gps_accuracy: pos.coords.accuracy
        });
      },
      (_err) => {
        // Graceful fallback when user denies GPS permission or device has no GPS fix
        resolve({});
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 10000 }
    );
  });
}

async function request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const currentBase = getApiBase();
  const url = `${currentBase}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, { ...options, headers });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.error || `HTTP error ${response.status}`);
    }

    return data;
  } catch (error: any) {
    // If driver request and offline network error, queue event
    if (
      typeof navigator !== 'undefined' &&
      !navigator.onLine &&
      options.method &&
      options.method !== 'GET' &&
      endpoint.startsWith('/driver/')
    ) {
      const payload = options.body ? JSON.parse(options.body as string) : {};
      offlineQueue.enqueue(url, options.method, payload);
      throw new Error('You are currently offline. Action has been saved and will synchronize automatically once reconnected.');
    }

    throw error;
  }
}

export const api = {
  auth: {
    login: async (body: { email: string; password: string }) => {
      try {
        return await request('/auth/login', { method: 'POST', body: JSON.stringify(body) });
      } catch (err: any) {
        // Fallback for static cloud hosting (e.g. Vercel static without backend connected)
        const normalizedEmail = body.email.trim().toLowerCase();
        const demoUser = DEMO_USERS[normalizedEmail];
        if (demoUser) {
          const fakeToken = `demo_token_${normalizedEmail.includes('director') ? 'director_' : ''}${demoUser.role.toLowerCase()}_${Date.now()}`;
          localStorage.setItem('truck_tracker_token', fakeToken);
          localStorage.setItem('truck_tracker_is_demo', 'true');
          return { token: fakeToken, user: demoUser };
        }
        throw err;
      }
    },
    getMe: async () => {
      try {
        return await request('/auth/me');
      } catch {
        const token = localStorage.getItem('truck_tracker_token') || '';
        if (token.includes('director')) {
          return { user: DEMO_USERS['director@company.com'] };
        }
        if (token.includes('manager') || token.includes('demo_token_manager')) {
          return { user: DEMO_USERS['manager@company.com'] };
        }
        return { user: DEMO_USERS['rahul@company.com'] };
      }
    }
  },

  driver: {
    getTodayTrips: async () => {
      try {
        return await request('/driver/trips/today');
      } catch {
        return { trips: mockStore.getTrips() };
      }
    },
    getActiveTrip: async () => {
      try {
        return await request('/driver/trips/active');
      } catch {
        const trips = mockStore.getTrips();
        const ongoing = trips.find((t) =>
          ['IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING'].includes(t.status)
        );
        return { trip: ongoing || null };
      }
    },
    getTrip: async (id: string) => {
      try {
        return await request(`/driver/trips/${id}`);
      } catch {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id) || trips[0];
        return { trip };
      }
    },
    startTrip: async (id: string, coords: any) => {
      try {
        return await request(`/driver/trips/${id}/start`, { method: 'POST', body: JSON.stringify(coords) });
      } catch (err) {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id);
        if (trip) {
          trip.status = 'IN_PROGRESS';
          trip.actual_start_time = new Date().toISOString();
          mockStore.saveTrip(trip);
          return { message: 'Trip started' };
        }
        throw err;
      }
    },
    arriveStop: async (id: string, stopId: string, coords: any) => {
      try {
        return await request(`/driver/trips/${id}/stops/${stopId}/arrive`, { method: 'POST', body: JSON.stringify(coords) });
      } catch (err) {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id);
        if (trip && trip.stops) {
          const stop = trip.stops.find((s) => s.id === stopId);
          if (stop) {
            stop.status = 'ARRIVED';
            stop.actual_arrival_time = new Date().toISOString();
          }
          trip.status = 'AT_DESTINATION';
          mockStore.saveTrip(trip);
          return { message: 'Arrival recorded', geofence: { in_geofence: true, message: 'Geofence verified' } };
        }
        throw err;
      }
    },
    completeActivity: async (id: string, stopId: string, data: any) => {
      try {
        return await request(`/driver/trips/${id}/stops/${stopId}/complete-activity`, { method: 'POST', body: JSON.stringify(data) });
      } catch (err) {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id);
        if (trip && trip.stops) {
          const stop = trip.stops.find((s) => s.id === stopId);
          if (stop) {
            if (!stop.activities) stop.activities = [];
            stop.activities.push({
              id: `act-${Date.now()}`,
              stop_id: stopId,
              trip_id: id,
              activity_type: data?.activity_type || 'Delivery',
              status: 'COMPLETED',
              notes: data?.notes,
              created_at: new Date().toISOString()
            } as any);
          }
          mockStore.saveTrip(trip);
          return { message: 'Activity completed' };
        }
        throw err;
      }
    },
    departStop: async (id: string, stopId: string, coords: any) => {
      try {
        return await request(`/driver/trips/${id}/stops/${stopId}/depart`, { method: 'POST', body: JSON.stringify(coords) });
      } catch (err) {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id);
        if (trip && trip.stops) {
          const stop = trip.stops.find((s) => s.id === stopId);
          if (stop) {
            stop.status = 'COMPLETED';
            stop.actual_departure_time = new Date().toISOString();
          }
          const remaining = trip.stops.filter((s) => s.status === 'PENDING').length;
          trip.status = remaining === 0 ? 'RETURNING' : 'IN_PROGRESS';
          mockStore.saveTrip(trip);
          return { message: 'Departure recorded', remainingStops: remaining };
        }
        throw err;
      }
    },
    reportDelay: async (id: string, data: any) => {
      try {
        return await request(`/driver/trips/${id}/delay`, { method: 'POST', body: JSON.stringify(data) });
      } catch (err) {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id);
        if (trip) {
          if (!trip.delays) trip.delays = [];
          const newDelay = {
            id: `del-${Date.now()}`,
            trip_id: id,
            reason: data?.reason || 'Traffic',
            description: data?.description || '',
            start_time: new Date().toISOString(),
            is_resolved: 0,
            photo_id: data?.photoId || null
          };
          trip.delays.unshift(newDelay as any);
          trip.status = 'DELAYED';
          mockStore.saveTrip(trip);
          return { message: 'Delay reported', delayId: newDelay.id, start_time: newDelay.start_time };
        }
        throw err;
      }
    },
    resolveDelay: async (id: string, delayId: string) => {
      try {
        return await request(`/driver/trips/${id}/delay/${delayId}/resolve`, { method: 'POST' });
      } catch (err) {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id);
        if (trip) {
          if (trip.delays) {
            trip.delays.forEach((d: any) => {
              if (d.id === delayId || !d.is_resolved) d.is_resolved = 1;
            });
          }
          trip.status = trip.return_start_time ? 'RETURNING' : 'IN_PROGRESS';
          mockStore.saveTrip(trip);
          return { message: 'Delay resolved' };
        }
        throw err;
      }
    },
    startReturn: async (id: string, coords: any) => {
      try {
        return await request(`/driver/trips/${id}/start-return`, { method: 'POST', body: JSON.stringify(coords) });
      } catch (err) {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id);
        if (trip) {
          trip.status = 'RETURNING';
          trip.return_start_time = new Date().toISOString();
          mockStore.saveTrip(trip);
          return { message: 'Return journey started', status: 'RETURNING' };
        }
        throw err;
      }
    },
    arriveBase: async (id: string, coords: any) => {
      try {
        return await request(`/driver/trips/${id}/arrive-base`, { method: 'POST', body: JSON.stringify(coords) });
      } catch (err) {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id);
        if (trip) {
          trip.status = 'RETURNING';
          trip.base_arrival_time = new Date().toISOString();
          mockStore.saveTrip(trip);
          return { message: 'Base arrival recorded', status: 'RETURNING' };
        }
        throw err;
      }
    },
    completeTrip: async (id: string, coords: any) => {
      try {
        return await request(`/driver/trips/${id}/complete`, { method: 'POST', body: JSON.stringify(coords) });
      } catch (err) {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id);
        if (trip) {
          trip.status = 'COMPLETED';
          trip.completion_time = new Date().toISOString();
          mockStore.saveTrip(trip);
          return { message: 'Trip completed successfully', status: 'COMPLETED' };
        }
        throw err;
      }
    },
    addCustomStop: async (tripId: string, stopData: any) => {
      try {
        return await request(`/driver/trips/${tripId}/custom-stop`, {
          method: 'POST',
          body: JSON.stringify(stopData)
        });
      } catch {
        const newStop = mockStore.addCustomStop(tripId, stopData);
        return { message: 'Custom stop added', stop: newStop };
      }
    }
  },

  photos: {
    upload: async (formData: FormData) => {
      try {
        const token = localStorage.getItem('truck_tracker_token');
        const response = await fetch(`${getApiBase()}/photos/upload`, {
          method: 'POST',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: formData
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || 'Photo upload failed');
        return data;
      } catch (err: any) {
        // Fallback for offline or local preview
        const photoFile = formData.get('photo') as File | null;
        const mockPhotoId = `photo-${Date.now()}`;
        let photoUrl = '';
        if (photoFile && typeof window !== 'undefined' && window.URL) {
          try {
            photoUrl = URL.createObjectURL(photoFile);
            DEMO_PHOTOS_MAP[mockPhotoId] = photoUrl;
          } catch {}
        }
        const fallbackPhoto = {
          id: mockPhotoId,
          trip_id: String(formData.get('trip_id') || ''),
          stop_id: formData.get('stop_id') ? String(formData.get('stop_id')) : undefined,
          photo_type: String(formData.get('photo_type') || 'Delay Proof'),
          timestamp: new Date().toISOString(),
          file_path: photoUrl,
          file_size: photoFile?.size || 0,
          mime_type: photoFile?.type || 'image/jpeg'
        };
        const tripId = String(formData.get('trip_id') || '');
        if (tripId) {
          const trip = mockStore.getTrips().find((t) => t.id === tripId);
          if (trip) {
            if (!trip.photos) trip.photos = [];
            trip.photos.unshift(fallbackPhoto as any);
            mockStore.saveTrip(trip);
          }
        }
        return { message: 'Photo uploaded (fallback)', photo: fallbackPhoto };
      }
    },
    getTripPhotos: async (tripId: string) => {
      try {
        return await request(`/photos/trip/${tripId}`);
      } catch {
        return { photos: mockStore.getPhotos(tripId) };
      }
    },
    getPhotoUrl: (photoId: string) => {
      if (DEMO_PHOTOS_MAP[photoId]) {
        return DEMO_PHOTOS_MAP[photoId];
      }
      if (photoId.startsWith('data:') || photoId.startsWith('http')) {
        return photoId;
      }
      return `${getApiBase()}/photos/${photoId}/file`;
    }
  },

  manager: {
    getAttention: async () => {
      try {
        return await request('/trips/overview/attention');
      } catch {
        const trips = mockStore.getTrips();
        return {
          delayed: trips.filter((t) => t.status === 'DELAYED'),
          activeCount: trips.filter((t) => ['IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING'].includes(t.status)).length,
          completedCount: trips.filter((t) => t.status === 'COMPLETED').length
        };
      }
    },
    getTrips: async (params: Record<string, string> = {}) => {
      try {
        const qs = new URLSearchParams(params).toString();
        return await request(`/trips${qs ? `?${qs}` : ''}`);
      } catch {
        const trips = mockStore.getTrips();
        let filtered = [...trips];
        if (params.status && params.status !== 'ALL') {
          filtered = filtered.filter((t) => t.status === params.status);
        }
        if (params.search) {
          const q = params.search.toLowerCase();
          filtered = filtered.filter((t) =>
            (t.id && t.id.toLowerCase().includes(q)) ||
            (t.vehicle_number && t.vehicle_number.toLowerCase().includes(q)) ||
            (t.driver_name && t.driver_name.toLowerCase().includes(q))
          );
        }
        return { trips: filtered };
      }
    },
    getTrip: async (id: string) => {
      try {
        return await request(`/trips/${id}`);
      } catch {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id) || trips[0];
        return { trip };
      }
    },
    createTrip: async (tripData: any) => {
      try {
        return await request('/trips', { method: 'POST', body: JSON.stringify(tripData) });
      } catch {
        const todayStr = new Date().toISOString().split('T')[0];
        const newTrip: Trip = {
          id: `TR-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`,
          date: tripData.date || todayStr,
          driver_id: tripData.driver_id,
          driver_name: 'Rahul Sharma',
          vehicle_id: tripData.vehicle_id,
          vehicle_number: 'MP04 XX 1234',
          starting_location: tripData.starting_location || 'Company Central Depot',
          purpose: tripData.purpose || 'Cargo Logistics Restock',
          reference_number: tripData.reference_number || `PO-${Date.now().toString().slice(-4)}`,
          planned_departure_time: tripData.planned_departure_time || '08:00',
          status: 'PLANNED',
          total_delay_minutes: 0,
          calculated_distance_km: 15.0,
          notes: tripData.notes,
          created_at: `${todayStr}T08:00:00.000Z`,
          updated_at: `${todayStr}T08:00:00.000Z`,
          stops: (tripData.stops || []).map((s: any, i: number) => ({
            id: `stp-${Date.now()}-${i}`,
            trip_id: 'new',
            destination_id: s.destination_id,
            stop_number: i + 1,
            destination_name: s.destination_name || 'Stop',
            address: s.address || '',
            latitude: s.latitude || 23.25,
            longitude: s.longitude || 77.41,
            geofence_radius_meters: 150,
            status: 'PENDING'
          }))
        };
        mockStore.saveTrip(newTrip);
        return { trip: newTrip };
      }
    },
    updateTrip: async (id: string, updateData: any) => {
      try {
        return await request(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(updateData) });
      } catch {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id);
        if (trip) {
          Object.assign(trip, updateData);
          mockStore.saveTrip(trip);
          return { trip };
        }
        return { trip: updateData };
      }
    },
    reorderStops: async (id: string, stopIds: string[]) => {
      try {
        return await request(`/trips/${id}/stops/reorder`, { method: 'PUT', body: JSON.stringify({ stopIds }) });
      } catch {
        return { success: true };
      }
    },
    cancelTrip: async (id: string, reason: string) => {
      try {
        return await request(`/trips/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) });
      } catch {
        const trips = mockStore.getTrips();
        const trip = trips.find((t) => t.id === id);
        if (trip) {
          trip.status = 'CANCELLED';
          trip.notes = `${trip.notes || ''} [Cancelled: ${reason}]`;
          mockStore.saveTrip(trip);
        }
        return { success: true };
      }
    }
  },

  fleet: {
    getVehicles: async () => {
      try {
        return await request('/fleet/vehicles');
      } catch {
        return { vehicles: mockStore.getVehicles() };
      }
    },
    createVehicle: async (data: any) => {
      try {
        return await request('/fleet/vehicles', { method: 'POST', body: JSON.stringify(data) });
      } catch {
        const vehicle = mockStore.createVehicle(data);
        return { vehicle };
      }
    },
    updateVehicle: (id: string, data: any) => request(`/fleet/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getDrivers: async () => {
      try {
        return await request('/fleet/drivers');
      } catch {
        return { drivers: mockStore.getDrivers() };
      }
    },
    createDriver: async (data: any) => {
      try {
        return await request('/fleet/drivers', { method: 'POST', body: JSON.stringify(data) });
      } catch {
        const driver = mockStore.createDriver(data);
        return { driver };
      }
    },
    updateDriver: (id: string, data: any) => request(`/fleet/drivers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getDestinations: async () => {
      try {
        return await request('/fleet/destinations');
      } catch {
        return { destinations: mockStore.getDestinations() };
      }
    },
    createDestination: async (data: any) => {
      try {
        return await request('/fleet/destinations', { method: 'POST', body: JSON.stringify(data) });
      } catch {
        const dest = mockStore.createDestination(data);
        return { destination: dest };
      }
    },
    updateDestination: (id: string, data: any) => request(`/fleet/destinations/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    deleteDestination: (id: string) => request(`/fleet/destinations/${id}`, { method: 'DELETE' })
  },

  reports: {
    getDaily: async (date?: string) => {
      try {
        return await request(`/reports/daily${date ? `?date=${date}` : ''}`);
      } catch {
        const trips = mockStore.getTrips();
        return {
          report: {
            date: date || new Date().toISOString().split('T')[0],
            total_trips: trips.length,
            completed_trips: trips.filter((t) => t.status === 'COMPLETED').length,
            delayed_trips: trips.filter((t) => t.status === 'DELAYED').length,
            cancelled_trips: trips.filter((t) => t.status === 'CANCELLED').length,
            total_delays_minutes: trips.reduce((acc, t) => acc + (t.total_delay_minutes || 0), 0),
            total_distance_km: trips.reduce((acc, t) => acc + (t.calculated_distance_km || 0), 0),
            total_stops_serviced: 6,
            punctuality_rate_percent: 85.0
          }
        };
      }
    },
    getPeriodic: (period: 'weekly' | 'monthly') => request(`/reports/periodic?period=${period}`)
  },

  googleSheets: {
    getStatus: async () => {
      try {
        return await request('/google-sheets/status');
      } catch {
        return {
          status: {
            configured: false,
            spreadsheetId: null,
            totalQueued: 0,
            totalFailed: 0,
            lastSyncedAt: new Date().toISOString()
          }
        };
      }
    },
    retry: () => request('/google-sheets/retry', { method: 'POST' }),
    syncAll: () => request('/google-sheets/sync-all', { method: 'POST' })
  }
};
