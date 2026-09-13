import React from 'react';
import { MapPin, Bell, Sun, Moon, RefreshCw } from 'lucide-react';
import { User } from '../../types';

interface Props {
  currentUser: User;
  vehicleNumber?: string;
  gpsAccuracy?: number | null;
  isRealGps?: boolean;
  isRefreshingGps?: boolean;
  onRefreshGps?: () => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  onOpenNotifications?: () => void;
}

export const DriverHeader: React.FC<Props> = ({
  currentUser,
  vehicleNumber = 'DL01TA4920',
  gpsAccuracy,
  isRealGps,
  isRefreshingGps,
  onRefreshGps,
  theme,
  onToggleTheme,
  onOpenNotifications
}) => {
  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Get driver initials
  const initials = currentUser.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'DR';

  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 4px 10px',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      {/* Left Profile Snippet */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div
          style={{
            width: '46px',
            height: '46px',
            borderRadius: '50%',
            backgroundColor: 'var(--driver-primary)',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1.05rem',
            letterSpacing: '0.5px',
            boxShadow: '0 2px 8px rgba(0, 143, 114, 0.25)',
            flexShrink: 0
          }}
        >
          {initials}
        </div>

        <div>
          <div
            style={{
              fontSize: '0.82rem',
              color: 'var(--driver-text-secondary)',
              fontWeight: 500,
              lineHeight: 1.2
            }}
          >
            {getGreeting()}
          </div>
          <h1
            style={{
              fontSize: '1.15rem',
              fontWeight: 800,
              color: 'var(--driver-text-primary)',
              margin: '2px 0 0',
              letterSpacing: '-0.01em',
              lineHeight: 1.2
            }}
          >
            {currentUser.name}
          </h1>
          <div
            style={{
              fontSize: '0.75rem',
              color: 'var(--driver-text-muted)',
              fontWeight: 500,
              marginTop: '1px'
            }}
          >
            Driver • {vehicleNumber}
          </div>
        </div>
      </div>

      {/* Right Action Icons: GPS status, Theme, Notifications */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {/* GPS status pill */}
        {gpsAccuracy !== undefined && (
          <button
            type="button"
            onClick={onRefreshGps}
            title={
              gpsAccuracy !== null
                ? `Live GPS active: ±${gpsAccuracy}m accuracy. Click to refresh.`
                : 'Acquiring GPS fix. Click to refresh.'
            }
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backgroundColor: gpsAccuracy !== null ? 'var(--driver-success-bg)' : 'var(--driver-card-bg)',
              color: gpsAccuracy !== null ? 'var(--driver-success)' : 'var(--driver-text-muted)',
              border: `1px solid ${gpsAccuracy !== null ? 'var(--driver-success-border)' : 'var(--driver-card-border)'}`,
              padding: '6px 10px',
              borderRadius: '9999px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <MapPin size={12} className={isRefreshingGps ? 'spin-animation' : ''} />
            <span>{gpsAccuracy !== null ? `±${gpsAccuracy}m` : 'GPS'}</span>
            {onRefreshGps && (
              <RefreshCw
                size={10}
                style={{ marginLeft: 2, opacity: 0.7 }}
                className={isRefreshingGps ? 'spin-animation' : ''}
              />
            )}
          </button>
        )}

        {/* Theme Toggle */}
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label="Toggle dark/light mode"
            className="driver-tap-target"
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '50%',
              backgroundColor: 'var(--driver-card-bg)',
              border: '1px solid var(--driver-card-border)',
              color: 'var(--driver-text-secondary)',
              padding: 0
            }}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        )}

        {/* Notification Bell */}
        <button
          type="button"
          onClick={onOpenNotifications}
          aria-label="Notifications"
          className="driver-tap-target"
          style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            backgroundColor: 'var(--driver-card-bg)',
            border: '1px solid var(--driver-card-border)',
            color: 'var(--driver-text-secondary)',
            padding: 0,
            position: 'relative'
          }}
        >
          <Bell size={17} />
          <span
            style={{
              position: 'absolute',
              top: '8px',
              right: '9px',
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              backgroundColor: 'var(--driver-primary)'
            }}
          />
        </button>
      </div>
    </header>
  );
};
