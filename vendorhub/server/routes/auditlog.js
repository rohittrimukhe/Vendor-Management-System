const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', (req, res) => {
  const { entity_type, username, action, limit = 100, offset = 0 } = req.query;
  let sql = 'SELECT * FROM audit_log WHERE 1=1';
  const params = [];
  if (entity_type) { sql += ' AND entity_type = ?'; params.push(entity_type); }
  if (username) { sql += ' AND username LIKE ?'; params.push(`%${username}%`); }
  if (action) { sql += ' AND action = ?'; params.push(action); }
  sql += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), parseInt(offset));
  const rows = db.prepare(sql).all(...params);
  const total = db.prepare('SELECT COUNT(*) as c FROM audit_log').get().c;
  res.json({ data: rows, total });
});

router.delete('/clear', (req, res) => {
  const { days = 90 } = req.body;
  db.prepare(`DELETE FROM audit_log WHERE created_at < date('now', '-${parseInt(days)} days')`).run();
  res.json({ data: { success: true } });
});

module.exports = router;
