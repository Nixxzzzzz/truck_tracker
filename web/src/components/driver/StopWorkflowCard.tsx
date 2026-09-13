import React, { useState } from 'react';
import {
  MapPin,
  CheckCircle2,
  Camera,
  Navigation,
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  Plus,
  ArrowLeft,
  FileCheck
} from 'lucide-react';
import { TripStop } from '../../types';

interface Props {
  stop: TripStop;
  isCurrentStop: boolean;
  totalStops: number;
  distanceKm: number | null;
  etaMinutes: number | null;
  areaCode?: string;
  actionLoading: boolean;
  onArrive: () => Promise<void>;
  onCheckIn?: () => Promise<void>;
  onOpenUploadPOD: () => void;
  onMarkDelivered: () => Promise<void>;
  onReportDelay: () => void;
  onAddCustomStop: () => void;
  onBack?: () => void;
  hasPodUploaded?: boolean;
}

export const StopWorkflowCard: React.FC<Props> = ({
  stop,
  isCurrentStop,
  totalStops,
  distanceKm,
  etaMinutes,
  areaCode,
  actionLoading,
  onArrive,
  onCheckIn,
  onOpenUploadPOD,
  onMarkDelivered,
  onReportDelay,
  onAddCustomStop,
  onBack,
  hasPodUploaded = false
}) => {
  // Local state for state-machine step when arrived
  const [hasCheckedIn, setHasCheckedIn] = useState(false);

  const isCompleted = stop.status === 'COMPLETED';
  const isArrived = stop.status === 'ARRIVED' || isCompleted;

  // Progressive state determination
  // State 1: Travelling (PENDING or IN_PROGRESS but not ARRIVED)
  // State 2: Arrived at location
  // State 3: Checked In
  // State 4: POD Uploaded
  // State 5: Delivered / Completed
  let currentState: 1 | 2 | 3 | 4 | 5 = 1;
  if (isCompleted) {
    currentState = 5;
  } else if (hasPodUploaded) {
    currentState = 4;
  } else if (hasCheckedIn) {
    currentState = 3;
  } else if (isArrived) {
    currentState = 2;
  } else {
    currentState = 1;
  }

  const handleCheckInClick = async () => {
    if (onCheckIn) {
      await onCheckIn();
    }
    setHasCheckedIn(true);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '2px 0'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="driver-tap-target"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'var(--driver-card-bg)',
                border: '1px solid var(--driver-card-border)',
                color: 'var(--driver-text-primary)',
                padding: 0
              }}
              aria-label="Back to Stops"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 800,
              color: 'var(--driver-text-primary)',
              margin: 0
            }}
          >
            Stop Workflow
          </h1>
        </div>

        <span
          style={{
            fontSize: '0.74rem',
            fontWeight: 700,
            color: 'var(--driver-text-secondary)',
            backgroundColor: 'var(--driver-card-bg)',
            border: '1px solid var(--driver-card-border)',
            padding: '4px 10px',
            borderRadius: '9999px'
          }}
        >
          Stop {stop.stop_number} of {totalStops}
        </span>
      </div>

      {/* Main Stop Card */}
      <div className="driver-card" style={{ padding: '20px' }}>
        {/* Status indicator row */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '10px'
          }}
        >
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: isCompleted
                ? 'var(--driver-success)'
                : isArrived
                ? 'var(--driver-primary)'
                : 'var(--driver-text-secondary)'
            }}
          >
            {isCompleted
              ? '✓ STOP COMPLETED'
              : isArrived
              ? 'AT FACILITY DOCK'
              : 'NEXT STOP • EN ROUTE'}
          </span>

          {distanceKm !== null && !isCompleted && (
            <span
              style={{
                fontSize: '0.76rem',
                fontWeight: 700,
                color: 'var(--driver-primary)',
                backgroundColor: 'var(--driver-primary-light)',
                border: '1px solid var(--driver-primary-border)',
                padding: '3px 9px',
                borderRadius: '9999px'
              }}
            >
              {distanceKm} km • ~{etaMinutes} mins
            </span>
          )}
        </div>

        {/* Facility Name & Area Code */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
          <h2
            style={{
              fontSize: '1.35rem',
              fontWeight: 800,
              color: 'var(--driver-text-primary)',
              margin: 0,
              letterSpacing: '-0.02em',
              lineHeight: 1.25
            }}
          >
            {stop.destination_name}
          </h2>
          {areaCode && (
            <span
              style={{
                fontSize: '0.75rem',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                backgroundColor: 'var(--driver-primary-light)',
                color: 'var(--driver-primary)',
                padding: '2px 8px',
                borderRadius: '4px',
                border: '1px solid var(--driver-primary-border)'
              }}
            >
              {areaCode}
            </span>
          )}
        </div>

        {/* Address */}
        <div
          style={{
            fontSize: '0.86rem',
            color: 'var(--driver-text-secondary)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '6px',
            marginBottom: '16px',
            lineHeight: 1.4
          }}
        >
          <MapPin size={16} style={{ color: 'var(--driver-primary)', flexShrink: 0, marginTop: '2px' }} />
          <span>{stop.address}</span>
        </div>

        {/* Turn-by-Turn Google Navigation Button */}
        {stop.latitude && stop.longitude && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${stop.latitude},${stop.longitude}`}
            target="_blank"
            rel="noopener noreferrer"
            className="driver-btn-secondary"
            style={{
              textDecoration: 'none',
              marginBottom: '20px',
              fontSize: '0.88rem',
              color: 'var(--driver-primary)'
            }}
          >
            <Navigation size={16} />
            <span>Open Google Maps Turn-by-Turn</span>
            <ExternalLink size={13} style={{ opacity: 0.7 }} />
          </a>
        )}

        {/* Progressive 4-Step Checklist */}
        <div
          style={{
            backgroundColor: 'var(--driver-bg)',
            border: '1px solid var(--driver-card-border)',
            borderRadius: '14px',
            padding: '16px',
            marginBottom: '20px'
          }}
        >
          <div
            style={{
              fontSize: '0.76rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--driver-text-secondary)',
              marginBottom: '12px'
            }}
          >
            Delivery Checklist
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {/* Step 1: Reach Location */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor:
                    currentState >= 2 ? 'var(--driver-success)' : 'transparent',
                  border: `2px solid ${
                    currentState >= 2 ? 'var(--driver-success)' : 'var(--driver-card-border)'
                  }`,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {currentState >= 2 && <CheckCircle2 size={16} />}
              </div>
              <span
                style={{
                  fontWeight: currentState === 1 ? 700 : 500,
                  color:
                    currentState >= 2
                      ? 'var(--driver-text-primary)'
                      : currentState === 1
                      ? 'var(--driver-primary)'
                      : 'var(--driver-text-muted)',
                  textDecoration: currentState >= 2 ? 'line-through' : 'none'
                }}
              >
                1. Reach facility location
              </span>
            </div>

            {/* Step 2: Check In */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor:
                    currentState >= 3 ? 'var(--driver-success)' : 'transparent',
                  border: `2px solid ${
                    currentState >= 3 ? 'var(--driver-success)' : 'var(--driver-card-border)'
                  }`,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {currentState >= 3 && <CheckCircle2 size={16} />}
              </div>
              <span
                style={{
                  fontWeight: currentState === 2 ? 700 : 500,
                  color:
                    currentState >= 3
                      ? 'var(--driver-text-primary)'
                      : currentState === 2
                      ? 'var(--driver-primary)'
                      : 'var(--driver-text-muted)',
                  textDecoration: currentState >= 3 ? 'line-through' : 'none'
                }}
              >
                2. Check in at security / dock
              </span>
            </div>

            {/* Step 3: Upload Proof / POD */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor:
                    currentState >= 4 ? 'var(--driver-success)' : 'transparent',
                  border: `2px solid ${
                    currentState >= 4 ? 'var(--driver-success)' : 'var(--driver-card-border)'
                  }`,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {currentState >= 4 && <CheckCircle2 size={16} />}
              </div>
              <span
                style={{
                  fontWeight: currentState === 3 ? 700 : 500,
                  color:
                    currentState >= 4
                      ? 'var(--driver-text-primary)'
                      : currentState === 3
                      ? 'var(--driver-primary)'
                      : 'var(--driver-text-muted)',
                  textDecoration: currentState >= 4 ? 'line-through' : 'none'
                }}
              >
                3. Upload Proof of Delivery (POD)
              </span>
            </div>

            {/* Step 4: Mark Delivered */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.88rem' }}>
              <div
                style={{
                  width: '22px',
                  height: '22px',
                  borderRadius: '50%',
                  backgroundColor:
                    currentState === 5 ? 'var(--driver-success)' : 'transparent',
                  border: `2px solid ${
                    currentState === 5 ? 'var(--driver-success)' : 'var(--driver-card-border)'
                  }`,
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}
              >
                {currentState === 5 && <CheckCircle2 size={16} />}
              </div>
              <span
                style={{
                  fontWeight: currentState === 4 ? 700 : 500,
                  color:
                    currentState === 5
                      ? 'var(--driver-success)'
                      : currentState === 4
                      ? 'var(--driver-primary)'
                      : 'var(--driver-text-muted)',
                  textDecoration: currentState === 5 ? 'line-through' : 'none'
                }}
              >
                4. Mark as Delivered & Depart
              </span>
            </div>
          </div>
        </div>

        {/* ONE OBVIOUS PRIMARY ACTION CTA (Progressive State Machine) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {currentState === 1 && (
            <button
              type="button"
              className="driver-btn-primary"
              onClick={onArrive}
              disabled={actionLoading}
            >
              <MapPin size={20} />
              <span>I'm at the Location →</span>
            </button>
          )}

          {currentState === 2 && (
            <button
              type="button"
              className="driver-btn-primary"
              onClick={handleCheckInClick}
              disabled={actionLoading}
            >
              <CheckCircle2 size={20} />
              <span>Check In at Dock</span>
            </button>
          )}

          {currentState === 3 && (
            <button
              type="button"
              className="driver-btn-primary"
              onClick={onOpenUploadPOD}
              disabled={actionLoading}
            >
              <Camera size={20} />
              <span>Upload Proof of Delivery (POD)</span>
            </button>
          )}

          {currentState === 4 && (
            <button
              type="button"
              className="driver-btn-primary"
              onClick={onMarkDelivered}
              disabled={actionLoading}
              style={{
                backgroundColor: 'var(--driver-success)'
              }}
            >
              <CheckCircle2 size={20} />
              <span>Mark as Delivered & Depart</span>
            </button>
          )}

          {currentState === 5 && (
            <div
              style={{
                padding: '16px',
                borderRadius: '12px',
                backgroundColor: 'var(--driver-success-bg)',
                border: '1px solid var(--driver-success-border)',
                textAlign: 'center',
                color: 'var(--driver-success)',
                fontWeight: 800,
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <CheckCircle2 size={20} />
              <span>Stop Successfully Completed!</span>
            </div>
          )}

          {/* Secondary Actions 2-Column Row */}
          {!isCompleted && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '4px' }}>
              <button
                type="button"
                className="driver-btn-secondary"
                onClick={onReportDelay}
                style={{
                  color: 'var(--driver-warning)',
                  borderColor: 'var(--driver-warning-border)'
                }}
              >
                <AlertTriangle size={16} />
                <span>Report Delay</span>
              </button>

              <button
                type="button"
                className="driver-btn-secondary"
                onClick={onOpenUploadPOD}
              >
                <Camera size={16} />
                <span>Take Photo</span>
              </button>
            </div>
          )}

          {/* Add Custom Stop auxiliary button */}
          <button
            type="button"
            className="driver-btn-secondary"
            onClick={onAddCustomStop}
            style={{
              borderStyle: 'dashed',
              fontSize: '0.82rem',
              color: 'var(--driver-text-secondary)',
              marginTop: '4px'
            }}
          >
            <Plus size={15} color="var(--driver-primary)" />
            <span>Add Ad-hoc Stop (Emergency / Unplanned)</span>
          </button>
        </div>
      </div>
    </div>
  );
};
