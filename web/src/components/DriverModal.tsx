import React, { useState } from 'react';
import { X, UserCheck, Check, AlertCircle, Phone, Mail, BadgeCheck } from 'lucide-react';
import { api } from '../services/api';
import { SearchableDropdown } from './common/SearchableDropdown';
import { Driver, Vehicle } from '../types';

interface Props {
  vehicles: Vehicle[];
  initialDriver?: Driver | null;
  onSuccess: (driver: Driver) => void;
  onClose: () => void;
}

export const DriverModal: React.FC<Props> = ({ vehicles, initialDriver, onSuccess, onClose }) => {
  const isEdit = Boolean(initialDriver);
  const [name, setName] = useState(initialDriver?.name || '');
  const [employeeId, setEmployeeId] = useState(initialDriver?.employee_id || '');
  const [phone, setPhone] = useState(initialDriver?.phone || '+91 ');
  const [email, setEmail] = useState(initialDriver?.email || '');
  const [assignedVehicleId, setAssignedVehicleId] = useState(initialDriver?.assigned_vehicle_id || '');
  const [status, setStatus] = useState<any>(initialDriver?.status || 'AVAILABLE');
  const [licenseNumber, setLicenseNumber] = useState(initialDriver?.license_number || '');
  const [licenseCategory, setLicenseCategory] = useState(initialDriver?.license_category || 'Commercial HMV');
  const [emergencyPhone, setEmergencyPhone] = useState(initialDriver?.emergency_phone || '');
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

    const payload: any = {
      name: name.trim(),
      employee_id: (employeeId.trim() || `EMP-DRV-${Math.floor(100 + Math.random() * 900)}`).toUpperCase(),
      phone: phone.trim() || '+91 98100 00000',
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '.')}@company.com`,
      assigned_vehicle_id: assignedVehicleId || null,
      assigned_vehicle_number: selectedVehicle?.vehicle_number || undefined,
      status: status,
      license_number: licenseNumber.trim() || undefined,
      license_category: licenseCategory || undefined,
      emergency_phone: emergencyPhone.trim() || undefined
    };

    try {
      if (isEdit && initialDriver) {
        const res = await api.fleet.updateDriver(initialDriver.id, payload);
        onSuccess(res.driver || { ...initialDriver, ...payload });
      } else {
        const res = await api.fleet.createDriver(payload);
        onSuccess(res.driver || { ...payload, id: `drv-${Date.now()}` });
      }
      onClose();
    } catch (err: any) {
      setError(err.message || (isEdit ? 'Failed to update driver' : 'Failed to register driver'));
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
              <h3 style={{ fontSize: '1.08rem', fontWeight: 600, margin: 0 }}>
                {isEdit ? 'Edit Driver / Captain Details' : 'Register Fleet Driver / Captain'}
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0 }}>
                {isEdit ? 'Update commercial driving license and contact roster' : 'Enlist a verified commercial driver to the operations roster'}
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
                <SearchableDropdown
                  value={status}
                  onChange={(value) => setStatus(value as any)}
                  options={[
                    { value: 'AVAILABLE', label: 'Available on Duty' },
                    { value: 'INACTIVE', label: 'Inactive / Leave' },
                    { value: 'OFF_DUTY', label: 'Off Duty / Rest Period' }
                  ]}
                />
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

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  Commercial Driver License (DL) #
                </label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. DL-0420110098451"
                  value={licenseNumber}
                  onChange={(e) => setLicenseNumber(e.target.value)}
                  style={{ fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}
                />
              </div>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                  License Category
                </label>
                <SearchableDropdown
                  value={licenseCategory}
                  onChange={(value) => setLicenseCategory(value as string)}
                  options={[
                    { value: 'Commercial HMV', label: 'Commercial HMV (Heavy)' },
                    { value: 'Commercial LMV', label: 'Commercial LMV (Light)' },
                    { value: 'Commercial MGV', label: 'Commercial MGV (Medium)' }
                  ]}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Emergency Contact Phone
              </label>
              <input
                type="tel"
                className="form-input"
                placeholder="+91 98101 99887 (Spouse/Family)"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.8rem', fontWeight: 600 }}>
                Assign Primary Vehicle (Truck)
              </label>
              <SearchableDropdown
                value={assignedVehicleId}
                onChange={(value) => setAssignedVehicleId(value as string)}
                placeholder="Unassigned (Floating Driver)"
                options={[
                  { value: '', label: 'Unassigned (Floating Driver)' },
                  ...vehicles.map((v) => ({ value: v.id, label: `${v.vehicle_number} — ${v.model} (${v.status})` }))
                ]}
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
                  <Check size={16} /> {isEdit ? 'Update Driver' : 'Register Driver'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
