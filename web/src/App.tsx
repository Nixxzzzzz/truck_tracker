import React, { useState, useEffect } from 'react';
import { api } from './services/api';
import { User } from './types';
import { LoginView } from './views/LoginView';
import { DriverView } from './views/DriverView';
import { ManagerView } from './views/ManagerView';

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
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px'
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--accent-primary)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 800,
            fontSize: '1rem',
            fontFamily: 'var(--font-display)',
            boxShadow: 'var(--shadow-sm)'
          }}
        >
          TT
        </div>
        <div style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', fontWeight: 500 }}>
          Initializing TruckTracker Operations...
        </div>
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
