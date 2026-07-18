const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', requirePermission('Vendors', 'Read'), (req, res) => {
  const rows = db.prepare('SELECT * FROM performance_reviews WHERE vendor_id = ? ORDER BY reviewed_at DESC').all(req.params.vendorId);
  const avg = db.prepare('SELECT AVG(rating) as avg_rating, AVG(on_time_delivery) as avg_otd, AVG(support_quality) as avg_sq, AVG(price_competitiveness) as avg_pc FROM performance_reviews WHERE vendor_id = ?').get(req.params.vendorId);
  res.json({ data: { reviews: rows, averages: avg } });
});

router.post('/', requirePermission('Vendors', 'Edit'), (req, res) => {
  const { rating, on_time_delivery, support_quality, price_competitiveness, notes } = req.body;
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
  const result = db.prepare('INSERT INTO performance_reviews (vendor_id, rating, on_time_delivery, support_quality, price_competitiveness, notes, reviewed_by) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    req.params.vendorId, rating, on_time_delivery, support_quality, price_competitiveness, notes, user ? user.username : 'admin'
  );
  res.status(201).json({ data: db.prepare('SELECT * FROM performance_reviews WHERE id = ?').get(result.lastInsertRowid) });
});

router.delete('/:reviewId', requirePermission('Vendors', 'Full'), (req, res) => {
  db.prepare('DELETE FROM performance_reviews WHERE id = ? AND vendor_id = ?').run(req.params.reviewId, req.params.vendorId);
  res.json({ data: { success: true } });
});

// Escalation matrix under performance routes for simplicity
router.get('/escalation', requirePermission('Vendors', 'Read'), (req, res) => {
  const rows = db.prepare('SELECT * FROM escalation_matrix WHERE vendor_id = ? ORDER BY sort_order ASC').all(req.params.vendorId);
  res.json({ data: rows });
});

router.post('/escalation', requirePermission('Vendors', 'Edit'), (req, res) => {
  const { level, name, contact, phone, sort_order } = req.body;
  const result = db.prepare('INSERT INTO escalation_matrix (vendor_id, level, name, contact, phone, sort_order) VALUES (?, ?, ?, ?, ?, ?)').run(req.params.vendorId, level, name, contact, phone, sort_order || 0);
  res.status(201).json({ data: db.prepare('SELECT * FROM escalation_matrix WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/escalation/:escId', requirePermission('Vendors', 'Edit'), (req, res) => {
  const { level, name, contact, phone, sort_order } = req.body;
  db.prepare('UPDATE escalation_matrix SET level=?, name=?, contact=?, phone=?, sort_order=? WHERE id=? AND vendor_id=?').run(level, name, contact, phone, sort_order || 0, req.params.escId, req.params.vendorId);
  res.json({ data: db.prepare('SELECT * FROM escalation_matrix WHERE id = ?').get(req.params.escId) });
});

router.delete('/escalation/:escId', requirePermission('Vendors', 'Full'), (req, res) => {
  db.prepare('DELETE FROM escalation_matrix WHERE id = ? AND vendor_id = ?').run(req.params.escId, req.params.vendorId);
  res.json({ data: { success: true } });
});

module.exports = router;
