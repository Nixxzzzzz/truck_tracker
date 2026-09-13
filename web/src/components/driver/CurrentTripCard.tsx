import React from 'react';
import { Truck, ArrowRight, Clock, CheckCircle2, ChevronRight, Play } from 'lucide-react';
import { Trip } from '../../types';

interface Props {
  trip: Trip | null;
  onViewTripDetails: () => void;
  onStartTrip?: () => void;
  actionLoading?: boolean;
}

export const CurrentTripCard: React.FC<Props> = ({
  trip,
  onViewTripDetails,
  onStartTrip,
  actionLoading = false
}) => {
  if (!trip) {
    return (
      <div
        className="driver-card"
        style={{
          textAlign: 'center',
          padding: '36px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px'
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            backgroundColor: 'var(--driver-primary-light)',
            color: 'var(--driver-primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Truck size={28} />
        </div>
        <div>
          <h3
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: 'var(--driver-text-primary)',
              margin: '0 0 6px'
            }}
          >
            No Active Trip Assigned
          </h3>
          <p
            style={{
              fontSize: '0.86rem',
              color: 'var(--driver-text-secondary)',
              margin: 0,
              maxWidth: '280px'
            }}
          >
            You don't currently have an active dispatch order. Please stand by for fleet dispatch.
          </p>
        </div>
      </div>
    );
  }

  const completedStops = trip.stops?.filter((s) => s.status === 'COMPLETED').length || 0;
  const totalStops = trip.stops?.length || 0;
  const progressPercent = totalStops > 0 ? Math.round((completedStops / totalStops) * 100) : 0;

  // Destination / Route summary
  const origin = trip.starting_location || 'Central Depot';
  const lastStop = trip.stops && trip.stops.length > 0 ? trip.stops[trip.stops.length - 1].destination_name : 'Customer Bay';
  const vehicleTag = trip.vehicle_model || '10ft High Deck';

  // Status text & badge
  const isPlanned = trip.status === 'PLANNED' || trip.status === 'ASSIGNED';
  const isEnRoute = trip.status === 'IN_PROGRESS' || trip.status === 'AT_DESTINATION';
  const isReturning = trip.status === 'RETURNING';
  const isCompleted = trip.status === 'COMPLETED';

  const statusLabel = isPlanned
    ? 'READY TO START'
    : isReturning
    ? 'RETURNING'
    : isCompleted
    ? 'COMPLETED'
    : 'ON ROUTE';

  return (
    <div className="driver-hero-trip">
      {/* Top Header Label & Status Badge */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '14px'
        }}
      >
        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'rgba(255, 255, 255, 0.85)'
          }}
        >
          CURRENT TRIP
        </span>

        <span
          style={{
            fontSize: '0.72rem',
            fontWeight: 800,
            letterSpacing: '0.04em',
            padding: '3px 10px',
            borderRadius: '9999px',
            backgroundColor: 'rgba(255, 255, 255, 0.22)',
            color: '#FFFFFF',
            backdropFilter: 'blur(4px)'
          }}
        >
          [ {statusLabel} ]
        </span>
      </div>

      {/* Main Route Title */}
      <div style={{ marginBottom: '14px' }}>
        <h2
          style={{
            fontSize: '1.4rem',
            fontWeight: 800,
            margin: '0 0 4px',
            color: '#FFFFFF',
            letterSpacing: '-0.02em',
            lineHeight: 1.25,
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap'
          }}
        >
          <span>{origin}</span>
          <ArrowRight size={18} style={{ opacity: 0.8 }} />
          <span>{lastStop}</span>
        </h2>

        <div
          style={{
            fontSize: '0.84rem',
            color: 'rgba(255, 255, 255, 0.85)',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span>{trip.vehicle_number}</span>
          <span>•</span>
          <span>{vehicleTag}</span>
        </div>
      </div>

      {/* 2-Column Schedule & Stop Progress Details */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '12px',
          padding: '12px 14px',
          backgroundColor: 'rgba(0, 0, 0, 0.12)',
          borderRadius: '12px',
          marginBottom: '16px'
        }}
      >
        <div>
          <div
            style={{
              fontSize: '0.68rem',
              color: 'rgba(255, 255, 255, 0.75)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            Planned Departure
          </div>
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#FFFFFF',
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <Clock size={15} style={{ opacity: 0.9 }} />
            <span>{trip.planned_departure_time || '06:00'}</span>
          </div>
        </div>

        <div>
          <div
            style={{
              fontSize: '0.68rem',
              color: 'rgba(255, 255, 255, 0.75)',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.04em'
            }}
          >
            Delivery Stops
          </div>
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#FFFFFF',
              marginTop: '2px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <CheckCircle2 size={15} style={{ opacity: 0.9 }} />
            <span>
              {completedStops} of {totalStops} Completed
            </span>
          </div>
        </div>
      </div>

      {/* Mini Progress Bar */}
      <div
        style={{
          width: '100%',
          height: '5px',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          borderRadius: '9999px',
          overflow: 'hidden',
          marginBottom: '16px'
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${progressPercent}%`,
            backgroundColor: '#FFFFFF',
            borderRadius: '9999px',
            transition: 'width 0.4s ease'
          }}
        />
      </div>

      {/* Action CTA Button: Start Trip or View Trip Details */}
      {isPlanned && onStartTrip ? (
        <button
          type="button"
          onClick={onStartTrip}
          disabled={actionLoading}
          style={{
            width: '100%',
            minHeight: '48px',
            backgroundColor: '#FFFFFF',
            color: 'var(--driver-primary)',
            border: 'none',
            borderRadius: '12px',
            fontSize: '0.98rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          <Play size={18} fill="currentColor" />
          <span>START TRIP NOW</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={onViewTripDetails}
          style={{
            width: '100%',
            minHeight: '48px',
            backgroundColor: '#FFFFFF',
            color: 'var(--driver-primary)',
            border: 'none',
            borderRadius: '12px',
            fontSize: '0.96rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
          }}
        >
          <span>View Trip Details</span>
          <ChevronRight size={18} />
        </button>
      )}
    </div>
  );
};
