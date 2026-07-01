import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../App.jsx';
import api from '../api.js';

export default function Header({ title }) {
  const { user, setUser } = useContext(AuthContext);
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

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

      <div style={{ position: 'relative' }}>
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
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)', minWidth: 160, zIndex: 200,
            border: '1px solid #E8ECF0', overflow: 'hidden',
          }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid #F0F0F0' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1C3C6E' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: '#888' }}>{user?.email}</div>
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
  );
}
