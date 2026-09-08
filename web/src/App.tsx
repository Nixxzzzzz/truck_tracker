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
      {/* Floating QA Role & Theme Switcher Pill */}
      <div
        style={{
          position: 'fixed',
          bottom: '16px',
          left: '16px',
          zIndex: 999,
          backgroundColor: 'var(--bg-surface)',
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
        <span style={{ color: 'var(--text-muted)' }}>QA Role:</span>
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
          <Smartphone size={12} /> Driver
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
          <Monitor size={12} /> Manager
        </button>

        <div style={{ height: '14px', width: '1px', backgroundColor: 'var(--border-subtle)' }} />

        {/* Theme toggle in QA Pill */}
        <button
          onClick={toggleTheme}
          style={{
            background: 'transparent',
            color: 'var(--accent-gold)',
            border: 'none',
            borderRadius: 'var(--radius-full)',
            padding: '3px 8px',
            cursor: 'pointer',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={12} /> : <Moon size={12} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </div>

      {activeRole === 'DRIVER' ? (
        <DriverView
          currentUser={currentUser}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      ) : (
        <ManagerView
          currentUser={currentUser}
          onLogout={handleLogout}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
      )}
    </div>
  );
};

export default App;
