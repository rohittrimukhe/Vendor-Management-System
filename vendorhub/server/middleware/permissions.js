const { db } = require('../db');

const LEVELS = ['None', 'Read', 'Edit', 'Full'];

function getUserGroup(userId) {
  const user = db.prepare('SELECT group_id FROM users WHERE id = ?').get(userId);
  return user ? user.group_id : null;
}

function requirePermission(module, minLevel = 'Read') {
  return function (req, res, next) {
    if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
    const groupId = getUserGroup(req.session.userId);
    if (!groupId) return res.status(401).json({ error: 'Unauthorized' });
    // System Administrator always has full access
    if (groupId === 1) return next();
    const perm = db.prepare('SELECT access_level FROM permissions WHERE group_id = ? AND module = ?').get(groupId, module);
    const userLevel = perm ? perm.access_level : 'None';
    if (LEVELS.indexOf(userLevel) >= LEVELS.indexOf(minLevel)) return next();
    return res.status(403).json({ error: `Access denied: ${module} requires ${minLevel} permission` });
  };
}

function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) return res.status(401).json({ error: 'Unauthorized' });
  const groupId = getUserGroup(req.session.userId);
  if (groupId !== 1) return res.status(403).json({ error: 'Admin access required' });
  next();
}

module.exports = { requirePermission, requireAdmin };
