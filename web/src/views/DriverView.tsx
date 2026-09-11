import React, { useState, useEffect, useMemo } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  Play,
  CheckCircle,
  AlertTriangle,
  Camera,
  LogOut,
  Navigation,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  WifiOff,
  Wifi,
  Smartphone,
  Plus,
  ExternalLink,
  Compass,
  Radio,
  Building2,
  ChevronDown,
  ChevronUp,
  Map as MapIcon,
  RefreshCw
} from 'lucide-react';
import { api, getCurrentGpsPosition } from '../services/api';
import { mockStore } from '../services/mockData';
import { Trip, TripStop, User, Destination } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CameraModal } from '../components/CameraModal';
import { DelayModal } from '../components/DelayModal';
import { AddCustomStopModal } from '../components/AddCustomStopModal';
import { LeafletMap } from '../components/LeafletMap';
import { offlineQueue } from '../services/offlineQueue';
import { ThemeToggle } from '../components/ThemeToggle';

interface Props {
  currentUser: User;
  onLogout: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onSwitchRole?: (role: 'DRIVER' | 'MANAGER') => void;
}

// Mathematical Haversine Distance in Kilometers
function calculateHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Estimated Reaching Time based on Urban Logistics Speed (avg 28 km/h ~ 0.47 km/min)
function estimateReachingTimeMinutes(distanceKm: number): number {
  return Math.max(3, Math.round(distanceKm / 0.47));
}

