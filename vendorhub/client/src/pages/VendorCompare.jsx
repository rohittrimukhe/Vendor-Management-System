import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';

const RISK_COLOR = { Low: '#27AE60', Medium: '#F39C12', High: '#E67E22', Critical: '#E74C3C' };
const RISK_BG = { Low: '#F0FFF4', Medium: '#FFFBF0', High: '#FFF3E0', Critical: '#FFF5F5' };

function Stars({ rating }) {
  if (!rating) return <span style={{ color: '#aaa', fontSize: 13 }}>No reviews</span>;
  return (
    <span>
      {[1,2,3,4,5].map(i => <span key={i} style={{ color: i <= Math.round(rating) ? '#F39C12' : '#DDD', fontSize: 16 }}>★</span>)}
      <span style={{ fontSize: 12, color: '#666', marginLeft: 4 }}>{rating.toFixed(1)}</span>
    </span>
  );
}

function Bar({ value, max = 100, color = BLUE }) {
  if (value === null || value === undefined) return <span style={{ color: '#aaa', fontSize: 12 }}>N/A</span>;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
        <span style={{ color: '#555' }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: '#EEF0F4', borderRadius: 4 }}>
        <div style={{ height: '100%', width: `${(value / max) * 100}%`, background: color, borderRadius: 4, transition: 'width 0.5s' }} />
      </div>
    </div>
  );
}

