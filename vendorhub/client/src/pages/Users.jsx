import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: NAVY, fontSize: 20 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8,
  fontSize: 14, fontFamily: 'Open Sans, sans-serif', outline: 'none', boxSizing: 'border-box'
};

const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, fontFamily: 'Open Sans, sans-serif' };

export default function Users() {
  const [users, setUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPwModal, setShowPwModal] = useState(null);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', username: '', password: '', group_id: '', department: '', reporting_manager_id: '' });
  const [newPw, setNewPw] = useState('');
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const [ud, gd] = await Promise.all([api.get('/api/users'), api.get('/api/groups')]);
    setUsers(ud || []);
    setGroups(gd || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', email: '', username: '', password: '', group_id: groups[0]?.id || '', department: '', reporting_manager_id: '' });
    setErr('');
    setShowModal(true);
  }

  function openEdit(u) {
    setEditing(u);
    setForm({ name: u.name, email: u.email || '', username: u.username, password: '', group_id: u.group_id || '', department: u.department || '', reporting_manager_id: u.reporting_manager_id || '' });
    setErr('');
    setShowModal(true);
  }

  async function save() {
    if (!form.name || !form.username) return setErr('Name and username are required');
    if (!editing && !form.password) return setErr('Password is required for new users');
    setSaving(true);
    try {
      if (editing) {
        const body = { name: form.name, email: form.email, group_id: form.group_id, department: form.department, reporting_manager_id: form.reporting_manager_id || null };
        if (form.password) body.password = form.password;
        await api.put(`/api/users/${editing.id}`, body);
      } else {
        await api.post('/api/users', { ...form, reporting_manager_id: form.reporting_manager_id || null });
      }
      setShowModal(false);
      load();
    } catch (e) {
      setErr(e.message || 'Error saving user');
    }
    setSaving(false);
  }

  async function toggleStatus(u) {
    const newStatus = u.status === 'active' ? 'inactive' : 'active';
    await api.put(`/api/users/${u.id}`, { ...u, status: newStatus });
    load();
  }

  async function resetPassword() {
    if (!newPw) return;
    await api.put(`/api/users/${showPwModal.id}`, { password: newPw });
    setShowPwModal(null);
    setNewPw('');
  }

  const groupMap = {};
  groups.forEach(g => { groupMap[g.id] = g; });

  const userMap = {};
  users.forEach(u => { userMap[u.id] = u; });

  function getInitials(name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }

  const avatarColors = ['#1C3C6E','#29ABE2','#27AE60','#E67E22','#8E44AD','#E74C3C'];

  return (
    <Layout title="User Management">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', color: NAVY, fontSize: 22, fontWeight: 700 }}>Users</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 2 }}>{users.length} user{users.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button onClick={openAdd} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Add User
        </button>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Loading users...</div>
        ) : users.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
            <p>No users yet. Add the first user to get started.</p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #f0f0f0' }}>
                {['User', 'Username', 'Group', 'Department', 'Reporting Manager', 'Status', 'Last Login', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '14px 16px', textAlign: 'left', fontSize: 12, fontWeight: 600, color: '#888', fontFamily: 'Open Sans, sans-serif', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => {
                const g = groupMap[u.group_id];
                const color = avatarColors[i % avatarColors.length];
                const manager = u.manager_name || (u.reporting_manager_id ? userMap[u.reporting_manager_id]?.name : null);
                return (
                  <tr key={u.id} style={{ borderBottom: '1px solid #f5f5f5' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 13 }}>
                          {getInitials(u.name)}
                        </div>
                        <div>
                          <div style={{ fontWeight: 600, color: '#222', fontSize: 14 }}>{u.name}</div>
                          <div style={{ color: '#aaa', fontSize: 12 }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#555', fontSize: 14 }}>{u.username}</td>
                    <td style={{ padding: '14px 16px' }}>
                      {g ? (
                        <span style={{ background: g.color + '20', color: g.color, border: `1px solid ${g.color}40`, borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600 }}>
                          {g.name}
                        </span>
                      ) : <span style={{ color: '#aaa', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '14px 16px', color: '#555', fontSize: 14 }}>{u.department || '—'}</td>
                    <td style={{ padding: '14px 16px', color: '#555', fontSize: 14 }}>{manager || '—'}</td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{
                        background: u.status === 'active' ? '#e6f9f0' : '#fef3f0',
                        color: u.status === 'active' ? '#27AE60' : '#E74C3C',
                        borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600
                      }}>
                        {u.status === 'active' ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', color: '#aaa', fontSize: 13 }}>
                      {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={() => openEdit(u)} style={{ background: NAVY + '15', color: NAVY, border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                        <button onClick={() => { setShowPwModal(u); setNewPw(''); }} style={{ background: '#FFF3E0', color: '#E67E22', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Reset PW</button>
                        <button onClick={() => toggleStatus(u)} style={{
                          background: u.status === 'active' ? '#fef3f0' : '#e6f9f0',
                          color: u.status === 'active' ? '#E74C3C' : '#27AE60',
                          border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600
                        }}>
                          {u.status === 'active' ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <Modal title={editing ? 'Edit User' : 'Add User'} onClose={() => setShowModal(false)}>
          {err && <div style={{ background: '#fef3f0', color: '#E74C3C', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{err}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Full Name *</label>
              <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="John Doe" />
            </div>
            <div>
              <label style={labelStyle}>Email</label>
              <input style={inputStyle} type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="john@company.com" />
            </div>
            <div>
              <label style={labelStyle}>Username *</label>
              <input style={inputStyle} value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} placeholder="john.doe" disabled={!!editing} />
            </div>
            <div>
              <label style={labelStyle}>{editing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input style={inputStyle} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
            </div>
            <div>
              <label style={labelStyle}>Group / Role</label>
              <select style={inputStyle} value={form.group_id} onChange={e => setForm({ ...form, group_id: e.target.value })}>
                <option value="">— Select Group —</option>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Department</label>
              <input style={inputStyle} value={form.department} onChange={e => setForm({ ...form, department: e.target.value })} placeholder="IT, Finance, Procurement..." />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Reporting Manager</label>
              <select style={inputStyle} value={form.reporting_manager_id} onChange={e => setForm({ ...form, reporting_manager_id: e.target.value })}>
                <option value="">— None —</option>
                {users.filter(u => !editing || u.id !== editing.id).map(u => (
                  <option key={u.id} value={u.id}>{u.name} ({u.username})</option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24 }}>
            <button onClick={() => setShowModal(false)} style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer', fontFamily: 'Open Sans, sans-serif' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Saving...' : editing ? 'Update User' : 'Add User'}
            </button>
          </div>
        </Modal>
      )}

      {showPwModal && (
        <Modal title={`Reset Password — ${showPwModal.name}`} onClose={() => setShowPwModal(null)}>
          <p style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Set a new password for this user. They should change it on next login.</p>
          <label style={labelStyle}>New Password</label>
          <input style={{ ...inputStyle, marginBottom: 24 }} type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="New password" />
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button onClick={() => setShowPwModal(null)} style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={resetPassword} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, cursor: 'pointer' }}>Reset Password</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
