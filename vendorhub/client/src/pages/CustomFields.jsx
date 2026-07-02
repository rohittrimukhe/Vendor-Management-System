import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 };
const btnPrimary = { padding: '9px 20px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const btnSecondary = { padding: '9px 18px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#555' };

const FIELD_TYPES = ['text', 'number', 'date', 'textarea', 'select'];
const APPLIES_TO = ['all', 'IT', 'Non-IT', 'Staffing', 'Consulting', 'Infrastructure', 'SaaS'];

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 16 }}>{title}</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 20, color: '#888', lineHeight: 1 }}>✕</span>
        </div>
        {children}
      </div>
    </div>
  );
}

const FIELD_TYPE_ICONS = { text: '🔤', number: '#️⃣', date: '📅', textarea: '📝', select: '⬇️' };
const APPLIES_COLORS = { all: '#1C3C6E', IT: '#29ABE2', 'Non-IT': '#8E44AD', Staffing: '#27AE60', Consulting: '#E67E22', Infrastructure: '#E74C3C', SaaS: '#16A085' };

export default function CustomFields() {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', field_type: 'text', applies_to: 'all', options: '', required: false });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => api.get('/api/custom-fields/definitions').then(setFields).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditing(null);
    setForm({ name: '', field_type: 'text', applies_to: 'all', options: '', required: false });
    setError('');
    setModal(true);
  };

  const openEdit = (f) => {
    setEditing(f);
    setForm({
      name: f.name,
      field_type: f.field_type,
      applies_to: f.applies_to,
      options: f.options ? (Array.isArray(f.options) ? f.options.join(', ') : JSON.parse(f.options).join(', ')) : '',
      required: !!f.required,
    });
    setError('');
    setModal(true);
  };

  const save = async () => {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true);
    try {
      const options = form.field_type === 'select' && form.options ? form.options.split(',').map(s => s.trim()).filter(Boolean) : null;
      const body = { ...form, options };
      if (editing) await api.put(`/api/custom-fields/definitions/${editing.id}`, body);
      else await api.post('/api/custom-fields/definitions', body);
      await load();
      setModal(false);
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const deleteField = async (id) => {
    if (!window.confirm('Delete this custom field? All saved values will be removed.')) return;
    await api.delete(`/api/custom-fields/definitions/${id}`);
    load();
  };

  return (
    <Layout title="Custom Fields">
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 22, color: NAVY, margin: 0 }}>Custom Fields</h2>
          <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Define custom fields that appear on vendor profiles. You can scope fields to specific vendor types.</p>
        </div>
        <button onClick={openAdd} style={btnPrimary}>+ Add Field</button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading...</div>
      ) : fields.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: 60, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧩</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, color: NAVY, marginBottom: 6 }}>No custom fields yet</div>
          <div style={{ fontSize: 13, color: '#888', marginBottom: 20 }}>Add fields like "Account Manager", "Contract Category", or "Onboarding Date" to enrich vendor profiles.</div>
          <button onClick={openAdd} style={btnPrimary}>+ Add First Field</button>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F6FA' }}>
                {['Field Name', 'Type', 'Applies To', 'Required', 'Options', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #E8ECF0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map((f, i) => {
                const opts = f.options ? (typeof f.options === 'string' ? JSON.parse(f.options) : f.options) : [];
                return (
                  <tr key={f.id} style={{ borderBottom: '1px solid #F0F4F8', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontWeight: 600, fontSize: 14, color: NAVY }}>{f.name}</span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', background: '#EEF5FF', borderRadius: 10, fontSize: 12, fontWeight: 600, color: NAVY }}>
                        {FIELD_TYPE_ICONS[f.field_type]} {f.field_type}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 10, fontSize: 12, fontWeight: 600, color: '#fff', background: APPLIES_COLORS[f.applies_to] || NAVY }}>
                        {f.applies_to === 'all' ? 'All Vendors' : f.applies_to}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{ fontSize: 13, color: f.required ? '#E74C3C' : '#aaa', fontWeight: f.required ? 600 : 400 }}>{f.required ? 'Yes' : 'No'}</span>
                    </td>
                    <td style={{ padding: '13px 16px', maxWidth: 200 }}>
                      {opts.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                          {opts.slice(0, 3).map(o => <span key={o} style={{ padding: '2px 7px', background: '#F4EFFF', color: '#6B21A8', borderRadius: 8, fontSize: 11 }}>{o}</span>)}
                          {opts.length > 3 && <span style={{ padding: '2px 7px', background: '#F5F5F5', color: '#888', borderRadius: 8, fontSize: 11 }}>+{opts.length - 3} more</span>}
                        </div>
                      ) : <span style={{ color: '#aaa', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEdit(f)} style={{ padding: '5px 12px', background: '#EEF5FF', color: NAVY, border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                        <button onClick={() => deleteField(f.id)} style={{ padding: '5px 12px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <Modal title={editing ? 'Edit Custom Field' : 'Add Custom Field'} onClose={() => setModal(false)}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Field Name *</label>
            <input style={inputStyle} placeholder="e.g., Account Manager, Contract Category" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} autoFocus />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Field Type</label>
            <select style={inputStyle} value={form.field_type} onChange={e => setForm(p => ({ ...p, field_type: e.target.value }))}>
              {FIELD_TYPES.map(t => <option key={t} value={t}>{FIELD_TYPE_ICONS[t]} {t}</option>)}
            </select>
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Applies To</label>
            <select style={inputStyle} value={form.applies_to} onChange={e => setForm(p => ({ ...p, applies_to: e.target.value }))}>
              {APPLIES_TO.map(a => <option key={a} value={a}>{a === 'all' ? 'All Vendors' : a}</option>)}
            </select>
          </div>
          {form.field_type === 'select' && (
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Options (comma-separated)</label>
              <input style={inputStyle} placeholder="Option 1, Option 2, Option 3" value={form.options} onChange={e => setForm(p => ({ ...p, options: e.target.value }))} />
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Enter each option separated by a comma</div>
            </div>
          )}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: '#444' }}>
              <input type="checkbox" checked={form.required} onChange={e => setForm(p => ({ ...p, required: e.target.checked }))} />
              <span style={{ fontWeight: 600 }}>Required field</span>
              <span style={{ color: '#888', fontWeight: 400 }}>(shows on vendor profile as mandatory)</span>
            </label>
          </div>
          {error && <p style={{ color: '#E74C3C', fontSize: 12, marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => setModal(false)}>Cancel</button>
            <button style={btnPrimary} onClick={save} disabled={saving}>{saving ? 'Saving...' : editing ? 'Update' : 'Add Field'}</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
