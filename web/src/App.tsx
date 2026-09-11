import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { User } from './types';
import { LoginView } from './views/LoginView';
import { DriverView } from './views/DriverView';
import { ManagerView } from './views/ManagerView';
import { Smartphone, Monitor, Sun, Moon } from 'lucide-react';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulatedRole, setSimulatedRole] = useState<'DRIVER' | 'MANAGER' | null>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    return (localStorage.getItem('truck_tracker_theme') as 'dark' | 'light') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('truck_tracker_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
    return (
      <LoginView
        onLoginSuccess={handleLoginSuccess}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  // Active view: either real user role or simulated view for convenient QA testing
  const activeRole = simulatedRole || currentUser.role;

  return (
    <div>
      {/* Floating Executive Demo Mode Switcher Bar */}
      <div
        style={{
          position: 'fixed',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          backgroundColor: 'var(--bg-surface)',
          backdropFilter: 'blur(12px)',
          border: '1px solid var(--accent-gold)',
          borderRadius: 'var(--radius-full)',
          padding: '6px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.4)',
          fontSize: '0.8rem',
          maxWidth: 'calc(100vw - 24px)',
          overflowX: 'auto',
          whiteSpace: 'nowrap'
        }}
      >
        <span style={{ color: 'var(--accent-gold)', fontWeight: 700, letterSpacing: '0.03em', display: 'flex', alignItems: 'center', gap: '5px' }}>
          <span>🌟</span> Demo <span style={{ fontSize: '0.65rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(212, 168, 83, 0.2)', border: '1px solid rgba(212, 168, 83, 0.4)' }}>v1.0.0</span>:
        </span>
        <button
          onClick={() => setSimulatedRole('MANAGER')}
          style={{
            background: activeRole === 'MANAGER' ? 'var(--accent-gold)' : 'transparent',
            color: activeRole === 'MANAGER' ? '#0e1013' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '5px 12px',
            cursor: 'pointer',
            fontWeight: activeRole === 'MANAGER' ? 700 : 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <Monitor size={14} /> Operations Command
        </button>

        <button
          onClick={() => setSimulatedRole('DRIVER')}
          style={{
            background: activeRole === 'DRIVER' ? 'var(--accent-gold)' : 'transparent',
            color: activeRole === 'DRIVER' ? '#0e1013' : 'var(--text-secondary)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '5px 12px',
            cursor: 'pointer',
            fontWeight: activeRole === 'DRIVER' ? 700 : 500,
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
        >
          <Smartphone size={14} /> Driver Mobile App
        </button>

        <div style={{ height: '16px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'transparent',
            color: 'var(--accent-gold)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '4px 8px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={13} /> : <Moon size={13} />}
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
      </div>

      {activeRole === 'DRIVER' ? (
        <DriverView
          currentUser={currentUser}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSwitchRole={(role) => setSimulatedRole(role)}
        />
      ) : (
        <ManagerView
          currentUser={currentUser}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
          onSwitchRole={(role) => setSimulatedRole(role)}
        />
      )}
    </div>
  );
};

export default App;
