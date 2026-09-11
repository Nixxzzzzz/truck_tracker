import React, { useState, useEffect } from 'react';
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
  Wifi
} from 'lucide-react';
import { api, getCurrentGpsPosition } from '../services/api';
import { Trip, TripStop, User } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { CameraModal } from '../components/CameraModal';
import { DelayModal } from '../components/DelayModal';
import { offlineQueue } from '../services/offlineQueue';
import { ThemeToggle } from '../components/ThemeToggle';

interface Props {
  currentUser: User;
  onLogout: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onSwitchRole?: (role: 'DRIVER' | 'MANAGER') => void;
}

export const DriverView: React.FC<Props> = ({ currentUser, onLogout, theme = 'dark', onToggleTheme, onSwitchRole }) => {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [activeTrip, setActiveTrip] = useState<Trip | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [geofenceFeedback, setGeofenceFeedback] = useState<string | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isDelayOpen, setIsDelayOpen] = useState(false);
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    loadTodayTrips();

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
          width: '100%',
          maxWidth: '480px',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px'
        }}
      >
        {/* Mobile App Device Top Status Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '5px 14px',
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.72rem',
            color: 'var(--text-muted)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(8px)'
          }}
        >
          <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>📍 GPS Active • 5G</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.02em' }}>TruckTracker Driver v1.0.0</span>
            <span>🔋 98%</span>
          </div>
        </div>

        {/* Top Driver Header */}
        <header
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '12px 16px',
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--accent-gold-muted)',
                border: '1px solid var(--accent-gold-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-gold)'
              }}
            >
              <Truck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '0.95rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span>{currentUser.name}</span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    padding: '1px 6px',
                    borderRadius: '4px',
                    background: 'rgba(212, 168, 83, 0.2)',
                    color: 'var(--accent-gold)',
                    fontWeight: 700,
                    border: '1px solid rgba(212, 168, 83, 0.3)'
                  }}
                >
                  v1.0.0
                </span>
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Corporate Logistics Driver</div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {/* Connection Status Indicator */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                color: isOnline ? 'var(--status-success)' : 'var(--status-delayed)',
                backgroundColor: isOnline ? 'var(--status-success-bg)' : 'var(--status-delayed-bg)',
                padding: '3px 8px',
                borderRadius: 'var(--radius-full)'
              }}
            >
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? 'Online' : 'Offline'}
            </div>

            {onToggleTheme && (
              <ThemeToggle theme={theme} onToggle={onToggleTheme} size={14} />
            )}

            <button
              onClick={onLogout}
              className="btn btn-secondary"
              style={{ padding: '6px 10px', fontSize: '0.8rem' }}
              title="Logout"
            >
              <LogOut size={14} />
            </button>
          </div>
        </header>

        {/* Native Android APK Download Banner */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: 'rgba(212, 168, 83, 0.06)',
            border: '1px solid rgba(212, 168, 83, 0.25)',
            borderRadius: 'var(--radius-md)',
            padding: '8px 12px',
            fontSize: '0.78rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '1rem' }}>🤖</span>
            <div>
              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Native Android App</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>v1.0.0 APK • Geofencing & Offline Telemetry</div>
            </div>
          </div>
          <a
            href="https://github.com/Nixxzzzzz/truck_tracker/releases/download/v1.0.0/TruckTracker-v1.0.0.apk"
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-secondary"
            style={{
              padding: '4px 10px',
              fontSize: '0.75rem',
              color: 'var(--accent-gold)',
              borderColor: 'rgba(212, 168, 83, 0.4)',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <span>📥 Download APK</span>
          </a>
        </div>

        {/* Quick Executive Switcher Banner */}
        {onSwitchRole && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: 'rgba(212, 168, 83, 0.1)',
              border: '1px solid var(--accent-gold)',
              borderRadius: 'var(--radius-md)',
              padding: '8px 12px',
              fontSize: '0.8rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '1rem' }}>📱</span>
              <span style={{ color: 'var(--accent-gold)', fontWeight: 600 }}>
                Field Driver Simulation Active (v1.0.0)
              </span>
            </div>
            <button
              onClick={() => onSwitchRole('MANAGER')}
              style={{
                background: 'var(--accent-gold)',
                color: '#0e1013',
                border: 'none',
                borderRadius: '4px',
                padding: '4px 10px',
                fontSize: '0.75rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              <span>👔 Manager Command</span>
              <span>➔</span>
            </button>
          </div>
        )}

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
              {activeTrip.status === 'IN_PROGRESS' && currentStop && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div
                    style={{
                      padding: '14px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      borderLeft: '4px solid var(--accent-gold)'
                    }}
                  >
                    <div style={{ fontSize: '0.75rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
                      NEXT DESTINATION (STOP {currentStop.stop_number} OF {totalStopsCount})
                    </div>
                    <div style={{ fontSize: '1.15rem', fontWeight: 600, marginTop: '2px' }}>
                      {currentStop.destination_name}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                      <MapPin size={14} /> {currentStop.address}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Planned Arrival: <b>{currentStop.planned_arrival_time}</b>
                    </div>
                  </div>

                  <button
                    className="btn btn-huge btn-primary"
                    onClick={handleArriveAtStop}
                    disabled={actionLoading}
                  >
                    <MapPin size={20} /> ARRIVED AT STOP
                  </button>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setIsDelayOpen(true)}
                    >
                      <AlertTriangle size={16} /> Report Delay
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setIsCameraOpen(true)}
                    >
                      <Camera size={16} /> Take Photo
                    </button>
                  </div>
                </div>
              )}

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
                      style={{ padding: '14px' }}
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
              <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px', textTransform: 'uppercase' }}>
                Trip Route Stops ({activeTrip.stops?.length || 0})
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {activeTrip.stops?.map((stop) => {
                  const isCurrent = currentStop?.id === stop.id;
                  const isDone = stop.status === 'COMPLETED';

                  return (
                    <div
                      key={stop.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        backgroundColor: isCurrent ? 'var(--bg-surface-elevated)' : 'var(--bg-secondary)',
                        border: `1px solid ${isCurrent ? 'var(--accent-gold-border)' : 'transparent'}`,
                        borderRadius: 'var(--radius-md)',
                        opacity: isDone ? 0.7 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            backgroundColor: isDone ? 'var(--status-success)' : isCurrent ? 'var(--accent-gold)' : 'var(--border-medium)',
                            color: '#0d0e11',
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
                          <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{stop.destination_name}</div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Planned: {stop.planned_arrival_time}
                            {stop.actual_arrival_time && ` • Actual: ${new Date(stop.actual_arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                          </div>
                        </div>
                      </div>

                      <StatusBadge status={stop.status} />
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
    </div>
  );
};
