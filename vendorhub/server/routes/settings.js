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

router.post('/test-email', requireAdmin, async (req, res) => {
  try {
    const nodemailer = require('nodemailer');
    const getSetting = (key) => db.prepare("SELECT value FROM settings WHERE key=?").get(key)?.value;
    const host = getSetting('smtp_host');
    const port = parseInt(getSetting('smtp_port') || '587');
    const user = getSetting('smtp_user');
    const pass = getSetting('smtp_pass');
    const from = getSetting('smtp_from') || user;
    const to = req.body.to || from;
    if (!host || !user || !pass) return res.status(400).json({ error: 'SMTP not configured. Set smtp_host, smtp_user, smtp_pass in settings.' });
    const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });
    await transporter.sendMail({ from, to, subject: 'VendorHub Test Email', text: 'This is a test email from VendorHub. Your SMTP configuration is working correctly!' });
    res.json({ data: { sent: true, to } });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
