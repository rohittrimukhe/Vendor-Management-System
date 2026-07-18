const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { auditLog } = require('../middleware/audit');
const router = express.Router({ mergeParams: true });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.use(requireAuth);

router.get('/', requirePermission('Vendors', 'Read'), (req, res) => {
  const rows = db.prepare('SELECT * FROM contacts WHERE vendor_id = ?').all(req.params.vendorId);
  res.json({ data: rows });
});

router.post('/', requirePermission('Vendors', 'Edit'), auditLog('Contact', 'CREATE', (req, resBody) => resBody?.data?.id), (req, res) => {
  const { name, role, email, phone } = req.body;
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email address' });
  const result = db.prepare('INSERT INTO contacts (vendor_id, name, role, email, phone) VALUES (?, ?, ?, ?, ?)').run(req.params.vendorId, name, role, email || null, phone || null);
  res.status(201).json({ data: db.prepare('SELECT * FROM contacts WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/:contactId', requirePermission('Vendors', 'Edit'), auditLog('Contact', 'UPDATE', (req) => req.params.contactId), (req, res) => {
  const { name, role, email, phone } = req.body;
  if (email && !EMAIL_RE.test(email)) return res.status(400).json({ error: 'Invalid email address' });
  db.prepare('UPDATE contacts SET name=?, role=?, email=?, phone=? WHERE id=? AND vendor_id=?').run(name, role, email || null, phone || null, req.params.contactId, req.params.vendorId);
  res.json({ data: db.prepare('SELECT * FROM contacts WHERE id = ?').get(req.params.contactId) });
});

router.delete('/:contactId', requirePermission('Vendors', 'Full'), auditLog('Contact', 'DELETE', (req) => req.params.contactId), (req, res) => {
  db.prepare('DELETE FROM contacts WHERE id = ? AND vendor_id = ?').run(req.params.contactId, req.params.vendorId);
  res.json({ data: { success: true } });
});

module.exports = router;
