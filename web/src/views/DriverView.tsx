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
  RefreshCw,
  FileText,
  Check
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

  // Helper to resolve official Facility Area Code for any stop
  const getStopAreaCode = (stop: TripStop): string | undefined => {
    if (stop.area_code) return stop.area_code;
    const match = fleetDestinations.find(
      (d) => d.id === stop.destination_id || d.name.toLowerCase() === stop.destination_name.toLowerCase()
    );
    return match?.area_code;
  };

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
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--sap-neutral-bg, var(--bg-primary))',
        display: 'flex',
        justifyContent: 'center',
        padding: '12px 12px 110px'
      }}
    >
      {/* Mobile Frame Container */}
      <div
        style={{
          maxWidth: '540px',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* SAP OnePortal Fiori ShellBar Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--sap-shellbar-bg, #1D2D3E)',
            color: 'var(--sap-shellbar-text, #FFFFFF)',
            borderRadius: 'var(--radius-lg, 12px)',
            boxShadow: '0 4px 14px rgba(0, 32, 70, 0.18)'
          }}
        >
          {/* SAP Brand & Driver Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                backgroundColor: 'var(--sap-brand, #0070F2)',
                padding: '4px 8px',
                borderRadius: '6px',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                letterSpacing: '0.5px'
              }}
            >
              <span>SAP</span>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span style={{ fontSize: '0.96rem', fontWeight: 700, color: '#ffffff' }}>OnePortal</span>
                <span style={{ fontSize: '0.68rem', backgroundColor: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: '4px', color: '#e0ecf8' }}>
                  DRIVER
                </span>
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--sap-shellbar-subtext, #8FA8BF)', marginTop: '1px' }}>
                {currentUser.name} • Fleet Terminal
              </div>
            </div>
          </div>

          {/* Status Indicators & Quick Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Real Hardware Device GPS Status Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: gpsAccuracy !== null ? '#107E3E' : '#A9BCCF',
                backgroundColor: gpsAccuracy !== null ? 'rgba(16, 126, 62, 0.22)' : 'rgba(255, 255, 255, 0.1)',
                border: `1px solid ${gpsAccuracy !== null ? 'rgba(16, 126, 62, 0.45)' : 'rgba(255, 255, 255, 0.2)'}`,
                padding: '3px 8px',
                borderRadius: '9999px'
              }}
              title={gpsAccuracy !== null ? `Hardware GPS active: ±${gpsAccuracy}m` : 'Acquiring GPS fix...'}
            >
              <MapPin size={11} />
              {gpsAccuracy !== null ? `±${gpsAccuracy}m` : 'GPS'}
            </div>

            {/* Live SAP Sync Status Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.7rem',
                fontWeight: 600,
                color: isOnline ? '#107E3E' : '#E9730C',
                backgroundColor: isOnline ? 'rgba(16, 126, 62, 0.22)' : 'rgba(233, 115, 12, 0.22)',
                border: `1px solid ${isOnline ? 'rgba(16, 126, 62, 0.45)' : 'rgba(233, 115, 12, 0.45)'}`,
                padding: '3px 8px',
                borderRadius: '9999px'
              }}
            >
              {isOnline ? <Wifi size={11} /> : <WifiOff size={11} />}
              {isOnline ? 'SAP Live' : 'Offline'}
            </div>

            {onToggleTheme && (
              <ThemeToggle theme={theme} onToggle={onToggleTheme} size={13} />
            )}

            <button
              onClick={onLogout}
              className="btn btn-secondary btn-sm"
              style={{
                padding: '5px 8px',
                backgroundColor: 'rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                borderColor: 'rgba(255, 255, 255, 0.25)'
              }}
              title="Logout"
            >
              <LogOut size={13} />
            </button>
          </div>
        </header>

        {/* Role Simulator Return Banner (if manager simulating driver) */}
        {onSwitchRole && currentUser.role === 'MANAGER' && (
          <div
            style={{
              backgroundColor: 'var(--sap-info-bg, rgba(0, 112, 242, 0.12))',
              border: '1px solid var(--sap-brand, #0070F2)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '8px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.8rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--sap-brand, #0070F2)', fontWeight: 600 }}>
              <Smartphone size={15} />
              <span>Simulating SAP Driver Execution Terminal</span>
            </div>
            <button
              type="button"
              className="btn btn-sap-primary btn-sm"
              onClick={() => onSwitchRole('MANAGER')}
              style={{ padding: '4px 10px', fontSize: '0.74rem' }}
            >
              Return to Manager
            </button>
          </div>
        )}

        {/* Offline Queued Events Banner */}
        {offlineCount > 0 && (
          <div
            style={{
              backgroundColor: 'var(--sap-critical-bg, #FFF5EB)',
              border: '1px solid var(--sap-critical-border, #FCD5B5)',
              borderRadius: 'var(--radius-md, 8px)',
              padding: '10px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.82rem',
              color: 'var(--sap-critical, #E9730C)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600 }}>
              <Clock size={16} />
              <span>Events queued locally ({offlineCount} actions pending SAP sync)</span>
            </div>
            <button
              className="btn btn-sap-secondary btn-sm"
              style={{ padding: '4px 9px', fontSize: '0.74rem' }}
              onClick={() => offlineQueue.processQueue()}
            >
              Sync Now
            </button>
          </div>
        )}

        {/* Active Unresolved Delay Banner (SAP Fiori Critical Warning) */}
        {activeDelay && (
          <div
            style={{
              backgroundColor: 'var(--sap-critical-bg, #FFF5EB)',
              border: '1px solid var(--sap-critical-border, #FCD5B5)',
              borderRadius: 'var(--radius-lg, 12px)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              boxShadow: 'var(--sap-shadow-card)'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--sap-critical, #E9730C)', fontWeight: 700 }}>
                <AlertTriangle size={20} />
                <span style={{ fontSize: '0.92rem' }}>ACTIVE DELAY: {activeDelay.reason.toUpperCase()}</span>
              </div>
              <span style={{ fontSize: '0.74rem', color: 'var(--sap-text-caption, #6A7D8F)', fontWeight: 600 }}>
                Started {new Date(activeDelay.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            {activeDelay.description && (
              <p style={{ fontSize: '0.86rem', color: 'var(--sap-text-body, #32363A)', margin: 0 }}>{activeDelay.description}</p>
            )}
            {activeDelay.photo_id && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--sap-brand, #0070F2)' }}>
                <Camera size={14} /> Photo proof attached to delay log
              </div>
            )}
            <button
              className="btn btn-sap-positive btn-huge"
              style={{
                padding: '14px',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
              onClick={handleResolveDelay}
              disabled={actionLoading}
            >
              <CheckCircle size={18} /> DELAY RESOLVED — RESUME ROUTE
            </button>
          </div>
        )}

        {/* Main Content: Trip Controller or No Trip Assigned */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--sap-text-caption, #6A7D8F)' }}>
            Loading SAP dispatch assignments...
          </div>
        ) : !activeTrip ? (
          <div className="card" style={{ textAlign: 'center', padding: '40px 20px', backgroundColor: 'var(--sap-card-bg)', border: '1px solid var(--sap-border-color)' }}>
            <Truck size={48} color="var(--sap-text-caption, #6A7D8F)" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '6px', color: 'var(--sap-text-title)' }}>No Assigned Shipments Today</h3>
            <p style={{ fontSize: '0.88rem', color: 'var(--sap-text-body)' }}>
              Check with Dispatch Command to receive your SAP Freight Order and route schedule.
            </p>
            <button
              className="btn btn-sap-secondary"
              style={{ marginTop: '16px' }}
              onClick={loadTodayTrips}
            >
              <RotateCcw size={16} /> Refresh Assignments
            </button>
          </div>
        ) : (
          /* SAP Horizon Guided Trip Card */
          <div
            className="card"
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              backgroundColor: 'var(--sap-card-bg)',
              border: '1px solid var(--sap-border-color)',
              boxShadow: 'var(--sap-shadow-card)',
              borderRadius: 'var(--radius-lg, 12px)'
            }}
          >
            {/* SAP Freight Order Header Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      backgroundColor: 'var(--sap-info-bg)',
                      color: 'var(--sap-brand)',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      letterSpacing: '0.04em'
                    }}
                  >
                    SAP FREIGHT ORDER (TOR)
                  </span>
                  {activeTrip.cost_center && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 600,
                        backgroundColor: 'var(--sap-neutral-bg)',
                        color: 'var(--sap-text-caption)',
                        padding: '2px 6px',
                        borderRadius: '4px'
                      }}
                    >
                      {activeTrip.cost_center}
                    </span>
                  )}
                </div>
                <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: 'var(--sap-text-title)', marginTop: '4px', letterSpacing: '-0.02em' }}>
                  {activeTrip.sap_shipment_num || activeTrip.id}
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: 'var(--sap-text-caption)', marginTop: '2px' }}>
                  <span style={{ fontWeight: 700, color: 'var(--sap-text-body)' }}>{activeTrip.vehicle_number}</span>
                  <span>•</span>
                  <span>{activeTrip.vehicle_model || 'Heavy Truck'}</span>
                  {activeTrip.erp_delivery_doc && (
                    <>
                      <span>•</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.76rem' }}>Doc: {activeTrip.erp_delivery_doc}</span>
                    </>
                  )}
                </div>
              </div>

              <StatusBadge status={activeTrip.status} />
            </div>

            {/* Planned Departure & Base Strip */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '10px',
                padding: '10px 14px',
                backgroundColor: 'var(--sap-neutral-bg)',
                borderRadius: '8px',
                fontSize: '0.8rem',
                border: '1px solid var(--sap-border-color)'
              }}
            >
              <div>
                <div style={{ color: 'var(--sap-text-caption)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Planned Departure</div>
                <div style={{ fontWeight: 700, marginTop: '2px', color: 'var(--sap-text-body)' }}>
                  {activeTrip.planned_departure_time}
                </div>
              </div>
              <div>
                <div style={{ color: 'var(--sap-text-caption)', fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 600 }}>Starting Depot</div>
                <div style={{ fontWeight: 700, marginTop: '2px', color: 'var(--sap-text-body)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {activeTrip.starting_location}
                </div>
              </div>
            </div>

            {/* SAP Milestone 4-Stage Stepper */}
            <div className="sap-milestone-bar">
              {/* Step 1: Base Start */}
              <div className={`sap-milestone-step ${activeTrip.status !== 'ASSIGNED' && activeTrip.status !== 'PLANNED' ? 'completed' : 'active'}`}>
                <div className={`sap-step-circle ${activeTrip.status !== 'ASSIGNED' && activeTrip.status !== 'PLANNED' ? 'completed' : 'active'}`}>
                  {activeTrip.status !== 'ASSIGNED' && activeTrip.status !== 'PLANNED' ? <Check size={14} /> : '1'}
                </div>
                <div className={`sap-step-label ${activeTrip.status === 'ASSIGNED' || activeTrip.status === 'PLANNED' ? 'active' : 'completed'}`}>
                  Base Start
                </div>
              </div>

              {/* Step 2: Deliveries */}
              <div className={`sap-milestone-step ${allStopsCompleted ? 'completed' : (activeTrip.status === 'IN_PROGRESS' || activeTrip.status === 'AT_DESTINATION') ? 'active' : 'upcoming'}`}>
                <div className={`sap-step-circle ${allStopsCompleted ? 'completed' : (activeTrip.status === 'IN_PROGRESS' || activeTrip.status === 'AT_DESTINATION') ? 'active' : 'upcoming'}`}>
                  {allStopsCompleted ? <Check size={14} /> : `${completedStopsCount}/${totalStopsCount}`}
                </div>
                <div className={`sap-step-label ${(activeTrip.status === 'IN_PROGRESS' || activeTrip.status === 'AT_DESTINATION') ? 'active' : allStopsCompleted ? 'completed' : ''}`}>
                  Deliveries
                </div>
              </div>

              {/* Step 3: Base Return */}
              <div className={`sap-milestone-step ${activeTrip.status === 'COMPLETED' || (activeTrip.status === 'RETURNING' && activeTrip.base_arrival_time) ? 'completed' : activeTrip.status === 'RETURNING' ? 'active' : 'upcoming'}`}>
                <div className={`sap-step-circle ${activeTrip.status === 'COMPLETED' || (activeTrip.status === 'RETURNING' && activeTrip.base_arrival_time) ? 'completed' : activeTrip.status === 'RETURNING' ? 'active' : 'upcoming'}`}>
                  {activeTrip.status === 'COMPLETED' || (activeTrip.status === 'RETURNING' && activeTrip.base_arrival_time) ? <Check size={14} /> : '3'}
                </div>
                <div className={`sap-step-label ${activeTrip.status === 'RETURNING' ? 'active' : activeTrip.status === 'COMPLETED' ? 'completed' : ''}`}>
                  Return
                </div>
              </div>

              {/* Step 4: TM Settlement */}
              <div className={`sap-milestone-step ${activeTrip.status === 'COMPLETED' ? 'completed' : (activeTrip.status === 'RETURNING' && activeTrip.base_arrival_time) ? 'active' : 'upcoming'}`}>
                <div className={`sap-step-circle ${activeTrip.status === 'COMPLETED' ? 'completed' : 'upcoming'}`}>
                  {activeTrip.status === 'COMPLETED' ? <Check size={14} /> : '4'}
                </div>
                <div className={`sap-step-label ${activeTrip.status === 'COMPLETED' ? 'completed' : ''}`}>
                  Settlement
                </div>
              </div>
            </div>

            {/* Destination Progress Bar */}
            <div style={{ padding: '2px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '5px' }}>
                <span style={{ color: 'var(--sap-text-caption)' }}>Execution Progress</span>
                <span style={{ fontWeight: 700, color: 'var(--sap-brand)' }}>
                  {completedStopsCount} of {totalStopsCount} Destinations Delivered
                </span>
              </div>
              <div style={{ width: '100%', height: '7px', backgroundColor: 'var(--sap-neutral-bg)', borderRadius: '9999px', overflow: 'hidden' }}>
                <div
                  style={{
                    height: '100%',
                    width: `${totalStopsCount > 0 ? (completedStopsCount / totalStopsCount) * 100 : 0}%`,
                    backgroundColor: 'var(--sap-positive)',
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

            {/* STAGE CONTROLLER ACTIONS (SAP Fiori Horizon Driver Journey) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginTop: '4px' }}>
              {/* STAGE 1: Trip Not Started Yet */}
              {(activeTrip.status === 'ASSIGNED' || activeTrip.status === 'PLANNED') && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <button
                    className="btn btn-sap-primary btn-huge"
                    onClick={handleStartTrip}
                    disabled={actionLoading}
                    style={{
                      padding: '16px',
                      fontSize: '1.05rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    <Play size={22} /> START TRIP & DEPART BASE
                  </button>
                  <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--sap-text-caption, #6A7D8F)', margin: 0 }}>
                    Departing from {activeTrip.starting_location}. Departure GPS coordinates & server timestamp will be synced to SAP TM.
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
                const stopAreaCode = getStopAreaCode(currentStop);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Active Destination Card */}
                    <div
                      style={{
                        padding: '16px',
                        backgroundColor: 'var(--sap-neutral-bg)',
                        borderRadius: 'var(--radius-md, 8px)',
                        borderLeft: '5px solid var(--sap-brand, #0070F2)',
                        borderTop: '1px solid var(--sap-border-color)',
                        borderRight: '1px solid var(--sap-border-color)',
                        borderBottom: '1px solid var(--sap-border-color)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <div style={{ fontSize: '0.74rem', color: 'var(--sap-brand)', fontWeight: 800, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                          NEXT STOP (STOP {currentStop.stop_number} OF {totalStopsCount})
                        </div>
                        {distToCurrent !== null && (
                          <div
                            style={{
                              fontSize: '0.74rem',
                              fontWeight: 700,
                              backgroundColor: 'var(--sap-positive-bg)',
                              color: 'var(--sap-positive)',
                              border: '1px solid var(--sap-positive-border)',
                              padding: '2px 8px',
                              borderRadius: '9999px'
                            }}
                          >
                            📍 {distToCurrent} km away • ~{etaMins} mins
                          </div>
                        )}
                      </div>

                      {/* Destination Name with Official Area Code Badge */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--sap-text-title)' }}>
                          {currentStop.destination_name}
                        </span>
                        {stopAreaCode && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              backgroundColor: 'var(--sap-brand-light, #EBF3FC)',
                              color: 'var(--sap-brand, #0070F2)',
                              border: '1px solid var(--sap-border-color)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              letterSpacing: '0.4px'
                            }}
                            title="Facility Area Code"
                          >
                            {stopAreaCode}
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.86rem', color: 'var(--sap-text-body)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MapPin size={15} style={{ flexShrink: 0, color: 'var(--sap-brand)' }} />
                        <span>{currentStop.address}</span>
                      </div>

                      {/* Distance & ETA Schedule Strip */}
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '10px',
                          paddingTop: '8px',
                          borderTop: '1px solid var(--sap-border-color)',
                          fontSize: '0.78rem'
                        }}
                      >
                        <div>
                          <div style={{ color: 'var(--sap-text-caption)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Estimated Arrival</div>
                          <div style={{ fontWeight: 700, color: 'var(--sap-brand)', marginTop: '2px' }}>
                            {etaMins !== null ? `~${etaMins}m (${arrivalClock})` : currentStop.planned_arrival_time}
                          </div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--sap-text-caption)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600 }}>Planned Schedule</div>
                          <div style={{ fontWeight: 600, color: 'var(--sap-text-body)', marginTop: '2px' }}>
                            {currentStop.planned_arrival_time}
                          </div>
                        </div>
                      </div>

                      {/* Direct Turn-by-Turn Google Navigation Button */}
                      {currentStop.latitude && currentStop.longitude && (
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${currentStop.latitude},${currentStop.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sap-secondary btn-sm"
                          style={{
                            marginTop: '4px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px 14px',
                            fontSize: '0.86rem',
                            textDecoration: 'none',
                            color: 'var(--sap-brand)'
                          }}
                        >
                          <Navigation size={15} />
                          <span>Start Turn-by-Turn Google Navigation</span>
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>

                    {/* MASSIVE 1-TAP ARRIVAL BUTTON */}
                    <button
                      className="btn btn-sap-positive btn-huge"
                      onClick={handleArriveAtStop}
                      disabled={actionLoading}
                      style={{
                        padding: '16px',
                        fontSize: '1.05rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                      }}
                    >
                      <MapPin size={22} /> ARRIVED AT FACILITY (DOCK / BAY)
                    </button>

                    {/* Quick Auxiliary 2-Column Buttons */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        type="button"
                        className="btn btn-sap-critical"
                        style={{ padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onClick={() => setIsDelayOpen(true)}
                      >
                        <AlertTriangle size={16} /> Report Delay
                      </button>
                      <button
                        type="button"
                        className="btn btn-sap-secondary"
                        style={{ padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onClick={() => setIsCameraOpen(true)}
                      >
                        <Camera size={16} /> Take Photo / Proof
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sap-secondary"
                      onClick={() => setIsCustomStopOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 14px',
                        borderStyle: 'dashed',
                        fontSize: '0.82rem'
                      }}
                    >
                      <Plus size={15} color="var(--sap-brand)" />
                      <span>Add Ad-hoc Stop (Emergency / Unplanned)</span>
                    </button>
                  </div>
                );
              })()}

              {/* STAGE 3: At Destination (Arrived / In Progress Stop) */}
              {(activeTrip.status === 'AT_DESTINATION' || (activeTrip.status === 'IN_PROGRESS' && currentStop?.status === 'ARRIVED')) && currentStop && (() => {
                const stopAreaCode = getStopAreaCode(currentStop);

                return (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div
                      style={{
                        padding: '16px',
                        backgroundColor: 'var(--sap-positive-bg)',
                        borderRadius: 'var(--radius-md, 8px)',
                        borderLeft: '5px solid var(--sap-positive)',
                        borderTop: '1px solid var(--sap-positive-border)',
                        borderRight: '1px solid var(--sap-positive-border)',
                        borderBottom: '1px solid var(--sap-positive-border)'
                      }}
                    >
                      <div style={{ fontSize: '0.74rem', color: 'var(--sap-positive)', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        AT FACILITY DOCK — STOP {currentStop.stop_number}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--sap-text-title)' }}>
                          {currentStop.destination_name}
                        </span>
                        {stopAreaCode && (
                          <span
                            style={{
                              fontSize: '0.75rem',
                              fontFamily: 'var(--font-mono)',
                              fontWeight: 700,
                              backgroundColor: '#ffffff',
                              color: 'var(--sap-positive)',
                              border: '1px solid var(--sap-positive-border)',
                              padding: '2px 8px',
                              borderRadius: '4px'
                            }}
                          >
                            {stopAreaCode}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: 'var(--sap-text-body)', marginTop: '4px' }}>
                        Arrived: {currentStop.actual_arrival_time ? new Date(currentStop.actual_arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                        {currentStop.arrival_diff_minutes ? ` (${currentStop.arrival_diff_minutes > 0 ? `+${currentStop.arrival_diff_minutes}m late` : `${currentStop.arrival_diff_minutes}m early`})` : ' • On Schedule'}
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        className="btn btn-sap-primary"
                        style={{ padding: '14px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        onClick={handleCompleteActivity}
                        disabled={actionLoading}
                      >
                        <CheckCircle size={18} /> COMPLETE UNLOAD
                      </button>

                      <button
                        className="btn btn-sap-secondary"
                        style={{ padding: '14px', fontSize: '0.92rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                        onClick={() => setIsCameraOpen(true)}
                      >
                        <Camera size={18} /> POD PHOTO
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                      <button
                        className="btn btn-sap-critical"
                        style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onClick={() => setIsDelayOpen(true)}
                      >
                        <AlertTriangle size={16} /> Report Delay
                      </button>

                      <button
                        className="btn btn-sap-positive"
                        style={{ padding: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                        onClick={handleDepartStop}
                        disabled={actionLoading}
                      >
                        <Navigation size={16} /> DEPART DOCK
                      </button>
                    </div>

                    <button
                      type="button"
                      className="btn btn-sap-secondary btn-sm"
                      onClick={() => setIsCustomStopOpen(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        padding: '10px 14px',
                        borderStyle: 'dashed',
                        fontSize: '0.8rem'
                      }}
                    >
                      <Plus size={14} color="var(--sap-brand)" />
                      <span>Add Another Destination Stop</span>
                    </button>
                  </div>
                );
              })()}

              {/* STAGE 4: All Stops Completed -> Start Return */}
              {allStopsCompleted && activeTrip.status === 'IN_PROGRESS' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--sap-positive-bg)',
                      border: '1px solid var(--sap-positive-border)',
                      borderRadius: 'var(--radius-md, 8px)',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ color: 'var(--sap-positive)', fontWeight: 800, fontSize: '1.05rem' }}>
                      🎉 ALL STOPS DELIVERED & COMPLETED!
                    </div>
                    <div style={{ fontSize: '0.86rem', color: 'var(--sap-text-body)', marginTop: '4px' }}>
                      All {totalStopsCount} customer destinations reached and unloaded. Ready to return to depot.
                    </div>
                  </div>

                  <button
                    className="btn btn-sap-primary btn-huge"
                    onClick={handleStartReturn}
                    disabled={actionLoading}
                    style={{
                      padding: '16px',
                      fontSize: '1.05rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    <RotateCcw size={22} /> START RETURN JOURNEY
                  </button>
                </div>
              )}

              {/* STAGE 5: Returning -> Arrived at Base */}
              {activeTrip.status === 'RETURNING' && !activeTrip.base_arrival_time && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--sap-info-bg)',
                      border: '1px solid var(--sap-border-color)',
                      borderRadius: 'var(--radius-md, 8px)',
                      textAlign: 'center'
                    }}
                  >
                    <div style={{ color: 'var(--sap-brand)', fontWeight: 800, fontSize: '1rem' }}>
                      VEHICLE EN ROUTE TO BASE DEPOT
                    </div>
                    <div style={{ fontSize: '0.86rem', color: 'var(--sap-text-body)', marginTop: '4px' }}>
                      Drive safely back to {activeTrip.starting_location}
                    </div>
                  </div>

                  <button
                    className="btn btn-sap-positive btn-huge"
                    onClick={handleArriveAtBase}
                    disabled={actionLoading}
                    style={{
                      padding: '16px',
                      fontSize: '1.05rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    <MapPin size={22} /> ARRIVED AT BASE DEPOT
                  </button>

                  <button
                    className="btn btn-sap-critical"
                    onClick={() => setIsDelayOpen(true)}
                    style={{ padding: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                  >
                    <AlertTriangle size={16} /> Report Transit Delay
                  </button>
                </div>
              )}

              {/* STAGE 6: Arrived at Base -> Complete Trip Summary */}
              {activeTrip.status === 'RETURNING' && activeTrip.base_arrival_time && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div
                    style={{
                      padding: '16px',
                      backgroundColor: 'var(--sap-neutral-bg)',
                      borderRadius: 'var(--radius-md, 8px)',
                      border: '1px solid var(--sap-border-color)'
                    }}
                  >
                    <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--sap-brand)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      SAP TM TRIP CLOSURE SUMMARY
                    </h4>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.85rem' }}>
                      <div>Total Deliveries: <b>{totalStopsCount}</b></div>
                      <div>Completed: <b style={{ color: 'var(--sap-positive)' }}>{completedStopsCount}</b></div>
                      <div>Total Delays: <b>{activeTrip.total_delay_minutes || 0} mins</b></div>
                      <div>Base Arrival: <b>Recorded & Verified</b></div>
                    </div>
                  </div>

                  <button
                    className="btn btn-sap-primary btn-huge"
                    onClick={handleCompleteTrip}
                    disabled={actionLoading}
                    style={{
                      padding: '16px',
                      fontSize: '1.05rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '10px'
                    }}
                  >
                    <CheckCircle size={22} /> SUBMIT & CLOSE TRIP (SAP SETTLEMENT)
                  </button>
                </div>
              )}

              {/* STAGE 7: Completed */}
              {activeTrip.status === 'COMPLETED' && (
                <div
                  style={{
                    padding: '22px',
                    backgroundColor: 'var(--sap-positive-bg)',
                    border: '1px solid var(--sap-positive-border)',
                    borderRadius: 'var(--radius-lg, 12px)',
                    textAlign: 'center'
                  }}
                >
                  <CheckCircle size={40} color="var(--sap-positive)" style={{ margin: '0 auto 10px' }} />
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--sap-positive)' }}>Trip Completed & Settled</h3>
                  <p style={{ fontSize: '0.86rem', color: 'var(--sap-text-body)', marginTop: '4px' }}>
                    All milestones, proof of deliveries, and telematics logs have been synchronized to SAP TM & S/4HANA.
                  </p>
                </div>
              )}
            </div>

            {/* Destination Stops List Accordion (SAP Stage Schedule) */}
            <div style={{ borderTop: '1px solid var(--sap-border-color)', paddingTop: '16px', marginTop: '4px' }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '12px'
                }}
              >
                <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--sap-text-caption)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  SAP ROUTE STAGES & STOPS ({activeTrip.stops?.length || 0})
                </div>
                <button
                  type="button"
                  className="btn btn-sap-secondary btn-sm"
                  onClick={() => setIsCustomStopOpen(true)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    padding: '4px 10px',
                    fontSize: '0.74rem'
                  }}
                >
                  <Plus size={13} color="var(--sap-brand)" />
                  <span>Add Stop</span>
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {activeTrip.stops?.map((stop, index) => {
                  const isCurrent = currentStop?.id === stop.id;
                  const isDone = stop.status === 'COMPLETED';
                  const stopAreaCode = getStopAreaCode(stop);

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
                        backgroundColor: isCurrent ? 'var(--sap-brand-light, #EBF3FC)' : 'var(--sap-neutral-bg)',
                        border: `1px solid ${isCurrent ? 'var(--sap-brand)' : 'var(--sap-border-color)'}`,
                        borderRadius: 'var(--radius-md, 8px)',
                        opacity: isDone ? 0.75 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '28px',
                              height: '28px',
                              borderRadius: '50%',
                              backgroundColor: isDone
                                ? 'var(--sap-positive)'
                                : isCurrent
                                ? 'var(--sap-brand)'
                                : 'var(--sap-border-color)',
                              color: isCurrent || isDone ? '#ffffff' : 'var(--sap-text-caption)',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0
                            }}
                          >
                            {isDone ? <Check size={14} /> : stop.stop_number}
                          </div>
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--sap-text-title)' }}>
                                {stop.destination_name}
                              </span>
                              {stopAreaCode && (
                                <span
                                  style={{
                                    fontSize: '0.68rem',
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 700,
                                    backgroundColor: '#ffffff',
                                    color: 'var(--sap-brand)',
                                    border: '1px solid var(--sap-border-color)',
                                    padding: '1px 6px',
                                    borderRadius: '3px'
                                  }}
                                >
                                  {stopAreaCode}
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: 'var(--sap-text-caption)', marginTop: '2px' }}>
                              {stop.address}
                            </div>
                          </div>
                        </div>

                        <StatusBadge status={stop.status} />
                      </div>

                      {/* Distance & Navigation Row */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          flexWrap: 'wrap',
                          gap: '6px',
                          paddingTop: '6px',
                          borderTop: '1px dashed var(--sap-border-color)',
                          fontSize: '0.72rem',
                          color: 'var(--sap-text-caption)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          {legDist !== null && (
                            <span style={{ fontWeight: 600, color: 'var(--sap-brand)' }}>
                              📏 {legDist} km from {index === 0 ? 'Depot' : `Stop #${index}`} (~{legMins}m)
                            </span>
                          )}
                        </div>

                        {stop.latitude && stop.longitude && (
                          <a
                            href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: 'var(--sap-brand)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontWeight: 700
                            }}
                          >
                            <Navigation size={12} />
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
          <div style={{ marginTop: '4px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--sap-text-caption)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Other Scheduled Shipments ({trips.length - 1})
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
                      cursor: 'pointer',
                      backgroundColor: 'var(--sap-card-bg)',
                      border: '1px solid var(--sap-border-color)',
                      borderRadius: 'var(--radius-md, 8px)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--sap-text-title)' }}>{t.sap_shipment_num || t.id}</div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--sap-text-caption)' }}>
                        Vehicle: {t.vehicle_number} • Dep: {t.planned_departure_time}
                      </div>
                    </div>
                    <ChevronRight size={18} color="var(--sap-text-caption)" />
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* SAP Terminal Utility Footer */}
        <footer
          style={{
            marginTop: '8px',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: 'var(--sap-text-caption)',
            borderTop: '1px solid var(--sap-border-color)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, color: 'var(--sap-brand)' }}>SAP OnePortal</span>
            <span>• TM Mobile Driver v1.2</span>
          </div>
          <a
            href="https://github.com/Nixxzzzzz/truck_tracker/releases/download/v1.0.0/TruckTracker-v1.0.0.apk"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--sap-brand)',
              textDecoration: 'none',
              fontWeight: 600,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Smartphone size={12} />
            <span>Download APK</span>
          </a>
        </footer>
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
