const express = require('express');
const XLSX = require('xlsx');
const ExcelJS = require('exceljs');
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
    const userId = req.session.userId;
    const isAdmin = (() => { const u = db.prepare('SELECT group_id FROM users WHERE id=?').get(userId); return u?.group_id === 1; })();
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
    // Visibility filter: non-admins can only see vendors they have access to
    if (!isAdmin) {
      conditions.push(`(v.visibility = 'everyone' OR v.visibility IS NULL OR EXISTS (SELECT 1 FROM vendor_visibility_users vvu WHERE vvu.vendor_id = v.id AND vvu.user_id = ?))`);
      params.push(userId);
      // Also filter by approval: hide pending/rejected vendors unless user submitted them or is the reviewer
      conditions.push(`(v.approval_status IS NULL OR v.approval_status = 'approved' OR v.approval_requested_by = ? OR v.approval_reviewer_id = ?)`);
      params.push(userId, userId);
    }

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

// Bulk Actions — C-5: delete requires Full; C-6: audit log bulk operations
router.post('/bulk', requirePermission('Vendors', 'Edit'), (req, res) => {
  const { ids, action, value } = req.body;
  if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: 'ids array required' });

  if (action === 'delete') {
    // C-5: Delete requires Full permission
    const userId = req.session.userId;
    const user = db.prepare('SELECT group_id FROM users WHERE id=?').get(userId);
    const isAdmin = user?.group_id === 1;
    if (!isAdmin) {
      const perm = db.prepare("SELECT access_level FROM permissions WHERE group_id=? AND module='Vendors'").get(user?.group_id);
      const levels = ['None', 'Read', 'Edit', 'Full'];
      if (!perm || levels.indexOf(perm.access_level) < levels.indexOf('Full')) {
        return res.status(403).json({ error: 'Full permission required for bulk delete' });
      }
    }
    if (ids.length > 50) return res.status(400).json({ error: 'Max 50 vendors per bulk delete' });
    const deleteVendor = db.prepare('DELETE FROM vendors WHERE id = ?');
    db.transaction(() => { ids.forEach(id => deleteVendor.run(id)); })();
    // C-6: Audit bulk delete
    try {
      const uname = db.prepare('SELECT username FROM users WHERE id=?').get(req.session.userId);
      db.prepare('INSERT INTO audit_log (user_id, username, action, entity_type, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.session.userId, uname?.username || 'unknown', 'BULK_DELETE', 'Vendor', `IDs: ${ids.join(', ')}`, req.ip || null);
    } catch {}
    return res.json({ data: { affected: ids.length } });
  }

  if (action === 'status') {
    const allowed = ['Empanelled', 'In Evaluation', 'On Hold', 'Archived'];
    if (!allowed.includes(value)) return res.status(400).json({ error: 'Invalid status' });
    const upd = db.prepare("UPDATE vendors SET empanelment_status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?");
    db.transaction(() => { ids.forEach(id => upd.run(value, id)); })();
    try {
      const uname = db.prepare('SELECT username FROM users WHERE id=?').get(req.session.userId);
      db.prepare('INSERT INTO audit_log (user_id, username, action, entity_type, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.session.userId, uname?.username || 'unknown', 'BULK_STATUS_CHANGE', 'Vendor', `Status → ${value}, IDs: ${ids.join(', ')}`, req.ip || null);
    } catch {}
    return res.json({ data: { affected: ids.length } });
  }

  if (action === 'tier') {
    const allowed = ['Tier 1', 'Tier 2', 'Tier 3'];
    if (!allowed.includes(value)) return res.status(400).json({ error: 'Invalid tier' });
    const upd = db.prepare("UPDATE vendors SET tier=?, updated_at=CURRENT_TIMESTAMP WHERE id=?");
    db.transaction(() => { ids.forEach(id => upd.run(value, id)); })();
    try {
      const uname = db.prepare('SELECT username FROM users WHERE id=?').get(req.session.userId);
      db.prepare('INSERT INTO audit_log (user_id, username, action, entity_type, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)')
        .run(req.session.userId, uname?.username || 'unknown', 'BULK_TIER_CHANGE', 'Vendor', `Tier → ${value}, IDs: ${ids.join(', ')}`, req.ip || null);
    } catch {}
    return res.json({ data: { affected: ids.length } });
  }

  return res.status(400).json({ error: 'Unknown action' });
});

