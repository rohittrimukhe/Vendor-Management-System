import React, { useState, useEffect, useRef, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';
import { AuthContext } from '../App.jsx';

const TABS = ['Overview', 'Contacts', 'Documents', 'Contracts & SLA', 'Performance', 'Escalation', 'Notes', 'Tasks', 'Onboarding', 'Timeline', 'Scorecard'];

const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 };
const NAVY = '#1C3C6E';

function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: wide ? 680 : 480, maxHeight: '85vh', overflow: 'auto', boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 16 }}>{title}</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 20, color: '#888', lineHeight: 1 }}>✕</span>
        </div>
        {children}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = { 'Empanelled': ['#27AE60', '#F0FFF4'], 'In Evaluation': ['#F39C12', '#FFFBF0'], 'On Hold': ['#E74C3C', '#FFF5F5'], 'Archived': ['#95A5A6', '#F5F5F5'], 'Active': ['#27AE60', '#F0FFF4'], 'Expired': ['#E74C3C', '#FFF5F5'], 'Pending': ['#F39C12', '#FFFBF0'], 'Approved': ['#27AE60', '#F0FFF4'], 'Rejected': ['#E74C3C', '#FFF5F5'], 'In Progress': ['#29ABE2', '#EEF9FF'] };
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

const PRIORITY_COLOR = { Urgent: '#E74C3C', High: '#E67E22', Medium: '#F39C12', Low: '#27AE60' };
const PRIORITY_BG = { Urgent: '#FFF5F5', High: '#FFF3E0', Medium: '#FFFBF0', Low: '#F0FFF4' };

