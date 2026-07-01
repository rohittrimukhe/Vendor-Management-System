const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare("SELECT key, value FROM settings WHERE key NOT IN ('session_secret','initialized')").all();
  res.json({ data: rows });
});

router.put('/', (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  res.json({ data: { key, value } });
});

router.put('/bulk', (req, res) => {
  const { settings } = req.body; // array of {key, value}
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  const doIt = db.transaction(() => {
    for (const s of settings) upsert.run(s.key, s.value);
  });
  doIt();
  res.json({ data: { success: true } });
});

module.exports = router;
