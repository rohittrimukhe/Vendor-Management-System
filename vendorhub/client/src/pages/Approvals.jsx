import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';
import { AuthContext } from '../App.jsx';

const NAVY = '#1C3C6E';
const inputStyle = { width: '100%', padding: '9px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', boxSizing: 'border-box' };
const labelStyle = { display: 'block', fontSize: 11, fontWeight: 600, color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 };
const btnPrimary = (bg) => ({ padding: '9px 20px', background: bg || NAVY, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 });
const btnSecondary = { padding: '9px 18px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555' };

const STATUS_STYLE = {
  approved: { color: '#27AE60', bg: '#F0FFF4', label: '✓ Approved', icon: '✅' },
  pending_review: { color: '#F39C12', bg: '#FFFBF0', label: '⏳ Pending Review', icon: '🔖' },
  rejected: { color: '#E74C3C', bg: '#FFF5F5', label: '✗ Rejected', icon: '❌' },
};

function NoteThread({ notes, onAddNote, canReview, showAddNote }) {
  const [newNote, setNewNote] = useState('');
  const [posting, setPosting] = useState(false);

  const post = async () => {
    if (!newNote.trim()) return;
    setPosting(true);
    await onAddNote(newNote);
    setNewNote('');
    setPosting(false);
  };

  return (
    <div>
      {notes.length === 0 && !showAddNote ? (
        <p style={{ color: '#aaa', fontSize: 13, margin: '8px 0' }}>No notes yet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
          {notes.map(n => {
            const roleColor = n.role === 'reviewer' ? '#27AE60' : n.role === 'requester' ? NAVY : '#8E44AD';
            return (
              <div key={n.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: roleColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0 }}>
                  {n.username?.[0]?.toUpperCase() || 'U'}
                </div>
                <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 8, padding: '10px 14px', border: `1px solid ${roleColor}22` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: roleColor }}>{n.username} <span style={{ fontWeight: 400, color: '#888', fontSize: 11, textTransform: 'capitalize' }}>({n.role})</span></span>
                    <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: 13, color: '#444', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{n.note}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
      {showAddNote && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea value={newNote} onChange={e => setNewNote(e.target.value)} placeholder="Add a note or comment..." style={{ flex: 1, padding: '8px 10px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', resize: 'none', minHeight: 60, fontFamily: 'inherit' }} />
          <button onClick={post} disabled={posting || !newNote.trim()} style={{ ...btnPrimary(), padding: '8px 16px', flexShrink: 0 }}>{posting ? '...' : 'Post'}</button>
        </div>
      )}
    </div>
  );
}

function VendorReviewCard({ vendor, role, onRefresh }) {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const [details, setDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [reviewAction, setReviewAction] = useState(null); // 'approve' | 'reject'
  const [reviewNote, setReviewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const st = STATUS_STYLE[vendor.approval_status] || STATUS_STYLE.pending_review;

  const loadDetails = async () => {
    if (details) return;
    setLoadingDetails(true);
    try {
      const d = await api.get(`/api/vendors/${vendor.id}/approval`);
      setDetails(d);
    } catch {}
    setLoadingDetails(false);
  };

  const toggle = () => {
    setExpanded(p => !p);
    if (!expanded) loadDetails();
  };

  const refreshDetails = async () => {
    setDetails(null);
    await loadDetails();
    // Force reload
    setLoadingDetails(true);
    try {
      const d = await api.get(`/api/vendors/${vendor.id}/approval`);
      setDetails(d);
    } catch {}
    setLoadingDetails(false);
  };

  const startEdit = async () => {
    const v = await api.get(`/api/vendors/${vendor.id}`);
    setEditForm({
      name: v.name || '',
      gstin: v.gstin || '',
      website: v.website || '',
      address: v.address || '',
      vendor_type: v.vendor_type || '',
      tier: v.tier || 'Tier 2',
      empanelment_status: v.empanelment_status || 'In Evaluation',
      summary: v.summary || '',
    });
    setEditMode(true);
  };

  const saveEdit = async () => {
    setSavingEdit(true);
    try {
      await api.put(`/api/vendors/${vendor.id}`, editForm);
      await api.post(`/api/vendors/${vendor.id}/approval/note`, { note: `[Manager correction] Updated vendor information: ${Object.keys(editForm).filter(k => editForm[k]).join(', ')}` });
      setEditMode(false);
      refreshDetails();
      onRefresh();
    } catch (e) { alert(e.message); }
    setSavingEdit(false);
  };

  const submitReview = async () => {
    if (!reviewAction) return;
    setSubmitting(true);
    try {
      await api.post(`/api/vendors/${vendor.id}/approval/review`, { action: reviewAction, note: reviewNote });
      setReviewAction(null);
      setReviewNote('');
      onRefresh();
    } catch (e) { alert(e.message); }
    setSubmitting(false);
  };

  const addNote = async (note) => {
    await api.post(`/api/vendors/${vendor.id}/approval/note`, { note });
    await refreshDetails();
  };

  return (
    <div style={{ background: '#fff', border: `1px solid ${vendor.approval_status === 'pending_review' ? '#F39C1240' : '#E8ECF0'}`, borderRadius: 12, overflow: 'hidden', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: vendor.logo_color || NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>
          {vendor.logo_initial || vendor.name?.[0]}
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 15, color: NAVY }}>{vendor.name}</div>
          <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
            {role === 'reviewer' ? `Submitted by: ${vendor.requester_name || vendor.requester_username}` : `Reviewer: ${vendor.reviewer_name || vendor.reviewer_username || 'Not assigned'}`}
            {' · '}{new Date(vendor.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: st.color, background: st.bg }}>{st.label}</span>
          <button onClick={toggle} style={{ ...btnSecondary, padding: '6px 14px', fontSize: 12 }}>{expanded ? 'Collapse ▲' : 'Review ▼'}</button>
          <button onClick={() => navigate(`/vendors/${vendor.id}`)} style={{ ...btnSecondary, padding: '6px 14px', fontSize: 12 }}>View Vendor</button>
        </div>
      </div>

      {/* Expanded review panel */}
      {expanded && (
        <div style={{ borderTop: '1px solid #F0F4F8', padding: '20px' }}>
          {loadingDetails ? (
            <div style={{ textAlign: 'center', color: '#aaa', padding: 20 }}>Loading...</div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
              {/* Left: Vendor Info + Edit */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Vendor Information</div>
                  {role === 'reviewer' && !editMode && (
                    <button onClick={startEdit} style={{ padding: '5px 12px', background: '#EEF5FF', color: NAVY, border: 'none', borderRadius: 5, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>✏ Correct Info</button>
                  )}
                </div>

                {editMode ? (
                  <div style={{ background: '#FFFBF0', border: '1px solid #F39C1240', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 12, color: '#F39C12', fontWeight: 600, marginBottom: 12 }}>✏ Editing vendor information — changes will be noted in the approval thread</div>
                    {[
                      ['name', 'Vendor Name', 'text'],
                      ['gstin', 'GSTIN', 'text'],
                      ['website', 'Website', 'text'],
                      ['vendor_type', 'Vendor Type', 'text'],
                    ].map(([k, l, t]) => (
                      <div key={k} style={{ marginBottom: 10 }}>
                        <label style={labelStyle}>{l}</label>
                        <input style={inputStyle} type={t} value={editForm[k] || ''} onChange={e => setEditForm(p => ({ ...p, [k]: e.target.value }))} />
                      </div>
                    ))}
                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>Tier</label>
                      <select style={inputStyle} value={editForm.tier || 'Tier 2'} onChange={e => setEditForm(p => ({ ...p, tier: e.target.value }))}>
                        <option>Tier 1</option><option>Tier 2</option><option>Tier 3</option>
                      </select>
                    </div>
                    <div style={{ marginBottom: 10 }}>
                      <label style={labelStyle}>Address</label>
                      <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={editForm.address || ''} onChange={e => setEditForm(p => ({ ...p, address: e.target.value }))} />
                    </div>
                    <div style={{ marginBottom: 12 }}>
                      <label style={labelStyle}>Summary</label>
                      <textarea style={{ ...inputStyle, minHeight: 60, resize: 'vertical' }} value={editForm.summary || ''} onChange={e => setEditForm(p => ({ ...p, summary: e.target.value }))} />
                    </div>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button style={btnSecondary} onClick={() => setEditMode(false)}>Cancel</button>
                      <button style={btnPrimary('#E67E22')} onClick={saveEdit} disabled={savingEdit}>{savingEdit ? 'Saving...' : 'Save Corrections'}</button>
                    </div>
                  </div>
                ) : details ? (
                  <div style={{ background: '#F8FAFC', borderRadius: 10, padding: 16 }}>
                    {[
                      ['Vendor Name', details.name],
                      ['Status', details.approval_status === 'approved' ? '✓ Approved' : details.approval_status === 'pending_review' ? '⏳ Pending' : '✗ Rejected'],
                      ['Submitted by', details.requester_name || details.requester_username],
                      ['Reviewer', details.reviewer_name || details.reviewer_username || 'Not assigned'],
                    ].map(([l, v]) => (
                      <div key={l} style={{ marginBottom: 8, display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                        <span style={{ color: '#888', fontWeight: 600 }}>{l}</span>
                        <span style={{ color: '#333' }}>{v || '—'}</span>
                      </div>
                    ))}
                  </div>
                ) : null}

                {/* Approval action (reviewer only, pending only) */}
                {role === 'reviewer' && vendor.approval_status === 'pending_review' && (
                  <div style={{ marginTop: 16, background: '#F8FAFC', borderRadius: 10, padding: 16 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Decision</div>
                    <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                      <button onClick={() => setReviewAction(reviewAction === 'approve' ? null : 'approve')} style={{ flex: 1, padding: '10px', border: `2px solid ${reviewAction === 'approve' ? '#27AE60' : '#DDE2E8'}`, borderRadius: 8, background: reviewAction === 'approve' ? '#F0FFF4' : '#fff', color: reviewAction === 'approve' ? '#27AE60' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all 0.15s' }}>
                        ✓ Approve
                      </button>
                      <button onClick={() => setReviewAction(reviewAction === 'reject' ? null : 'reject')} style={{ flex: 1, padding: '10px', border: `2px solid ${reviewAction === 'reject' ? '#E74C3C' : '#DDE2E8'}`, borderRadius: 8, background: reviewAction === 'reject' ? '#FFF5F5' : '#fff', color: reviewAction === 'reject' ? '#E74C3C' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 14, transition: 'all 0.15s' }}>
                        ✗ Reject
                      </button>
                    </div>
                    <textarea value={reviewNote} onChange={e => setReviewNote(e.target.value)} placeholder={reviewAction === 'reject' ? 'Reason for rejection (required)...' : 'Add a note for the requester (optional)...'} style={{ ...inputStyle, minHeight: 70, resize: 'vertical', fontFamily: 'inherit', marginBottom: 10 }} />
                    {reviewAction && (
                      <button onClick={submitReview} disabled={submitting || (reviewAction === 'reject' && !reviewNote.trim())} style={{ ...btnPrimary(reviewAction === 'approve' ? '#27AE60' : '#E74C3C'), width: '100%' }}>
                        {submitting ? 'Submitting...' : reviewAction === 'approve' ? '✓ Confirm Approval' : '✗ Confirm Rejection'}
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Right: Notes thread */}
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#888', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 12 }}>Comments & Notes</div>
                <NoteThread
                  notes={details?.notes || []}
                  onAddNote={addNote}
                  showAddNote={vendor.approval_status === 'pending_review'}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function Approvals() {
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({ pendingForMe: [], myPending: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('review');

  const load = () => {
    setLoading(true);
    api.get('/api/approvals/pending').then(setData).catch(() => {}).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const pendingCount = data.pendingForMe.length;
  const myCount = data.myPending.length;

  return (
    <Layout title="Approvals">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 22, color: NAVY, margin: 0 }}>Vendor Approvals</h2>
        <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Review vendor submissions and track your own approval requests.</p>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, background: '#F5F6FA', borderRadius: 10, padding: 4, width: 'fit-content' }}>
        <button onClick={() => setTab('review')} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === 'review' ? 700 : 400, background: tab === 'review' ? '#fff' : 'transparent', color: tab === 'review' ? NAVY : '#666', boxShadow: tab === 'review' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          Pending My Review
          {pendingCount > 0 && <span style={{ background: '#E74C3C', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{pendingCount}</span>}
        </button>
        <button onClick={() => setTab('mine')} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: tab === 'mine' ? 700 : 400, background: tab === 'mine' ? '#fff' : 'transparent', color: tab === 'mine' ? NAVY : '#666', boxShadow: tab === 'mine' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none', display: 'flex', alignItems: 'center', gap: 6 }}>
          My Submissions
          {myCount > 0 && <span style={{ background: '#F39C12', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{myCount}</span>}
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading...</div>
      ) : tab === 'review' ? (
        <div>
          {data.pendingForMe.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: 12, padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>🎉</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: NAVY }}>All caught up!</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>No vendor submissions are waiting for your review.</div>
            </div>
          ) : (
            data.pendingForMe.map(v => <VendorReviewCard key={v.id} vendor={v} role="reviewer" onRefresh={load} />)
          )}
        </div>
      ) : (
        <div>
          {data.myPending.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: 12, padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 40, marginBottom: 10 }}>✅</div>
              <div style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: NAVY }}>No pending submissions</div>
              <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>All your vendor submissions have been processed.</div>
            </div>
          ) : (
            <div>
              <div style={{ background: '#EEF9FF', border: '1px solid #29ABE240', borderRadius: 10, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: NAVY }}>
                ℹ️ You can add notes to your submissions below to provide additional context for your manager.
              </div>
              {data.myPending.map(v => <VendorReviewCard key={v.id} vendor={v} role="requester" onRefresh={load} />)}
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}
