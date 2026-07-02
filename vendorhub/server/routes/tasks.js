const express = require('express');
const { db } = require('../db');
const requireAuth = require('../middleware/auth');
const { requirePermission } = require('../middleware/permissions');
const router = express.Router({ mergeParams: true });

router.use(requireAuth);

router.get('/', (req, res) => {
  const rows = db.prepare(`
    SELECT t.*, v.name as vendor_name FROM vendor_tasks t
    LEFT JOIN vendors v ON v.id = t.vendor_id
    WHERE t.vendor_id = ? ORDER BY
      CASE t.status WHEN 'Open' THEN 0 WHEN 'In Progress' THEN 1 ELSE 2 END,
      CASE t.priority WHEN 'Urgent' THEN 0 WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
      t.due_date ASC
  `).all(req.params.vendorId);
  res.json({ data: rows });
});

router.post('/', requirePermission('Vendors', 'Edit'), (req, res) => {
  const user = db.prepare('SELECT username, id FROM users WHERE id = ?').get(req.session.userId);
  const { title, description, assigned_to_id, due_date, priority, status } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  let assignedTo = null;
  if (assigned_to_id) {
    const u = db.prepare('SELECT username FROM users WHERE id = ?').get(assigned_to_id);
    assignedTo = u ? u.username : null;
  }

  const r = db.prepare(`
    INSERT INTO vendor_tasks (vendor_id, title, description, assigned_to, assigned_to_id, due_date, priority, status, created_by, created_by_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(req.params.vendorId, title, description || null, assignedTo, assigned_to_id || null, due_date || null,
    priority || 'Medium', status || 'Open', user?.username || 'system', req.session.userId);

  res.status(201).json({ data: db.prepare('SELECT * FROM vendor_tasks WHERE id = ?').get(r.lastInsertRowid) });
});

router.put('/:taskId', requirePermission('Vendors', 'Edit'), (req, res) => {
  const task = db.prepare('SELECT * FROM vendor_tasks WHERE id = ? AND vendor_id = ?').get(req.params.taskId, req.params.vendorId);
  if (!task) return res.status(404).json({ error: 'Task not found' });

  const { title, description, assigned_to_id, due_date, priority, status } = req.body;
  let assignedTo = task.assigned_to;
  if (assigned_to_id !== undefined) {
    if (assigned_to_id) {
      const u = db.prepare('SELECT username FROM users WHERE id = ?').get(assigned_to_id);
      assignedTo = u ? u.username : null;
    } else {
      assignedTo = null;
    }
  }

  const completedAt = status === 'Done' && task.status !== 'Done' ? new Date().toISOString() : task.completed_at;

  db.prepare(`
    UPDATE vendor_tasks SET title=?, description=?, assigned_to=?, assigned_to_id=?, due_date=?, priority=?, status=?, completed_at=?
    WHERE id = ?
  `).run(
    title || task.title, description ?? task.description, assignedTo, assigned_to_id ?? task.assigned_to_id,
    due_date ?? task.due_date, priority || task.priority, status || task.status, completedAt, req.params.taskId
  );

  res.json({ data: db.prepare('SELECT * FROM vendor_tasks WHERE id = ?').get(req.params.taskId) });
});

router.delete('/:taskId', requirePermission('Vendors', 'Edit'), (req, res) => {
  const task = db.prepare('SELECT * FROM vendor_tasks WHERE id = ? AND vendor_id = ?').get(req.params.taskId, req.params.vendorId);
  if (!task) return res.status(404).json({ error: 'Task not found' });
  db.prepare('DELETE FROM vendor_tasks WHERE id = ?').run(req.params.taskId);
  res.json({ data: { success: true } });
});

module.exports = router;
