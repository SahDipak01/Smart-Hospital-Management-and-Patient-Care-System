const express = require('express');
const router = express.Router();
const {
  getTests,
  createTest,
  getOrders,
  createOrder,
  updateOrder,
} = require('../controllers/labController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/tests', protect, getTests);
router.post('/tests', protect, authorize('admin', 'staff'), createTest);
router.get('/orders', protect, getOrders);
router.post('/orders', protect, authorize('doctor', 'admin', 'staff'), createOrder);
router.patch('/orders/:id', protect, authorize('doctor', 'admin', 'staff'), updateOrder);

module.exports = router;
