const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const router = express.Router();

router.use(requireAuth);

// Any authenticated user can read public settings
router.get('/', (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key NOT IN ('session_secret','initialized')").all();
  res.json({ data: rows });
});

// Only admins can change settings
router.put('/', requireAdmin, (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  res.json({ data: { key, value } });
});

router.put('/bulk', requireAdmin, (req, res) => {
  const { settings } = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const doIt = db.transaction(() => {
    for (const s of settings) upsert.run(s.key, s.value);
  });
  doIt();
  res.json({ data: { success: true } });
});

module.exports = router;
