import React from 'react';
import {
  Home,
  Route,
  MapPin,
  ShieldAlert,
  MoreHorizontal,
  LogOut,
  Truck,
  Sun,
  Moon,
  Wifi,
  WifiOff,
  User as UserIcon
} from 'lucide-react';
import { DriverTab } from './BottomNavigation';
import { User, Trip } from '../../types';

interface Props {
  activeTab: DriverTab;
  onTabChange: (tab: DriverTab) => void;
  currentUser: User;
  activeTrip: Trip | null;
  theme: 'dark' | 'light';
  onToggleTheme?: () => void;
  onLogout: () => void;
  isOnline: boolean;
  offlineCount: number;
}

export const DesktopSidebar: React.FC<Props> = ({
  activeTab,
  onTabChange,
  currentUser,
  activeTrip,
  theme,
  onToggleTheme,
  onLogout,
  isOnline,
  offlineCount
}) => {
  const initials = currentUser.name
    ? currentUser.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'DR';

  const navItems: { id: DriverTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'home', label: 'Home Dashboard', icon: <Home size={19} /> },
    {
      id: 'trip',
      label: 'Trip & Stops',
      icon: <Route size={19} />,
      badge: activeTrip?.stops?.length ? `${activeTrip.stops.length}` : undefined
    },
    { id: 'map', label: 'Live Map Navigation', icon: <MapPin size={19} /> },
    { id: 'emergency', label: 'Emergency & SOS', icon: <ShieldAlert size={19} /> },
    {
      id: 'more',
      label: 'More Options',
      icon: <MoreHorizontal size={19} />,
      badge: offlineCount > 0 ? `${offlineCount}` : undefined
    }
  ];

  return (
    <aside
      style={{
        width: '260px',
        backgroundColor: 'var(--driver-card-bg)',
        borderRight: '1px solid var(--driver-card-border)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        boxSizing: 'border-box',
        height: '100vh',
        position: 'sticky',
        top: 0,
        flexShrink: 0
      }}
    >
      {/* Top Brand Logo & Fleet App Title */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 8px 24px' }}>
          <div
            style={{
              width: '38px',
              height: '38px',
              borderRadius: '10px',
              backgroundColor: 'var(--driver-primary)',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '1.1rem',
              boxShadow: '0 3px 10px rgba(0, 143, 114, 0.3)'
            }}
          >
            <Truck size={20} />
          </div>
          <div>
            <div
              style={{
                fontSize: '1.05rem',
                fontWeight: 800,
                color: 'var(--driver-text-primary)',
                letterSpacing: '-0.02em',
                lineHeight: 1.2
              }}
            >
              TruckTracker
            </div>
            <div
              style={{
                fontSize: '0.72rem',
                fontWeight: 600,
                color: 'var(--driver-primary)',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              Driver Terminal
            </div>
          </div>
        </div>

        {/* Navigation Items */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const isEmergency = item.id === 'emergency';

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onTabChange(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  backgroundColor: isActive
                    ? isEmergency
                      ? 'var(--driver-danger-bg)'
                      : 'var(--driver-primary-light)'
                    : 'transparent',
                  color: isActive
                    ? isEmergency
                      ? 'var(--driver-danger)'
                      : 'var(--driver-primary)'
                    : isEmergency
                    ? 'var(--driver-danger)'
                    : 'var(--driver-text-secondary)',
                  border: isActive
                    ? `1px solid ${isEmergency ? 'var(--driver-danger-border)' : 'var(--driver-primary-border)'}`
                    : '1px solid transparent',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.92rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      backgroundColor: isActive ? 'var(--driver-primary)' : 'var(--driver-bg)',
                      color: isActive ? '#FFFFFF' : 'var(--driver-text-secondary)',
                      padding: '2px 8px',
                      borderRadius: '9999px'
                    }}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Profile, Theme Toggle & Logout */}
      <div style={{ borderTop: '1px solid var(--driver-card-border)', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {/* Network status pill */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '6px 10px',
            backgroundColor: 'var(--driver-bg)',
            borderRadius: '8px',
            fontSize: '0.74rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: isOnline ? 'var(--driver-success)' : 'var(--driver-warning)' }}>
            {isOnline ? <Wifi size={13} /> : <WifiOff size={13} />}
            <span style={{ fontWeight: 600 }}>{isOnline ? 'Online Synced' : 'Offline'}</span>
          </div>

          {onToggleTheme && (
            <button
              type="button"
              onClick={onToggleTheme}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--driver-text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: '2px'
              }}
              title="Toggle theme"
            >
              {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            </button>
          )}
        </div>

        {/* User Card */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                backgroundColor: 'var(--driver-primary)',
                color: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.9rem',
                flexShrink: 0
              }}
            >
              {initials}
            </div>
            <div style={{ minWidth: 0 }}>
              <div
                style={{
                  fontSize: '0.86rem',
                  fontWeight: 700,
                  color: 'var(--driver-text-primary)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {currentUser.name}
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--driver-text-muted)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {activeTrip?.vehicle_number || 'DL01TA4920'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onLogout}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--driver-text-muted)',
              padding: '6px'
            }}
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
};
