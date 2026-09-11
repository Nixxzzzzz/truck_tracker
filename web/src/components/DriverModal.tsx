import React, { useState } from 'react';
import { X, UserCheck, Check, AlertCircle, Phone, Mail, BadgeCheck } from 'lucide-react';
import { api } from '../services/api';
import { Driver, Vehicle } from '../types';

interface Props {
  vehicles: Vehicle[];
  onSuccess: (driver: Driver) => void;
  onClose: () => void;
}

export const DriverModal: React.FC<Props> = ({ vehicles, onSuccess, onClose }) => {
  const [name, setName] = useState('');
  const [employeeId, setEmployeeId] = useState('');
  const [phone, setPhone] = useState('+91 ');
  const [email, setEmail] = useState('');
  const [assignedVehicleId, setAssignedVehicleId] = useState('');
  const [status, setStatus] = useState<any>('AVAILABLE');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide driver full name.');
      return;
    }

    setSubmitting(true);
    setError(null);

    const selectedVehicle = vehicles.find((v) => v.id === assignedVehicleId);

    const payload = {
      name: name.trim(),
      employee_id: (employeeId.trim() || `EMP-DRV-${Math.floor(100 + Math.random() * 900)}`).toUpperCase(),
      phone: phone.trim() || '+91 98100 00000',
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      assigned_vehicle_id: assignedVehicleId || null,
      assigned_vehicle_number: selectedVehicle?.vehicle_number || undefined,
      status: status
    };

    try {
      const res = await api.fleet.createDriver(payload);
      onSuccess(res.driver || { ...payload, id: `drv-${Date.now()}` });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to register driver');
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
              <UserCheck size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.08rem', fontWeight: 600, margin: 0 }}>Register Fleet Driver / Captain</h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                Enlist a verified commercial driver to the operations roster
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
                Full Driver Name <span style={{ color: 'var(--status-danger)' }}>*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Vikram Rathore"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Employee ID
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="EMP-DRV-104"
                    value={employeeId}
                    onChange={(e) => setEmployeeId(e.target.value)}
                    style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                  />
                  <BadgeCheck size={13} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Duty Status
                </label>
                <select
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="AVAILABLE">Available on Duty</option>
                  <option value="OFF_DUTY">Off Duty / Rest Period</option>
                  <option value="INACTIVE">Inactive / Leave</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Phone Line <span style={{ color: 'var(--status-danger)' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="tel"
                    className="form-input"
                    placeholder="+91 98104 55667"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                  <Phone size={13} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Company Email
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="vikram@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <Mail size={13} style={{ position: 'absolute', right: '10px', top: '10px', color: 'var(--text-muted)' }} />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Assign Primary Vehicle (Truck)
              </label>
              <select
                className="form-select"
                value={assignedVehicleId}
                onChange={(e) => setAssignedVehicleId(e.target.value)}
              >
                <option value="">— Unassigned (Floating Driver) —</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.vehicle_number} — {v.model} ({v.status})
                  </option>
                ))}
              </select>
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
                  <Check size={16} /> Register Driver
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
