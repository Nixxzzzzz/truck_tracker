import React, { useState } from 'react';
import { Truck, ArrowRight, Lock, Mail, Smartphone, ShieldCheck } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';
import { ThemeToggle } from '../components/ThemeToggle';

interface Props {
  onLoginSuccess: (user: User, token: string) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess, theme = 'dark', onToggleTheme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const data = await api.auth.login({ email, password });
      localStorage.setItem('truck_tracker_token', data.token);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Login failed. Check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setLoading(true);
    setError(null);

    try {
      const data = await api.auth.login({ email: demoEmail, password: demoPassword });
      localStorage.setItem('truck_tracker_token', data.token);
      onLoginSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        position: 'relative'
      }}
    >
      {onToggleTheme && (
        <div style={{ position: 'absolute', top: '20px', right: '20px' }}>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} showLabel />
        </div>
      )}

      <div
        className="card"
        style={{
          maxWidth: '440px',
          width: '100%',
          padding: '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          gap: '22px'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '42px',
              height: '42px',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontWeight: 800,
              fontSize: '1.2rem',
              fontFamily: 'var(--font-display)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            TT
          </div>

          <h1 style={{ fontSize: '1.45rem', letterSpacing: '-0.02em', fontWeight: 700 }}>
            TruckTracker Operations
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '3px' }}>
            Enterprise Fleet & Logistics Intelligence Platform
          </p>
        </div>

        {error && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: 'var(--status-danger-bg)',
              border: '1px solid var(--status-danger-border)',
              color: 'var(--status-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.84rem'
            }}
          >
            {error}
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              <Mail size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Corporate Email
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. manager@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">
              <Lock size={12} style={{ display: 'inline', marginRight: '4px' }} />
              Password
            </label>
            <input
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '6px', padding: '10px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations'}
            <ArrowRight size={15} />
          </button>
        </form>

        {/* Corporate Role Access Profiles */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '18px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>
              Authorized Access Profiles
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
              1-Click Sign-In
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Operations Manager */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '9px 12px', fontSize: '0.82rem' }}
              onClick={() => handleQuickLogin('manager@company.com', 'manager123')}
              disabled={loading}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>Operations Dispatch Manager</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fleet Command, Trips & Google Sheets Sync</div>
              </div>
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.74rem', fontWeight: 600 }}>
                Launch &rarr;
              </span>
            </button>

            {/* Field Senior Driver */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '9px 12px', fontSize: '0.82rem' }}
              onClick={() => handleQuickLogin('rahul@company.com', 'driver123')}
              disabled={loading}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>Senior Route Driver (Delhi-Noida)</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Driver Mobile App, GPS & Proofs</div>
              </div>
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.74rem', fontWeight: 600 }}>
                Launch &rarr;
              </span>
            </button>

            {/* Executive Director */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '9px 12px', fontSize: '0.82rem' }}
              onClick={() => handleQuickLogin('director@company.com', 'director123')}
              disabled={loading}
            >
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600 }}>Executive Director</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Operations Performance & SLA Analytics</div>
              </div>
              <span style={{ color: 'var(--accent-primary)', fontSize: '0.74rem', fontWeight: 600 }}>
                Launch &rarr;
              </span>
            </button>
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
                fontSize: '0.78rem',
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
    </div>
  );
};
