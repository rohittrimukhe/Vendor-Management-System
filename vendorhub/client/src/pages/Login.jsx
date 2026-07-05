import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function Login({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [branding, setBranding] = useState({ company_name: 'VendorHub', logo_url: null });

  useEffect(() => {
    fetch('/api/branding')
      .then(r => r.json())
      .then(d => setBranding({ company_name: d.company_name || 'VendorHub', logo_url: d.logo_url || null }))
      .catch(() => {});
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.username || !form.password) { setError('Please enter username and password'); return; }
    setLoading(true);
    setError('');
    try {
      const user = await api.post('/api/auth/login', form);
      onLogin(user);
      navigate('/');
    } catch (err) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: '100%', padding: '12px 14px', border: '1px solid #DDE2E8', borderRadius: 8,
    fontSize: 15, outline: 'none', transition: 'border-color 0.2s', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>
      {/* Left branding panel */}
      <div style={{
        width: '42%', background: '#1C3C6E',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
      }}>
        {/* Logo or plain name */}
        {branding.logo_url ? (
          <img
            src={branding.logo_url}
            alt={branding.company_name}
            style={{
              maxWidth: 200,
              maxHeight: 120,
              width: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
              marginBottom: 28,
              borderRadius: 10,
            }}
            onError={e => { e.currentTarget.style.display = 'none'; }}
          />
        ) : (
          /* No logo uploaded — white text placeholder */
          <div style={{
            fontSize: 48, fontWeight: 700, fontFamily: 'Montserrat, sans-serif',
            color: '#fff', letterSpacing: -1, marginBottom: 28, opacity: 0.9,
          }}>
            {branding.company_name.slice(0, 2).toUpperCase()}
          </div>
        )}

        <h1 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 26, color: '#fff', marginBottom: 10, textAlign: 'center' }}>
          {branding.company_name}
        </h1>
        <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 1.6 }}>
          Vendor Management System
        </p>
        <div style={{ width: 48, height: 2, background: '#29ABE2', marginBottom: 24 }} />
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center' }}>LRS Services Pvt Ltd</p>

        <div style={{ marginTop: 'auto', paddingTop: 40 }}>
          <div style={{ display: 'flex', gap: 20, color: 'rgba(255,255,255,0.3)', fontSize: 12 }}>
            <span>Secure</span><span>•</span><span>Reliable</span><span>•</span><span>v1.0</span>
          </div>
        </div>
      </div>

      {/* Right sign-in panel */}
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F6FA' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: '48px 40px', width: '100%', maxWidth: 420, boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 24, color: '#1C3C6E', marginBottom: 8 }}>Sign In</h2>
          <p style={{ color: '#888', fontSize: 14, marginBottom: 32 }}>Enter your credentials to access {branding.company_name}</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>Username</label>
              <input
                style={inputStyle}
                type="text"
                placeholder="Enter username"
                value={form.username}
                onChange={e => setForm({ ...form, username: e.target.value })}
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 6 }}>Password</label>
              <input
                style={inputStyle}
                type="password"
                placeholder="Enter password"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
              />
            </div>

            {error && (
              <div style={{ background: '#FFF5F5', border: '1px solid #FED7D7', borderRadius: 6, padding: '10px 14px', marginBottom: 20, color: '#C53030', fontSize: 13 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '13px', background: loading ? '#7A9CC6' : '#1C3C6E',
                color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600,
                cursor: loading ? 'wait' : 'pointer', transition: 'background 0.2s',
              }}
            >
              {loading ? 'Signing in...' : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
