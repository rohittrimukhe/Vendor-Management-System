const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', (req, res) => {
  const vid = req.params.vendorId;
  const events = [];

  // Contracts
  db.prepare('SELECT id, type, status, value, start_date, end_date, created_at FROM contracts WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 30').all(vid)
    .forEach(r => events.push({ type: 'contract', icon: '📄', color: '#29ABE2', title: `Contract added: ${r.type || 'Contract'}`, detail: `Status: ${r.status}${r.value ? ' • ₹' + Number(r.value).toLocaleString('en-IN') : ''}`, date: r.created_at, id: `contract-${r.id}` }));

  // Documents
  db.prepare('SELECT id, name, category, uploaded_by, uploaded_at FROM documents WHERE vendor_id = ? ORDER BY uploaded_at DESC LIMIT 20').all(vid)
    .forEach(r => events.push({ type: 'document', icon: '📁', color: '#8E44AD', title: `Document uploaded: ${r.name}`, detail: `${r.category || 'Other'} • by ${r.uploaded_by || '—'}`, date: r.uploaded_at, id: `doc-${r.id}` }));

  // Performance reviews
  db.prepare('SELECT id, rating, reviewed_by, reviewed_at FROM performance_reviews WHERE vendor_id = ? ORDER BY reviewed_at DESC LIMIT 20').all(vid)
    .forEach(r => events.push({ type: 'review', icon: '⭐', color: '#F39C12', title: `Performance review: ${r.rating}/5 stars`, detail: `Reviewed by ${r.reviewed_by || '—'}`, date: r.reviewed_at, id: `review-${r.id}` }));

  // Notes
  db.prepare('SELECT id, content, created_by, created_at FROM vendor_notes WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 20').all(vid)
    .forEach(r => events.push({ type: 'note', icon: '📝', color: '#16A085', title: `Note added`, detail: r.content.length > 80 ? r.content.slice(0, 80) + '...' : r.content, date: r.created_at, id: `note-${r.id}` }));

  // Tasks
  db.prepare('SELECT id, title, status, priority, created_by, created_at, completed_at FROM vendor_tasks WHERE vendor_id = ? ORDER BY created_at DESC LIMIT 20').all(vid)
    .forEach(r => {
      events.push({ type: 'task', icon: '✅', color: '#27AE60', title: `Task created: ${r.title}`, detail: `Priority: ${r.priority} • ${r.created_by || '—'}`, date: r.created_at, id: `task-${r.id}-c` });
      if (r.completed_at) events.push({ type: 'task_done', icon: '✔', color: '#27AE60', title: `Task completed: ${r.title}`, detail: '', date: r.completed_at, id: `task-${r.id}-d` });
    });

  // Onboarding stage changes
  db.prepare('SELECT id, stage, status, updated_at FROM vendor_onboarding WHERE vendor_id = ? AND status != ? ORDER BY updated_at DESC LIMIT 20').all(vid, 'Pending')
    .forEach(r => events.push({ type: 'onboarding', icon: '🔄', color: r.status === 'Approved' ? '#27AE60' : r.status === 'Rejected' ? '#E74C3C' : '#F39C12', title: `Onboarding: ${r.stage} → ${r.status}`, detail: '', date: r.updated_at, id: `ob-${r.id}` }));

  // Certifications
  db.prepare(`SELECT c.id, c.name, c.expiry, c.is_valid FROM certifications c WHERE c.vendor_id = ? ORDER BY c.id DESC LIMIT 10`).all(vid)
    .forEach(r => events.push({ type: 'cert', icon: '🏅', color: r.is_valid ? '#27AE60' : '#E74C3C', title: `Certification: ${r.name}`, detail: `Expiry: ${r.expiry || 'N/A'} • ${r.is_valid ? 'Valid' : 'Expired'}`, date: null, id: `cert-${r.id}` }));

  // Audit log entries for this vendor
  db.prepare('SELECT id, action, username, details, created_at FROM audit_log WHERE entity_type=? AND entity_id=? ORDER BY created_at DESC LIMIT 30').all('Vendor', vid)
    .forEach(r => events.push({ type: 'audit', icon: '🔍', color: '#888', title: `${r.action}: by ${r.username || '—'}`, detail: r.details || '', date: r.created_at, id: `audit-${r.id}` }));

  // Sort by date descending
  events.sort((a, b) => {
    if (!a.date && !b.date) return 0;
    if (!a.date) return 1;
    if (!b.date) return -1;
    return new Date(b.date) - new Date(a.date);
  });

  res.json({ data: events.slice(0, 100) });
});

module.exports = router;
