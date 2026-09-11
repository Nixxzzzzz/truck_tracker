import React, { useState } from 'react';
import { X, MapPin, Check, AlertCircle, Building2, Phone, User } from 'lucide-react';
import { api } from '../services/api';
import { Destination } from '../types';
import { MapPicker } from './MapPicker';

interface Props {
  onSuccess: (destination: Destination) => void;
  onClose: () => void;
}

export const DestinationModal: React.FC<Props> = ({ onSuccess, onClose }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(28.5355);
  const [longitude, setLongitude] = useState(77.2680);
  const [geofenceRadius, setGeofenceRadius] = useState(150);
  const [contactName, setContactName] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide a name for this destination or warehouse facility.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const payload = {
      name: name.trim(),
      address: address.trim() || 'Logistics Destination Hub',
      latitude: Number(latitude),
      longitude: Number(longitude),
      geofence_radius_meters: Number(geofenceRadius),
      contact_name: contactName.trim() || undefined,
      contact_number: contactNumber.trim() || undefined,
      notes: notes.trim() || undefined,
      is_active: 1
    };

    try {
      const res = await api.fleet.createDestination(payload);
      onSuccess(res.destination);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register destination');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '580px', maxHeight: '92vh', overflowY: 'auto' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'rgba(37, 211, 102, 0.15)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--accent-whatsapp)'
              }}
            >
              <Building2 size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 600, margin: 0 }}>Register New Destination</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                Define warehouse location, GPS coordinates, and geofence perimeter
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
                Facility / Destination Name <span style={{ color: 'var(--status-danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Gurugram Cyber Hub Logistics Bay"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Street Address / Industrial Sector
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Phase 2, DLF Cyber City, Sector 24, Gurugram"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
              />
            </div>

            {/* Interactive Map Picker with Click-to-Pin */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: 0 }}>
                Select Exact Location on Google Map
              </label>
              <MapPicker
                initialLat={latitude}
                initialLng={longitude}
                initialRadius={geofenceRadius}
                height="240px"
                onChange={(data) => {
                  setLatitude(data.latitude);
                  setLongitude(data.longitude);
                  setGeofenceRadius(data.radiusMeters);
                }}
              />
            </div>

            {/* Contact Person Details */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  On-Site Contact Person
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Amit Mehra"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                  />
                  <User size={13} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Contact Phone Line
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98100 12345"
                    value={contactNumber}
                    onChange={(e) => setContactNumber(e.target.value)}
                  />
                  <Phone size={13} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Operational Notes & Loading Bay Instructions
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="e.g. Enter through Gate 4; heavy trailer turning bay available"
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
                'Saving...'
              ) : (
                <>
                  <Check size={16} /> Save Destination
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
