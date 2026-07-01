import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: '⊞' },
  { path: '/vendors', label: 'Vendors', icon: '🏢' },
];

const ADMIN_ITEMS = [
  { path: '/admin/users', label: 'Users', icon: '👥' },
  { path: '/admin/groups', label: 'Groups & Roles', icon: '🛡' },
  { path: '/admin/permissions', label: 'Permissions', icon: '🔑' },
  { path: '/admin/backup', label: 'Backup & Recovery', icon: '🗄' },
  { path: '/help', label: 'Help & Guide', icon: '❓' },
];

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/') return location.pathname === '/';
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
            <span>{item.label}</span>
          </div>
        ))}

        <div style={{ padding: '16px 20px 6px', fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Administration
        </div>

        {ADMIN_ITEMS.map(item => (
          <div key={item.path} style={itemStyle(item.path)} onClick={() => navigate(item.path)}>
            <span style={{ fontSize: 16 }}>{item.icon}</span>
            <span>{item.label}</span>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid rgba(255,255,255,0.1)', fontSize: 11, color: 'rgba(255,255,255,0.35)' }}>
        VendorHub v1.0.0
      </div>
    </div>
  );
}
