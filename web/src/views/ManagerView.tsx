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
  ExternalLink,
  ChevronRight,
  Database,
  ArrowRight,
  ShieldAlert,
  Play,
  Activity,
  Layers,
  Phone,
  Compass,
  RotateCcw,
  FileCheck,
  CreditCard,
  Edit3,
  Trash2,
  Eye,
  Radio,
  Navigation
} from 'lucide-react';
import { api, API_BASE } from '../services/api';
import { Trip, User, Vehicle, Driver, Destination } from '../types';
import { StatusBadge } from '../components/StatusBadge';
import { TripCreatorModal } from '../components/TripCreatorModal';
import { TripDetailModal } from '../components/TripDetailModal';
import { VehicleModal } from '../components/VehicleModal';
import { DriverModal } from '../components/DriverModal';
import { DestinationModal } from '../components/DestinationModal';
import { VehiclePapersModal } from '../components/VehiclePapersModal';
import { DriverDossierModal } from '../components/DriverDossierModal';
import { LeafletMap } from '../components/LeafletMap';
import { AppLayout } from '../components/layout/AppLayout';
import { NavSection } from '../components/layout/Sidebar';
import { KpiCard } from '../components/common/KpiCard';
import { PageHeader } from '../components/common/PageHeader';
import { EnterpriseTable, Column } from '../components/common/EnterpriseTable';
import { EmptyState } from '../components/common/EmptyState';

interface Props {
  currentUser: User;
  onLogout: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onSwitchRole?: (role: 'DRIVER' | 'MANAGER') => void;
}

