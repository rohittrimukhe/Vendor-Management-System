const { db } = require('../db');

function auditLog(entityType, action, getEntityId) {
  return function (req, res, next) {
    const originalJson = res.json.bind(res);
    res.json = function (body) {
      if (res.statusCode < 400 && req.session && req.session.userId) {
        try {
          const user = db.prepare('SELECT username FROM users WHERE id = ?').get(req.session.userId);
          const entityId = getEntityId ? getEntityId(req, body) : null;
          let details = '';
          if (action === 'CREATE' && body?.data?.name) details = body.data.name;
          else if (action === 'UPDATE' && req.body?.name) details = req.body.name;
          else if (action === 'DELETE') details = `ID ${req.params.id || entityId}`;
          db.prepare(
            'INSERT INTO audit_log (user_id, username, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)'
          ).run(
            req.session.userId,
            user ? user.username : 'unknown',
            action,
            entityType,
            entityId || parseInt(req.params.id) || null,
            details || null,
            req.ip || req.connection?.remoteAddress || null
          );
        } catch {}
      }
      return originalJson(body);
    };
    next();
  };
}

module.exports = { auditLog };
