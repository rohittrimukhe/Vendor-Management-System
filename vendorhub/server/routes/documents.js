const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router({ mergeParams: true });

router.use(requireAuth);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../uploads', req.params.vendorId);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, unique);
  }
});

const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM documents WHERE vendor_id = ? ORDER BY uploaded_at DESC').all(req.params.vendorId);
  res.json({ data: rows });
});

router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
  const filePath = req.file.path;
  const result = db.prepare('INSERT INTO documents (vendor_id, name, type, size, file_path, uploaded_by) VALUES (?, ?, ?, ?, ?, ?)').run(
    req.params.vendorId, req.file.originalname, req.file.mimetype, req.file.size, filePath, user ? user.username : 'admin'
  );
  res.status(201).json({ data: db.prepare('SELECT * FROM documents WHERE id = ?').get(result.lastInsertRowid) });
});

router.get('/:docId/download', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND vendor_id = ?').get(req.params.docId, req.params.vendorId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (!fs.existsSync(doc.file_path)) return res.status(404).json({ error: 'File not found on disk' });
  res.download(doc.file_path, doc.name);
});

router.delete('/:docId', (req, res) => {
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND vendor_id = ?').get(req.params.docId, req.params.vendorId);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  try { if (fs.existsSync(doc.file_path)) fs.unlinkSync(doc.file_path); } catch {}
  db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.docId);
  res.json({ data: { success: true } });
});

module.exports = router;
