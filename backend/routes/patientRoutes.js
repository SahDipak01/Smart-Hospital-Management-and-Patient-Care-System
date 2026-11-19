const express = require('express');
const router = express.Router();
const {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  getPatientTimeline,
  getPatientSelfRecord,
} = require('../controllers/patientController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', protect, authorize('admin', 'doctor', 'staff'), getAllPatients);
router.post('/', protect, authorize('admin', 'doctor', 'staff'), createPatient);
router.get('/me/record', protect, getPatientSelfRecord);
router.get('/:id', protect, getPatientById);
router.put('/:id', protect, updatePatient);
router.get('/:id/timeline', protect, getPatientTimeline);

module.exports = router;
