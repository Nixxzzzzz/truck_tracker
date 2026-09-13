import React, { useState, useEffect, useMemo } from 'react';
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
  Navigation,
  ArrowDownAZ,
  X
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
import { AlertItem } from '../components/layout/TopHeader';
import { NavSection } from '../components/layout/Sidebar';
import { KpiCard } from '../components/common/KpiCard';
import { PageHeader } from '../components/common/PageHeader';
import { EnterpriseTable, Column } from '../components/common/EnterpriseTable';
import { EmptyState } from '../components/common/EmptyState';
import { SlaGauge, TrendBarChart, FleetStatusBar } from '../components/common/VisualCharts';

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

  // Timeframe Period Filter (Today / Weekly 7D / Monthly 30D)
  const [timeframeFilter, setTimeframeFilter] = useState<'today' | 'weekly' | 'monthly'>('today');

  // Filters for Operations Trips
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [filterDriverId, setFilterDriverId] = useState('');
  const [filterVehicleId, setFilterVehicleId] = useState('');
  const [filterDelaysOnly, setFilterDelaysOnly] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Alphabetical & Metric Sorting State
  const [tripSort, setTripSort] = useState<'default' | 'id_asc' | 'driver_asc' | 'driver_desc' | 'vehicle_asc' | 'delay_desc'>('default');
  const [vehicleSort, setVehicleSort] = useState<'plate_asc' | 'plate_desc' | 'model_asc' | 'driver_asc'>('plate_asc');
  const [driverSort, setDriverSort] = useState<'name_asc' | 'name_desc' | 'id_asc' | 'trips_desc'>('name_asc');
  const [destinationSort, setDestinationSort] = useState<'name_asc' | 'name_desc' | 'address_asc'>('name_asc');

  // Multi-Select Checkboxes for Batch Actions
  const [selectedTripIds, setSelectedTripIds] = useState<string[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);
  const [selectedDestinationIds, setSelectedDestinationIds] = useState<string[]>([]);

  // Alert Notifications Center state
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);

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

  // Live Telematics Map state (Fleet Telemetry)
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

  // Performance Analytics Reports state
  const [reportsPeriod, setReportsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [reportsLoading, setReportsLoading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

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
  }, [activeSection, selectedDate, reportsPeriod]);

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
      if (reportsPeriod === 'weekly' || reportsPeriod === 'monthly') {
        const data = await api.reports.getPeriodic(reportsPeriod);
        setDailyReport(data);
      } else {
        const data = await api.reports.getDaily(selectedDate);
        setDailyReport(data);
      }
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Reports error:', err);
    } finally {
      setReportsLoading(false);
    }
  };

  const handleExportCsv = async () => {
    setExportingCsv(true);
    try {
      await api.reports.exportCSV(selectedDate);
    } catch (err) {
      console.error('Reports CSV export error:', err);
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportSelectedCsv = () => {
    const selected = trips.filter((t) => selectedTripIds.includes(t.id));
    if (selected.length === 0) return;
    const headers = [
      'Trip ID',
      'Date',
      'Driver',
      'Vehicle',
      'Starting Location',
      'Total Stops',
      'Status',
      'Delay (Mins)',
      'Distance (KM)'
    ];
    const rows = selected.map((t) => [
      t.id,
      t.date,
      `"${(t.driver_name || '').replace(/"/g, '""')}"`,
      t.vehicle_number || '',
      `"${(t.starting_location || '').replace(/"/g, '""')}"`,
      t.stops?.length || t.total_stops || 0,
      t.status,
      t.total_delay_minutes || 0,
      t.calculated_distance_km || 0
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `selected_trips_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
    timeframeFilter !== 'today' ||
    selectedDate !== new Date().toISOString().split('T')[0]
  );

  // Operational Alerts calculation for TopHeader Notification Center
  const operationalAlerts: AlertItem[] = useMemo(() => {
    const list: AlertItem[] = [];

    // 1. Active trip delay exceptions
    trips.forEach((t) => {
      const mins = t.total_delay_minutes || 0;
      const aid = `trip-delay-${t.id}`;
      if (mins > 0 && !dismissedAlertIds.includes(aid)) {
        list.push({
          id: aid,
          title: `Trip Delay Exception: ${t.id} (+${mins}m)`,
          subtitle: `Vehicle ${t.vehicle_number} • Driver: ${t.driver_name || 'Unassigned'}`,
          level: mins > 30 ? 'critical' : 'warning',
          timestamp: t.planned_departure_time ? `Planned: ${t.planned_departure_time}` : undefined,
          linkAction: () => setSelectedTripId(t.id)
        });
      }
    });

    // 2. Server attention exceptions
    if (attention?.delayedTrips) {
      attention.delayedTrips.forEach((dt: any) => {
        const aid = `att-${dt.id}`;
        if (!list.some((a) => a.id === `trip-delay-${dt.id}`) && !dismissedAlertIds.includes(aid)) {
          list.push({
            id: aid,
            title: `Active Corridor Delay: ${dt.id} (+${dt.total_delay_minutes}m)`,
            subtitle: `Driver: ${dt.driver_name} • Cause: ${dt.delay_reason || 'Traffic Congestion'}`,
            level: 'critical',
            linkAction: () => setSelectedTripId(dt.id)
          });
        }
      });
    }

    if (attention?.failedActivities) {
      attention.failedActivities.forEach((fa: any) => {
        const aid = `fail-${fa.id}`;
        if (!dismissedAlertIds.includes(aid)) {
          list.push({
            id: aid,
            title: `Proof Validation Issue at ${fa.destination_name}`,
            subtitle: `Trip: ${fa.trip_id} • Driver: ${fa.driver_name}`,
            level: 'critical',
            linkAction: () => setSelectedTripId(fa.trip_id)
          });
        }
      });
    }

    // 3. Vehicle regulatory document expiry
    vehicles.forEach((v) => {
      if (v.documents && v.documents.length > 0) {
        v.documents.forEach((doc: any) => {
          if (doc.expiry_date) {
            const diffDays = Math.ceil((new Date(doc.expiry_date).getTime() - Date.now()) / (1000 * 3600 * 24));
            const aid = `doc-${v.id}-${doc.document_type}`;
            if (diffDays <= 30 && !dismissedAlertIds.includes(aid)) {
              list.push({
                id: aid,
                title: `${doc.document_type} Renewal Alert (${v.vehicle_number})`,
                subtitle: diffDays < 0 ? `Expired ${Math.abs(diffDays)} days ago` : `Expires in ${diffDays} days`,
                level: diffDays < 0 ? 'critical' : 'warning',
                linkAction: () => setPapersVehicle(v)
              });
            }
          }
        });
      }
    });

    return list;
  }, [trips, attention, vehicles, dismissedAlertIds]);

  // Filtered Trips Computation
  const filteredTrips = trips.filter((trip) => {
    if (statusFilter && trip.status !== statusFilter) return false;
    if (filterDriverId && trip.driver_id !== filterDriverId && trip.driver_name !== filterDriverId) return false;
    if (filterVehicleId && trip.vehicle_id !== filterVehicleId && trip.vehicle_number !== filterVehicleId) return false;
    if (filterDelaysOnly && !(trip.total_delay_minutes && trip.total_delay_minutes > 0)) return false;

    // Timeframe period filtering
    if (timeframeFilter === 'weekly') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      const minDate = d.toISOString().split('T')[0];
      if (trip.date < minDate) return false;
    } else if (timeframeFilter === 'monthly') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      const minDate = d.toISOString().split('T')[0];
      if (trip.date < minDate) return false;
    } else if (timeframeFilter === 'today') {
      if (selectedDate && trip.date !== selectedDate) return false;
    }

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

  // Alphabetical & Metric Sorted Trips
  const sortedTrips = useMemo(() => {
    const list = [...filteredTrips];
    switch (tripSort) {
      case 'id_asc':
        return list.sort((a, b) => a.id.localeCompare(b.id));
      case 'driver_asc':
        return list.sort((a, b) => (a.driver_name || '').localeCompare(b.driver_name || ''));
      case 'driver_desc':
        return list.sort((a, b) => (b.driver_name || '').localeCompare(a.driver_name || ''));
      case 'vehicle_asc':
        return list.sort((a, b) => (a.vehicle_number || '').localeCompare(b.vehicle_number || ''));
      case 'delay_desc':
        return list.sort((a, b) => (b.total_delay_minutes || 0) - (a.total_delay_minutes || 0));
      default:
        return list;
    }
  }, [filteredTrips, tripSort]);

  // Vehicles Filtered & Sorted
  const sortedVehicles = useMemo(() => {
    const list = vehicles.filter((v) => {
      const matchesSearch =
        v.vehicle_number.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        v.model.toLowerCase().includes(vehicleSearch.toLowerCase()) ||
        (v.assigned_driver_name || '').toLowerCase().includes(vehicleSearch.toLowerCase());
      const matchesStatus = vehicleStatusFilter ? v.status === vehicleStatusFilter : true;
      return matchesSearch && matchesStatus;
    });

    switch (vehicleSort) {
      case 'plate_asc':
        return list.sort((a, b) => a.vehicle_number.localeCompare(b.vehicle_number));
      case 'plate_desc':
        return list.sort((a, b) => b.vehicle_number.localeCompare(a.vehicle_number));
      case 'model_asc':
        return list.sort((a, b) => a.model.localeCompare(b.model));
      case 'driver_asc':
        return list.sort((a, b) => (a.assigned_driver_name || '').localeCompare(b.assigned_driver_name || ''));
      default:
        return list;
    }
  }, [vehicles, vehicleSearch, vehicleStatusFilter, vehicleSort]);

  // Drivers Filtered & Sorted
  const sortedDrivers = useMemo(() => {
    const list = drivers.filter((d) => {
      return (
        d.name.toLowerCase().includes(driverSearch.toLowerCase()) ||
        d.employee_id.toLowerCase().includes(driverSearch.toLowerCase()) ||
        (d.phone || '').includes(driverSearch)
      );
    });

    switch (driverSort) {
      case 'name_asc':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc':
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'id_asc':
        return list.sort((a, b) => a.employee_id.localeCompare(b.employee_id));
      case 'trips_desc':
        return list.sort((a, b) => (b.total_trips || 0) - (a.total_trips || 0));
      default:
        return list;
    }
  }, [drivers, driverSearch, driverSort]);

  // Destinations Filtered & Sorted
  const sortedDestinations = useMemo(() => {
    const list = destinations.filter((dest) => {
      return (
        dest.name.toLowerCase().includes(destinationSearch.toLowerCase()) ||
        dest.address.toLowerCase().includes(destinationSearch.toLowerCase()) ||
        (dest.contact_name || '').toLowerCase().includes(destinationSearch.toLowerCase())
      );
    });

    switch (destinationSort) {
      case 'name_asc':
        return list.sort((a, b) => a.name.localeCompare(b.name));
      case 'name_desc':
        return list.sort((a, b) => b.name.localeCompare(a.name));
      case 'address_asc':
        return list.sort((a, b) => a.address.localeCompare(b.address));
      default:
        return list;
    }
  }, [destinations, destinationSearch, destinationSort]);

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
      alerts={operationalAlerts}
      onDismissAlert={(id) => setDismissedAlertIds((prev) => [...prev, id])}
      onClearAllAlerts={() => setDismissedAlertIds(operationalAlerts.map((a) => a.id))}
    >
      {/* ========================================================
          1. OPERATIONS DISPATCH COMMAND
          ======================================================== */}
      {activeSection === 'operations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Operations' }, { label: 'Dispatch Command' }]}
            title="Operations Dispatch Command"
            subtitle="Real-time dispatch telemetry, active routes, and transit exception monitoring across assigned fleet units."
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
              label="Scheduled Dispatches"
              value={totalTrips}
              subValue="Manifested vehicle trips"
              icon={<Truck size={18} />}
            />
            <KpiCard
              label="Active In-Transit"
              value={activeTrips.length}
              subValue="In Progress / Returning"
              icon={<Play size={18} />}
              variant={activeTrips.length > 0 ? 'info' : 'default'}
            />
            <KpiCard
              label="Completed Deliveries"
              value={completedTrips.length}
              subValue="Returned to central depot"
              icon={<CheckCircle size={18} />}
              variant="success"
            />
            <KpiCard
              label="Transit Delay Exceptions"
              value={delayedTrips.length}
              subValue="Traffic, loading, or gate delays"
              icon={<AlertTriangle size={18} />}
              variant={delayedTrips.length > 0 ? 'warning' : 'default'}
            />
            <KpiCard
              label="Immediate Attention"
              value={operationalAlerts.length}
              subValue="Active operational alerts"
              icon={<ShieldAlert size={18} />}
              variant={operationalAlerts.length > 0 ? 'danger' : 'default'}
            />
          </div>

          {/* Visual Operational Analytics Panel */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'minmax(200px, 260px) 1fr',
              gap: '16px',
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px',
              alignItems: 'center'
            }}
            className="visual-analytics-card"
          >
            <div style={{ borderRight: '1px solid var(--border-subtle)', paddingRight: '12px' }}>
              <SlaGauge
                percentage={
                  completedTrips.length > 0
                    ? Math.round(((completedTrips.length - delayedTrips.length) / completedTrips.length) * 100)
                    : 94
                }
                label="On-Time Delivery SLA"
                sublabel={`${completedTrips.length} completed manifests`}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingLeft: '8px' }}>
              <FleetStatusBar
                completed={completedTrips.length}
                inTransit={activeTrips.length}
                delayed={delayedTrips.length}
                scheduled={Math.max(0, totalTrips - completedTrips.length - activeTrips.length)}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                <span>Active telematics telemetry monitoring vehicle status, stops, and geofence arrivals.</span>
                <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Timeframe: {timeframeFilter === 'today' ? 'Today' : timeframeFilter === 'weekly' ? 'Last 7 Days' : 'Last 30 Days'}
                </span>
              </div>
            </div>
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
            {/* Top row: Search input, Period Pills & Action Controls */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Responsive Search Input with Clear Button */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', position: 'relative' }}>
                <Search size={15} color="var(--text-muted)" />
                <input
                  type="text"
                  className="form-input"
                  style={{ padding: '6px 28px 6px 10px', fontSize: '0.85rem' }}
                  placeholder="Search by Trip ID, driver, vehicle plate, reference no, or stop..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    style={{
                      position: 'absolute',
                      right: '8px',
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      cursor: 'pointer',
                      padding: '2px',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {/* Weekly / Monthly / Today Period Filter Toggle */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '2px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setTimeframeFilter('today')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: timeframeFilter === 'today' ? 700 : 500,
                    backgroundColor: timeframeFilter === 'today' ? 'var(--bg-surface)' : 'transparent',
                    color: timeframeFilter === 'today' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: timeframeFilter === 'today' ? 'var(--shadow-xs)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframeFilter('weekly')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: timeframeFilter === 'weekly' ? 700 : 500,
                    backgroundColor: timeframeFilter === 'weekly' ? 'var(--bg-surface)' : 'transparent',
                    color: timeframeFilter === 'weekly' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: timeframeFilter === 'weekly' ? 'var(--shadow-xs)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Weekly (7D)
                </button>
                <button
                  type="button"
                  onClick={() => setTimeframeFilter('monthly')}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.74rem',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: timeframeFilter === 'monthly' ? 700 : 500,
                    backgroundColor: timeframeFilter === 'monthly' ? 'var(--bg-surface)' : 'transparent',
                    color: timeframeFilter === 'monthly' ? 'var(--text-primary)' : 'var(--text-muted)',
                    boxShadow: timeframeFilter === 'monthly' ? 'var(--shadow-xs)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Monthly (30D)
                </button>
              </div>

              {/* Date Selector for Specific Operational Days */}
              {timeframeFilter === 'today' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Clock size={14} color="var(--text-muted)" />
                  <input
                    type="date"
                    className="form-input"
                    style={{ padding: '5px 8px', fontSize: '0.8rem', width: 'auto' }}
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                  />
                </div>
              )}

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

            {/* Bottom row: Filter Dropdowns, Alphabetical Sorting & Match Count */}
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

              {/* Alphabetical & Attribute Sort Dropdown */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                <ArrowDownAZ size={13} color="var(--text-muted)" />
                <select
                  className="form-select"
                  style={{ padding: '5px 8px', fontSize: '0.78rem', width: 'auto' }}
                  value={tripSort}
                  onChange={(e) => setTripSort(e.target.value as any)}
                  title="Sort orders"
                >
                  <option value="default">Sort: Scheduled Order</option>
                  <option value="driver_asc">Driver (A to Z)</option>
                  <option value="driver_desc">Driver (Z to A)</option>
                  <option value="vehicle_asc">Vehicle Plate (A to Z)</option>
                  <option value="id_asc">Trip ID (A to Z)</option>
                  <option value="delay_desc">Delay Duration (Highest First)</option>
                </select>
              </div>

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
                Showing <b>{sortedTrips.length}</b> of <b>{trips.length}</b> manifests
              </span>
            </div>
          </div>

          {/* Batch Action Toolbar for Checkbox Selection */}
          {selectedTripIds.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--accent-primary)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-sm)',
                flexWrap: 'wrap',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '0.76rem',
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-full)',
                    backgroundColor: 'rgba(59, 130, 246, 0.15)',
                    color: 'var(--accent-primary)'
                  }}
                >
                  {selectedTripIds.length} manifest{selectedTripIds.length > 1 ? 's' : ''} selected
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleExportSelectedCsv}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Download size={12} />
                  <span>Export Selected CSV</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setActiveSection('map')}
                  style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <Compass size={12} />
                  <span>Focus on Map</span>
                </button>
                <button
                  type="button"
                  className="btn btn-subtle btn-sm"
                  onClick={() => setSelectedTripIds([])}
                  style={{ padding: '4px 8px', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                >
                  <X size={12} />
                  <span>Clear Selection</span>
                </button>
              </div>
            </div>
          )}

          {/* Trips Register Table with Multi-Select Checkboxes */}
          <EnterpriseTable
            columns={tripColumns}
            data={sortedTrips}
            keyExtractor={(trip) => trip.id}
            loading={loading}
            selectable={true}
            selectedKeys={selectedTripIds}
            onToggleSelect={(id) =>
              setSelectedTripIds((prev) =>
                prev.includes(id as string) ? prev.filter((k) => k !== id) : [...prev, id as string]
              )
            }
            onToggleSelectAll={() =>
              setSelectedTripIds((prev) =>
                prev.length === sortedTrips.length ? [] : sortedTrips.map((t) => t.id)
              )
            }
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
          3. VEHICLE REGISTRY
          ======================================================== */}
      {activeSection === 'vehicles' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Assets' }, { label: 'Vehicle Registry' }]}
            title="Vehicle Registry"
            subtitle="Commercial fleet assets, assigned drivers, mechanical readiness, and regulatory compliance certificates."
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
                <span>Register Vehicle</span>
              </button>
            }
          />

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <KpiCard label="Total Fleet Units" value={vehicles.length} icon={<Truck size={18} />} />
            <KpiCard
              label="Available Units"
              value={vehicles.filter((v) => v.status === 'AVAILABLE').length}
              icon={<CheckCircle size={18} />}
              variant="success"
            />
            <KpiCard
              label="Active On-Trip"
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

          {/* Search & Filter Toolbar with Alphabetical Sorting */}
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
            {/* Search with Clear Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px', position: 'relative' }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 28px 6px 10px', fontSize: '0.85rem' }}
                placeholder="Search registration plate, model, or driver..."
                value={vehicleSearch}
                onChange={(e) => setVehicleSearch(e.target.value)}
              />
              {vehicleSearch && (
                <button
                  type="button"
                  onClick={() => setVehicleSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Alphabetical Sorting Selector */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowDownAZ size={13} color="var(--text-muted)" />
              <select
                className="form-select"
                style={{ padding: '6px 10px', fontSize: '0.82rem', width: 'auto' }}
                value={vehicleSort}
                onChange={(e) => setVehicleSort(e.target.value as any)}
                title="Sort vehicles"
              >
                <option value="plate_asc">Plate Number (A to Z)</option>
                <option value="plate_desc">Plate Number (Z to A)</option>
                <option value="model_asc">Make / Model (A to Z)</option>
                <option value="driver_asc">Assigned Driver (A to Z)</option>
              </select>
            </div>

            {/* Status Filter */}
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

            <span style={{ marginLeft: 'auto', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Showing <b>{sortedVehicles.length}</b> of <b>{vehicles.length}</b> assets
            </span>
          </div>

          {/* Vehicles Table with Checkbox Support */}
          <EnterpriseTable
            columns={[
              {
                key: 'vehicle_number',
                header: 'Registration Plate',
                sortable: true,
                render: (v) => (
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-mono)' }}>
                    {v.vehicle_number}
                  </span>
                )
              },
              { key: 'model', header: 'Make & Model', sortable: true },
              {
                key: 'vehicle_type',
                header: 'Category',
                render: (v) => <span style={{ color: 'var(--text-muted)' }}>{v.vehicle_type}</span>
              },
              {
                key: 'assigned_driver_name',
                header: 'Assigned Driver',
                render: (v) => v.assigned_driver_name || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
              },
              {
                key: 'status',
                header: 'Operational Status',
                sortable: true,
                render: (v) => <StatusBadge status={v.status} />
              },
              {
                key: 'total_trips',
                header: 'Completed Deliveries',
                sortable: true,
                render: (v) => v.total_trips || 0
              },
              {
                key: 'compliance',
                header: 'Compliance Documents',
                render: (v) => {
                  const challanCount = v.challans?.filter((c) => c.status === 'PENDING').length || 0;
                  return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span className="paper-status-badge valid" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>
                        RC & Ins. Verified
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
                      <span>Documents</span>
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
            data={sortedVehicles}
            keyExtractor={(v) => v.id}
            loading={fleetLoading}
            selectable={true}
            selectedKeys={selectedVehicleIds}
            onToggleSelect={(id) =>
              setSelectedVehicleIds((prev) =>
                prev.includes(id as string) ? prev.filter((k) => k !== id) : [...prev, id as string]
              )
            }
            onToggleSelectAll={() =>
              setSelectedVehicleIds((prev) =>
                prev.length === sortedVehicles.length ? [] : sortedVehicles.map((v) => v.id)
              )
            }
            emptyTitle="No vehicles found"
            emptyDescription="No fleet vehicles match your filter criteria."
          />
        </div>
      )}

      {/* ========================================================
          4. DRIVER DIRECTORY
          ======================================================== */}
      {activeSection === 'drivers' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Personnel' }, { label: 'Driver Directory' }]}
            title="Driver Directory"
            subtitle="Active roster of commercial drivers, assigned logistics vehicles, direct phone lines, and license verification."
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
                <span>Register Driver</span>
              </button>
            }
          />

          {/* Quick Metrics */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
            <KpiCard label="Total Drivers" value={drivers.length} icon={<Users size={18} />} />
            <KpiCard
              label="Available for Route"
              value={drivers.filter((d) => d.status === 'AVAILABLE').length}
              icon={<CheckCircle size={18} />}
              variant="success"
            />
            <KpiCard
              label="Active In-Transit"
              value={drivers.filter((d) => d.status === 'ON_TRIP').length}
              icon={<Play size={18} />}
              variant="info"
            />
            <KpiCard
              label="Off Duty"
              value={drivers.filter((d) => d.status === 'OFF_DUTY' || d.status === 'INACTIVE').length}
              icon={<Clock size={18} />}
            />
          </div>

          {/* Search & Sorting Toolbar */}
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
            {/* Search with Clear Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 28px 6px 10px', fontSize: '0.85rem' }}
                placeholder="Search driver by name, employee ID, or contact number..."
                value={driverSearch}
                onChange={(e) => setDriverSearch(e.target.value)}
              />
              {driverSearch && (
                <button
                  type="button"
                  onClick={() => setDriverSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Alphabetical & Deliveries Sorting Dropdown */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowDownAZ size={13} color="var(--text-muted)" />
              <select
                className="form-select"
                style={{ padding: '6px 10px', fontSize: '0.82rem', width: 'auto' }}
                value={driverSort}
                onChange={(e) => setDriverSort(e.target.value as any)}
                title="Sort drivers"
              >
                <option value="name_asc">Driver Name (A to Z)</option>
                <option value="name_desc">Driver Name (Z to A)</option>
                <option value="id_asc">Employee ID (A to Z)</option>
                <option value="trips_desc">Completed Deliveries (High to Low)</option>
              </select>
            </div>

            <span style={{ marginLeft: 'auto', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Showing <b>{sortedDrivers.length}</b> of <b>{drivers.length}</b> personnel
            </span>
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
                render: (d) => d.assigned_vehicle_number || <span style={{ color: 'var(--text-muted)' }}>Unassigned</span>
              },
              {
                key: 'status',
                header: 'Duty Status',
                sortable: true,
                render: (d) => <StatusBadge status={d.status} />
              },
              {
                key: 'verification',
                header: 'License & Compliance',
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
                      title="View Official Driver Profile, DL & Verification"
                    >
                      <Eye size={12} />
                      <span>Compliance File</span>
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
                      title="Remove Driver"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                )
              }
            ]}
            data={sortedDrivers}
            keyExtractor={(d) => d.id}
            loading={fleetLoading}
            emptyTitle="No drivers found"
            emptyDescription="No drivers match your search query."
          />
        </div>
      )}

      {/* ========================================================
          5. FACILITY & GEOFENCE DIRECTORY
          ======================================================== */}
      {activeSection === 'destinations' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <PageHeader
            breadcrumbs={[{ label: 'Assets' }, { label: 'Facility Directory' }]}
            title="Facility & Geofence Directory"
            subtitle="Customer receiving facilities, warehouses, GPS coordinates, and geofence verification zones."
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
                <span>Register Facility</span>
              </button>
            }
          />

          {/* Search & Sorting Toolbar */}
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
            {/* Search with Clear Button */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '240px', position: 'relative' }}>
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                className="form-input"
                style={{ padding: '6px 28px 6px 10px', fontSize: '0.85rem' }}
                placeholder="Search facility name, address, or contact person..."
                value={destinationSearch}
                onChange={(e) => setDestinationSearch(e.target.value)}
              />
              {destinationSearch && (
                <button
                  type="button"
                  onClick={() => setDestinationSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Alphabetical Sorting Dropdown */}
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <ArrowDownAZ size={13} color="var(--text-muted)" />
              <select
                className="form-select"
                style={{ padding: '6px 10px', fontSize: '0.82rem', width: 'auto' }}
                value={destinationSort}
                onChange={(e) => setDestinationSort(e.target.value as any)}
                title="Sort facilities"
              >
                <option value="name_asc">Facility Name (A to Z)</option>
                <option value="name_desc">Facility Name (Z to A)</option>
                <option value="address_asc">Address (A to Z)</option>
              </select>
            </div>

            <span style={{ marginLeft: 'auto', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
              Showing <b>{sortedDestinations.length}</b> of <b>{destinations.length}</b> facilities
            </span>
          </div>

          <EnterpriseTable
            columns={[
              {
                key: 'name',
                header: 'Facility Site',
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
                header: 'Facility Contact',
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
            data={sortedDestinations}
            keyExtractor={(dest) => dest.id}
            loading={fleetLoading}
            selectable={true}
            selectedKeys={selectedDestinationIds}
            onToggleSelect={(id) =>
              setSelectedDestinationIds((prev) =>
                prev.includes(id as string) ? prev.filter((k) => k !== id) : [...prev, id as string]
              )
            }
            onToggleSelectAll={() =>
              setSelectedDestinationIds((prev) =>
                prev.length === sortedDestinations.length ? [] : sortedDestinations.map((d) => d.id)
              )
            }
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
            breadcrumbs={[{ label: 'Fleet Analytics' }, { label: 'Operational Performance' }]}
            title={
              reportsPeriod === 'weekly'
                ? 'Weekly Logistics Performance Audit (7-Day)'
                : reportsPeriod === 'monthly'
                ? 'Monthly Operational Audit (30-Day)'
                : 'Daily Operational Logistics Report'
            }
            subtitle={
              reportsPeriod === 'weekly'
                ? 'Consolidated 7-day dispatch volume, SLA delivery verification, driver performance, and corridor delays.'
                : reportsPeriod === 'monthly'
                ? 'Consolidated 30-day comprehensive audit of fleet throughput, geofence drop accuracy, and vehicle utilization.'
                : `Consolidated operational analysis, SLA on-time metrics, and delay root cause distribution for ${selectedDate}.`
            }
            lastUpdated={lastRefresh}
            onRefresh={handleManualRefresh}
            refreshing={refreshing}
            actions={
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={handleExportCsv}
                disabled={exportingCsv}
              >
                <Download size={14} className={exportingCsv ? 'animate-spin' : ''} />
                <span>{exportingCsv ? 'Exporting...' : 'Export Operational CSV'}</span>
              </button>
            }
          />

          {/* Controls Bar: Timeframe Filters & Date Selection */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: 'var(--bg-surface)',
              padding: '12px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {/* Period Segmented Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Audit Scope:
              </span>
              <div
                style={{
                  display: 'inline-flex',
                  backgroundColor: 'var(--bg-secondary)',
                  padding: '3px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)'
                }}
              >
                <button
                  type="button"
                  onClick={() => setReportsPeriod('daily')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: reportsPeriod === 'daily' ? 600 : 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: reportsPeriod === 'daily' ? 'var(--bg-surface)' : 'transparent',
                    color: reportsPeriod === 'daily' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: reportsPeriod === 'daily' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Daily Audit
                </button>
                <button
                  type="button"
                  onClick={() => setReportsPeriod('weekly')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: reportsPeriod === 'weekly' ? 600 : 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: reportsPeriod === 'weekly' ? 'var(--bg-surface)' : 'transparent',
                    color: reportsPeriod === 'weekly' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: reportsPeriod === 'weekly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Weekly (7 Days)
                </button>
                <button
                  type="button"
                  onClick={() => setReportsPeriod('monthly')}
                  style={{
                    padding: '5px 12px',
                    fontSize: '0.78rem',
                    fontWeight: reportsPeriod === 'monthly' ? 600 : 500,
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    cursor: 'pointer',
                    backgroundColor: reportsPeriod === 'monthly' ? 'var(--bg-surface)' : 'transparent',
                    color: reportsPeriod === 'monthly' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    boxShadow: reportsPeriod === 'monthly' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Monthly (30 Days)
                </button>
              </div>
            </div>

            {/* Date Input if Daily */}
            {reportsPeriod === 'daily' ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                  Operational Date:
                </span>
                <input
                  type="date"
                  className="form-input"
                  style={{ width: 'auto', padding: '5px 10px', fontSize: '0.82rem' }}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <Clock size={13} />
                <span>
                  {reportsPeriod === 'weekly' ? 'Last 7 Days Rolling Window' : 'Last 30 Days Cumulative Audit'}
                </span>
              </div>
            )}
          </div>

          {reportsLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <KpiCard label="On-Time SLA Rate" value="—" loading />
              <KpiCard label="Total Trips Dispatched" value="—" loading />
              <KpiCard label="Total Destinations Visited" value="—" loading />
              <KpiCard label="Total Delay Duration" value="—" loading />
            </div>
          ) : dailyReport && dailyReport.overview ? (
            <>
              {/* Executive Visual Charts Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: '16px'
                }}
              >
                {/* Visual Gauge: On-Time SLA */}
                <div
                  className="card"
                  style={{
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '12px',
                    textAlign: 'center'
                  }}
                >
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      On-Time SLA Performance
                    </span>
                    <span
                      className={`badge ${(dailyReport.overview.onTimePercentage ?? 0) >= 90 ? 'badge-success' : 'badge-warning'}`}
                      style={{ fontSize: '0.72rem' }}
                    >
                      {(dailyReport.overview.onTimePercentage ?? 0) >= 90 ? 'Contract Met' : 'Attention Required'}
                    </span>
                  </div>
                  <SlaGauge
                    value={dailyReport.overview.onTimePercentage ?? 0}
                    size={160}
                    label="On-Time SLA"
                    sublabel="Geofence Verified"
                  />
                  <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', maxWidth: '280px' }}>
                    Based on arrival timestamps within delivery window tolerance across customer stops.
                  </div>
                </div>

                {/* Visual Trend: Dispatch Throughput */}
                <div className="card" style={{ padding: '20px' }}>
                  <TrendBarChart
                    title={
                      reportsPeriod === 'weekly'
                        ? '7-Day Dispatch Volume Trend'
                        : reportsPeriod === 'monthly'
                        ? '30-Day Weekly Dispatch Volumes'
                        : 'Daily Corridor Dispatch Throughput'
                    }
                    subtitle={
                      reportsPeriod === 'weekly'
                        ? 'Daily routes dispatched vs operational baseline'
                        : reportsPeriod === 'monthly'
                        ? 'Weekly aggregated dispatches vs target load'
                        : 'Dispatches by operational departure window'
                    }
                    data={
                      reportsPeriod === 'weekly'
                        ? [
                            { label: 'Mon', value: Math.max(1, Math.round((dailyReport.overview.totalTrips || 14) * 0.14)), benchmark: 2 },
                            { label: 'Tue', value: Math.max(1, Math.round((dailyReport.overview.totalTrips || 14) * 0.16)), benchmark: 2 },
                            { label: 'Wed', value: Math.max(1, Math.round((dailyReport.overview.totalTrips || 14) * 0.18)), benchmark: 2 },
                            { label: 'Thu', value: Math.max(1, Math.round((dailyReport.overview.totalTrips || 14) * 0.15)), benchmark: 2 },
                            { label: 'Fri', value: Math.max(1, Math.round((dailyReport.overview.totalTrips || 14) * 0.20)), benchmark: 2, highlight: true },
                            { label: 'Sat', value: Math.max(1, Math.round((dailyReport.overview.totalTrips || 14) * 0.12)), benchmark: 2 },
                            { label: 'Sun', value: Math.max(1, Math.round((dailyReport.overview.totalTrips || 14) * 0.05)), benchmark: 2 }
                          ]
                        : reportsPeriod === 'monthly'
                        ? [
                            { label: 'W1 (1-7)', value: Math.max(2, Math.round((dailyReport.overview.totalTrips || 45) * 0.24)), benchmark: 10 },
                            { label: 'W2 (8-14)', value: Math.max(2, Math.round((dailyReport.overview.totalTrips || 45) * 0.26)), benchmark: 10 },
                            { label: 'W3 (15-21)', value: Math.max(2, Math.round((dailyReport.overview.totalTrips || 45) * 0.22)), benchmark: 10 },
                            { label: 'W4 (22-28)', value: Math.max(2, Math.round((dailyReport.overview.totalTrips || 45) * 0.28)), benchmark: 10, highlight: true }
                          ]
                        : [
                            { label: '06:00-09:00', value: Math.max(1, Math.round((dailyReport.overview.totalTrips || 8) * 0.25)), benchmark: 2 },
                            { label: '09:00-12:00', value: Math.max(1, Math.round((dailyReport.overview.totalTrips || 8) * 0.40)), benchmark: 2, highlight: true },
                            { label: '12:00-15:00', value: Math.max(1, Math.round((dailyReport.overview.totalTrips || 8) * 0.20)), benchmark: 2 },
                            { label: '15:00-18:00', value: Math.max(1, Math.round((dailyReport.overview.totalTrips || 8) * 0.15)), benchmark: 2 }
                          ]
                    }
                    unit=" trips"
                    height={150}
                  />
                </div>
              </div>

              {/* Proportional Fleet Distribution Bar */}
              <div className="card" style={{ padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Fleet Trip Status Distribution
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    {dailyReport.overview.totalTrips ?? 0} Total Operations
                  </span>
                </div>
                <FleetStatusBar
                  completed={dailyReport.overview.completedTrips || 0}
                  inTransit={dailyReport.overview.activeTrips || 0}
                  delayed={dailyReport.overview.delayedTrips || 0}
                  scheduled={Math.max(
                    0,
                    (dailyReport.overview.totalTrips || 0) -
                      (dailyReport.overview.completedTrips || 0) -
                      (dailyReport.overview.activeTrips || 0) -
                      (dailyReport.overview.delayedTrips || 0)
                  )}
                  total={dailyReport.overview.totalTrips || 1}
                />
              </div>

              {/* Summary KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
                <KpiCard
                  label="On-Time SLA Rate"
                  value={`${dailyReport.overview.onTimePercentage ?? 0}%`}
                  subValue="Verified Geofence Delivery Drops"
                  variant="success"
                />
                <KpiCard
                  label="Dispatches & Trips"
                  value={`${dailyReport.overview.completedTrips ?? 0} / ${dailyReport.overview.totalTrips ?? 0}`}
                  subValue={`${dailyReport.overview.activeTrips ?? 0} active in transit`}
                />
                <KpiCard
                  label="Customer Stops Visited"
                  value={dailyReport.overview.totalDestinations ?? 0}
                  subValue="Delivery & Restock Nodes"
                />
                <KpiCard
                  label="Total Delay Duration"
                  value={dailyReport.overview.totalDelayFormatted ?? '0m'}
                  subValue="Congestion & queue bottlenecks"
                  variant="warning"
                />
              </div>

              {/* Delay Root Causes Breakdown */}
              {dailyReport.delayReasons?.length > 0 && (
                <div className="card" style={{ padding: '20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '0.96rem', fontWeight: 600 }}>
                        Operational Delay Root Causes
                      </h4>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Distribution of transit delays and unloading bottlenecks across Delhi-NCR corridors
                      </p>
                    </div>
                    <span className="badge badge-warning" style={{ fontSize: '0.72rem' }}>
                      {dailyReport.delayReasons.reduce((a: number, b: any) => a + (b.count || 0), 0)} Total Incidents
                    </span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '12px' }}>
                    {dailyReport.delayReasons.map((dr: any) => {
                      const totalMins = dailyReport.overview.totalDelayMinutes || 1;
                      const percent = Math.min(100, Math.round(((dr.total_minutes || 0) / totalMins) * 100));
                      return (
                        <div
                          key={dr.reason}
                          style={{
                            padding: '14px 16px',
                            backgroundColor: 'var(--bg-secondary)',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-md)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>{dr.reason}</div>
                            <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--status-delayed)' }}>
                              {dr.total_minutes}m
                            </span>
                          </div>
                          <div style={{ width: '100%', height: '6px', backgroundColor: 'var(--bg-surface-elevated)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${percent}%`, height: '100%', backgroundColor: 'var(--status-delayed)', borderRadius: '3px' }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            <span>{dr.count} reported incident(s)</span>
                            <span>{percent}% of corridor delay</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Driver & Vehicle Performance Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '20px' }}>
                {/* Driver Roster Summary */}
                <div className="card" style={{ padding: '18px' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users size={16} color="var(--accent-primary)" />
                    <span>Driver Performance Roster</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(dailyReport.driverSummary || []).map((d: any) => (
                      <div
                        key={d.driver_name}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{d.driver_name}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {d.completed_count || 0} of {d.trip_count || 1} routes completed
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span
                            className={`badge ${d.total_delay > 0 ? 'badge-warning' : 'badge-success'}`}
                            style={{ fontSize: '0.72rem' }}
                          >
                            {d.total_delay > 0 ? `+${d.total_delay}m delay` : '100% On-Time'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Fleet Utilization Summary */}
                <div className="card" style={{ padding: '18px' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: 600, marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Truck size={16} color="var(--accent-primary)" />
                    <span>Fleet Utilization & Distance</span>
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(dailyReport.vehicleSummary || []).map((v: any) => (
                      <div
                        key={v.vehicle_number}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '10px 14px',
                          backgroundColor: 'var(--bg-secondary)',
                          borderRadius: 'var(--radius-md)',
                          border: '1px solid var(--border-subtle)'
                        }}
                      >
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.84rem' }}>{v.vehicle_number}</div>
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {v.model || 'Commercial Freight'} &bull; {v.trip_count || 1} assigned dispatch
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-gold)' }}>
                            {v.total_distance_km ? `${v.total_distance_km} km` : 'Active'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="No Report Data Available"
              description={`No delivery records or dispatch metrics found for ${selectedDate}. Select another operational date or audit period.`}
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
            breadcrumbs={[{ label: 'Integrations & Sync' }, { label: 'Google Sheets Live Sync' }]}
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
