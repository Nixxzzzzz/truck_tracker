import React, { useState } from 'react';
import { AlertTriangle, X, Send } from 'lucide-react';
import { api, getCurrentGpsPosition } from '../services/api';

interface Props {
  tripId: string;
  stopId?: string;
  onSuccess: () => void;
  onClose: () => void;
}

const PREDEFINED_REASONS = [
  'Traffic',
  'Road Block',
  'Vehicle Problem',
  'Tyre / Puncture',
  'Loading Delay',
  'Unloading Delay',
  'Customer / Site Unavailable',
  'Weather',
  'Fuel Issue',
  'Documentation Issue',
  'Accident / Incident',
  'Other'
];

export const DelayModal: React.FC<Props> = ({ tripId, stopId, onSuccess, onClose }) => {
  const [reason, setReason] = useState('Traffic');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const coords = await getCurrentGpsPosition();
      await api.driver.reportDelay(tripId, {
        reason,
        description,
        stopId,
        latitude: coords.latitude,
        longitude: coords.longitude,
        gps_accuracy: coords.gps_accuracy
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to submit delay');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={20} color="var(--status-delayed)" />
            <h3 style={{ fontSize: '1.1rem' }}>Report Operational Delay</h3>
          </div>
          <button className="btn btn-secondary" onClick={onClose} style={{ padding: '6px' }}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {error && (
              <div style={{ padding: '10px 14px', background: 'var(--status-danger-bg)', color: 'var(--status-danger)', borderRadius: 'var(--radius-md)', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Delay Cause</label>
              <select
                className="form-select"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
              >
                {PREDEFINED_REASONS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Operational Details (Optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="E.g., Highway bridge bypass congested, waiting for police clearance..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              📍 System will automatically timestamp this event and attach current GPS coordinates.
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Send size={16} /> {submitting ? 'Submitting...' : 'Submit Delay Report'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
