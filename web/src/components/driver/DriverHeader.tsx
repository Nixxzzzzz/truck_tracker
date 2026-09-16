import React from 'react';
import { MapPin, Bell, Sun, Moon, RefreshCw } from 'lucide-react';
import { User } from '../../types';
import { HoseXpertsLogo } from '../common/HoseXpertsLogo';

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
  isDesktop?: boolean;
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
  onOpenNotifications,
  isDesktop = false
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
    : 'RS';

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px', boxSizing: 'border-box' }}>
      {/* Top Brand Bar with Compact Logo (on mobile) & Utilities */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: isDesktop ? 'flex-end' : 'space-between',
          padding: isDesktop ? '0 2px' : '8px 2px 0'
        }}
      >
        {!isDesktop && <HoseXpertsLogo variant="compact" height={32} />}

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* GPS indicator with interactive refresh */}
          <div
            onClick={onRefreshGps}
            title={onRefreshGps ? 'Click to refresh GPS fix' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: gpsAccuracy !== null ? 'var(--driver-success)' : 'var(--driver-warning)',
              backgroundColor: gpsAccuracy !== null ? 'var(--driver-success-bg)' : 'var(--driver-warning-bg)',
              border: `1px solid ${gpsAccuracy !== null ? 'var(--driver-success-border)' : 'var(--driver-warning-border)'}`,
              padding: '3px 9px',
              borderRadius: '9999px',
              cursor: onRefreshGps ? 'pointer' : 'default'
            }}
          >
            <span
              style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: gpsAccuracy !== null ? 'var(--driver-success)' : 'var(--driver-warning)'
              }}
            />
            <span>{isRefreshingGps ? 'Refreshing...' : gpsAccuracy !== null ? 'GPS Connected' : 'Acquiring GPS'}</span>
            {onRefreshGps && (
              <RefreshCw size={11} className={isRefreshingGps ? 'spin' : ''} style={{ opacity: 0.75 }} />
            )}
          </div>

          {/* Theme Toggle */}
          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              aria-label="Toggle dark/light mode"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--driver-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: '4px'
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
            style={{
              position: 'relative',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--driver-text-primary)',
              display: 'flex',
              alignItems: 'center',
              padding: '4px'
            }}
          >
            <Bell size={19} />
            <span
              style={{
                position: 'absolute',
                top: '2px',
                right: '2px',
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                backgroundColor: '#D92D20'
              }}
            />
          </button>
        </div>
      </div>

      {/* Driver Profile Greeting Banner */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '0 2px'
        }}
      >
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
            boxShadow: '0 2px 8px rgba(23, 100, 168, 0.25)',
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
              fontSize: '1.18rem',
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
      </header>
    </div>
  );
};
