import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';

const PRIORITY_COLOR = { Urgent: '#E74C3C', High: '#E67E22', Medium: '#F39C12', Low: '#27AE60' };
const PRIORITY_BG   = { Urgent: '#FFF5F5', High: '#FFF3E0', Medium: '#FFFBF0', Low: '#F0FFF4' };
const STATUS_COLOR  = { Open: '#29ABE2', 'In Progress': '#8E44AD', Done: '#27AE60' };
const STATUS_BG     = { Open: '#EEF9FF', 'In Progress': '#F4EFFF', Done: '#F0FFF4' };

function PriBadge({ p }) {
  return <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[p], background: PRIORITY_BG[p] }}>{p}</span>;
}
function StatusBadge({ s }) {
  return <span style={{ padding: '2px 9px', borderRadius: 12, fontSize: 11, fontWeight: 600, color: STATUS_COLOR[s], background: STATUS_BG[s] }}>{s}</span>;
}

export default function MyTasks() {
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('active');

  const load = () => {
    setLoading(true);
    api.get('/api/tasks').then(setTasks).catch(() => setTasks([])).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (task, status) => {
    try {
      await api.put(`/api/vendors/${task.vendor_id}/tasks/${task.id}`, { status });
      load();
    } catch (e) { alert(e.message); }
  };

  const filtered = tasks.filter(t => {
    if (filter === 'active') return t.status !== 'Done';
    if (filter === 'done') return t.status === 'Done';
    if (filter === 'overdue') return t.status !== 'Done' && t.due_date && t.due_date < new Date().toISOString().split('T')[0];
    return true;
  });

  const overdue = tasks.filter(t => t.status !== 'Done' && t.due_date && t.due_date < new Date().toISOString().split('T')[0]);
  const open = tasks.filter(t => t.status === 'Open');
  const inProg = tasks.filter(t => t.status === 'In Progress');

  const selBtn = (f, label, count) => (
    <button
      onClick={() => setFilter(f)}
      style={{ padding: '7px 16px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, fontWeight: filter === f ? 700 : 400, background: filter === f ? NAVY : '#fff', color: filter === f ? '#fff' : '#555', cursor: 'pointer' }}
    >
      {label} {count > 0 && <span style={{ background: filter === f ? 'rgba(255,255,255,0.25)' : '#E8ECF0', borderRadius: 10, padding: '1px 6px', fontSize: 11, marginLeft: 4 }}>{count}</span>}
    </button>
  );

  return (
    <Layout title="My Tasks">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 22, fontWeight: 700, margin: 0 }}>My Tasks</h1>
          <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>Action items assigned to you across all vendors</p>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Open', value: open.length, color: '#29ABE2', bg: '#EEF9FF' },
          { label: 'In Progress', value: inProg.length, color: '#8E44AD', bg: '#F4EFFF' },
          { label: 'Overdue', value: overdue.length, color: '#E74C3C', bg: '#FFF5F5' },
          { label: 'Done', value: tasks.filter(t => t.status === 'Done').length, color: '#27AE60', bg: '#F0FFF4' },
        ].map(s => (
          <div key={s.label} style={{ background: s.bg, border: `1px solid ${s.color}30`, borderRadius: 10, padding: '14px 20px', flex: 1, minWidth: 120 }}>
            <div style={{ fontSize: 11, color: s.color, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</div>
            <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 28, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {selBtn('active', 'Active', open.length + inProg.length)}
        {selBtn('overdue', 'Overdue', overdue.length)}
        {selBtn('done', 'Completed', tasks.filter(t => t.status === 'Done').length)}
        {selBtn('all', 'All', tasks.length)}
      </div>

      {/* Task list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {loading && <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Loading tasks...</div>}
        {!loading && filtered.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: '#aaa', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#555' }}>
              {filter === 'active' ? 'No active tasks — you\'re all caught up!' : 'No tasks in this category.'}
            </div>
          </div>
        )}
        {filtered.map(t => {
          const isOverdue = t.status !== 'Done' && t.due_date && t.due_date < new Date().toISOString().split('T')[0];
          const daysLeft = t.due_date ? Math.ceil((new Date(t.due_date) - new Date()) / 86400000) : null;
          return (
            <div key={t.id} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', borderLeft: `4px solid ${PRIORITY_COLOR[t.priority] || '#DDE2E8'}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                {/* Checkbox */}
                <div
                  onClick={() => updateStatus(t, t.status === 'Done' ? 'Open' : 'Done')}
                  style={{ width: 20, height: 20, borderRadius: 4, border: `2px solid ${t.status === 'Done' ? '#27AE60' : '#DDE2E8'}`, background: t.status === 'Done' ? '#27AE60' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}
                >
                  {t.status === 'Done' && <span style={{ color: '#fff', fontSize: 12 }}>✓</span>}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: t.status === 'Done' ? '#aaa' : NAVY, textDecoration: t.status === 'Done' ? 'line-through' : 'none' }}>{t.title}</span>
                    <PriBadge p={t.priority} />
                    <StatusBadge s={t.status} />
                  </div>
                  {t.description && <p style={{ fontSize: 13, color: '#666', margin: '0 0 8px', lineHeight: 1.5 }}>{t.description}</p>}
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span onClick={() => navigate(`/vendors/${t.vendor_id}`)} style={{ fontSize: 12, color: '#29ABE2', cursor: 'pointer', fontWeight: 500 }}>🏢 {t.vendor_name}</span>
                    {t.due_date && (
                      <span style={{ fontSize: 12, color: isOverdue ? '#E74C3C' : '#888', fontWeight: isOverdue ? 600 : 400 }}>
                        📅 {isOverdue ? `Overdue by ${Math.abs(daysLeft)}d` : daysLeft === 0 ? 'Due today' : `Due in ${daysLeft}d`} ({t.due_date})
                      </span>
                    )}
                    <span style={{ fontSize: 12, color: '#aaa' }}>by {t.created_by}</span>
                  </div>
                </div>

                {/* Status toggle */}
                {t.status !== 'Done' && (
                  <select
                    value={t.status}
                    onChange={e => updateStatus(t, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    style={{ padding: '5px 10px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 12, background: '#fff', cursor: 'pointer', outline: 'none' }}
                  >
                    <option>Open</option>
                    <option>In Progress</option>
                    <option>Done</option>
                  </select>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Layout>
  );
}
