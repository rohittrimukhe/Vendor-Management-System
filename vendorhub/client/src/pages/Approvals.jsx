import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout.jsx';
import api from '../api.js';
import { AuthContext } from '../App.jsx';

const NAVY = '#1C3C6E';
const btnPrimary = { padding: '8px 18px', background: NAVY, color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600 };
const btnSecondary = { padding: '8px 18px', border: '1px solid #DDE2E8', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 13, color: '#555' };

const STATUS_STYLE = {
  approved: { color: '#27AE60', bg: '#F0FFF4', label: 'Approved' },
  pending_review: { color: '#F39C12', bg: '#FFFBF0', label: 'Pending Review' },
  rejected: { color: '#E74C3C', bg: '#FFF5F5', label: 'Rejected' },
};

function VendorAvatar({ vendor }) {
  return (
    <div style={{ width: 40, height: 40, borderRadius: 10, background: vendor.logo_color || NAVY, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, flexShrink: 0 }}>
      {vendor.logo_initial || vendor.name?.[0]}
    </div>
  );
}

function ReviewModal({ vendor, onClose, onDone }) {
  const [action, setAction] = useState('approve');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    setSaving(true);
    try {
      await api.post(`/api/vendors/${vendor.id}/approval/review`, { action, note });
      onDone();
      onClose();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 440, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 16, margin: 0 }}>Review Vendor</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 20, color: '#888' }}>✕</span>
        </div>
        <div style={{ fontWeight: 600, fontSize: 14, color: '#333', marginBottom: 16 }}>{vendor.name}</div>
        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button onClick={() => setAction('approve')} style={{ flex: 1, padding: '10px', border: `2px solid ${action === 'approve' ? '#27AE60' : '#DDE2E8'}`, borderRadius: 8, background: action === 'approve' ? '#F0FFF4' : '#fff', color: action === 'approve' ? '#27AE60' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            ✓ Approve
          </button>
          <button onClick={() => setAction('reject')} style={{ flex: 1, padding: '10px', border: `2px solid ${action === 'reject' ? '#E74C3C' : '#DDE2E8'}`, borderRadius: 8, background: action === 'reject' ? '#FFF5F5' : '#fff', color: action === 'reject' ? '#E74C3C' : '#555', cursor: 'pointer', fontWeight: 600, fontSize: 14 }}>
            ✗ Reject
          </button>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#444', marginBottom: 4 }}>Note (optional)</label>
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note for the requester..." style={{ width: '100%', padding: '9px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 80, boxSizing: 'border-box', fontFamily: 'inherit' }} />
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={onClose}>Cancel</button>
          <button style={{ ...btnPrimary, background: action === 'approve' ? '#27AE60' : '#E74C3C' }} onClick={submit} disabled={saving}>
            {saving ? 'Saving...' : action === 'approve' ? 'Approve' : 'Reject'}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddNoteModal({ vendorId, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!note.trim()) return;
    setSaving(true);
    try {
      await api.post(`/api/vendors/${vendorId}/approval/note`, { note });
      onDone();
      onClose();
    } catch (e) { alert(e.message); }
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 12, padding: 28, width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h3 style={{ fontFamily: 'Montserrat', color: NAVY, fontSize: 16, margin: 0 }}>Add Note</h3>
          <span onClick={onClose} style={{ cursor: 'pointer', fontSize: 20, color: '#888' }}>✕</span>
        </div>
        <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Add a note to this approval thread..." autoFocus style={{ width: '100%', padding: '10px 12px', border: '1px solid #DDE2E8', borderRadius: 6, fontSize: 13, outline: 'none', resize: 'vertical', minHeight: 100, boxSizing: 'border-box', fontFamily: 'inherit', marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button style={btnSecondary} onClick={onClose}>Cancel</button>
          <button style={btnPrimary} onClick={submit} disabled={saving || !note.trim()}>{saving ? 'Posting...' : 'Post Note'}</button>
        </div>
      </div>
    </div>
  );
}

export default function Approvals() {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const [data, setData] = useState({ pendingForMe: [], myPending: [] });
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);
  const [noteModal, setNoteModal] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [approvalDetails, setApprovalDetails] = useState({});

  const load = () => api.get('/api/approvals/pending').then(setData).catch(() => {}).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const loadApprovalDetails = async (vendorId) => {
    if (approvalDetails[vendorId]) return;
    const d = await api.get(`/api/vendors/${vendorId}/approval`).catch(() => null);
    if (d) setApprovalDetails(prev => ({ ...prev, [vendorId]: d }));
  };

  const toggleNotes = (vendorId) => {
    setExpandedNotes(prev => ({ ...prev, [vendorId]: !prev[vendorId] }));
    if (!expandedNotes[vendorId]) loadApprovalDetails(vendorId);
  };

  const renderVendorCard = (v, role) => {
    const st = STATUS_STYLE[v.approval_status] || STATUS_STYLE.pending_review;
    const isExpanded = expandedNotes[v.id];
    const details = approvalDetails[v.id];
    return (
      <div key={v.id} style={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: 12, padding: 20, marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <VendorAvatar vendor={v} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: NAVY, cursor: 'pointer' }} onClick={() => navigate(`/vendors/${v.id}`)}>
              {v.name}
            </div>
            <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
              {role === 'reviewer' ? `Requested by: ${v.requester_name || v.requester_username}` : `Reviewer: ${v.reviewer_name || v.reviewer_username || 'Not assigned'}`}
              {' • '}{new Date(v.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: st.color, background: st.bg }}>{st.label}</span>
            <button onClick={() => toggleNotes(v.id)} style={{ ...btnSecondary, padding: '6px 14px', fontSize: 12 }}>
              {isExpanded ? 'Hide Notes' : 'View Notes'}
            </button>
            {role === 'reviewer' && v.approval_status === 'pending_review' && (
              <button onClick={() => setReviewModal(v)} style={{ ...btnPrimary, padding: '6px 14px', fontSize: 12 }}>Review</button>
            )}
            {role === 'requester' && (
              <button onClick={() => setNoteModal(v.id)} style={{ ...btnSecondary, padding: '6px 14px', fontSize: 12 }}>+ Note</button>
            )}
          </div>
        </div>

        {isExpanded && (
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #F0F4F8' }}>
            {!details ? (
              <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center' }}>Loading...</div>
            ) : details.notes.length === 0 ? (
              <div style={{ color: '#aaa', fontSize: 13, textAlign: 'center' }}>No notes yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {details.notes.map(n => (
                  <div key={n.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: n.role === 'reviewer' ? '#27AE60' : n.role === 'requester' ? NAVY : '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                      {n.username?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div style={{ flex: 1, background: '#F8FAFC', borderRadius: 8, padding: '10px 14px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: NAVY }}>{n.username} <span style={{ color: '#888', fontWeight: 400 }}>({n.role})</span></span>
                        <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(n.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: 13, color: '#444', lineHeight: 1.5 }}>{n.note}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {role === 'reviewer' && v.approval_status === 'pending_review' && (
              <div style={{ marginTop: 10, display: 'flex', justifyContent: 'flex-end' }}>
                <button onClick={() => setNoteModal(v.id)} style={{ ...btnSecondary, fontSize: 12 }}>+ Add Note</button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Layout title="Approvals">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 22, color: NAVY, margin: 0 }}>Vendor Approvals</h2>
        <p style={{ color: '#666', fontSize: 13, marginTop: 4 }}>Track vendor submissions pending review and manage your own approval requests.</p>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#888' }}>Loading...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: data.pendingForMe.length > 0 ? '1fr 1fr' : '1fr', gap: 24, alignItems: 'start' }}>
          {data.pendingForMe.length > 0 && (
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                <h3 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: NAVY, margin: 0 }}>Pending Your Review</h3>
                <span style={{ background: '#E74C3C', color: '#fff', borderRadius: 12, padding: '2px 8px', fontSize: 12, fontWeight: 700 }}>{data.pendingForMe.length}</span>
              </div>
              {data.pendingForMe.map(v => renderVendorCard(v, 'reviewer'))}
            </div>
          )}

          <div>
            <div style={{ marginBottom: 16 }}>
              <h3 style={{ fontFamily: 'Montserrat', fontWeight: 700, fontSize: 16, color: NAVY, margin: 0 }}>My Submissions</h3>
            </div>
            {data.myPending.length === 0 ? (
              <div style={{ background: '#fff', border: '1px solid #E8ECF0', borderRadius: 12, padding: 40, textAlign: 'center' }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>✅</div>
                <div style={{ fontSize: 14, color: '#555', fontWeight: 600 }}>No pending submissions</div>
                <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>All your vendor submissions have been processed.</div>
              </div>
            ) : (
              data.myPending.map(v => renderVendorCard(v, 'requester'))
            )}
          </div>
        </div>
      )}

      {reviewModal && <ReviewModal vendor={reviewModal} onClose={() => setReviewModal(null)} onDone={() => { load(); setApprovalDetails(prev => { const n = { ...prev }; delete n[reviewModal.id]; return n; }); }} />}
      {noteModal && <AddNoteModal vendorId={noteModal} onClose={() => setNoteModal(null)} onDone={() => { loadApprovalDetails(noteModal); setApprovalDetails(prev => { const n = { ...prev }; delete n[noteModal]; return n; }); load(); }} />}
    </Layout>
  );
}
