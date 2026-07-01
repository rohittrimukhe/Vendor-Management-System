import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

function StatusBadge({ status }) {
  const map = { 'Empanelled': ['#27AE60', '#F0FFF4'], 'In Evaluation': ['#F39C12', '#FFFBF0'], 'On Hold': ['#E74C3C', '#FFF5F5'], 'Archived': ['#95A5A6', '#F5F5F5'] };
  const [c, bg] = map[status] || ['#888', '#F5F5F5'];
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: c, background: bg }}>{status}</span>;
}

function TierBadge({ tier }) {
  const map = { 'Tier 1': ['#fff', '#1C3C6E'], 'Tier 2': ['#fff', '#29ABE2'], 'Tier 3': ['#666', '#E8ECF0'] };
  const [c, bg] = map[tier] || ['#666', '#E8ECF0'];
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: c, background: bg }}>{tier}</span>;
}

export default function VendorList() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('status') || '');
  const [filterTier, setFilterTier] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterExpiring, setFilterExpiring] = useState(searchParams.get('expiring') === 'true');
  const [viewMode, setViewMode] = useState('table');
  const [deleteId, setDeleteId] = useState(null);

  const loadVendors = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (filterStatus) params.set('status', filterStatus);
      if (filterTier) params.set('tier', filterTier);
      if (filterType) params.set('type', filterType);
      if (filterExpiring) params.set('expiring', 'true');
      const data = await api.get(`/api/vendors?${params}`);
      setVendors(data);
    } catch {}
    finally { setLoading(false); }
  };

  useEffect(() => { loadVendors(); }, [search, filterStatus, filterTier, filterType, filterExpiring]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vendor? This cannot be undone.')) return;
    try {
      await api.delete(`/api/vendors/${id}`);
      loadVendors();
    } catch (e) { alert(e.message); }
  };

  const selStyle = { padding: '8px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, background: '#fff', outline: 'none' };
  const btnStyle = (active) => ({ padding: '8px 12px', border: '1px solid #DDE2E8', borderRadius: 6, background: active ? '#1C3C6E' : '#fff', color: active ? '#fff' : '#555', cursor: 'pointer', fontSize: 13 });

  return (
    <Layout title="Vendor Directory">
      {/* Toolbar */}
      <div style={{ background: '#fff', borderRadius: 10, padding: '14px 18px', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          style={{ padding: '8px 14px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 14, outline: 'none', width: 220 }}
          placeholder="Search vendors..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <select style={selStyle} value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="">All Status</option>
          <option>Empanelled</option><option>In Evaluation</option><option>On Hold</option><option>Archived</option>
        </select>
        <select style={selStyle} value={filterTier} onChange={e => setFilterTier(e.target.value)}>
          <option value="">All Tiers</option>
          <option>Tier 1</option><option>Tier 2</option><option>Tier 3</option>
        </select>
        <select style={selStyle} value={filterType} onChange={e => setFilterType(e.target.value)}>
          <option value="">All Types</option>
          <option>IT Services</option><option>IT Products</option><option>Consulting</option><option>Infrastructure</option><option>Cloud Services</option><option>Managed Services</option><option>Other</option>
        </select>

        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={btnStyle(viewMode === 'table')} onClick={() => setViewMode('table')}>☰ Table</button>
          <button style={btnStyle(viewMode === 'card')} onClick={() => setViewMode('card')}>⊞ Cards</button>
          <button
            onClick={() => navigate('/vendors/add')}
            style={{ padding: '8px 18px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            + Add Vendor
          </button>
        </div>
      </div>

      {/* Count */}
      <div style={{ fontSize: 13, color: '#888', marginBottom: 12, paddingLeft: 4 }}>
        {loading ? 'Loading...' : `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} found`}
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#F5F6FA' }}>
                {['Vendor', 'Domains', 'Tier', 'Status', 'Type', 'Added', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E8ECF0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && vendors.length === 0 && (
                <tr><td colSpan={7} style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 15 }}>No vendors found. <span onClick={() => navigate('/vendors/add')} style={{ color: '#29ABE2', cursor: 'pointer' }}>Add your first vendor →</span></td></tr>
              )}
              {vendors.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #F0F4F8', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFBFC'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: v.logo_color || '#1C3C6E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, flexShrink: 0 }}>{v.logo_initial || v.name[0]}</div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#1C3C6E', cursor: 'pointer' }} onClick={() => navigate(`/vendors/${v.id}`)}>{v.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {(v.domains || []).slice(0, 2).map((d, i) => <span key={i} style={{ background: '#EEF5FF', color: '#1C3C6E', fontSize: 11, padding: '2px 8px', borderRadius: 12, fontWeight: 500 }}>{d}</span>)}
                      {(v.domains || []).length > 2 && <span style={{ fontSize: 11, color: '#888' }}>+{v.domains.length - 2}</span>}
                    </div>
                  </td>
                  <td style={{ padding: '12px 16px' }}><TierBadge tier={v.tier} /></td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={v.empanelment_status} /></td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#555' }}>{v.vendor_type || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#888' }}>{v.added_date || '—'}</td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => navigate(`/vendors/${v.id}`)} style={{ padding: '5px 12px', background: '#EEF5FF', color: '#1C3C6E', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>View</button>
                      <button onClick={() => handleDelete(v.id)} style={{ padding: '5px 10px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 18 }}>
          {!loading && vendors.length === 0 && (
            <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: 60, color: '#aaa', fontSize: 15 }}>
              No vendors found. <span onClick={() => navigate('/vendors/add')} style={{ color: '#29ABE2', cursor: 'pointer' }}>Add your first vendor →</span>
            </div>
          )}
          {vendors.map(v => (
            <div key={v.id} onClick={() => navigate(`/vendors/${v.id}`)} style={{ background: '#fff', borderRadius: 12, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'transform 0.15s, box-shadow 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: v.logo_color || '#1C3C6E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>{v.logo_initial || v.name[0]}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1C3C6E' }}>{v.name}</div>
                  <div style={{ fontSize: 12, color: '#888' }}>{v.vendor_type || '—'}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 6, marginBottom: 12, flexWrap: 'wrap' }}>
                <StatusBadge status={v.empanelment_status} />
                <TierBadge tier={v.tier} />
              </div>
              {(v.domains || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                  {v.domains.slice(0, 3).map((d, i) => <span key={i} style={{ background: '#F0F4F8', color: '#555', fontSize: 11, padding: '2px 8px', borderRadius: 12 }}>{d}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
