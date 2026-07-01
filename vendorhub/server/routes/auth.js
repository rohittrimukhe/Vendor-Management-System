const express = require('express');
const bcrypt = require('bcrypt');
const { db } = require('../db');
const router = express.Router();

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username and password required' });

    const user = db.prepare('SELECT * FROM users WHERE username = ? AND status = ?').get(username, 'active');
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) return res.status(401).json({ error: 'Invalid credentials' });

    req.session.userId = user.id;
    db.prepare("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?").run(user.id);

    const group = user.group_id ? db.prepare('SELECT name, color FROM groups WHERE id = ?').get(user.group_id) : null;
    res.json({ data: { id: user.id, name: user.name, username: user.username, email: user.email, group_id: user.group_id, group: group, department: user.department } });
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
  res.json({ data: { ...user, group } });
});

module.exports = router;
