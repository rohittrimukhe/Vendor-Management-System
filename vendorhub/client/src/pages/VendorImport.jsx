import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';

const NAVY = '#1C3C6E';
const BLUE = '#29ABE2';
const TEMPLATE_VERSION = '2025-07-05';

const COLUMNS = [
  { name: 'name',               required: true,  type: 'Text',     description: 'Vendor company name', example: 'Acme Technologies Pvt Ltd' },
  { name: 'gstin',              required: false, type: 'Text',     description: 'GST Identification Number (15 chars)', example: '27AABCU9603R1ZX' },
  { name: 'website',            required: false, type: 'URL',      description: 'Full website URL', example: 'https://acme.com' },
  { name: 'address',            required: false, type: 'Text',     description: 'Office address', example: '101 Tech Park, Mumbai' },
  { name: 'geo_scope',          required: false, type: 'Text',     description: 'Geographic coverage', example: 'National / Mumbai / Pan India' },
  { name: 'empanelment_status', required: false, type: 'Enum',     description: 'Empanelment status (default: In Evaluation)', example: 'Empanelled | In Evaluation | On Hold | Archived' },
  { name: 'tier',               required: false, type: 'Enum',     description: 'Vendor tier (default: Tier 2)', example: 'Tier 1 | Tier 2 | Tier 3' },
  { name: 'vendor_type',        required: false, type: 'Enum',     description: 'Type of vendor', example: 'IT Services | IT Products | Consulting | Infrastructure | Cloud Services | Managed Services | Other' },
  { name: 'summary',            required: false, type: 'Text',     description: 'Short description / overview', example: 'End-to-end IT solutions and managed services' },
  { name: 'domains',            required: false, type: 'List (|)', description: 'Service domains, separated by pipe |', example: 'ERP|Cloud|Security' },
  { name: 'tags',               required: false, type: 'List (|)', description: 'Custom tags, separated by pipe |', example: 'preferred|shortlisted' },
  { name: 'added_date',         required: false, type: 'Date',     description: 'Date added (YYYY-MM-DD, default: today)', example: '2025-01-15' },
];

