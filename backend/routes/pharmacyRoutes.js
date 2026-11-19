const express = require('express');
const router = express.Router();
const {
  getInventory,
  addMedicine,
  updateMedicine,
  dispensePrescription,
  getDispenses,
} = require('../controllers/pharmacyController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

router.get('/inventory', protect, getInventory);
router.post('/inventory', protect, authorize('admin', 'staff'), addMedicine);
router.put('/inventory/:id', protect, authorize('admin', 'staff'), updateMedicine);
router.post('/dispense', protect, authorize('admin', 'staff'), dispensePrescription);
router.get('/dispenses', protect, authorize('admin', 'staff'), getDispenses);

module.exports = router;