export default function VendorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = useContext(AuthContext);
  const [tab, setTab] = useState(0);
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);

  const [contacts, setContacts] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [performance, setPerformance] = useState({ reviews: [], averages: {} });
  const [escalation, setEscalation] = useState([]);
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  // Tasks state (all at component level — fixes the hooks violation)
  const [tasks, setTasks] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [taskModal, setTaskModal] = useState(false);
  const [taskForm, setTaskForm] = useState({ title: '', description: '', assigned_to_id: '', due_date: '', priority: 'Medium', status: 'Open' });
  const [taskSaving, setTaskSaving] = useState(false);

  // Onboarding state
  const [onboarding, setOnboarding] = useState([]);

  // Timeline state
  const [timeline, setTimeline] = useState([]);
  const [timelineFilter, setTimelineFilter] = useState('all');

  // Scorecard state
  const [scoreData, setScoreData] = useState({ data: [], compositeScore: null, totalWeight: 0 });
  const [editingScores, setEditingScores] = useState(false);
  const [draftScores, setDraftScores] = useState({});
  const [savingScores, setSavingScores] = useState(false);

  // Custom fields state
  const [customFields, setCustomFields] = useState([]);
  const [editCustom, setEditCustom] = useState(false);
  const [customDraft, setCustomDraft] = useState({});

  // Visibility state
  const [visibility, setVisibility] = useState({ visibility: 'everyone', users: [] });
  const [allSystemUsers, setAllSystemUsers] = useState([]);
  const [editVisibility, setEditVisibility] = useState(false);
  const [visibilityDraft, setVisibilityDraft] = useState({ visibility: 'everyone', userIds: [] });

  // Modal state
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
  const loadNotes = () => api.get(`/api/vendors/${id}/notes`).then(setNotes).catch(() => {});
  const loadTasks = () => api.get(`/api/vendors/${id}/tasks`).then(setTasks).catch(() => {});
  const loadOnboarding = () => api.get(`/api/vendors/${id}/onboarding`).then(setOnboarding).catch(() => {});
  const loadTimeline = () => api.get(`/api/vendors/${id}/timeline`).then(setTimeline).catch(() => {});
  const loadScores = () => api.get(`/api/scoring/vendors/${id}`).then(setScoreData).catch(() => {});
  const loadCustomFields = () => api.get(`/api/custom-fields/vendor/${id}`).then(setCustomFields).catch(() => {});
  const loadVisibility = () => api.get(`/api/vendors/${id}/visibility`).then(setVisibility).catch(() => {});

  useEffect(() => {
    Promise.all([
      loadVendor(), loadContacts(), loadDocuments(), loadContracts(),
      loadPerformance(), loadEscalation(), loadNotes(), loadTasks(),
      loadOnboarding(), loadScores(), loadCustomFields(), loadVisibility(),
    ]).finally(() => setLoading(false));
    api.get('/api/users').then(d => { const arr = Array.isArray(d) ? d : []; setAllUsers(arr); setAllSystemUsers(arr); }).catch(() => {});
  }, [id]);

  // Load timeline lazily when tab is opened
  useEffect(() => {
    if (tab === 9 && !timeline.length) loadTimeline();
  }, [tab]);

  const openModal = (name, data = {}) => { setModal(name); setModalData(data); setModalError(''); };
  const closeModal = () => { setModal(null); setModalData({}); setModalError(''); };

  const saveContact = async () => {
    setSaving(true);
    try {
      if (modalData.id) await api.put(`/api/vendors/${id}/contacts/${modalData.id}`, modalData);
      else await api.post(`/api/vendors/${id}/contacts`, modalData);
      await loadContacts(); closeModal();
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
    if (modalData.category) fd.append('category', modalData.category);
    if (modalData.expiry_date) fd.append('expiry_date', modalData.expiry_date);
    if (modalData.description) fd.append('description', modalData.description);
    try { await api.upload(`/api/vendors/${id}/documents`, fd); loadDocuments(); } catch (e) { alert(e.message); }
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
      await loadContracts(); closeModal();
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
      await loadPerformance(); closeModal();
    } catch (e) { setModalError(e.message); } finally { setSaving(false); }
  };

  const saveEscalation = async () => {
    setSaving(true);
    try {
      if (modalData.id) await api.put(`/api/vendors/${id}/performance/escalation/${modalData.id}`, modalData);
      else await api.post(`/api/vendors/${id}/performance/escalation`, modalData);
      await loadEscalation(); closeModal();
    } catch (e) { setModalError(e.message); } finally { setSaving(false); }
  };

  const saveCert = async () => {
    setSaving(true);
    try {
      await api.post(`/api/vendors/${id}/certifications`, modalData);
      await loadVendor(); closeModal();
    } catch (e) { setModalError(e.message); } finally { setSaving(false); }
  };

  // Tasks
  const saveTask = async () => {
    if (!taskForm.title.trim()) return;
    setTaskSaving(true);
    try {
      await api.post(`/api/vendors/${id}/tasks`, taskForm);
      setTaskModal(false);
      setTaskForm({ title: '', description: '', assigned_to_id: '', due_date: '', priority: 'Medium', status: 'Open' });
      loadTasks();
    } catch (e) { alert(e.message); }
    setTaskSaving(false);
  };

  const updateTask = async (taskId, updates) => {
    try { await api.put(`/api/vendors/${id}/tasks/${taskId}`, updates); loadTasks(); } catch (e) { alert(e.message); }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Delete task?')) return;
    try { await api.delete(`/api/vendors/${id}/tasks/${taskId}`); loadTasks(); } catch (e) { alert(e.message); }
  };

  // Scorecard
  const startEditScores = () => {
    const draft = {};
    (scoreData.data || []).forEach(c => { draft[c.id] = { score: c.score ?? 50, notes: c.notes || '' }; });
    setDraftScores(draft);
    setEditingScores(true);
  };

  const saveScores = async () => {
    setSavingScores(true);
    try {
      const scores = Object.entries(draftScores).map(([criteria_id, v]) => ({ criteria_id: parseInt(criteria_id), score: v.score, notes: v.notes }));
      await api.post(`/api/scoring/vendors/${id}`, { scores });
      await loadScores();
      setEditingScores(false);
    } catch (e) { alert(e.message); }
    setSavingScores(false);
  };

  // Custom fields
  const saveVisibility = async () => {
    try {
      await api.put(`/api/vendors/${id}/visibility`, visibilityDraft);
      await loadVisibility();
      setEditVisibility(false);
    } catch (e) { alert(e.message); }
  };

  const saveCustomFields = async () => {
    try {
      const fields = customFields.map(f => ({ field_def_id: f.id, value: customDraft[f.id] ?? f.value }));
      await api.post(`/api/custom-fields/vendor/${id}`, { fields });
      await loadCustomFields();
      setEditCustom(false);
    } catch (e) { alert(e.message); }
  };

  const formatSize = (bytes) => {
    if (bytes > 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    return (bytes / 1024).toFixed(0) + ' KB';
  };

  if (loading) return <Layout title="Vendor Detail"><div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading...</div></Layout>;
  if (!vendor) return null;

  const btnPrimary = { padding: '9px 20px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
  const btnSecondary = { padding: '9px 18px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 14, color: '#555' };

  // ─── Tab renderers ────────────────────────────────────────────────────────

  const renderOverview = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 24, textAlign: 'center' }}>
          <div style={{ width: 80, height: 80, borderRadius: 16, background: vendor.logo_color || NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 32, margin: '0 auto 16px' }}>{vendor.logo_initial || vendor.name[0]}</div>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 17, color: NAVY, marginBottom: 10 }}>{vendor.name}</div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            <StatusBadge status={vendor.empanelment_status} />
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#fff', background: '#29ABE2' }}>{vendor.tier}</span>
            {vendor.risk_level && (() => {
              const rc = { Low: '#27AE60', Medium: '#F39C12', High: '#E67E22', Critical: '#E74C3C' };
              const rb = { Low: '#F0FFF4', Medium: '#FFFBF0', High: '#FFF3E0', Critical: '#FFF5F5' };
              return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: rc[vendor.risk_level], background: rb[vendor.risk_level] }}>⚡ {vendor.risk_level} Risk</span>;
            })()}
            {vendor.approval_status === 'pending_review' && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#F39C12', background: '#FFFBF0' }}>⏳ Pending Approval</span>}
            {vendor.approval_status === 'rejected' && <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: '#E74C3C', background: '#FFF5F5' }}>✗ Rejected</span>}
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
              {vendor.domains.map((d, i) => <span key={i} style={{ background: '#EEF5FF', color: NAVY, padding: '5px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500 }}>{d}</span>)}
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
        {/* Certifications */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Certifications</div>
            {can('Vendors', 'Edit') && <button onClick={() => openModal('cert')} style={{ padding: '5px 12px', background: '#EEF5FF', color: NAVY, border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>+ Add</button>}
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
                  {can('Vendors', 'Full') && <span onClick={() => api.delete(`/api/vendors/${id}/certifications/${c.id}`).then(loadVendor)} style={{ cursor: 'pointer', color: '#E74C3C', fontSize: 14 }}>✕</span>}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Custom Fields */}
        {customFields.length > 0 && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Custom Fields</div>
              {can('Vendors', 'Edit') && (
                <button onClick={() => { setEditCustom(true); const d = {}; customFields.forEach(f => { d[f.id] = f.value; }); setCustomDraft(d); }} style={{ padding: '5px 12px', background: '#EEF5FF', color: NAVY, border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
              )}
            </div>
            {editCustom ? (
              <div>
                {customFields.map(f => (
                  <div key={f.id} style={{ marginBottom: 12 }}>
                    <label style={labelStyle}>{f.name}{f.required ? ' *' : ''}</label>
                    {f.field_type === 'select' && f.options ? (
                      <select style={inputStyle} value={customDraft[f.id] || ''} onChange={e => setCustomDraft(p => ({ ...p, [f.id]: e.target.value }))}>
                        <option value="">— Select —</option>
                        {f.options.map(o => <option key={o}>{o}</option>)}
                      </select>
                    ) : f.field_type === 'textarea' ? (
                      <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={customDraft[f.id] || ''} onChange={e => setCustomDraft(p => ({ ...p, [f.id]: e.target.value }))} />
                    ) : (
                      <input style={inputStyle} type={f.field_type === 'number' ? 'number' : f.field_type === 'date' ? 'date' : 'text'} value={customDraft[f.id] || ''} onChange={e => setCustomDraft(p => ({ ...p, [f.id]: e.target.value }))} />
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
                  <button style={btnSecondary} onClick={() => setEditCustom(false)}>Cancel</button>
                  <button style={btnPrimary} onClick={saveCustomFields}>Save</button>
                </div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {customFields.map(f => (
                  <div key={f.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#F8FAFC', borderRadius: 7 }}>
                    <span style={{ fontSize: 12, color: '#888', fontWeight: 600 }}>{f.name}</span>
                    <span style={{ fontSize: 13, color: '#333' }}>{f.value || <span style={{ color: '#ccc' }}>—</span>}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {/* Visibility Settings (admin/full only) */}
        {can('Vendors', 'Full') && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Visibility</div>
              <button onClick={() => { setVisibilityDraft({ visibility: visibility.visibility, userIds: visibility.users.map(u => u.id) }); setEditVisibility(true); }} style={{ padding: '5px 12px', background: '#EEF5FF', color: NAVY, border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
            </div>
            {editVisibility ? (
              <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 16 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, marginBottom: 8 }}>
                    <input type="radio" name="vis" value="everyone" checked={visibilityDraft.visibility === 'everyone'} onChange={() => setVisibilityDraft(p => ({ ...p, visibility: 'everyone', userIds: [] }))} />
                    <span style={{ fontWeight: 600 }}>Everyone</span> — all users can see this vendor
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                    <input type="radio" name="vis" value="selected" checked={visibilityDraft.visibility === 'selected'} onChange={() => setVisibilityDraft(p => ({ ...p, visibility: 'selected' }))} />
                    <span style={{ fontWeight: 600 }}>Selected Users</span> — only specific users can see this vendor
                  </label>
                </div>
                {visibilityDraft.visibility === 'selected' && (
                  <div style={{ maxHeight: 180, overflow: 'auto', border: '1px solid #DDE2E8', borderRadius: 6, padding: 8, marginBottom: 12 }}>
                    {allSystemUsers.map(u => (
                      <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 6px', cursor: 'pointer', borderRadius: 5, fontSize: 13 }}>
                        <input type="checkbox" checked={visibilityDraft.userIds.includes(u.id)} onChange={e => setVisibilityDraft(p => ({ ...p, userIds: e.target.checked ? [...p.userIds, u.id] : p.userIds.filter(uid => uid !== u.id) }))} />
                        <div style={{ width: 24, height: 24, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 10, fontWeight: 700 }}>{u.name?.[0] || 'U'}</div>
                        {u.name} <span style={{ color: '#aaa', fontSize: 11 }}>({u.username})</span>
                      </label>
                    ))}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button style={btnSecondary} onClick={() => setEditVisibility(false)}>Cancel</button>
                  <button style={btnPrimary} onClick={saveVisibility}>Save</button>
                </div>
              </div>
            ) : (
              <div style={{ padding: '10px 14px', background: '#F8FAFC', borderRadius: 8 }}>
                {visibility.visibility === 'everyone' ? (
                  <span style={{ fontSize: 13, color: '#27AE60', fontWeight: 600 }}>🌐 Visible to everyone</span>
                ) : (
                  <div>
                    <span style={{ fontSize: 13, color: '#F39C12', fontWeight: 600 }}>🔒 Restricted access</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                      {visibility.users.map(u => (
                        <span key={u.id} style={{ padding: '3px 10px', background: '#EEF5FF', color: NAVY, borderRadius: 20, fontSize: 12, fontWeight: 500 }}>{u.name}</span>
                      ))}
                      {visibility.users.length === 0 && <span style={{ fontSize: 12, color: '#aaa' }}>No users selected yet</span>}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const renderContacts = () => (
    <div>
      {can('Vendors', 'Edit') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={() => openModal('contact')} style={{ ...btnPrimary }}>+ Add Contact</button>
        </div>
      )}
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
                  {can('Vendors', 'Edit') && <button onClick={() => openModal('contact', c)} style={{ padding: '4px 10px', background: '#EEF5FF', color: NAVY, border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Edit</button>}
                  {can('Vendors', 'Full') && <button onClick={() => deleteContact(c.id)} style={{ padding: '4px 10px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Delete</button>}
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
        onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#DDE2E8'; if (can('Vendors','Edit')) { const file = e.dataTransfer.files[0]; if (file) handleFileUpload(file); } }}
        onClick={() => can('Vendors','Edit') && fileInputRef.current?.click()}
        style={{ border: '2px dashed #DDE2E8', borderRadius: 10, padding: '28px', textAlign: 'center', cursor: can('Vendors','Edit') ? 'pointer' : 'default', marginBottom: 20, background: '#FAFBFC', transition: 'border-color 0.2s' }}
      >
        <div style={{ fontSize: 32, marginBottom: 8 }}>📁</div>
        <div style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>Drop files here or click to upload</div>
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>Any file type • Max 50 MB • Add category and expiry below</div>
      </div>
      <input ref={fileInputRef} type="file" style={{ display: 'none' }} onChange={e => e.target.files[0] && handleFileUpload(e.target.files[0])} />

      {can('Vendors','Edit') && (
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <select style={{ padding: '7px 10px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 12, outline: 'none' }} value={modalData.category || ''} onChange={e => setModalData(p => ({ ...p, category: e.target.value }))}>
            <option value="">Category</option>
            {['NDA', 'MSA', 'SOW', 'Compliance', 'Certificate', 'Invoice', 'Proposal', 'Other'].map(c => <option key={c}>{c}</option>)}
          </select>
          <input type="date" style={{ padding: '7px 10px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 12, outline: 'none' }} value={modalData.expiry_date || ''} onChange={e => setModalData(p => ({ ...p, expiry_date: e.target.value }))} placeholder="Expiry date" title="Expiry date" />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {documents.length === 0 && <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', padding: 20 }}>No documents uploaded yet.</p>}
        {documents.map(d => {
          const expiring = d.expiry_date && new Date(d.expiry_date) < new Date(Date.now() + 60 * 86400000);
          const expired = d.expiry_date && new Date(d.expiry_date) < new Date();
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 16px', background: '#fff', border: `1px solid ${expired ? '#FFCDD2' : expiring ? '#FFE0B2' : '#E8ECF0'}`, borderRadius: 8 }}>
              <span style={{ fontSize: 24 }}>📄</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.name}</div>
                <div style={{ fontSize: 12, color: '#888' }}>
                  {formatSize(d.size)} • {d.category || 'Other'} • {d.uploaded_at?.split('T')[0]}
                  {d.expiry_date && <span style={{ marginLeft: 8, color: expired ? '#E74C3C' : expiring ? '#F39C12' : '#888', fontWeight: expired || expiring ? 600 : 400 }}>
                    {expired ? '⚠ Expired: ' : expiring ? '⏰ Expiring: ' : 'Expires: '}{d.expiry_date}
                  </span>}
                </div>
              </div>
              {d.category && <span style={{ padding: '2px 8px', background: '#EEF5FF', color: NAVY, borderRadius: 10, fontSize: 11, fontWeight: 600 }}>{d.category}</span>}
              <a href={`/api/vendors/${id}/documents/${d.id}/download`} style={{ padding: '5px 12px', background: '#EEF5FF', color: NAVY, border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600, textDecoration: 'none' }}>Download</a>
              {can('Vendors', 'Full') && <button onClick={() => deleteDocument(d.id)} style={{ padding: '5px 10px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer' }}>✕</button>}
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderContracts = () => (
    <div>
      {can('Vendors', 'Edit') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={() => openModal('contract')} style={btnPrimary}>+ Add Contract</button>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#F5F6FA' }}>{['Type', 'Start', 'End', 'Value', 'SLA', 'Status', 'Actions'].map(h => <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #E8ECF0' }}>{h}</th>)}</tr></thead>
        <tbody>
          {contracts.length === 0 && <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#aaa', fontSize: 14 }}>No contracts added yet.</td></tr>}
          {contracts.map(c => {
            const daysLeft = c.end_date ? Math.ceil((new Date(c.end_date) - new Date()) / 86400000) : null;
            const expiringSoon = daysLeft !== null && daysLeft <= 90 && daysLeft >= 0 && c.status === 'Active';
            return (
              <tr key={c.id} style={{ borderBottom: '1px solid #F0F4F8', background: expiringSoon ? '#FFFBF0' : '#fff' }}>
                <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>{c.type || '—'}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{c.start_date || '—'}</td>
                <td style={{ padding: '12px 14px', fontSize: 13 }}>
                  <span style={{ color: expiringSoon ? '#E74C3C' : '#555' }}>{c.end_date || '—'}</span>
                  {expiringSoon && <span style={{ fontSize: 11, color: '#E74C3C', marginLeft: 4, fontWeight: 600 }}>({daysLeft}d)</span>}
                </td>
                <td style={{ padding: '12px 14px', fontSize: 13 }}>{c.value ? `₹${Number(c.value).toLocaleString()}` : '—'}</td>
                <td style={{ padding: '12px 14px', fontSize: 13, color: '#555', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.sla || '—'}</td>
                <td style={{ padding: '12px 14px' }}><StatusBadge status={c.status} /></td>
                <td style={{ padding: '12px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {expiringSoon && can('Vendors', 'Edit') && (
                      <button onClick={async () => {
                        await api.post(`/api/vendors/${id}/tasks`, { title: `Renew contract: ${c.type || 'Contract'}`, description: `Contract expires on ${c.end_date}. ${daysLeft} days remaining. Value: ₹${Number(c.value || 0).toLocaleString()}`, priority: daysLeft <= 30 ? 'Urgent' : 'High', due_date: c.end_date });
                        loadTasks();
                        alert('Renewal task created in Tasks tab');
                      }} style={{ padding: '4px 10px', background: '#FFF3E0', color: '#E67E22', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>🔄 Renew</button>
                    )}
                    {can('Vendors', 'Edit') && <button onClick={() => openModal('contract', c)} style={{ padding: '4px 10px', background: '#EEF5FF', color: NAVY, border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Edit</button>}
                    {can('Vendors', 'Full') && <button onClick={() => deleteContract(c.id)} style={{ padding: '4px 10px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Delete</button>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderPerformance = () => {
    const avg = performance.averages || {};
    const barStyle = (pct) => ({ height: 10, borderRadius: 5, background: '#29ABE2', width: `${pct || 0}%`, transition: 'width 0.6s ease' });
    return (
      <div>
        {can('Vendors', 'Edit') && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => openModal('review', { rating: 3, on_time_delivery: 80, support_quality: 80, price_competitiveness: 80, notes: '' })} style={btnPrimary}>+ Add Review</button>
          </div>
        )}
        {performance.reviews.length > 0 && (
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: '20px 24px', marginBottom: 24 }}>
            <div style={{ marginBottom: 16 }}><div style={{ fontSize: 13, color: '#888', marginBottom: 4 }}>Average Rating</div><Stars rating={avg.avg_rating || 0} /></div>
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
                <span>Delivery: {r.on_time_delivery}%</span><span>Support: {r.support_quality}%</span><span>Price: {r.price_competitiveness}%</span>
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
      {can('Vendors', 'Edit') && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <button onClick={() => openModal('escalation', { level: `L${escalation.length + 1}`, sort_order: escalation.length })} style={btnPrimary}>+ Add Level</button>
        </div>
      )}
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead><tr style={{ background: '#F5F6FA' }}>{['Level', 'Name', 'Contact', 'Phone', 'Actions'].map(h => <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', borderBottom: '1px solid #E8ECF0' }}>{h}</th>)}</tr></thead>
        <tbody>
          {escalation.length === 0 && <tr><td colSpan={5} style={{ padding: 30, textAlign: 'center', color: '#aaa', fontSize: 14 }}>No escalation matrix defined.</td></tr>}
          {escalation.map(e => (
            <tr key={e.id} style={{ borderBottom: '1px solid #F0F4F8' }}>
              <td style={{ padding: '12px 14px' }}><span style={{ padding: '3px 10px', background: NAVY, color: '#fff', borderRadius: 12, fontSize: 12, fontWeight: 700 }}>{e.level}</span></td>
              <td style={{ padding: '12px 14px', fontWeight: 600, fontSize: 14 }}>{e.name}</td>
              <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{e.contact || '—'}</td>
              <td style={{ padding: '12px 14px', fontSize: 13, color: '#555' }}>{e.phone || '—'}</td>
              <td style={{ padding: '12px 14px' }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {can('Vendors', 'Edit') && <button onClick={() => openModal('escalation', e)} style={{ padding: '4px 10px', background: '#EEF5FF', color: NAVY, border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Edit</button>}
                  {can('Vendors', 'Full') && <button onClick={async () => { if (window.confirm('Delete?')) { await api.delete(`/api/vendors/${id}/performance/escalation/${e.id}`); loadEscalation(); } }} style={{ padding: '4px 10px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}>Delete</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderNotes = () => {
    const addNote = async () => {
      if (!newNote.trim()) return;
      setSavingNote(true);
      try { await api.post(`/api/vendors/${id}/notes`, { content: newNote }); setNewNote(''); loadNotes(); } catch (e) { alert(e.message); }
      setSavingNote(false);
    };
    const deleteNote = async (nid) => {
      if (!window.confirm('Delete this note?')) return;
      try { await api.delete(`/api/vendors/${id}/notes/${nid}`); loadNotes(); } catch (e) { alert(e.message); }
    };
    return (
      <div>
        {can('Vendors', 'Edit') && (
          <div style={{ marginBottom: 20 }}>
            <textarea placeholder="Add an internal note..." value={newNote} onChange={e => setNewNote(e.target.value)} style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDE2E8', borderRadius: 8, fontSize: 14, resize: 'vertical', minHeight: 80, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={addNote} disabled={savingNote || !newNote.trim()} style={btnPrimary}>{savingNote ? 'Posting...' : 'Post Note'}</button>
            </div>
          </div>
        )}
        {notes.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa', fontSize: 14 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>No notes yet.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {notes.map(n => (
              <div key={n.id} style={{ background: '#FFFBF0', border: '1px solid #F0E6C0', borderRadius: 8, padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>{n.created_by ? n.created_by[0].toUpperCase() : 'U'}</div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: NAVY }}>{n.created_by || 'Unknown'}</div>
                      <div style={{ fontSize: 11, color: '#aaa' }}>{new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    </div>
                  </div>
                  <button onClick={() => deleteNote(n.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ccc', fontSize: 14 }}>✕</button>
                </div>
                <p style={{ margin: 0, fontSize: 14, color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.content}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderTasks = () => {
    const openT = tasks.filter(t => t.status === 'Open');
    const inProgT = tasks.filter(t => t.status === 'In Progress');
    const doneT = tasks.filter(t => t.status === 'Done');

    return (
      <div>
        {can('Vendors', 'Edit') && (
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
            <button onClick={() => setTaskModal(true)} style={btnPrimary}>+ Add Task</button>
          </div>
        )}
        {tasks.length === 0 && (
          <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
            <div style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>No tasks yet</div>
          </div>
        )}
        {[{ label: 'Open', items: openT, color: '#29ABE2' }, { label: 'In Progress', items: inProgT, color: '#8E44AD' }, { label: 'Done', items: doneT, color: '#27AE60' }].map(group => group.items.length > 0 && (
          <div key={group.label} style={{ marginBottom: 24 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: group.color, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>{group.label} ({group.items.length})</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {group.items.map(t => {
                const isOverdue = t.status !== 'Done' && t.due_date && t.due_date < new Date().toISOString().split('T')[0];
                return (
                  <div key={t.id} style={{ background: '#F8FAFC', borderRadius: 8, padding: '14px 16px', borderLeft: `3px solid ${PRIORITY_COLOR[t.priority] || '#DDE2E8'}`, display: 'flex', gap: 12 }}>
                    <div onClick={() => updateTask(t.id, { status: t.status === 'Done' ? 'Open' : 'Done' })} style={{ width: 18, height: 18, borderRadius: 4, border: `2px solid ${t.status === 'Done' ? '#27AE60' : '#DDE2E8'}`, background: t.status === 'Done' ? '#27AE60' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, marginTop: 2 }}>
                      {t.status === 'Done' && <span style={{ color: '#fff', fontSize: 10 }}>✓</span>}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 14, fontWeight: 600, color: NAVY, textDecoration: t.status === 'Done' ? 'line-through' : 'none' }}>{t.title}</span>
                        <span style={{ padding: '1px 7px', borderRadius: 10, fontSize: 11, fontWeight: 700, color: PRIORITY_COLOR[t.priority], background: PRIORITY_BG[t.priority] }}>{t.priority}</span>
                      </div>
                      {t.description && <p style={{ fontSize: 13, color: '#666', margin: '0 0 6px', lineHeight: 1.5 }}>{t.description}</p>}
                      <div style={{ display: 'flex', gap: 14, fontSize: 12, color: '#888', flexWrap: 'wrap' }}>
                        {t.assigned_to && <span>👤 {t.assigned_to}</span>}
                        {t.due_date && <span style={{ color: isOverdue ? '#E74C3C' : '#888', fontWeight: isOverdue ? 600 : 400 }}>📅 {isOverdue ? 'Overdue: ' : ''}{t.due_date}</span>}
                        <span>by {t.created_by}</span>
                      </div>
                    </div>
                    {can('Vendors', 'Edit') && (
                      <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                        {t.status !== 'Done' && (
                          <select value={t.status} onChange={e => updateTask(t.id, { status: e.target.value })} style={{ padding: '4px 8px', border: '1px solid #DDE2E8', borderRadius: 5, fontSize: 11, background: '#fff', cursor: 'pointer', outline: 'none' }}>
                            <option>Open</option><option>In Progress</option><option>Done</option>
                          </select>
                        )}
                        <button onClick={() => deleteTask(t.id)} style={{ padding: '4px 8px', background: '#FFF0F0', color: '#E74C3C', border: 'none', borderRadius: 4, fontSize: 11, cursor: 'pointer' }}>✕</button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOnboarding = () => {
    const total = onboarding.length;
    const approved = onboarding.filter(s => s.status === 'Approved').length;
    const rejected = onboarding.filter(s => s.status === 'Rejected').length;
    const pct = total ? Math.round((approved / total) * 100) : 0;

    const STATUS_OBJ = {
      Pending: { color: '#888', bg: '#F5F5F5', icon: '○' },
      'In Progress': { color: '#29ABE2', bg: '#EEF9FF', icon: '◑' },
      Approved: { color: '#27AE60', bg: '#F0FFF4', icon: '✓' },
      Rejected: { color: '#E74C3C', bg: '#FFF5F5', icon: '✗' },
    };

    return (
      <div>
        {total > 0 && (
          <div style={{ background: '#F8FAFC', borderRadius: 12, padding: 20, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 24 }}>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 36, color: rejected > 0 ? '#E74C3C' : pct === 100 ? '#27AE60' : NAVY }}>{pct}%</div>
              <div style={{ fontSize: 11, color: '#888' }}>complete</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ height: 10, background: '#E8ECF0', borderRadius: 5, marginBottom: 8, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: rejected > 0 ? '#E74C3C' : '#27AE60', borderRadius: 5, transition: 'width 0.6s' }} />
              </div>
              <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#666' }}>
                <span>✓ {approved} approved</span>
                {rejected > 0 && <span style={{ color: '#E74C3C' }}>✗ {rejected} rejected</span>}
                <span>○ {total - approved - rejected} pending</span>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {onboarding.length === 0 && <p style={{ color: '#aaa', fontSize: 14, textAlign: 'center', padding: 20 }}>No onboarding stages found.</p>}
          {onboarding.map((s, idx) => {
            const st = STATUS_OBJ[s.status] || STATUS_OBJ.Pending;
            return (
              <div key={s.id} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: st.bg, border: `2px solid ${st.color}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: st.color, fontSize: 14 }}>{st.icon}</div>
                  {idx < onboarding.length - 1 && <div style={{ width: 2, flex: 1, background: '#E8ECF0', minHeight: 20, marginTop: 4 }} />}
                </div>
                <div style={{ flex: 1, background: '#fff', border: '1px solid #E8ECF0', borderRadius: 10, padding: '14px 16px', marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: NAVY }}>{s.stage}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {can('Vendors', 'Edit') ? (
                        <select value={s.status} onChange={async e => { await api.put(`/api/vendors/${id}/onboarding/${s.id}`, { status: e.target.value }); loadOnboarding(); }}
                          style={{ padding: '5px 10px', border: `1px solid ${st.color}`, borderRadius: 6, fontSize: 12, color: st.color, background: st.bg, cursor: 'pointer', outline: 'none', fontWeight: 600 }}>
                          {['Pending', 'In Progress', 'Approved', 'Rejected'].map(opt => <option key={opt}>{opt}</option>)}
                        </select>
                      ) : (
                        <span style={{ padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, color: st.color, background: st.bg }}>{s.status}</span>
                      )}
                    </div>
                  </div>
                  {s.assigned_to && <div style={{ fontSize: 12, color: '#888', marginTop: 6 }}>👤 {s.assigned_to}</div>}
                  {s.notes && <p style={{ fontSize: 13, color: '#555', margin: '8px 0 0', lineHeight: 1.5 }}>{s.notes}</p>}
                  {can('Vendors', 'Edit') && (
                    <div style={{ marginTop: 8 }}>
                      <input placeholder="Add a note..." defaultValue={s.notes || ''} onBlur={async e => { if (e.target.value !== (s.notes || '')) { await api.put(`/api/vendors/${id}/onboarding/${s.id}`, { notes: e.target.value }); loadOnboarding(); } }} style={{ ...inputStyle, fontSize: 12, padding: '6px 10px' }} />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderTimeline = () => {
    const TYPE_ICONS = { contract: '📄', document: '📁', review: '⭐', note: '📝', task: '📋', task_done: '✅', onboarding: '🔄', cert: '🏅', audit: '🔍' };
    const filtered = timelineFilter === 'all' ? timeline : timeline.filter(e => e.type === timelineFilter);
    const filters = ['all', 'contract', 'document', 'review', 'note', 'task', 'onboarding', 'cert'];

    return (
      <div>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {filters.map(f => (
            <button key={f} onClick={() => setTimelineFilter(f)} style={{ padding: '6px 14px', borderRadius: 20, border: '1px solid #DDE2E8', fontSize: 12, fontWeight: timelineFilter === f ? 700 : 400, background: timelineFilter === f ? NAVY : '#fff', color: timelineFilter === f ? '#fff' : '#555', cursor: 'pointer' }}>
              {TYPE_ICONS[f] || '◉'} {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>
            <div style={{ fontSize: 36, marginBottom: 8 }}>📅</div>
            <div>No activity recorded yet.</div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {filtered.map((e, idx) => (
              <div key={e.id} style={{ display: 'flex', gap: 14 }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 36 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: e.color + '20', border: `2px solid ${e.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>{TYPE_ICONS[e.type] || '◉'}</div>
                  {idx < filtered.length - 1 && <div style={{ width: 2, flex: 1, background: '#F0F0F0', minHeight: 16, margin: '3px 0' }} />}
                </div>
                <div style={{ flex: 1, padding: '6px 0 14px' }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: NAVY }}>{e.title}</div>
                  {e.detail && <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>{e.detail}</div>}
                  {e.date && <div style={{ fontSize: 11, color: '#aaa', marginTop: 3 }}>{new Date(e.date).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderScorecard = () => {
    const { data: criteria, compositeScore } = scoreData;
    const hasScores = criteria.some(c => c.score !== null);
    const scoreColor = (s) => s >= 75 ? '#27AE60' : s >= 50 ? '#F39C12' : '#E74C3C';
    const compositeColor = compositeScore >= 75 ? '#27AE60' : compositeScore >= 50 ? '#F39C12' : compositeScore !== null ? '#E74C3C' : '#888';

    if (!criteria.length) return (
      <div style={{ padding: 60, textAlign: 'center', color: '#aaa' }}>
        <div style={{ fontSize: 36, marginBottom: 8 }}>📊</div>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#555' }}>No scoring criteria configured</div>
        <div style={{ fontSize: 13, marginTop: 4 }}>Ask an admin to set up criteria in Admin → Scoring Criteria</div>
      </div>
    );

    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {compositeScore !== null && (
              <div style={{ textAlign: 'center', background: '#F8FAFC', borderRadius: 12, padding: '16px 24px' }}>
                <div style={{ fontSize: 11, color: '#888', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Composite Score</div>
                <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 36, color: compositeColor }}>{compositeScore}</div>
                <div style={{ fontSize: 11, color: '#aaa' }}>out of 100</div>
              </div>
            )}
            {!hasScores && <p style={{ color: '#aaa', fontSize: 13 }}>Not yet scored. Click "Score Vendor" to evaluate.</p>}
          </div>
          {can('Vendors', 'Edit') && !editingScores && (
            <button onClick={startEditScores} style={btnPrimary}>{hasScores ? 'Update Scores' : 'Score Vendor'}</button>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {criteria.map(c => {
            const ds = draftScores[c.id];
            const displayScore = editingScores ? ds?.score : c.score;
            return (
              <div key={c.id} style={{ background: '#F8FAFC', borderRadius: 10, padding: '16px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: NAVY }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: '#888', marginTop: 2 }}>Weight: {c.weight}%</div>
                  </div>
                  <div>
                    {displayScore !== null && displayScore !== undefined
                      ? <span style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 22, color: scoreColor(displayScore) }}>{displayScore}</span>
                      : <span style={{ fontSize: 13, color: '#aaa' }}>Not scored</span>}
                  </div>
                </div>
                {editingScores ? (
                  <div>
                    <input type="range" min={0} max={100} step={5} value={ds?.score ?? 50}
                      onChange={e => setDraftScores(prev => ({ ...prev, [c.id]: { ...prev[c.id], score: parseInt(e.target.value) } }))}
                      style={{ width: '100%', marginBottom: 8 }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#aaa', marginBottom: 8 }}><span>0 — Poor</span><span>50 — Average</span><span>100 — Excellent</span></div>
                    <input placeholder="Notes (optional)" value={ds?.notes || ''} onChange={e => setDraftScores(prev => ({ ...prev, [c.id]: { ...prev[c.id], notes: e.target.value } }))} style={{ ...inputStyle, fontSize: 12 }} />
                  </div>
                ) : displayScore !== null && displayScore !== undefined && (
                  <div>
                    <div style={{ height: 8, background: '#E8ECF0', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${displayScore}%`, background: scoreColor(displayScore), borderRadius: 4, transition: 'width 0.6s' }} />
                    </div>
                    {c.notes && <div style={{ fontSize: 12, color: '#888', marginTop: 6, fontStyle: 'italic' }}>{c.notes}</div>}
                    {c.scored_by && <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>Scored by {c.scored_by} on {c.scored_at?.split('T')[0]}</div>}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {editingScores && (
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
            <button style={btnSecondary} onClick={() => setEditingScores(false)}>Cancel</button>
            <button style={btnPrimary} onClick={saveScores} disabled={savingScores}>{savingScores ? 'Saving...' : 'Save Scores'}</button>
          </div>
        )}
      </div>
    );
  };

  const tabContent = [renderOverview, renderContacts, renderDocuments, renderContracts, renderPerformance, renderEscalation, renderNotes, renderTasks, renderOnboarding, renderTimeline, renderScorecard];

  return (
    <Layout title={vendor.name}>
      <button onClick={() => navigate('/vendors')} style={{ ...btnSecondary, marginBottom: 16 }}>← Back to Vendors</button>

      <div style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: 20, overflow: 'hidden' }}>
        <div style={{ display: 'flex', borderBottom: '1px solid #E8ECF0', overflowX: 'auto' }}>
          {TABS.map((t, i) => (
            <button key={i} onClick={() => setTab(i)} style={{ padding: '14px 18px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, fontWeight: tab === i ? 700 : 400, color: tab === i ? NAVY : '#888', borderBottom: tab === i ? `3px solid ${NAVY}` : '3px solid transparent', whiteSpace: 'nowrap', transition: 'all 0.15s' }}>
              {t}
            </button>
          ))}
        </div>
        <div style={{ padding: 24 }}>
          {tabContent[tab]()}
        </div>
      </div>

      {/* ─── Modals ─── */}
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
            <label style={labelStyle}>Rating (1–5)</label>
            <input style={inputStyle} type="number" min={1} max={5} step={0.5} value={modalData.rating || 3} onChange={e => setModalData({ ...modalData, rating: parseFloat(e.target.value) })} />
          </div>
          {[['on_time_delivery', 'On-Time Delivery (0–100)'], ['support_quality', 'Support Quality (0–100)'], ['price_competitiveness', 'Price Competitiveness (0–100)']].map(([k, l]) => (
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

      {/* Task add modal */}
      {taskModal && (
        <Modal title="Add Task" onClose={() => setTaskModal(false)}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Title *</label>
            <input style={inputStyle} placeholder="Task title" value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Description</label>
            <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} placeholder="Details..." value={taskForm.description} onChange={e => setTaskForm({ ...taskForm, description: e.target.value })} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div>
              <label style={labelStyle}>Priority</label>
              <select style={inputStyle} value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}>
                <option>Low</option><option>Medium</option><option>High</option><option>Urgent</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Due Date</label>
              <input type="date" style={inputStyle} value={taskForm.due_date} onChange={e => setTaskForm({ ...taskForm, due_date: e.target.value })} />
            </div>
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={labelStyle}>Assign To</label>
            <select style={inputStyle} value={taskForm.assigned_to_id} onChange={e => setTaskForm({ ...taskForm, assigned_to_id: e.target.value })}>
              <option value="">— Unassigned —</option>
              {allUsers.map(u => <option key={u.id} value={u.id}>{u.name} (@{u.username})</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button style={btnSecondary} onClick={() => setTaskModal(false)}>Cancel</button>
            <button style={btnPrimary} onClick={saveTask} disabled={taskSaving || !taskForm.title.trim()}>{taskSaving ? 'Saving...' : 'Add Task'}</button>
          </div>
        </Modal>
      )}
    </Layout>
  );
}
