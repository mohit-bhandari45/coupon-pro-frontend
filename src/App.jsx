import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LandingPage from './components/LandingPage';
import Dashboard from './components/Dashboard';
import AuthPage from './components/AuthPage';
import CustomerEntry from './components/CustomerEntry';

function App() {
  const [token, setToken] = useState(() => localStorage.getItem('ownerToken') || '');
  const [cafe, setCafe] = useState(() => {
    const savedCafe = localStorage.getItem('ownerCafe');
    try {
      return savedCafe ? JSON.parse(savedCafe) : null;
    } catch {
      return null;
    }
  });

  // Sync token validation state with backend if needed
  useEffect(() => {
    if (token) {
      fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(res => {
          if (!res.ok) {
            throw new Error('Session expired');
          }
          return res.json();
        })
        .then(data => {
          if (data.success) {
            setCafe(data.cafe);
            localStorage.setItem('ownerCafe', JSON.stringify(data.cafe));
          }
        })
        .catch(() => {
          // Clear expired/invalid session
          localStorage.removeItem('ownerToken');
          localStorage.removeItem('ownerCafe');
          setToken('');
          setCafe(null);
        });
    }
  }, [token]);

  const handleAuthSuccess = (cafeData, tokenData) => {
    setCafe(cafeData);
    setToken(tokenData);
  };

  const handleLogout = () => {
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('ownerCafe');
    setToken('');
    setCafe(null);
  };

  const handleUpdateCafe = (updatedCafe) => {
    setCafe(updatedCafe);
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />

        <Route
          path="/auth"
          element={
            <AuthPage onAuthSuccess={handleAuthSuccess} />
          }
        />

        <Route
          path="/dashboard"
          element={
            <Dashboard
              cafe={cafe}
              token={token}
              onLogout={handleLogout}
              onUpdateCafe={handleUpdateCafe}
            />
          }
        />

        <Route
          path="/:slug"
          element={<CustomerEntry />}
        />
      </Routes>
    </Router>
  );
}

export default App;
