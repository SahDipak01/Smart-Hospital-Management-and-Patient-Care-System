const express = require('express');
const router = express.Router();
const { getRecords, getRecordById, createRecord } = require('../controllers/medicalRecordController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', protect, getRecords);
router.get('/:id', protect, getRecordById);
router.post('/', protect, authorize('doctor', 'admin'), createRecord);

module.exports = router;
