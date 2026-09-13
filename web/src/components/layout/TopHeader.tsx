import React, { useState, useRef, useEffect } from 'react';
import { Menu, Plus, RefreshCw, Bell, AlertTriangle, CheckCircle2, ShieldAlert, X } from 'lucide-react';
import { NavSection } from './Sidebar';

export interface AlertItem {
  id: string;
  title: string;
  subtitle?: string;
  level: 'critical' | 'warning' | 'info';
  timestamp?: string;
  linkAction?: () => void;
}

interface TopHeaderProps {
  activeSection: NavSection;
  onOpenMobileMenu: () => void;
  onNewTrip: () => void;
  lastUpdated: Date;
  onRefresh: () => void;
  refreshing?: boolean;
  alerts?: AlertItem[];
  onDismissAlert?: (id: string) => void;
  onClearAllAlerts?: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeSection,
  onOpenMobileMenu,
  onNewTrip,
  lastUpdated,
  onRefresh,
  refreshing = false,
  alerts = [],
  onDismissAlert,
  onClearAllAlerts
}) => {
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const alertsRef = useRef<HTMLDivElement>(null);

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'operations':
        return { group: 'Operations', title: 'Dispatch Command' };
      case 'map':
        return { group: 'Operations', title: 'Live Fleet Map' };
      case 'vehicles':
        return { group: 'Assets', title: 'Vehicle Registry' };
      case 'drivers':
        return { group: 'Personnel', title: 'Driver Directory' };
      case 'destinations':
        return { group: 'Assets', title: 'Facility Directory' };
      case 'reports':
        return { group: 'Analytics', title: 'Performance Analytics' };
      default:
        return { group: 'Operations', title: 'Dispatch Command' };
    }
  };

  const { group, title } = getSectionTitle();

  // Close alerts popover on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (alertsRef.current && !alertsRef.current.contains(e.target as Node)) {
        setIsAlertsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsAlertsOpen(false);
    };

    if (isAlertsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isAlertsOpen]);

  return (
    <header
      style={{
        height: '56px',
        backgroundColor: 'var(--bg-header)',
        backdropFilter: 'blur(10px)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}
    >
      {/* Left: Mobile Toggle & Breadcrumbs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="btn btn-subtle mobile-menu-btn"
          style={{ padding: '6px', display: 'none' }}
          aria-label="Toggle navigation menu"
        >
          <Menu size={18} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem' }}>
          <span style={{ color: 'var(--text-muted)' }}>{group}</span>
          <span style={{ color: 'var(--text-muted)' }}>/</span>
          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{title}</span>
        </div>
      </div>

      {/* Right: Telematics Status, Alerts, Sync & Dispatch Action */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        {/* Live Status Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: 'var(--status-success-bg)',
            border: '1px solid var(--status-success-border)',
            borderRadius: 'var(--radius-full)',
            padding: '3px 8px',
            fontSize: '0.72rem',
            color: 'var(--status-success)',
            fontWeight: 600
          }}
          className="telematics-badge"
        >
          <span
            style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: 'var(--status-success)',
              animation: 'pulse 2s infinite ease-in-out'
            }}
          />
          <span>TELEMATICS ONLINE</span>
        </div>

        {/* Alert Notifications Center Bell */}
        <div style={{ position: 'relative' }} ref={alertsRef}>
          <button
            type="button"
            onClick={() => setIsAlertsOpen((prev) => !prev)}
            className="btn btn-secondary btn-sm"
            style={{
              padding: '6px 8px',
              position: 'relative',
              borderColor: alerts.length > 0 ? 'var(--status-delayed-border)' : 'var(--border-subtle)',
              backgroundColor: isAlertsOpen ? 'var(--bg-secondary)' : undefined
            }}
            title={alerts.length > 0 ? `${alerts.length} operational alerts require attention` : 'No active alerts'}
            aria-label="Notifications"
          >
            <Bell size={14} color={alerts.length > 0 ? 'var(--status-delayed)' : 'var(--text-secondary)'} />
            {alerts.length > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-4px',
                  backgroundColor: 'var(--status-delayed)',
                  color: '#ffffff',
                  fontSize: '0.66rem',
                  fontWeight: 800,
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
                }}
              >
                {alerts.length > 9 ? '9+' : alerts.length}
              </span>
            )}
          </button>

          {/* Alert Dropdown Panel */}
          {isAlertsOpen && (
            <div
              style={{
                position: 'absolute',
                top: 'calc(100% + 8px)',
                right: 0,
                width: '360px',
                maxWidth: '90vw',
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                boxShadow: 'var(--shadow-lg)',
                zIndex: 1000,
                overflow: 'hidden'
              }}
            >
              {/* Header */}
              <div
                style={{
                  padding: '12px 14px',
                  borderBottom: '1px solid var(--border-subtle)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  backgroundColor: 'var(--bg-secondary)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Bell size={14} color="var(--accent-primary)" />
                  <span style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text-primary)' }}>
                    Operational Alerts
                  </span>
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '1px 6px',
                      borderRadius: 'var(--radius-full)',
                      backgroundColor: alerts.length > 0 ? 'var(--status-delayed-bg)' : 'var(--bg-surface)',
                      color: alerts.length > 0 ? 'var(--status-delayed)' : 'var(--text-muted)',
                      border: '1px solid var(--border-subtle)'
                    }}
                  >
                    {alerts.length}
                  </span>
                </div>

                {alerts.length > 0 && onClearAllAlerts && (
                  <button
                    type="button"
                    onClick={() => {
                      onClearAllAlerts();
                      setIsAlertsOpen(false);
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-muted)',
                      fontSize: '0.72rem',
                      cursor: 'pointer',
                      padding: '2px 4px'
                    }}
                  >
                    Mark All Read
                  </button>
                )}
              </div>

              {/* Alerts List */}
              <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                {alerts.length === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    <CheckCircle2 size={24} color="var(--status-success)" style={{ margin: '0 auto 8px auto' }} />
                    <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      All Fleet Operations Normal
                    </div>
                    <div style={{ fontSize: '0.74rem', marginTop: '2px' }}>
                      No transit exceptions or compliance flags pending.
                    </div>
                  </div>
                ) : (
                  alerts.map((alert) => (
                    <div
                      key={alert.id}
                      onClick={() => {
                        if (alert.linkAction) {
                          alert.linkAction();
                          setIsAlertsOpen(false);
                        }
                      }}
                      style={{
                        padding: '10px 14px',
                        borderBottom: '1px solid var(--border-subtle)',
                        cursor: alert.linkAction ? 'pointer' : 'default',
                        display: 'flex',
                        gap: '10px',
                        alignItems: 'flex-start',
                        backgroundColor:
                          alert.level === 'critical' ? 'rgba(239, 68, 68, 0.04)' : undefined
                      }}
                      className="hover:bg-subtle"
                    >
                      <div style={{ marginTop: '2px', flexShrink: 0 }}>
                        {alert.level === 'critical' ? (
                          <ShieldAlert size={15} color="var(--status-danger)" />
                        ) : alert.level === 'warning' ? (
                          <AlertTriangle size={15} color="var(--status-delayed)" />
                        ) : (
                          <Bell size={15} color="var(--accent-primary)" />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {alert.title}
                        </div>
                        {alert.subtitle && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                            {alert.subtitle}
                          </div>
                        )}
                        {alert.timestamp && (
                          <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                            {alert.timestamp}
                          </div>
                        )}
                      </div>

                      {onDismissAlert && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDismissAlert(alert.id);
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '2px'
                          }}
                          title="Dismiss alert"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Manual Refresh / Sync Button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{ padding: '5px 10px' }}
          title={`Last synchronized at ${lastUpdated.toLocaleTimeString()}`}
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          <span className="hide-on-mobile">Sync</span>
        </button>

        {/* Primary CTA: Dispatch Trip */}
        <button
          type="button"
          onClick={onNewTrip}
          className="btn btn-primary btn-sm"
          style={{ padding: '6px 12px' }}
        >
          <Plus size={14} />
          <span>Dispatch Trip</span>
        </button>
      </div>

      <style>{`
        @media (max-width: 860px) {
          .mobile-menu-btn {
            display: inline-flex !important;
          }
          .hide-on-mobile {
            display: none !important;
          }
        }
      `}</style>
    </header>
  );
};
