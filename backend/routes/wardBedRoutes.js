const express = require('express');
const router = express.Router();
const {
  getWards,
  createWard,
  getBedMatrix,
  updateBedStatus,
  admitPatient,
  dischargePatient,
  getAdmissions,
  transferBed,
} = require('../controllers/wardBedController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', protect, getWards);
router.post('/', protect, authorize('admin'), createWard);
router.get('/wards', protect, getWards);
router.post('/wards', protect, authorize('admin'), createWard);
router.get('/bed-matrix', protect, getBedMatrix);
router.patch('/beds/:id/status', protect, authorize('admin', 'staff'), updateBedStatus);

router.get('/admissions', protect, getAdmissions);
router.post('/admissions', protect, authorize('admin', 'doctor', 'staff'), admitPatient);
router.post('/admissions/:id/discharge', protect, authorize('admin', 'doctor', 'staff'), dischargePatient);
router.post('/admissions/:id/transfer', protect, authorize('admin', 'doctor', 'staff'), transferBed);

module.exports = router;
