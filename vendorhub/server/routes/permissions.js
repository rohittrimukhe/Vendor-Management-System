const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

router.get('/', (req, res) => {
  const perms = db.prepare('SELECT * FROM permissions').all();
  res.json({ data: perms });
});

router.put('/', (req, res) => {
  const { permissions } = req.body; // array of {group_id, module, access_level}
  if (!Array.isArray(permissions)) return res.status(400).json({ error: 'permissions array required' });

  const deleteAll = db.prepare('DELETE FROM permissions');
  const insert = db.prepare('INSERT INTO permissions (group_id, module, access_level) VALUES (?, ?, ?)');

  const doIt = db.transaction(() => {
    deleteAll.run();
    for (const p of permissions) {
      insert.run(p.group_id, p.module, p.access_level);
    }
  });
  doIt();
  res.json({ data: { success: true } });
});

module.exports = router;
