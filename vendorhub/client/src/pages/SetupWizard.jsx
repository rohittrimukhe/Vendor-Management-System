import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

const STEPS = ['Welcome', 'System Check', 'Network & SSL', 'Database', 'Organisation', 'Admin Account', 'Complete'];
const TIMEZONES = ['Asia/Kolkata', 'Asia/Dubai', 'UTC', 'America/New_York', 'Europe/London', 'Asia/Singapore'];
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD'];

// Step indices
const S_WELCOME   = 0;
const S_SYSCHECK  = 1;
const S_SSL       = 2;
const S_DATABASE  = 3;
const S_ORG       = 4;
const S_ADMIN     = 5;
const S_COMPLETE  = 6;

export default function SetupWizard({ onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [checks, setChecks] = useState(null);
  const [dbDone, setDbDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // SSL state
  const [sslMode, setSslMode] = useState('self_signed'); // 'none' | 'self_signed' | 'lets_encrypt'
  const [sslHostname, setSslHostname] = useState('vms.lrsservices.local');
  const [sslDomain, setSslDomain]   = useState('');
  const [sslLog, setSslLog]         = useState([]);
  const [sslDone, setSslDone]       = useState(false);

  const [org, setOrg] = useState({ org_name: '', timezone: 'Asia/Kolkata', currency: 'INR', primary_domain: '' });
  const [admin, setAdmin] = useState({ admin_name: '', admin_email: '', admin_username: '', admin_password: '', admin_confirm: '' });
  const [validationErrors, setValidationErrors] = useState({});

  useEffect(() => {
    if (step === S_SYSCHECK) loadChecks();
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
      await api.get('/api/setup/status');
      setDbDone(true);
    } catch (e) {
      setError('Could not reach server: ' + e.message);
    } finally {
      setLoading(false);
    }
  }

  async function generateSSL() {
    setSslLog([]);
    setSslDone(false);
    setLoading(true);
    setError('');
    const addLog = msg => setSslLog(prev => [...prev, msg]);
    try {
      if (sslMode === 'self_signed') {
        addLog('Generating Root CA keypair…');
        addLog('Signing server certificate for ' + sslHostname + '…');
        await api.post('/api/settings/ssl/generate', { hostname: sslHostname });
        addLog('✅ Certificate written to server certificate store.');
        addLog('⚠  Restart the server after setup to activate HTTPS on port 443.');
        setSslDone(true);
      } else if (sslMode === 'lets_encrypt') {
        addLog('Requesting certificate from Let\'s Encrypt for ' + sslDomain + '…');
        addLog('Starting HTTP-01 challenge (port 80 must be reachable)…');
        await api.post('/api/settings/ssl/lets-encrypt', { domain: sslDomain });
        addLog('✅ Certificate obtained and stored.');
        addLog('⚠  Restart the server after setup to activate HTTPS on port 443.');
        setSslDone(true);
      } else {
        // none
        setSslDone(true);
      }
    } catch (e) {
      addLog('❌ Error: ' + e.message);
      setError(e.message);
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
      setStep(S_COMPLETE);
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
    if (step === S_SYSCHECK) return checks && checks.node.ok && checks.port.ok;
    if (step === S_SSL)      return sslDone || sslMode === 'none';
    if (step === S_DATABASE) return dbDone;
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case S_WELCOME:
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

      case S_SYSCHECK:
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

      case S_SSL: {
        const radioStyle = { display: 'flex', alignItems: 'flex-start', gap: 10, padding: '14px 16px', borderRadius: 8, border: '2px solid', cursor: 'pointer', marginBottom: 10 };
        const termStyle = { background: '#0D1117', borderRadius: 8, padding: '14px 16px', fontFamily: 'monospace', fontSize: 12, color: '#58A6FF', minHeight: 80, overflowY: 'auto', maxHeight: 160, marginTop: 14 };
        return (
          <div>
            <h3 style={{ fontFamily: 'Montserrat', color: '#1C3C6E', marginBottom: 6 }}>Network & SSL</h3>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>Choose how VendorHub will serve HTTPS. This is strongly recommended so passwords and data are never sent over plain HTTP.</p>

            {/* Mode A */}
            <div
              onClick={() => { setSslMode('self_signed'); setSslDone(false); }}
              style={{ ...radioStyle, borderColor: sslMode === 'self_signed' ? '#1C3C6E' : '#DDE2E8', background: sslMode === 'self_signed' ? '#F0F7FF' : '#fff' }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #1C3C6E', background: sslMode === 'self_signed' ? '#1C3C6E' : '#fff', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1C3C6E' }}>Internal / Self-Signed</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>For internal hostnames (e.g. vms.company.local). VendorHub generates its own certificate. Admins install the Root CA on client machines once.</div>
              </div>
            </div>

            {sslMode === 'self_signed' && (
              <div style={{ marginLeft: 28, marginBottom: 14 }}>
                <label style={labelStyle}>Hostname <span style={{ color: '#888', fontWeight: 400 }}>(e.g. vms.lrsservices.local)</span></label>
                <input style={inputStyle} value={sslHostname} onChange={e => { setSslHostname(e.target.value); setSslDone(false); }} placeholder="vms.lrsservices.local" />
              </div>
            )}

            {/* Mode B */}
            <div
              onClick={() => { setSslMode('lets_encrypt'); setSslDone(false); }}
              style={{ ...radioStyle, borderColor: sslMode === 'lets_encrypt' ? '#1C3C6E' : '#DDE2E8', background: sslMode === 'lets_encrypt' ? '#F0F7FF' : '#fff' }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #1C3C6E', background: sslMode === 'lets_encrypt' ? '#1C3C6E' : '#fff', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1C3C6E' }}>Public Domain / Let's Encrypt</div>
                <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>For a real internet domain (e.g. vms.company.in). Free trusted certificate — no browser warnings. Requires ports 80 & 443 open and a DNS A-record pointing to this server.</div>
              </div>
            </div>

            {sslMode === 'lets_encrypt' && (
              <div style={{ marginLeft: 28, marginBottom: 14 }}>
                <label style={labelStyle}>Domain Name</label>
                <input style={inputStyle} value={sslDomain} onChange={e => { setSslDomain(e.target.value); setSslDone(false); }} placeholder="vms.company.in" />
                <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 6, padding: '10px 12px', fontSize: 12, color: '#92400E', marginTop: 8 }}>
                  ⚠ Before clicking Generate: make sure your DNS A-record for <strong>{sslDomain || 'your-domain'}</strong> points to this server's public IP, and that ports 80 and 443 are open in your firewall.
                </div>
              </div>
            )}

            {/* Skip option */}
            <div
              onClick={() => { setSslMode('none'); setSslDone(true); }}
              style={{ ...radioStyle, borderColor: sslMode === 'none' ? '#888' : '#DDE2E8', background: sslMode === 'none' ? '#F9F9F9' : '#fff' }}
            >
              <div style={{ width: 18, height: 18, borderRadius: '50%', border: '2px solid #888', background: sslMode === 'none' ? '#888' : '#fff', flexShrink: 0, marginTop: 1 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#666' }}>Skip — plain HTTP for now</div>
                <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>Not recommended for production. You can configure SSL later from Settings.</div>
              </div>
            </div>

            {sslMode !== 'none' && (
              <button
                onClick={generateSSL}
                disabled={loading || (sslMode === 'lets_encrypt' && !sslDomain)}
                style={{ marginTop: 8, padding: '10px 24px', background: loading ? '#C0C8D4' : '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 14, cursor: loading ? 'wait' : 'pointer' }}
              >
                {loading ? 'Generating…' : 'Generate Certificate'}
              </button>
            )}

            {sslLog.length > 0 && (
              <div style={termStyle}>
                {sslLog.map((l, i) => <div key={i}>{l}</div>)}
              </div>
            )}
          </div>
        );
      }

      case S_DATABASE:
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

      case S_ORG:
        return (
          <div>
            <h3 style={{ fontFamily: 'Montserrat', color: '#1C3C6E', marginBottom: 20 }}>Organisation Settings</h3>
            <div style={{ display: 'grid', gap: 16 }}>
              <div>
                <label style={labelStyle}>Organisation Name</label>
                <input style={inputStyle} value={org.org_name} onChange={e => setOrg({ ...org, org_name: e.target.value })} placeholder="Your Company Name" />
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
                <input style={inputStyle} value={org.primary_domain} onChange={e => setOrg({ ...org, primary_domain: e.target.value })} placeholder="yourcompany.in" />
              </div>
            </div>
          </div>
        );

      case S_ADMIN:
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
                <input style={inputStyle} type="email" value={admin.admin_email} onChange={e => setAdmin({ ...admin, admin_email: e.target.value })} placeholder="admin@yourcompany.in" />
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

      case S_COMPLETE:
        return (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ fontFamily: 'Montserrat', color: '#1C3C6E', fontSize: 24, marginBottom: 12 }}>Setup Complete!</h2>
            <p style={{ color: '#666', fontSize: 15, lineHeight: 1.6, marginBottom: 16 }}>
              VendorHub has been successfully configured for <strong>{org.org_name || 'your organisation'}</strong>.<br />
              You can now sign in and start managing your vendors.
            </p>
            {sslMode === 'self_signed' && (
              <div style={{ background: '#FFF8E1', border: '1px solid #FCD34D', borderRadius: 8, padding: '12px 16px', fontSize: 13, color: '#92400E', textAlign: 'left', marginBottom: 20 }}>
                <strong>Next step — install the Root Certificate on client machines</strong> to avoid browser security warnings. Run as Administrator in PowerShell:
                <pre style={{ background: '#1C3C6E', color: '#A5F3FC', borderRadius: 6, padding: '10px 14px', fontSize: 12, marginTop: 8, overflowX: 'auto', whiteSpace: 'pre-wrap' }}>{`Import-Certificate -FilePath vendorhub-root.crt \`\n  -CertStoreLocation Cert:\\LocalMachine\\Root`}</pre>
                Download <code>vendorhub-root.crt</code> from <strong>Settings → SSL → Download Root Certificate</strong> after logging in. Restart the server to activate HTTPS.
              </div>
            )}
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

          {step < S_COMPLETE && (
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 32, paddingTop: 20, borderTop: '1px solid #F0F0F0' }}>
              <button
                onClick={() => setStep(s => Math.max(0, s - 1))}
                disabled={step === 0}
                style={{ padding: '10px 24px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: step === 0 ? 'default' : 'pointer', color: '#555', fontSize: 14, opacity: step === 0 ? 0.4 : 1 }}
              >
                ← Back
              </button>

              {step === S_ADMIN ? (
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
