const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const alerts = [];

  // Contracts expiring in 30 days (critical)
  const expiring30 = db.prepare(`
    SELECT c.id, c.end_date, c.type, v.id as vendor_id, v.name as vendor_name
    FROM contracts c JOIN vendors v ON v.id = c.vendor_id
    WHERE c.status = 'Active' AND c.end_date BETWEEN date('now') AND date('now', '+30 days')
    ORDER BY c.end_date ASC
  `).all();
  for (const c of expiring30) {
    const days = Math.ceil((new Date(c.end_date) - new Date()) / 86400000);
    alerts.push({ id: `c30-${c.id}`, type: 'contract_expiry', severity: 'critical', title: `Contract expiring in ${days} day${days !== 1 ? 's' : ''}`, message: `${c.vendor_name} — ${c.type || 'Contract'} expires ${c.end_date}`, vendor_id: c.vendor_id, link: `/vendors/${c.vendor_id}` });
  }

  // Contracts expiring in 31-90 days (warning)
  const expiring90 = db.prepare(`
    SELECT c.id, c.end_date, c.type, v.id as vendor_id, v.name as vendor_name
    FROM contracts c JOIN vendors v ON v.id = c.vendor_id
    WHERE c.status = 'Active' AND c.end_date BETWEEN date('now', '+31 days') AND date('now', '+90 days')
    ORDER BY c.end_date ASC LIMIT 10
  `).all();
  for (const c of expiring90) {
    const days = Math.ceil((new Date(c.end_date) - new Date()) / 86400000);
    alerts.push({ id: `c90-${c.id}`, type: 'contract_expiry', severity: 'warning', title: `Contract expiring in ${days} days`, message: `${c.vendor_name} — ${c.type || 'Contract'} expires ${c.end_date}`, vendor_id: c.vendor_id, link: `/vendors/${c.vendor_id}` });
  }

  // Certifications expiring in 60 days
  const certs = db.prepare(`
    SELECT ce.id, ce.name, ce.expiry, v.id as vendor_id, v.name as vendor_name
    FROM certifications ce JOIN vendors v ON v.id = ce.vendor_id
    WHERE ce.is_valid = 1 AND ce.expiry IS NOT NULL AND ce.expiry BETWEEN date('now') AND date('now', '+60 days')
    ORDER BY ce.expiry ASC LIMIT 10
  `).all();
  for (const c of certs) {
    const days = Math.ceil((new Date(c.expiry) - new Date()) / 86400000);
    alerts.push({ id: `cert-${c.id}`, type: 'cert_expiry', severity: days <= 15 ? 'critical' : 'warning', title: `Certification expiring in ${days} day${days !== 1 ? 's' : ''}`, message: `${c.vendor_name} — ${c.name} expires ${c.expiry}`, vendor_id: c.vendor_id, link: `/vendors/${c.vendor_id}` });
  }

  // Vendors on Hold > 30 days
  const onHold = db.prepare(`
    SELECT id, name, updated_at FROM vendors
    WHERE empanelment_status = 'On Hold'
    AND (julianday('now') - julianday(updated_at)) > 30 LIMIT 5
  `).all();
  for (const v of onHold) {
    alerts.push({ id: `hold-${v.id}`, type: 'status_alert', severity: 'info', title: 'Vendor on hold for 30+ days', message: `${v.name} has been on hold and may need a review`, vendor_id: v.id, link: `/vendors/${v.id}` });
  }

  // Vendors with no performance review in 180 days (active/empanelled)
  const noReview = db.prepare(`
    SELECT v.id, v.name FROM vendors v
    WHERE v.empanelment_status = 'Empanelled'
    AND (
      SELECT MAX(reviewed_at) FROM performance_reviews WHERE vendor_id = v.id
    ) < date('now', '-180 days')
    OR NOT EXISTS (SELECT 1 FROM performance_reviews WHERE vendor_id = v.id)
    LIMIT 5
  `).all();
  for (const v of noReview) {
    alerts.push({ id: `rev-${v.id}`, type: 'review_due', severity: 'info', title: 'Performance review overdue', message: `${v.name} has not been reviewed in 180+ days`, vendor_id: v.id, link: `/vendors/${v.id}` });
  }

  // Sort: critical first, then warning, then info
  const order = { critical: 0, warning: 1, info: 2 };
  alerts.sort((a, b) => order[a.severity] - order[b.severity]);

  res.json({ data: alerts });
});

// Mark notification dismissed (stored in session for simplicity)
router.post('/dismiss', (req, res) => {
  const { id } = req.body;
  if (!req.session.dismissedAlerts) req.session.dismissedAlerts = [];
  if (id && !req.session.dismissedAlerts.includes(id)) req.session.dismissedAlerts.push(id);
  res.json({ data: { success: true } });
});

module.exports = router;
