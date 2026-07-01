import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 32, width: 480, boxShadow: '0 8px 40px rgba(0,0,0,0.18)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ fontFamily: 'Montserrat, sans-serif', color: NAVY, fontSize: 20 }}>{title}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputStyle = { width: '100%', padding: '10px 14px', border: '1px solid #ddd', borderRadius: 8, fontSize: 14, fontFamily: 'Open Sans, sans-serif', outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 6, fontFamily: 'Open Sans, sans-serif' };

const PRESET_COLORS = ['#1C3C6E', '#29ABE2', '#27AE60', '#F39C12', '#8E44AD', '#E74C3C', '#16A085', '#2C3E50'];

export default function Groups() {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', description: '', access_level: 'Read', color: BLUE });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const d = await api.get('/api/groups');
    setGroups(d || []);
    setLoading(false);
  }

  function openAdd() {
    setEditing(null);
    setForm({ name: '', description: '', access_level: 'Read', color: BLUE });
    setErr('');
    setShowModal(true);
  }

  function openEdit(g) {
    setEditing(g);
    setForm({ name: g.name, description: g.description || '', access_level: g.access_level || 'Read', color: g.color || BLUE });
    setErr('');
    setShowModal(true);
  }

  async function save() {
    if (!form.name) return setErr('Group name is required');
    setSaving(true);
    try {
      if (editing) await api.put(`/api/groups/${editing.id}`, form);
      else await api.post('/api/groups', form);
      setShowModal(false);
      load();
    } catch (e) {
      setErr(e.message || 'Error saving group');
    }
    setSaving(false);
  }

  async function deleteGroup(g) {
    try {
      await api.delete(`/api/groups/${g.id}`);
      setDeleteConfirm(null);
      load();
    } catch (e) {
      alert(e.message || 'Cannot delete group');
    }
  }

  const accessColors = { Full: '#27AE60', Read: BLUE, None: '#E74C3C' };

  return (
    <Layout title="Groups & Roles">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat, sans-serif', color: NAVY, fontSize: 22, fontWeight: 700 }}>Groups & Roles</h1>
          <p style={{ color: '#888', fontSize: 14, marginTop: 2 }}>Manage access groups and their permissions</p>
        </div>
        <button onClick={openAdd} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 20px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>
          + Add Group
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#aaa' }}>Loading groups...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
          {groups.map(g => (
            <div key={g.id} style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.07)', padding: 24, borderLeft: `4px solid ${g.color || BLUE}` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: g.color || BLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: 14 }}>
                    {g.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, color: '#222', fontSize: 15 }}>{g.name}</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{g.user_count || 0} user{g.user_count !== 1 ? 's' : ''}</div>
                  </div>
                </div>
                <span style={{ background: (accessColors[g.access_level] || BLUE) + '20', color: accessColors[g.access_level] || BLUE, borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                  {g.access_level}
                </span>
              </div>
              <p style={{ color: '#666', fontSize: 13, marginBottom: 16, minHeight: 36 }}>{g.description || 'No description'}</p>
              <div style={{ display: 'flex', gap: 8, borderTop: '1px solid #f0f0f0', paddingTop: 16 }}>
                <button onClick={() => openEdit(g)} style={{ flex: 1, background: NAVY + '10', color: NAVY, border: 'none', borderRadius: 6, padding: '8px', fontSize: 13, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                <button
                  onClick={() => setDeleteConfirm(g)}
                  disabled={g.id === 1}
                  style={{ flex: 1, background: g.id === 1 ? '#f5f5f5' : '#fef3f0', color: g.id === 1 ? '#ccc' : '#E74C3C', border: 'none', borderRadius: 6, padding: '8px', fontSize: 13, cursor: g.id === 1 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <Modal title={editing ? 'Edit Group' : 'Add Group'} onClose={() => setShowModal(false)}>
          {err && <div style={{ background: '#fef3f0', color: '#E74C3C', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: 14 }}>{err}</div>}
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Group Name *</label>
            <input style={inputStyle} value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="e.g. Finance Team" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Description</label>
            <input style={inputStyle} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Brief description of this group's role" />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={labelStyle}>Default Access Level</label>
            <select style={inputStyle} value={form.access_level} onChange={e => setForm({ ...form, access_level: e.target.value })}>
              <option value="Full">Full</option>
              <option value="Read">Read</option>
              <option value="None">None</option>
            </select>
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 4 }}>
              {PRESET_COLORS.map(c => (
                <div key={c} onClick={() => setForm({ ...form, color: c })} style={{ width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer', border: form.color === c ? '3px solid #222' : '3px solid transparent', transition: 'border 0.15s' }} />
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button onClick={() => setShowModal(false)} style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={save} disabled={saving} style={{ background: BLUE, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, cursor: 'pointer' }}>
              {saving ? 'Saving...' : editing ? 'Update Group' : 'Create Group'}
            </button>
          </div>
        </Modal>
      )}

      {deleteConfirm && (
        <Modal title="Delete Group?" onClose={() => setDeleteConfirm(null)}>
          <p style={{ color: '#555', fontSize: 14, marginBottom: 24 }}>
            Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This will also remove all associated permissions. Users in this group will lose their group assignment.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12 }}>
            <button onClick={() => setDeleteConfirm(null)} style={{ background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 8, padding: '10px 20px', cursor: 'pointer' }}>Cancel</button>
            <button onClick={() => deleteGroup(deleteConfirm)} style={{ background: '#E74C3C', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontFamily: 'Montserrat, sans-serif', fontWeight: 600, cursor: 'pointer' }}>Delete Group</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
