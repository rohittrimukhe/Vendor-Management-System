const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requireAdmin, requirePermission } = require('../middleware/permissions');
const router = express.Router();

router.use(requireAuth);

// Criteria management (admin)
router.get('/criteria', (req, res) => {
  const rows = db.prepare('SELECT * FROM scoring_criteria ORDER BY sort_order, id').all();
  const totalWeight = rows.reduce((s, r) => s + r.weight, 0);
  res.json({ data: rows, totalWeight });
});

router.post('/criteria', requireAdmin, (req, res) => {
  const { name, weight, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const count = db.prepare('SELECT COUNT(*) as c FROM scoring_criteria').get().c;
  const r = db.prepare('INSERT INTO scoring_criteria (name, weight, description, sort_order) VALUES (?, ?, ?, ?)')
    .run(name, weight || 20, description || null, count);
  res.status(201).json({ data: db.prepare('SELECT * FROM scoring_criteria WHERE id = ?').get(r.lastInsertRowid) });
});

router.put('/criteria/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM scoring_criteria WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { name, weight, description, sort_order } = req.body;
  db.prepare('UPDATE scoring_criteria SET name=?, weight=?, description=?, sort_order=? WHERE id=?')
    .run(name || row.name, weight ?? row.weight, description ?? row.description, sort_order ?? row.sort_order, req.params.id);
  res.json({ data: db.prepare('SELECT * FROM scoring_criteria WHERE id = ?').get(req.params.id) });
});

router.delete('/criteria/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM vendor_scores WHERE criteria_id = ?').run(req.params.id);
  db.prepare('DELETE FROM scoring_criteria WHERE id = ?').run(req.params.id);
  res.json({ data: { success: true } });
});

// Vendor scores
router.get('/vendors/:vendorId', (req, res) => {
  const criteria = db.prepare('SELECT * FROM scoring_criteria ORDER BY sort_order, id').all();
  const scores = db.prepare('SELECT * FROM vendor_scores WHERE vendor_id = ?').all(req.params.vendorId);
  const scoreMap = {};
  scores.forEach(s => { scoreMap[s.criteria_id] = s; });

  const totalWeight = criteria.reduce((s, c) => s + c.weight, 0);
  let weightedTotal = 0;
  const result = criteria.map(c => {
    const s = scoreMap[c.id];
    const score = s ? s.score : null;
    if (score !== null && totalWeight > 0) {
      weightedTotal += (score / 100) * c.weight;
    }
    return { ...c, score, notes: s?.notes || null, scored_by: s?.scored_by || null, scored_at: s?.scored_at || null };
  });

  const compositeScore = totalWeight > 0 ? Math.round((weightedTotal / totalWeight) * 100) : null;
  res.json({ data: result, compositeScore, totalWeight });
});

router.post('/vendors/:vendorId', requirePermission('Vendors', 'Edit'), (req, res) => {
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
  const { scores } = req.body; // [{ criteria_id, score, notes }]
  if (!Array.isArray(scores)) return res.status(400).json({ error: 'scores array required' });

  const upsert = db.prepare(`
    INSERT INTO vendor_scores (vendor_id, criteria_id, score, notes, scored_by, scored_by_id, scored_at)
    VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(vendor_id, criteria_id) DO UPDATE SET score=excluded.score, notes=excluded.notes, scored_by=excluded.scored_by, scored_by_id=excluded.scored_by_id, scored_at=CURRENT_TIMESTAMP
  `);

  db.transaction(() => {
    scores.forEach(s => {
      upsert.run(req.params.vendorId, s.criteria_id, s.score, s.notes || null, user?.username || 'system', req.session.userId);
    });
  })();

  res.json({ data: { success: true } });
});

module.exports = router;
