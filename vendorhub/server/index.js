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
app.use('/api/vendors/:vendorId/tasks', require('./routes/tasks'));
app.use('/api/tasks', require('./routes/mytasks'));
app.use('/api/scoring', require('./routes/scoring'));
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/vendors/:vendorId/onboarding', require('./routes/onboarding'));
app.use('/api/vendors/:vendorId/timeline', require('./routes/timeline'));
app.use('/api/custom-fields', require('./routes/customfields'));
app.use('/api/update', require('./routes/update'));
app.use('/api/vendors', require('./routes/vendorpdf'));

// Pending approvals for current user's direct reports
app.get('/api/approvals/pending', require('./middleware/auth'), (req, res) => {
  const { db } = require('./db');
  const userId = req.session.userId;
  // Vendors where I am the approval reviewer and status is pending
  const pendingForMe = db.prepare(`
    SELECT v.id, v.name, v.logo_initial, v.logo_color, v.empanelment_status, v.tier, v.approval_status,
           v.created_at, u.name as requester_name, u.username as requester_username
    FROM vendors v
    LEFT JOIN users u ON u.id = v.approval_requested_by
    WHERE v.approval_reviewer_id = ? AND v.approval_status = 'pending_review'
    ORDER BY v.created_at DESC
  `).all(userId);
  // My own vendors pending approval
  const myPending = db.prepare(`
    SELECT v.id, v.name, v.logo_initial, v.logo_color, v.empanelment_status, v.tier, v.approval_status,
           v.created_at, u.name as reviewer_name, u.username as reviewer_username
    FROM vendors v
    LEFT JOIN users u ON u.id = v.approval_reviewer_id
    WHERE v.approval_requested_by = ? AND v.approval_status IN ('pending_review', 'rejected')
    ORDER BY v.created_at DESC
  `).all(userId);
  res.json({ data: { pendingForMe, myPending } });
});

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
  const openTasks = db.prepare("SELECT COUNT(*) as c FROM vendor_tasks WHERE status!='Done'").get().c;
  const overdueTasks = db.prepare("SELECT COUNT(*) as c FROM vendor_tasks WHERE status!='Done' AND due_date < date('now')").get().c;
  const highRisk = db.prepare("SELECT COUNT(*) as c FROM vendors WHERE risk_level IN ('High','Critical')").get().c;
  res.json({ data: { total, empanelled, inEval, onHold, archived, expiring, totalSpend, recentVendors, domains, tierDist, topSpend, openTasks, overdueTasks, highRisk } });
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

function scheduleEmailAlerts() {
  cron.schedule('0 8 * * *', async () => {
    try {
      const getSetting = (key) => db.prepare("SELECT value FROM settings WHERE key=?").get(key)?.value;
      if (getSetting('smtp_enabled') !== 'true') return;
      const host = getSetting('smtp_host');
      const port = parseInt(getSetting('smtp_port') || '587');
      const user = getSetting('smtp_user');
      const pass = getSetting('smtp_pass');
      const from = getSetting('smtp_from') || user;
      if (!host || !user || !pass) return;

      const adminEmails = db.prepare("SELECT email FROM users WHERE group_id = 1 AND email IS NOT NULL AND email != ''").all().map(r => r.email);
      const extraEmail = getSetting('admin_email');
      if (extraEmail && !adminEmails.includes(extraEmail)) adminEmails.push(extraEmail);
      if (!adminEmails.length) return;

      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass } });

      const expiringContracts = db.prepare(`
        SELECT c.*, v.name as vendor_name FROM contracts c
        JOIN vendors v ON v.id = c.vendor_id
        WHERE c.status = 'Active' AND c.end_date BETWEEN date('now') AND date('now', '+30 days')
        ORDER BY c.end_date
      `).all();

      const expiringCerts = db.prepare(`
        SELECT ce.*, v.name as vendor_name FROM certifications ce
        JOIN vendors v ON v.id = ce.vendor_id
        WHERE ce.expiry BETWEEN date('now') AND date('now', '+30 days')
        ORDER BY ce.expiry
      `).all();

      if (!expiringContracts.length && !expiringCerts.length) return;

      let html = '<h2 style="color:#1C3C6E">VendorHub — Expiry Alerts</h2>';
      if (expiringContracts.length) {
        html += `<h3 style="color:#E74C3C">⚠ Contracts Expiring in 30 Days (${expiringContracts.length})</h3><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Vendor</th><th>Type</th><th>End Date</th><th>Value</th></tr>`;
        expiringContracts.forEach(c => {
          html += `<tr><td>${c.vendor_name}</td><td>${c.type || '—'}</td><td>${c.end_date}</td><td>${c.value ? '₹' + Number(c.value).toLocaleString() : '—'}</td></tr>`;
        });
        html += '</table>';
      }
      if (expiringCerts.length) {
        html += `<h3 style="color:#E67E22">⚠ Certifications Expiring in 30 Days (${expiringCerts.length})</h3><table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;width:100%"><tr><th>Vendor</th><th>Certification</th><th>Expiry</th></tr>`;
        expiringCerts.forEach(c => {
          html += `<tr><td>${c.vendor_name}</td><td>${c.name || '—'}</td><td>${c.expiry}</td></tr>`;
        });
        html += '</table>';
      }
      html += '<p style="color:#888;font-size:12px;margin-top:20px">This is an automated alert from VendorHub.</p>';

      await transporter.sendMail({
        from, to: adminEmails.join(', '),
        subject: `VendorHub Alert: ${expiringContracts.length + expiringCerts.length} items expiring soon`,
        html,
      });
      console.log(`[VendorHub] Email alerts sent to ${adminEmails.join(', ')}`);
    } catch (err) {
      console.error('[VendorHub] Email alert failed:', err.message);
    }
  });
}

app.listen(PORT, () => {
  console.log(`[VendorHub] Server running on http://localhost:${PORT}`);
  console.log(`[VendorHub] First run: ${isFirstRun()}`);
  try { scheduleBackups(); } catch {}
  try { scheduleEmailAlerts(); } catch {}
});

module.exports = app;
