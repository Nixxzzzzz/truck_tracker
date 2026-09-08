import React, { useState, useEffect } from 'react';
import {
  Truck,
  Users,
  MapPin,
  FileText,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Download,
  CheckCircle,
  Clock,
  LogOut,
  ExternalLink,
  ChevronRight,
  Database,
  ArrowRight
} from 'lucide-react';
import { api } from '../services/api';
import { Trip, User, Vehicle, Driver, Destination } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TripCreatorModal } from '../components/TripCreatorModal';
import { TripDetailModal } from '../components/TripDetailModal';
import { ThemeToggle } from '../components/ThemeToggle';

interface Props {
  currentUser: User;
  onLogout: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const ManagerView: React.FC<Props> = ({ currentUser, onLogout, theme = 'dark', onToggleTheme }) => {
  const [activeTab, setActiveTab] = useState<'operations' | 'fleet' | 'reports' | 'sheets'>('operations');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [attention, setAttention] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Fleet state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);

  // Reports state
  const [dailyReport, setDailyReport] = useState<any>(null);

  // Google Sheets state
  const [sheetsStatus, setSheetsStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, [selectedDate, statusFilter]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [tripsRes, attentionRes] = await Promise.all([
        api.manager.getTrips({
          date: selectedDate,
          status: statusFilter,
          search: searchQuery
        }),
        api.manager.getAttention()
      ]);

      setTrips(tripsRes.trips);
      setAttention(attentionRes);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadFleetData = async () => {
    try {
      const [vRes, dRes, destRes] = await Promise.all([
        api.fleet.getVehicles(),
        api.fleet.getDrivers(),
        api.fleet.getDestinations()
      ]);
      setVehicles(vRes.vehicles);
      setDrivers(dRes.drivers);
      setDestinations(destRes.destinations);
    } catch (err) {
      console.error('Fleet error:', err);
    }
  };

  const loadReportsData = async () => {
    try {
      const data = await api.reports.getDaily(selectedDate);
      setDailyReport(data);
    } catch (err) {
      console.error('Reports error:', err);
    }
  };

  const loadSheetsStatus = async () => {
    try {
      const data = await api.googleSheets.getStatus();
      setSheetsStatus(data);
    } catch (err) {
      console.error('Sheets status error:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'fleet') loadFleetData();
    if (activeTab === 'reports') loadReportsData();
    if (activeTab === 'sheets') loadSheetsStatus();
  }, [activeTab]);

  // Operational metrics
  const totalTrips = trips.length;
  const activeTrips = trips.filter((t) =>
    ['IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING'].includes(t.status)
  );
  const completedTrips = trips.filter((t) => t.status === 'COMPLETED');
  const delayedTrips = trips.filter((t) => (t.total_delay_minutes || 0) > 0);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Top Manager Navigation Bar */}
      <header
        style={{
          height: '64px',
          backgroundColor: 'var(--bg-secondary)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '0 28px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '34px',
                height: '34px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-gold)',
                color: '#0d0e11',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '1rem',
                fontFamily: 'var(--font-display)'
              }}
            >
              TT
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>
                TruckTracker
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--accent-gold)', letterSpacing: '0.04em', fontWeight: 600 }}>
                INTERNAL LOGISTICS COMMAND
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav style={{ display: 'flex', gap: '6px' }}>
            <button
              className={`btn ${activeTab === 'operations' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '7px 14px', fontSize: '0.85rem' }}
              onClick={() => setActiveTab('operations')}
            >
              <Truck size={15} /> Active Operations
            </button>
            <button
              className={`btn ${activeTab === 'fleet' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '7px 14px', fontSize: '0.85rem' }}
              onClick={() => setActiveTab('fleet')}
            >
              <Users size={15} /> Fleet & Personnel
            </button>
            <button
              className={`btn ${activeTab === 'reports' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '7px 14px', fontSize: '0.85rem' }}
              onClick={() => setActiveTab('reports')}
            >
              <FileText size={15} /> Reports & Logs
            </button>
            <button
              className={`btn ${activeTab === 'sheets' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '7px 14px', fontSize: '0.85rem' }}
              onClick={() => setActiveTab('sheets')}
            >
              <Database size={15} /> Google Sheets Sync
            </button>
          </nav>
        </div>

