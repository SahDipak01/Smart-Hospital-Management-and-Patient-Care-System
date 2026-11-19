const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  getAllUsers,
  toggleUserStatus,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  getRegistrationApprovals,
  getApprovalStats,
  approveRegistration,
  rejectRegistration,
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');
const {
  validateRegister,
  validateLogin,
  validateChangePassword,
  validateForgotPassword,
  validateResetPassword,
} = require('../middleware/validator');

// Public authentication routes
router.post('/register', validateRegister, register);
router.post('/login', validateLogin, login);
router.post('/forgot-password', validateForgotPassword, forgotPassword);
router.put('/reset-password/:token', validateResetPassword, resetPassword);

// Authenticated session routes
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, validateChangePassword, changePassword);

// Administrative User Management & Registration Approvals
router.get('/users', protect, authorize('admin'), getAllUsers);
router.patch('/users/:id/status', protect, authorize('admin'), toggleUserStatus);
router.get('/approvals', protect, authorize('admin'), getRegistrationApprovals);
router.get('/approvals/stats', protect, authorize('admin'), getApprovalStats);
router.post('/approvals/:id/approve', protect, authorize('admin'), approveRegistration);
router.post('/approvals/:id/reject', protect, authorize('admin'), rejectRegistration);

module.exports = router;
