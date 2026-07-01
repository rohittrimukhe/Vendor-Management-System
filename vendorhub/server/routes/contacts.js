const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', requirePermission('Vendors', 'Read'), (req, res) => {
  const rows = db.prepare('SELECT * FROM contacts WHERE vendor_id = ?').all(req.params.vendorId);
  res.json({ data: rows });
});

router.post('/', requirePermission('Vendors', 'Edit'), (req, res) => {
  const { name, role, email, phone } = req.body;
  const result = db.prepare('INSERT INTO contacts (vendor_id, name, role, email, phone) VALUES (?, ?, ?, ?, ?)').run(req.params.vendorId, name, role, email, phone);
  res.status(201).json({ data: db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/:contactId', requirePermission('Vendors', 'Edit'), (req, res) => {
  const { name, role, email, phone } = req.body;
  db.prepare('UPDATE contacts SET name=?, role=?, email=?, phone=? WHERE id=? AND vendor_id=?').run(name, role, email, phone, req.params.contactId, req.params.vendorId);
  res.json({ data: db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.contactId) });
});

router.delete('/:contactId', requirePermission('Vendors', 'Full'), (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ? AND vendor_id = ?').run(req.params.contactId, req.params.vendorId);
  res.json({ data: { success: true } });
});

module.exports = router;
