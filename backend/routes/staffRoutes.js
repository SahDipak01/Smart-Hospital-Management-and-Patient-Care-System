const express = require('express');
const router = express.Router();
const { getAllStaff, createStaff, updateStaff } = require('../controllers/staffController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', protect, authorize('admin'), getAllStaff);
router.post('/', protect, authorize('admin'), createStaff);
router.put('/:id', protect, authorize('admin'), updateStaff);

module.exports = router;
