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
  const [hoveredPath, setHoveredPath] = useState(null);

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

  const NavItem = ({ item, delay = 0 }) => {
    const active = isActive(item.path);
    const hovered = hoveredPath === item.path;
    return (
      <div
        className="nav-item"
        onClick={() => navigate(item.path)}
        onMouseEnter={() => setHoveredPath(item.path)}
        onMouseLeave={() => setHoveredPath(null)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 16px', cursor: 'pointer', borderRadius: 8,
          margin: '2px 10px',
          color: active ? '#fff' : 'rgba(255,255,255,0.72)',
          background: active
            ? 'linear-gradient(135deg, rgba(41,171,226,0.35) 0%, rgba(41,171,226,0.15) 100%)'
            : hovered ? 'rgba(255,255,255,0.08)' : 'transparent',
          borderLeft: active ? '3px solid #29ABE2' : '3px solid transparent',
          fontWeight: active ? 600 : 400,
          fontSize: 13.5,
          boxShadow: active ? '0 2px 12px rgba(41,171,226,0.2)' : 'none',
          animationDelay: `${delay}ms`,
        }}
      >
        <span style={{ fontSize: 16, flexShrink: 0, filter: active ? 'drop-shadow(0 0 4px rgba(41,171,226,0.8))' : 'none', transition: 'filter 0.2s' }}>{item.icon}</span>
        <span style={{ flex: 1 }}>{item.label}</span>
        {item.path === '/approvals' && pendingApprovals > 0 && (
          <span className="badge-pop" style={{ background: '#E74C3C', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 10, fontWeight: 700 }}>{pendingApprovals}</span>
        )}
        {active && <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#29ABE2', boxShadow: '0 0 8px #29ABE2', flexShrink: 0 }} />}
      </div>
    );
  };

  return (
    <div style={{
      width: 240, minWidth: 240,
      background: 'linear-gradient(180deg, #0F2447 0%, #1C3C6E 40%, #1a3a6a 100%)',
      height: '100vh', display: 'flex', flexDirection: 'column',
      position: 'fixed', top: 0, left: 0, zIndex: 100, overflowY: 'auto',
      boxShadow: '4px 0 24px rgba(0,0,0,0.25)',
    }}>
      {/* Logo */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div className="sidebar-logo" style={{
            width: 44, height: 44, borderRadius: 12,
            background: 'linear-gradient(135deg, #29ABE2 0%, #1C8FC4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 18, color: '#fff',
            flexShrink: 0, boxShadow: '0 4px 16px rgba(41,171,226,0.5)',
          }}>VH</div>
          <div>
            <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 16, color: '#fff', letterSpacing: '-0.3px' }}>VendorHub</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 1, letterSpacing: '0.05em' }}>LRS Services Pvt Ltd</div>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav style={{ flex: 1, paddingTop: 10 }} className="anim-slideLeft">
        {NAV_ITEMS.map((item, i) => <NavItem key={item.path} item={item} delay={i * 40} />)}

        {isAdmin && (
          <>
            <div style={{ padding: '14px 18px 5px', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              Administration
            </div>
            {ADMIN_ITEMS.map((item, i) => <NavItem key={item.path} item={item} delay={NAV_ITEMS.length * 40 + i * 30} />)}
          </>
        )}

        <div style={{ padding: isAdmin ? '8px 18px 5px' : '14px 18px 5px', fontSize: 10, color: 'rgba(255,255,255,0.3)', fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
          Support
        </div>
        <NavItem item={{ path: '/help', label: 'Help & Guide', icon: '❓' }} />
      </nav>

      {/* User + Dark Mode */}
      {user && (
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.15)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: 'linear-gradient(135deg, #29ABE2, #1C8FC4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
              boxShadow: '0 2px 8px rgba(41,171,226,0.4)',
            }}>
              {user.name ? user.name[0].toUpperCase() : 'U'}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user.name}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.45)' }}>{isAdmin ? 'Administrator' : (user.group?.name || 'User')}</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', letterSpacing: '0.04em' }}>VendorHub v1.0.0</div>
            <button
              onClick={toggleDark}
              title={dark ? 'Light Mode' : 'Dark Mode'}
              style={{
                background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.15)',
                borderRadius: 20, padding: '3px 10px', cursor: 'pointer', fontSize: 14,
                color: '#fff', lineHeight: 1, transition: 'background 0.2s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            >
              {dark ? '☀️' : '🌙'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
