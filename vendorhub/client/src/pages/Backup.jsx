import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';

const inputStyle = { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 6, fontSize: 13, outline: 'none', background: '#fff' };

export default function Backup() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [schedule, setSchedule] = useState('Daily');
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [msg, setMsg] = useState(null);
  const [restoreConfirm, setRestoreConfirm] = useState(null);

  // Backup type
  const [backupType, setBackupType] = useState('full');

  // Schedule time pickers
  const [schedHour, setSchedHour] = useState(2);
  const [schedMinute, setSchedMinute] = useState(0);
  const [schedDay, setSchedDay] = useState(1); // day of week (0=Sun) for weekly, day of month for monthly

  useEffect(() => { load(); loadSchedule(); }, []);

  async function load() {
    setLoading(true);
    try {
      const d = await api.get('/api/backup/history');
      setHistory(d || []);
    } catch {}
    setLoading(false);
  }

  async function loadSchedule() {
    try {
      const d = await api.get('/api/settings');
      const s = (d || []).find(x => x.key === 'backup_schedule');
      if (s) setSchedule(s.value);
      const sh = (d || []).find(x => x.key === 'backup_schedule_hour');
      if (sh) setSchedHour(Number(sh.value));
      const sm = (d || []).find(x => x.key === 'backup_schedule_minute');
      if (sm) setSchedMinute(Number(sm.value));
      const sd = (d || []).find(x => x.key === 'backup_schedule_day');
      if (sd) setSchedDay(Number(sd.value));
      const bt = (d || []).find(x => x.key === 'backup_type');
      if (bt) setBackupType(bt.value);
    } catch {}
  }

  async function runBackup() {
    setRunning(true);
    setMsg(null);
    try {
      const d = await api.post('/api/backup/run', { backupType });
      setMsg({ type: 'success', text: `Backup created: ${d?.file || 'done'}` });
      load();
    } catch (e) {
      setMsg({ type: 'error', text: e.message || 'Backup failed' });
    }
    setRunning(false);
  }

  async function saveSchedule() {
    setSavingSchedule(true);
    try {
      await Promise.all([
        api.put('/api/settings', { key: 'backup_schedule', value: schedule }),
        api.put('/api/settings', { key: 'backup_schedule_hour', value: String(schedHour) }),
        api.put('/api/settings', { key: 'backup_schedule_minute', value: String(schedMinute) }),
        api.put('/api/settings', { key: 'backup_schedule_day', value: String(schedDay) }),
        api.put('/api/settings', { key: 'backup_type', value: backupType }),
      ]);
      setMsg({ type: 'success', text: 'Backup schedule saved' });
      setTimeout(() => setMsg(null), 3000);
    } catch (e) {
      setMsg({ type: 'error', text: 'Failed to save schedule: ' + e.message });
    }
    setSavingSchedule(false);
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

  const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

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

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>Backup Type</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
              <input type="radio" name="backupType" value="full" checked={backupType === 'full'} onChange={() => setBackupType('full')} />
              <span style={{ fontSize: 14, color: '#444' }}>Full Backup (DB + Files)</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input type="radio" name="backupType" value="db" checked={backupType === 'db'} onChange={() => setBackupType('db')} />
              <span style={{ fontSize: 14, color: '#444' }}>DB Only (Fast)</span>
            </label>
          </div>

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
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>Frequency</label>
            {['Daily', 'Weekly', 'Monthly'].map(opt => (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10, cursor: 'pointer' }}>
                <input type="radio" name="schedule" value={opt} checked={schedule === opt} onChange={() => setSchedule(opt)} />
                <span style={{ fontSize: 14, color: '#444' }}>{opt}</span>
              </label>
            ))}
          </div>

          {/* Time picker */}
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>Time</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select style={inputStyle} value={schedHour} onChange={e => setSchedHour(Number(e.target.value))}>
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i} value={i}>{String(i).padStart(2, '0')}</option>
                ))}
              </select>
              <span style={{ fontWeight: 700, color: '#888' }}>:</span>
              <select style={inputStyle} value={schedMinute} onChange={e => setSchedMinute(Number(e.target.value))}>
                {[0, 15, 30, 45].map(m => (
                  <option key={m} value={m}>{String(m).padStart(2, '0')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Day of week for Weekly */}
          {schedule === 'Weekly' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>Day of Week</label>
              <select style={{ ...inputStyle, width: '100%' }} value={schedDay} onChange={e => setSchedDay(Number(e.target.value))}>
                {DAYS_OF_WEEK.map((d, i) => (
                  <option key={i} value={i}>{d}</option>
                ))}
              </select>
            </div>
          )}

          {/* Day of month for Monthly */}
          {schedule === 'Monthly' && (
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>Day of Month</label>
              <select style={{ ...inputStyle, width: '100%' }} value={schedDay} onChange={e => setSchedDay(Number(e.target.value))}>
                {Array.from({ length: 28 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>{i + 1}</option>
                ))}
              </select>
            </div>
          )}

          <button
            onClick={saveSchedule}
            disabled={savingSchedule}
            style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '12px 24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer', width: '100%', marginTop: 8 }}
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
                    <span style={{ background: b.type?.includes('Scheduled') ? BLUE + '20' : NAVY + '15', color: b.type?.includes('Scheduled') ? BLUE : NAVY, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
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
