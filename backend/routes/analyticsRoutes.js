const express = require('express');
const router = express.Router();
const {
  getDashboardData,
  getDoctorSummary,
  getPatientSummary,
  globalSearch,
} = require('../controllers/analyticsController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Global Search (All authenticated roles)
router.get('/global-search', protect, globalSearch);

// Admin Analytics Dashboard
router.get('/dashboard', protect, authorize('admin', 'staff'), getDashboardData);

// Doctor Workbench Summary
router.get('/doctor-summary', protect, authorize('doctor', 'admin'), getDoctorSummary);

// Patient Portal Summary
router.get('/patient-summary', protect, authorize('patient', 'admin'), getPatientSummary);

module.exports = router;
