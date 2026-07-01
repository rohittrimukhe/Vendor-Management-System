const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM contracts WHERE vendor_id = ? ORDER BY start_date DESC').all(req.params.vendorId);
  res.json({ data: rows });
});

router.post('/', (req, res) => {
  const { type, start_date, end_date, value, sla, status } = req.body;
  const result = db.prepare('INSERT INTO contracts (vendor_id, type, start_date, end_date, value, sla, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    req.params.vendorId, type, start_date, end_date, value || null, sla || null, status || 'Active'
  );
  res.status(201).json({ data: db.prepare('SELECT * FROM contracts WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/:contractId', (req, res) => {
  const { type, start_date, end_date, value, sla, status } = req.body;
  db.prepare('UPDATE contracts SET type=?, start_date=?, end_date=?, value=?, sla=?, status=? WHERE id=? AND vendor_id=?').run(type, start_date, end_date, value || null, sla || null, status || 'Active', req.params.contractId, req.params.vendorId);
  res.json({ data: db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.contractId) });
});

router.delete('/:contractId', (req, res) => {
  db.prepare('DELETE FROM contracts WHERE id = ? AND vendor_id = ?').run(req.params.contractId, req.params.vendorId);
  res.json({ data: { success: true } });
});

module.exports = router;
