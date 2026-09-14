import React, { useState } from 'react';
import { Truck, ArrowRight, Lock, Mail, Smartphone, ShieldCheck, Eye, EyeOff, BarChart3, CheckCircle2, UserCheck } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { ThemeToggle } from '../components/ThemeToggle';
import { HoseXpertsLogo } from '../components/common/HoseXpertsLogo';

interface Props {
  onLoginSuccess: (user: User, token: string) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

interface ProfilePreset {
  id: 'manager' | 'driver' | 'director';
  label: string;
  title: string;
  roleBadge: string;
  email: string;
  password: string;
  description: string;
  icon: React.ElementType;
}

const PRESETS: ProfilePreset[] = [
  {
    id: 'manager',
    label: 'My Shipments',
    title: 'Dispatch Manager',
    roleBadge: 'Fleet Command',
    email: 'manager@company.com',
    password: 'manager123',
    description: 'Fleet dispatch, real-time map, vehicle registry & operational reports',
    icon: ShieldCheck
  },
  {
    id: 'driver',
    label: 'Driver',
    title: 'Route Driver',
    roleBadge: 'Mobile Terminal',
    email: 'rahul@company.com',
    password: 'driver123',
    description: 'Driver mobile view, multi-stop trips, GPS beacon & photo proof',
    icon: Truck
  },
  {
    id: 'director',
    label: 'Admin',
    title: 'Executive Director',
    roleBadge: 'Operations Audit',
    email: 'director@company.com',
    password: 'director123',
    description: 'Executive logistics oversight, SLA punctuality & audit reports',
    icon: BarChart3
  }
];

export const LoginView: React.FC<Props> = ({ onLoginSuccess, theme = 'dark', onToggleTheme }) => {
  const [selectedPresetId, setSelectedPresetId] = useState<'manager' | 'driver' | 'director'>('manager');
  const [email, setEmail] = useState('manager@company.com');
  const [password, setPassword] = useState('manager123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectPreset = (preset: ProfilePreset) => {
    setSelectedPresetId(preset.id);
    setEmail(preset.email);
    setPassword(preset.password);
    setError(null);
  };

  const handleLogin = async (loginEmail: string, loginPass: string) => {
    setLoading(true);
    setError(null);

    try {
      const data = await api.auth.login({ email: loginEmail.trim(), password: loginPass });
      localStorage.setItem('truck_tracker_token', data.token);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  const activePreset = PRESETS.find((p) => p.id === selectedPresetId) || PRESETS[0];

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        position: 'relative'
      }}
      className="login-container-responsive"
    >
      {onToggleTheme && (
        <div style={{ position: 'absolute', top: '16px', right: '16px', zIndex: 10 }}>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} showLabel />
        </div>
      )}

      <div
        className="card"
        style={{
          maxWidth: '460px',
          width: '100%',
          padding: '28px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: '8px' }}>
          <HoseXpertsLogo variant={theme === 'dark' ? 'white' : 'blue'} height={44} showTagline={true} />
          <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Enterprise Fleet Dispatch & Logistics Terminal
          </p>
        </div>

        {/* Quick Role Selector Tabs */}
        <div>
          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
            Select Access Profile:
          </label>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '6px',
              backgroundColor: 'var(--bg-surface-elevated)',
              padding: '4px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              const isSelected = selectedPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => selectPreset(preset)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    padding: '8px 4px',
                    borderRadius: 'var(--radius-sm)',
                    border: 'none',
                    backgroundColor: isSelected ? 'var(--accent-primary)' : 'transparent',
                    color: isSelected ? '#ffffff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    fontWeight: isSelected ? 700 : 500,
                    fontSize: '0.74rem'
                  }}
                >
                  <Icon size={16} />
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          {/* Active Profile Context Banner */}
          <div
            style={{
              marginTop: '8px',
              padding: '8px 10px',
              backgroundColor: 'var(--accent-primary-subtle)',
              border: '1px solid var(--accent-primary-border)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.74rem'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <UserCheck size={14} color="var(--accent-primary)" />
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{activePreset.title}</span>
            </div>
            <span style={{ color: 'var(--accent-primary)', fontWeight: 600 }}>{activePreset.roleBadge}</span>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              color: 'var(--status-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{error}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
              <Mail size={12} style={{ display: 'inline', marginRight: '6px' }} />
              Corporate Email
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. manager@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              style={{ fontSize: '0.92rem' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" style={{ fontSize: '0.78rem', fontWeight: 600 }}>
              <Lock size={12} style={{ display: 'inline', marginRight: '6px' }} />
              Password
            </label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                style={{ fontSize: '0.92rem', paddingRight: '40px', width: '100%' }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute',
                  right: '10px',
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-muted)',
                  cursor: 'pointer',
                  padding: '4px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-large"
            style={{ width: '100%', marginTop: '6px', fontSize: '0.92rem', fontWeight: 600 }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : `Sign In as ${activePreset.title}`}
            <ArrowRight size={16} />
          </button>
        </form>

        {/* 1-Click Launch Presets Section */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Quick 1-Click Direct Launch
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-operational)', fontWeight: 600 }}>
              Instant Demo Access
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {PRESETS.map((preset) => {
              const Icon = preset.icon;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    justifyContent: 'space-between',
                    padding: '10px 12px',
                    fontSize: '0.82rem',
                    textAlign: 'left'
                  }}
                  onClick={() => {
                    selectPreset(preset);
                    handleLogin(preset.email, preset.password);
                  }}
                  disabled={loading}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-surface-elevated)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-primary)'
                      }}
                    >
                      <Icon size={15} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{preset.title}</div>
                      <div style={{ fontSize: '0.71rem', color: 'var(--text-muted)' }}>{preset.email}</div>
                    </div>
                  </div>
                  <span style={{ color: 'var(--accent-primary)', fontSize: '0.74rem', fontWeight: 600 }}>
                    Launch &rarr;
                  </span>
                </button>
              );
            })}
          </div>

          {/* Android Mobile App Direct APK Link */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <a
              href="https://github.com/Nixxzzzzz/truck_tracker/releases/download/v1.0.0/TruckTracker-v1.0.0.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-subtle"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.76rem',
                color: 'var(--text-secondary)',
                width: '100%',
                justifyContent: 'center',
                padding: '6px'
              }}
            >
              <Smartphone size={13} />
              <span>Download Native Android Driver App (APK v1.0.0)</span>
            </a>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 480px) {
          .login-container-responsive {
            padding: 10px !important;
          }
          .card {
            padding: 20px 16px !important;
          }
        }
      `}</style>
    </div>
  );
};
