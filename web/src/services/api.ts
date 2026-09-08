import { offlineQueue } from './offlineQueue';

const API_BASE = '/api';

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
  const url = `${API_BASE}${endpoint}`;
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
    login: (body: { email: string; password: string }) =>
      request('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
    getMe: () => request('/auth/me')
  },

  driver: {
    getTodayTrips: () => request('/driver/trips/today'),
    getTrip: (id: string) => request(`/driver/trips/${id}`),
    startTrip: (id: string, coords: any) =>
      request(`/driver/trips/${id}/start`, { method: 'POST', body: JSON.stringify(coords) }),
    arriveStop: (id: string, stopId: string, coords: any) =>
      request(`/driver/trips/${id}/stops/${stopId}/arrive`, { method: 'POST', body: JSON.stringify(coords) }),
    completeActivity: (id: string, stopId: string, data: any) =>
      request(`/driver/trips/${id}/stops/${stopId}/complete-activity`, { method: 'POST', body: JSON.stringify(data) }),
    departStop: (id: string, stopId: string, coords: any) =>
      request(`/driver/trips/${id}/stops/${stopId}/depart`, { method: 'POST', body: JSON.stringify(coords) }),
    reportDelay: (id: string, data: any) =>
      request(`/driver/trips/${id}/delay`, { method: 'POST', body: JSON.stringify(data) }),
    resolveDelay: (id: string, delayId: string) =>
      request(`/driver/trips/${id}/delay/${delayId}/resolve`, { method: 'POST' }),
    startReturn: (id: string, coords: any) =>
      request(`/driver/trips/${id}/start-return`, { method: 'POST', body: JSON.stringify(coords) }),
    arriveBase: (id: string, coords: any) =>
      request(`/driver/trips/${id}/arrive-base`, { method: 'POST', body: JSON.stringify(coords) }),
    completeTrip: (id: string, coords: any) =>
      request(`/driver/trips/${id}/complete`, { method: 'POST', body: JSON.stringify(coords) })
  },

  photos: {
    upload: async (formData: FormData) => {
      const token = localStorage.getItem('truck_tracker_token');
      const response = await fetch(`${API_BASE}/photos/upload`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Photo upload failed');
      return data;
    }
  },

  manager: {
    getAttention: () => request('/trips/overview/attention'),
    getTrips: (params: Record<string, string> = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/trips${qs ? `?${qs}` : ''}`);
    },
    getTrip: (id: string) => request(`/trips/${id}`),
    createTrip: (tripData: any) =>
      request('/trips', { method: 'POST', body: JSON.stringify(tripData) }),
    updateTrip: (id: string, updateData: any) =>
      request(`/trips/${id}`, { method: 'PUT', body: JSON.stringify(updateData) }),
    reorderStops: (id: string, stopIds: string[]) =>
      request(`/trips/${id}/stops/reorder`, { method: 'PUT', body: JSON.stringify({ stopIds }) }),
    cancelTrip: (id: string, reason: string) =>
      request(`/trips/${id}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) })
  },

  fleet: {
    getVehicles: () => request('/fleet/vehicles'),
    createVehicle: (data: any) => request('/fleet/vehicles', { method: 'POST', body: JSON.stringify(data) }),
    updateVehicle: (id: string, data: any) => request(`/fleet/vehicles/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getDrivers: () => request('/fleet/drivers'),
    createDriver: (data: any) => request('/fleet/drivers', { method: 'POST', body: JSON.stringify(data) }),
    updateDriver: (id: string, data: any) => request(`/fleet/drivers/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
    getDestinations: () => request('/fleet/destinations'),
    createDestination: (data: any) => request('/fleet/destinations', { method: 'POST', body: JSON.stringify(data) }),
    updateDestination: (id: string, data: any) => request(`/fleet/destinations/${id}`, { method: 'PUT', body: JSON.stringify(data) })
  },

  reports: {
    getDaily: (date?: string) => request(`/reports/daily${date ? `?date=${date}` : ''}`),
    getPeriodic: (period: 'weekly' | 'monthly') => request(`/reports/periodic?period=${period}`)
  },

  googleSheets: {
    getStatus: () => request('/google-sheets/status'),
    retry: () => request('/google-sheets/retry', { method: 'POST' }),
    syncAll: () => request('/google-sheets/sync-all', { method: 'POST' })
  }
};
