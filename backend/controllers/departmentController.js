const Department = require('../models/Department');
const Doctor = require('../models/Doctor');
const { logAudit } = require('../middleware/audit');

// @desc Get all departments with search, filtering, and doctor count
// @route GET /api/departments
const getAllDepartments = async (req, res, next) => {
  try {
    const { search, isActive } = req.query;
    let query = {};

    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (search) {
      query.$or = [
        { code: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { floor: { $regex: search, $options: 'i' } },
      ];
    }

    const departments = await Department.find(query)
      .populate('headDoctor', 'firstName lastName specialization doctorId phone')
      .sort({ name: 1 });

    // Aggregate doctor count for each department
    const departmentsWithDoctors = await Promise.all(
      departments.map(async (dept) => {
        const doctorCount = await Doctor.countDocuments({ department: dept._id });
        return {
          ...dept.toObject(),
          doctorCount,
        };
      })
    );

    res.json({
      success: true,
      count: departmentsWithDoctors.length,
      departments: departmentsWithDoctors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get department by ID along with its assigned medical team
// @route GET /api/departments/:id
const getDepartmentById = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id).populate('headDoctor');
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const doctors = await Doctor.find({ department: department._id })
      .populate('user', 'email avatar isActive')
      .sort({ firstName: 1 });

    res.json({
      success: true,
      department,
      doctors,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create department (Admin)
// @route POST /api/departments
const createDepartment = async (req, res, next) => {
  try {
    const { code, name, description, headDoctor, floor, contactPhone, icon } = req.body;

    if (!code || !name) {
      return res.status(400).json({ success: false, message: 'Department code and name are required.' });
    }

    const existing = await Department.findOne({ code: code.toUpperCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'A department with this unique code already exists.' });
    }

    const department = await Department.create({
      code: code.toUpperCase().trim(),
      name: name.trim(),
      description: description || '',
      headDoctor: headDoctor || null,
      floor: floor || '1st Floor',
      contactPhone: contactPhone || '',
      icon: icon || 'Activity',
      isActive: true,
    });

    await logAudit({
      req,
      action: 'DEPARTMENT_CREATE',
      entity: 'Department',
      entityId: department._id,
      details: { code: department.code, name: department.name },
    });

    res.status(201).json({ success: true, department });
  } catch (error) {
    next(error);
  }
};

// @desc Update department details (Admin)
// @route PUT /api/departments/:id
const updateDepartment = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const allowedFields = ['name', 'description', 'headDoctor', 'floor', 'contactPhone', 'icon', 'isActive'];
    allowedFields.forEach((f) => {
      if (req.body[f] !== undefined) {
        department[f] = req.body[f];
      }
    });

    if (req.body.code && req.body.code !== department.code) {
      const codeTaken = await Department.findOne({ code: req.body.code.toUpperCase().trim(), _id: { $ne: department._id } });
      if (codeTaken) {
        return res.status(400).json({ success: false, message: 'Department code is already taken.' });
      }
      department.code = req.body.code.toUpperCase().trim();
    }

    await department.save();

    await logAudit({
      req,
      action: 'DEPARTMENT_UPDATE',
      entity: 'Department',
      entityId: department._id,
      details: { code: department.code, name: department.name },
    });

    res.json({ success: true, department });
  } catch (error) {
    next(error);
  }
};

// @desc Assign or transfer a doctor to a department (Admin)
// @route PATCH /api/departments/:id/assign-doctor
const assignDoctorToDepartment = async (req, res, next) => {
  try {
    const { doctorId } = req.body;
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    const doctor = await Doctor.findById(doctorId);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const previousDept = doctor.department;
    doctor.department = department._id;
    await doctor.save();

    await logAudit({
      req,
      action: 'DOCTOR_DEPARTMENT_REASSIGNED',
      entity: 'Doctor',
      entityId: doctor._id,
      details: {
        doctorName: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        previousDepartment: previousDept,
        newDepartment: department._id,
      },
    });

    res.json({
      success: true,
      message: `Dr. ${doctor.firstName} ${doctor.lastName} successfully assigned to ${department.name}`,
      doctor,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Toggle department active/inactive status (Admin)
// @route PATCH /api/departments/:id/status
const toggleDepartmentStatus = async (req, res, next) => {
  try {
    const department = await Department.findById(req.params.id);
    if (!department) {
      return res.status(404).json({ success: false, message: 'Department not found' });
    }

    department.isActive = !department.isActive;
    await department.save();

    await logAudit({
      req,
      action: 'DEPARTMENT_STATUS_TOGGLED',
      entity: 'Department',
      entityId: department._id,
      details: { code: department.code, isActive: department.isActive },
    });

    res.json({
      success: true,
      message: `Department ${department.name} is now ${department.isActive ? 'Active' : 'Inactive'}`,
      department,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDepartments,
  getDepartmentById,
  createDepartment,
  updateDepartment,
  assignDoctorToDepartment,
  toggleDepartmentStatus,
};