// Shared helper — builds a styled LRS workbook (ExcelJS) from row data
async function buildLrsWorkbook(dataRows) {
  // dataRows: array of {srNo, name, email, mobile, address, details}
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Sheet1');

  // A-D auto-sized; Address max 60, Details fixed 100
  ws.columns = [
    { key: 'srNo',    width: 10 },
    { key: 'name',    width: 10 },
    { key: 'email',   width: 10 },
    { key: 'mobile',  width: 10 },
    { key: 'address', width: 10 },
    { key: 'details', width: 100 },
  ];

  const THIN = { style: 'thin' };
  const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };
  const FONT = { name: 'Calibri', size: 12 };
  const HEADERS = ['Sr.No', 'Name', 'Email', 'Mobile', 'Address', 'Details'];

  // Header row
  const hdr = ws.addRow(HEADERS);
  hdr.eachCell(cell => {
    cell.font = { ...FONT, bold: false };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFF00' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
    cell.border = BORDER;
  });

  // Data rows
  for (let i = 0; i < dataRows.length; i++) {
    const d = dataRows[i];
    const row = ws.addRow([d.srNo, d.name, d.email, d.mobile, d.address, d.details]);
    // No fixed height — let Excel auto-size based on wrapped content
    row.eachCell((cell, colNum) => {
      cell.font = FONT;
      cell.border = BORDER;
      if (colNum <= 4) {
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: false };
      } else if (colNum === 5) {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      } else {
        cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
      }
    });
  }

  // Auto-size A-D: max content + padding; Address capped at 60
  const PAD = 4;
  const autoKeys = ['srNo', 'name', 'email', 'mobile'];
  const headerLabels = ['Sr.No', 'Name', 'Email', 'Mobile'];
  autoKeys.forEach((key, idx) => {
    const maxLen = dataRows.reduce((m, d) => Math.max(m, String(d[key] || '').length), headerLabels[idx].length);
    ws.getColumn(idx + 1).width = maxLen + PAD;
  });
  // Address: auto-size capped at 60
  const addrMax = dataRows.reduce((m, d) => Math.max(m, String(d.address || '').length), 'Address'.length);
  ws.getColumn(5).width = Math.min(addrMax + PAD, 60);

  // Page margins
  ws.pageSetup.margins = { left: 0.7, right: 0.7, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 };

  return wb;
}

// Excel Export — must be before /:id routes
router.get('/export', requirePermission('Vendors', 'Read'), async (req, res) => {
  const userId = req.session.userId;
  const isAdmin = (() => { const u = db.prepare('SELECT group_id FROM users WHERE id=?').get(userId); return u?.group_id === 1; })();
  const vendors = isAdmin
    ? db.prepare('SELECT * FROM vendors ORDER BY name').all()
    : db.prepare(`SELECT v.* FROM vendors v WHERE v.visibility = 'everyone' OR v.visibility IS NULL OR EXISTS (SELECT 1 FROM vendor_visibility_users vvu WHERE vvu.vendor_id = v.id AND vvu.user_id = ?) ORDER BY v.name`).all(userId);

  const dataRows = vendors.map((v, idx) => ({
    srNo: idx + 1,
    name: v.name || '',
    email: v.primary_email || '',
    mobile: v.primary_phone || '',
    address: v.address || '',
    details: v.summary || '',
  }));

  const wb = await buildLrsWorkbook(dataRows);
  const buf = await wb.xlsx.writeBuffer();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="LRS-vendor-details.xlsx"');
  res.send(buf);
});

