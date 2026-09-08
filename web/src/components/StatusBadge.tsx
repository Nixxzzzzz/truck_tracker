import React from 'react';
import { TripStatus, StopStatus } from '../types';

interface Props {
  status: TripStatus | StopStatus | string;
}

export const StatusBadge: React.FC<Props> = ({ status }) => {
  const normalized = (status || '').toLowerCase();
  let className = 'badge';

  switch (normalized) {
    case 'in_progress':
      className += ' badge-in_progress';
      break;
    case 'at_destination':
    case 'arrived':
      className += ' badge-at_destination';
      break;
    case 'delayed':
    case 'late':
      className += ' badge-delayed';
      break;
    case 'returning':
      className += ' badge-returning';
      break;
    case 'completed':
    case 'on_time':
    case 'early':
      className += ' badge-completed';
      break;
    case 'cancelled':
    case 'failed':
      className += ' badge-danger';
      break;
    case 'assigned':
    case 'pending':
    default:
      className += ' badge-assigned';
      break;
  }

  const label = status.replace(/_/g, ' ');

  return <span className={className}>{label}</span>;
};
