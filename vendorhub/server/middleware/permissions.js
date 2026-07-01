const { db } = require('../db');

function requirePermission(module, minLevel = 'Read') {
  const levels = ['None', 'Read', 'Edit', 'Full'];
  return function (req, res, next) {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const user = db.prepare('SELECT group_id FROM users WHERE id = ?').get(req.session.userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // System Administrator group (id=1) always has full access
    if (user.group_id === 1) return next();

    const perm = db.prepare('SELECT access_level FROM permissions WHERE group_id = ? AND module = ?').get(user.group_id, module);
    const userLevel = perm ? perm.access_level : 'None';

    if (levels.indexOf(userLevel) >= levels.indexOf(minLevel)) {
      return next();
    }
    return res.status(403).json({ error: 'Forbidden: insufficient permissions' });
  };
}

module.exports = { requirePermission };
