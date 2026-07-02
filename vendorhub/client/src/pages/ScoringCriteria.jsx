import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 };

const DEFAULT_CRITERIA = [
  { name: 'Financial Stability', weight: 20, description: 'Vendor financial health and creditworthiness' },
  { name: 'Delivery Performance', weight: 25, description: 'On-time delivery and SLA adherence' },
  { name: 'Quality & Support', weight: 25, description: 'Product/service quality and support responsiveness' },
  { name: 'Price Competitiveness', weight: 15, description: 'Value for money compared to market rates' },
  { name: 'Compliance & Certifications', weight: 15, description: 'Regulatory compliance and valid certifications' },
];

export default function ScoringCriteria() {
  const [criteria, setCriteria] = useState([]);
  const [totalWeight, setTotalWeight] = useState(0);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', weight: 20, description: '' });
  const [editId, setEditId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = () => {
    api.get('/api/scoring/criteria').then(d => {
      setCriteria(d.data || []);
      setTotalWeight(d.totalWeight || 0);
    }).catch(() => {}).finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name.trim()) return setError('Name required');
    setSaving(true); setError('');
    try {
      if (editId) await api.put(`/api/scoring/criteria/${editId}`, form);
      else await api.post('/api/scoring/criteria', form);
      setForm({ name: '', weight: 20, description: '' });
      setEditId(null);
      load();
    } catch (e) { setError(e.message); }
    setSaving(false);
  };

  const deleteCriteria = async (id) => {
    if (!window.confirm('Delete this criteria? All vendor scores for this will be removed.')) return;
    await api.delete(`/api/scoring/criteria/${id}`);
    load();
  };

  const seedDefaults = async () => {
    if (!window.confirm('Add default scoring criteria?')) return;
    for (const c of DEFAULT_CRITERIA) {
      try { await api.post('/api/scoring/criteria', c); } catch {}
    }
    load();
  };

  const weightColor = totalWeight === 100 ? '#27AE60' : totalWeight > 100 ? '#E74C3C' : '#F39C12';

  return (
    <Layout title="Scoring Criteria">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 22, fontWeight: 700, margin: 0 }}>Vendor Scoring Criteria</h1>
          <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>Define weighted criteria used to evaluate and score vendors</p>
        </div>
        {criteria.length === 0 && !loading && (
          <button onClick={seedDefaults} style={{ padding: '9px 18px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            + Load Default Criteria
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 24 }}>
        {/* Criteria list */}
        <div>
          {/* Weight indicator */}
          <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: '#555', fontWeight: 500 }}>Total Weight</span>
                <span style={{ fontSize: 14, fontWeight: 700, color: weightColor }}>{totalWeight}% {totalWeight === 100 ? '✓' : totalWeight > 100 ? '(exceeds 100%)' : '(should total 100%)'}</span>
              </div>
              <div style={{ height: 8, background: '#EEF0F4', borderRadius: 4, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(totalWeight, 100)}%`, background: weightColor, borderRadius: 4, transition: 'width 0.4s' }} />
              </div>
            </div>
          </div>

          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#aaa' }}>Loading...</div>
          ) : criteria.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#aaa', background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#555', marginBottom: 6 }}>No scoring criteria defined yet</div>
              <div style={{ fontSize: 13, color: '#aaa' }}>Add criteria using the form or load defaults</div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {criteria.map((c, i) => (
                <div key={c.id} style={{ background: '#fff', borderRadius: 10, padding: '16px 20px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{c.weight}%</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: NAVY }}>{c.name}</div>
                    {c.description && <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{c.description}</div>}
                    <div style={{ height: 5, background: '#EEF0F4', borderRadius: 3, marginTop: 8, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${c.weight}%`, background: '#29ABE2', borderRadius: 3 }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setEditId(c.id); setForm({ name: c.name, weight: c.weight, description: c.description || '' }); }} style={{ padding: '5px 12px', background: '#EEF5FF', color: NAVY, border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                    <button onClick={() => deleteCriteria(c.id)} style={{ padding: '5px 10px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Form */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', alignSelf: 'flex-start' }}>
          <h3 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 15, marginBottom: 20 }}>{editId ? 'Edit Criteria' : 'Add Criteria'}</h3>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Criteria Name</label>
            <input style={inputStyle} placeholder="e.g. Financial Stability" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Weight: <strong>{form.weight}%</strong></label>
            <input type="range" min={5} max={60} step={5} value={form.weight} onChange={e => setForm({ ...form, weight: parseInt(e.target.value) })} style={{ width: '100%' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginTop: 2 }}>
              <span>5%</span><span>60%</span>
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Description (optional)</label>
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} placeholder="What does this criteria measure?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          {error && <p style={{ color: '#E74C3C', fontSize: 12, marginBottom: 12 }}>{error}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            {editId && (
              <button onClick={() => { setEditId(null); setForm({ name: '', weight: 20, description: '' }); }} style={{ padding: '9px 16px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#555', flex: 1 }}>Cancel</button>
            )}
            <button onClick={save} disabled={saving} style={{ padding: '9px 20px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer', flex: 2 }}>
              {saving ? 'Saving...' : editId ? 'Update' : 'Add Criteria'}
            </button>
          </div>
          <div style={{ marginTop: 18, padding: 14, background: '#F8FAFC', borderRadius: 8, fontSize: 12, color: '#888', lineHeight: 1.6 }}>
            <strong style={{ color: NAVY }}>Tip:</strong> Weights should total 100% for accurate scoring. Each vendor's composite score is computed as the weighted average of their individual scores.
          </div>
        </div>
      </div>
    </Layout>
  );
}
