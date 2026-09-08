import React, { useState } from 'react';
import { Truck, ShieldCheck, ArrowRight, Lock, Mail } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface Props {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginView: React.FC<Props> = ({ onLoginSuccess }) => {
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
        padding: '20px'
      }}
    >
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
          <div style={{ fontSize: '0.8rem', color: 'var(--accent-gold)', letterSpacing: '0.05em', fontWeight: 600, marginTop: '2px' }}>
            INTERNAL FLEET LOGISTICS
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
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px', textAlign: 'center' }}>
            Instant Demo Sign-In
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '0.82rem' }}
              onClick={() => setDemoCredentials('manager@company.com', 'manager123')}
            >
              <span>👔 Operations Manager (Desktop View)</span>
              <span style={{ color: 'var(--accent-gold)' }}>manager123</span>
            </button>

            <button
              type="button"
              className="btn btn-secondary"
              style={{ justifyContent: 'space-between', padding: '10px 14px', fontSize: '0.82rem' }}
              onClick={() => setDemoCredentials('rahul@company.com', 'driver123')}
            >
              <span>🚛 Driver Rahul (Mobile View)</span>
              <span style={{ color: 'var(--accent-gold)' }}>driver123</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
