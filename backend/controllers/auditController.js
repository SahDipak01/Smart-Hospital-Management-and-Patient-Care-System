const AuditLog = require('../models/AuditLog');

// @desc Get audit logs (Admin only)
// @route GET /api/audit-logs
const getAuditLogs = async (req, res, next) => {
  try {
    const { action, entity, search, page = 1, limit = 50 } = req.query;
    let query = {};

    if (action && action !== 'All') query.action = action;
    if (entity && entity !== 'All') query.entity = entity;
    if (search) {
      query.$or = [
        { userEmail: { $regex: search, $options: 'i' } },
        { action: { $regex: search, $options: 'i' } },
        { entityId: { $regex: search, $options: 'i' } },
      ];
    }

    const total = await AuditLog.countDocuments(query);
    const logs = await AuditLog.find(query)
      .populate('user', 'name email role')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      logs,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAuditLogs };
