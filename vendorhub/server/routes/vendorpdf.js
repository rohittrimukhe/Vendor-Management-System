const express = require('express');
const PDFDocument = require('pdfkit');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

router.get('/:id/pdf', (req, res) => {
  const vendor = db.prepare('SELECT * FROM vendors WHERE id = ?').get(req.params.id);
  if (!vendor) return res.status(404).json({ error: 'Vendor not found' });

  const contacts = db.prepare('SELECT * FROM contacts WHERE vendor_id = ?').all(req.params.id);
  const contracts = db.prepare('SELECT * FROM contracts WHERE vendor_id = ? ORDER BY start_date DESC').all(req.params.id);
  const certs = db.prepare('SELECT * FROM certifications WHERE vendor_id = ?').all(req.params.id);
  const domains = db.prepare('SELECT domain FROM vendor_domains WHERE vendor_id = ?').all(req.params.id).map(r => r.domain);
  const tags = db.prepare('SELECT tag FROM vendor_tags WHERE vendor_id = ?').all(req.params.id).map(r => r.tag);

  const NAVY = '#1C3C6E';
  const BLUE = '#29ABE2';

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${vendor.name.replace(/[^a-z0-9]/gi, '_')}_profile.pdf"`);
  doc.pipe(res);

  // Header
  doc.rect(0, 0, doc.page.width, 100).fill(NAVY);
  doc.fillColor('#fff').font('Helvetica-Bold').fontSize(24).text(vendor.name, 50, 30);
  doc.font('Helvetica').fontSize(11).fillColor('rgba(255,255,255,0.8)').text(
    [vendor.empanelment_status, vendor.tier, vendor.vendor_type].filter(Boolean).join(' • '), 50, 62
  );
  if (vendor.risk_level) {
    doc.fontSize(10).text(`Risk: ${vendor.risk_level}`, 50, 80);
  }

  doc.fillColor('#333').moveDown(3);
  let y = 120;

  const section = (title) => {
    doc.y = y;
    doc.rect(50, y, doc.page.width - 100, 22).fill('#F5F6FA');
    doc.fillColor(NAVY).font('Helvetica-Bold').fontSize(11).text(title, 56, y + 6);
    doc.fillColor('#333').font('Helvetica').fontSize(10);
    y += 30;
  };

  const field = (label, value) => {
    if (!value) return;
    doc.y = y;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#888').text(label.toUpperCase(), 50, y, { width: 120 });
    doc.font('Helvetica').fontSize(10).fillColor('#333').text(String(value), 175, y, { width: 370 });
    y += 18;
  };

  const checkPage = (needed = 40) => {
    if (y + needed > doc.page.height - 60) { doc.addPage(); y = 50; }
  };

  // Basic info
  section('Vendor Information');
  field('GSTIN', vendor.gstin);
  field('Website', vendor.website);
  field('Address', vendor.address);
  field('Geo Scope', vendor.geo_scope);
  field('Type', vendor.vendor_type);
  field('Tier', vendor.tier);
  field('Status', vendor.empanelment_status);
  field('Added On', vendor.added_date);
  y += 8;

  if (domains.length || tags.length) {
    checkPage(50);
    section('Domains & Tags');
    if (domains.length) field('Domains', domains.join(', '));
    if (tags.length) field('Tags', tags.join(', '));
    y += 8;
  }

  if (vendor.summary) {
    checkPage(60);
    section('Summary');
    doc.font('Helvetica').fontSize(10).fillColor('#333').text(vendor.summary, 50, y, { width: doc.page.width - 100, lineGap: 3 });
    y = doc.y + 16;
  }

  if (contacts.length) {
    checkPage(60);
    section('Key Contacts');
    contacts.forEach(c => {
      checkPage(24);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333').text(c.name || '—', 50, y);
      doc.font('Helvetica').fontSize(9).fillColor('#555').text([c.role, c.email, c.phone].filter(Boolean).join(' • '), 50, y + 12);
      y += 30;
    });
    y += 4;
  }

  if (contracts.length) {
    checkPage(80);
    section('Contracts');
    const colW = [120, 70, 70, 80, 80, 60];
    const headers = ['Type', 'Start', 'End', 'Value (₹)', 'Status', 'SLA'];
    let cx = 50;
    doc.font('Helvetica-Bold').fontSize(9).fillColor('#555');
    headers.forEach((h, i) => { doc.text(h, cx, y); cx += colW[i]; });
    y += 16;
    doc.moveTo(50, y).lineTo(doc.page.width - 50, y).strokeColor('#E8ECF0').stroke();
    y += 6;

    contracts.forEach(c => {
      checkPage(22);
      cx = 50;
      const row = [c.type || '—', c.start_date || '—', c.end_date || '—', c.value ? Number(c.value).toLocaleString() : '—', c.status || '—', c.sla ? c.sla.slice(0, 12) : '—'];
      doc.font('Helvetica').fontSize(9).fillColor('#333');
      row.forEach((v, i) => { doc.text(String(v), cx, y, { width: colW[i] - 4, ellipsis: true }); cx += colW[i]; });
      y += 18;
    });
    y += 8;
  }

  if (certs.length) {
    checkPage(60);
    section('Certifications');
    certs.forEach(c => {
      checkPage(20);
      doc.font('Helvetica-Bold').fontSize(10).fillColor('#333').text(c.name || '—', 50, y, { continued: true });
      doc.font('Helvetica').fontSize(9).fillColor('#555').text(` — ${c.issuer || ''}${c.expiry ? ' | Expires: ' + c.expiry : ''}`, { continued: false });
      y = doc.y + 8;
    });
  }

  // Footer
  const totalPages = 1;
  doc.fontSize(8).fillColor('#aaa').text(
    `Generated by VendorHub • ${new Date().toLocaleDateString('en-IN')}`,
    50, doc.page.height - 40, { align: 'center', width: doc.page.width - 100 }
  );

  doc.end();
});

module.exports = router;
