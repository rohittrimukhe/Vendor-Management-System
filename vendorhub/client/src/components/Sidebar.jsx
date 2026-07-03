import React, { useContext, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthContext, ThemeContext } from '../App.jsx';
import api from '../api.js';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '⊞' },
  { path: '/vendors', label: 'Vendors', icon: '🏢' },
  { path: '/vendors/compare', label: 'Compare Vendors', icon: '⚖' },
  { path: '/analytics', label: 'Spend Analytics', icon: '📈' },
  { path: '/tasks', label: 'My Tasks', icon: '✅' },
  { path: '/approvals', label: 'Approvals', icon: '🔖' },
];

const ADMIN_ITEMS = [
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/groups', label: 'Groups & Roles', icon: '🛡' },
  { path: '/admin/permissions', label: 'Permissions', icon: '🔑' },
  { path: '/admin/backup', label: 'Backup & Recovery', icon: '🗄' },
  { path: '/admin/audit', label: 'Audit Log', icon: '📋' },
  { path: '/admin/scoring', label: 'Scoring Criteria', icon: '📊' },
  { path: '/admin/custom-fields', label: 'Custom Fields', icon: '🧩' },
  { path: '/admin/update', label: 'System Update', icon: '🔄' },
  { path: '/admin/settings', label: 'Settings', icon: '⚙️' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useContext(AuthContext);
  const { dark, toggleDark } = useContext(ThemeContext);
  const isAdmin = auth?.isAdmin || false;
  const user = auth?.user;
  const [pendingApprovals, setPendingApprovals] = useState(0);

  useEffect(() => {
    if (!user) return;
    const poll = () => api.get('/api/approvals/pending').then(d => setPendingApprovals((d?.pendingForMe || []).length)).catch(() => {});
    poll();
    const timer = setInterval(poll, 60000);
    return () => clearInterval(timer);
  }, [user]);

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
    if (path === '/vendors') return location.pathname === '/vendors' || (location.pathname.startsWith('/vendors/') && !location.pathname.startsWith('/vendors/compare'));
    if (path === '/vendors/compare') return location.pathname === '/vendors/compare';
    return location.pathname.startsWith(path);
  };

  const itemStyle = (path) => ({
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 20px',
    cursor: 'pointer',
    borderRadius: 6,
    margin: '2px 8px',
    color: isActive(path) ? '#fff' : 'rgba(255,255,255,0.75)',
    background: isActive(path) ? 'rgba(41,171,226,0.25)' : 'transparent',
    borderLeft: isActive(path) ? '3px solid #29ABE2' : '3px solid transparent',
    fontWeight: isActive(path) ? 600 : 400,
    fontSize: 14,
    transition: 'all 0.15s',
    textDecoration: 'none',
  });

  return (
    <div style={{
      width: 240,
      minWidth: 240,
      background: '#1C3C6E',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 100,
      overflowY: 'auto',
    }}>
      {/* Logo */}
      <div style={{ padding: '24px 20px 20px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10, background: '#29ABE2',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 18, color: '#fff',
            flexShrink: 0,
          }}>VH</div>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 16, color: '#fff' }}>VendorHub</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.55)', marginTop: 1 }}>LRS Services Pvt Ltd</div>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav style={{ flex: 1, paddingTop: 12 }}>
        {NAV_ITEMS.map(item => (
          <div key={item.path} style={itemStyle(item.path)} onClick={() => navigate(item.path)}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span style={{ flex: 1 }}>{item.label}</span>
            {item.path === '/approvals' && pendingApprovals > 0 && (
              <span style={{ background: '#E74C3C', color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700, marginLeft: 4 }}>{pendingApprovals}</span>
            )}
          </div>
        ))}

        {isAdmin && (
          <>
            <div style={{ padding: '16px 20px 6px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Administration
            </div>
            {ADMIN_ITEMS.map(item => (
              <div key={item.path} style={itemStyle(item.path)} onClick={() => navigate(item.path)}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                <span>{item.label}</span>
              </div>
            ))}
          </>
        )}

        <div style={{ padding: isAdmin ? '8px 20px 6px' : '16px 20px 6px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Support
        </div>
        <div style={itemStyle('/help')} onClick={() => navigate('/help')}>
          <span style={{ fontSize: 16 }}>❓</span>
          <span>Help & Guide</span>
        </div>
      </nav>

      {/* User info + Footer */}
      {user && (
        <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#29ABE2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{isAdmin ? 'System Administrator' : (user.group?.name || 'User')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)' }}>VendorHub v1.0.0</div>
            <button onClick={toggleDark} title={dark ? 'Switch to Light Mode' : 'Switch to Dark Mode'} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontSize: 14, color: '#fff', lineHeight: 1 }}>
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
