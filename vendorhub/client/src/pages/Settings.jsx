import React, { useState, useEffect, useRef } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 };
const cardStyle = { background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '22px 24px', marginBottom: 20 };
const sectionLabel = { fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 18 };

const Field = ({ label, name, type = 'text', placeholder, obj, set, hint }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={labelStyle}>{label}</label>
    <input style={inputStyle} type={type} value={obj[name] || ''} placeholder={placeholder}
      onChange={e => set(prev => ({ ...prev, [name]: e.target.value }))} />
    {hint && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>{hint}</div>}
  </div>
);

export default function Settings() {
  const [smtp, setSmtp] = useState({ smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '', smtp_enabled: 'false' });
  const [general, setGeneral] = useState({ admin_email: '', backup_schedule: 'Daily' });
  const [server, setServer] = useState({ server_port: '8080', company_name: '' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [portChanged, setPortChanged] = useState(false);

  // Logo state
  const [logoUrl, setLogoUrl] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [logoMsg, setLogoMsg] = useState(null);
  const fileRef = useRef();

  useEffect(() => {
    api.get('/api/settings').then(rows => {
      const map = {};
      (rows || []).forEach(r => { map[r.key] = r.value; });
      setSmtp(prev => ({ ...prev, ...Object.fromEntries(Object.keys(prev).map(k => [k, map[k] ?? prev[k]])) }));
      setGeneral(prev => ({ ...prev, ...Object.fromEntries(Object.keys(prev).map(k => [k, map[k] ?? prev[k]])) }));
      setServer(prev => ({ ...prev, ...Object.fromEntries(Object.keys(prev).map(k => [k, map[k] ?? prev[k]])) }));
      if (map.company_logo) setLogoUrl('/uploads/logo/' + map.company_logo + '?t=' + Date.now());
    }).catch(() => {});
  }, []);

  const saveAll = async () => {
    setSaving(true); setSaved('');
    try {
      const settings = [
        ...Object.entries(smtp),
        ...Object.entries(general),
        ...Object.entries(server),
      ].map(([key, value]) => ({ key, value }));
      await api.put('/api/settings/bulk', { settings });
      setSaved('Settings saved successfully.');
      setTimeout(() => setSaved(''), 3000);
      // Notify sidebar of company name change
      window.dispatchEvent(new Event('vh:logo-updated'));
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const sendTestEmail = async () => {
    setTesting(true); setTestResult(null);
    try {
      const result = await api.post('/api/settings/test-email', { to: testEmail || smtp.smtp_user });
      setTestResult({ ok: true, msg: `Test email sent to ${result.to}` });
    } catch (e) { setTestResult({ ok: false, msg: e.message }); }
    setTesting(false);
  };

  const uploadLogo = async (file) => {
    if (!file) return;
    setLogoUploading(true); setLogoMsg(null);
    try {
      const form = new FormData();
      form.append('logo', file);
      const result = await api.upload('/api/settings/logo', form);
      setLogoUrl(result.url + '?t=' + Date.now());
      setLogoMsg({ ok: true, text: 'Logo uploaded successfully.' });
      window.dispatchEvent(new Event('vh:logo-updated'));
      setTimeout(() => setLogoMsg(null), 3000);
    } catch (e) {
      setLogoMsg({ ok: false, text: e.message });
    }
    setLogoUploading(false);
  };

  const deleteLogo = async () => {
    if (!window.confirm('Remove the company logo?')) return;
    try {
      await api.delete('/api/settings/logo');
      setLogoUrl(null);
      setLogoMsg({ ok: true, text: 'Logo removed.' });
      window.dispatchEvent(new Event('vh:logo-updated'));
      setTimeout(() => setLogoMsg(null), 3000);
    } catch (e) {
      setLogoMsg({ ok: false, text: e.message });
    }
  };

  return (
    <Layout title="Settings">
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ marginBottom: 28 }}>
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 22, color: NAVY, margin: 0 }}>⚙️ System Settings</h2>
          <p style={{ color: '#666', fontSize: 13, marginTop: 6 }}>Configure server, branding, email notifications and backup preferences.</p>
        </div>

        {/* ── Server Configuration ── */}
        <div style={cardStyle}>
          <div style={sectionLabel}>🖥️ Server Configuration</div>

          {portChanged && (
            <div style={{ background: '#FFF8E1', border: '1px solid #FFD54F', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#E67E22', display: 'flex', gap: 8, alignItems: 'center' }}>
              <span>⚠️</span>
              <div><strong>Restart required</strong> — Port changes take effect after the server is restarted. Close and reopen the CMD window (Start-VendorHub.bat) to apply.</div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <label style={labelStyle}>Server Port</label>
              <input
                style={inputStyle}
                type="number"
                min="1024" max="65535"
                value={server.server_port}
                onChange={e => { setServer(p => ({ ...p, server_port: e.target.value })); setPortChanged(true); }}
                placeholder="8080"
              />
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>
                Default: 8080. Ports below 1024 require administrator rights. Restart required after change.
              </div>
            </div>
            <div>
              <label style={labelStyle}>Company / Application Name</label>
              <input
                style={inputStyle}
                value={server.company_name}
                onChange={e => setServer(p => ({ ...p, company_name: e.target.value }))}
                placeholder="VendorHub"
              />
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Shown in the sidebar header next to the logo.</div>
            </div>
          </div>
        </div>

        {/* ── Company Branding ── */}
        <div style={cardStyle}>
          <div style={sectionLabel}>🎨 Company Branding</div>
          <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Current logo preview */}
            <div style={{ flexShrink: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Current Logo</div>
              <div style={{
                width: 100, height: 100, borderRadius: 12, border: '2px dashed #DDE2E8',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: logoUrl ? '#F8FAFC' : '#F5F6FA', overflow: 'hidden',
              }}>
                {logoUrl ? (
                  <img src={logoUrl} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                ) : (
                  <div style={{ textAlign: 'center', color: '#bbb' }}>
                    <div style={{ fontSize: 28 }}>🖼️</div>
                    <div style={{ fontSize: 11, marginTop: 4 }}>No logo</div>
                  </div>
                )}
              </div>
            </div>

            {/* Upload controls */}
            <div style={{ flex: 1, minWidth: 220 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Upload New Logo</div>
              <div style={{ fontSize: 12, color: '#888', marginBottom: 12, lineHeight: 1.6 }}>
                Accepted formats: PNG, JPG, SVG, WebP. Max size: 5 MB.<br />
                Recommended: square image, at least 128×128 px. The logo will appear in the sidebar and persist until you upload a new one.
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                  onClick={() => fileRef.current?.click()}
                  disabled={logoUploading}
                  style={{ padding: '9px 18px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                >
                  {logoUploading ? '⏳ Uploading...' : '⬆️ Upload Logo'}
                </button>
                {logoUrl && (
                  <button
                    onClick={deleteLogo}
                    style={{ padding: '9px 16px', background: '#fff', color: '#E74C3C', border: '1px solid #FFCDD2', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}
                  >
                    🗑️ Remove
                  </button>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={e => { if (e.target.files?.[0]) uploadLogo(e.target.files[0]); e.target.value = ''; }}
              />
              {logoMsg && (
                <div style={{ marginTop: 10, fontSize: 12, color: logoMsg.ok ? '#27AE60' : '#E74C3C', fontWeight: 600 }}>
                  {logoMsg.ok ? '✓ ' : '✗ '}{logoMsg.text}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── General Settings ── */}
        <div style={cardStyle}>
          <div style={sectionLabel}>⚙️ General</div>
          <Field
            label="Admin Notification Email"
            name="admin_email"
            placeholder="admin@company.com"
            obj={general}
            set={setGeneral}
            hint="System-wide alert emails (contract expiry, etc.) are also sent to this address."
          />
          <div style={{ marginBottom: 0 }}>
            <label style={labelStyle}>Backup Schedule</label>
            <select style={inputStyle} value={general.backup_schedule || 'Daily'} onChange={e => setGeneral(prev => ({ ...prev, backup_schedule: e.target.value }))}>
              <option>Daily</option>
              <option>Weekly</option>
              <option>Monthly</option>
            </select>
          </div>
        </div>

        {/* ── SMTP Settings ── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={sectionLabel}>✉️ Email Notifications (SMTP)</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={smtp.smtp_enabled === 'true'} onChange={e => setSmtp(prev => ({ ...prev, smtp_enabled: e.target.checked ? 'true' : 'false' }))} />
              <span style={{ color: smtp.smtp_enabled === 'true' ? '#27AE60' : '#888', fontWeight: 600 }}>
                {smtp.smtp_enabled === 'true' ? '✓ Enabled' : 'Disabled'}
              </span>
            </label>
          </div>

          {smtp.smtp_enabled === 'true' && (
            <div style={{ background: '#F0FFF4', border: '1px solid #C8E6C9', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#27AE60' }}>
              Daily alert emails are sent at 8:00 AM for contracts and certifications expiring within 30 days. Alerts are sent to each user's profile email, plus the Admin Notification Email above.
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <Field label="SMTP Host" name="smtp_host" placeholder="smtp.gmail.com" obj={smtp} set={setSmtp} />
            <Field label="SMTP Port" name="smtp_port" placeholder="587" obj={smtp} set={setSmtp} />
            <Field label="SMTP Username" name="smtp_user" placeholder="you@gmail.com" obj={smtp} set={setSmtp} />
            <Field label="SMTP Password" name="smtp_pass" type="password" placeholder="••••••••" obj={smtp} set={setSmtp} />
          </div>
          <Field label="From Address (optional)" name="smtp_from" placeholder="VendorHub <noreply@company.com>" obj={smtp} set={setSmtp} />

          <div style={{ borderTop: '1px solid #E8ECF0', paddingTop: 16, marginTop: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#555', marginBottom: 8 }}>Send Test Email</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input style={{ ...inputStyle, flex: 1 }} type="email" placeholder="recipient@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} />
              <button onClick={sendTestEmail} disabled={testing} style={{ padding: '9px 18px', background: '#29ABE2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
                {testing ? 'Sending...' : '✉ Send Test'}
              </button>
            </div>
            {testResult && (
              <div style={{ marginTop: 8, fontSize: 12, color: testResult.ok ? '#27AE60' : '#E74C3C', fontWeight: 600 }}>
                {testResult.ok ? '✓ ' : '✗ '}{testResult.msg}
              </div>
            )}
          </div>
        </div>

        {/* ── SSL / HTTPS ── */}
        <SslPanel />

        {/* Save button */}
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={saveAll} disabled={saving} style={{ padding: '10px 28px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          {saved && <span style={{ color: '#27AE60', fontWeight: 600, fontSize: 13 }}>✓ {saved}</span>}
        </div>
      </div>
    </Layout>
  );
}

function SslPanel() {
  const [hostname, setHostname] = React.useState('vms.lrsservices.local');
  const [domain, setDomain]     = React.useState('');
  const [mode, setMode]         = React.useState('self_signed');
  const [log, setLog]           = React.useState('');
  const [busy, setBusy]         = React.useState(false);

  const addLog = msg => setLog(prev => prev + msg + '\n');
  const api = window._vendorApi || (window._vendorApi = {
    post: (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(body) }).then(r => r.json()),
  });

  async function generate() {
    setBusy(true);
    setLog('');
    try {
      if (mode === 'self_signed') {
        addLog('Generating self-signed certificate for ' + hostname + ' …');
        const r = await fetch('/api/settings/ssl/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ hostname }) }).then(x => x.json());
        if (r.error) addLog('❌ ' + r.error);
        else addLog('✅ ' + r.data.message);
      } else {
        addLog('Requesting Let\'s Encrypt certificate for ' + domain + ' …');
        const r = await fetch('/api/settings/ssl/lets-encrypt', { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ domain }) }).then(x => x.json());
        if (r.error) addLog('❌ ' + r.error);
        else addLog('✅ ' + r.data.message);
      }
    } finally {
      setBusy(false);
    }
  }

  const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
  const radioRow = (val, label, desc) => (
    <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 14px', borderRadius: 8, border: `2px solid ${mode === val ? '#1C3C6E' : '#DDE2E8'}`, background: mode === val ? '#F0F7FF' : '#fff', cursor: 'pointer', marginBottom: 10 }}>
      <input type="radio" name="sslMode" value={val} checked={mode === val} onChange={() => setMode(val)} style={{ marginTop: 2 }} />
      <div>
        <div style={{ fontWeight: 600, fontSize: 13, color: '#1C3C6E' }}>{label}</div>
        <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{desc}</div>
      </div>
    </label>
  );

  return (
    <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #E8ECF0', padding: 24, marginBottom: 24 }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: '#1C3C6E', marginBottom: 18 }}>🔒 SSL / HTTPS</div>

      {radioRow('self_signed', 'Internal / Self-Signed', 'For .local hostnames — generates a private Root CA. Install the Root CA on client machines once to avoid browser warnings.')}
      {mode === 'self_signed' && (
        <div style={{ marginLeft: 20, marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 4 }}>Hostname</label>
          <input style={inputStyle} value={hostname} onChange={e => setHostname(e.target.value)} placeholder="vms.lrsservices.local" />
        </div>
      )}

      {radioRow('lets_encrypt', "Public Domain / Let's Encrypt", "For a real internet domain. Free browser-trusted certificate. Requires port 80 & 443 open and DNS pointing to this server.")}
      {mode === 'lets_encrypt' && (
        <div style={{ marginLeft: 20, marginBottom: 12 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: '#444', display: 'block', marginBottom: 4 }}>Domain Name</label>
          <input style={inputStyle} value={domain} onChange={e => setDomain(e.target.value)} placeholder="vms.yourcompany.in" />
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
        <button onClick={generate} disabled={busy || (mode === 'lets_encrypt' && !domain)}
          style={{ padding: '9px 20px', background: busy ? '#C0C8D4' : '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, fontWeight: 600, fontSize: 13, cursor: busy ? 'wait' : 'pointer' }}>
          {busy ? 'Generating…' : 'Generate / Renew Certificate'}
        </button>
        <a href="/api/settings/ssl/root-cert" download="vendorhub-root.crt"
          style={{ padding: '9px 20px', background: '#F0F7FF', color: '#1C3C6E', border: '1px solid #C5DCF5', borderRadius: 6, fontWeight: 600, fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}>
          ⬇ Download Root Certificate
        </a>
      </div>

      {log && (
        <pre style={{ background: '#0D1117', color: '#58A6FF', borderRadius: 8, padding: '12px 16px', fontSize: 12, marginTop: 14, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}>{log}</pre>
      )}

      <div style={{ marginTop: 16, background: '#FFF8E1', border: '1px solid #FCD34D', borderRadius: 8, padding: '12px 14px', fontSize: 12, color: '#92400E' }}>
        <strong>To install the Root CA on Windows client machines (run as Administrator in PowerShell):</strong>
        <pre style={{ background: '#1C3C6E', color: '#A5F3FC', borderRadius: 6, padding: '8px 12px', fontSize: 11, marginTop: 6, whiteSpace: 'pre-wrap' }}>{`Import-Certificate -FilePath vendorhub-root.crt \`\n  -CertStoreLocation Cert:\\LocalMachine\\Root`}</pre>
        After generating a certificate, <strong>restart the VendorHub server</strong> to activate HTTPS on port 443.
      </div>
    </div>
  );
}
