import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

const STEPS = ['Welcome', 'System Check', 'Database', 'Organisation', 'Admin Account', 'Complete'];
const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

export default function SetupWizard({ onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState(null);
  const [dbDone, setDbDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [org, setOrg] = useState({ org_name: 'LRS Services Pvt Ltd', timezone: 'Asia/Kolkata', currency: 'INR', primary_domain: '' });
  const [admin, setAdmin] = useState({ admin_name: '', admin_email: '', admin_username: '', admin_password: '', admin_confirm: '' });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (step === 1) loadChecks();
  }, [step]);

  async function loadChecks() {
    setLoading(true);
    try {
      const data = await api.post('/api/setup/check');
      setChecks(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function initDb() {
    setLoading(true);
    setError('');
    try {
      // Tables are already created when server starts (db.js).
      // Just verify the server is reachable and mark step done.
      await api.get('/api/setup/status');
      setDbDone(true);
    } catch (e) {
      setError('Could not reach server: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  function validateAdmin() {
    const errs = {};
    if (!admin.admin_name) errs.admin_name = 'Full name required';
    if (!admin.admin_username) errs.admin_username = 'Username required';
    if (!admin.admin_password) errs.admin_password = 'Password required';
    if (admin.admin_password.length < 6) errs.admin_password = 'Min 6 characters';
    if (admin.admin_password !== admin.admin_confirm) errs.admin_confirm = 'Passwords do not match';
    setValidationErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleFinish() {
    if (!validateAdmin()) return;
    setLoading(true);
    setError('');
    try {
      await api.post('/api/setup/init', { ...org, ...admin });
      if (onComplete) onComplete();
      setStep(5);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = { width: '100%', padding: '10px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 14, outline: 'none' };
  const labelStyle = { fontSize: 13, fontWeight: 600, color: '#444', marginBottom: 4, display: 'block' };
  const errStyle = { color: '#E74C3C', fontSize: 12, marginTop: 3 };

  const canGoNext = () => {
    if (step === 1) return checks && checks.node.ok && checks.port.ok;
    if (step === 2) return dbDone;
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ width: 80, height: 80, borderRadius: 16, background: '#1C3C6E', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontFamily: 'Montserrat', fontWeight: 700, fontSize: 32, color: '#fff' }}>VH</div>
            <h2 style={{ fontFamily: 'Montserrat', color: '#1C3C6E', fontSize: 26, marginBottom: 12 }}>Welcome to VendorHub</h2>
            <p style={{ color: '#666', fontSize: 15, lineHeight: 1.6, maxWidth: 400, margin: '0 auto 16px' }}>
              The complete Vendor Management System for <strong>LRS Services Pvt Ltd</strong>. This wizard will guide you through the initial setup in a few easy steps.
            </p>
            <div style={{ background: '#F0F7FF', border: '1px solid #C5DCF5', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#1C3C6E', display: 'inline-block' }}>
              Version 1.0.0 &bull; Node.js {typeof process !== 'undefined' ? 'compatible' : 'required'}
            </div>
          </div>
        );

      case 1:
        return (
          <div>
            <h3 style={{ fontFamily: 'Montserrat', color: '#1C3C6E', marginBottom: 20 }}>System Requirements</h3>
            {loading && <p style={{ color: '#888' }}>Checking system...</p>}
            {checks && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {Object.values(checks).map((c, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: c.ok ? '#F0FFF4' : '#FFF5F5', borderRadius: 8, border: `1px solid ${c.ok ? '#C6F6D5' : '#FED7D7'}` }}>
                    <span style={{ fontSize: 20 }}>{c.ok ? '✅' : '❌'}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14, color: c.ok ? '#276749' : '#C53030' }}>{c.label}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 2:
        return (
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontFamily: 'Montserrat', color: '#1C3C6E', marginBottom: 16 }}>Database Setup</h3>
            <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>Initialize the SQLite database and create default data structures.</p>
            {!dbDone ? (
              <button
                onClick={initDb}
                disabled={loading}
                style={{ padding: '12px 32px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 600, cursor: loading ? 'wait' : 'pointer' }}
              >
                {loading ? 'Initializing...' : 'Initialize Database'}
              </button>
            ) : (
              <div style={{ background: '#F0FFF4', border: '1px solid #C6F6D5', borderRadius: 8, padding: 20 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
                <div style={{ fontWeight: 600, color: '#276749', fontSize: 15 }}>Database initialized successfully!</div>
                <div style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Tables created, default groups configured.</div>
              </div>
            )}
            {error && <p style={{ color: '#E74C3C', marginTop: 12, fontSize: 13 }}>{error}</p>}
          </div>
        );

      case 3:
        return (
          <div>
            <h3 style={{ fontFamily: 'Montserrat', color: '#1C3C6E', marginBottom: 20 }}>Organisation Settings</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={labelStyle}>Organisation Name</label>
                <input style={inputStyle} value={org.org_name} onChange={e => setOrg({ ...org, org_name: e.target.value })} placeholder="LRS Services Pvt Ltd" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Timezone</label>
                  <select style={inputStyle} value={org.timezone} onChange={e => setOrg({ ...org, timezone: e.target.value })}>
                    {TIMEZONES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Currency</label>
                  <select style={inputStyle} value={org.currency} onChange={e => setOrg({ ...org, currency: e.target.value })}>
                    {CURRENCIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Primary Domain (optional)</label>
                <input style={inputStyle} value={org.primary_domain} onChange={e => setOrg({ ...org, primary_domain: e.target.value })} placeholder="lrsservices.in" />
              </div>
            </div>
          </div>
        );

      case 4:
        return (
          <div>
            <h3 style={{ fontFamily: 'Montserrat', color: '#1C3C6E', marginBottom: 20 }}>Administrator Account</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={labelStyle}>Full Name</label>
                <input style={{ ...inputStyle, borderColor: validationErrors.admin_name ? '#E74C3C' : '#DDE2E8' }} value={admin.admin_name} onChange={e => setAdmin({ ...admin, admin_name: e.target.value })} placeholder="System Administrator" />
                {validationErrors.admin_name && <p style={errStyle}>{validationErrors.admin_name}</p>}
              </div>
              <div>
                <label style={labelStyle}>Email</label>
                <input style={inputStyle} type="email" value={admin.admin_email} onChange={e => setAdmin({ ...admin, admin_email: e.target.value })} placeholder="admin@lrsservices.in" />
              </div>
              <div>
                <label style={labelStyle}>Username</label>
                <input style={{ ...inputStyle, borderColor: validationErrors.admin_username ? '#E74C3C' : '#DDE2E8' }} value={admin.admin_username} onChange={e => setAdmin({ ...admin, admin_username: e.target.value })} placeholder="admin" />
                {validationErrors.admin_username && <p style={errStyle}>{validationErrors.admin_username}</p>}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label style={labelStyle}>Password</label>
                  <input style={{ ...inputStyle, borderColor: validationErrors.admin_password ? '#E74C3C' : '#DDE2E8' }} type="password" value={admin.admin_password} onChange={e => setAdmin({ ...admin, admin_password: e.target.value })} />
                  {validationErrors.admin_password && <p style={errStyle}>{validationErrors.admin_password}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <input style={{ ...inputStyle, borderColor: validationErrors.admin_confirm ? '#E74C3C' : '#DDE2E8' }} type="password" value={admin.admin_confirm} onChange={e => setAdmin({ ...admin, admin_confirm: e.target.value })} />
                  {validationErrors.admin_confirm && <p style={errStyle}>{validationErrors.admin_confirm}</p>}
                </div>
              </div>
            </div>
            {error && <p style={{ color: '#E74C3C', marginTop: 12, fontSize: 13 }}>{error}</p>}
          </div>
        );

      case 5:
        return (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: 'Montserrat', color: '#1C3C6E', fontSize: 24, marginBottom: 12 }}>Setup Complete!</h2>
            <p style={{ color: '#666', fontSize: 15, lineHeight: 1.6, marginBottom: 24 }}>
              VendorHub has been successfully configured for <strong>{org.org_name}</strong>.<br />
              You can now sign in and start managing your vendors.
            </p>
            <button
              onClick={() => navigate('/login')}
              style={{ padding: '14px 36px', background: '#29ABE2', color: '#fff', border: 'none', borderRadius: 8, fontSize: 16, fontWeight: 600, cursor: 'pointer' }}
            >
              Launch VendorHub →
            </button>
          </div>
        );
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F5F6FA', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 8px 40px rgba(0,0,0,0.10)', overflow: 'hidden', display: 'flex', width: '100%', maxWidth: 800, minHeight: 520 }}>
        {/* Left sidebar */}
        <div style={{ width: 220, background: '#1C3C6E', padding: '32px 0', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '0 24px 28px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 20, color: '#fff' }}>VendorHub</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Setup Wizard</div>
          </div>
          <div style={{ paddingTop: 20 }}>
            {STEPS.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 24px', opacity: i <= step ? 1 : 0.4 }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: i < step ? '#27AE60' : i === step ? '#29ABE2' : 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: '#fff', flexShrink: 0 }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span style={{ fontSize: 13, color: i === step ? '#fff' : 'rgba(255,255,255,0.7)', fontWeight: i === step ? 600 : 400 }}>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right content */}
        <div style={{ flex: 1, padding: '40px 40px 32px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ flex: 1 }}>{renderStep()}</div>

          {step < 5 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 20, borderTop: '1px solid #F0F0F0' }}>
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                style={{ padding: '10px 24px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: step === 0 ? 'default' : 'pointer', color: '#555', fontSize: 14, opacity: step === 0 ? 0.4 : 1 }}
              >
                ← Back
              </button>

              {step === 4 ? (
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  style={{ padding: '10px 28px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, cursor: loading ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600 }}
                >
                  {loading ? 'Setting up...' : 'Finish Setup →'}
                </button>
              ) : (
                <button
                  onClick={() => setStep(s => s + 1)}
                  disabled={!canGoNext()}
                  style={{ padding: '10px 28px', background: canGoNext() ? '#1C3C6E' : '#C0C8D4', color: '#fff', border: 'none', borderRadius: 6, cursor: canGoNext() ? 'pointer' : 'default', fontSize: 14, fontWeight: 600 }}
                >
                  Next →
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
