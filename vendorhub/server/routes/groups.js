const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', (req, res) => {
  const groups = db.prepare('SELECT g.*, (SELECT COUNT(*) FROM users WHERE group_id=g.id) as user_count FROM groups g ORDER BY g.id').all();
  res.json({ data: groups });
});

router.post('/', (req, res) => {
  const { name, description, access_level, color } = req.body;
  if (!name) return res.status(400).json({ error: 'Name required' });
  const result = db.prepare('INSERT INTO groups (name, description, access_level, color) VALUES (?, ?, ?, ?)').run(name, description || null, access_level || 'Read', color || '#29ABE2');
  res.status(201).json({ data: db.prepare('SELECT * FROM groups WHERE id = ?').get(result.lastInsertRowid) });
});

router.put('/:id', (req, res) => {
  if (req.params.id === '1') return res.status(400).json({ error: 'Cannot modify System Administrator group' });
  const { name, description, access_level, color } = req.body;
  db.prepare('UPDATE groups SET name=?, description=?, access_level=?, color=? WHERE id=?').run(name, description || null, access_level || 'Read', color || '#29ABE2', req.params.id);
  res.json({ data: db.prepare('SELECT * FROM groups WHERE id = ?').get(req.params.id) });
});

router.delete('/:id', (req, res) => {
  if (req.params.id === '1') return res.status(400).json({ error: 'Cannot delete System Administrator group' });
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users WHERE group_id = ?').get(req.params.id).c;
  if (userCount > 0) return res.status(400).json({ error: 'Cannot delete group with assigned users' });
  db.prepare('DELETE FROM permissions WHERE group_id = ?').run(req.params.id);
  db.prepare('DELETE FROM groups WHERE id = ?').run(req.params.id);
  res.json({ data: { success: true } });
});

router.get('/:id/permissions', (req, res) => {
  const perms = db.prepare('SELECT * FROM permissions WHERE group_id = ?').all(req.params.id);
  res.json({ data: perms });
});

router.post('/:id/permissions', (req, res) => {
  if (req.params.id === '1') return res.status(400).json({ error: 'System Administrator permissions cannot be changed' });
  const { permissions } = req.body;
  const deleteExisting = db.prepare('DELETE FROM permissions WHERE group_id = ?');
  const insert = db.prepare('INSERT INTO permissions (group_id, module, access_level) VALUES (?, ?, ?)');
  const doIt = db.transaction(() => {
    deleteExisting.run(req.params.id);
    for (const p of permissions) insert.run(req.params.id, p.module, p.access_level);
  });
  doIt();
  res.json({ data: { success: true } });
});

module.exports = router;
