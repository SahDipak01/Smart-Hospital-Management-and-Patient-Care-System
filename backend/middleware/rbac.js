const { logAudit } = require('./audit');

const STAFF_ROLES = ['staff', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'billing_staff'];

const authorize = (...roles) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required prior to permission verification.',
      });
    }

    // Check approval status for medical and operational personnel
    if (req.user.role !== 'admin' && req.user.role !== 'patient') {
      if (req.user.approvalStatus === 'Rejected') {
        return res.status(403).json({
          success: false,
          accountStatus: 'Rejected',
          message: `Your registration request was rejected by the administrator. Reason: ${req.user.rejectionReason || 'Verification criteria not met.'}`,
        });
      }

      if (!req.user.isApproved || req.user.approvalStatus === 'Pending') {
        return res.status(403).json({
          success: false,
          accountStatus: 'Pending',
          message: 'Your account registration is awaiting administrator approval. Please contact hospital administration.',
        });
      }
    }

    const userRole = req.user.role;
    const isDirectMatch = roles.includes(userRole);
    const isStaffMatch = roles.includes('staff') && STAFF_ROLES.includes(userRole);

    if (!isDirectMatch && !isStaffMatch) {
      try {
        await logAudit({
          req,
          action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
          entity: 'Route',
          entityId: req.originalUrl,
          details: {
            userRole: req.user.role,
            requiredRoles: roles,
            method: req.method,
            endpoint: req.originalUrl,
          },
        });
      } catch (logErr) {
        console.error('Failed to log unauthorized access:', logErr);
      }

      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to access this resource. Required role(s): ${roles.join(', ')}.`,
      });
    }

    next();
  };
};

module.exports = { authorize, STAFF_ROLES };
