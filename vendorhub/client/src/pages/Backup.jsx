import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';

export default function Backup() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [schedule, setSchedule] = useState('Daily');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [msg, setMsg] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState(null);

  useEffect(() => { load(); loadSchedule(); }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await api.get('/api/backup/history');
      setHistory(d.data || []);
    } catch {}
    setLoading(false);
  }

  async function loadSchedule() {
    try {
      const d = await api.get('/api/settings');
      const s = (d.data || []).find(x => x.key === 'backup_schedule');
      if (s) setSchedule(s.value);
    } catch {}
  }

  async function runBackup() {
    setRunning(true);
    setMsg(null);
    try {
      const d = await api.post('/api/backup/run', {});
      setMsg({ type: 'success', text: `Backup created: ${d.data?.file || 'done'}` });
      load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Backup failed' });
    }
    setRunning(false);
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    await api.put('/api/settings', { key: 'backup_schedule', value: schedule });
    setSavingSchedule(false);
    setMsg({ type: 'success', text: 'Backup schedule saved' });
    setTimeout(() => setMsg(null), 3000);
  }

  async function doRestore(b) {
    try {
      await api.post(`/api/backup/${b.id}/restore`, {});
      setRestoreConfirm(null);
      setMsg({ type: 'success', text: 'Restore initiated. The server will restart.' });
    } catch (e) {
      alert('Restore failed: ' + e.message);
    }
  }

  function formatSize(mb) {
    if (!mb) return '—';
    if (mb < 1) return `${Math.round(mb * 1024)} KB`;
    return `${mb.toFixed(1)} MB`;
  }

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString();
  }

  return (
    <Layout title="Backup & Recovery">
      <h1 style={{ fontFamily: 'Montserrat, sans-serif', color: NAVY, fontSize: 22, fontWeight: 700, marginBottom: 24 }}>Backup & Recovery</h1>

      {msg && (
        <div style={{ background: msg.type === 'success' ? '#e6f9f0' : '#fef3f0', color: msg.type === 'success' ? '#27AE60' : '#E74C3C', padding: '12px 16px', borderRadius: 8, marginBottom: 20, fontSize: 14, fontWeight: 600 }}>
          {msg.type === 'success' ? '✓ ' : '✗ '}{msg.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
        {/* Manual Backup */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: NAVY + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>💾</div>
            <div>
              <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: NAVY, fontSize: 16, fontWeight: 700 }}>Manual Backup</h2>
              <p style={{ color: '#888', fontSize: 13 }}>Create an immediate backup now</p>
            </div>
          </div>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>
            Backs up the entire SQLite database to the <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, fontSize: 12 }}>backups/</code> directory with a timestamp filename.
          </p>
          <button
            onClick={runBackup}
            disabled={running}
            style={{ background: running ? '#aaa' : NAVY, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, cursor: running ? 'not-allowed' : 'pointer', width: '100%' }}
          >
            {running ? '⏳ Running Backup...' : '▶ Run Manual Backup'}
          </button>
        </div>

        {/* Schedule */}
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: 28 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: BLUE + '20', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🕐</div>
            <div>
              <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: NAVY, fontSize: 16, fontWeight: 700 }}>Scheduled Backups</h2>
              <p style={{ color: '#888', fontSize: 13 }}>Automatic backup frequency</p>
            </div>
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>Frequency</label>
            {['Daily', 'Weekly', 'Monthly'].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                <input type="radio" name="schedule" value={opt} checked={schedule === opt} onChange={() => setSchedule(opt)} />
                <span style={{ fontSize: 14, color: '#444' }}>
                  {opt} {opt === 'Daily' ? '(runs at 2:00 AM)' : opt === 'Weekly' ? '(runs Sunday at 2:00 AM)' : '(runs 1st of month)'}
                </span>
              </label>
            ))}
          </div>
          <button
            onClick={saveSchedule}
            disabled={savingSchedule}
            style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%' }}
          >
            {savingSchedule ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>

      {/* Backup History */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: NAVY, fontSize: 16, fontWeight: 700 }}>Backup History</h2>
          <span style={{ color: '#aaa', fontSize: 13 }}>{history.length} backup{history.length !== 1 ? 's' : ''}</span>
        </div>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Loading...</div>
        ) : history.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>💾</div>
            <p>No backups yet. Run a backup to get started.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                {['Date & Time', 'Type', 'Size', 'Status', 'File', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {history.map(b => (
                <tr key={b.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                  <td style={{ padding: '14px 16px', fontSize: 14, color: '#333' }}>{formatDate(b.date || b.created_at)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ background: b.type === 'Scheduled' ? BLUE + '20' : NAVY + '15', color: b.type === 'Scheduled' ? BLUE : NAVY, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                      {b.type || 'Manual'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#555', fontSize: 14 }}>{formatSize(b.size_mb)}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      background: b.status === 'Success' ? '#e6f9f0' : '#fef3f0',
                      color: b.status === 'Success' ? '#27AE60' : '#E74C3C',
                      borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600
                    }}>
                      {b.status || 'Success'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', color: '#aaa', fontSize: 12 }}>
                    <code style={{ background: '#f5f5f5', padding: '2px 6px', borderRadius: 4, fontSize: 11 }}>
                      {b.file_path ? b.file_path.split(/[/\\]/).pop() : '—'}
                    </code>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <a
                        href={`/api/backup/${b.id}/download`}
                        style={{ background: NAVY + '15', color: NAVY, borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}
                      >
                        ⬇ Download
                      </a>
                      <button
                        onClick={() => setRestoreConfirm(b)}
                        style={{ background: '#FFF3E0', color: '#E67E22', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
                      >
                        ↺ Restore
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {restoreConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 460, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
            <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: '#E74C3C', fontSize: 20, marginBottom: 16 }}>⚠ Restore Backup?</h2>
            <p style={{ color: '#555', fontSize: 14, marginBottom: 12 }}>
              This will <strong>replace the current database</strong> with the backup from:
            </p>
            <p style={{ background: '#f5f5f5', padding: '10px 14px', borderRadius: 8, fontSize: 13, marginBottom: 20, fontFamily: 'monospace' }}>
              {formatDate(restoreConfirm.date || restoreConfirm.created_at)}
            </p>
            <p style={{ color: '#E74C3C', fontSize: 13, marginBottom: 24, fontWeight: 600 }}>
              ⚠ All data added after this backup will be permanently lost. The server will restart automatically.
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
              <button onClick={() => setRestoreConfirm(null)} style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
              <button onClick={() => doRestore(restoreConfirm)} style={{ background: '#E74C3C', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, cursor: 'pointer' }}>Restore Now</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
