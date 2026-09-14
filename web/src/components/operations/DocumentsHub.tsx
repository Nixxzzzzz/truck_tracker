import React, { useState, useMemo } from 'react';
import {
  FileText,
  ShieldCheck,
  AlertTriangle,
  Clock,
  Search,
  Filter,
  CheckCircle2,
  ExternalLink,
  Eye,
  FileCheck,
  Truck
} from 'lucide-react';
import { Vehicle, VehicleDocument } from '../../types';

interface DocumentsHubProps {
  vehicles: Vehicle[];
  onOpenVehiclePapers: (vehicle: Vehicle) => void;
}

interface FlattenedDoc {
  doc: VehicleDocument;
  vehicle: Vehicle;
}

export const DocumentsHub: React.FC<DocumentsHubProps> = ({ vehicles, onOpenVehiclePapers }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  // Flatten all documents across all vehicles
  const allDocs = useMemo(() => {
    const list: FlattenedDoc[] = [];
    vehicles.forEach((v) => {
      if (v.documents && v.documents.length > 0) {
        v.documents.forEach((d) => {
          list.push({ doc: d, vehicle: v });
        });
      }
    });
    return list;
  }, [vehicles]);

  // Statistics
  const stats = useMemo(() => {
    let valid = 0;
    let expiringSoon = 0;
    let expired = 0;

    allDocs.forEach(({ doc }) => {
      if (doc.status === 'EXPIRED') expired++;
      else if (doc.status === 'EXPIRING_SOON') expiringSoon++;
      else valid++;
    });

    return { total: allDocs.length, valid, expiringSoon, expired };
  }, [allDocs]);

  // Filtered documents
  const filteredDocs = useMemo(() => {
    return allDocs.filter(({ doc, vehicle }) => {
      if (statusFilter !== 'ALL' && doc.status !== statusFilter) return false;
      if (typeFilter !== 'ALL' && doc.type !== typeFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesPlate = vehicle.vehicle_number.toLowerCase().includes(q);
        const matchesTitle = doc.title.toLowerCase().includes(q);
        const matchesNumber = doc.document_number.toLowerCase().includes(q);
        if (!matchesPlate && !matchesTitle && !matchesNumber) return false;
      }

      return true;
    });
  }, [allDocs, statusFilter, typeFilter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Header */}
      <div>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
          Fleet Compliance & Document Registry
        </h1>
        <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
          Statutory compliance audit: Registration Certificates (RC), Fitness, Insurance, PUC & Permits
        </p>
      </div>

      {/* KPI Stat Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}
      >
        <div
          className="card-elevation-1"
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Total Registered Documents
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
            {stats.total}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'VALID' ? 'ALL' : 'VALID')}
          className="card-elevation-1"
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: statusFilter === 'VALID' ? '2px solid #10b981' : '1px solid var(--border-subtle)',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#10b981', textTransform: 'uppercase' }}>
            Valid & In Compliance
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '4px' }}>
            {stats.valid}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'EXPIRING_SOON' ? 'ALL' : 'EXPIRING_SOON')}
          className="card-elevation-1"
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: statusFilter === 'EXPIRING_SOON' ? '2px solid #f59e0b' : '1px solid var(--border-subtle)',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
            Expiring Within 30 Days
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#f59e0b', marginTop: '4px' }}>
            {stats.expiringSoon}
          </div>
        </div>

        <div
          onClick={() => setStatusFilter(statusFilter === 'EXPIRED' ? 'ALL' : 'EXPIRED')}
          className="card-elevation-1"
          style={{
            padding: '16px 20px',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: statusFilter === 'EXPIRED' ? '2px solid #ef4444' : '1px solid var(--border-subtle)',
            cursor: 'pointer'
          }}
        >
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#ef4444', textTransform: 'uppercase' }}>
            Expired Documents (Action Req.)
          </span>
          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', marginTop: '4px' }}>
            {stats.expired}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="card-elevation-1"
        style={{
          padding: '12px 16px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '12px',
          alignItems: 'center'
        }}
      >
        <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder="Search vehicle plate or document number..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ width: '100%', paddingLeft: '36px', fontSize: '0.84rem' }}
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="select-field"
          style={{ minWidth: '150px', fontSize: '0.84rem' }}
        >
          <option value="ALL">All Doc Types</option>
          <option value="RC">RC (Registration)</option>
          <option value="INSURANCE">Insurance</option>
          <option value="FITNESS">Fitness (Form 38)</option>
          <option value="PUC">PUC (Pollution)</option>
          <option value="PERMIT">Permit</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select-field"
          style={{ minWidth: '150px', fontSize: '0.84rem' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="VALID">Valid</option>
          <option value="EXPIRING_SOON">Expiring Soon</option>
          <option value="EXPIRED">Expired</option>
        </select>

        {(statusFilter !== 'ALL' || typeFilter !== 'ALL' || searchQuery) && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setStatusFilter('ALL');
              setTypeFilter('ALL');
              setSearchQuery('');
            }}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Documents Table */}
      <div
        className="card-elevation-1"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          overflow: 'hidden'
        }}
      >
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Vehicle Plate
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Document Type
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Title & Certificate Number
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Expiry Date
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Compliance Status
                </th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 800, color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    No vehicle compliance documents found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                filteredDocs.map(({ doc, vehicle }) => {
                  const isExpired = doc.status === 'EXPIRED';
                  const isExpiringSoon = doc.status === 'EXPIRING_SOON';

                  return (
                    <tr
                      key={`${vehicle.id}-${doc.id}`}
                      style={{
                        borderBottom: '1px solid var(--border-subtle)',
                        transition: 'background-color 0.1s ease'
                      }}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          {vehicle.vehicle_number}
                        </div>
                        <div style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                          {vehicle.model}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '4px',
                            backgroundColor: 'rgba(23, 100, 168, 0.1)',
                            color: 'var(--brand-primary)',
                            fontWeight: 700,
                            fontSize: '0.76rem'
                          }}
                        >
                          {doc.type}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                          {doc.title}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>
                          {doc.document_number}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px', whiteSpace: 'nowrap' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            color: isExpired ? '#ef4444' : isExpiringSoon ? '#f59e0b' : 'var(--text-primary)'
                          }}
                        >
                          {doc.expiry_date}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)' }}>
                          Issued: {doc.issue_date || 'N/A'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span
                          style={{
                            padding: '3px 8px',
                            borderRadius: '12px',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            backgroundColor: isExpired
                              ? '#fef2f2'
                              : isExpiringSoon
                              ? '#fffbeb'
                              : 'var(--badge-completed-bg)',
                            color: isExpired
                              ? '#ef4444'
                              : isExpiringSoon
                              ? '#d97706'
                              : 'var(--badge-completed-text)',
                            border: `1px solid ${
                              isExpired
                                ? '#fecaca'
                                : isExpiringSoon
                                ? '#fde68a'
                                : 'var(--badge-completed-border)'
                            }`
                          }}
                        >
                          {isExpired ? 'EXPIRED' : isExpiringSoon ? 'EXPIRING SOON' : 'VALID'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-outline"
                          onClick={() => onOpenVehiclePapers(vehicle)}
                          style={{ fontSize: '0.78rem', padding: '5px 10px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        >
                          <Eye size={13} />
                          <span>View Papers</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
