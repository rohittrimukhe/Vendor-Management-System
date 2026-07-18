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
  // C-4: Validate days as integer in safe range; use parameterized query
  // M-6/M-14: Enforce minimum 30-day retention
  const raw = parseInt(req.body.days, 10);
  if (!Number.isFinite(raw) || raw < 30 || raw > 3650) {
    return res.status(400).json({ error: 'days must be an integer between 30 and 3650' });
  }
  // SQLite date modifier requires string concatenation but we've already validated raw as a safe integer
  db.prepare("DELETE FROM audit_log WHERE created_at < date('now', '-' || ? || ' days')").run(String(raw));
  res.json({ data: { success: true } });
});

module.exports = router;
