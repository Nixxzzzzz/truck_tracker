import React, { useState } from 'react';
import { X, Truck, Check, AlertCircle } from 'lucide-react';
import { api } from '../services/api';
import { Vehicle, Driver } from '../types';
import { SearchableDropdown } from './common/SearchableDropdown';

interface Props {
  drivers: Driver[];
  initialVehicle?: Vehicle | null;
  onSuccess: (vehicle: Vehicle) => void;
  onClose: () => void;
}

export const VehicleModal: React.FC<Props> = ({ drivers, initialVehicle, onSuccess, onClose }) => {
  const isEdit = Boolean(initialVehicle);
  const [vehicleNumber, setVehicleNumber] = useState(initialVehicle?.vehicle_number || '');
  const [model, setModel] = useState(initialVehicle?.model || '');
  const [vehicleType, setVehicleType] = useState(initialVehicle?.vehicle_type || 'Medium Freight');
  const [assignedDriverId, setAssignedDriverId] = useState(initialVehicle?.assigned_driver_id || '');
  const [status, setStatus] = useState<any>(initialVehicle?.status || 'AVAILABLE');
  const [notes, setNotes] = useState(initialVehicle?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleNumber.trim() || !model.trim()) {
      setError('Please provide both vehicle registration number and model.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const selectedDriver = drivers.find((d) => d.id === assignedDriverId || d.user_id === assignedDriverId);

    const payload = {
      vehicle_number: vehicleNumber.trim().toUpperCase(),
      model: model.trim(),
      vehicle_type: vehicleType,
      assigned_driver_id: assignedDriverId || null,
      assigned_driver_name: selectedDriver?.name || undefined,
      status: status,
      notes: notes.trim() || undefined
    };

    try {
      if (isEdit && initialVehicle) {
        const res = await api.fleet.updateVehicle(initialVehicle.id, payload);
        onSuccess(res.vehicle || { ...initialVehicle, ...payload });
      } else {
        const res = await api.fleet.createVehicle(payload);
        onSuccess(res.vehicle || { ...payload, id: `v-${Date.now()}` });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || (isEdit ? 'Failed to update vehicle' : 'Failed to add vehicle'));
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
              <Truck size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 600, margin: 0 }}>
                {isEdit ? 'Edit Fleet Vehicle' : 'Register Fleet Vehicle'}
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                {isEdit ? 'Update vehicle details and assigned driver' : 'Add commercial truck or cargo hauler to logistics registry'}
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
                Vehicle Registration Number (Plate) <span style={{ color: 'var(--status-danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. DL01 TA 4920 or UP16 BT 9845"
                value={vehicleNumber}
                onChange={(e) => setVehicleNumber(e.target.value)}
                style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontWeight: 600 }}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Vehicle Make & Model <span style={{ color: 'var(--status-danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Tata Ultra T.7 (14ft High Deck)"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                  <SearchableDropdown
                    value={vehicleType}
                    onChange={(value) => setVehicleType(value as string)}
                    options={[
                      { value: 'City Box Hauler', label: 'City Box Hauler' },
                      { value: 'Heavy Freight', label: 'Heavy Freight (24ft Container)' },
                      { value: 'Light Commercial', label: 'Light Commercial Vehicle' },
                      { value: 'Medium Freight', label: 'Medium Freight (14ft Deck)' },
                      { value: 'Refrigerated Express', label: 'Refrigerated Express (Thermal)' }
                    ]}
                  />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Operational Status
                </label>
                  <SearchableDropdown
                    value={status}
                    onChange={(value) => setStatus(value as any)}
                    options={[
                      { value: 'AVAILABLE', label: 'Available for Dispatch' },
                      { value: 'INACTIVE', label: 'Inactive / Reserve' },
                      { value: 'MAINTENANCE', label: 'In Maintenance / Workshop' }
                    ]}
                  />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Assigned Primary Driver / Captain
              </label>
                  <SearchableDropdown
                    value={assignedDriverId}
                    onChange={(value) => setAssignedDriverId(value as string)}
                    placeholder="Unassigned (Floating Fleet)"
                    options={[
                      { value: '', label: 'Unassigned (Floating Fleet)' },
                      ...drivers.map((d) => ({ value: d.id, label: `${d.name} (${d.employee_id})` }))
                    ]}
                  />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Telematics & Equipment Notes
              </label>
              <textarea
                className="form-input"
                rows={2}
                placeholder="e.g. GPS hardware sensor #TEL-4920, Intercity permit valid till 2027"
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
                  <Check size={16} /> {isEdit ? 'Update Vehicle' : 'Register Vehicle'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