// Excel Template download — must be before /:id routes
const TEMPLATE_VERSION = '2025-07-18-v3';
router.get('/import/template', requirePermission('Vendors', 'Read'), async (req, res) => {
  // Sr.No is informational only — system ignores it on import (auto-assigned)
  // added_by and added_date always come from session + server clock (audit integrity)
  const sample = [{
    srNo: 1,
    name: 'iThinker LLP',
    email: 'contact@example.com',
    mobile: '9876543210',
    address: '101 Tech Park, Mumbai 400001',
    details: 'Brief description of the vendor and their services',
  }];
  const wb = await buildLrsWorkbook(sample);
  const buf = await wb.xlsx.writeBuffer();

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="LRS-vendor-import-template-${TEMPLATE_VERSION}.xlsx"`);
  res.setHeader('X-Template-Version', TEMPLATE_VERSION);
  res.send(buf);
});

// Excel Import (accepts .xlsx files matching LRS template: Sr.No, Name, Email, Mobile, Address, Details)
const multer = require('multer');
const xlsxUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ok = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      || file.originalname.toLowerCase().endsWith('.xlsx');
    if (ok) cb(null, true);
    else cb(new Error('Only .xlsx Excel files are accepted for import'));
  },
});

router.post('/import', requirePermission('Vendors', 'Edit'), xlsxUpload.single('file'), (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Excel (.xlsx) file required' });

    const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

    if (!rows.length) return res.status(400).json({ error: 'No data rows found in the Excel file' });

    // C-7: Row limit
    const MAX_ROWS = 500;
    if (rows.length > MAX_ROWS) return res.status(400).json({ error: `Import limit is ${MAX_ROWS} rows per file` });

    // Normalise header keys (trim + lowercase for matching)
    const normalise = (obj) => {
      const out = {};
      for (const k of Object.keys(obj)) out[k.trim().toLowerCase()] = String(obj[k]).trim();
      return out;
    };

    const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
    const today = new Date().toISOString().split('T')[0];

    const insertVendor = db.prepare(`
      INSERT INTO vendors (name, primary_email, primary_phone, address, summary, logo_initial, logo_color, added_by, added_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    let imported = 0;
    const logs = [];

    const importAll = db.transaction(() => {
      rows.forEach((rawRow, idx) => {
        const rowNum = idx + 2; // +2: 1-indexed + header row
        const row = normalise(rawRow);

        const name = row['name'] || row['name '] || '';
        if (!name) {
          logs.push({ row: rowNum, status: 'failed', name: '(empty)', reason: "Required column 'Name' is empty" });
          return;
        }

        // Check duplicate name
        const existing = db.prepare('SELECT id FROM vendors WHERE LOWER(name) = LOWER(?)').get(name);
        if (existing) {
          logs.push({ row: rowNum, status: 'failed', name, reason: `Vendor '${name}' already exists (ID ${existing.id})` });
          return;
        }

        const email = row['email'] || row['email '] || null;
        const mobile = row['mobile'] || row['mobile '] || null;
        const address = row['address'] || row['address '] || null;
        const details = row['details'] || row['details '] || null;

        try {
          const color = COLORS[Math.floor(Math.random() * COLORS.length)];
          insertVendor.run(name, email || null, mobile || null, address || null, details || null,
            name[0].toUpperCase(), color, user?.username || 'import', today);
          imported++;
          logs.push({ row: rowNum, status: 'imported', name, reason: null });
        } catch (insertErr) {
          logs.push({ row: rowNum, status: 'failed', name, reason: insertErr.message });
        }
      });
    });
    importAll();

    const failed = logs.filter(l => l.status === 'failed').length;
    res.json({ data: { imported, failed, warned: 0, total: rows.length, logs } });
  } catch (err) {
    console.error('[vendors/import]', err);
    res.status(500).json({ error: 'Import failed' });
  }
});

