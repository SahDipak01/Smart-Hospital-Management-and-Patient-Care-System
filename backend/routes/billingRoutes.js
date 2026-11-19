const express = require('express');
const router = express.Router();
const {
  getBills,
  getBillById,
  generateBill,
  recordPayment,
} = require('../controllers/billingController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/', protect, getBills);
router.get('/:id', protect, getBillById);
router.post('/generate', protect, authorize('admin', 'staff'), generateBill);
router.post('/:id/payment', protect, authorize('admin', 'staff', 'patient'), recordPayment);

module.exports = router;
