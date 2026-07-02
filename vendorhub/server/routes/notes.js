const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', requirePermission('Vendors', 'Read'), (req, res) => {
  const notes = db.prepare(`
    SELECT * FROM vendor_notes WHERE vendor_id = ? ORDER BY created_at DESC
  `).all(req.params.vendorId);
  res.json({ data: notes });
});

router.post('/', requirePermission('Vendors', 'Edit'), (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) return res.status(400).json({ error: 'Note content required' });
  const user = db.prepare('SELECT name, username FROM users WHERE id = ?').get(req.session.userId);
  const result = db.prepare(
    'INSERT INTO vendor_notes (vendor_id, content, created_by, created_by_id) VALUES (?, ?, ?, ?)'
  ).run(req.params.vendorId, content.trim(), user ? user.name : 'Unknown', req.session.userId);
  res.status(201).json({ data: db.prepare('SELECT * FROM vendor_notes WHERE id = ?').get(result.lastInsertRowid) });
});

router.delete('/:noteId', requirePermission('Vendors', 'Edit'), (req, res) => {
  const note = db.prepare('SELECT * FROM vendor_notes WHERE id = ? AND vendor_id = ?').get(req.params.noteId, req.params.vendorId);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  // Allow delete if own note or full permission
  const user = db.prepare('SELECT group_id FROM users WHERE id = ?').get(req.session.userId);
  if (note.created_by_id !== req.session.userId && user?.group_id !== 1) {
    return res.status(403).json({ error: 'Cannot delete another user\'s note' });
  }
  db.prepare('DELETE FROM vendor_notes WHERE id = ?').run(req.params.noteId);
  res.json({ data: { success: true } });
});

module.exports = router;
