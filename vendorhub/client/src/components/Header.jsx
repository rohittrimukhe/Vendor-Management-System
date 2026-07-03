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
  const SICON = { critical: '🚨', warning: '⚠️', info: 'ℹ️' };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        className="btn-press"
        style={{
          position: 'relative', background: open ? '#EEF9FF' : 'transparent',
          border: '1px solid', borderColor: open ? '#29ABE2' : '#E8ECF0',
          cursor: 'pointer', padding: '8px 10px', borderRadius: 10,
          display: 'flex', alignItems: 'center', transition: 'all 0.2s',
        }}
        title="Notifications"
      >
        <span style={{ fontSize: 18 }}>🔔</span>
        {count > 0 && (
          <span className="badge-pop" style={{
            position: 'absolute', top: 4, right: 4, minWidth: 16, height: 16,
            background: critical > 0
              ? 'linear-gradient(135deg, #E74C3C, #C0392B)'
              : 'linear-gradient(135deg, #F39C12, #E67E22)',
            color: '#fff', borderRadius: 8, fontSize: 9, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 3px',
            boxShadow: critical > 0 ? '0 2px 6px rgba(231,76,60,0.5)' : '0 2px 6px rgba(243,156,18,0.5)',
          }}>
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="anim-scaleIn" style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 380, maxHeight: 500,
          background: '#fff', borderRadius: 14, boxShadow: '0 8px 40px rgba(0,0,0,0.16)',
          border: '1px solid #E8ECF0', zIndex: 300, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          transformOrigin: 'top right',
        }}>
          <div style={{ padding: '14px 18px', borderBottom: '1px solid #F0F4F8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #F8FAFC, #fff)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#1C3C6E', display: 'flex', alignItems: 'center', gap: 8 }}>
              Alerts
              {count > 0 && <span style={{ background: 'linear-gradient(135deg, #E74C3C, #C0392B)', color: '#fff', borderRadius: 10, padding: '1px 8px', fontSize: 11, boxShadow: '0 2px 6px rgba(231,76,60,0.3)' }}>{count}</span>}
            </div>
            {count > 0 && <button onClick={dismissAll} style={{ fontSize: 12, color: '#888', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 500 }}>Clear all</button>}
          </div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {visible.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
                <div style={{ fontWeight: 600, color: '#27AE60', marginBottom: 4 }}>All clear!</div>
                <div style={{ fontSize: 12 }}>No alerts right now.</div>
              </div>
            ) : (
              visible.map((a, i) => (
                <div key={a.id} className="anim-fadeIn" style={{
                  padding: '12px 18px', borderBottom: '1px solid #F8F8F8',
                  background: SBG[a.severity], display: 'flex', gap: 12, alignItems: 'flex-start',
                  animationDelay: `${i * 40}ms`,
                }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>{SICON[a.severity]}</span>
                  <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => { navigate(a.link); setOpen(false); }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: SCOLOR[a.severity], marginBottom: 3 }}>{a.title}</div>
                    <div style={{ fontSize: 12, color: '#555', lineHeight: 1.5 }}>{a.message}</div>
                  </div>
                  <button onClick={() => dismiss(a.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 16, flexShrink: 0, lineHeight: 1, padding: 0, transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#888'}
                    onMouseLeave={e => e.currentTarget.style.color = '#ccc'}
                  >✕</button>
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
  const colors = ['#1C3C6E', '#29ABE2', '#27AE60', '#8E44AD', '#E67E22', '#16A085'];
  const avatarColor = colors[(user?.name?.charCodeAt(0) || 0) % colors.length];

  return (
    <div style={{
      height: 64, background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(232,236,240,0.8)',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 28px', position: 'sticky', top: 0, zIndex: 50,
      boxShadow: '0 2px 16px rgba(28,60,110,0.06)',
    }}>
      <h1 className="gradient-text" style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 800, fontSize: 20, margin: 0, letterSpacing: '-0.3px' }}>{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <NotificationBell />

        <div ref={menuRef} style={{ position: 'relative' }}>
          <div
            className="btn-press"
            style={{
              display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer',
              padding: '6px 12px 6px 6px', borderRadius: 12,
              background: menuOpen ? '#F0F8FF' : '#F5F6FA',
              border: `1px solid ${menuOpen ? '#29ABE2' : '#E8ECF0'}`,
              transition: 'all 0.2s',
            }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div style={{
              width: 34, height: 34, borderRadius: '50%',
              background: `linear-gradient(135deg, ${avatarColor}, ${avatarColor}cc)`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 13, fontWeight: 700,
              boxShadow: `0 2px 8px ${avatarColor}55`,
            }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3C6E' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{user?.group?.name || 'User'}</div>
            </div>
            <span style={{ color: '#888', fontSize: 12, transition: 'transform 0.2s', transform: menuOpen ? 'rotate(180deg)' : 'none' }}>▾</span>
          </div>

          {menuOpen && (
            <div className="anim-scaleIn" style={{
              position: 'absolute', right: 0, top: 'calc(100% + 8px)',
              background: '#fff', borderRadius: 12,
              boxShadow: '0 8px 32px rgba(0,0,0,0.14)', minWidth: 200, zIndex: 200,
              border: '1px solid #E8ECF0', overflow: 'hidden', transformOrigin: 'top right',
            }}>
              <div style={{ padding: '14px 18px', borderBottom: '1px solid #F0F4F8', background: 'linear-gradient(135deg, #F8FAFC, #fff)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: '#1C3C6E' }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{user?.email}</div>
              </div>
              {[
                { icon: '👤', label: 'Profile', action: () => {} },
                { icon: '❓', label: 'Help & Guide', action: () => { navigate('/help'); setMenuOpen(false); } },
              ].map(item => (
                <div key={item.label}
                  style={{ padding: '11px 18px', cursor: 'pointer', fontSize: 14, color: '#333', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s' }}
                  onClick={item.action}
                  onMouseEnter={e => e.currentTarget.style.background = '#F5F6FA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{item.icon}</span> {item.label}
                </div>
              ))}
              <div style={{ borderTop: '1px solid #F0F4F8' }}>
                <div
                  style={{ padding: '11px 18px', cursor: 'pointer', fontSize: 14, color: '#E74C3C', display: 'flex', alignItems: 'center', gap: 10, transition: 'background 0.15s' }}
                  onClick={handleLogout}
                  onMouseEnter={e => e.currentTarget.style.background = '#FFF5F5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>⎋</span> Sign Out
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