export const DriverView: React.FC<Props> = ({ currentUser, onLogout, theme = 'dark', onToggleTheme, onSwitchRole }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [geofenceFeedback, setGeofenceFeedback] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDelayOpen, setIsDelayOpen] = useState(false);
  const [isCustomStopOpen, setIsCustomStopOpen] = useState(false);
  const [showRouteMap, setShowRouteMap] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(null);
  const [isRealGps, setIsRealGps] = useState(false);
  const [isRefreshingGps, setIsRefreshingGps] = useState(false);

  // Initialize fleet destinations immediately from store so nearest facility never flashes empty
  const [fleetDestinations, setFleetDestinations] = useState<Destination[]>(() => {
    try {
      return mockStore.getDestinations();
    } catch {
      return [];
    }
  });

  const [selectedNearestHub, setSelectedNearestHub] = useState<(Destination & { distanceKm: number; etaMinutes: number }) | null>(null);
  const [showAllNearby, setShowAllNearby] = useState(false);

  // Driver coordinates state: pre-seeded with cached fix if exists
  const [driverCoords, setDriverCoords] = useState<{ latitude: number; longitude: number }>(() => {
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('tt_last_real_gps');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.latitude && parsed.longitude) {
            return { latitude: parsed.latitude, longitude: parsed.longitude };
          }
        }
      } catch {}
    }
    return { latitude: 28.5355, longitude: 77.2680 };
  });

  // Calculate real-time nearest fleet facilities dynamically from live GPS
  // Filters out facilities closer than 50 meters (driver is already at that facility)
  const nearestLocations = useMemo(() => {
    if (!driverCoords || !fleetDestinations.length) return [];
    return fleetDestinations
      .filter((d) => d.latitude && d.longitude)
      .map((d) => {
        const dist = calculateHaversineDistanceKm(driverCoords.latitude, driverCoords.longitude, d.latitude, d.longitude);
        return {
          ...d,
          distanceKm: dist,
          etaMinutes: estimateReachingTimeMinutes(dist)
        };
      })
      .filter((d) => d.distanceKm > 0.05)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [driverCoords, fleetDestinations]);

  const closestHub = nearestLocations[0] || null;

  // Active GPS refresh action
  const handleRefreshGps = async () => {
    setIsRefreshingGps(true);
    try {
      const fix = await getCurrentGpsPosition({ timeoutMs: 9000, preferHighAccuracy: true });
      if (fix.latitude && fix.longitude) {
        setDriverCoords({ latitude: fix.latitude, longitude: fix.longitude });
        setGpsAccuracy(fix.gps_accuracy);
        setIsRealGps(fix.isReal);
        setGeofenceFeedback(
          fix.isReal
            ? `Live GPS Acquired: ${fix.latitude.toFixed(4)}°, ${fix.longitude.toFixed(4)}° (±${fix.gps_accuracy}m)`
            : (fix.error || 'Using route corridor position')
        );
        setTimeout(() => setGeofenceFeedback(null), 4000);
      }
    } finally {
      setIsRefreshingGps(false);
    }
  };

  // Set simulated position on route for testing
  const handleSimulateRoutePosition = () => {
    setDriverCoords({ latitude: 28.5355, longitude: 77.2680 });
    setGpsAccuracy(10);
    setIsRealGps(false);
    setGeofenceFeedback('Switched to Route Simulation: Company Depot, Okhla');
    setTimeout(() => setGeofenceFeedback(null), 3000);
  };

  useEffect(() => {
    // Initial fetch of GPS
    getCurrentGpsPosition({ timeoutMs: 5000 }).then((fix) => {
      if (fix.isReal && fix.latitude && fix.longitude) {
        setDriverCoords({ latitude: fix.latitude, longitude: fix.longitude });
        setGpsAccuracy(fix.gps_accuracy);
        setIsRealGps(true);
      }
    }).catch(() => {});

    let watchId: number | null = null;
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          setGpsAccuracy(Math.round(pos.coords.accuracy));
          setIsRealGps(true);
          setDriverCoords({
            latitude: Number(pos.coords.latitude.toFixed(6)),
            longitude: Number(pos.coords.longitude.toFixed(6))
          });
        },
        () => {
          // Standard accuracy fallback watcher
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setGpsAccuracy(Math.round(pos.coords.accuracy));
              setIsRealGps(true);
              setDriverCoords({
                latitude: Number(pos.coords.latitude.toFixed(6)),
                longitude: Number(pos.coords.longitude.toFixed(6))
              });
            },
            () => {},
            { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
          );
        },
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
      );
    }
    return () => {
      if (watchId !== null && navigator.geolocation) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  useEffect(() => {
    loadTodayTrips();

    // Fetch registered fleet destinations
    api.fleet.getDestinations().then((res) => {
      if (res?.destinations && res.destinations.length > 0) {
        setFleetDestinations(res.destinations);
      }
    }).catch(() => {});

    const unsubscribeQueue = offlineQueue.subscribe((count) => {
      setOfflineCount(count);
    });

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      unsubscribeQueue();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadTodayTrips = async () => {
    setLoading(true);
    try {
      // Fast path: check for an already-active trip first (avoids scanning all today's trips)
      const activeRes = await api.driver.getActiveTrip();
      if (activeRes.trip) {
        setActiveTrip(activeRes.trip);
        // Still load the trip list for the sidebar, but don't block on it
        api.driver.getTodayTrips().then((data) => setTrips(data.trips)).catch(() => {});
        return;
      }

      // No active trip — load the full today list normally
      const data = await api.driver.getTodayTrips();
      setTrips(data.trips);

      if (data.trips.length > 0) {
        loadTripDetails(data.trips[0].id);
      } else {
        setActiveTrip(null);
      }
    } catch (err) {
      console.error('Failed to load trips:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTripDetails = async (tripId: string) => {
    try {
      const data = await api.driver.getTrip(tripId);
      setActiveTrip(data.trip);
    } catch (err) {
      console.error('Failed to load trip details:', err);
    }
  };

  // Determine current stop
  const currentStop: TripStop | undefined = activeTrip?.stops?.find(
    (s) => s.status === 'PENDING' || s.status === 'ARRIVED' || s.status === 'IN_PROGRESS'
  );

  const completedStopsCount =
    activeTrip?.stops?.filter((s) => s.status === 'COMPLETED').length || 0;
  const totalStopsCount = activeTrip?.stops?.length || 0;
  const allStopsCompleted =
    totalStopsCount > 0 && completedStopsCount === totalStopsCount;

  // Active unresolved delay if any
  const activeDelay = activeTrip?.delays?.find((d) => !d.is_resolved);

  // ==========================================
  // ACTION HANDLERS
  // ==========================================

  const handleStartTrip = async () => {
    if (!activeTrip) return;
    setActionLoading(true);
    try {
      const coords = await getCurrentGpsPosition();
      await api.driver.startTrip(activeTrip.id, coords);
      await loadTripDetails(activeTrip.id);
    } catch (err: any) {
      alert(err.message || 'Failed to start trip');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArriveAtStop = async () => {
    if (!activeTrip || !currentStop) return;
    setActionLoading(true);
    setGeofenceFeedback(null);
    try {
      const coords = await getCurrentGpsPosition();
      const res = await api.driver.arriveStop(activeTrip.id, currentStop.id, coords);
      if (res.geofence) {
        setGeofenceFeedback(res.geofence.message);
      }
      await loadTripDetails(activeTrip.id);
    } catch (err: any) {
      alert(err.message || 'Failed to record arrival');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteActivity = async () => {
    if (!activeTrip || !currentStop) return;
    setActionLoading(true);
    try {
      await api.driver.completeActivity(activeTrip.id, currentStop.id, {
        activity_type: 'Delivery',
        status: 'COMPLETED',
        notes: 'Completed standard activity'
      });
      await loadTripDetails(activeTrip.id);
    } catch (err: any) {
      alert(err.message || 'Failed to complete activity');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDepartStop = async () => {
    if (!activeTrip || !currentStop) return;
    setActionLoading(true);
    try {
      const coords = await getCurrentGpsPosition();
      await api.driver.departStop(activeTrip.id, currentStop.id, coords);
      setGeofenceFeedback(null);
      await loadTripDetails(activeTrip.id);
    } catch (err: any) {
      alert(err.message || 'Failed to depart');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolveDelay = async () => {
    if (!activeTrip || !activeDelay) return;
    setActionLoading(true);
    try {
      await api.driver.resolveDelay(activeTrip.id, activeDelay.id);
      await loadTripDetails(activeTrip.id);
    } catch (err: any) {
      alert(err.message || 'Failed to resolve delay');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartReturn = async () => {
    if (!activeTrip) return;
    setActionLoading(true);
    try {
      const coords = await getCurrentGpsPosition();
      await api.driver.startReturn(activeTrip.id, coords);
      await loadTripDetails(activeTrip.id);
    } catch (err: any) {
      alert(err.message || 'Failed to start return');
    } finally {
      setActionLoading(false);
    }
  };

  const handleArriveAtBase = async () => {
    if (!activeTrip) return;
    setActionLoading(true);
    try {
      const coords = await getCurrentGpsPosition();
      await api.driver.arriveBase(activeTrip.id, coords);
      await loadTripDetails(activeTrip.id);
    } catch (err: any) {
      alert(err.message || 'Failed to record base arrival');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCompleteTrip = async () => {
    if (!activeTrip) return;
    setActionLoading(true);
    try {
      const coords = await getCurrentGpsPosition();
      await api.driver.completeTrip(activeTrip.id, coords);
      await loadTripDetails(activeTrip.id);
      await loadTodayTrips();
    } catch (err: any) {
      alert(err.message || 'Failed to complete trip');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', justifyContent: 'center', padding: '12px 12px 110px' }}>
      {/* Mobile Frame Container */}
      <div
        style={{
          maxWidth: '520px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px'
        }}
      >
        {/* Role Simulator Return Banner (if manager simulating driver) */}
        {onSwitchRole && currentUser.role === 'MANAGER' && (
          <div
            style={{
              backgroundColor: 'var(--accent-primary-subtle)',
              border: '1px solid var(--accent-primary-border)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-primary)', fontWeight: 600 }}>
              <Smartphone size={14} />
              <span>Simulating Driver Mobile Terminal</span>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => onSwitchRole('MANAGER')}
              style={{ padding: '3px 9px', fontSize: '0.74rem' }}
            >
              Return to Manager
            </button>
          </div>
        )}

        {/* Driver Top Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem'
              }}
            >
              <Truck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>
                {currentUser.name}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Field Logistics Driver
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Real Hardware Device GPS Status */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                color: gpsAccuracy !== null ? 'var(--status-success)' : 'var(--text-muted)',
                backgroundColor: gpsAccuracy !== null ? 'var(--status-success-bg)' : 'rgba(255, 255, 255, 0.05)',
                border: `1px solid ${gpsAccuracy !== null ? 'var(--status-success-border)' : 'var(--border-subtle)'}`,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)'
              }}
              title={gpsAccuracy !== null ? `Hardware GPS active: ±${gpsAccuracy}m` : 'Acquiring GPS fix...'}
            >
              <MapPin size={11} />
              {gpsAccuracy !== null ? `GPS ±${gpsAccuracy}m` : 'GPS'}
            </div>

            {/* Connection Status Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                color: isOnline ? 'var(--status-success)' : 'var(--status-delayed)',
                backgroundColor: isOnline ? 'var(--status-success-bg)' : 'var(--status-delayed-bg)',
                border: `1px solid ${isOnline ? 'var(--status-success-border)' : 'var(--status-delayed-border)'}`,
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)'
              }}
            >
              {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
              {isOnline ? 'Online' : 'Offline'}
            </div>

            {onToggleTheme && (
              <ThemeToggle theme={theme} onToggle={onToggleTheme} size={13} />
            )}

            <button
              onClick={onLogout}
              className="btn btn-secondary btn-sm"
              style={{ padding: '5px 8px' }}
              title="Logout"
            >
              <LogOut size={13} />
            </button>
          </div>
        </header>

        {/* Native Android APK Download Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            fontSize: '0.78rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1.1rem' }}>🤖</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Native Android App</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>v1.0.0 APK • Geofencing & Offline Telematics</div>
            </div>
          </div>
          <a
            href="https://github.com/Nixxzzzzz/truck_tracker/releases/download/v1.0.0/TruckTracker-v1.0.0.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary btn-sm"
            style={{
              padding: '3px 9px',
              fontSize: '0.74rem',
              color: 'var(--accent-primary)',
              borderColor: 'var(--border-medium)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>Download APK</span>
          </a>
        </div>

        {/* Offline Queued Events Banner */}
        {offlineCount > 0 && (
          <div
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.15)',
              border: '1px solid rgba(245, 158, 11, 0.3)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-delayed)' }}>
              <Clock size={16} />
              <span>Saved — waiting for network ({offlineCount} queued)</span>
            </div>
            <button
              className="btn btn-secondary"
              style={{ padding: '4px 8px', fontSize: '0.75rem' }}
              onClick={() => offlineQueue.processQueue()}
            >
              Sync Now
            </button>
          </div>
        )}

        {/* Active Unresolved Delay Banner */}
        {activeDelay && (
          <div
            style={{
              backgroundColor: 'var(--status-delayed-bg)',
              border: '1px solid rgba(245, 158, 11, 0.4)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-delayed)', fontWeight: 600 }}>
                <AlertTriangle size={18} />
                <span>DELAY REPORTED: {activeDelay.reason}</span>
              </div>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Started {new Date(activeDelay.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {activeDelay.description && (
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{activeDelay.description}</p>
            )}
            {activeDelay.photo_id && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--accent-gold)' }}>
                <Camera size={14} /> Photo evidence attached to delay report
              </div>
            )}
            <button
              className="btn btn-huge"
              style={{
                backgroundColor: 'var(--status-success)',
                color: '#0d0e11',
                padding: '14px',
                fontSize: '1rem',
                marginTop: '4px'
              }}
              onClick={handleResolveDelay}
              disabled={actionLoading}
            >
              <CheckCircle size={18} /> DELAY RESOLVED
            </button>
          </div>
        )}

        {/* Main Content: Trip Controller or No Trip Assigned */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
            Loading your operational assignments...
          </div>
        ) : !activeTrip ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
            <Truck size={48} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No Trips Assigned Today</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Check in with dispatch manager to receive your vehicle route schedule.
            </p>
            <button
              className="btn btn-secondary"
              style={{ marginTop: '16px' }}
              onClick={loadTodayTrips}
            >
              <RotateCcw size={16} /> Refresh
            </button>
          </div>
        ) : (
          /* Guided Trip Card */
          <div className="card card-gold-border" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Trip Header Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 600, letterSpacing: '0.04em' }}>
                  ACTIVE ASSIGNMENT
                </div>
                <h2 style={{ fontSize: '1.4rem', fontFamily: 'var(--font-display)', marginTop: '2px' }}>
                  {activeTrip.id}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activeTrip.vehicle_number}</span>
                  <span>•</span>
                  <span>{activeTrip.vehicle_model}</span>
                </div>
              </div>

              <StatusBadge status={activeTrip.status} />
            </div>

            {/* Planned Departure & Base */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                padding: '12px',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.82rem'
              }}
            >
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Planned Departure</div>
                <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)' }}>
                  {activeTrip.planned_departure_time}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--text-muted)' }}>Starting Base</div>
                <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeTrip.starting_location}
                </div>
              </div>
            </div>

            {/* Destination Progress Indicator */}
            <div style={{ padding: '4px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem', marginBottom: '6px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Destination Progress</span>
                <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>
                  {completedStopsCount} of {totalStopsCount} Completed
                </span>
              </div>
              <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${totalStopsCount > 0 ? (completedStopsCount / totalStopsCount) * 100 : 0}%`,
                    backgroundColor: 'var(--accent-gold)',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
            </div>

            {/* Geofence Feedback alert if present */}
            {geofenceFeedback && (
              <div
                style={{
                  padding: '10px 14px',
                  backgroundColor: geofenceFeedback.includes('Verified')
                    ? 'var(--status-success-bg)'
                    : 'var(--status-delayed-bg)',
                  border: `1px solid ${
                    geofenceFeedback.includes('Verified')
                      ? 'rgba(16, 185, 129, 0.3)'
                      : 'rgba(245, 158, 11, 0.3)'
                  }`,
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: geofenceFeedback.includes('Verified')
                    ? 'var(--status-success)'
                    : 'var(--status-delayed)'
                }}
              >
                <ShieldCheck size={18} />
                <span>{geofenceFeedback}</span>
              </div>
            )}

            {/* LIVE DRIVER ROUTE MAP (Rapido Captain / Uber Driver Navigation) */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 14px',
                  backgroundColor: 'var(--bg-secondary)',
                  borderBottom: showRouteMap ? '1px solid var(--border-subtle)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--accent-whatsapp)',
                      boxShadow: '0 0 6px var(--accent-whatsapp)'
                    }}
                  />
                  <span style={{ fontSize: '0.84rem', fontWeight: 600 }}>Live Route Navigation Map</span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    ({activeTrip.stops?.length || 0} stops • GPS active)
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setShowRouteMap(!showRouteMap)}
                  style={{ padding: '3px 8px', fontSize: '0.72rem' }}
                >
                  {showRouteMap ? 'Collapse Map' : 'Show Map'}
                </button>
              </div>

              {showRouteMap && (
                <div style={{ width: '100%', height: '240px', position: 'relative' }}>
                  <LeafletMap
                    baseLocation={{
                      name: activeTrip.starting_location || 'Base Depot HQ',
                      latitude: 28.5355,
                      longitude: 77.2680
                    }}
                    stops={activeTrip.stops || []}
                    driverLocation={{
                      latitude: driverCoords.latitude,
                      longitude: driverCoords.longitude,
                      accuracy: gpsAccuracy || undefined
                    }}
                    height="240px"
                    theme={theme}
                    showGoogleMapsButton={false}
                  />
                </div>
              )}
            </div>

            {/* LIVE GPS NEAREST FLEET FACILITY RADAR */}
            {closestHub && (
              <div
                style={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '12px 14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-full)',
                        backgroundColor: 'rgba(37, 211, 102, 0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-whatsapp)',
                        flexShrink: 0
                      }}
                    >
                      <Radio size={15} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--accent-whatsapp)', letterSpacing: '0.4px', textTransform: 'uppercase' }}>
                          Nearest Fleet Hub Radar
                        </span>
                        <span
                          style={{
                            fontSize: '0.64rem',
                            padding: '1px 6px',
                            borderRadius: 'var(--radius-full)',
                            backgroundColor: isRealGps ? 'rgba(37,211,102,0.18)' : 'rgba(245,158,11,0.18)',
                            color: isRealGps ? 'var(--accent-whatsapp)' : 'var(--status-delayed)',
                            fontWeight: 700
                          }}
                        >
                          {isRealGps ? 'LIVE SATELLITE GPS' : 'FLEET TELEMATICS'}
                        </span>
                      </div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <span>GPS: {driverCoords.latitude.toFixed(4)}°, {driverCoords.longitude.toFixed(4)}° {gpsAccuracy ? `(±${gpsAccuracy}m)` : ''}</span>
                        <button
                          type="button"
                          onClick={handleRefreshGps}
                          title="Acquire live GPS fix"
                          disabled={isRefreshingGps}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--accent-whatsapp)',
                            padding: '0 2px',
                            display: 'inline-flex',
                            alignItems: 'center'
                          }}
                        >
                          <RefreshCw size={11} className={isRefreshingGps ? 'spin-animation' : ''} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        backgroundColor: 'rgba(37, 211, 102, 0.15)',
                        color: 'var(--accent-whatsapp)',
                        padding: '3px 8px',
                        borderRadius: 'var(--radius-full)'
                      }}
                    >
                      {closestHub.distanceKm} km away
                    </span>
                    {nearestLocations.length > 1 && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setShowAllNearby(!showAllNearby)}
                        style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                      >
                        {showAllNearby ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      </button>
                    )}
                  </div>
                </div>

                {/* Proximity notice if testing far from fleet depot */}
                {closestHub.distanceKm > 50 && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      backgroundColor: 'rgba(245, 158, 11, 0.1)',
                      border: '1px solid rgba(245, 158, 11, 0.25)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.72rem',
                      gap: '8px',
                      flexWrap: 'wrap'
                    }}
                  >
                    <span style={{ color: 'var(--status-delayed)' }}>
                      📍 Device is outside Delhi corridor ({closestHub.distanceKm} km).
                    </span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={handleSimulateRoutePosition}
                        style={{ padding: '2px 8px', fontSize: '0.68rem', borderColor: 'rgba(245,158,11,0.4)' }}
                      >
                        Snap GPS to Depot
                      </button>
                    </div>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    backgroundColor: 'var(--bg-surface)',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                      {closestHub.name}
                    </div>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      ~{closestHub.etaMinutes} mins drive
                    </span>
                  </div>
                  {closestHub.address && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {closestHub.address}
                    </div>
                  )}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '6px' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setSelectedNearestHub(closestHub);
                        setIsCustomStopOpen(true);
                      }}
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        color: 'var(--accent-whatsapp)',
                        borderColor: 'rgba(37, 211, 102, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px'
                      }}
                    >
                      <Plus size={13} />
                      <span>Add as Stop</span>
                    </button>
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${closestHub.latitude},${closestHub.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{
                        flex: 1,
                        padding: '6px 10px',
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '4px',
                        textDecoration: 'none'
                      }}
                    >
                      <Navigation size={13} />
                      <span>Navigate</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>

                {/* Expanded Drawer for Other Nearby Facilities */}
                {showAllNearby && nearestLocations.length > 1 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', paddingTop: '4px' }}>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                      Other Nearby Hubs in Proximity:
                    </div>
                    {nearestLocations.slice(1, 4).map((hub) => (
                      <div
                        key={hub.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '8px 10px',
                          backgroundColor: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-sm)',
                          fontSize: '0.76rem'
                        }}
                      >
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                          <span style={{ fontWeight: 600 }}>{hub.name}</span>
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>{hub.distanceKm} km • ~{hub.etaMinutes}m</div>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => {
                              setSelectedNearestHub(hub);
                              setIsCustomStopOpen(true);
                            }}
                            style={{ padding: '2px 6px', fontSize: '0.68rem' }}
                          >
                            + Stop
                          </button>
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${hub.latitude},${hub.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '2px 6px', fontSize: '0.68rem', textDecoration: 'none' }}
                          >
                            <Navigation size={10} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* STAGE CONTROLLER ACTIONS */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '6px' }}>
              {/* STAGE 1: Trip Not Started Yet */}
              {(activeTrip.status === 'ASSIGNED' || activeTrip.status === 'PLANNED') && (
                <div>
                  <button
                    className="btn btn-huge btn-primary"
                    onClick={handleStartTrip}
                    disabled={actionLoading}
                  >
                    <Play size={20} /> START TRIP
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                    Press when departing company depot. Departure GPS & server timestamp will be recorded.
                  </p>
                </div>
              )}

              {/* STAGE 2: Trip In Progress - Stop Actions */}
              {activeTrip.status === 'IN_PROGRESS' && currentStop && (() => {
                const distToCurrent = currentStop.latitude && currentStop.longitude && driverCoords
                  ? calculateHaversineDistanceKm(driverCoords.latitude, driverCoords.longitude, currentStop.latitude, currentStop.longitude)
                  : null;
                const etaMins = distToCurrent !== null ? estimateReachingTimeMinutes(distToCurrent) : null;
                const arrivalClock = etaMins !== null
                  ? new Date(Date.now() + etaMins * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                  : currentStop.planned_arrival_time;

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        borderLeft: '4px solid var(--accent-whatsapp)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.75rem', color: 'var(--accent-whatsapp)', fontWeight: 700, letterSpacing: '0.5px' }}>
                          NEXT DESTINATION (STOP {currentStop.stop_number} OF {totalStopsCount})
                        </div>
                        {distToCurrent !== null && (
                          <div
                            style={{
                              fontSize: '0.72rem',
                              fontWeight: 700,
                              backgroundColor: 'rgba(37, 211, 102, 0.15)',
                              color: 'var(--accent-whatsapp)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)'
                            }}
                          >
                            📍 {distToCurrent} km away
                          </div>
                        )}
                      </div>

                      <div style={{ fontSize: '1.15rem', fontWeight: 600 }}>
                        {currentStop.destination_name}
                      </div>

                      <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '5px' }}>
                        <MapPin size={14} style={{ flexShrink: 0 }} />
                        <span>{currentStop.address}</span>
                      </div>

                      {/* Distance, ETA & Coordinates Strip */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                          gap: '8px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--border-subtle)',
                          fontSize: '0.78rem'
                        }}
                      >
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>Reaching Time (ETA)</div>
                          <div style={{ fontWeight: 600, color: 'var(--accent-whatsapp)' }}>
                            {etaMins !== null ? `~${etaMins} mins (${arrivalClock})` : currentStop.planned_arrival_time}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--text-muted)' }}>Coordinates</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.74rem' }}>
                            {currentStop.latitude?.toFixed(4)}, {currentStop.longitude?.toFixed(4)}
                          </div>
                        </div>
                      </div>

                      {/* Turn-by-Turn Google Navigation Button */}
                      {currentStop.latitude && currentStop.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${currentStop.latitude},${currentStop.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary btn-sm"
                          style={{
                            marginTop: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            color: 'var(--accent-whatsapp)',
                            borderColor: 'var(--border-medium)',
                            textDecoration: 'none'
                          }}
                        >
                          <Navigation size={13} />
                          <span>Start Turn-by-Turn Google Navigation</span>
                          <ExternalLink size={12} />
                        </a>
                      )}
                    </div>

                    <button
                      className="btn btn-huge btn-primary"
                      onClick={handleArriveAtStop}
                      disabled={actionLoading}
                      style={{
                        backgroundColor: 'var(--accent-whatsapp)',
                        borderColor: 'var(--accent-whatsapp)',
                        color: '#0b141a',
                        fontWeight: 700
                      }}
                    >
                      <MapPin size={20} /> ARRIVED AT STOP
                    </button>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsDelayOpen(true)}
                      >
                        <AlertTriangle size={16} /> Report Delay
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setIsCameraOpen(true)}
                      >
                        <Camera size={16} /> Take Photo
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setIsCustomStopOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 14px',
                        borderStyle: 'dashed'
                      }}
                    >
                      <Plus size={16} color="var(--accent-whatsapp)" />
                      <span>Add Custom Stop (Emergency / Ad-hoc)</span>
                    </button>
                  </div>
                );
              })()}

              {/* STAGE 3: At Destination (Arrived / In Progress Stop) */}
              {(activeTrip.status === 'AT_DESTINATION' || (activeTrip.status === 'IN_PROGRESS' && currentStop?.status === 'ARRIVED')) && currentStop && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      padding: '14px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid var(--status-success)'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--status-success)', fontWeight: 600 }}>
                      CURRENTLY AT STOP {currentStop.stop_number}
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 600, marginTop: '2px' }}>
                      {currentStop.destination_name}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Arrived: {currentStop.actual_arrival_time ? new Date(currentStop.actual_arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                      {currentStop.arrival_diff_minutes ? ` (${currentStop.arrival_diff_minutes > 0 ? `+${currentStop.arrival_diff_minutes}m late` : `${currentStop.arrival_diff_minutes}m early`})` : ''}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      className="btn btn-primary"
                      style={{ padding: '14px', backgroundColor: 'var(--accent-whatsapp)', borderColor: 'var(--accent-whatsapp)', color: '#0b141a', fontWeight: 700 }}
                      onClick={handleCompleteActivity}
                      disabled={actionLoading}
                    >
                      <CheckCircle size={18} /> COMPLETE ACTIVITY
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{ padding: '14px' }}
                      onClick={() => setIsCameraOpen(true)}
                    >
                      <Camera size={18} /> TAKE PHOTO
                    </button>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setIsDelayOpen(true)}
                    >
                      <AlertTriangle size={16} /> Report Delay
                    </button>

                    <button
                      className="btn btn-success"
                      onClick={handleDepartStop}
                      disabled={actionLoading}
                    >
                      <Navigation size={16} /> DEPART STOP
                    </button>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsCustomStopOpen(true)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      padding: '8px 12px',
                      borderStyle: 'dashed',
                      fontSize: '0.78rem'
                    }}
                  >
                    <Plus size={14} color="var(--accent-whatsapp)" />
                    <span>Add Another Stop Next</span>
                  </button>
                </div>
              )}

              {/* STAGE 4: All Stops Completed -> Start Return */}
              {allStopsCompleted && activeTrip.status === 'IN_PROGRESS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      padding: '14px',
                      backgroundColor: 'var(--status-success-bg)',
                      border: '1px solid rgba(16, 185, 129, 0.3)',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ color: 'var(--status-success)', fontWeight: 600, fontSize: '1rem' }}>
                      🎉 ALL DESTINATIONS COMPLETED!
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      All {totalStopsCount} stops delivered and departed. Ready to head back to base.
                    </div>
                  </div>

                  <button
                    className="btn btn-huge btn-primary"
                    onClick={handleStartReturn}
                    disabled={actionLoading}
                  >
                    <RotateCcw size={20} /> START RETURN JOURNEY
                  </button>
                </div>
              )}

              {/* STAGE 5: Returning -> Arrived at Base */}
              {activeTrip.status === 'RETURNING' && !activeTrip.base_arrival_time && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      padding: '14px',
                      backgroundColor: 'var(--status-returning-bg)',
                      borderRadius: 'var(--radius-md)',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ color: 'var(--status-returning)', fontWeight: 600 }}>
                      VEHICLE EN ROUTE TO BASE
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      Head back safely to {activeTrip.starting_location}
                    </div>
                  </div>

                  <button
                    className="btn btn-huge btn-primary"
                    onClick={handleArriveAtBase}
                    disabled={actionLoading}
                  >
                    <MapPin size={20} /> ARRIVED AT BASE
                  </button>

                  <button
                    className="btn btn-secondary"
                    onClick={() => setIsDelayOpen(true)}
                  >
                    <AlertTriangle size={16} /> Report Transit Delay
                  </button>
                </div>
              )}

              {/* STAGE 6: Arrived at Base -> Complete Trip Summary */}
              {activeTrip.status === 'RETURNING' && activeTrip.base_arrival_time && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-medium)'
                    }}
                  >
                    <h4 style={{ fontSize: '1rem', color: 'var(--accent-gold)', marginBottom: '10px' }}>
                      TRIP SUMMARY
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.85rem' }}>
                      <div>Total Destinations: <b>{totalStopsCount}</b></div>
                      <div>Completed: <b>{completedStopsCount}</b></div>
                      <div>Total Delays: <b>{activeTrip.total_delay_minutes || 0} mins</b></div>
                      <div>Base Arrival: <b>Recorded</b></div>
                    </div>
                  </div>

                  <button
                    className="btn btn-huge btn-primary"
                    onClick={handleCompleteTrip}
                    disabled={actionLoading}
                  >
                    <CheckCircle size={20} /> COMPLETE TRIP
                  </button>
                </div>
              )}

              {/* STAGE 7: Completed */}
              {activeTrip.status === 'COMPLETED' && (
                <div
                  style={{
                    padding: '20px',
                    backgroundColor: 'var(--status-success-bg)',
                    borderRadius: 'var(--radius-lg)',
                    textAlign: 'center'
                  }}
                >
                  <CheckCircle size={36} color="var(--status-success)" style={{ margin: '0 auto 8px' }} />
                  <h3 style={{ fontSize: '1.15rem', color: 'var(--status-success)' }}>Trip Completed Successfully</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    All logs, timestamps, and GPS proof points are recorded and synchronized to headquarters.
                  </p>
                </div>
              )}
            </div>

            {/* Destination Stops List Accordion */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px', marginTop: '4px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Trip Route Stops ({activeTrip.stops?.length || 0})
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsCustomStopOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    color: 'var(--accent-whatsapp)',
                    borderColor: 'var(--border-medium)'
                  }}
                >
                  <Plus size={13} />
                  <span>Add Custom Stop</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeTrip.stops?.map((stop, index) => {
                  const isCurrent = currentStop?.id === stop.id;
                  const isDone = stop.status === 'COMPLETED';

                  // Calculate inter-stop leg distance
                  const prevLat = index === 0 ? (28.5355) : (activeTrip.stops![index - 1].latitude || 28.5355);
                  const prevLng = index === 0 ? (77.2680) : (activeTrip.stops![index - 1].longitude || 77.2680);
                  const legDist = stop.latitude && stop.longitude
                    ? calculateHaversineDistanceKm(prevLat, prevLng, stop.latitude, stop.longitude)
                    : null;
                  const legMins = legDist !== null ? estimateReachingTimeMinutes(legDist) : null;

                  return (
                    <div
                      key={stop.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                        padding: '12px 14px',
                        backgroundColor: isCurrent ? 'var(--bg-surface-elevated)' : 'var(--bg-secondary)',
                        border: `1px solid ${isCurrent ? 'var(--accent-whatsapp)' : 'var(--border-subtle)'}`,
                        borderRadius: 'var(--radius-md)',
                        opacity: isDone ? 0.75 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '26px',
                              height: '26px',
                              borderRadius: '50%',
                              backgroundColor: isDone
                                ? 'var(--status-success)'
                                : isCurrent
                                ? 'var(--accent-whatsapp)'
                                : 'var(--border-medium)',
                              color: isCurrent || isDone ? '#0d0e11' : 'var(--text-primary)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            {isDone ? '✓' : stop.stop_number}
                          </div>
                          <div>
                            <div style={{ fontSize: '0.9rem', fontWeight: 600 }}>{stop.destination_name}</div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              {stop.address}
                            </div>
                          </div>
                        </div>

                        <StatusBadge status={stop.status} />
                      </div>

                      {/* Technical Route Telemetry: Coordinates, Leg Distance & Reaching Time */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '6px',
                          paddingTop: '6px',
                          borderTop: '1px dashed var(--border-subtle)',
                          fontSize: '0.72rem',
                          color: 'var(--text-secondary)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {legDist !== null && (
                            <span style={{ fontWeight: 600, color: 'var(--accent-whatsapp)' }}>
                              📏 {legDist} km from {index === 0 ? 'Depot' : `Stop #${index}`} (~{legMins}m)
                            </span>
                          )}
                          {stop.latitude && stop.longitude && (
                            <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                              GPS: {stop.latitude.toFixed(4)}, {stop.longitude.toFixed(4)}
                            </span>
                          )}
                        </div>

                        {stop.latitude && stop.longitude && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--accent-whatsapp)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '3px',
                              fontWeight: 600
                            }}
                          >
                            <Navigation size={11} />
                            <span>Navigate</span>
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Other Trips for Today */}
        {trips.length > 1 && (
          <div style={{ marginTop: '8px' }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Other Scheduled Trips ({trips.length - 1})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {trips
                .filter((t) => t.id !== activeTrip?.id)
                .map((t) => (
                  <div
                    key={t.id}
                    onClick={() => loadTripDetails(t.id)}
                    className="card"
                    style={{
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.id}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Vehicle: {t.vehicle_number} • {t.planned_departure_time}
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--text-muted)" />
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>

      {/* Camera Capture Modal */}
      {isCameraOpen && activeTrip && (
        <CameraModal
          tripId={activeTrip.id}
          stopId={currentStop?.id}
          onSuccess={() => loadTripDetails(activeTrip.id)}
          onClose={() => setIsCameraOpen(false)}
        />
      )}

      {/* Delay Reporting Modal */}
      {isDelayOpen && activeTrip && (
        <DelayModal
          tripId={activeTrip.id}
          stopId={currentStop?.id}
          onSuccess={() => loadTripDetails(activeTrip.id)}
          onClose={() => setIsDelayOpen(false)}
        />
      )}

      {/* Add Custom Stop Modal */}
      {isCustomStopOpen && activeTrip && (
        <AddCustomStopModal
          tripId={activeTrip.id}
          currentStopCount={activeTrip.stops?.length || 0}
          initialDestination={selectedNearestHub}
          currentDriverCoords={driverCoords}
          onSuccess={(_newStop) => {
            loadTripDetails(activeTrip.id);
            setSelectedNearestHub(null);
          }}
          onClose={() => {
            setIsCustomStopOpen(false);
            setSelectedNearestHub(null);
          }}
        />
      )}
    </div>
  );
};
