const express = require('express');
const session = require('express-session');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cron = require('node-cron');

const { db, isFirstRun } = require('./db');

const app = express();
const PORT = process.env.PORT || 8080;

// Ensure dirs exist
['data', 'uploads', 'backups'].forEach(dir => {
  const p = path.join(__dirname, '..', dir);
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
});

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session
const sessionSecret = (() => {
  const row = db.prepare("SELECT value FROM settings WHERE key='session_secret'").get();
  if (row) return row.value;
  const secret = require('crypto').randomBytes(32).toString('hex');
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('session_secret', ?)").run(secret);
  return secret;
})();

app.use(session({
  secret: sessionSecret,
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 8 * 60 * 60 * 1000, httpOnly: true }
}));

// API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/setup', require('./routes/setup'));
app.use('/api/vendors', require('./routes/vendors'));
app.use('/api/vendors/:vendorId/contacts', require('./routes/contacts'));
app.use('/api/vendors/:vendorId/documents', require('./routes/documents'));
app.use('/api/vendors/:vendorId/contracts', require('./routes/contracts'));
app.use('/api/vendors/:vendorId/performance', require('./routes/performance'));
app.use('/api/users', require('./routes/users'));
app.use('/api/groups', require('./routes/groups'));
app.use('/api/backup', require('./routes/backup'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/permissions', require('./routes/permissions'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/audit', require('./routes/auditlog'));
app.use('/api/vendors/:vendorId/notes', require('./routes/notes'));

// Dashboard stats
app.get('/api/dashboard/stats', require('./middleware/auth'), (req, res) => {
  const { db } = require('./db');
  const total = db.prepare('SELECT COUNT(*) as c FROM vendors').get().c;
  const empanelled = db.prepare("SELECT COUNT(*) as c FROM vendors WHERE empanelment_status='Empanelled'").get().c;
  const inEval = db.prepare("SELECT COUNT(*) as c FROM vendors WHERE empanelment_status='In Evaluation'").get().c;
  const onHold = db.prepare("SELECT COUNT(*) as c FROM vendors WHERE empanelment_status='On Hold'").get().c;
  const archived = db.prepare("SELECT COUNT(*) as c FROM vendors WHERE empanelment_status='Archived'").get().c;
  const expiring = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE end_date BETWEEN date('now') AND date('now', '+90 days') AND status='Active'").get().c;
  const totalSpend = db.prepare("SELECT COALESCE(SUM(value),0) as s FROM contracts WHERE status='Active'").get().s;
  const recentVendors = db.prepare('SELECT id, name, logo_initial, logo_color, empanelment_status, created_at FROM vendors ORDER BY created_at DESC LIMIT 5').all();
  const domains = db.prepare('SELECT domain, COUNT(*) as count FROM vendor_domains GROUP BY domain ORDER BY count DESC LIMIT 10').all();
  const tierDist = db.prepare("SELECT tier, COUNT(*) as count FROM vendors GROUP BY tier").all();
  const topSpend = db.prepare("SELECT v.id, v.name, v.logo_initial, v.logo_color, COALESCE(SUM(c.value),0) as total FROM vendors v LEFT JOIN contracts c ON c.vendor_id=v.id GROUP BY v.id ORDER BY total DESC LIMIT 5").all();
  res.json({ data: { total, empanelled, inEval, onHold, archived, expiring, totalSpend, recentVendors, domains, tierDist, topSpend } });
});

// Static files
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
}

// SPA fallback - check first run
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'API route not found' });
  }

  if (fs.existsSync(clientDist)) {
    return res.sendFile(path.join(clientDist, 'index.html'));
  }

  // Dev mode fallback message
  res.send(`
    <html><body style="font-family:sans-serif;padding:40px;background:#F5F6FA">
    <h1 style="color:#1C3C6E">VendorHub API Server</h1>
    <p>API running on port ${PORT}. Run <code>npm run build</code> to serve the client, or start the Vite dev server separately.</p>
    <p><a href="/api/setup/status">Check setup status</a></p>
    </body></html>
  `);
});

// Scheduled backups
function scheduleBackups() {
  const row = db.prepare("SELECT value FROM settings WHERE key='backup_schedule'").get();
  const schedule = row ? row.value : 'Daily';
  const { runBackup } = require('./routes/backup');

  let cronExpr = '0 2 * * *'; // Daily at 2am
  if (schedule === 'Weekly') cronExpr = '0 2 * * 0';
  if (schedule === 'Monthly') cronExpr = '0 2 1 * *';

  cron.schedule(cronExpr, () => {
    try {
      runBackup('Scheduled');
      console.log('[VendorHub] Scheduled backup completed');
    } catch (err) {
      console.error('[VendorHub] Scheduled backup failed:', err.message);
    }
  });
}

app.listen(PORT, () => {
  console.log(`[VendorHub] Server running on http://localhost:${PORT}`);
  console.log(`[VendorHub] First run: ${isFirstRun()}`);
  try { scheduleBackups(); } catch {}
});

module.exports = app;
