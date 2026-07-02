const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const { auditLog } = require('../middleware/audit');
const router = express.Router();

router.use(requireAuth);

const COLORS = ['#1C3C6E','#29ABE2','#27AE60','#E74C3C','#F39C12','#8E44AD','#16A085','#2C3E50'];

function computeRisk(vendorId) {
  let score = 0;
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(vendorId);
  if (!vendor) return { score: 0, level: 'Low' };

  // Status
  if (vendor.empanelment_status === 'On Hold') score += 25;
  else if (vendor.empanelment_status === 'In Evaluation') score += 10;
  else if (vendor.empanelment_status === 'Archived') score += 40;

  // Tier
  if (vendor.tier === 'Tier 3') score += 15;
  else if (vendor.tier === 'Tier 1') score -= 5;

  // Active contract?
  const activeContract = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE vendor_id = ? AND status = 'Active'").get(vendorId);
  if (!activeContract.c) score += 20;
  else {
    // Expiring soon?
    const expiring = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE vendor_id = ? AND status = 'Active' AND end_date BETWEEN date('now') AND date('now', '+30 days')").get(vendorId);
    if (expiring.c) score += 20;
    else {
      const expiring90 = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE vendor_id = ? AND status = 'Active' AND end_date BETWEEN date('now') AND date('now', '+90 days')").get(vendorId);
      if (expiring90.c) score += 10;
    }
  }

  // Performance
  const avg = db.prepare('SELECT AVG(rating) as r FROM performance_reviews WHERE vendor_id = ?').get(vendorId);
  if (!avg.r) score += 10;
  else if (avg.r < 3) score += 25;
  else if (avg.r < 3.5) score += 10;

  // Expired certs
  const expiredCerts = db.prepare("SELECT COUNT(*) as c FROM certifications WHERE vendor_id = ? AND is_valid = 1 AND expiry < date('now')").get(vendorId);
  score += expiredCerts.c * 10;

  score = Math.max(0, Math.min(100, score));
  const level = score >= 65 ? 'Critical' : score >= 40 ? 'High' : score >= 20 ? 'Medium' : 'Low';
  return { score, level };
}

