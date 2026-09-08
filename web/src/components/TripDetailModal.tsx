import React, { useState, useEffect } from 'react';
import {
  X,
  MapPin,
  Clock,
  Calendar,
  Truck,
  UserCheck,
  AlertTriangle,
  Camera,
  History,
  CheckCircle2,
  Navigation,
  FileText,
  RotateCcw
} from 'lucide-react';
import { api } from '../services/api';
import { Trip, TripStop, Photo, Delay, TripEvent } from '../types';
import { StatusBadge } from './StatusBadge';
import { LeafletMap } from './LeafletMap';

interface Props {
  tripId: string;
  onClose: () => void;
  onRefresh?: () => void;
  theme?: 'dark' | 'light';
}

export const TripDetailModal: React.FC<Props> = ({ tripId, onClose, onRefresh, theme = 'dark' }) => {
  const [trip, setTrip] = useState<Trip | null>(null);
  const [activeTab, setActiveTab] = useState<'timeline' | 'map' | 'stops' | 'photos' | 'delays' | 'audit'>('timeline');
  const [loading, setLoading] = useState(true);
  const [previewPhoto, setPreviewPhoto] = useState<Photo | null>(null);

  useEffect(() => {
    fetchTripDetails();
  }, [tripId]);

  const fetchTripDetails = async () => {
    setLoading(true);
    try {
      const data = await api.manager.getTrip(tripId);
      setTrip(data.trip);
    } catch (err) {
      console.error('Failed to load trip details:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !trip) {
    return (
      <div className="modal-overlay">
        <div className="modal-content" style={{ padding: '40px', textAlign: 'center' }}>
          <div style={{ color: 'var(--accent-gold)' }}>Loading trip operational timeline...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '900px', maxHeight: '92vh' }}>
        {/* Header */}
        <div className="modal-header">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ fontSize: '1.35rem', fontFamily: 'var(--font-display)' }}>
                {trip.id}
              </h2>
              <StatusBadge status={trip.status} />
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '3px' }}>
              {trip.purpose} • Date: {trip.date}
            </div>
          </div>

          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        {/* Quick Operational Metrics Row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
            gap: '10px',
            padding: '16px 24px',
            backgroundColor: 'var(--bg-secondary)',
            borderBottom: '1px solid var(--border-subtle)',
            fontSize: '0.82rem'
          }}
        >
          <div>
            <div style={{ color: 'var(--text-muted)' }}>Driver</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {trip.driver_name}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-muted)' }}>Vehicle</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {trip.vehicle_number}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-muted)' }}>Planned Departure</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {trip.planned_departure_time}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-muted)' }}>Actual Start</div>
            <div style={{ fontWeight: 600, color: trip.actual_start_time ? 'var(--text-primary)' : 'var(--text-muted)', marginTop: '2px' }}>
              {trip.actual_start_time ? new Date(trip.actual_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Pending'}
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-muted)' }}>Total Delay</div>
            <div style={{ fontWeight: 600, color: (trip.total_delay_minutes || 0) > 0 ? 'var(--status-delayed)' : 'var(--status-success)', marginTop: '2px' }}>
              {trip.total_delay_minutes || 0} mins
            </div>
          </div>

          <div>
            <div style={{ color: 'var(--text-muted)' }}>Approx Distance</div>
            <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginTop: '2px' }}>
              {trip.calculated_distance_km ? `${trip.calculated_distance_km} km` : 'Unavailable'}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            padding: '12px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            overflowX: 'auto'
          }}
        >
          <button
            className={`btn ${activeTab === 'timeline' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={() => setActiveTab('timeline')}
          >
            <Clock size={14} /> Chronological Timeline ({trip.events?.length || 0})
          </button>

          <button
            className={`btn ${activeTab === 'map' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={() => setActiveTab('map')}
          >
            <Navigation size={14} /> Interactive Route Map
          </button>

          <button
            className={`btn ${activeTab === 'stops' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={() => setActiveTab('stops')}
          >
            <MapPin size={14} /> Stops ({trip.stops?.length || 0})
          </button>

          <button
            className={`btn ${activeTab === 'photos' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={() => setActiveTab('photos')}
          >
            <Camera size={14} /> Photos ({trip.photos?.length || 0})
          </button>

          <button
            className={`btn ${activeTab === 'delays' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={() => setActiveTab('delays')}
          >
            <AlertTriangle size={14} /> Delays ({trip.delays?.length || 0})
          </button>

          <button
            className={`btn ${activeTab === 'audit' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 14px', fontSize: '0.82rem' }}
            onClick={() => setActiveTab('audit')}
          >
            <History size={14} /> Audit Trail ({trip.auditLogs?.length || 0})
          </button>
        </div>

        {/* Tab Body */}
        <div className="modal-body">
          {/* 1. TIMELINE TAB */}
          {activeTab === 'timeline' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <h4 style={{ fontSize: '0.95rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Operational Event Timeline
              </h4>

              {trip.events?.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>
                  No operational events recorded yet. Events will appear once the driver starts the trip.
                </div>
              ) : (
                <div style={{ position: 'relative', paddingLeft: '24px' }}>
                  {/* Vertical timeline connector */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '10px',
                      bottom: '10px',
                      left: '8px',
                      width: '2px',
                      backgroundColor: 'var(--border-medium)'
                    }}
                  />

                  {trip.events?.map((ev, idx) => (
                    <div
                      key={ev.id || idx}
                      style={{
                        position: 'relative',
                        marginBottom: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '4px'
                      }}
                    >
                      {/* Timeline dot */}
                      <div
                        style={{
                          position: 'absolute',
                          left: '-20px',
                          top: '4px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: ev.event_type.includes('COMPLETED')
                            ? 'var(--status-success)'
                            : ev.event_type.includes('DELAY')
                            ? 'var(--status-delayed)'
                            : 'var(--accent-gold)',
                          border: '2px solid var(--bg-surface)'
                        }}
                      />

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </span>
                        <span style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: 'var(--radius-full)', backgroundColor: 'var(--bg-secondary)', color: 'var(--accent-gold)', fontWeight: 600 }}>
                          {ev.event_type.replace(/_/g, ' ')}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
                        {ev.details || ev.event_type}
                      </div>

                      {ev.latitude && ev.longitude && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MapPin size={12} />
                          GPS: {ev.latitude.toFixed(4)}, {ev.longitude.toFixed(4)}
                          {ev.gps_accuracy && ` (±${Math.round(ev.gps_accuracy)}m)`}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. MAP TAB */}
          {activeTab === 'map' && (
            <div>
              <LeafletMap
                baseLocation={{
                  name: trip.starting_location,
                  latitude: trip.starting_latitude || 23.2100,
                  longitude: trip.starting_longitude || 77.4000
                }}
                stops={trip.stops}
                events={trip.events}
                height="450px"
                theme={theme}
              />
              <div style={{ marginTop: '12px', fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', gap: '16px' }}>
                <div><span style={{ color: 'var(--accent-gold)' }}>●</span> HQ Base</div>
                <div><span style={{ color: '#38bdf8' }}>●</span> Planned Destination Stops</div>
                <div><span style={{ color: '#10b981' }}>●</span> Completed Stops</div>
                <div><span style={{ color: '#38bdf8' }}>🚛</span> Latest Verified Location</div>
              </div>
            </div>
          )}

          {/* 3. STOPS TAB */}
          {activeTab === 'stops' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {trip.stops?.map((stop) => (
                <div
                  key={stop.id}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--bg-secondary)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          width: '26px',
                          height: '26px',
                          borderRadius: '50%',
                          backgroundColor: stop.status === 'COMPLETED' ? 'var(--status-success)' : 'var(--accent-gold)',
                          color: '#0d0e11',
                          fontWeight: 700,
                          fontSize: '0.8rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        {stop.stop_number}
                      </span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '1rem' }}>{stop.destination_name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{stop.address}</div>
                      </div>
                    </div>

                    <StatusBadge status={stop.status} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '0.82rem', marginTop: '10px' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Planned Arrival:</span>{' '}
                      <b>{stop.planned_arrival_time}</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Actual Arrival:</span>{' '}
                      <b>{stop.actual_arrival_time ? new Date(stop.actual_arrival_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Departure:</span>{' '}
                      <b>{stop.actual_departure_time ? new Date(stop.actual_departure_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</b>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Variance:</span>{' '}
                      <b style={{ color: (stop.arrival_diff_minutes || 0) > 0 ? 'var(--status-delayed)' : 'var(--status-success)' }}>
                        {stop.arrival_diff_minutes ? `${stop.arrival_diff_minutes > 0 ? `+${stop.arrival_diff_minutes}m late` : `${stop.arrival_diff_minutes}m early`}` : 'On time'}
                      </b>
                    </div>
                  </div>

                  {stop.notes && (
                    <div style={{ marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                      "{stop.notes}"
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 4. PHOTOS TAB */}
          {activeTab === 'photos' && (
            <div>
              {trip.photos?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No photos uploaded for this trip yet.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
                  {trip.photos?.map((photo) => (
                    <div
                      key={photo.id}
                      onClick={() => setPreviewPhoto(photo)}
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderRadius: 'var(--radius-md)',
                        overflow: 'hidden',
                        border: '1px solid var(--border-subtle)',
                        cursor: 'pointer'
                      }}
                    >
                      <img
                        src={`/api/photos/${photo.id}/file`}
                        alt={photo.photo_type}
                        style={{ width: '100%', height: '140px', objectFit: 'cover' }}
                      />
                      <div style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>{photo.photo_type}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {new Date(photo.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {photo.destination_name && ` • Stop ${photo.stop_number}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 5. DELAYS TAB */}
          {activeTab === 'delays' && (
            <div>
              {trip.delays?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No operational delays reported on this trip.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {trip.delays?.map((delay) => (
                    <div
                      key={delay.id}
                      style={{
                        padding: '14px',
                        backgroundColor: 'var(--status-delayed-bg)',
                        border: '1px solid rgba(245, 158, 11, 0.3)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ fontWeight: 600, color: 'var(--status-delayed)', fontSize: '0.95rem' }}>
                          ⚠️ {delay.reason}
                        </div>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          Duration: {delay.duration_minutes ? `${delay.duration_minutes} mins` : 'Ongoing'}
                        </span>
                      </div>
                      {delay.description && (
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {delay.description}
                        </div>
                      )}
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Started: {new Date(delay.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {delay.end_time && ` • Resolved: ${new Date(delay.end_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 6. AUDIT TRAIL TAB */}
          {activeTab === 'audit' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {trip.auditLogs?.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No modifications logged.
                </div>
              ) : (
                trip.auditLogs?.map((audit) => (
                  <div
                    key={audit.id}
                    style={{
                      padding: '12px',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.85rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--accent-gold)' }}>{audit.action}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                        {new Date(audit.created_at).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)' }}>
                      By: {audit.changed_by_name || audit.changed_by}
                      {audit.reason && ` • Reason: "${audit.reason}"`}
                    </div>
                    {audit.new_value && (
                      <div style={{ marginTop: '4px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {audit.original_value ? `Changed from "${audit.original_value}" to "${audit.new_value}"` : audit.new_value}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Photo Preview Modal */}
      {previewPhoto && (
        <div className="modal-overlay" style={{ zIndex: 1100 }} onClick={() => setPreviewPhoto(null)}>
          <div className="modal-content" style={{ maxWidth: '640px', padding: '16px' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div>
                <h4>{previewPhoto.photo_type}</h4>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {new Date(previewPhoto.timestamp).toLocaleString()}
                  {previewPhoto.latitude && ` • GPS: ${previewPhoto.latitude.toFixed(4)}, ${previewPhoto.longitude?.toFixed(4)}`}
                </div>
              </div>
              <button className="btn btn-secondary" onClick={() => setPreviewPhoto(null)} style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>
            <img
              src={`/api/photos/${previewPhoto.id}/file`}
              alt={previewPhoto.photo_type}
              style={{ width: '100%', maxHeight: '70vh', objectFit: 'contain', borderRadius: 'var(--radius-md)' }}
            />
          </div>
        </div>
      )}
    </div>
  );
};