// Vendor comparison — must be before /:id routes
router.get('/compare', requirePermission('Vendors', 'Read'), (req, res) => {
  const ids = (req.query.ids || '').split(',').map(Number).filter(Boolean).slice(0, 4);
  if (ids.length < 2) return res.status(400).json({ error: 'At least 2 vendor IDs required' });
  const userId = req.session.userId;
  const isAdmin = (() => { const u = db.prepare('SELECT group_id FROM users WHERE id=?').get(userId); return u?.group_id === 1; })();
  const result = ids.map(id => {
    // M-13: Apply same visibility filter as the list endpoint
    let v;
    if (isAdmin) {
      v = db.prepare('SELECT * FROM vendors WHERE id = ?').get(id);
    } else {
      v = db.prepare(`SELECT * FROM vendors WHERE id = ? AND (visibility = 'everyone' OR visibility IS NULL OR EXISTS (SELECT 1 FROM vendor_visibility_users vvu WHERE vvu.vendor_id = ? AND vvu.user_id = ?))`).get(id, id, userId);
    }
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

// Dashboard stats — must be before /:id routes
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

router.post('/', requirePermission('Vendors', 'Edit'), auditLog('Vendor', 'CREATE', (req, body) => body?.data?.id), (req, res) => {
  try {
    const { name, gstin, website, address, geo_scope, empanelment_status, tier, vendor_type, summary, domains = [], tags = [], contacts = [] } = req.body;
    if (!name) return res.status(400).json({ error: 'Vendor name is required' });

    const initial = name.charAt(0).toUpperCase();
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];

    const user = db.prepare('SELECT id, username, group_id, reporting_manager_id FROM users WHERE id = ?').get(req.session.userId);
    const isAdmin = user?.group_id === 1;
    const today = new Date().toISOString().split('T')[0];
    // If user has a reporting manager, send for approval
    const approvalStatus = (!isAdmin && user?.reporting_manager_id) ? 'pending_review' : 'approved';
    const reviewerId = user?.reporting_manager_id || null;

    const result = db.prepare(`
      INSERT INTO vendors (name, gstin, website, address, geo_scope, empanelment_status, tier, vendor_type, summary, logo_initial, logo_color, added_by, added_date, approval_status, approval_requested_by, approval_reviewer_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, gstin || null, website || null, address || null, geo_scope || null,
      empanelment_status || 'In Evaluation', tier || 'Tier 2', vendor_type || null,
      summary || null, initial, color, user ? user.username : 'admin', today, approvalStatus, user?.id || null, reviewerId);

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

router.put('/:id', requirePermission('Vendors', 'Edit'), auditLog('Vendor', 'UPDATE', (req) => req.params.id), (req, res) => {
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

// Certifications — M-1: Add permission checks
router.get('/:id/certifications', requirePermission('Vendors', 'Read'), (req, res) => {
  const rows = db.prepare('SELECT * FROM certifications WHERE vendor_id = ?').all(req.params.id);
  res.json({ data: rows });
});

router.post('/:id/certifications', requirePermission('Vendors', 'Edit'), (req, res) => {
  const { name, issuer, expiry, is_valid } = req.body;
  const result = db.prepare('INSERT INTO certifications (vendor_id, name, issuer, expiry, is_valid) VALUES (?, ?, ?, ?, ?)').run(req.params.id, name, issuer, expiry, is_valid !== false ? 1 : 0);
  res.status(201).json({ data: db.prepare('SELECT * FROM certifications WHERE id = ?').get(result.lastInsertRowid) });
});

router.delete('/:id/certifications/:certId', requirePermission('Vendors', 'Full'), (req, res) => {
  db.prepare('DELETE FROM certifications WHERE id = ? AND vendor_id = ?').run(req.params.certId, req.params.id);
  res.json({ data: { success: true } });
});

// ─── Vendor Visibility ───────────────────────────────────────────────────────

// Get visibility settings for a vendor
router.get('/:id/visibility', requirePermission('Vendors', 'Read'), (req, res) => {
  const vendor = db.prepare('SELECT id, visibility FROM vendors WHERE id = ?').get(req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Not found' });
  const users = db.prepare(`
    SELECT u.id, u.name, u.username, u.email FROM vendor_visibility_users vvu
    JOIN users u ON u.id = vvu.user_id WHERE vvu.vendor_id = ?
  `).all(req.params.id);
  res.json({ data: { visibility: vendor.visibility || 'everyone', users } });
});

// Update visibility settings (admin only)
router.put('/:id/visibility', requirePermission('Vendors', 'Full'), (req, res) => {
  const { visibility, userIds } = req.body;
  if (!['everyone', 'selected'].includes(visibility)) return res.status(400).json({ error: 'Invalid visibility' });
  db.prepare('UPDATE vendors SET visibility=? WHERE id=?').run(visibility, req.params.id);
  db.prepare('DELETE FROM vendor_visibility_users WHERE vendor_id=?').run(req.params.id);
  if (visibility === 'selected' && Array.isArray(userIds)) {
    const ins = db.prepare('INSERT OR IGNORE INTO vendor_visibility_users (vendor_id, user_id) VALUES (?, ?)');
    db.transaction(() => { userIds.forEach(uid => ins.run(req.params.id, uid)); })();
  }
  res.json({ data: { success: true } });
});

// ─── Vendor Approval Workflow ─────────────────────────────────────────────────

// Get approval status + notes
router.get('/:id/approval', requirePermission('Vendors', 'Read'), (req, res) => {
  const vendor = db.prepare(`
    SELECT v.id, v.name, v.approval_status, v.approval_requested_by, v.approval_reviewer_id,
           u1.name as requester_name, u1.username as requester_username,
           u2.name as reviewer_name, u2.username as reviewer_username
    FROM vendors v
    LEFT JOIN users u1 ON u1.id = v.approval_requested_by
    LEFT JOIN users u2 ON u2.id = v.approval_reviewer_id
    WHERE v.id = ?
  `).get(req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Not found' });
  const notes = db.prepare('SELECT van.*, u.name as user_name FROM vendor_approval_notes van LEFT JOIN users u ON u.id = van.user_id WHERE van.vendor_id = ? ORDER BY van.created_at ASC').all(req.params.id);
  res.json({ data: { ...vendor, notes } });
});

// Submit for approval
router.post('/:id/approval/submit', requirePermission('Vendors', 'Edit'), (req, res) => {
  const user = db.prepare('SELECT id, username, reporting_manager_id FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Not authenticated' });
  const reviewer_id = user.reporting_manager_id || null;
  db.prepare('UPDATE vendors SET approval_status=?, approval_requested_by=?, approval_reviewer_id=? WHERE id=?')
    .run('pending_review', user.id, reviewer_id, req.params.id);
  if (req.body.note) {
    db.prepare('INSERT INTO vendor_approval_notes (vendor_id, user_id, username, role, note) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, user.id, user.username, 'requester', req.body.note);
  }
  res.json({ data: { success: true } });
});

// Approve / Reject (reviewer / admin) — H-10: Only the assigned reviewer or admin may act
router.post('/:id/approval/review', requirePermission('Vendors', 'Edit'), (req, res) => {
  const { action, note } = req.body;
  if (!['approve', 'reject'].includes(action)) return res.status(400).json({ error: 'action must be approve or reject' });
  const user = db.prepare('SELECT id, username, group_id FROM users WHERE id = ?').get(req.session.userId);
  const isAdmin = user?.group_id === 1;
  // H-10: Non-admins must be the assigned reviewer
  if (!isAdmin) {
    const vendor = db.prepare('SELECT approval_reviewer_id FROM vendors WHERE id=?').get(req.params.id);
    if (!vendor) return res.status(404).json({ error: 'Vendor not found' });
    if (vendor.approval_reviewer_id !== user.id) {
      return res.status(403).json({ error: 'You are not the assigned reviewer for this vendor' });
    }
  }
  const status = action === 'approve' ? 'approved' : 'rejected';
  db.prepare('UPDATE vendors SET approval_status=? WHERE id=?').run(status, req.params.id);
  if (note) {
    db.prepare('INSERT INTO vendor_approval_notes (vendor_id, user_id, username, role, note) VALUES (?, ?, ?, ?, ?)')
      .run(req.params.id, user.id, user.username, 'reviewer', note);
  }
  res.json({ data: { success: true, status } });
});

// Add note to approval thread
router.post('/:id/approval/note', requirePermission('Vendors', 'Read'), (req, res) => {
  const { note } = req.body;
  if (!note?.trim()) return res.status(400).json({ error: 'Note required' });
  const user = db.prepare('SELECT id, username FROM users WHERE id = ?').get(req.session.userId);
  const r = db.prepare('INSERT INTO vendor_approval_notes (vendor_id, user_id, username, role, note) VALUES (?, ?, ?, ?, ?)')
    .run(req.params.id, user.id, user.username, 'comment', note.trim());
  res.status(201).json({ data: db.prepare('SELECT * FROM vendor_approval_notes WHERE id=?').get(r.lastInsertRowid) });
});

module.exports = router;