export default function VendorCompare() {
  const navigate = useNavigate();
  const [allVendors, setAllVendors] = useState([]);
  const [selected, setSelected] = useState([]);
  const [compared, setCompared] = useState([]);
  const [loading, setLoading] = useState(false);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    api.get('/api/vendors').then(d => setAllVendors(d || [])).catch(() => {});
  }, []);

  const toggle = (id) => {
    setSelected(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const runCompare = async () => {
    if (selected.length < 2) return;
    setComparing(true);
    setLoading(true);
    try {
      const d = await api.get(`/api/vendors/compare?ids=${selected.join(',')}`);
      setCompared(d || []);
    } catch (e) { alert(e.message); }
    setLoading(false);
  };

  const statusColor = { Empanelled: '#27AE60', 'In Evaluation': '#F39C12', 'On Hold': '#E74C3C', Archived: '#95A5A6' };

  const ROWS = [
    { label: 'Status', render: v => <span style={{ fontWeight: 600, color: statusColor[v.empanelment_status] || '#888' }}>{v.empanelment_status}</span> },
    { label: 'Tier', render: v => v.tier || '—' },
    { label: 'Type', render: v => v.vendor_type || '—' },
    { label: 'GSTIN', render: v => v.gstin || '—' },
    { label: 'Geo Scope', render: v => v.geo_scope || '—' },
    { label: 'Risk Level', render: v => <span style={{ fontWeight: 700, color: RISK_COLOR[v.risk_level], background: RISK_BG[v.risk_level], padding: '2px 10px', borderRadius: 12, fontSize: 12 }}>{v.risk_level}</span> },
    { label: 'Risk Score', render: v => (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ flex: 1, height: 8, background: '#EEF0F4', borderRadius: 4 }}>
          <div style={{ height: '100%', width: `${v.risk_score}%`, background: RISK_COLOR[v.risk_level], borderRadius: 4 }} />
        </div>
        <span style={{ fontSize: 12, color: '#666' }}>{v.risk_score}/100</span>
      </div>
    )},
    { label: 'Active Contracts', render: v => v.active_contracts || 0 },
    { label: 'Total Contract Value', render: v => v.total_spend ? `₹${Number(v.total_spend).toLocaleString('en-IN')}` : '—' },
    { label: 'Avg Rating', render: v => <Stars rating={v.avg_rating} /> },
    { label: 'On-Time Delivery', render: v => <Bar value={v.avg_delivery} color="#27AE60" /> },
    { label: 'Support Quality', render: v => <Bar value={v.avg_quality} color={BLUE} /> },
    { label: 'Price Competitiveness', render: v => <Bar value={v.avg_price} color="#8E44AD" /> },
    { label: 'Service Domains', render: v => (v.domains || []).length > 0 ? (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
        {v.domains.map((d, i) => <span key={i} style={{ background: '#EEF5FF', color: NAVY, fontSize: 11, padding: '2px 8px', borderRadius: 10 }}>{d}</span>)}
      </div>
    ) : '—' },
    { label: 'Certifications', render: v => (v.certifications || []).length > 0 ? (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {v.certifications.map(c => (
          <span key={c.id} style={{ fontSize: 12, color: c.is_valid ? '#27AE60' : '#E74C3C' }}>
            {c.is_valid ? '✓' : '✗'} {c.name}
          </span>
        ))}
      </div>
    ) : '—' },
  ];

  return (
    <Layout title="Vendor Comparison">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 22, fontWeight: 700, margin: 0 }}>Vendor Comparison</h1>
          <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>Select 2–4 vendors to compare side-by-side</p>
        </div>
        <button
          onClick={runCompare}
          disabled={selected.length < 2}
          style={{ padding: '10px 24px', background: selected.length < 2 ? '#aaa' : NAVY, color: '#fff', border: 'none', borderRadius: 8, fontFamily: 'Montserrat', fontWeight: 600, fontSize: 14, cursor: selected.length < 2 ? 'not-allowed' : 'pointer' }}
        >
          Compare {selected.length > 0 ? `(${selected.length})` : ''} →
        </button>
      </div>

      {/* Vendor picker */}
      {!comparing && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 24, marginBottom: 24 }}>
          <h3 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 15, marginBottom: 16 }}>Select Vendors to Compare</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12 }}>
            {allVendors.map(v => {
              const isSelected = selected.includes(v.id);
              return (
                <div
                  key={v.id}
                  onClick={() => toggle(v.id)}
                  style={{
                    padding: '12px 14px', borderRadius: 8, border: isSelected ? `2px solid ${BLUE}` : '2px solid #E8ECF0',
                    cursor: 'pointer', background: isSelected ? '#F0F8FF' : '#fff', transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}
                >
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: v.logo_color || NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>
                    {v.logo_initial || v.name[0]}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: NAVY, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</div>
                    <div style={{ fontSize: 11, color: '#888' }}>{v.tier} • {v.empanelment_status}</div>
                  </div>
                  {isSelected && <span style={{ color: BLUE, fontSize: 16 }}>✓</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Comparison table */}
      {comparing && !loading && compared.length > 0 && (
        <div>
          <button onClick={() => { setComparing(false); setCompared([]); }} style={{ marginBottom: 16, padding: '6px 14px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13 }}>← Change Selection</button>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: compared.length * 240 + 180 }}>
              <thead>
                <tr>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: 13, color: '#888', fontWeight: 600, width: 180, background: '#F5F6FA', borderBottom: '2px solid #E8ECF0' }}>Attribute</th>
                  {compared.map(v => (
                    <th key={v.id} style={{ padding: '14px 16px', textAlign: 'left', borderBottom: '2px solid #E8ECF0', background: '#F5F6FA' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 40, height: 40, borderRadius: 10, background: v.logo_color || NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>{v.logo_initial || v.name[0]}</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 14, color: NAVY, cursor: 'pointer' }} onClick={() => navigate(`/vendors/${v.id}`)}>{v.name}</div>
                          <div style={{ fontSize: 11, color: '#888' }}>{v.vendor_type || '—'}</div>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((row, ri) => (
                  <tr key={ri} style={{ background: ri % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F0F4F8' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#555' }}>{row.label}</td>
                    {compared.map(v => (
                      <td key={v.id} style={{ padding: '12px 16px', fontSize: 13, color: '#333' }}>{row.render(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {loading && <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>Comparing vendors...</div>}
    </Layout>
  );
}
