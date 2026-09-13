import React from 'react';
import {
  Truck,
  MapPin,
  Users,
  FileText,
  Database,
  Smartphone,
  LogOut,
  Map as MapIcon,
  Activity,
  Layers,
  ChevronRight,
  Shield
} from 'lucide-react';
import { User } from '../../types';
import { ThemeToggle } from '../ThemeToggle';

export type NavSection =
  | 'operations'
  | 'map'
  | 'vehicles'
  | 'drivers'
  | 'destinations'
  | 'reports'
  | 'sheets';

interface SidebarProps {
  activeSection: NavSection;
  onSelectSection: (section: NavSection) => void;
  currentUser: User;
  onLogout: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  onSwitchToDriver?: () => void;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeSection,
  onSelectSection,
  currentUser,
  onLogout,
  theme,
  onToggleTheme,
  onSwitchToDriver,
  isOpenMobile,
  onCloseMobile
}) => {
  const navGroups = [
    {
      label: 'Fleet Operations',
      items: [
        { id: 'operations' as NavSection, label: 'Dispatch Command', icon: <Activity size={16} /> },
        { id: 'map' as NavSection, label: 'Live Fleet Map', icon: <MapIcon size={16} /> }
      ]
    },
    {
      label: 'Assets & Personnel',
      items: [
        { id: 'vehicles' as NavSection, label: 'Vehicle Registry', icon: <Truck size={16} /> },
        { id: 'drivers' as NavSection, label: 'Driver Directory', icon: <Users size={16} /> },
        { id: 'destinations' as NavSection, label: 'Facility Directory', icon: <MapPin size={16} /> }
      ]
    },
    {
      label: 'Reports & Sync',
      items: [
        { id: 'reports' as NavSection, label: 'Performance Analytics', icon: <FileText size={16} /> },
        { id: 'sheets' as NavSection, label: 'Google Sheets Sync', icon: <Database size={16} /> }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 998
          }}
          className="mobile-sidebar-backdrop"
        />
      )}

      <aside
        style={{
          width: '256px',
          backgroundColor: 'var(--bg-sidebar)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          position: 'sticky',
          top: 0,
          zIndex: 999,
          flexShrink: 0,
          transition: 'transform 0.2s ease'
        }}
        className={`app-sidebar ${isOpenMobile ? 'mobile-open' : ''}`}
      >
        {/* Brand Header */}
        <div
          style={{
            padding: '18px 20px',
            borderBottom: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: '0.95rem',
              fontFamily: 'var(--font-display)',
              boxShadow: 'var(--shadow-xs)'
            }}
          >
            TT
          </div>

          <div>
            <div
              style={{
                fontWeight: 700,
                fontSize: '1rem',
                letterSpacing: '-0.02em',
                fontFamily: 'var(--font-display)',
                lineHeight: 1.2
              }}
            >
              TruckTracker
            </div>
            <div
              style={{
                fontSize: '0.68rem',
                color: 'var(--text-muted)',
                fontWeight: 600,
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              Logistics & Fleet
            </div>
          </div>
        </div>

        {/* Nav Groups */}
        <nav
          style={{
            flex: 1,
            padding: '16px 12px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px'
          }}
        >
          {navGroups.map((group) => (
            <div key={group.label}>
              <div
                style={{
                  fontSize: '0.7rem',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  color: 'var(--text-muted)',
                  letterSpacing: '0.05em',
                  padding: '0 8px',
                  marginBottom: '6px'
                }}
              >
                {group.label}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {group.items.map((item) => {
                  const isActive = activeSection === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        onSelectSection(item.id);
                        onCloseMobile();
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: 'none',
                        background: isActive ? 'var(--accent-primary-subtle)' : 'transparent',
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.86rem',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.12s ease',
                        width: '100%'
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)';
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                    >
                      <span style={{ color: isActive ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        {item.icon}
                      </span>
                      <span style={{ flex: 1 }}>{item.label}</span>
                      {isActive && (
                        <div
                          style={{
                            width: '4px',
                            height: '14px',
                            borderRadius: '2px',
                            backgroundColor: 'var(--accent-primary)'
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Operator Footer */}
        <div
          style={{
            padding: '14px',
            borderTop: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            backgroundColor: 'var(--bg-secondary)'
          }}
        >
          {/* Driver Mobile Switcher Button */}
          {onSwitchToDriver && (
            <button
              onClick={() => {
                onSwitchToDriver();
                onCloseMobile();
              }}
              className="btn btn-secondary btn-sm"
              style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }}
            >
              <Smartphone size={13} />
              <span>Driver Mobile View</span>
            </button>
          )}

          {/* User Profile Card */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '6px 0'
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: 'var(--radius-full)',
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.74rem',
                flexShrink: 0
              }}
              title={currentUser.name}
            >
              {(currentUser.name || 'User')
                .split(' ')
                .map((n: string) => n[0])
                .slice(0, 2)
                .join('')
                .toUpperCase()}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
                title={currentUser.name}
              >
                {currentUser.name}
              </div>
              <div
                style={{
                  fontSize: '0.72rem',
                  color: 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {currentUser.role === 'MANAGER' ? 'Operations Manager' : 'Field Driver'}
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>
              <ThemeToggle theme={theme} onToggle={onToggleTheme} size={13} />
              <button
                onClick={onLogout}
                className="btn btn-subtle"
                style={{ padding: '6px', borderRadius: 'var(--radius-sm)' }}
                title="Sign out of operations"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <style>{`
        @media (max-width: 860px) {
          .app-sidebar {
            position: fixed !important;
            top: 0;
            bottom: 0;
            left: 0;
            transform: translateX(-100%);
            box-shadow: var(--shadow-lg);
          }
          .app-sidebar.mobile-open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
};
