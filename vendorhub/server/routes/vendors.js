const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

const COLORS = ['#1C3C6E','#29ABE2','#27AE60','#E74C3C','#F39C12','#8E44AD','#16A085','#2C3E50'];

router.get('/', (req, res) => {
  try {
    const { q, status, tier, type, domain } = req.query;
    let sql = 'SELECT v.* FROM vendors v';
    const params = [];

    if (domain) {
      sql += ' JOIN vendor_domains vd ON vd.vendor_id = v.id AND vd.domain LIKE ?';
      params.push(`%${domain}%`);
    }

    const conditions = [];
    if (q) {
      conditions.push('(v.name LIKE ? OR v.summary LIKE ? OR v.gstin LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`);
    }
    if (status) { conditions.push('v.empanelment_status = ?'); params.push(status); }
    if (tier) { conditions.push('v.tier = ?'); params.push(tier); }
    if (type) { conditions.push('v.vendor_type = ?'); params.push(type); }

    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' ORDER BY v.created_at DESC';

    const vendors = db.prepare(sql).all(...params);

    for (const v of vendors) {
      v.domains = db.prepare('SELECT domain FROM vendor_domains WHERE vendor_id = ?').all(v.id).map(r => r.domain);
      v.tags = db.prepare('SELECT tag FROM vendor_tags WHERE vendor_id = ?').all(v.id).map(r => r.tag);
    }

    res.json({ data: vendors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/', (req, res) => {
  try {
    const { name, gstin, website, address, geo_scope, empanelment_status, tier, vendor_type, summary, domains = [], tags = [], contacts = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'Vendor name is required' });

    const initial = name.charAt(0).toUpperCase();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
    const today = new Date().toISOString().split('T')[0];

    const result = db.prepare(`
      INSERT INTO vendors (name, gstin, website, address, geo_scope, empanelment_status, tier, vendor_type, summary, logo_initial, logo_color, added_by, added_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, gstin || null, website || null, address || null, geo_scope || null,
      empanelment_status || 'In Evaluation', tier || 'Tier 2', vendor_type || null,
      summary || null, initial, color, user ? user.username : 'admin', today);

    const vendorId = result.lastInsertRowid;

    const insertDomain = db.prepare('INSERT INTO vendor_domains (vendor_id, domain) VALUES (?, ?)');
    for (const d of domains) if (d.trim()) insertDomain.run(vendorId, d.trim());

    const insertTag = db.prepare('INSERT INTO vendor_tags (vendor_id, tag) VALUES (?, ?)');
    for (const t of tags) if (t.trim()) insertTag.run(vendorId, t.trim());

    const insertContact = db.prepare('INSERT INTO contacts (vendor_id, name, role, email, phone) VALUES (?, ?, ?, ?, ?)');
    for (const c of contacts) {
      if (c.name) insertContact.run(vendorId, c.name, c.role || null, c.email || null, c.phone || null);
    }

    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorId);
    vendor.domains = domains;
    vendor.tags = tags;
    res.status(201).json({ data: vendor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', (req, res) => {
  try {
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    vendor.domains = db.prepare('SELECT domain FROM vendor_domains WHERE vendor_id = ?').all(vendor.id).map(r => r.domain);
    vendor.tags = db.prepare('SELECT tag FROM vendor_tags WHERE vendor_id = ?').all(vendor.id).map(r => r.tag);
    vendor.contacts_count = db.prepare('SELECT COUNT(*) as c FROM contacts WHERE vendor_id = ?').get(vendor.id).c;
    vendor.contracts_count = db.prepare('SELECT COUNT(*) as c FROM contracts WHERE vendor_id = ?').get(vendor.id).c;
    vendor.certifications = db.prepare('SELECT * FROM certifications WHERE vendor_id = ?').all(vendor.id);

    res.json({ data: vendor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', (req, res) => {
  try {
    const { name, gstin, website, address, geo_scope, empanelment_status, tier, vendor_type, summary, domains, tags } = req.body;
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    const initial = (name || vendor.name).charAt(0).toUpperCase();

    db.prepare(`
      UPDATE vendors SET name=?, gstin=?, website=?, address=?, geo_scope=?, empanelment_status=?, tier=?, vendor_type=?, summary=?, logo_initial=?, updated_at=CURRENT_TIMESTAMP
      WHERE id=?
    `).run(name || vendor.name, gstin ?? vendor.gstin, website ?? vendor.website, address ?? vendor.address,
      geo_scope ?? vendor.geo_scope, empanelment_status || vendor.empanelment_status,
      tier || vendor.tier, vendor_type ?? vendor.vendor_type, summary ?? vendor.summary,
      initial, req.params.id);

    if (domains !== undefined) {
      db.prepare('DELETE FROM vendor_domains WHERE vendor_id = ?').run(req.params.id);
      const insertDomain = db.prepare('INSERT INTO vendor_domains (vendor_id, domain) VALUES (?, ?)');
      for (const d of domains) if (d.trim()) insertDomain.run(req.params.id, d.trim());
    }

    if (tags !== undefined) {
      db.prepare('DELETE FROM vendor_tags WHERE vendor_id = ?').run(req.params.id);
      const insertTag = db.prepare('INSERT INTO vendor_tags (vendor_id, tag) VALUES (?, ?)');
      for (const t of tags) if (t.trim()) insertTag.run(req.params.id, t.trim());
    }

    const updated = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    updated.domains = db.prepare('SELECT domain FROM vendor_domains WHERE vendor_id = ?').all(req.params.id).map(r => r.domain);
    updated.tags = db.prepare('SELECT tag FROM vendor_tags WHERE vendor_id = ?').all(req.params.id).map(r => r.tag);
    res.json({ data: updated });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const vendor = db.prepare('SELECT id FROM vendors WHERE id = ?').get(req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    db.prepare('DELETE FROM vendors WHERE id = ?').run(req.params.id);
    res.json({ data: { success: true } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Certifications
router.get('/:id/certifications', (req, res) => {
  const rows = db.prepare('SELECT * FROM certifications WHERE vendor_id = ?').all(req.params.id);
  res.json({ data: rows });
});

router.post('/:id/certifications', (req, res) => {
  const { name, issuer, expiry, is_valid } = req.body;
  const result = db.prepare('INSERT INTO certifications (vendor_id, name, issuer, expiry, is_valid) VALUES (?, ?, ?, ?, ?)').run(req.params.id, name, issuer, expiry, is_valid !== false ? 1 : 0);
  res.status(201).json({ data: db.prepare('SELECT * FROM certifications WHERE id = ?').get(result.lastInsertRowid) });
});

router.delete('/:id/certifications/:certId', (req, res) => {
  db.prepare('DELETE FROM certifications WHERE id = ? AND vendor_id = ?').run(req.params.certId, req.params.id);
  res.json({ data: { success: true } });
});

// Dashboard stats
router.get('/stats/dashboard', (req, res) => {
  try {
    const total = db.prepare('SELECT COUNT(*) as c FROM vendors').get().c;
    const empanelled = db.prepare("SELECT COUNT(*) as c FROM vendors WHERE empanelment_status='Empanelled'").get().c;
    const inEval = db.prepare("SELECT COUNT(*) as c FROM vendors WHERE empanelment_status='In Evaluation'").get().c;
    const expiring = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE end_date BETWEEN date('now') AND date('now', '+90 days') AND status='Active'").get().c;

    const domains = db.prepare(`
      SELECT vd.domain, COUNT(DISTINCT vd.vendor_id) as count
      FROM vendor_domains vd
      GROUP BY vd.domain
      ORDER BY count DESC LIMIT 10
    `).all();

    const recent = db.prepare('SELECT * FROM vendors ORDER BY created_at DESC LIMIT 5').all();
    for (const v of recent) {
      v.domains = db.prepare('SELECT domain FROM vendor_domains WHERE vendor_id = ?').all(v.id).map(r => r.domain);
    }

    res.json({ data: { total, empanelled, inEval, expiring, domains, recent } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
