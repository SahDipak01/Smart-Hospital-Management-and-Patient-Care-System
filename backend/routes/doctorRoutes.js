const express = require('express');
const router = express.Router();
const {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  toggleDoctorApproval,
  toggleDoctorStatus,
  getDoctorSlots,
} = require('../controllers/doctorController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', getAllDoctors);
router.get('/:id', getDoctorById);
router.get('/:id/slots', getDoctorSlots);
router.post('/', protect, authorize('admin'), createDoctor);
router.put('/:id', protect, authorize('admin', 'doctor'), updateDoctor);
router.patch('/:id/approve', protect, authorize('admin'), toggleDoctorApproval);
router.patch('/:id/status', protect, authorize('admin'), toggleDoctorStatus);

module.exports = router;
