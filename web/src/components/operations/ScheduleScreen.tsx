import React, { useState, useMemo } from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  Truck,
  Users,
  Plus,
  Filter,
  Search,
  ChevronRight,
  UserCheck,
  Edit,
  XCircle,
  Eye,
  AlertTriangle,
  RotateCcw,
  CheckCircle2
} from 'lucide-react';
import { Trip, Driver, Vehicle } from '../../types';
import { StatusBadge } from '../StatusBadge';

interface ScheduleScreenProps {
  trips: Trip[];
  drivers: Driver[];
  vehicles: Vehicle[];
  onOpenCreateTrip: () => void;
  onOpenTripDetails: (tripId: string) => void;
  onOpenAssignment: (trip: Trip) => void;
  onCancelTrip: (tripId: string) => void;
}

export const ScheduleScreen: React.FC<ScheduleScreenProps> = ({
  trips,
  drivers,
  vehicles,
  onOpenCreateTrip,
  onOpenTripDetails,
  onOpenAssignment,
  onCancelTrip
}) => {
  const [timeHorizon, setTimeHorizon] = useState<'today' | 'tomorrow' | 'week'>('today');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [driverFilter, setDriverFilter] = useState<string>('ALL');
  const [vehicleFilter, setVehicleFilter] = useState<string>('ALL');

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const weekEndStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split('T')[0];
  }, []);

  // Filter trips by timeframe tab
  const horizonTrips = useMemo(() => {
    return trips.filter((t) => {
      const tripDate = t.date ? t.date.split('T')[0] : '';
      if (timeHorizon === 'today') {
        return tripDate === todayStr || !tripDate;
      }
      if (timeHorizon === 'tomorrow') {
        return tripDate === tomorrowStr;
      }
      if (timeHorizon === 'week') {
        return tripDate >= todayStr && tripDate <= weekEndStr;
      }
      return true;
    });
  }, [trips, timeHorizon, todayStr, tomorrowStr, weekEndStr]);

  // Apply filters & search
  const filteredTrips = useMemo(() => {
    return horizonTrips.filter((t) => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (driverFilter !== 'ALL' && t.driver_id !== driverFilter) return false;
      if (vehicleFilter !== 'ALL' && t.vehicle_id !== vehicleFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = t.id.toLowerCase().includes(q);
        const matchesDriver = (t.driver_name || '').toLowerCase().includes(q);
        const matchesVehicle = (t.vehicle_number || '').toLowerCase().includes(q);
        const matchesOrigin = (t.starting_location || '').toLowerCase().includes(q);
        const matchesStops = t.stops?.some((s) => s.destination_name.toLowerCase().includes(q));
        if (!matchesId && !matchesDriver && !matchesVehicle && !matchesOrigin && !matchesStops) {
          return false;
        }
      }
      return true;
    });
  }, [horizonTrips, statusFilter, driverFilter, vehicleFilter, searchQuery]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Top Controls Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px'
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
            Dispatch Schedule Board
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: '4px 0 0' }}>
            Plan, assign, and coordinate fleet departures for current and upcoming shifts
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Time Horizon Segmented Control */}
          <div
            style={{
              display: 'flex',
              backgroundColor: 'var(--bg-card)',
              padding: '3px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {(['today', 'tomorrow', 'week'] as const).map((h) => {
              const isActive = timeHorizon === h;
              return (
                <button
                  key={h}
                  type="button"
                  onClick={() => setTimeHorizon(h)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: isActive ? 'var(--brand-primary)' : 'transparent',
                    color: isActive ? '#ffffff' : 'var(--text-secondary)',
                    fontWeight: 700,
                    fontSize: '0.82rem',
                    cursor: 'pointer',
                    textTransform: 'capitalize',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {h === 'today' ? "Today's Schedule" : h === 'tomorrow' ? 'Tomorrow' : 'This Week'}
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenCreateTrip}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
          >
            <Plus size={16} />
            <span>Create Trip</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="card-elevation-1"
        style={{
          padding: '14px 18px',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', minWidth: '240px', flex: '1 1 240px' }}>
          <Search
            size={16}
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-secondary)'
            }}
          />
          <input
            type="text"
            placeholder="Search trip ID, driver, destination..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ width: '100%', paddingLeft: '36px', fontSize: '0.84rem' }}
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="select-field"
          style={{ minWidth: '150px', fontSize: '0.84rem' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="PLANNED">Planned (Unassigned)</option>
          <option value="ASSIGNED">Assigned</option>
          <option value="IN_PROGRESS">In Progress / On Route</option>
          <option value="AT_DESTINATION">At Destination</option>
          <option value="DELAYED">Delayed</option>
          <option value="RETURNING">Returning to Depot</option>
          <option value="COMPLETED">Completed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>

        {/* Driver Filter */}
        <select
          value={driverFilter}
          onChange={(e) => setDriverFilter(e.target.value)}
          className="select-field"
          style={{ minWidth: '160px', fontSize: '0.84rem' }}
        >
          <option value="ALL">All Drivers</option>
          {drivers.map((d) => (
            <option key={d.id} value={d.user_id || d.id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* Vehicle Filter */}
        <select
          value={vehicleFilter}
          onChange={(e) => setVehicleFilter(e.target.value)}
          className="select-field"
          style={{ minWidth: '160px', fontSize: '0.84rem' }}
        >
          <option value="ALL">All Vehicles</option>
          {vehicles.map((v) => (
            <option key={v.id} value={v.id}>
              {v.vehicle_number}
            </option>
          ))}
        </select>

        {(statusFilter !== 'ALL' || driverFilter !== 'ALL' || vehicleFilter !== 'ALL' || searchQuery) && (
          <button
            type="button"
            className="btn btn-outline"
            onClick={() => {
              setStatusFilter('ALL');
              setDriverFilter('ALL');
              setVehicleFilter('ALL');
              setSearchQuery('');
            }}
            style={{ fontSize: '0.8rem', padding: '6px 12px' }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Schedule Trips List / Table */}
      {filteredTrips.length === 0 ? (
        <div
          style={{
            padding: '60px 20px',
            textAlign: 'center',
            backgroundColor: 'var(--bg-surface)',
            borderRadius: 'var(--radius-lg)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          <Calendar size={42} color="var(--text-secondary)" style={{ margin: '0 auto 12px' }} />
          <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            No Trips Scheduled for This Timeframe
          </h3>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Try adjusting your date range or filters, or create a new trip schedule above.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={onOpenCreateTrip}
            style={{ marginTop: '14px', fontSize: '0.84rem' }}
          >
            <Plus size={16} />
            <span>Create Trip Now</span>
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {filteredTrips.map((trip) => {
            const isUnassigned = trip.status === 'PLANNED' || !trip.driver_id;
            const completedStops = trip.stops?.filter((s) => s.status === 'COMPLETED').length || 0;
            const totalStops = trip.stops?.length || 0;

            return (
              <div
                key={trip.id}
                className="card-elevation-1"
                style={{
                  padding: '18px 20px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-md)',
                  border: isUnassigned ? '1px dashed var(--brand-primary)' : '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexWrap: 'wrap',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                  transition: 'border-color 0.15s ease'
                }}
              >
                {/* Trip Primary Info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '220px' }}>
                  <div
                    style={{
                      width: '44px',
                      height: '44px',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: isUnassigned
                        ? 'rgba(245, 158, 11, 0.12)'
                        : 'rgba(23, 100, 168, 0.10)',
                      color: isUnassigned ? '#f59e0b' : 'var(--brand-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '0.9rem'
                    }}
                  >
                    <Truck size={22} />
                  </div>

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        onClick={() => onOpenTripDetails(trip.id)}
                        style={{
                          fontSize: '1rem',
                          fontWeight: 800,
                          color: 'var(--brand-primary)',
                          cursor: 'pointer'
                        }}
                      >
                        {trip.id}
                      </span>
                      <StatusBadge status={trip.status} />
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                      Departure: <strong style={{ color: 'var(--text-primary)' }}>{trip.planned_departure_time || '08:00'}</strong>{' '}
                      • Date: {trip.date}
                    </div>
                  </div>
                </div>

                {/* Route: Origin -> Stops */}
                <div style={{ minWidth: '200px', flex: '1 1 200px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Route & Destinations
                  </div>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                    {trip.starting_location || 'Central Depot'} →{' '}
                    <span style={{ color: 'var(--brand-primary)' }}>
                      {trip.stops && trip.stops.length > 0
                        ? trip.stops.map((s) => s.destination_name).join(', ')
                        : 'Multiple Deliveries'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Progress: {completedStops} of {totalStops} stops completed
                  </div>
                </div>

                {/* Assigned Driver & Vehicle */}
                <div style={{ minWidth: '180px' }}>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                    Driver & Fleet Unit
                  </div>
                  {isUnassigned ? (
                    <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#f59e0b', marginTop: '2px' }}>
                      ⚠️ Unassigned — Action Required
                    </div>
                  ) : (
                    <div>
                      <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {trip.driver_name || 'Assigned Driver'}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        Vehicle: {trip.vehicle_number || 'N/A'}
                      </div>
                    </div>
                  )}
                </div>

                {/* Schedule Action Buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isUnassigned ? (
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => onOpenAssignment(trip)}
                      style={{ fontSize: '0.82rem', padding: '7px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <UserCheck size={15} />
                      <span>Assign Driver</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => onOpenAssignment(trip)}
                      style={{ fontSize: '0.82rem', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    >
                      <UserCheck size={14} />
                      <span>Reassign</span>
                    </button>
                  )}

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() => onOpenTripDetails(trip.id)}
                    style={{ fontSize: '0.82rem', padding: '7px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                    title="View Trip Inspector"
                  >
                    <Eye size={14} />
                    <span>View</span>
                  </button>

                  {trip.status !== 'COMPLETED' && trip.status !== 'CANCELLED' && (
                    <button
                      type="button"
                      onClick={() => onCancelTrip(trip.id)}
                      style={{
                        background: 'none',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-sm)',
                        padding: '7px 10px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)'
                      }}
                      title="Cancel Trip"
                    >
                      <XCircle size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
