import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { User } from './types';
import { LoginView } from './views/LoginView';
import { DriverView } from './views/DriverView';
import { ManagerView } from './views/ManagerView';
import { Smartphone, Monitor } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRole] = useState<'DRIVER' | 'MANAGER' | null>(null);

  useEffect(() => {
    checkCurrentSession();
  }, []);

  const checkCurrentSession = async () => {
    const token = localStorage.getItem('truck_tracker_token');
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const data = await api.auth.getMe();
      setCurrentUser(data.user);
    } catch {
      localStorage.removeItem('truck_tracker_token');
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    setSimulatedRole(null);
  };

  const handleLogout = () => {
    localStorage.removeItem('truck_tracker_token');
    setCurrentUser(null);
    setSimulatedRole(null);
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: 'var(--bg-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--accent-gold)'
        }}
      >
        Initializing TruckTracker Operations...
      </div>
    );
  }

  if (!currentUser) {
    return <LoginView onLoginSuccess={handleLoginSuccess} />;
  }

  // Active view: either real user role or simulated view for convenient QA testing
  const activeRole = simulatedRole || currentUser.role;

  return (
    <div>
      {/* Floating QA Role Switcher Pill */}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          zIndex: 999,
          backgroundColor: 'rgba(14, 16, 19, 0.92)',
          backdropFilter: 'blur(10px)',
          border: '1px solid var(--accent-gold-border)',
          borderRadius: 'var(--radius-full)',
          padding: '4px 10px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: 'var(--shadow-md)',
          fontSize: '0.75rem'
        }}
      >
        <span style={{ color: 'var(--text-muted)' }}>QA Role View:</span>
        <button
          onClick={() => setSimulatedRole('DRIVER')}
          style={{
            background: activeRole === 'DRIVER' ? 'var(--accent-gold)' : 'transparent',
            color: activeRole === 'DRIVER' ? '#0e1013' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '3px 8px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Smartphone size={12} /> Driver (Mobile)
        </button>

        <button
          onClick={() => setSimulatedRole('MANAGER')}
          style={{
            background: activeRole === 'MANAGER' ? 'var(--accent-gold)' : 'transparent',
            color: activeRole === 'MANAGER' ? '#0e1013' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '3px 8px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <Monitor size={12} /> Manager (Desktop)
        </button>
      </div>

      {activeRole === 'DRIVER' ? (
        <DriverView currentUser={currentUser} onLogout={handleLogout} />
      ) : (
        <ManagerView currentUser={currentUser} onLogout={handleLogout} />
      )}
    </div>
  );
};

export default App;