        {/* User Info & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <button
            className="btn btn-primary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
            onClick={() => setIsCreateModalOpen(true)}
          >
            <Plus size={16} /> New Trip
          </button>

          {onToggleTheme && (
            <ThemeToggle theme={theme} onToggle={onToggleTheme} />
          )}

          <div style={{ height: '24px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />

          <div style={{ textAlign: 'right', fontSize: '0.82rem' }}>
            <div style={{ fontWeight: 600 }}>{currentUser.name}</div>
            <div style={{ color: 'var(--accent-gold)', fontSize: '0.72rem' }}>Operations Manager</div>
          </div>

          <button
            onClick={onLogout}
            className="btn btn-secondary"
            style={{ padding: '7px 10px' }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: '24px 28px', maxWidth: '1400px', width: '100%', margin: '0 auto' }}>
        {/* ========================================================
            TAB 1: ACTIVE OPERATIONS & LIVE TRIPS
            ======================================================== */}
        {activeTab === 'operations' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* KPI Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '16px' }}>
              <div className="card">
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Today's Scheduled
                </div>
                <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--text-primary)', marginTop: '4px' }}>
                  {totalTrips}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Vehicles Assigned
                </div>
              </div>

              <div className="card" style={{ borderColor: activeTrips.length > 0 ? 'var(--status-in-progress)' : 'var(--border-subtle)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--status-in-progress)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Active on Road
                </div>
                <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--status-in-progress)', marginTop: '4px' }}>
                  {activeTrips.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  In Progress / Returning
                </div>
              </div>

              <div className="card">
                <div style={{ fontSize: '0.8rem', color: 'var(--status-success)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Completed
                </div>
                <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--status-success)', marginTop: '4px' }}>
                  {completedTrips.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Returned to Base
                </div>
              </div>

              <div className="card" style={{ borderColor: delayedTrips.length > 0 ? 'var(--status-delayed)' : 'var(--border-subtle)' }}>
                <div style={{ fontSize: '0.8rem', color: 'var(--status-delayed)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Delays Reported
                </div>
                <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--status-delayed)', marginTop: '4px' }}>
                  {delayedTrips.length}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Traffic, loading or vehicle
                </div>
              </div>

              <div className="card">
                <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  Attention Required
                </div>
                <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--accent-gold)', marginTop: '4px' }}>
                  {attention?.totalAttentionCount || 0}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  Exceptions flagged
                </div>
              </div>
            </div>

            {/* ATTENTION REQUIRED BANNER (If any exceptions) */}
            {attention && attention.totalAttentionCount > 0 && (
              <div
                style={{
                  backgroundColor: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '16px 20px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-delayed)', fontWeight: 600, fontSize: '0.95rem' }}>
                  <AlertTriangle size={18} />
                  <span>ATTENTION REQUIRED: {attention.totalAttentionCount} ACTIVE EXCEPTIONS</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                  {attention.delayedTrips?.map((dt: any) => (
                    <div
                      key={dt.id}
                      onClick={() => setSelectedTripId(dt.id)}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                        <span>{dt.id} ({dt.vehicle_number})</span>
                        <span style={{ color: 'var(--status-delayed)' }}>{dt.total_delay_minutes}m Delay</span>
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                        Driver: {dt.driver_name} • Cause: {dt.delay_reason || 'Transit'}
                      </div>
                    </div>
                  ))}

                  {attention.failedActivities?.map((fa: any) => (
                    <div
                      key={fa.id}
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.85rem'
                      }}
                    >
                      <div style={{ color: 'var(--status-danger)', fontWeight: 600 }}>
                        Failed Activity at {fa.destination_name}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '2px' }}>
                        Trip: {fa.trip_id} • Driver: {fa.driver_name}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Filter and Search Bar */}
            <div
              style={{
                display: 'flex',
                gap: '12px',
                alignItems: 'center',
                flexWrap: 'wrap',
                backgroundColor: 'var(--bg-surface)',
                padding: '14px 18px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
                <Search size={16} color="var(--text-muted)" />
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                  placeholder="Search Trip ID, vehicle, driver name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadDashboardData()}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Filter size={15} color="var(--text-muted)" />
                <select
                  className="form-select"
                  style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="">All Statuses</option>
                  <option value="ASSIGNED">Assigned</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="AT_DESTINATION">At Destination</option>
                  <option value="DELAYED">Delayed</option>
                  <option value="RETURNING">Returning</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>

                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '8px 12px', fontSize: '0.85rem', width: 'auto' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />

                <button className="btn btn-secondary" onClick={loadDashboardData} style={{ padding: '8px 12px' }}>
                  <RefreshCw size={15} />
                </button>
              </div>
            </div>

            {/* Trips Operational Table */}
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)',
                overflow: 'hidden'
              }}
            >
              <div
                style={{
                  padding: '16px 20px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <h3 style={{ fontSize: '1.05rem' }}>Logistics Trips Register ({trips.length})</h3>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Showing schedule for {selectedDate}
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      <th style={{ padding: '12px 20px' }}>Trip ID</th>
                      <th style={{ padding: '12px 16px' }}>Driver</th>
                      <th style={{ padding: '12px 16px' }}>Vehicle</th>
                      <th style={{ padding: '12px 16px' }}>Current / Next Stop</th>
                      <th style={{ padding: '12px 16px' }}>Stop Progress</th>
                      <th style={{ padding: '12px 16px' }}>Departure</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Delay</th>
                      <th style={{ padding: '12px 20px', textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.length === 0 ? (
                      <tr>
                        <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                          No trips matching the selected date and filters.
                        </td>
                      </tr>
                    ) : (
                      trips.map((trip) => (
                        <tr
                          key={trip.id}
                          style={{
                            borderBottom: '1px solid var(--border-subtle)',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                        >
                          <td style={{ padding: '14px 20px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                            {trip.id}
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-primary)' }}>
                            {trip.driver_name}
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trip.vehicle_number}</span>
                            <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)' }}>{trip.vehicle_model}</span>
                          </td>
                          <td style={{ padding: '14px 16px', color: 'var(--text-secondary)' }}>
                            {trip.current_destination || 'All stops visited'}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '60px', height: '6px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
                                <div
                                  style={{
                                    height: '100%',
                                    width: `${trip.total_stops ? ((trip.completed_stops || 0) / trip.total_stops) * 100 : 0}%`,
                                    backgroundColor: 'var(--accent-gold)'
                                  }}
                                />
                              </div>
                              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                {trip.completed_stops || 0}/{trip.total_stops || 0}
                              </span>
                            </div>
                          </td>
                          <td style={{ padding: '14px 16px', fontSize: '0.82rem' }}>
                            <div>Plan: {trip.planned_departure_time}</div>
                            {trip.actual_start_time && (
                              <div style={{ color: 'var(--accent-gold)', fontSize: '0.75rem' }}>
                                Start: {new Date(trip.actual_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <StatusBadge status={trip.status} />
                          </td>
                          <td style={{ padding: '14px 16px', fontWeight: 600, color: (trip.total_delay_minutes || 0) > 0 ? 'var(--status-delayed)' : 'var(--text-muted)' }}>
                            {trip.total_delay_minutes ? `${trip.total_delay_minutes}m` : '—'}
                          </td>
                          <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                            <button
                              className="btn btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem' }}
                              onClick={() => setSelectedTripId(trip.id)}
                            >
                              Details <ArrowRight size={13} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: FLEET & PERSONNEL MANAGEMENT
            ======================================================== */}
        {activeTab === 'fleet' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Vehicles Table */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.15rem' }}>Company Logistics Vehicles ({vehicles.length})</h3>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px' }}>Plate / Number</th>
                      <th style={{ padding: '12px 16px' }}>Model</th>
                      <th style={{ padding: '12px 16px' }}>Type</th>
                      <th style={{ padding: '12px 16px' }}>Assigned Driver</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Total Trips</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vehicles.map((v) => (
                      <tr key={v.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{v.vehicle_number}</td>
                        <td style={{ padding: '12px 16px' }}>{v.model}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{v.vehicle_type}</td>
                        <td style={{ padding: '12px 16px' }}>{v.assigned_driver_name || 'Unassigned'}</td>
                        <td style={{ padding: '12px 16px' }}><StatusBadge status={v.status} /></td>
                        <td style={{ padding: '12px 16px' }}>{v.total_trips || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Drivers Table */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.15rem' }}>Company Drivers ({drivers.length})</h3>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px' }}>Employee ID</th>
                      <th style={{ padding: '12px 16px' }}>Name</th>
                      <th style={{ padding: '12px 16px' }}>Contact Phone</th>
                      <th style={{ padding: '12px 16px' }}>Assigned Vehicle</th>
                      <th style={{ padding: '12px 16px' }}>Status</th>
                      <th style={{ padding: '12px 16px' }}>Completed Trips</th>
                    </tr>
                  </thead>
                  <tbody>
                    {drivers.map((d) => (
                      <tr key={d.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)' }}>{d.employee_id}</td>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{d.name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-muted)' }}>{d.phone || '—'}</td>
                        <td style={{ padding: '12px 16px' }}>{d.assigned_vehicle_number || 'None'}</td>
                        <td style={{ padding: '12px 16px' }}><StatusBadge status={d.status} /></td>
                        <td style={{ padding: '12px 16px' }}>{d.total_trips || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Saved Destinations Table */}
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '1.15rem' }}>Saved Company Destinations ({destinations.length})</h3>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.88rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: '12px 16px' }}>Destination Name</th>
                      <th style={{ padding: '12px 16px' }}>Address</th>
                      <th style={{ padding: '12px 16px' }}>GPS Coordinates</th>
                      <th style={{ padding: '12px 16px' }}>Geofence Radius</th>
                      <th style={{ padding: '12px 16px' }}>Contact Person</th>
                    </tr>
                  </thead>
                  <tbody>
                    {destinations.map((dest) => (
                      <tr key={dest.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                        <td style={{ padding: '12px 16px', fontWeight: 600 }}>{dest.name}</td>
                        <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{dest.address}</td>
                        <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {dest.latitude.toFixed(4)}, {dest.longitude.toFixed(4)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>{dest.geofence_radius_meters}m</td>
                        <td style={{ padding: '12px 16px' }}>{dest.contact_name || '—'} {dest.contact_number && `(${dest.contact_number})`}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 3: OPERATIONAL REPORTS & CSV EXPORT
            ======================================================== */}
        {activeTab === 'reports' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ fontSize: '1.25rem' }}>Daily Logistics Operational Report</h3>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Performance analysis for {selectedDate}
                </div>
              </div>

              <a
                href={`/api/reports/export?date=${selectedDate}`}
                className="btn btn-primary"
                download
              >
                <Download size={16} /> Export Operational CSV
              </a>
            </div>

            {dailyReport && (
              <>
                {/* Summary Row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px' }}>
                  <div className="card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>ON-TIME ARRIVAL RATE</div>
                    <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--status-success)', marginTop: '4px' }}>
                      {dailyReport.overview.onTimePercentage}%
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL DESTINATIONS</div>
                    <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, marginTop: '4px' }}>
                      {dailyReport.overview.totalDestinations}
                    </div>
                  </div>

                  <div className="card">
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>TOTAL DELAY DURATION</div>
                    <div style={{ fontSize: '2rem', fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--status-delayed)', marginTop: '4px' }}>
                      {dailyReport.overview.totalDelayFormatted}
                    </div>
                  </div>
                </div>

                {/* Delay Distribution breakdown */}
                {dailyReport.delayReasons?.length > 0 && (
                  <div className="card">
                    <h4 style={{ fontSize: '1rem', marginBottom: '12px' }}>Delay Root Causes</h4>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                      {dailyReport.delayReasons.map((dr: any) => (
                        <div key={dr.reason} style={{ padding: '10px 14px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                          <div style={{ fontWeight: 600 }}>{dr.reason}</div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                            {dr.count} incident(s) • {dr.total_minutes} mins total
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: GOOGLE SHEETS SYNCHRONIZATION CENTER
            ======================================================== */}
        {activeTab === 'sheets' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="card card-gold-border">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <div>
                  <h3 style={{ fontSize: '1.2rem', color: 'var(--accent-gold)' }}>
                    Google Sheets Operational Synchronization
                  </h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    TruckTracker database is the <b>primary source of truth</b>. Operational records sync automatically to 8 dedicated sheets.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={async () => {
                      setSyncing(true);
                      await api.googleSheets.retry();
                      await loadSheetsStatus();
                      setSyncing(false);
                    }}
                    disabled={syncing}
                  >
                    <RefreshCw size={15} /> Retry Failed Items
                  </button>

                  <button
                    className="btn btn-primary"
                    onClick={async () => {
                      setSyncing(true);
                      await api.googleSheets.syncAll();
                      await loadSheetsStatus();
                      setSyncing(false);
                    }}
                    disabled={syncing}
                  >
                    <CheckCircle size={15} /> Sync All Trips Now
                  </button>
                </div>
              </div>

              {sheetsStatus && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginTop: '16px' }}>
                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SYNC ENGINE MODE</div>
                    <div style={{ fontWeight: 600, marginTop: '2px', color: 'var(--accent-gold)' }}>
                      {sheetsStatus.syncMode}
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>SPREADSHEET ID</div>
                    <div style={{ fontWeight: 600, marginTop: '2px' }}>
                      {sheetsStatus.spreadsheetId}
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--status-success)' }}>SUCCESSFULLY SYNCED</div>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--status-success)' }}>
                      {sheetsStatus.counts.SYNCED} records
                    </div>
                  </div>

                  <div style={{ padding: '12px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--status-danger)' }}>FAILED SYNCS</div>
                    <div style={{ fontWeight: 700, fontSize: '1.2rem', color: 'var(--status-danger)' }}>
                      {sheetsStatus.counts.FAILED} records
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 8 Operational Tabs Documentation Grid */}
            <div className="card">
              <h4 style={{ fontSize: '1.05rem', marginBottom: '12px' }}>Synchronized Google Sheets Tabs (8)</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                {[
                  { name: 'Trips', fields: 'Trip ID, Date, Driver, Vehicle, Status, Departure, Arrival, Duration, Distance' },
                  { name: 'Stops', fields: 'Trip ID, Stop ID, Stop Number, Destination, Planned/Actual Arrival, Variance' },
                  { name: 'Events', fields: 'Event ID, Timestamp, Event Type, Driver, Vehicle, GPS Coordinates, Accuracy' },
                  { name: 'Delays', fields: 'Delay ID, Reason, Duration Minutes, Start/End Time, Driver, Location' },
                  { name: 'Activities', fields: 'Activity ID, Type, Status, Completion Time, Quantity, Signoff' },
                  { name: 'Photos', fields: 'Photo ID, Category, Driver, Vehicle, Timestamp, GPS, Storage URL' },
                  { name: 'Drivers', fields: 'Driver ID, Name, Phone, Employee ID, Status, Assigned Vehicle' },
                  { name: 'Vehicles', fields: 'Vehicle ID, Plate Number, Model, Type, Status, Driver' }
                ].map((s) => (
                  <div key={s.name} style={{ padding: '14px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-md)' }}>
                    <div style={{ fontWeight: 600, color: 'var(--accent-gold)', fontSize: '0.95rem' }}>📄 {s.name}</div>
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>{s.fields}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Trip Creator Modal */}
      {isCreateModalOpen && (
        <TripCreatorModal
          onSuccess={() => {
            loadDashboardData();
          }}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {/* Trip Detail Modal */}
      {selectedTripId && (
        <TripDetailModal
          tripId={selectedTripId}
          onClose={() => setSelectedTripId(null)}
          onRefresh={loadDashboardData}
          theme={theme}
        />
      )}
    </div>
  );
};
