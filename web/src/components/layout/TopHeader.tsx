import React from 'react';
import { Menu, Plus, RefreshCw, Search, ShieldCheck } from 'lucide-react';
import { NavSection } from './Sidebar';

interface TopHeaderProps {
  activeSection: NavSection;
  onOpenMobileMenu: () => void;
  onNewTrip: () => void;
  lastUpdated: Date;
  onRefresh: () => void;
  refreshing?: boolean;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  activeSection,
  onOpenMobileMenu,
  onNewTrip,
  lastUpdated,
  onRefresh,
  refreshing = false
}) => {
  const getSectionTitle = () => {
    switch (activeSection) {
      case 'operations':
        return { group: 'Operations', title: 'Command Center & Active Fleet' };
      case 'map':
        return { group: 'Operations', title: 'Live Telematics Map' };
      case 'vehicles':
        return { group: 'Fleet', title: 'Vehicles Register' };
      case 'drivers':
        return { group: 'Fleet', title: 'Drivers Roster' };
      case 'destinations':
        return { group: 'Fleet', title: 'Saved Destinations & Geofences' };
      case 'reports':
        return { group: 'Intelligence', title: 'Operational Performance Reports' };
      case 'sheets':
        return { group: 'Intelligence', title: 'Google Sheets Live Sync' };
      default:
        return { group: 'Operations', title: 'Logistics Command' };
    }
  };

  const { group, title } = getSectionTitle();

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

      {/* Right: Telematics Status & Action Button */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* Live Telematics Indicator */}
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

        {/* Refresh button */}
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="btn btn-secondary btn-sm"
          style={{ padding: '5px 10px' }}
          title={`Last updated ${lastUpdated.toLocaleTimeString()}`}
        >
          <RefreshCw size={12} className={refreshing ? 'animate-spin' : ''} />
          <span className="hide-on-mobile">Sync</span>
        </button>

        {/* Primary CTA */}
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
