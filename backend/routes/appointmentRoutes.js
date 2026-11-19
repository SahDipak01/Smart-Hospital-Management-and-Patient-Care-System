const express = require('express');
const router = express.Router();
const {
  getAllAppointments,
  getAppointmentById,
  bookAppointment,
  updateAppointmentStatus,
  checkInAppointment,
} = require('../controllers/appointmentController');
const { protect } = require('../middleware/auth');

router.get('/', protect, getAllAppointments);
router.get('/:id', protect, getAppointmentById);
router.post('/', protect, bookAppointment);
router.patch('/:id/status', protect, updateAppointmentStatus);
router.patch('/:id/check-in', protect, checkInAppointment);

module.exports = router;
