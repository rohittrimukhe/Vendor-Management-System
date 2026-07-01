import React, { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import api from './api.js';

import SetupWizard from './pages/SetupWizard.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import VendorList from './pages/VendorList.jsx';
import AddVendor from './pages/AddVendor.jsx';
import VendorDetail from './pages/VendorDetail.jsx';
import Users from './pages/Users.jsx';
import Groups from './pages/Groups.jsx';
import Permissions from './pages/Permissions.jsx';
import Backup from './pages/Backup.jsx';
import Help from './pages/Help.jsx';

export const AuthContext = createContext(null);

const LEVELS = ['None', 'Read', 'Edit', 'Full'];

export function useAuth() {
  return useContext(AuthContext);
}

function ProtectedRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#1C3C6E', fontFamily: 'Montserrat, sans-serif', fontSize: 18 }}>Loading VendorHub...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function AdminRoute({ children }) {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#1C3C6E', fontFamily: 'Montserrat, sans-serif', fontSize: 18 }}>Loading VendorHub...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/setup/status').then(d => setInitialized(d.initialized)).catch(() => setInitialized(true)),
      api.get('/api/auth/me').then(u => setUser(u)).catch(() => setUser(null))
    ]).finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', color: '#1C3C6E', fontFamily: 'Montserrat, sans-serif', fontSize: 18 }}>Loading VendorHub...</div>;

  if (initialized === false) {
    return (
      <Routes>
        <Route path="/setup" element={<SetupWizard onComplete={() => setInitialized(true)} />} />
        <Route path="*" element={<Navigate to="/setup" replace />} />
      </Routes>
    );
  }

  // Build a permission checker: isAdmin gets full access to everything
  function can(module, minLevel = 'Read') {
    if (!user) return false;
    if (user.isAdmin) return true;
    const perm = (user.permissions || []).find(p => p.module === module);
    const userLevel = perm ? perm.access_level : 'None';
    return LEVELS.indexOf(userLevel) >= LEVELS.indexOf(minLevel);
  }

  const authValue = { user, setUser, loading, can, isAdmin: user?.isAdmin || false };

  return (
    <AuthContext.Provider value={authValue}>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login onLogin={setUser} />} />
        <Route path="/setup" element={<Navigate to="/" replace />} />
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/vendors" element={<ProtectedRoute><VendorList /></ProtectedRoute>} />
        <Route path="/vendors/add" element={<ProtectedRoute><AddVendor /></ProtectedRoute>} />
        <Route path="/vendors/:id" element={<ProtectedRoute><VendorDetail /></ProtectedRoute>} />
        <Route path="/admin/users" element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="/admin/groups" element={<AdminRoute><Groups /></AdminRoute>} />
        <Route path="/admin/permissions" element={<AdminRoute><Permissions /></AdminRoute>} />
        <Route path="/admin/backup" element={<AdminRoute><Backup /></AdminRoute>} />
        <Route path="/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  );
}
