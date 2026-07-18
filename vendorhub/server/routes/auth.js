const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { db } = require('../db');
const router = express.Router();

// H-3: Brute-force protection — 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts. Please try again later.' },
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND status = ?').get(username, 'active');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.userId = user.id;
    db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);

    const group = user.group_id ? db.prepare('SELECT id, name, color, access_level FROM groups WHERE id = ?').get(user.group_id) : null;
    const isAdmin = user.group_id === 1;

    // Load permissions for non-admin users
    const permissions = isAdmin ? [] : db.prepare('SELECT module, access_level FROM permissions WHERE group_id = ?').all(user.group_id || 0);

    res.json({ data: { id: user.id, name: user.name, username: user.username, email: user.email, group_id: user.group_id, group, department: user.department, isAdmin, permissions } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ data: { success: true } });
  });
});

router.get('/me', (req, res) => {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const user = db.prepare('SELECT id, name, email, username, group_id, department, status FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });
  const group = user.group_id ? db.prepare('SELECT id, name, color, access_level FROM groups WHERE id = ?').get(user.group_id) : null;
  const isAdmin = user.group_id === 1;
  const permissions = isAdmin ? [] : db.prepare('SELECT module, access_level FROM permissions WHERE group_id = ?').all(user.group_id || 0);
  res.json({ data: { ...user, group, isAdmin, permissions } });
});

// Update own profile (name, email, password)
router.put('/profile', async (req, res) => {
  if (!req.session?.userId) return res.status(401).json({ error: 'Unauthorized' });
  const { name, email, currentPassword, newPassword } = req.body;
  try {
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const updates = {};
    if (name && name.trim()) updates.name = name.trim();
    if (email !== undefined) updates.email = email.trim() || null;

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ error: 'Current password required to set a new password' });
      const match = await bcrypt.compare(currentPassword, user.password_hash);
      if (!match) return res.status(400).json({ error: 'Current password is incorrect' });
      if (newPassword.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
      updates.password_hash = await bcrypt.hash(newPassword, 12);
    }

    if (Object.keys(updates).length === 0) return res.status(400).json({ error: 'Nothing to update' });

    const setClauses = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    db.prepare(`UPDATE users SET ${setClauses} WHERE id = ?`).run(...Object.values(updates), user.id);

    const updated = db.prepare('SELECT id, name, email, username, group_id, department, status FROM users WHERE id = ?').get(user.id);
    res.json({ data: updated });
  } catch (e) {
    if (e.message?.includes('UNIQUE')) return res.status(400).json({ error: 'That email is already used by another account' });
    console.error('[auth/profile]', e);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
