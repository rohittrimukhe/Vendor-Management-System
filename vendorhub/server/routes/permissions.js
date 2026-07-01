const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requireAdmin } = require('../middleware/permissions');
const router = express.Router();

router.use(requireAuth);
router.use(requireAdmin);

router.get('/', (req, res) => {
  const perms = db.prepare('SELECT * FROM permissions').all();
  res.json({ data: perms });
});

router.put('/', (req, res) => {
  const { permissions } = req.body;
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions array required' });

  // Never overwrite System Administrator (group_id=1) permissions — they always have full access
  const filtered = permissions.filter(p => p.group_id !== 1);

  const deleteAll = db.prepare('DELETE FROM permissions WHERE group_id != 1');
  const insert = db.prepare('INSERT INTO permissions (group_id, module, access_level) VALUES (?, ?, ?)');

  const doIt = db.transaction(() => {
    deleteAll.run();
    for (const p of filtered) insert.run(p.group_id, p.module, p.access_level);
  });
  doIt();
  res.json({ data: { success: true } });
});

module.exports = router;
