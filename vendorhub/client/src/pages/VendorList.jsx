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
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const importRef = React.useRef();
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

  const handleImport = async (file) => {
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/vendors/import', { method: 'POST', body: fd, credentials: 'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Import failed');
      setImportResult(data.data || data);
      loadVendors();
    } catch (e) { setImportResult({ error: e.message }); }
    setImporting(false);
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
              <button onClick={() => importRef.current?.click()} disabled={importing} style={{ padding: '8px 14px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', color: '#555', cursor: 'pointer', fontSize: 13 }} title="Import from CSV">⬆ {importing ? 'Importing...' : 'Import CSV'}</button>
              <input ref={importRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleImport(e.target.files[0])} />
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

      {importResult && (
        <div style={{ background: importResult.error ? '#FFF5F5' : '#F0FFF4', border: `1px solid ${importResult.error ? '#FFCDD2' : '#C8E6C9'}`, borderRadius: 8, padding: '10px 16px', marginBottom: 12, fontSize: 13, color: importResult.error ? '#E74C3C' : '#27AE60', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span>{importResult.error ? `Import failed: ${importResult.error}` : `Import complete: ${importResult.imported} vendors added, ${importResult.skipped} skipped`}</span>
          <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#aaa' }}>✕</button>
        </div>
      )}

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
                <th style={{ padding: '12px 8px 12px 16px', borderBottom: '1px solid #E8ECF0', width: 36 }}>
                  <input type="checkbox" checked={vendors.length > 0 && selected.length === vendors.length} onChange={toggleAll} style={{ cursor: 'pointer' }} />
                </th>
                {['Vendor', 'Domains', 'Tier', 'Status', 'Risk', 'Type', 'Added', 'Actions'].map(h => (
                  <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E8ECF0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {!loading && vendors.length === 0 && (
                <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 15 }}>No vendors found. <span onClick={() => navigate('/vendors/add')} style={{ color: '#29ABE2', cursor: 'pointer' }}>Add your first vendor →</span></td></tr>
              )}
              {vendors.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #F0F4F8', background: selected.includes(v.id) ? '#EEF9FF' : '#fff' }}
                  onMouseEnter={e => { if (!selected.includes(v.id)) e.currentTarget.style.background = '#FAFBFC'; }}
                  onMouseLeave={e => { if (!selected.includes(v.id)) e.currentTarget.style.background = selected.includes(v.id) ? '#EEF9FF' : '#fff'; }}>
                  <td style={{ padding: '12px 8px 12px 16px' }} onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={selected.includes(v.id)} onChange={() => toggleSelect(v.id)} style={{ cursor: 'pointer' }} />
                  </td>
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
                  <td style={{ padding: '12px 16px' }}>
                    {v.risk_level && <span style={{ padding: '3px 9px', borderRadius: 12, fontSize: 11, fontWeight: 700, color: RISK_COLOR[v.risk_level], background: RISK_BG[v.risk_level] }}>{v.risk_level}</span>}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#555' }}>{v.vendor_type || '—'}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: '#888' }}>{v.added_date || '—'}</td>
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
