import React, { useState, useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';
import { AuthContext } from '../App.jsx';

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

const RISK_COLOR = { Low: '#27AE60', Medium: '#F39C12', High: '#E67E22', Critical: '#E74C3C' };
const RISK_BG = { Low: '#F0FFF4', Medium: '#FFFBF0', High: '#FFF3E0', Critical: '#FFF5F5' };

export default function VendorList() {
  const navigate = useNavigate();
  const { can } = useContext(AuthContext);
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
  const [selected, setSelected] = useState([]);
  const [bulkAction, setBulkAction] = useState('');
  const [bulkValue, setBulkValue] = useState('');
  const [bulkConfirm, setBulkConfirm] = useState(false);
  const [savedViews, setSavedViews] = useState(() => { try { return JSON.parse(localStorage.getItem('vendorhub_saved_views') || '[]'); } catch { return []; } });
  const [saveViewName, setSaveViewName] = useState('');
  const [showSaveView, setShowSaveView] = useState(false);

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

  useEffect(() => { loadVendors(); setSelected([]); }, [search, filterStatus, filterTier, filterType, filterExpiring]);

  const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(prev => prev.length === vendors.length ? [] : vendors.map(v => v.id));

  const runBulkAction = async () => {
    if (!bulkAction || !selected.length) return;
    if (bulkAction !== 'delete' && !bulkValue) return;
    try {
      await api.post('/api/vendors/bulk', { ids: selected, action: bulkAction, value: bulkValue });
      setSelected([]); setBulkAction(''); setBulkValue(''); setBulkConfirm(false);
      loadVendors();
    } catch (e) { alert(e.message); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this vendor? This cannot be undone.')) return;
    try {
      await api.delete(`/api/vendors/${id}`);
      loadVendors();
    } catch (e) { alert(e.message); }
  };

  const handleExport = () => {
    window.open('/api/vendors/export', '_blank');
  };

  const hasActiveFilter = search || filterStatus || filterTier || filterType || filterExpiring;

  const saveView = () => {
    if (!saveViewName.trim()) return;
    const view = { name: saveViewName.trim(), search, filterStatus, filterTier, filterType, filterExpiring };
    const updated = [...savedViews.filter(v => v.name !== view.name), view].slice(-10);
    setSavedViews(updated);
    localStorage.setItem('vendorhub_saved_views', JSON.stringify(updated));
    setSaveViewName('');
    setShowSaveView(false);
  };

  const applyView = (v) => { setSearch(v.search || ''); setFilterStatus(v.filterStatus || ''); setFilterTier(v.filterTier || ''); setFilterType(v.filterType || ''); setFilterExpiring(!!v.filterExpiring); };

  const deleteView = (name) => {
    const updated = savedViews.filter(v => v.name !== name);
    setSavedViews(updated);
    localStorage.setItem('vendorhub_saved_views', JSON.stringify(updated));
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
          {hasActiveFilter && (
            <button onClick={() => setShowSaveView(s => !s)} style={{ padding: '8px 12px', border: '1px solid #29ABE2', borderRadius: 6, background: showSaveView ? '#EEF9FF' : '#fff', color: '#29ABE2', cursor: 'pointer', fontSize: 13 }} title="Save current filters as a view">💾 Save View</button>
          )}
          <button onClick={handleExport} style={{ padding: '8px 14px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', color: '#555', cursor: 'pointer', fontSize: 13 }} title="Export as CSV">⬇ Export CSV</button>
          {can('Vendors', 'Edit') && (
            <>
              <button onClick={() => navigate('/vendors/import')} style={{ padding: '8px 14px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', color: '#555', cursor: 'pointer', fontSize: 13 }} title="Import vendors from Excel">⬆ Import Excel</button>
              <button onClick={() => navigate('/vendors/compare')} style={{ padding: '8px 14px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', color: '#1C3C6E', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>⚖ Compare</button>
              <button
                onClick={() => navigate('/vendors/add')}
                style={{ padding: '8px 18px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
              >
                + Add Vendor
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selected.length > 0 && can('Vendors', 'Edit') && (
        <div style={{ background: '#1C3C6E', borderRadius: 10, padding: '12px 18px', marginBottom: 12, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{selected.length} selected</span>
          <select value={bulkAction} onChange={e => { setBulkAction(e.target.value); setBulkValue(''); }}
            style={{ padding: '7px 12px', borderRadius: 6, border: 'none', fontSize: 13, background: '#fff', color: '#1C3C6E', outline: 'none', fontWeight: 600 }}>
            <option value="">— Choose action —</option>
            <option value="status">Change Status</option>
            <option value="tier">Change Tier</option>
            {can('Vendors', 'Full') && <option value="delete">Delete Selected</option>}
          </select>
          {bulkAction === 'status' && (
            <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 6, border: 'none', fontSize: 13, background: '#fff', color: '#1C3C6E', outline: 'none', fontWeight: 600 }}>
              <option value="">— Select Status —</option>
              <option>Empanelled</option><option>In Evaluation</option><option>On Hold</option><option>Archived</option>
            </select>
          )}
          {bulkAction === 'tier' && (
            <select value={bulkValue} onChange={e => setBulkValue(e.target.value)}
              style={{ padding: '7px 12px', borderRadius: 6, border: 'none', fontSize: 13, background: '#fff', color: '#1C3C6E', outline: 'none', fontWeight: 600 }}>
              <option value="">— Select Tier —</option>
              <option>Tier 1</option><option>Tier 2</option><option>Tier 3</option>
            </select>
          )}
          {bulkAction === 'delete' && (
            <span style={{ color: '#FFCDD2', fontSize: 13 }}>⚠ This will permanently delete {selected.length} vendors</span>
          )}
          <button
            onClick={runBulkAction}
            disabled={!bulkAction || (bulkAction !== 'delete' && !bulkValue)}
            style={{ padding: '7px 18px', background: bulkAction === 'delete' ? '#E74C3C' : '#29ABE2', color: '#fff', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: (!bulkAction || (bulkAction !== 'delete' && !bulkValue)) ? 0.5 : 1 }}
          >
            Apply
          </button>
          <button onClick={() => { setSelected([]); setBulkAction(''); setBulkValue(''); }} style={{ padding: '7px 14px', background: 'rgba(255,255,255,0.1)', color: '#fff', border: '1px solid rgba(255,255,255,0.3)', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Save View panel */}
      {showSaveView && (
        <div style={{ background: '#EEF9FF', borderRadius: 8, padding: '10px 14px', marginBottom: 10, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13, color: '#29ABE2', fontWeight: 600 }}>Name this view:</span>
          <input
            style={{ padding: '6px 10px', border: '1px solid #29ABE2', borderRadius: 5, fontSize: 13, outline: 'none', width: 180 }}
            placeholder="e.g. Tier 1 Empanelled"
            value={saveViewName}
            onChange={e => setSaveViewName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && saveView()}
            autoFocus
          />
          <button onClick={saveView} disabled={!saveViewName.trim()} style={{ padding: '6px 14px', background: '#29ABE2', color: '#fff', border: 'none', borderRadius: 5, fontSize: 13, cursor: 'pointer' }}>Save</button>
          <button onClick={() => setShowSaveView(false)} style={{ padding: '6px 10px', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 13 }}>Cancel</button>
        </div>
      )}

      {/* Saved view chips */}
      {savedViews.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: '#aaa', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Saved:</span>
          {savedViews.map(v => (
            <div key={v.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#F0F4FF', border: '1px solid #DDE2E8', borderRadius: 20, padding: '4px 12px 4px 10px', fontSize: 12 }}>
              <span style={{ cursor: 'pointer', color: '#1C3C6E', fontWeight: 500 }} onClick={() => applyView(v)}>{v.name}</span>
              <span style={{ cursor: 'pointer', color: '#aaa', fontSize: 14, lineHeight: 1 }} onClick={() => deleteView(v.name)}>✕</span>
            </div>
          ))}
        </div>
      )}


      {/* Count */}
      <div style={{ fontSize: 13, color: '#888', marginBottom: 12, paddingLeft: 4 }}>
        {loading ? 'Loading...' : `${vendors.length} vendor${vendors.length !== 1 ? 's' : ''} found`}
      </div>

      {/* Table View */}
      {viewMode === 'table' && (
        <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 800 }}>
            <thead>
              <tr style={{ background: '#F5F6FA' }}>
                <th style={{ padding: '12px 8px 12px 16px', borderBottom: '1px solid #E8ECF0', width: 36 }}>
                  <input type="checkbox" checked={vendors.length > 0 && selected.length === vendors.length} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                {[['Sr.No', 56], ['Name', null], ['Email', null], ['Mobile', 140], ['Address', null], ['Details', null], ['Actions', 110]].map(([h, w]) => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E8ECF0', ...(w ? { width: w } : {}) }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && vendors.length === 0 && (
                <tr><td colSpan={8} style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 15 }}>No vendors found. <span onClick={() => navigate('/vendors/add')} style={{ color: '#29ABE2', cursor: 'pointer' }}>Add your first vendor →</span></td></tr>
              )}
              {vendors.map((v, idx) => (
                <tr key={v.id} style={{ borderBottom: '1px solid #F0F4F8', background: selected.includes(v.id) ? '#EEF9FF' : '#fff' }}
                  onMouseEnter={e => { if (!selected.includes(v.id)) e.currentTarget.style.background = '#FAFBFC'; }}
                  onMouseLeave={e => { if (!selected.includes(v.id)) e.currentTarget.style.background = selected.includes(v.id) ? '#EEF9FF' : '#fff'; }}>
                  <td style={{ padding: '12px 8px 12px 16px' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(v.id)} onChange={() => toggleSelect(v.id)} style={{ cursor: 'pointer' }} />
                  </td>
                  {/* Sr.No */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#888', textAlign: 'center' }}>{idx + 1}</td>
                  {/* Name */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 7, background: v.logo_color || '#1C3C6E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>{v.logo_initial || v.name[0]}</div>
                      <span style={{ fontWeight: 600, fontSize: 14, color: '#1C3C6E', cursor: 'pointer' }} onClick={() => navigate(`/vendors/${v.id}`)}>{v.name}</span>
                    </div>
                  </td>
                  {/* Email */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#444' }}>
                    {v.primary_email ? <a href={`mailto:${v.primary_email}`} style={{ color: '#29ABE2', textDecoration: 'none' }}>{v.primary_email}</a> : '—'}
                  </td>
                  {/* Mobile */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#444' }}>{v.primary_phone || '—'}</td>
                  {/* Address */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#555', maxWidth: 220 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.address || '—'}</span>
                  </td>
                  {/* Details */}
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#555', maxWidth: 280 }}>
                    <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.summary || '—'}</span>
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={() => navigate(`/vendors/${v.id}`)} style={{ padding: '5px 12px', background: '#EEF5FF', color: '#1C3C6E', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>View</button>
                      {can('Vendors', 'Full') && (
                        <button onClick={() => handleDelete(v.id)} style={{ padding: '5px 10px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>✕</button>
                      )}
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
            <div key={v.id} onClick={() => navigate(`/vendors/${v.id}`)} style={{ background: '#fff', borderRadius: 12, padding: '20px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', cursor: 'pointer', transition: 'box-shadow 0.15s ease, transform 0.15s ease', willChange: 'transform' }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.10)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'; }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: v.logo_color || '#1C3C6E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18 }}>{v.logo_initial || v.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1C3C6E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</div>
                  {v.primary_email && <div style={{ fontSize: 12, color: '#29ABE2' }}>{v.primary_email}</div>}
                </div>
              </div>
              {v.primary_phone && <div style={{ fontSize: 12, color: '#555', marginBottom: 6 }}>📞 {v.primary_phone}</div>}
              {v.address && <div style={{ fontSize: 12, color: '#888', marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.address}</div>}
              {v.summary && <div style={{ fontSize: 12, color: '#666', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{v.summary}</div>}
            </div>
          ))}
        </div>
      )}
    </Layout>
  );
}