export default function VendorImport() {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [logFilter, setLogFilter] = useState('all');

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) { alert('Please select a .csv file'); return; }
    setFile(f);
    setResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/vendors/import', { method: 'POST', body: fd, credentials: 'include' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Import failed');
      setResult(json.data);
    } catch (e) {
      setResult({ error: e.message });
    }
    setUploading(false);
  };

  const filteredLogs = result?.logs?.filter(l => {
    if (logFilter === 'all') return true;
    if (logFilter === 'imported') return l.status === 'imported';
    if (logFilter === 'warnings') return l.status === 'imported_with_warnings';
    if (logFilter === 'failed') return l.status === 'failed';
    return true;
  }) || [];

  const statusIcon = { imported: '✓', imported_with_warnings: '⚠', failed: '✗' };
  const statusColor = { imported: '#27AE60', imported_with_warnings: '#F39C12', failed: '#E74C3C' };
  const statusBg = { imported: '#F0FFF4', imported_with_warnings: '#FFFBF0', failed: '#FFF5F5' };

  return (
    <Layout title="Import Vendors">
      {/* Page header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 22, fontWeight: 700, margin: 0 }}>Import Vendors from CSV</h1>
          <p style={{ color: '#888', fontSize: 13, margin: '4px 0 0' }}>Bulk-add vendors using a comma-separated file. Download the template below to get started.</p>
        </div>
        <button onClick={() => navigate('/vendors')} style={{ padding: '9px 18px', border: '1px solid #DDE2E8', borderRadius: 7, background: '#fff', color: '#555', cursor: 'pointer', fontSize: 13 }}>← Back to Vendors</button>
      </div>

      {/* ─── Step 1: Template ─── */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>1</div>
          <h2 style={{ fontFamily: 'Montserrat', fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Download Import Template</h2>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <a
            href="/api/vendors/import/template"
            download
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 22px', background: NAVY, color: '#fff', borderRadius: 8, fontWeight: 600, fontSize: 14, textDecoration: 'none' }}
          >
            ⬇ Download Template CSV
          </a>
          <div style={{ background: '#F0F8FF', border: '1px solid #C8E0F4', borderRadius: 8, padding: '8px 14px', fontSize: 12, color: '#1C3C6E' }}>
            <span style={{ fontWeight: 700 }}>Template version:</span> {TEMPLATE_VERSION} &nbsp;|&nbsp;
            <span style={{ color: '#888' }}>Always use the latest template to avoid import errors</span>
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#888', marginTop: 12, marginBottom: 0 }}>
          The template includes a sample row and inline comments explaining each column. Comment lines (starting with #) are automatically skipped during import.
        </p>
      </div>

      {/* ─── Step 2: Column Reference ─── */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>2</div>
          <h2 style={{ fontFamily: 'Montserrat', fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Column Reference</h2>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#F5F6FA' }}>
                {['Column Name', 'Required', 'Type', 'Description', 'Allowed Values / Example'].map(h => (
                  <th key={h} style={{ padding: '10px 12px', textAlign: 'left', fontWeight: 700, color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #E8ECF0', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COLUMNS.map((col, i) => (
                <tr key={col.name} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F0F4F8' }}>
                  <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 700, color: NAVY, whiteSpace: 'nowrap' }}>{col.name}</td>
                  <td style={{ padding: '9px 12px', textAlign: 'center' }}>
                    {col.required
                      ? <span style={{ background: '#FFF0F0', color: '#E74C3C', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>Required</span>
                      : <span style={{ background: '#F0F8FF', color: '#29ABE2', padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600 }}>Optional</span>
                    }
                  </td>
                  <td style={{ padding: '9px 12px', color: '#666', whiteSpace: 'nowrap' }}>{col.type}</td>
                  <td style={{ padding: '9px 12px', color: '#444' }}>{col.description}</td>
                  <td style={{ padding: '9px 12px', color: '#666', fontFamily: col.type === 'Enum' || col.type === 'List (|)' ? 'inherit' : 'monospace', fontSize: col.type === 'Enum' ? 12 : 13 }}>{col.example}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 14, padding: '10px 14px', background: '#FFFBF0', border: '1px solid #FCECC1', borderRadius: 8, fontSize: 12, color: '#856404' }}>
          <strong>Notes:</strong> Duplicate vendor names are rejected. Invalid enum values default to the system default and a warning is added to the import log. Tags and domains with spaces around the | separator are trimmed automatically.
        </div>
      </div>

      {/* ─── Step 3: Upload ─── */}
      <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>3</div>
          <h2 style={{ fontFamily: 'Montserrat', fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Upload Your CSV File</h2>
        </div>

        {/* Drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? BLUE : file ? '#27AE60' : '#C8D4E0'}`,
            borderRadius: 10,
            padding: '36px 24px',
            textAlign: 'center',
            cursor: 'pointer',
            background: dragging ? '#F0F8FF' : file ? '#F0FFF4' : '#FAFBFC',
            transition: 'border-color 0.2s, background 0.2s',
            marginBottom: 16,
          }}
        >
          <div style={{ fontSize: 36, marginBottom: 8 }}>{file ? '📄' : '📂'}</div>
          {file ? (
            <>
              <div style={{ fontWeight: 700, color: '#27AE60', fontSize: 15 }}>{file.name}</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>{(file.size / 1024).toFixed(1)} KB &nbsp;•&nbsp; Click to choose a different file</div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: NAVY, fontSize: 15 }}>Drag & drop your CSV here</div>
              <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>or click to browse — max 5 MB, .csv only</div>
            </>
          )}
        </div>

        <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFile(e.target.files[0])} />

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button
            onClick={handleUpload}
            disabled={!file || uploading}
            style={{
              padding: '10px 28px', background: !file || uploading ? '#aaa' : NAVY,
              color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600,
              cursor: !file || uploading ? 'not-allowed' : 'pointer',
            }}
          >
            {uploading ? '⏳ Importing...' : '⬆ Start Import'}
          </button>
          {file && !uploading && (
            <button onClick={() => { setFile(null); setResult(null); }} style={{ padding: '10px 16px', border: '1px solid #DDE2E8', borderRadius: 8, background: '#fff', color: '#888', cursor: 'pointer', fontSize: 13 }}>
              Clear
            </button>
          )}
        </div>
      </div>

      {/* ─── Step 4: Results ─── */}
      {result && (
        <div style={{ background: '#fff', borderRadius: 12, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: result.error ? '#E74C3C' : '#27AE60', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13, flexShrink: 0 }}>4</div>
            <h2 style={{ fontFamily: 'Montserrat', fontSize: 15, fontWeight: 700, color: NAVY, margin: 0 }}>Import Results</h2>
          </div>

          {result.error ? (
            <div style={{ background: '#FFF5F5', border: '1px solid #FFCDD2', borderRadius: 8, padding: '14px 18px', color: '#C53030', fontSize: 14 }}>
              <strong>Import failed:</strong> {result.error}
            </div>
          ) : (
            <>
              {/* Summary cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Total Rows', value: result.total, color: '#555', bg: '#F5F6FA' },
                  { label: 'Imported', value: result.imported, color: '#27AE60', bg: '#F0FFF4' },
                  { label: 'With Warnings', value: result.warned, color: '#F39C12', bg: '#FFFBF0' },
                  { label: 'Failed', value: result.failed, color: '#E74C3C', bg: '#FFF5F5' },
                ].map(card => (
                  <div key={card.label} style={{ background: card.bg, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 700, color: card.color, fontFamily: 'Montserrat' }}>{card.value}</div>
                    <div style={{ fontSize: 12, color: '#888', marginTop: 2, fontWeight: 600 }}>{card.label}</div>
                  </div>
                ))}
              </div>

              {/* Success + navigate */}
              {result.imported > 0 && (
                <div style={{ background: '#F0FFF4', border: '1px solid #C8E6C9', borderRadius: 8, padding: '10px 16px', marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: '#27AE60', fontSize: 13, fontWeight: 600 }}>✓ {result.imported} vendor{result.imported !== 1 ? 's' : ''} added successfully</span>
                  <button onClick={() => navigate('/vendors')} style={{ padding: '6px 14px', background: '#27AE60', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>View Vendor Directory →</button>
                </div>
              )}

              {/* Row-level log */}
              {result.logs && result.logs.length > 0 && (
                <>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: NAVY, alignSelf: 'center', marginRight: 4 }}>Show:</span>
                    {[
                      { key: 'all', label: `All (${result.logs.length})` },
                      { key: 'imported', label: `✓ Imported (${result.logs.filter(l => l.status === 'imported').length})` },
                      { key: 'warnings', label: `⚠ Warnings (${result.warned})` },
                      { key: 'failed', label: `✗ Failed (${result.failed})` },
                    ].map(f => (
                      <button key={f.key} onClick={() => setLogFilter(f.key)}
                        style={{ padding: '5px 12px', borderRadius: 20, border: `1px solid ${logFilter === f.key ? NAVY : '#DDE2E8'}`, background: logFilter === f.key ? NAVY : '#fff', color: logFilter === f.key ? '#fff' : '#555', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>
                        {f.label}
                      </button>
                    ))}
                  </div>

                  <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid #E8ECF0' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#F5F6FA' }}>
                          {['Row', 'Status', 'Vendor Name', 'Details'].map(h => (
                            <th key={h} style={{ padding: '9px 12px', textAlign: 'left', fontWeight: 700, color: '#555', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid #E8ECF0' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filteredLogs.map((log, i) => (
                          <tr key={i} style={{ background: i % 2 === 0 ? '#fff' : '#FAFBFC', borderBottom: '1px solid #F0F4F8' }}>
                            <td style={{ padding: '8px 12px', color: '#888', fontFamily: 'monospace', fontSize: 12 }}>#{log.row}</td>
                            <td style={{ padding: '8px 12px' }}>
                              <span style={{ background: statusBg[log.status], color: statusColor[log.status], padding: '2px 9px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
                                {statusIcon[log.status]} {log.status === 'imported_with_warnings' ? 'Warning' : log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                              </span>
                            </td>
                            <td style={{ padding: '8px 12px', fontWeight: 600, color: NAVY }}>{log.name || '—'}</td>
                            <td style={{ padding: '8px 12px', color: log.status === 'failed' ? '#C53030' : log.status === 'imported_with_warnings' ? '#856404' : '#27AE60', fontSize: 12 }}>
                              {log.reason || 'Imported successfully'}
                            </td>
                          </tr>
                        ))}
                        {filteredLogs.length === 0 && (
                          <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#aaa', fontSize: 13 }}>No rows match this filter</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      )}
    </Layout>
  );
}
