const express = require('express');
const bcrypt = require('bcrypt');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', (req, res) => {
  const users = db.prepare(`
    SELECT u.id, u.name, u.email, u.username, u.group_id, u.department, u.status,
           u.last_login, u.created_at, u.reporting_manager_id,
           g.name as group_name, g.color as group_color,
           m.name as manager_name
    FROM users u
    LEFT JOIN groups g ON g.id = u.group_id
    LEFT JOIN users m ON m.id = u.reporting_manager_id
    ORDER BY u.created_at DESC
  `).all();
  res.json({ data: users });
});

router.post('/', async (req, res) => {
  try {
    const { name, email, username, password, group_id, department, reporting_manager_id } = req.body;
    if (!name || !username || !password) return res.status(400).json({ error: 'Name, username and password required' });
    const hash = await bcrypt.hash(password, 12);
    const result = db.prepare(
      'INSERT INTO users (name, email, username, password_hash, group_id, department, reporting_manager_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(name, email || null, username, hash, group_id || null, department || null, reporting_manager_id || null);
    const user = db.prepare('SELECT id, name, email, username, group_id, department, status, reporting_manager_id FROM users WHERE id = ?').get(result.lastInsertRowid);
    res.status(201).json({ data: user });
  } catch (err) {
    if (err.message.includes('UNIQUE')) return res.status(400).json({ error: 'Username or email already exists' });
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { name, email, group_id, department, status, password, reporting_manager_id } = req.body;
    if (password) {
      const hash = await bcrypt.hash(password, 12);
      db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.params.id);
    }
    if (name !== undefined) {
      db.prepare(
        'UPDATE users SET name=?, email=?, group_id=?, department=?, status=?, reporting_manager_id=? WHERE id=?'
      ).run(name, email || null, group_id || null, department || null, status || 'active', reporting_manager_id || null, req.params.id);
    }
    const user = db.prepare('SELECT id, name, email, username, group_id, department, status, reporting_manager_id FROM users WHERE id = ?').get(req.params.id);
    res.json({ data: user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reset-password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) return res.status(400).json({ error: 'Password required' });
    const hash = await bcrypt.hash(password, 12);
    db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, req.params.id);
    res.json({ data: { success: true } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/toggle-status', (req, res) => {
  // Prevent deactivating self
  if (parseInt(req.params.id) === req.session.userId) return res.status(400).json({ error: 'Cannot deactivate your own account' });
  const user = db.prepare('SELECT status FROM users WHERE id = ?').get(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const newStatus = user.status === 'active' ? 'inactive' : 'active';
  db.prepare('UPDATE users SET status=? WHERE id=?').run(newStatus, req.params.id);
  res.json({ data: { status: newStatus } });
});

router.delete('/:id', (req, res) => {
  if (parseInt(req.params.id) === req.session.userId) return res.status(400).json({ error: 'Cannot delete your own account' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.json({ data: { success: true } });
});

module.exports = router;
