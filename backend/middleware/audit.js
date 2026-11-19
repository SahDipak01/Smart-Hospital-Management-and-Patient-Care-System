const AuditLog = require('../models/AuditLog');

const logAudit = async ({ req, user, action, entity, entityId, details }) => {
  try {
    const actorUser = user || (req && req.user);
    const ip = req ? (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1') : '127.0.0.1';
    const userAgent = req ? req.headers['user-agent'] : 'System Internal';

    await AuditLog.create({
      user: actorUser?._id || null,
      userEmail: actorUser?.email || 'system@apexsmarthealth.org',
      userRole: actorUser?.role || 'system',
      action,
      entity,
      entityId: String(entityId || ''),
      details: details || {},
      ipAddress: String(ip),
      userAgent: String(userAgent || ''),
    });
  } catch (err) {
    console.error('[Audit Logger Error]', err.message);
  }
};

module.exports = { logAudit };
