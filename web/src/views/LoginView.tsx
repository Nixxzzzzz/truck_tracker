import React, { useState } from 'react';
import { Truck, ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react';
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

  const setDemoCredentials = (e: string, p: string) => {
    setEmail(e);
    setPassword(p);
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        position: 'relative'
      }}
    >
      {onToggleTheme && (
        <div style={{ position: 'absolute', top: '24px', right: '24px' }}>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} showLabel />
        </div>
      )}
      <div
        className="card card-gold-border"
        style={{
          maxWidth: '440px',
          width: '100%',
          padding: '36px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: '24px'
        }}
      >
        {/* Brand Header */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: 'var(--accent-gold)',
              color: '#0d0e11',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
              fontWeight: 800,
              fontSize: '1.4rem',
              boxShadow: 'var(--shadow-gold)'
            }}
          >
            TT
          </div>
          <h1 style={{ fontSize: '1.6rem', letterSpacing: '-0.02em', fontFamily: 'var(--font-display)' }}>
            TruckTracker
          </h1>
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', letterSpacing: '0.05em', fontWeight: 600, marginTop: '2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <span>INTERNAL FLEET LOGISTICS</span>
            <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(212, 168, 83, 0.2)', border: '1px solid rgba(212, 168, 83, 0.3)' }}>
              v1.0.0
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              padding: '12px',
              backgroundColor: 'var(--status-danger-bg)',
              color: 'var(--status-danger)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem'
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
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
            className="btn btn-primary btn-large"
            style={{ width: '100%', marginTop: '8px' }}
            disabled={loading}
          >
            {loading ? 'Authenticating...' : 'Sign In to Operations'} <ArrowRight size={16} />
          </button>
        </form>

        {/* Quick Demo Access Credentials */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600 }}>
              Live Demonstration Profiles
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--accent-gold)', fontWeight: 600 }}>
              ⚡ 1-Click Launch
            </span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '9px' }}>
            {/* Executive Director All-Access Demo */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{
                justifyContent: 'space-between',
                padding: '11px 14px',
                fontSize: '0.82rem',
                border: '1px solid var(--accent-gold)',
                backgroundColor: 'rgba(212, 168, 83, 0.08)'
              }}
              onClick={() => handleQuickLogin('director@company.com', 'director123')}
              disabled={loading}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                <span style={{ fontSize: '1.1rem' }}>🌟</span>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--accent-gold)' }}>Executive Director (All-Access)</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Corporate Logistics & KPI Overview</div>
                </div>
              </div>
              <span style={{
                fontSize: '0.7rem',
                backgroundColor: 'var(--accent-gold)',
                color: '#0e1013',
                padding: '3px 8px',
                borderRadius: 'var(--radius-sm)',
                fontWeight: 700,
                letterSpacing: '0.02em'
              }}>
                ENTER
              </span>
            </button>

            {/* Operations Manager Demo */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '0.82rem' }}
              onClick={() => handleQuickLogin('manager@company.com', 'manager123')}
              disabled={loading}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                <span style={{ fontSize: '1rem' }}>👔</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Operations Dispatch Manager</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Fleet Management & Route Dispatch</div>
                </div>
              </div>
              <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 600 }}>
                1-Click
              </span>
            </button>

            {/* Field Senior Driver Demo */}
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '0.82rem' }}
              onClick={() => handleQuickLogin('rahul@company.com', 'driver123')}
              disabled={loading}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', textAlign: 'left' }}>
                <span style={{ fontSize: '1rem' }}>🚛</span>
                <div>
                  <div style={{ fontWeight: 600 }}>Senior Driver (Delhi-Noida Route)</div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Mobile Proofs & Live Stop Progress</div>
                </div>
              </div>
              <span style={{ color: 'var(--accent-gold)', fontSize: '0.75rem', fontWeight: 600 }}>
                1-Click
              </span>
            </button>
          </div>

          {/* Android Mobile App Direct APK Link */}
          <div style={{ textAlign: 'center', marginTop: '16px' }}>
            <a
              href="https://github.com/Nixxzzzzz/truck_tracker/releases/download/v1.0.0/TruckTracker-v1.0.0.apk"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '0.78rem',
                color: 'var(--accent-gold)',
                borderColor: 'rgba(212, 168, 83, 0.35)',
                padding: '8px 16px',
                textDecoration: 'none',
                borderRadius: 'var(--radius-full)',
                width: '100%',
                justifyContent: 'center'
              }}
            >
              <span>🤖</span> Download Android Driver App (v1.0.0 APK)
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
