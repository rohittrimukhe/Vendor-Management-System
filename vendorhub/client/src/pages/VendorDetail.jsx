import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';

const TABS = ['Overview', 'Contacts', 'Documents', 'Contracts & SLA', 'Performance', 'Escalation'];

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 };

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 480, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Montserrat', color: '#1C3C6E', fontSize: 16 }}>{title}</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 20, color: '#888', lineHeight: 1 }}>✕</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { 'Empanelled': ['#27AE60', '#F0FFF4'], 'In Evaluation': ['#F39C12', '#FFFBF0'], 'On Hold': ['#E74C3C', '#FFF5F5'], 'Archived': ['#95A5A6', '#F5F5F5'], 'Active': ['#27AE60', '#F0FFF4'], 'Expired': ['#E74C3C', '#FFF5F5'], 'Pending': ['#F39C12', '#FFFBF0'] };
  const [c, bg] = map[status] || ['#888', '#F5F5F5'];
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: c, background: bg }}>{status}</span>;
}

function Stars({ rating }) {
  return (
    <span>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#F39C12' : '#DDD', fontSize: 18 }}>★</span>
      ))}
      <span style={{ fontSize: 14, color: '#666', marginLeft: 8 }}>{(rating || 0).toFixed(1)}</span>
    </span>
  );
}

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [tab, setTab] = useState(0);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  const [contacts, setContacts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [performance, setPerformance] = useState({ reviews: [], averages: {} });
  const [escalation, setEscalation] = useState([]);

  const [modal, setModal] = useState(null);
  const [modalData, setModalData] = useState({});
  const [modalError, setModalError] = useState('');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef();

  const loadVendor = () => api.get(`/api/vendors/${id}`).then(setVendor).catch(() => navigate('/vendors'));
  const loadContacts = () => api.get(`/api/vendors/${id}/contacts`).then(setContacts).catch(() => {});
  const loadDocuments = () => api.get(`/api/vendors/${id}/documents`).then(setDocuments).catch(() => {});
  const loadContracts = () => api.get(`/api/vendors/${id}/contracts`).then(setContracts).catch(() => {});
  const loadPerformance = () => api.get(`/api/vendors/${id}/performance`).then(setPerformance).catch(() => {});
  const loadEscalation = () => api.get(`/api/vendors/${id}/performance/escalation`).then(setEscalation).catch(() => {});

  useEffect(() => {
    Promise.all([loadVendor(), loadContacts(), loadDocuments(), loadContracts(), loadPerformance(), loadEscalation()])
      .finally(() => setLoading(false));
  }, [id]);

  const openModal = (name, data = {}) => { setModal(name); setModalData(data); setModalError(''); };
  const closeModal = () => { setModal(null); setModalData({}); setModalError(''); };

  const saveContact = async () => {
    setSaving(true);
    try {
      if (modalData.id) await api.put(`/api/vendors/${id}/contacts/${modalData.id}`, modalData);
      else await api.post(`/api/vendors/${id}/contacts`, modalData);
      await loadContacts();
      closeModal();
    } catch (e) { setModalError(e.message); } finally { setSaving(false); }
  };

  const deleteContact = async (cid) => {
    if (!window.confirm('Delete contact?')) return;
    await api.delete(`/api/vendors/${id}/contacts/${cid}`);
    loadContacts();
  };

  const handleFileUpload = async (file) => {
    const fd = new FormData();
    fd.append('file', file);
    try {
      await api.upload(`/api/vendors/${id}/documents`, fd);
      loadDocuments();
    } catch (e) { alert(e.message); }
  };

  const deleteDocument = async (did) => {
    if (!window.confirm('Delete document?')) return;
    await api.delete(`/api/vendors/${id}/documents/${did}`);
    loadDocuments();
  };

  const saveContract = async () => {
    setSaving(true);
    try {
      if (modalData.id) await api.put(`/api/vendors/${id}/contracts/${modalData.id}`, modalData);
      else await api.post(`/api/vendors/${id}/contracts`, modalData);
      await loadContracts();
      closeModal();
    } catch (e) { setModalError(e.message); } finally { setSaving(false); }
  };

  const deleteContract = async (cid) => {
    if (!window.confirm('Delete contract?')) return;
    await api.delete(`/api/vendors/${id}/contracts/${cid}`);
    loadContracts();
  };

  const saveReview = async () => {
    setSaving(true);
    try {
      await api.post(`/api/vendors/${id}/performance`, modalData);
      await loadPerformance();
      closeModal();
    } catch (e) { setModalError(e.message); } finally { setSaving(false); }
  };

  const saveEscalation = async () => {
    setSaving(true);
    try {
      if (modalData.id) await api.put(`/api/vendors/${id}/performance/escalation/${modalData.id}`, modalData);
      else await api.post(`/api/vendors/${id}/performance/escalation`, modalData);
      await loadEscalation();
      closeModal();
    } catch (e) { setModalError(e.message); } finally { setSaving(false); }
  };

  const saveCert = async () => {
    setSaving(true);
    try {
      await api.post(`/api/vendors/${id}/certifications`, modalData);
      await loadVendor();
      closeModal();
    } catch (e) { setModalError(e.message); } finally { setSaving(false); }
  };

  const formatSize = (bytes) => {
    if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  if (loading) return <Layout title="Vendor Detail"><div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading...</div></Layout>;
  if (!vendor) return null;

  const renderOverview = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 16, background: vendor.logo_color || '#1C3C6E', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 32, margin: '0 auto 16px' }}>{vendor.logo_initial || vendor.name[0]}</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, color: '#1C3C6E', marginBottom: 10 }}>{vendor.name}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            <StatusBadge status={vendor.empanelment_status} />
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff', background: '#29ABE2' }}>{vendor.tier}</span>
          </div>
        </div>
        <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 16 }}>
          {[['GSTIN', vendor.gstin], ['Website', vendor.website], ['Geo Scope', vendor.geo_scope], ['Type', vendor.vendor_type], ['Added', vendor.added_date]].map(([l, v]) => v ? (
            <div key={l} style={{ marginBottom: 10 }}>
              <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{l}</div>
              <div style={{ fontSize: 13, color: '#333', marginTop: 2, wordBreak: 'break-all' }}>
                {l === 'Website' ? <a href={v} target="_blank" rel="noreferrer" style={{ color: '#29ABE2' }}>{v}</a> : v}
              </div>
            </div>
          ) : null)}
          {vendor.address && <div><div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Address</div><div style={{ fontSize: 13, color: '#333', marginTop: 2, lineHeight: 1.5 }}>{vendor.address}</div></div>}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {vendor.summary && (
          <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 18 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Summary</div>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.7 }}>{vendor.summary}</p>
          </div>
        )}
        {(vendor.domains || []).length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Service Domains</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {vendor.domains.map((d, i) => <span key={i} style={{ background: '#EEF5FF', color: '#1C3C6E', padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>{d}</span>)}
            </div>
          </div>
        )}
        {(vendor.tags || []).length > 0 && (
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Tags</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {vendor.tags.map((t, i) => <span key={i} style={{ background: '#F4EFFF', color: '#6B21A8', padding: '4px 10px', borderRadius: 20, fontSize: 12 }}>{t}</span>)}
            </div>
          </div>
        )}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Certifications</div>
            <button onClick={() => openModal('cert')} style={{ padding: '5px 12px', background: '#EEF5FF', color: '#1C3C6E', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>
          </div>
          {!(vendor.certifications || []).length ? <p style={{ fontSize: 13, color: '#aaa' }}>No certifications added.</p> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {vendor.certifications.map(c => (
                <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: '#F8FAFC', borderRadius: 8 }}>
                  <span style={{ fontSize: 18 }}>{c.is_valid ? '🏅' : '⚠️'}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13, color: '#333' }}>{c.name}</div>
                    <div style={{ fontSize: 12, color: '#888' }}>{c.issuer} • Expires {c.expiry || 'N/A'}</div>
                  </div>
                  <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600, background: c.is_valid ? '#F0FFF4' : '#FFF5F5', color: c.is_valid ? '#27AE60' : '#E74C3C' }}>{c.is_valid ? 'Valid' : 'Expired'}</span>
                  <span onClick={() => api.delete(`/api/vendors/${id}/certifications/${c.id}`).then(loadVendor)} style={{ cursor: 'pointer', color: '#E74C3C', fontSize: 14 }}>✕</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderContacts = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => openModal('contact')} style={{ padding: '8px 18px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>+ Add Contact</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#F5F6FA' }}>{['Name', 'Role', 'Email', 'Phone', 'Actions'].map(h => <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #E8ECF0' }}>{h}</th>)}</tr></thead>
        <tbody>
          {contacts.length === 0 && <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#aaa', fontSize: 14 }}>No contacts added yet.</td></tr>}
          {contacts.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
              <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>{c.name}</td>
              <td style={{ padding: '12px 14px', fontSize: 13, color: '#666' }}>{c.role || '—'}</td>
              <td style={{ padding: '12px 14px', fontSize: 13 }}>{c.email ? <a href={`mailto:${c.email}`} style={{ color: '#29ABE2' }}>{c.email}</a> : '—'}</td>
              <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{c.phone || '—'}</td>
              <td style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openModal('contact', c)} style={{ padding: '4px 10px', background: '#EEF5FF', color: '#1C3C6E', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => deleteContact(c.id)} style={{ padding: '4px 10px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderDocuments = () => (
    <div>
      <div
        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#29ABE2'; }}
        onDragLeave={e => { e.currentTarget.style.borderColor = '#DDE2E8'; }}
        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#DDE2E8'; const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); }}
        onClick={() => fileInputRef.current?.click()}
        style={{ border: '2px dashed #DDE2E8', borderRadius: 10, padding: '28px', textAlign: 'center', cursor: 'pointer', marginBottom: 20, background: '#FAFBFC', transition: 'border-color 0.2s' }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
        <div style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>Drop files here or click to upload</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Any file type • Max 50 MB</div>
      </div>
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documents.length === 0 && <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', padding: 20 }}>No documents uploaded yet.</p>}
        {documents.map(d => (
          <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#fff', border: '1px solid #E8ECF0', borderRadius: 8 }}>
            <span style={{ fontSize: 24 }}>📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{formatSize(d.size)} • {d.type} • {d.uploaded_at?.split('T')[0]}</div>
            </div>
            <a href={`/api/vendors/${id}/documents/${d.id}/download`} style={{ padding: '5px 12px', background: '#EEF5FF', color: '#1C3C6E', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}>Download</a>
            <button onClick={() => deleteDocument(d.id)} style={{ padding: '5px 10px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );

  const renderContracts = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => openModal('contract')} style={{ padding: '8px 18px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>+ Add Contract</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#F5F6FA' }}>{['Type', 'Start', 'End', 'Value', 'SLA', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #E8ECF0' }}>{h}</th>)}</tr></thead>
        <tbody>
          {contracts.length === 0 && <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#aaa', fontSize: 14 }}>No contracts added yet.</td></tr>}
          {contracts.map(c => (
            <tr key={c.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
              <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>{c.type || '—'}</td>
              <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{c.start_date || '—'}</td>
              <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{c.end_date || '—'}</td>
              <td style={{ padding: '12px 14px', fontSize: 13 }}>{c.value ? `₹${Number(c.value).toLocaleString()}` : '—'}</td>
              <td style={{ padding: '12px 14px', fontSize: 13, color: '#555', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.sla || '—'}</td>
              <td style={{ padding: '12px 14px' }}><StatusBadge status={c.status} /></td>
              <td style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openModal('contract', c)} style={{ padding: '4px 10px', background: '#EEF5FF', color: '#1C3C6E', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => deleteContract(c.id)} style={{ padding: '4px 10px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderPerformance = () => {
    const avg = performance.averages || {};
    const barStyle = (pct) => ({ height: 10, borderRadius: 5, background: '#29ABE2', width: `${pct || 0}%`, transition: 'width 0.6s ease' });
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={() => openModal('review', { rating: 3, on_time_delivery: 80, support_quality: 80, price_competitiveness: 80, notes: '' })} style={{ padding: '8px 18px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>+ Add Review</button>
        </div>

        {performance.reviews.length > 0 && (
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Average Rating</div>
              <Stars rating={avg.avg_rating || 0} />
            </div>
            {[['On-Time Delivery', avg.avg_otd], ['Support Quality', avg.avg_sq], ['Price Competitiveness', avg.avg_pc]].map(([label, val]) => (
              <div key={label} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#555', marginBottom: 4 }}>
                  <span>{label}</span><span style={{ fontWeight: 600 }}>{val ? Math.round(val) + '%' : 'N/A'}</span>
                </div>
                <div style={{ height: 10, background: '#E8ECF0', borderRadius: 5 }}><div style={barStyle(val)} /></div>
              </div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {performance.reviews.length === 0 && <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', padding: 20 }}>No performance reviews yet.</p>}
          {performance.reviews.map(r => (
            <div key={r.id} style={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: 10, padding: '16px 18px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Stars rating={r.rating} />
                <div style={{ fontSize: 12, color: '#888' }}>{r.reviewed_by} • {r.reviewed_at?.split('T')[0]}</div>
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666', marginBottom: r.notes ? 10 : 0 }}>
                <span>Delivery: {r.on_time_delivery}%</span>
                <span>Support: {r.support_quality}%</span>
                <span>Price: {r.price_competitiveness}%</span>
              </div>
              {r.notes && <p style={{ fontSize: 13, color: '#555', lineHeight: 1.5, margin: 0 }}>{r.notes}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderEscalation = () => (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <button onClick={() => openModal('escalation', { level: `L${escalation.length + 1}`, sort_order: escalation.length })} style={{ padding: '8px 18px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>+ Add Level</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#F5F6FA' }}>{['Level', 'Name', 'Contact', 'Phone', 'Actions'].map(h => <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #E8ECF0' }}>{h}</th>)}</tr></thead>
        <tbody>
          {escalation.length === 0 && <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#aaa', fontSize: 14 }}>No escalation matrix defined.</td></tr>}
          {escalation.map(e => (
            <tr key={e.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
              <td style={{ padding: '12px 14px' }}><span style={{ padding: '3px 10px', background: '#1C3C6E', color: '#fff', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{e.level}</span></td>
              <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>{e.name}</td>
              <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{e.contact || '—'}</td>
              <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{e.phone || '—'}</td>
              <td style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => openModal('escalation', e)} style={{ padding: '4px 10px', background: '#EEF5FF', color: '#1C3C6E', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Edit</button>
                  <button onClick={async () => { if (window.confirm('Delete?')) { await api.delete(`/api/vendors/${id}/performance/escalation/${e.id}`); loadEscalation(); } }} style={{ padding: '4px 10px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Delete</button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const tabContent = [renderOverview, renderContacts, renderDocuments, renderContracts, renderPerformance, renderEscalation];

  const btnPrimary = { padding: '9px 20px', background: '#1C3C6E', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
  const btnSecondary = { padding: '9px 18px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#555' };

  return (
    <Layout title={vendor.name}>
      {/* Back button */}
      <button onClick={() => navigate('/vendors')} style={{ ...btnSecondary, marginBottom: 16 }}>← Back to Vendors</button>

      {/* Tabs */}
      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #E8ECF0', overflowX: 'auto' }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 14, fontWeight: tab === i ? 700 : 400, color: tab === i ? '#1C3C6E' : '#888', borderBottom: tab === i ? '3px solid #1C3C6E' : '3px solid transparent', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ padding: 24 }}>
          {tabContent[tab]()}
        </div>
      </div>

      {/* Modals */}
      {modal === 'contact' && (
        <Modal title={modalData.id ? 'Edit Contact' : 'Add Contact'} onClose={closeModal}>
          {[['name', 'Name'], ['role', 'Role'], ['email', 'Email'], ['phone', 'Phone']].map(([k, l]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{l}</label>
              <input style={inputStyle} value={modalData[k] || ''} onChange={e => setModalData({ ...modalData, [k]: e.target.value })} />
            </div>
          ))}
          {modalError && <p style={{ color: '#E74C3C', fontSize: 12, marginBottom: 12 }}>{modalError}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={closeModal}>Cancel</button>
            <button style={btnPrimary} onClick={saveContact} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {modal === 'contract' && (
        <Modal title={modalData.id ? 'Edit Contract' : 'Add Contract'} onClose={closeModal}>
          {[['type', 'Type (e.g. AMC, MSA, SLA)'], ['start_date', 'Start Date'], ['end_date', 'End Date'], ['value', 'Value (₹)'], ['sla', 'SLA Terms']].map(([k, l]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{l}</label>
              <input style={inputStyle} type={k.includes('date') ? 'date' : k === 'value' ? 'number' : 'text'} value={modalData[k] || ''} onChange={e => setModalData({ ...modalData, [k]: e.target.value })} />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Status</label>
            <select style={inputStyle} value={modalData.status || 'Active'} onChange={e => setModalData({ ...modalData, status: e.target.value })}>
              <option>Active</option><option>Expired</option><option>Pending</option>
            </select>
          </div>
          {modalError && <p style={{ color: '#E74C3C', fontSize: 12, marginBottom: 12 }}>{modalError}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={closeModal}>Cancel</button>
            <button style={btnPrimary} onClick={saveContract} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {modal === 'review' && (
        <Modal title="Add Performance Review" onClose={closeModal}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Rating (1-5)</label>
            <input style={inputStyle} type="number" min={1} max={5} step={0.5} value={modalData.rating || 3} onChange={e => setModalData({ ...modalData, rating: parseFloat(e.target.value) })} />
          </div>
          {[['on_time_delivery', 'On-Time Delivery (0-100)'], ['support_quality', 'Support Quality (0-100)'], ['price_competitiveness', 'Price Competitiveness (0-100)']].map(([k, l]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{l}: <strong>{modalData[k] || 80}%</strong></label>
              <input type="range" min={0} max={100} style={{ width: '100%' }} value={modalData[k] || 80} onChange={e => setModalData({ ...modalData, [k]: parseInt(e.target.value) })} />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Notes</label>
            <textarea style={{ ...inputStyle, minHeight: 70, resize: 'vertical' }} value={modalData.notes || ''} onChange={e => setModalData({ ...modalData, notes: e.target.value })} />
          </div>
          {modalError && <p style={{ color: '#E74C3C', fontSize: 12, marginBottom: 12 }}>{modalError}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={closeModal}>Cancel</button>
            <button style={btnPrimary} onClick={saveReview} disabled={saving}>{saving ? 'Saving...' : 'Submit'}</button>
          </div>
        </Modal>
      )}

      {modal === 'escalation' && (
        <Modal title={modalData.id ? 'Edit Escalation Level' : 'Add Escalation Level'} onClose={closeModal}>
          {[['level', 'Level (e.g. L1, L2)'], ['name', 'Contact Name'], ['contact', 'Contact Email/ID'], ['phone', 'Phone']].map(([k, l]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{l}</label>
              <input style={inputStyle} value={modalData[k] || ''} onChange={e => setModalData({ ...modalData, [k]: e.target.value })} />
            </div>
          ))}
          {modalError && <p style={{ color: '#E74C3C', fontSize: 12, marginBottom: 12 }}>{modalError}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={closeModal}>Cancel</button>
            <button style={btnPrimary} onClick={saveEscalation} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </Modal>
      )}

      {modal === 'cert' && (
        <Modal title="Add Certification" onClose={closeModal}>
          {[['name', 'Certification Name'], ['issuer', 'Issuing Body'], ['expiry', 'Expiry Date']].map(([k, l]) => (
            <div key={k} style={{ marginBottom: 14 }}>
              <label style={labelStyle}>{l}</label>
              <input style={inputStyle} type={k === 'expiry' ? 'date' : 'text'} value={modalData[k] || ''} onChange={e => setModalData({ ...modalData, [k]: e.target.value })} />
            </div>
          ))}
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
              <input type="checkbox" checked={modalData.is_valid !== false} onChange={e => setModalData({ ...modalData, is_valid: e.target.checked })} />
              Currently Valid
            </label>
          </div>
          {modalError && <p style={{ color: '#E74C3C', fontSize: 12, marginBottom: 12 }}>{modalError}</p>}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={closeModal}>Cancel</button>
            <button style={btnPrimary} onClick={saveCert} disabled={saving}>{saving ? 'Saving...' : 'Save'}</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
