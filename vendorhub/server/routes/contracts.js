const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { auditLog } = require('../middleware/audit');
const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', requirePermission('Vendors', 'Read'), (req, res) => {
  const rows = db.prepare('SELECT * FROM contracts WHERE vendor_id = ? ORDER BY start_date DESC').all(req.params.vendorId);
  res.json({ data: rows });
});

router.post('/', requirePermission('Vendors', 'Edit'), auditLog('Contract', 'CREATE', (req, resBody) => resBody?.data?.id), (req, res) => {
  const { type, start_date, end_date, value, sla, status } = req.body;
  // M-17: Validate value as numeric
  const numericValue = value !== undefined && value !== '' ? parseFloat(value) : null;
  if (numericValue !== null && !Number.isFinite(numericValue)) return res.status(400).json({ error: 'Contract value must be a number' });
  const result = db.prepare('INSERT INTO contracts (vendor_id, type, start_date, end_date, value, sla, status) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
    req.params.vendorId, type, start_date, end_date, numericValue, sla || null, status || 'Active'
  );
  res.status(201).json({ data: db.prepare('SELECT * FROM contracts WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/:contractId', requirePermission('Vendors', 'Edit'), auditLog('Contract', 'UPDATE', (req) => req.params.contractId), (req, res) => {
  const { type, start_date, end_date, value, sla, status } = req.body;
  const numericValue = value !== undefined && value !== '' ? parseFloat(value) : null;
  if (numericValue !== null && !Number.isFinite(numericValue)) return res.status(400).json({ error: 'Contract value must be a number' });
  db.prepare('UPDATE contracts SET type=?, start_date=?, end_date=?, value=?, sla=?, status=? WHERE id=? AND vendor_id=?').run(type, start_date, end_date, numericValue, sla || null, status || 'Active', req.params.contractId, req.params.vendorId);
  res.json({ data: db.prepare('SELECT * FROM contracts WHERE id = ?').get(req.params.contractId) });
});

router.delete('/:contractId', requirePermission('Vendors', 'Full'), auditLog('Contract', 'DELETE', (req) => req.params.contractId), (req, res) => {
  db.prepare('DELETE FROM contracts WHERE id = ? AND vendor_id = ?').run(req.params.contractId, req.params.vendorId);
  res.json({ data: { success: true } });
});

module.exports = router;