export const ManagerView: React.FC<Props> = ({
  currentUser,
  onLogout,
  theme = 'dark',
  onToggleTheme = () => {},
  onSwitchRole
}) => {
  const [activeSection, setActiveSection] = useState<NavSection>('operations');
  const [trips, setTrips] = useState<Trip[]>([]);
  const [attention, setAttention] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters for Operations Trips
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterDriverId, setFilterDriverId] = useState('');
  const [filterVehicleId, setFilterVehicleId] = useState('');
  const [filterDelaysOnly, setFilterDelaysOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Fleet Sub-Search & Filters
  const [vehicleSearch, setVehicleSearch] = useState('');
  const [vehicleStatusFilter, setVehicleStatusFilter] = useState('');
  const [driverSearch, setDriverSearch] = useState('');
  const [destinationSearch, setDestinationSearch] = useState('');

  // Modals & Manager Action State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isDestinationModalOpen, setIsDestinationModalOpen] = useState(false);
  const [editingDestination, setEditingDestination] = useState<Destination | null>(null);
  const [papersVehicle, setPapersVehicle] = useState<Vehicle | null>(null);
  const [dossierDriver, setDossierDriver] = useState<Driver | null>(null);
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);

  // Live Telematics Map state (Ola / Rapido Experience)
  const [telematicsSearch, setTelematicsSearch] = useState('');
  const [telematicsFilter, setTelematicsFilter] = useState<'ALL' | 'MOVING' | 'IDLE'>('ALL');
  const [selectedVehicleForMap, setSelectedVehicleForMap] = useState<Vehicle | null>(null);
  const [focusedMapLocation, setFocusedMapLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [isSimulatingFleet, setIsSimulatingFleet] = useState(true);

  // Fleet state
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [fleetLoading, setFleetLoading] = useState(false);

  // Reports state
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [reportsLoading, setReportsLoading] = useState(false);

  // Google Sheets state
  const [sheetsStatus, setSheetsStatus] = useState<any>(null);
  const [syncing, setSyncing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [liveRefresh, setLiveRefresh] = useState(true);

  // Auto-refresh live operations every 30 seconds when on operations tab
  useEffect(() => {
    loadDashboardData();
  }, [selectedDate, statusFilter]);

  useEffect(() => {
    if (!liveRefresh || activeSection !== 'operations') return;

    const interval = setInterval(() => {
      silentRefreshOperations();
    }, 30000);

    return () => clearInterval(interval);
  }, [liveRefresh, activeSection, selectedDate, statusFilter]);

  // Live Vehicle Telematics Simulation (Ola / Rapido style real-time movements)
  useEffect(() => {
    if (!isSimulatingFleet) return;

    const interval = setInterval(() => {
      setVehicles((prevVehicles) =>
        prevVehicles.map((v) => {
          if (!v.latitude || !v.longitude) return v;
          const isMoving = (v.speed_kmh || 0) > 0 || v.status === 'ON_TRIP';
          if (!isMoving) return v;

          const headingRad = ((v.heading_deg || 45) * Math.PI) / 180;
          const deltaLat = Math.cos(headingRad) * 0.00035 + (Math.random() - 0.5) * 0.00008;
          const deltaLng = Math.sin(headingRad) * 0.00035 + (Math.random() - 0.5) * 0.00008;
          const speedFluc = Math.max(18, Math.min(85, (v.speed_kmh || 42) + (Math.random() * 4 - 2)));

          return {
            ...v,
            latitude: v.latitude + deltaLat,
            longitude: v.longitude + deltaLng,
            speed_kmh: speedFluc,
            last_ping: new Date().toISOString()
          };
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, [isSimulatingFleet]);

  // Manager Fleet Deletion & Decommissioning Handlers
  const handleDeleteVehicle = async (vehicle: Vehicle) => {
    if (!window.confirm(`Are you sure you want to decommission/delete vehicle ${vehicle.vehicle_number}?`)) {
      return;
    }
    try {
      await api.fleet.deleteVehicle(vehicle.id);
      setVehicles((prev) => prev.filter((v) => v.id !== vehicle.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete vehicle');
    }
  };

  const handleDeleteDriver = async (driver: Driver) => {
    if (!window.confirm(`Are you sure you want to remove driver ${driver.name} from the active roster?`)) {
      return;
    }
    try {
      await api.fleet.deleteDriver(driver.id);
      setDrivers((prev) => prev.filter((d) => d.id !== driver.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete driver');
    }
  };

  const handleDeleteDestination = async (dest: Destination) => {
    if (!window.confirm(`Are you sure you want to deactivate destination "${dest.name}"?`)) {
      return;
    }
    try {
      await api.fleet.deleteDestination(dest.id);
      setDestinations((prev) => prev.filter((d) => d.id !== dest.id));
    } catch (err: any) {
      alert(err.message || 'Failed to delete destination');
    }
  };

  // Lazy load section data
  useEffect(() => {
    if (['vehicles', 'drivers', 'destinations', 'map'].includes(activeSection)) {
      loadFleetData();
    }
    if (activeSection === 'reports') {
      loadReportsData();
    }
    if (activeSection === 'sheets') {
      loadSheetsStatus();
    }
  }, [activeSection, selectedDate]);

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
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleManualRefresh = async () => {
    setRefreshing(true);
    if (['vehicles', 'drivers', 'destinations'].includes(activeSection)) {
      await loadFleetData();
    } else if (activeSection === 'reports') {
      await loadReportsData();
    } else if (activeSection === 'sheets') {
      await loadSheetsStatus();
    } else {
      await loadDashboardData();
    }
    setRefreshing(false);
  };

  const silentRefreshOperations = async () => {
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
      setLastRefresh(new Date());
    } catch (err) {
      console.warn('[AutoRefresh] Poll failed silently:', err);
    }
  };

  const loadFleetData = async () => {
    setFleetLoading(true);
    try {
      const [vRes, dRes, destRes] = await Promise.all([
        api.fleet.getVehicles(),
        api.fleet.getDrivers(),
        api.fleet.getDestinations()
      ]);
      setVehicles(vRes.vehicles);
      setDrivers(dRes.drivers);
      setDestinations(destRes.destinations);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Fleet error:', err);
    } finally {
      setFleetLoading(false);
    }
  };

  const loadReportsData = async () => {
    setReportsLoading(true);
    try {
      const data = await api.reports.getDaily(selectedDate);
      setDailyReport(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Reports error:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  const loadSheetsStatus = async () => {
    try {
      const data = await api.googleSheets.getStatus();
      setSheetsStatus(data);
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Sheets status error:', err);
    }
  };

  // Operational metrics
  const totalTrips = trips.length;
  const activeTrips = trips.filter((t) =>
    ['IN_PROGRESS', 'AT_DESTINATION', 'DELAYED', 'RETURNING'].includes(t.status)
  );
  const completedTrips = trips.filter((t) => t.status === 'COMPLETED');
  const delayedTrips = trips.filter((t) => (t.total_delay_minutes || 0) > 0);

  // Trips Table Columns Definition
  const tripColumns: Column<Trip>[] = [
    {
      key: 'id',
      header: 'Trip ID',
      sortable: true,
      render: (trip) => (
        <div>
          <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', fontSize: '0.85rem' }}>
            {trip.id}
          </span>
          <span style={{ display: 'block', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            {trip.purpose || 'Freight Delivery'}
          </span>
        </div>
      )
    },
    {
      key: 'driver_name',
      header: 'Driver',
      sortable: true,
      render: (trip) => (
        <div>
          <div style={{ fontWeight: 500 }}>{trip.driver_name || 'Unassigned'}</div>
          {trip.driver_phone && (
            <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '3px' }}>
              <Phone size={10} />
              <span>{trip.driver_phone}</span>
            </div>
          )}
        </div>
      )
    },
    {
      key: 'vehicle_number',
      header: 'Vehicle',
      sortable: true,
      render: (trip) => (
        <div>
          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{trip.vehicle_number}</span>
          <span style={{ fontSize: '0.74rem', display: 'block', color: 'var(--text-muted)' }}>
            {trip.vehicle_model || trip.vehicle_type || 'Fleet Asset'}
          </span>
        </div>
      )
    },
    {
      key: 'current_destination',
      header: 'Next / Current Stop',
      render: (trip) => (
        <div style={{ maxWidth: '220px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {trip.current_destination || 'All stops visited'}
        </div>
      )
    },
    {
      key: 'stops_progress',
      header: 'Stop Progress',
      render: (trip) => {
        const completed = trip.completed_stops ?? (trip.stops?.filter(s => s.status === 'COMPLETED').length ?? (trip.status === 'COMPLETED' ? 1 : 0));
        const total = trip.total_stops || (trip.stops?.length ? trip.stops.length : (trip.status === 'COMPLETED' ? 1 : 2));
        const percent = total > 0 ? (completed / total) * 100 : 0;
        return (
          <div style={{ minWidth: '100px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '4px', color: 'var(--text-muted)' }}>
              <span>Stops</span>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{completed}/{total}</span>
            </div>
            <div style={{ width: '100%', height: '5px', backgroundColor: 'var(--bg-secondary)', borderRadius: 'var(--radius-full)', overflow: 'hidden' }}>
              <div
                style={{
                  height: '100%',
                  width: `${percent}%`,
                  backgroundColor: percent === 100 ? 'var(--status-success)' : 'var(--accent-primary)',
                  transition: 'width 0.2s ease'
                }}
              />
            </div>
          </div>
        );
      }
    },
    {
      key: 'planned_departure_time',
      header: 'Schedule',
      sortable: true,
      render: (trip) => (
        <div style={{ fontSize: '0.8rem' }}>
          <div>Plan: <b>{trip.planned_departure_time}</b></div>
          {trip.actual_start_time && (
            <div style={{ color: 'var(--accent-gold)', fontSize: '0.73rem' }}>
              Departed: {new Date(trip.actual_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (trip) => <StatusBadge status={trip.status} />
    },
    {
      key: 'total_delay_minutes',
      header: 'Delay',
      sortable: true,
      render: (trip) => {
        const mins = trip.total_delay_minutes || 0;
        return mins > 0 ? (
          <span style={{ fontWeight: 600, color: 'var(--status-delayed)', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <AlertTriangle size={12} />
            {mins}m
          </span>
        ) : (
          <span style={{ color: 'var(--text-muted)' }}>—</span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (trip) => (
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={(e) => {
            e.stopPropagation();
            setSelectedTripId(trip.id);
          }}
          style={{ padding: '4px 10px' }}
        >
          <span>Inspect</span>
          <ChevronRight size={13} />
        </button>
      )
    }
  ];

  // Filter Reset & Helper State
  const resetAllFilters = () => {
    setSearchQuery('');
    setStatusFilter('');
    setFilterDriverId('');
    setFilterVehicleId('');
    setFilterDelaysOnly(false);
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const hasActiveFilters = Boolean(
    searchQuery.trim() ||
    statusFilter ||
    filterDriverId ||
    filterVehicleId ||
    filterDelaysOnly ||
    selectedDate !== new Date().toISOString().split('T')[0]
  );

  // Filtered Trips Computation
  const filteredTrips = trips.filter((trip) => {
    if (statusFilter && trip.status !== statusFilter) return false;
    if (filterDriverId && trip.driver_id !== filterDriverId && trip.driver_name !== filterDriverId) return false;
    if (filterVehicleId && trip.vehicle_id !== filterVehicleId && trip.vehicle_number !== filterVehicleId) return false;
    if (filterDelaysOnly && !(trip.total_delay_minutes && trip.total_delay_minutes > 0)) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const match =
        trip.id.toLowerCase().includes(q) ||
        (trip.driver_name || '').toLowerCase().includes(q) ||
        (trip.vehicle_number || '').toLowerCase().includes(q) ||
        (trip.reference_number || '').toLowerCase().includes(q) ||
        (trip.purpose || '').toLowerCase().includes(q) ||
        (trip.stops || []).some(
          (s) =>
            (s.destination_name || '').toLowerCase().includes(q) ||
            (s.address || '').toLowerCase().includes(q)
        );
      if (!match) return false;
    }
    return true;
  });

  // Vehicles Filtered
  const filteredVehicles = vehicles.filter((v) => {
    const matchesSearch =
      v.vehicle_number.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      v.model.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
      (v.assigned_driver_name || '').toLowerCase().includes(vehicleSearch.toLowerCase());
    const matchesStatus = vehicleStatusFilter ? v.status === vehicleStatusFilter : true;
    return matchesSearch && matchesStatus;
  });

  // Drivers Filtered
  const filteredDrivers = drivers.filter((d) => {
    return (
      d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
      d.employee_id.toLowerCase().includes(driverSearch.toLowerCase()) ||
      (d.phone || '').includes(driverSearch)
    );
  });

  // Destinations Filtered
  const filteredDestinations = destinations.filter((dest) => {
    return (
      dest.name.toLowerCase().includes(destinationSearch.toLowerCase()) ||
      dest.address.toLowerCase().includes(destinationSearch.toLowerCase()) ||
      (dest.contact_name || '').toLowerCase().includes(destinationSearch.toLowerCase())
    );
  });

  return (
    <AppLayout
      currentUser={currentUser}
      onLogout={onLogout}
      theme={theme}
      onToggleTheme={onToggleTheme}
      onSwitchToDriver={onSwitchRole ? () => onSwitchRole('DRIVER') : undefined}
      activeSection={activeSection}
      onSelectSection={setActiveSection}
      onNewTrip={() => setIsCreateModalOpen(true)}
      lastUpdated={lastRefresh}
      onRefresh={handleManualRefresh}
      refreshing={refreshing}
    >
      {/* ========================================================
          1. OPERATIONS COMMAND CENTER
          ======================================================== */}
      {activeSection === 'operations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Operations' }, { label: 'Command Center' }]}
            title="Logistics Command Center"
            subtitle="Real-time dispatch telemetry, active routes, and exception monitoring across all assigned fleet units."
            lastUpdated={lastRefresh}
            onRefresh={handleManualRefresh}
            refreshing={refreshing}
            actions={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <Plus size={14} />
                <span>Dispatch Trip</span>
              </button>
            }
          />

          {/* Top KPI Metrics Row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px' }}>
            <KpiCard
              label="Today's Scheduled"
              value={totalTrips}
              subValue="Assigned vehicle trips"
              icon={<Truck size={18} />}
            />
            <KpiCard
              label="Active on Road"
              value={activeTrips.length}
              subValue="In Progress / Returning"
              icon={<Play size={18} />}
              variant={activeTrips.length > 0 ? 'info' : 'default'}
            />
            <KpiCard
              label="Delivered & Completed"
              value={completedTrips.length}
              subValue="Returned to base depot"
              icon={<CheckCircle size={18} />}
              variant="success"
            />
            <KpiCard
              label="Delays Reported"
              value={delayedTrips.length}
              subValue="Traffic, loading, or mechanical"
              icon={<AlertTriangle size={18} />}
              variant={delayedTrips.length > 0 ? 'warning' : 'default'}
            />
            <KpiCard
              label="Action Required"
              value={attention?.totalAttentionCount || 0}
              subValue="Exceptions flagged"
              icon={<ShieldAlert size={18} />}
              variant={attention?.totalAttentionCount > 0 ? 'danger' : 'default'}
            />
          </div>

          {/* ATTENTION REQUIRED EXCEPTION CENTER */}
          {attention && attention.totalAttentionCount > 0 && (
            <div
              style={{
                backgroundColor: 'var(--status-delayed-bg)',
                border: '1px solid var(--status-delayed-border)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-delayed)', fontWeight: 600, fontSize: '0.92rem' }}>
                  <AlertTriangle size={18} />
                  <span>OPERATIONAL EXCEPTIONS ({attention.totalAttentionCount} REQUIRE ATTENTION)</span>
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Prioritize resolving customer delivery bottlenecks
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '10px' }}>
                {attention.delayedTrips?.map((dt: any) => (
                  <div
                    key={dt.id}
                    onClick={() => setSelectedTripId(dt.id)}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      cursor: 'pointer',
                      fontSize: '0.84rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>{dt.id} ({dt.vehicle_number})</span>
                      <span style={{ color: 'var(--status-delayed)', fontWeight: 600, fontSize: '0.78rem' }}>
                        +{dt.total_delay_minutes}m Delay
                      </span>
                    </div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '4px' }}>
                      Driver: <b>{dt.driver_name}</b> • Cause: {dt.delay_reason || 'Transit Bottleneck'}
                    </div>
                  </div>
                ))}

                {attention.failedActivities?.map((fa: any) => (
                  <div
                    key={fa.id}
                    style={{
                      padding: '12px 14px',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--status-danger-border)',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.84rem'
                    }}
                  >
                    <div style={{ color: 'var(--status-danger)', fontWeight: 600 }}>
                      Delivery Activity Exception at {fa.destination_name}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '4px' }}>
                      Trip: {fa.trip_id} • Driver: {fa.driver_name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Filter, Search & Refresh Multi-Criteria Toolbar */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              backgroundColor: 'var(--bg-surface)',
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {/* Top row: Search input & Action Pills */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px' }}>
                <Search size={15} color="var(--text-muted)" />
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                  placeholder="Search by Trip ID, driver, vehicle plate, reference no, or stop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Date Selector with Quick Presets */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Clock size={14} color="var(--text-muted)" />
                <input
                  type="date"
                  className="form-input"
                  style={{ padding: '5px 8px', fontSize: '0.8rem', width: 'auto' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.72rem',
                    backgroundColor: selectedDate === new Date().toISOString().split('T')[0] ? 'var(--accent-whatsapp)' : 'var(--bg-secondary)',
                    color: selectedDate === new Date().toISOString().split('T')[0] ? '#0b141a' : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Today
                </button>
              </div>

              {/* Live auto-refresh toggle */}
              <button
                type="button"
                onClick={() => setLiveRefresh((prev) => !prev)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: liveRefresh ? 'rgba(37, 211, 102, 0.12)' : 'transparent',
                  border: `1px solid ${liveRefresh ? 'rgba(37, 211, 102, 0.35)' : 'var(--border-subtle)'}`,
                  borderRadius: 'var(--radius-full)',
                  padding: '5px 10px',
                  cursor: 'pointer',
                  fontSize: '0.74rem',
                  color: liveRefresh ? 'var(--accent-whatsapp)' : 'var(--text-muted)',
                  whiteSpace: 'nowrap'
                }}
                title={liveRefresh ? 'Live auto-refresh active (every 30s)' : 'Auto-refresh paused'}
              >
                <span
                  style={{
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: liveRefresh ? 'var(--accent-whatsapp)' : 'var(--text-muted)',
                    animation: liveRefresh ? 'pulse 2s infinite ease-in-out' : 'none'
                  }}
                />
                {liveRefresh ? 'Live Poll ON' : 'Paused'}
              </button>
            </div>

            {/* Bottom row: Filter Dropdowns & Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', paddingTop: '6px', borderTop: '1px solid var(--border-subtle)' }}>
              <Filter size={13} color="var(--text-muted)" />
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Filters:</span>

              {/* Status filter */}
              <select
                className="form-select"
                style={{ padding: '5px 8px', fontSize: '0.78rem', width: 'auto' }}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Transit</option>
                <option value="AT_DESTINATION">At Destination</option>
                <option value="DELAYED">Delayed</option>
                <option value="RETURNING">Returning</option>
                <option value="COMPLETED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              {/* Driver filter */}
              <select
                className="form-select"
                style={{ padding: '5px 8px', fontSize: '0.78rem', width: 'auto' }}
                value={filterDriverId}
                onChange={(e) => setFilterDriverId(e.target.value)}
              >
                <option value="">All Drivers</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.name} ({d.employee_id})
                  </option>
                ))}
              </select>

              {/* Vehicle filter */}
              <select
                className="form-select"
                style={{ padding: '5px 8px', fontSize: '0.78rem', width: 'auto' }}
                value={filterVehicleId}
                onChange={(e) => setFilterVehicleId(e.target.value)}
              >
                <option value="">All Vehicles</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.vehicle_number}>
                    {v.vehicle_number} ({v.model})
                  </option>
                ))}
              </select>

              {/* Delays Only Toggle Button */}
              <button
                type="button"
                onClick={() => setFilterDelaysOnly(!filterDelaysOnly)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  fontSize: '0.74rem',
                  borderRadius: 'var(--radius-sm)',
                  cursor: 'pointer',
                  border: filterDelaysOnly ? '1px solid var(--status-delayed)' : '1px solid var(--border-subtle)',
                  backgroundColor: filterDelaysOnly ? 'rgba(245, 158, 11, 0.15)' : 'transparent',
                  color: filterDelaysOnly ? 'var(--status-delayed)' : 'var(--text-muted)',
                  fontWeight: filterDelaysOnly ? 700 : 500
                }}
              >
                <AlertTriangle size={12} />
                <span>Exceptions / Delays Only</span>
              </button>

              {/* Reset All Filters Button */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={resetAllFilters}
                  className="btn btn-secondary btn-sm"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 9px',
                    fontSize: '0.74rem',
                    color: 'var(--accent-whatsapp)'
                  }}
                  title="Clear all filters and search query"
                >
                  <RotateCcw size={12} />
                  <span>Reset Filters</span>
                </button>
              )}

              <span style={{ marginLeft: 'auto', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Showing <b>{filteredTrips.length}</b> of <b>{trips.length}</b> trips
              </span>
            </div>
          </div>

          {/* Trips Register Table */}
          <EnterpriseTable
            columns={tripColumns}
            data={filteredTrips}
            keyExtractor={(trip) => trip.id}
            loading={loading}
            onRowClick={(trip) => setSelectedTripId(trip.id)}
            emptyTitle="No trips registered"
            emptyDescription="No trips found for the selected date and filters. Dispatch a new trip to begin tracking."
            emptyActionLabel="Dispatch New Trip"
            onEmptyAction={() => setIsCreateModalOpen(true)}
          />
        </div>
      )}

      {/* ========================================================
          2. LIVE TELEMATICS FLEET MAP VIEW (Ola / Rapido Style)
          ======================================================== */}
      {activeSection === 'map' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Operations' }, { label: 'Live Telematics Radar' }]}
            title="Live Fleet Telematics & Vehicle Feed"
            subtitle="Ola & Rapido-style live vehicle location radar, active speeds, drivers, and instantaneous corridor tracking."
            lastUpdated={lastRefresh}
            onRefresh={handleManualRefresh}
            refreshing={refreshing}
            actions={
              <button
                type="button"
                className={`btn ${isSimulatingFleet ? 'btn-primary' : 'btn-secondary'} btn-sm`}
                onClick={() => setIsSimulatingFleet(!isSimulatingFleet)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Radio size={14} className={isSimulatingFleet ? 'animate-pulse' : ''} />
                <span>{isSimulatingFleet ? '🟢 Live GPS Feed Active' : '⏸️ GPS Feed Paused'}</span>
              </button>
            }
          />

          {/* Ola/Rapido Telematics Grid: Left Vehicle Drawer + Right Map Canvas */}
          <div className="fleet-telematics-grid">
            {/* Left Vehicle Feed Drawer */}
            <div className="fleet-telematics-sidebar">
              {/* Telematics Header & Search */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Active Vehicles ({vehicles.length})
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--accent-whatsapp)', fontWeight: 600 }}>
                    {vehicles.filter((v) => (v.speed_kmh || 0) > 2).length} Moving
                  </span>
                </div>

                {/* Search */}
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Search plate or model..."
                    value={telematicsSearch}
                    onChange={(e) => setTelematicsSearch(e.target.value)}
                    style={{ paddingLeft: '32px', fontSize: '0.82rem', height: '34px' }}
                  />
                </div>

                {/* Filter Pills */}
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => setTelematicsFilter('ALL')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: telematicsFilter === 'ALL' ? 'var(--accent-whatsapp)' : 'var(--bg-surface)',
                      color: telematicsFilter === 'ALL' ? '#0b141a' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    All ({vehicles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTelematicsFilter('MOVING')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: telematicsFilter === 'MOVING' ? '#10b981' : 'var(--bg-surface)',
                      color: telematicsFilter === 'MOVING' ? '#ffffff' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    Moving ({vehicles.filter((v) => (v.speed_kmh || 0) > 2).length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setTelematicsFilter('IDLE')}
                    style={{
                      flex: 1,
                      padding: '4px 8px',
                      fontSize: '0.74rem',
                      fontWeight: 600,
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-subtle)',
                      backgroundColor: telematicsFilter === 'IDLE' ? 'var(--accent-gold)' : 'var(--bg-surface)',
                      color: telematicsFilter === 'IDLE' ? '#0b141a' : 'var(--text-secondary)',
                      cursor: 'pointer'
                    }}
                  >
                    Idle ({vehicles.filter((v) => (v.speed_kmh || 0) <= 2).length})
                  </button>
                </div>
              </div>

              {/* Scrollable Vehicle List */}
              <div className="fleet-telematics-list">
                {vehicles
                  .filter((v) => {
                    const matchSearch =
                      v.vehicle_number.toLowerCase().includes(telematicsSearch.toLowerCase()) ||
                      v.model.toLowerCase().includes(telematicsSearch.toLowerCase()) ||
                      (v.assigned_driver_name || '').toLowerCase().includes(telematicsSearch.toLowerCase());
                    const isMoving = (v.speed_kmh || 0) > 2;
                    const matchFilter = telematicsFilter === 'ALL' || (telematicsFilter === 'MOVING' ? isMoving : !isMoving);
                    return matchSearch && matchFilter;
                  })
                  .map((v) => {
                    const isMoving = (v.speed_kmh || 0) > 2;
                    const isSelected = selectedVehicleForMap?.id === v.id;

                    return (
                      <div
                        key={v.id}
                        className={`fleet-vehicle-card ${isSelected ? 'selected' : ''}`}
                        onClick={() => {
                          setSelectedVehicleForMap(v);
                          if (v.latitude && v.longitude) {
                            setFocusedMapLocation({ latitude: v.latitude, longitude: v.longitude });
                          }
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontSize: '1.25rem' }}>
                              {v.type === 'TRAILER' ? '🚛' : v.type === 'HEAVY_TRUCK' ? '🚚' : '🚐'}
                            </span>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: '0.88rem', fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>
                                {v.vehicle_number}
                              </div>
                              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                                {v.model} &bull; {v.capacity_tons}T
                              </div>
                            </div>
                          </div>

                          {/* Speed Badge */}
                          {isMoving ? (
                            <div className="speed-badge moving">
                              <span className="radar-pulse-dot" />
                              <span>{Math.round(v.speed_kmh || 0)} km/h</span>
                            </div>
                          ) : (
                            <div className="speed-badge idle">
                              <span>Stationary</span>
                            </div>
                          )}
                        </div>

                        {/* Telemetry info row */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.76rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <span>👤 {v.assigned_driver_name || 'Driver on Duty'}</span>
                          <span>🧭 {Math.round(v.heading_deg || 0)}&deg; Heading</span>
                        </div>

                        {v.current_location && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            📍 {v.current_location}
                          </div>
                        )}

                        {/* Quick action buttons */}
                        <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ flex: 1, padding: '3px 6px', fontSize: '0.72rem', height: '26px' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (v.latitude && v.longitude) {
                                setFocusedMapLocation({ latitude: v.latitude, longitude: v.longitude });
                              }
                            }}
                          >
                            <Navigation size={11} />
                            <span>Focus Map</span>
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            style={{ padding: '3px 8px', fontSize: '0.72rem', height: '26px', color: 'var(--accent-gold)' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setPapersVehicle(v);
                            }}
                            title="Manage RC, Insurance & Challans"
                          >
                            <FileCheck size={11} />
                            <span>Papers</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Right Map Canvas with All Live Vehicles */}
            <div className="fleet-telematics-map-container">
              <LeafletMap
                fleetVehicles={vehicles}
                focusedLocation={focusedMapLocation}
                onSelectVehicle={(v) => {
                  setSelectedVehicleForMap(v);
                  if (v.latitude && v.longitude) {
                    setFocusedMapLocation({ latitude: v.latitude, longitude: v.longitude });
                  }
                }}
                baseLocation={{
                  name: trips[0]?.starting_location || 'Delhi Central Logistics Depot',
                  latitude: trips[0]?.starting_latitude || 28.5355,
                  longitude: trips[0]?.starting_longitude || 77.2680
                }}
                stops={trips[0]?.stops || []}
                events={trips[0]?.events || []}
                height="650px"
                theme={theme}
              />
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          3. VEHICLES REGISTER
          ======================================================== */}
      {activeSection === 'vehicles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Fleet' }, { label: 'Vehicles Register' }]}
            title="Company Logistics Vehicles"
            subtitle="Full inventory of heavy and medium logistics assets, assigned drivers, and mechanical service statuses."
            lastUpdated={lastRefresh}
            onRefresh={handleManualRefresh}
            refreshing={refreshing}
            actions={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsVehicleModalOpen(true)}
                style={{
                  backgroundColor: 'var(--accent-whatsapp)',
                  borderColor: 'var(--accent-whatsapp)',
                  color: '#0b141a',
                  fontWeight: 600
                }}
              >
                <Plus size={14} />
                <span>Add Vehicle</span>
              </button>
            }
          />

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <KpiCard label="Total Fleet Units" value={vehicles.length} icon={<Truck size={18} />} />
            <KpiCard
              label="Available"
              value={vehicles.filter((v) => v.status === 'AVAILABLE').length}
              icon={<CheckCircle size={18} />}
              variant="success"
            />
            <KpiCard
              label="On Active Trip"
              value={vehicles.filter((v) => v.status === 'ON_TRIP').length}
              icon={<Play size={18} />}
              variant="info"
            />
            <KpiCard
              label="In Maintenance"
              value={vehicles.filter((v) => v.status === 'MAINTENANCE').length}
              icon={<ShieldAlert size={18} />}
              variant="warning"
            />
          </div>

          {/* Search & Filter Toolbar */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                placeholder="Search plate number, model, or driver..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
              />
            </div>

            <select
              className="form-select"
              style={{ padding: '6px 10px', fontSize: '0.82rem', width: 'auto' }}
              value={vehicleStatusFilter}
              onChange={(e) => setVehicleStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="AVAILABLE">Available</option>
              <option value="ON_TRIP">On Trip</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="INACTIVE">Inactive</option>
            </select>
          </div>

          {/* Vehicles Table */}
          <EnterpriseTable
            columns={[
              {
                key: 'vehicle_number',
                header: 'Plate / Number',
                sortable: true,
                render: (v) => (
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {v.vehicle_number}
                  </span>
                )
              },
              { key: 'model', header: 'Model', sortable: true },
              {
                key: 'vehicle_type',
                header: 'Type',
                render: (v) => <span style={{ color: 'var(--text-muted)' }}>{v.vehicle_type}</span>
              },
              {
                key: 'assigned_driver_name',
                header: 'Assigned Driver',
                render: (v) => v.assigned_driver_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (v) => <StatusBadge status={v.status} />
              },
              {
                key: 'total_trips',
                header: 'Total Completed Trips',
                sortable: true,
                render: (v) => v.total_trips || 0
              },
              {
                key: 'compliance',
                header: 'Papers & Challans',
                render: (v) => {
                  const challanCount = v.challans?.filter(c => c.status === 'PENDING').length || 0;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="paper-status-badge valid" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>
                        RC & Ins. Active
                      </span>
                      {challanCount > 0 ? (
                        <span className="challan-pill pending" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>
                          {challanCount} Challan{challanCount > 1 ? 's' : ''}
                        </span>
                      ) : (
                        <span className="challan-pill settled" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>
                          Clear
                        </span>
                      )}
                    </div>
                  );
                }
              },
              {
                key: 'actions',
                header: 'Manager Actions',
                align: 'right',
                render: (v) => (
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPapersVehicle(v);
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--accent-gold)',
                        borderColor: 'rgba(197, 160, 89, 0.4)'
                      }}
                      title="Manage Official RC, Insurance, Fitness & Challans"
                    >
                      <FileCheck size={12} />
                      <span>Papers</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingVehicle(v);
                      }}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Edit Vehicle Details"
                    >
                      <Edit3 size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteVehicle(v);
                      }}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--status-danger)', borderColor: 'var(--status-danger-border)' }}
                      title="Decommission Vehicle"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              }
            ]}
            data={filteredVehicles}
            keyExtractor={(v) => v.id}
            loading={fleetLoading}
            emptyTitle="No vehicles found"
            emptyDescription="No fleet vehicles match your filter criteria."
          />
        </div>
      )}

      {/* ========================================================
          4. DRIVERS ROSTER
          ======================================================== */}
      {activeSection === 'drivers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Fleet' }, { label: 'Drivers Roster' }]}
            title="Company Drivers & Operators"
            subtitle="Roster of licensed company drivers, assigned logistics vehicles, contact lines, and duty statuses."
            lastUpdated={lastRefresh}
            onRefresh={handleManualRefresh}
            refreshing={refreshing}
            actions={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsDriverModalOpen(true)}
                style={{
                  backgroundColor: 'var(--accent-whatsapp)',
                  borderColor: 'var(--accent-whatsapp)',
                  color: '#0b141a',
                  fontWeight: 600
                }}
              >
                <Plus size={14} />
                <span>Add Driver</span>
              </button>
            }
          />

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <KpiCard label="Total Drivers" value={drivers.length} icon={<Users size={18} />} />
            <KpiCard
              label="Available"
              value={drivers.filter((d) => d.status === 'AVAILABLE').length}
              icon={<CheckCircle size={18} />}
              variant="success"
            />
            <KpiCard
              label="On Active Trip"
              value={drivers.filter((d) => d.status === 'ON_TRIP').length}
              icon={<Play size={18} />}
              variant="info"
            />
            <KpiCard
              label="Off Duty / Inactive"
              value={drivers.filter((d) => d.status === 'OFF_DUTY' || d.status === 'INACTIVE').length}
              icon={<Clock size={18} />}
            />
          </div>

          {/* Search Toolbar */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              className="form-input"
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              placeholder="Search driver by name, employee ID, or contact number..."
              value={driverSearch}
              onChange={(e) => setDriverSearch(e.target.value)}
            />
          </div>

          {/* Drivers Table */}
          <EnterpriseTable
            columns={[
              {
                key: 'employee_id',
                header: 'Employee ID',
                sortable: true,
                render: (d) => <span style={{ fontFamily: 'var(--font-mono)' }}>{d.employee_id}</span>
              },
              {
                key: 'name',
                header: 'Driver Name',
                sortable: true,
                render: (d) => <span style={{ fontWeight: 600 }}>{d.name}</span>
              },
              {
                key: 'phone',
                header: 'Contact Line',
                render: (d) =>
                  d.phone ? (
                    <a
                      href={`tel:${d.phone}`}
                      style={{ color: 'var(--accent-primary)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <Phone size={12} />
                      <span>{d.phone}</span>
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>—</span>
                  )
              },
              {
                key: 'assigned_vehicle_number',
                header: 'Assigned Vehicle',
                render: (d) => d.assigned_vehicle_number || <span style={{ color: 'var(--text-muted)' }}>None</span>
              },
              {
                key: 'status',
                header: 'Status',
                sortable: true,
                render: (d) => <StatusBadge status={d.status} />
              },
              {
                key: 'verification',
                header: 'DL & Verification',
                render: (d) => (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexWrap: 'wrap' }}>
                    <span className="verification-chip" style={{ fontSize: '0.72rem' }}>
                      {d.license_category || 'Commercial HMV'}
                    </span>
                    <span className="verification-chip" style={{ background: 'rgba(37,211,102,0.12)', color: 'var(--accent-whatsapp)', borderColor: 'rgba(37,211,102,0.3)', fontSize: '0.72rem' }}>
                      ✓ Verified
                    </span>
                  </div>
                )
              },
              {
                key: 'total_trips',
                header: 'Completed Deliveries',
                sortable: true,
                render: (d) => d.total_trips || 0
              },
              {
                key: 'actions',
                header: 'Manager Actions',
                align: 'right',
                render: (d) => (
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDossierDriver(d);
                      }}
                      style={{
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--accent-whatsapp)',
                        borderColor: 'rgba(37, 211, 102, 0.4)'
                      }}
                      title="View Official Driver Profile Dossier, DL & Verification"
                    >
                      <Eye size={12} />
                      <span>Full Dossier</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDriver(d);
                      }}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Edit Driver Details"
                    >
                      <Edit3 size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDriver(d);
                      }}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--status-danger)', borderColor: 'var(--status-danger-border)' }}
                      title="Decommission Driver"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              }
            ]}
            data={filteredDrivers}
            keyExtractor={(d) => d.id}
            loading={fleetLoading}
            emptyTitle="No drivers found"
            emptyDescription="No drivers match your search query."
          />
        </div>
      )}

      {/* ========================================================
          5. SAVED DESTINATIONS & GEOFENCES
          ======================================================== */}
      {activeSection === 'destinations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Fleet' }, { label: 'Saved Destinations' }]}
            title="Saved Warehouses & Customer Sites"
            subtitle="Automated geofencing parameters, GPS coordinates, and on-site contact persons for route stops."
            lastUpdated={lastRefresh}
            onRefresh={handleManualRefresh}
            refreshing={refreshing}
            actions={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setIsDestinationModalOpen(true)}
                style={{
                  backgroundColor: 'var(--accent-whatsapp)',
                  borderColor: 'var(--accent-whatsapp)',
                  color: '#0b141a',
                  fontWeight: 600
                }}
              >
                <Plus size={14} />
                <span>Add Destination (Map Pin)</span>
              </button>
            }
          />

          <div
            style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'center',
              backgroundColor: 'var(--bg-surface)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <Search size={15} color="var(--text-muted)" />
            <input
              type="text"
              className="form-input"
              style={{ padding: '6px 10px', fontSize: '0.85rem' }}
              placeholder="Search destination site, address, or contact person..."
              value={destinationSearch}
              onChange={(e) => setDestinationSearch(e.target.value)}
            />
          </div>

          <EnterpriseTable
            columns={[
              {
                key: 'name',
                header: 'Destination Site',
                sortable: true,
                render: (dest) => <span style={{ fontWeight: 600 }}>{dest.name}</span>
              },
              {
                key: 'address',
                header: 'Physical Address',
                render: (dest) => <span style={{ color: 'var(--text-secondary)' }}>{dest.address}</span>
              },
              {
                key: 'coordinates',
                header: 'GPS Telematics',
                render: (dest) => (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${dest.latitude},${dest.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: '0.78rem',
                      color: 'var(--accent-primary)',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <Compass size={11} />
                    <span>{dest.latitude.toFixed(4)}, {dest.longitude.toFixed(4)}</span>
                    <ExternalLink size={10} />
                  </a>
                )
              },
              {
                key: 'geofence_radius_meters',
                header: 'Geofence Radius',
                render: (dest) => <span>{dest.geofence_radius_meters}m</span>
              },
              {
                key: 'contact_name',
                header: 'Contact Person',
                render: (dest) => (
                  <div>
                    <div>{dest.contact_name || '—'}</div>
                    {dest.contact_number && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>{dest.contact_number}</div>
                    )}
                  </div>
                )
              },
              {
                key: 'actions',
                header: 'Manager Actions',
                align: 'right',
                render: (dest) => (
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingDestination(dest);
                      }}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      title="Edit Destination Site & Geofence"
                    >
                      <Edit3 size={12} />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteDestination(dest);
                      }}
                      style={{ padding: '4px 8px', fontSize: '0.75rem', color: 'var(--status-danger)', borderColor: 'var(--status-danger-border)' }}
                      title="Deactivate Destination"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              }
            ]}
            data={filteredDestinations}
            keyExtractor={(dest) => dest.id}
            loading={fleetLoading}
            emptyTitle="No destinations found"
            emptyDescription="No destinations found matching your search term."
          />
        </div>
      )}

      {/* ========================================================
          6. OPERATIONAL REPORTS & CSV EXPORT
          ======================================================== */}
      {activeSection === 'reports' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Intelligence' }, { label: 'Operational Reports' }]}
            title="Daily Logistics Performance Reports"
            subtitle={`Consolidated operational analysis, SLA on-time metrics, and delay root cause distribution for ${selectedDate}.`}
            lastUpdated={lastRefresh}
            onRefresh={handleManualRefresh}
            refreshing={refreshing}
            actions={
              <a
                href={`${API_BASE}/reports/export?date=${selectedDate}`}
                className="btn btn-primary btn-sm"
                download
              >
                <Download size={14} />
                <span>Export Operational CSV</span>
              </a>
            }
          />

          {/* Date Picker Filter */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              backgroundColor: 'var(--bg-surface)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
              Select Operational Date:
            </span>
            <input
              type="date"
              className="form-input"
              style={{ width: 'auto', padding: '6px 10px', fontSize: '0.84rem' }}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>

          {reportsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <KpiCard label="On-Time Arrival Rate" value="—" loading />
              <KpiCard label="Total Destinations Visited" value="—" loading />
              <KpiCard label="Total Delay Duration" value="—" loading />
            </div>
          ) : dailyReport && dailyReport.overview ? (
            <>
              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
                <KpiCard
                  label="On-Time Arrival Rate"
                  value={`${dailyReport.overview.onTimePercentage ?? 0}%`}
                  subValue="SLA Geofence Verification"
                  variant="success"
                />
                <KpiCard
                  label="Total Destinations Visited"
                  value={dailyReport.overview.totalDestinations ?? 0}
                  subValue="Customer stops executed"
                />
                <KpiCard
                  label="Total Delay Duration"
                  value={dailyReport.overview.totalDelayFormatted ?? '0m'}
                  subValue="Road bottlenecks & loading delays"
                  variant="warning"
                />
              </div>

              {/* Delay Root Causes */}
              {dailyReport.delayReasons?.length > 0 && (
                <div className="card">
                  <h4 style={{ fontSize: '0.96rem', marginBottom: '14px', fontWeight: 600 }}>
                    Operational Delay Root Causes
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
                    {dailyReport.delayReasons.map((dr: any) => (
                      <div
                        key={dr.reason}
                        style={{
                          padding: '12px 14px',
                          backgroundColor: 'var(--bg-secondary)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)'
                        }}
                      >
                        <div style={{ fontWeight: 600, fontSize: '0.88rem' }}>{dr.reason}</div>
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                          {dr.count} incident(s) &bull; {dr.total_minutes} mins total duration
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState
              title="No Report Data Available"
              description={`No delivery records or dispatch metrics found for ${selectedDate}. Select another operational date or dispatch new deliveries.`}
            />
          )}
        </div>
      )}

      {/* ========================================================
          7. GOOGLE SHEETS OPERATIONAL SYNC
          ======================================================== */}
      {activeSection === 'sheets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Intelligence' }, { label: 'Google Sheets Live Sync' }]}
            title="Google Sheets Operational Synchronization"
            subtitle="Automated bi-directional synchronization linking SQLite primary database to 8 operational spreadsheet tabs."
            lastUpdated={lastRefresh}
            onRefresh={handleManualRefresh}
            refreshing={refreshing}
            actions={
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={async () => {
                    setSyncing(true);
                    await api.googleSheets.retry();
                    await loadSheetsStatus();
                    setSyncing(false);
                  }}
                  disabled={syncing}
                >
                  <RefreshCw size={13} className={syncing ? 'animate-spin' : ''} />
                  <span>Retry Failed Items</span>
                </button>

                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={async () => {
                    setSyncing(true);
                    await api.googleSheets.syncAll();
                    await loadSheetsStatus();
                    setSyncing(false);
                  }}
                  disabled={syncing}
                >
                  <CheckCircle size={13} />
                  <span>Sync All Records</span>
                </button>
              </div>
            }
          />

          {sheetsStatus && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <KpiCard
                label="Sync Engine Mode"
                value={sheetsStatus.syncMode || 'ACTIVE'}
                subValue="Automated append & update"
                variant="info"
              />
              <KpiCard
                label="Synchronized Records"
                value={sheetsStatus.counts?.SYNCED || 0}
                subValue="Rows matched to Google Sheets"
                variant="success"
              />
              <KpiCard
                label="Failed Queue"
                value={sheetsStatus.counts?.FAILED || 0}
                subValue="Awaiting retry or verification"
                variant={sheetsStatus.counts?.FAILED > 0 ? 'danger' : 'default'}
              />
              <KpiCard
                label="Active Spreadsheets"
                value="8 Tabs"
                subValue={sheetsStatus.spreadsheetId || 'Corporate Master Sheet'}
              />
            </div>
          )}

          {/* 8 Operational Tabs Documentation Grid */}
          <div className="card">
            <h4 style={{ fontSize: '0.96rem', marginBottom: '14px', fontWeight: 600 }}>
              Synchronized Google Sheets Tabs (8)
            </h4>
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
                <div
                  key={s.name}
                  style={{
                    padding: '14px',
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)'
                  }}
                >
                  <div style={{ fontWeight: 600, color: 'var(--accent-primary)', fontSize: '0.92rem' }}>
                    📄 {s.name}
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', lineHeight: 1.4 }}>
                    {s.fields}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Trip Creator Modal */}
      {isCreateModalOpen && (
        <TripCreatorModal
          onSuccess={() => {
            loadDashboardData();
            setIsCreateModalOpen(false);
          }}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {/* Vehicle Modal */}
      {/* Vehicle Modal (Create or Edit) */}
      {(isVehicleModalOpen || editingVehicle) && (
        <VehicleModal
          drivers={drivers}
          initialVehicle={editingVehicle || undefined}
          onSuccess={(savedV) => {
            setVehicles((prev) => {
              const exists = prev.some((v) => v.id === savedV.id);
              return exists ? prev.map((v) => (v.id === savedV.id ? savedV : v)) : [savedV, ...prev];
            });
            setIsVehicleModalOpen(false);
            setEditingVehicle(null);
          }}
          onClose={() => {
            setIsVehicleModalOpen(false);
            setEditingVehicle(null);
          }}
        />
      )}

      {/* Driver Modal (Create or Edit) */}
      {(isDriverModalOpen || editingDriver) && (
        <DriverModal
          vehicles={vehicles}
          initialDriver={editingDriver || undefined}
          onSuccess={(savedD) => {
            setDrivers((prev) => {
              const exists = prev.some((d) => d.id === savedD.id);
              return exists ? prev.map((d) => (d.id === savedD.id ? savedD : d)) : [savedD, ...prev];
            });
            setIsDriverModalOpen(false);
            setEditingDriver(null);
          }}
          onClose={() => {
            setIsDriverModalOpen(false);
            setEditingDriver(null);
          }}
        />
      )}

      {/* Destination Modal with Map Pin Picker (Create or Edit) */}
      {(isDestinationModalOpen || editingDestination) && (
        <DestinationModal
          initialDestination={editingDestination || undefined}
          onSuccess={(savedDest) => {
            setDestinations((prev) => {
              const exists = prev.some((d) => d.id === savedDest.id);
              return exists ? prev.map((d) => (d.id === savedDest.id ? savedDest : d)) : [savedDest, ...prev];
            });
            setIsDestinationModalOpen(false);
            setEditingDestination(null);
          }}
          onClose={() => {
            setIsDestinationModalOpen(false);
            setEditingDestination(null);
          }}
        />
      )}

      {/* Vehicle Compliance Papers & Traffic Challans Modal */}
      {papersVehicle && (
        <VehiclePapersModal
          vehicle={papersVehicle}
          onClose={() => setPapersVehicle(null)}
          onUpdate={(updatedVehicle: Vehicle) => {
            setVehicles((prev) => prev.map((v) => (v.id === updatedVehicle.id ? updatedVehicle : v)));
            setPapersVehicle(updatedVehicle);
          }}
        />
      )}

      {/* Driver Official Profile Dossier & Verification Modal */}
      {dossierDriver && (
        <DriverDossierModal
          driver={dossierDriver}
          onClose={() => setDossierDriver(null)}
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
    </AppLayout>
  );
};
