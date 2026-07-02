import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App.jsx';
import api from '../api.js';

function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [dismissed, setDismissed] = useState(() => {
    try { return JSON.parse(localStorage.getItem('vh_dismissed') || '[]'); } catch { return []; }
  });
  const ref = useRef();

  useEffect(() => {
    api.get('/api/notifications').then(d => setAlerts(d || [])).catch(() => {});
    const t = setInterval(() => {
      api.get('/api/notifications').then(d => setAlerts(d || [])).catch(() => {});
    }, 5 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const visible = alerts.filter(a => !dismissed.includes(a.id));
  const critical = visible.filter(a => a.severity === 'critical').length;
  const count = visible.length;

  function dismiss(id) {
    const next = [...dismissed, id];
    setDismissed(next);
    localStorage.setItem('vh_dismissed', JSON.stringify(next));
  }

  function dismissAll() {
    const next = [...dismissed, ...visible.map(a => a.id)];
    setDismissed(next);
    localStorage.setItem('vh_dismissed', JSON.stringify(next));
    setOpen(false);
  }

  const SCOLOR = { critical: '#E74C3C', warning: '#F39C12', info: '#29ABE2' };
  const SBG = { critical: '#FFF5F5', warning: '#FFFBF0', info: '#F0F8FF' };

  return (
    <div ref={ref} style={{ position: 'relative', marginRight: 8 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{ position: 'relative', background: 'none', border: 'none', cursor: 'pointer', padding: '6px 8px', borderRadius: 8, display: 'flex', alignItems: 'center' }}
        title="Notifications"
      >
        <span style={{ fontSize: 20 }}>🔔</span>
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 2, right: 2, minWidth: 18, height: 18,
            background: critical > 0 ? '#E74C3C' : '#F39C12',
            color: '#fff', borderRadius: 9, fontSize: 10, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
          }}>
            {count > 99 ? '99+' : count}
          </span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: '110%', width: 360, maxHeight: 480,
          background: '#fff', borderRadius: 10, boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
          border: '1px solid #E8ECF0', zIndex: 300, overflow: 'hidden', display: 'flex', flexDirection: 'column',
        }}>
          <div style={{ padding: '14px 16px', borderBottom: '1px solid #F0F0F0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1C3C6E' }}>Alerts {count > 0 && <span style={{ background: '#E74C3C', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{count}</span>}</div>
            {count > 0 && <button onClick={dismissAll} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer' }}>Clear all</button>}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {visible.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                All clear! No alerts.
              </div>
            ) : (
              visible.map(a => (
                <div key={a.id} style={{ padding: '12px 16px', borderBottom: '1px solid #F8F8F8', background: SBG[a.severity], display: 'flex', gap: 10 }}>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { navigate(a.link); setOpen(false); }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: SCOLOR[a.severity], marginBottom: 2 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.4 }}>{a.message}</div>
                  </div>
                  <button onClick={() => dismiss(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#bbb', fontSize: 14, flexShrink: 0, alignSelf: 'flex-start' }}>✕</button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function Header({ title }) {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef();

  useEffect(() => {
    function handler(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    try { await api.post('/api/auth/logout'); } catch {}
    setUser(null);
    navigate('/login');
  };

  const initials = user ? user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <div style={{
      height: 60,
      background: '#fff',
      borderBottom: '1px solid #E8ECF0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'sticky',
      top: 0,
      zIndex: 50,
    }}>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 20, color: '#1C3C6E' }}>{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <NotificationBell />

        <div ref={menuRef} style={{ position: 'relative' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, background: '#F5F6FA' }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1C3C6E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3C6E' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{user?.group?.name || 'User'}</div>
            </div>
            <span style={{ color: '#888', fontSize: 12 }}>▾</span>
          </div>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '110%', background: '#fff', borderRadius: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 180, zIndex: 200,
              border: '1px solid #E8ECF0', overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F0F0' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3C6E' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: '#888' }}>{user?.email}</div>
              </div>
              <div
                style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: '#333', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={() => { navigate('/help'); setMenuOpen(false); }}
                onMouseEnter={e => e.currentTarget.style.background = '#F5F6FA'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>❓</span> Help & Guide
              </div>
              <div
                style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: '#E74C3C', display: 'flex', alignItems: 'center', gap: 8 }}
                onClick={handleLogout}
                onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>⎋</span> Sign Out
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
