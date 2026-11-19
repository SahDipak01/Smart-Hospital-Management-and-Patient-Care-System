const express = require('express');
const router = express.Router();
const {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  assignDoctorToDepartment,
  toggleDepartmentStatus,
} = require('../controllers/departmentController');
const { protect } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

// Department Catalog
router.get('/', getAllDepartments);
router.get('/:id', getDepartmentById);

// Admin Department Operations
router.post('/', protect, authorize('admin'), createDepartment);
router.put('/:id', protect, authorize('admin'), updateDepartment);
router.patch('/:id/assign-doctor', protect, authorize('admin'), assignDoctorToDepartment);
router.patch('/:id/status', protect, authorize('admin'), toggleDepartmentStatus);

module.exports = router;
