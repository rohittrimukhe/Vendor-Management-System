const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const router = express.Router();

router.use(requireAuth);

// Admin: manage field definitions
router.get('/definitions', (req, res) => {
  const rows = db.prepare('SELECT * FROM custom_field_definitions ORDER BY sort_order, id').all();
  res.json({ data: rows });
});

router.post('/definitions', requireAdmin, (req, res) => {
  const { name, field_type, applies_to, options, required } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const count = db.prepare('SELECT COUNT(*) as c FROM custom_field_definitions').get().c;
  const r = db.prepare('INSERT INTO custom_field_definitions (name, field_type, applies_to, options, required, sort_order) VALUES (?, ?, ?, ?, ?, ?)')
    .run(name, field_type || 'text', applies_to || 'all', options ? JSON.stringify(options) : null, required ? 1 : 0, count);
  res.status(201).json({ data: db.prepare('SELECT * FROM custom_field_definitions WHERE id = ?').get(r.lastInsertRowid) });
});

router.put('/definitions/:id', requireAdmin, (req, res) => {
  const row = db.prepare('SELECT * FROM custom_field_definitions WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ error: 'Not found' });
  const { name, field_type, applies_to, options, required, sort_order } = req.body;
  db.prepare('UPDATE custom_field_definitions SET name=?, field_type=?, applies_to=?, options=?, required=?, sort_order=? WHERE id=?')
    .run(name || row.name, field_type || row.field_type, applies_to || row.applies_to,
      options !== undefined ? JSON.stringify(options) : row.options,
      required !== undefined ? (required ? 1 : 0) : row.required,
      sort_order ?? row.sort_order, req.params.id);
  res.json({ data: db.prepare('SELECT * FROM custom_field_definitions WHERE id = ?').get(req.params.id) });
});

router.delete('/definitions/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM vendor_custom_fields WHERE field_def_id = ?').run(req.params.id);
  db.prepare('DELETE FROM custom_field_definitions WHERE id = ?').run(req.params.id);
  res.json({ data: { success: true } });
});

// Vendor-specific field values
router.get('/vendor/:vendorId', (req, res) => {
  const vendor = db.prepare('SELECT vendor_type FROM vendors WHERE id = ?').get(req.params.vendorId);
  const vendorType = vendor?.vendor_type || 'all';
  const defs = db.prepare(`SELECT * FROM custom_field_definitions WHERE applies_to='all' OR applies_to=? ORDER BY sort_order, id`).all(vendorType);
  const values = db.prepare('SELECT * FROM vendor_custom_fields WHERE vendor_id = ?').all(req.params.vendorId);
  const valMap = {};
  values.forEach(v => { valMap[v.field_def_id] = v.value; });
  const result = defs.map(d => ({ ...d, options: d.options ? JSON.parse(d.options) : null, value: valMap[d.id] ?? '' }));
  res.json({ data: result });
});

router.post('/vendor/:vendorId', (req, res) => {
  const { fields } = req.body; // [{ field_def_id, value }]
  if (!Array.isArray(fields)) return res.status(400).json({ error: 'fields array required' });
  const upsert = db.prepare(`
    INSERT INTO vendor_custom_fields (vendor_id, field_def_id, value)
    VALUES (?, ?, ?)
    ON CONFLICT(vendor_id, field_def_id) DO UPDATE SET value=excluded.value
  `);
  db.transaction(() => {
    fields.forEach(f => upsert.run(req.params.vendorId, f.field_def_id, f.value ?? ''));
  })();
  res.json({ data: { success: true } });
});

module.exports = router;
