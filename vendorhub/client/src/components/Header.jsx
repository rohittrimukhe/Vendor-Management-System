import React, { useState, useContext, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const inp = { width: '100%', padding: '9px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' };

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
            <div style={{ fontWeight: 700, fontSize: 14, color: NAVY }}>Alerts {count > 0 && <span style={{ background: '#E74C3C', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>{count}</span>}</div>
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

function ProfileModal({ user, onClose, onUpdated }) {
  const [form, setForm] = useState({ name: user?.name || '', email: user?.email || '' });
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [tab, setTab] = useState('profile');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const setPwdF = (k, v) => setPwd(p => ({ ...p, [k]: v }));

  const saveProfile = async () => {
    setSaving(true); setMsg(null);
    try {
      const body = { name: form.name, email: form.email };
      if (tab === 'password') {
        if (pwd.next !== pwd.confirm) { setMsg({ ok: false, text: 'New passwords do not match' }); setSaving(false); return; }
        if (pwd.next.length < 6) { setMsg({ ok: false, text: 'Password must be at least 6 characters' }); setSaving(false); return; }
        body.currentPassword = pwd.current;
        body.newPassword = pwd.next;
      }
      const data = await api.put('/api/auth/profile', body);
      onUpdated(data);
      setMsg({ ok: true, text: tab === 'password' ? 'Password changed successfully.' : 'Profile updated.' });
      if (tab === 'password') setPwd({ current: '', next: '', confirm: '' });
    } catch (e) {
      setMsg({ ok: false, text: e.message });
    }
    setSaving(false);
  };

  const tabBtn = (id, label) => (
    <button onClick={() => { setTab(id); setMsg(null); }} style={{
      padding: '8px 18px', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
      borderBottom: tab === id ? `2px solid ${NAVY}` : '2px solid transparent',
      color: tab === id ? NAVY : '#888', background: 'none',
    }}>{label}</button>
  );

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 14, width: 420, maxWidth: '95vw', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 16, fontWeight: 700 }}>
                {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: NAVY }}>{user?.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>{user?.group?.name || 'User'}</div>
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#bbb', lineHeight: 1, padding: '4px 8px' }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid #EEE', padding: '0 16px', marginTop: 12 }}>
          {tabBtn('profile', '👤 Profile')}
          {tabBtn('password', '🔑 Password')}
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px 24px' }}>
          {tab === 'profile' && (
            <>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Full Name</label>
                <input style={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Your full name" />
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Email Address</label>
                <input style={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@company.com" />
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                  Used for system alert emails and notifications sent to your inbox.
                </div>
              </div>
              <div style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Username</label>
                <input style={{ ...inp, background: '#F8FAFC', color: '#aaa' }} value={user?.username || ''} disabled />
                <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Username cannot be changed.</div>
              </div>
            </>
          )}

          {tab === 'password' && (
            <>
              <div style={{ background: '#F0F8FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#1d4ed8' }}>
                ℹ️ Enter your current password to confirm your identity, then choose a new one.
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Current Password</label>
                <input style={inp} type="password" value={pwd.current} onChange={e => setPwdF('current', e.target.value)} placeholder="••••••••" />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>New Password</label>
                <input style={inp} type="password" value={pwd.next} onChange={e => setPwdF('next', e.target.value)} placeholder="At least 6 characters" />
              </div>
              <div style={{ marginBottom: 0 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 4 }}>Confirm New Password</label>
                <input style={inp} type="password" value={pwd.confirm} onChange={e => setPwdF('confirm', e.target.value)} placeholder="Repeat new password" />
              </div>
            </>
          )}

          {msg && (
            <div style={{ marginTop: 14, padding: '9px 12px', borderRadius: 6, background: msg.ok ? '#F0FFF4' : '#FFF5F5', border: `1px solid ${msg.ok ? '#A3E4B8' : '#FFCDD2'}`, fontSize: 13, color: msg.ok ? '#27AE60' : '#E74C3C', fontWeight: 600 }}>
              {msg.ok ? '✓ ' : '✗ '}{msg.text}
            </div>
          )}

          <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '9px 20px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555', fontWeight: 600 }}>Cancel</button>
            <button onClick={saveProfile} disabled={saving} style={{ padding: '9px 22px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
              {saving ? 'Saving...' : tab === 'password' ? 'Change Password' : 'Save Profile'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Header({ title }) {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  const menuItem = (icon, label, onClick, danger) => (
    <div
      style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 14, color: danger ? '#E74C3C' : '#333', display: 'flex', alignItems: 'center', gap: 8 }}
      onClick={onClick}
      onMouseEnter={e => e.currentTarget.style.background = danger ? '#FFF5F5' : '#F5F6FA'}
      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
    >
      <span>{icon}</span> {label}
    </div>
  );

  return (
    <div style={{
      height: 60, background: '#fff', borderBottom: '1px solid #E8ECF0',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px', position: 'sticky', top: 0, zIndex: 50,
    }}>
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 20, color: NAVY }}>{title}</h1>

      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <NotificationBell />

        <div ref={menuRef} style={{ position: 'relative' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, background: '#F5F6FA' }}
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 13, fontWeight: 600 }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{user?.group?.name || 'User'}</div>
            </div>
            <span style={{ color: '#888', fontSize: 12 }}>▾</span>
          </div>

          {menuOpen && (
            <div style={{
              position: 'absolute', right: 0, top: '110%', background: '#fff', borderRadius: 8,
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 210, zIndex: 200,
              border: '1px solid #E8ECF0', overflow: 'hidden',
            }}>
              <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F0F0' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{user?.name}</div>
                <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>{user?.email || <span style={{ fontStyle: 'italic', color: '#bbb' }}>No email set</span>}</div>
              </div>
              {menuItem('👤', 'My Profile', () => { setProfileOpen(true); setMenuOpen(false); })}
              {menuItem('❓', 'Help & Guide', () => { navigate('/help'); setMenuOpen(false); })}
              <div style={{ borderTop: '1px solid #F0F0F0', marginTop: 4 }} />
              {menuItem('⎋', 'Sign Out', handleLogout, true)}
            </div>
          )}
        </div>
      </div>

      {profileOpen && (
        <ProfileModal
          user={user}
          onClose={() => setProfileOpen(false)}
          onUpdated={(updated) => {
            setUser(prev => ({ ...prev, ...updated }));
            setProfileOpen(false);
          }}
        />
      )}
    </div>
  );
}
