import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const ACTION_COLOR = { CREATE: '#27AE60', UPDATE: '#F39C12', DELETE: '#E74C3C' };
const ACTION_BG = { CREATE: '#F0FFF4', UPDATE: '#FFFBF0', DELETE: '#FFF5F5' };

export default function AuditLog() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filterEntity, setFilterEntity] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterUser, setFilterUser] = useState('');
  const [offset, setOffset] = useState(0);
  const LIMIT = 50;

  const load = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: LIMIT, offset });
      if (filterEntity) params.set('entity_type', filterEntity);
      if (filterAction) params.set('action', filterAction);
      if (filterUser) params.set('username', filterUser);
      const d = await api.get(`/api/audit?${params}`);
      setRows(d || []);
      // total comes from data.total but api.js unwraps data.data, so we need to call raw
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [filterEntity, filterAction, filterUser, offset]);

  function formatDate(d) {
    if (!d) return '—';
    return new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  const selStyle = { padding: '8px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', background: '#fff' };

  return (
    <Layout title="Audit Log">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 22, fontWeight: 700, margin: 0 }}>Audit Log</h1>
          <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>Complete activity trail — who changed what and when</p>
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          style={{ ...selStyle, width: 160 }}
          placeholder="Filter by user..."
          value={filterUser}
          onChange={e => { setFilterUser(e.target.value); setOffset(0); }}
        />
        <select style={selStyle} value={filterEntity} onChange={e => { setFilterEntity(e.target.value); setOffset(0); }}>
          <option value="">All Entities</option>
          <option value="Vendor">Vendors</option>
          <option value="User">Users</option>
          <option value="Contract">Contracts</option>
          <option value="Document">Documents</option>
        </select>
        <select style={selStyle} value={filterAction} onChange={e => { setFilterAction(e.target.value); setOffset(0); }}>
          <option value="">All Actions</option>
          <option value="CREATE">Create</option>
          <option value="UPDATE">Update</option>
          <option value="DELETE">Delete</option>
        </select>
        <span style={{ marginLeft: 'auto', fontSize: 13, color: '#888' }}>{rows.length} records shown</span>
      </div>

      {/* Table */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>Loading audit log...</div>
        ) : rows.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
            <p>No activity recorded yet. Actions will appear here as users make changes.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F6FA' }}>
                {['Time', 'User', 'Action', 'Entity', 'Details', 'IP'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E8ECF0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id} style={{ borderBottom: '1px solid #F5F5F5' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#888', whiteSpace: 'nowrap' }}>{formatDate(r.created_at)}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, fontWeight: 600, color: NAVY }}>{r.username || '—'}</td>
                  <td style={{ padding: '11px 16px' }}>
                    <span style={{ background: ACTION_BG[r.action] || '#F5F5F5', color: ACTION_COLOR[r.action] || '#666', padding: '3px 10px', borderRadius: 12, fontSize: 11, fontWeight: 700 }}>
                      {r.action || '—'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#444' }}>{r.entity_type || '—'}{r.entity_id ? ` #${r.entity_id}` : ''}</td>
                  <td style={{ padding: '11px 16px', fontSize: 13, color: '#555', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.details || '—'}</td>
                  <td style={{ padding: '11px 16px', fontSize: 12, color: '#aaa', fontFamily: 'monospace' }}>{r.ip_address || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {rows.length === LIMIT && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
          {offset > 0 && <button onClick={() => setOffset(Math.max(0, offset - LIMIT))} style={{ padding: '8px 20px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 }}>← Previous</button>}
          <button onClick={() => setOffset(offset + LIMIT)} style={{ padding: '8px 20px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14 }}>Next →</button>
        </div>
      )}
    </Layout>
  );
}
