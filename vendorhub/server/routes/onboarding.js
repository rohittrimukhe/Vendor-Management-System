const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const router = express.Router({ mergeParams: true });

router.use(requireAuth);

const DEFAULT_STAGES = [
  { stage: 'Document Collection', sort_order: 0 },
  { stage: 'Due Diligence', sort_order: 1 },
  { stage: 'Legal Review', sort_order: 2 },
  { stage: 'Finance Approval', sort_order: 3 },
  { stage: 'IT Security Review', sort_order: 4 },
  { stage: 'Final Approval', sort_order: 5 },
];

router.get('/', (req, res) => {
  let rows = db.prepare('SELECT * FROM vendor_onboarding WHERE vendor_id = ? ORDER BY sort_order, id').all(req.params.vendorId);
  // Auto-initialise stages if none exist
  if (!rows.length) {
    const insert = db.prepare('INSERT INTO vendor_onboarding (vendor_id, stage, status, sort_order) VALUES (?, ?, ?, ?)');
    db.transaction(() => {
      DEFAULT_STAGES.forEach(s => insert.run(req.params.vendorId, s.stage, 'Pending', s.sort_order));
    })();
    rows = db.prepare('SELECT * FROM vendor_onboarding WHERE vendor_id = ? ORDER BY sort_order, id').all(req.params.vendorId);
  }
  res.json({ data: rows });
});

router.put('/:stageId', requirePermission('Vendors', 'Edit'), (req, res) => {
  const row = db.prepare('SELECT * FROM vendor_onboarding WHERE id = ? AND vendor_id = ?').get(req.params.stageId, req.params.vendorId);
  if (!row) return res.status(404).json({ error: 'Stage not found' });
  const { status, assigned_to, notes } = req.body;
  db.prepare('UPDATE vendor_onboarding SET status=?, assigned_to=?, notes=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(status ?? row.status, assigned_to ?? row.assigned_to, notes ?? row.notes, req.params.stageId);
  res.json({ data: db.prepare('SELECT * FROM vendor_onboarding WHERE id = ?').get(req.params.stageId) });
});

router.post('/', requirePermission('Vendors', 'Edit'), (req, res) => {
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
  const { stage, status, assigned_to, notes } = req.body;
  if (!stage) return res.status(400).json({ error: 'Stage name required' });
  const count = db.prepare('SELECT COUNT(*) as c FROM vendor_onboarding WHERE vendor_id = ?').get(req.params.vendorId).c;
  const r = db.prepare('INSERT INTO vendor_onboarding (vendor_id, stage, status, assigned_to, notes, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .run(req.params.vendorId, stage, status || 'Pending', assigned_to || null, notes || null, count, user?.username || 'system');
  res.status(201).json({ data: db.prepare('SELECT * FROM vendor_onboarding WHERE id = ?').get(r.lastInsertRowid) });
});

router.delete('/:stageId', requirePermission('Vendors', 'Full'), (req, res) => {
  db.prepare('DELETE FROM vendor_onboarding WHERE id = ? AND vendor_id = ?').run(req.params.stageId, req.params.vendorId);
  res.json({ data: { success: true } });
});

module.exports = router;
