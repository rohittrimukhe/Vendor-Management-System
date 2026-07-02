const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const router = express.Router();

router.use(requireAuth);

// All tasks assigned to current user
router.get('/', (req, res) => {
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const rows = db.prepare(`
    SELECT t.*, v.name as vendor_name, v.id as vendor_id FROM vendor_tasks t
    JOIN vendors v ON v.id = t.vendor_id
    WHERE t.assigned_to_id = ? OR (t.assigned_to = ? AND t.assigned_to_id IS NULL)
    ORDER BY
      CASE t.status WHEN 'Open' THEN 0 WHEN 'In Progress' THEN 1 ELSE 2 END,
      CASE t.priority WHEN 'Urgent' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
      t.due_date ASC
  `).all(req.session.userId, user.username);

  res.json({ data: rows });
});

// Quick summary counts
router.get('/summary', (req, res) => {
  const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
  const open = db.prepare(`SELECT COUNT(*) as c FROM vendor_tasks WHERE (assigned_to_id=? OR assigned_to=?) AND status='Open'`).get(req.session.userId, user?.username || '').c;
  const inProgress = db.prepare(`SELECT COUNT(*) as c FROM vendor_tasks WHERE (assigned_to_id=? OR assigned_to=?) AND status='In Progress'`).get(req.session.userId, user?.username || '').c;
  const overdue = db.prepare(`SELECT COUNT(*) as c FROM vendor_tasks WHERE (assigned_to_id=? OR assigned_to=?) AND status!='Done' AND due_date < date('now')`).get(req.session.userId, user?.username || '').c;
  res.json({ data: { open, inProgress, overdue } });
});

module.exports = router;
