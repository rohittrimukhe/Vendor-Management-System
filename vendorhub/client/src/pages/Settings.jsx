import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 };

export default function Settings() {
  const [smtp, setSmtp] = useState({ smtp_host: '', smtp_port: '587', smtp_user: '', smtp_pass: '', smtp_from: '', smtp_enabled: 'false' });
  const [general, setGeneral] = useState({ admin_email: '', backup_schedule: 'Daily' });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState('');
  const [testEmail, setTestEmail] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get('/api/settings').then(rows => {
      const map = {};
      (rows || []).forEach(r => { map[r.key] = r.value; });
      setSmtp(prev => ({ ...prev, ...Object.fromEntries(Object.keys(prev).map(k => [k, map[k] ?? prev[k]])) }));
      setGeneral(prev => ({ ...prev, ...Object.fromEntries(Object.keys(prev).map(k => [k, map[k] ?? prev[k]])) }));
    }).catch(() => {});
  }, []);

  const saveAll = async () => {
    setSaving(true);
    setSaved('');
    try {
      const settings = [...Object.entries(smtp), ...Object.entries(general)].map(([key, value]) => ({ key, value }));
      await api.put('/api/settings/bulk', { settings });
      setSaved('Settings saved successfully.');
      setTimeout(() => setSaved(''), 3000);
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  const sendTestEmail = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const result = await api.post('/api/settings/test-email', { to: testEmail || smtp.smtp_user });
      setTestResult({ ok: true, msg: `Test email sent to ${result.to}` });
    } catch (e) { setTestResult({ ok: false, msg: e.message }); }
    setTesting(false);
  };

  const Field = ({ label, name, type = 'text', placeholder, obj, set }) => (
    <div style={{ marginBottom: 16 }}>
      <label style={labelStyle}>{label}</label>
      <input style={inputStyle} type={type} value={obj[name] || ''} placeholder={placeholder}
        onChange={e => set(prev => ({ ...prev, [name]: e.target.value }))} />
    </div>
  );

  return (
    <Layout title="Settings">
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 22, color: NAVY, marginBottom: 24 }}>⚙️ System Settings</h2>

        {/* General Settings */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '22px 24px', marginBottom: 20 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 18 }}>General</div>
          <Field label="Admin Notification Email" name="admin_email" placeholder="admin@company.com" obj={general} set={setGeneral} />
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Backup Schedule</label>
            <select style={inputStyle} value={general.backup_schedule || 'Daily'} onChange={e => setGeneral(prev => ({ ...prev, backup_schedule: e.target.value }))}>
              <option>Daily</option><option>Weekly</option><option>Monthly</option>
            </select>
          </div>
        </div>

        {/* SMTP Settings */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: '22px 24px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Email Notifications (SMTP)</div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
              <input type="checkbox" checked={smtp.smtp_enabled === 'true'} onChange={e => setSmtp(prev => ({ ...prev, smtp_enabled: e.target.checked ? 'true' : 'false' }))} />
              <span style={{ color: smtp.smtp_enabled === 'true' ? '#27AE60' : '#888', fontWeight: 600 }}>
                {smtp.smtp_enabled === 'true' ? '✓ Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          {smtp.smtp_enabled === 'true' && (
            <div style={{ background: '#F0FFF4', border: '1px solid #C8E6C9', borderRadius: 8, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#27AE60' }}>
              Daily alerts will be sent at 8:00 AM for contracts and certifications expiring within 30 days.
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
