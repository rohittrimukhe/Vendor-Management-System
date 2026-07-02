const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/spend', (req, res) => {
  // Spend by tier
  const byTier = db.prepare(`
    SELECT v.tier, COALESCE(SUM(c.value),0) as total, COUNT(DISTINCT v.id) as vendors
    FROM vendors v LEFT JOIN contracts c ON c.vendor_id=v.id AND c.status='Active'
    GROUP BY v.tier ORDER BY total DESC
  `).all();

  // Spend by vendor type
  const byType = db.prepare(`
    SELECT COALESCE(v.vendor_type,'Other') as type, COALESCE(SUM(c.value),0) as total, COUNT(DISTINCT v.id) as vendors
    FROM vendors v LEFT JOIN contracts c ON c.vendor_id=v.id AND c.status='Active'
    GROUP BY v.vendor_type ORDER BY total DESC
  `).all();

  // Spend by domain
  const byDomain = db.prepare(`
    SELECT vd.domain, COALESCE(SUM(c.value),0) as total
    FROM vendor_domains vd
    JOIN vendors v ON v.id=vd.vendor_id
    LEFT JOIN contracts c ON c.vendor_id=v.id AND c.status='Active'
    GROUP BY vd.domain ORDER BY total DESC LIMIT 10
  `).all();

  // Top vendors by spend
  const topVendors = db.prepare(`
    SELECT v.id, v.name, v.logo_initial, v.logo_color, v.tier, v.empanelment_status,
      COALESCE(SUM(c.value),0) as total, COUNT(c.id) as contract_count
    FROM vendors v LEFT JOIN contracts c ON c.vendor_id=v.id AND c.status='Active'
    GROUP BY v.id ORDER BY total DESC LIMIT 10
  `).all();

  // Monthly trend (last 12 months based on contract start_date)
  const monthly = db.prepare(`
    SELECT strftime('%Y-%m', start_date) as month, COALESCE(SUM(value),0) as total, COUNT(*) as contracts
    FROM contracts
    WHERE start_date >= date('now', '-12 months') AND status='Active'
    GROUP BY month ORDER BY month ASC
  `).all();

  // Expiring soon
  const expiringSoon = db.prepare(`
    SELECT v.id, v.name, v.logo_initial, v.logo_color, c.end_date, c.value, c.type,
      CAST(julianday(c.end_date) - julianday('now') AS INTEGER) as days_left
    FROM contracts c JOIN vendors v ON v.id=c.vendor_id
    WHERE c.end_date BETWEEN date('now') AND date('now', '+90 days') AND c.status='Active'
    ORDER BY c.end_date ASC LIMIT 10
  `).all();

  // Summary totals
  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN c.status='Active' THEN c.value ELSE 0 END),0) as active_value,
      COUNT(CASE WHEN c.status='Active' THEN 1 END) as active_count,
      COALESCE(SUM(c.value),0) as all_time_value,
      COUNT(*) as all_count
    FROM contracts c
  `).get();

  res.json({ data: { byTier, byType, byDomain, topVendors, monthly, expiringSoon, totals } });
});

module.exports = router;
