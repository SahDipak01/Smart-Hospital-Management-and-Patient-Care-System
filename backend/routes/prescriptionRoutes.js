const express = require('express');
const router = express.Router();
const { getPrescriptions, getPrescriptionById, createPrescription } = require('../controllers/prescriptionController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', protect, getPrescriptions);
router.get('/:id', protect, getPrescriptionById);
router.post('/', protect, authorize('doctor', 'admin'), createPrescription);

module.exports = router;
