import React, { useState, useEffect } from 'react';
import { MapPin, X, Plus, Clock, Compass, AlertCircle, Check } from 'lucide-react';
import { api, getCurrentGpsPosition } from '../services/api';
import { TripStop } from '../types';

interface Props {
  tripId: string;
  currentStopCount: number;
  onSuccess: (newStop: TripStop) => void;
  onClose: () => void;
}

export const AddCustomStopModal: React.FC<Props> = ({
  tripId,
  currentStopCount,
  onSuccess,
  onClose
}) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState<number>(28.5355);
  const [longitude, setLongitude] = useState<number>(77.268);
  const [geofenceRadius, setGeofenceRadius] = useState(150);
  const [plannedTime, setPlannedTime] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingGps, setLoadingGps] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize planned time to 20 minutes from now
  useEffect(() => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 20);
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    setPlannedTime(timeStr);

    // Auto-fetch driver GPS position
    fetchCurrentPosition();
  }, []);

  const fetchCurrentPosition = async () => {
    setLoadingGps(true);
    try {
      const coords = await getCurrentGpsPosition();
      if (coords.latitude && coords.longitude) {
        setLatitude(Number(coords.latitude.toFixed(6)));
        setLongitude(Number(coords.longitude.toFixed(6)));
        if (!address) {
          setAddress(`Current GPS location (±${coords.gps_accuracy || 10}m accuracy)`);
        }
      }
    } catch {
      // Keep default
    } finally {
      setLoadingGps(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name or landmark for this custom stop.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const stopPayload = {
      destination_name: name.trim(),
      address: address.trim() || 'Driver Custom Designated Stop',
      latitude: Number(latitude),
      longitude: Number(longitude),
      geofence_radius_meters: Number(geofenceRadius),
      planned_arrival_time: plannedTime,
      notes: notes.trim() ? `[Driver Custom Stop] ${notes.trim()}` : '[Driver Custom Stop added during transit]',
      stop_number: currentStopCount + 1
    };

    try {
      const res = await api.driver.addCustomStop(tripId, stopPayload);
      onSuccess(res.stop);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add custom stop');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(37, 211, 102, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-whatsapp)'
              }}
            >
              <Plus size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 600, margin: 0 }}>Add Custom Route Stop</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                Insert an ad-hoc destination or emergency delivery stop
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClose}
            style={{ padding: '6px', borderRadius: 'var(--radius-full)' }}
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <div
                style={{
                  padding: '10px 12px',
                  backgroundColor: 'var(--status-danger-bg)',
                  border: '1px solid var(--status-danger-border)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--status-danger)',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Stop Title / Location Name <span style={{ color: 'var(--status-danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Shell Petrol Pump, Client Annex Bay 3"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Address / Landmark
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="Road name, sector, or landmark"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* GPS Coordinates with 1-click current location trigger */}
            <div
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '12px'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  GPS Coordinates & Geofence
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={fetchCurrentPosition}
                  disabled={loadingGps}
                  style={{ padding: '3px 8px', fontSize: '0.74rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Compass size={12} />
                  <span>{loadingGps ? 'Locating...' : 'Use My GPS'}</span>
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Latitude</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={latitude}
                    onChange={(e) => setLatitude(parseFloat(e.target.value))}
                    required
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Longitude</label>
                  <input
                    type="number"
                    step="any"
                    className="form-input"
                    value={longitude}
                    onChange={(e) => setLongitude(parseFloat(e.target.value))}
                    required
                  />
                </div>
              </div>

              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Geofence Radius: <b>{geofenceRadius} meters</b>
                </label>
                <input
                  type="range"
                  min="50"
                  max="500"
                  step="25"
                  value={geofenceRadius}
                  onChange={(e) => setGeofenceRadius(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-whatsapp)', marginTop: '4px' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Planned Arrival (ETA)
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="time"
                    className="form-input"
                    value={plannedTime}
                    onChange={(e) => setPlannedTime(e.target.value)}
                    required
                  />
                  <Clock
                    size={14}
                    style={{ position: 'absolute', right: '10px', top: '10px', pointerEvents: 'none', color: 'var(--text-muted)' }}
                  />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Stop Sequence
                </label>
                <input
                  type="text"
                  className="form-input"
                  value={`Stop #${currentStopCount + 1}`}
                  disabled
                  style={{ opacity: 0.7 }}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Reason / Special Instructions
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="e.g. Unscheduled client pickup, tire air refill, toll barrier"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={submitting}
              style={{
                backgroundColor: 'var(--accent-whatsapp)',
                borderColor: 'var(--accent-whatsapp)',
                color: '#0b141a',
                fontWeight: 600
              }}
            >
              {submitting ? (
                'Adding Stop...'
              ) : (
                <>
                  <Check size={16} /> Add to Active Route
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
