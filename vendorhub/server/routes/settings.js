const express = require('express');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const router = express.Router();

router.use(requireAuth);

const LOGO_DIR = path.join(__dirname, '..', '..', 'uploads', 'logo');
fs.mkdirSync(LOGO_DIR, { recursive: true });

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, LOGO_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.png';
    cb(null, 'company-logo-' + Date.now() + ext);
  },
});
const logoUpload = multer({
  storage: logoStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\/(png|jpeg|jpg|gif|svg\+xml|webp)$/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// H-1: Sensitive keys never leave the server — only admins may read SMTP credentials
const SENSITIVE_KEYS = new Set(['smtp_pass', 'smtp_user', 'smtp_host', 'smtp_port', 'smtp_from', 'smtp_enabled', 'admin_email']);

router.get('/', (req, res) => {
  const isAdmin = req.session?.isAdmin || (() => {
    if (!req.session?.userId) return false;
    const u = db.prepare('SELECT group_id FROM users WHERE id=?').get(req.session.userId);
    return u?.group_id === 1;
  })();
  let rows = db.prepare("SELECT key, value FROM settings WHERE key NOT IN ('session_secret','initialized')").all();
  if (!isAdmin) rows = rows.filter(r => !SENSITIVE_KEYS.has(r.key));
  res.json({ data: rows });
});

// Only admins change settings
router.put('/', requireAdmin, (req, res) => {
  const { key, value } = req.body;
  if (!key) return res.status(400).json({ error: 'key required' });
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, value);
  res.json({ data: { key, value } });
});

router.put('/bulk', requireAdmin, (req, res) => {
  const { settings } = req.body;
  const upsert = db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
  db.transaction(() => { for (const s of settings) upsert.run(s.key, s.value); })();
  res.json({ data: { success: true } });
});

// Upload company logo
router.post('/logo', requireAdmin, (req, res) => {
  logoUpload.single('logo')(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    // Remove old logo file if different name
    try {
      const old = db.prepare("SELECT value FROM settings WHERE key='company_logo'").get()?.value;
      if (old) {
        const oldPath = path.join(LOGO_DIR, old);
        if (fs.existsSync(oldPath) && old !== req.file.filename) fs.unlinkSync(oldPath);
      }
    } catch {}

    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('company_logo', ?)").run(req.file.filename);
    res.json({ data: { filename: req.file.filename, url: '/uploads/logo/' + req.file.filename } });
  });
});

// Delete company logo
router.delete('/logo', requireAdmin, (req, res) => {
  try {
    const old = db.prepare("SELECT value FROM settings WHERE key='company_logo'").get()?.value;
    if (old) {
      const oldPath = path.join(LOGO_DIR, old);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    db.prepare("DELETE FROM settings WHERE key='company_logo'").run();
    res.json({ data: { success: true } });
  } catch (e) {
    console.error('[settings/logo-delete]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

// Test SMTP email
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
    console.error('[settings/test-email]', e);
    res.status(500).json({ error: e.message }); // intentional: SMTP errors are user-actionable config feedback
  }
});

module.exports = router;