router.get('/', requirePermission('Vendors', 'Read'), (req, res) => {
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
      const risk = computeRisk(v.id);
      v.risk_score = risk.score;
      v.risk_level = risk.level;
    }

    res.json({ data: vendors });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// CSV Export — must be before /:id routes
router.get('/export', requirePermission('Vendors', 'Read'), (req, res) => {
  const vendors = db.prepare('SELECT * FROM vendors ORDER BY name').all();
  const header = ['id','name','gstin','website','address','geo_scope','empanelment_status','tier','vendor_type','summary','added_by','added_date'];
  const rows = [header.join(',')];
  for (const v of vendors) {
    const domains = db.prepare('SELECT domain FROM vendor_domains WHERE vendor_id = ?').all(v.id).map(r => r.domain).join('|');
    const tags = db.prepare('SELECT tag FROM vendor_tags WHERE vendor_id = ?').all(v.id).map(r => r.tag).join('|');
    const risk = computeRisk(v.id);
    const row = [...header.map(h => {
      const val = h === 'domains' ? domains : h === 'tags' ? tags : (v[h] ?? '');
      return '"' + String(val).replace(/"/g, '""') + '"';
    }), '"' + domains + '"', '"' + tags + '"', '"' + risk.level + '"'];
    rows.push(row.join(','));
  }
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="vendors-export.csv"');
  res.send(rows.join('\n'));
});

// CSV Import
const multer = require('multer');
const csvUpload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });
router.post('/import', requirePermission('Vendors', 'Edit'), csvUpload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'CSV file required' });
    const text = req.file.buffer.toString('utf-8');
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) return res.status(400).json({ error: 'CSV must have header + at least one data row' });

    const header = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim().toLowerCase());
    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
    const today = new Date().toISOString().split('T')[0];
    let imported = 0, skipped = 0;

    const insertVendor = db.prepare(`
      INSERT INTO vendors (name, gstin, website, address, geo_scope, empanelment_status, tier, vendor_type, summary, logo_initial, logo_color, added_by, added_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const importAll = db.transaction(() => {
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].match(/(".*?"|[^,]+)(?=,|$)/g) || [];
        const row = {};
        header.forEach((h, idx) => { row[h] = (cols[idx] || '').replace(/^"|"$/g, '').trim(); });
        if (!row.name) { skipped++; continue; }
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const result = insertVendor.run(
          row.name, row.gstin || null, row.website || null, row.address || null,
          row.geo_scope || null, row.empanelment_status || 'In Evaluation',
          row.tier || 'Tier 2', row.vendor_type || null, row.summary || null,
          row.name[0].toUpperCase(), color, user?.username || 'import', row.added_date || today
        );
        if (row.domains) {
          const ins = db.prepare('INSERT INTO vendor_domains (vendor_id, domain) VALUES (?, ?)');
          row.domains.split('|').filter(Boolean).forEach(d => ins.run(result.lastInsertRowid, d.trim()));
        }
        if (row.tags) {
          const ins = db.prepare('INSERT INTO vendor_tags (vendor_id, tag) VALUES (?, ?)');
          row.tags.split('|').filter(Boolean).forEach(t => ins.run(result.lastInsertRowid, t.trim()));
        }
        imported++;
      }
    });
    importAll();
    res.json({ data: { imported, skipped, total: lines.length - 1 } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', requirePermission('Vendors', 'Edit'), auditLog('Vendor', 'CREATE', (req, body) => body?.data?.id), (req, res) => {
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

router.get('/:id', requirePermission('Vendors', 'Read'), (req, res) => {
  try {
    const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

    vendor.domains = db.prepare('SELECT domain FROM vendor_domains WHERE vendor_id = ?').all(vendor.id).map(r => r.domain);
    vendor.tags = db.prepare('SELECT tag FROM vendor_tags WHERE vendor_id = ?').all(vendor.id).map(r => r.tag);
    vendor.contacts_count = db.prepare('SELECT COUNT(*) as c FROM contacts WHERE vendor_id = ?').get(vendor.id).c;
    vendor.contracts_count = db.prepare('SELECT COUNT(*) as c FROM contracts WHERE vendor_id = ?').get(vendor.id).c;
    vendor.certifications = db.prepare('SELECT * FROM certifications WHERE vendor_id = ?').all(vendor.id);
    const risk = computeRisk(vendor.id);
    vendor.risk_score = risk.score;
    vendor.risk_level = risk.level;

    res.json({ data: vendor });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', requirePermission('Vendors', 'Edit'), (req, res) => {
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

router.delete('/:id', requirePermission('Vendors', 'Full'), auditLog('Vendor', 'DELETE'), (req, res) => {
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

// Vendor comparison
router.get('/compare', requirePermission('Vendors', 'Read'), (req, res) => {
  const ids = (req.query.ids || '').split(',').map(Number).filter(Boolean).slice(0, 4);
  if (ids.length < 2) return res.status(400).json({ error: 'At least 2 vendor IDs required' });
  const result = ids.map(id => {
    const v = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
    if (!v) return null;
    v.domains = db.prepare('SELECT domain FROM vendor_domains WHERE vendor_id = ?').all(id).map(r => r.domain);
    v.tags = db.prepare('SELECT tag FROM vendor_tags WHERE vendor_id = ?').all(id).map(r => r.tag);
    v.certifications = db.prepare('SELECT * FROM certifications WHERE vendor_id = ?').all(id);
    v.active_contracts = db.prepare("SELECT COUNT(*) as c FROM contracts WHERE vendor_id = ? AND status = 'Active'").get(id).c;
    v.total_spend = db.prepare("SELECT COALESCE(SUM(value),0) as s FROM contracts WHERE vendor_id = ?").get(id).s;
    const perf = db.prepare("SELECT AVG(rating) as r, AVG(on_time_delivery) as d, AVG(support_quality) as q, AVG(price_competitiveness) as p FROM performance_reviews WHERE vendor_id = ?").get(id);
    v.avg_rating = perf.r ? parseFloat(perf.r.toFixed(1)) : null;
    v.avg_delivery = perf.d ? Math.round(perf.d) : null;
    v.avg_quality = perf.q ? Math.round(perf.q) : null;
    v.avg_price = perf.p ? Math.round(perf.p) : null;
    const risk = computeRisk(id);
    v.risk_score = risk.score;
    v.risk_level = risk.level;
    return v;
  }).filter(Boolean);
  res.json({ data: result });
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
