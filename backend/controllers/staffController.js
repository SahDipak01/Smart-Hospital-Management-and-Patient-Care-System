const Staff = require('../models/Staff');
const User = require('../models/User');
const { logAudit } = require('../middleware/audit');

// @desc Get all staff members
// @route GET /api/staff
const getAllStaff = async (req, res, next) => {
  try {
    const { roleType, department } = req.query;
    let query = {};

    if (roleType && roleType !== 'All') query.roleType = roleType;
    if (department && department !== 'All') query.department = department;

    const staff = await Staff.find(query)
      .populate('department', 'name code floor')
      .populate('user', 'email avatar isActive')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: staff.length, staff });
  } catch (error) {
    next(error);
  }
};

// @desc Create new staff member
// @route POST /api/staff
const createStaff = async (req, res, next) => {
  try {
    const { firstName, lastName, email, phone, roleType, department, shift } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        name: `${firstName} ${lastName}`,
        email,
        password: 'Password@123',
        role: 'staff',
        phone,
      });
    }

    const count = await Staff.countDocuments();
    const staffId = `HMS-STF-${String(count + 101)}`;

    const member = await Staff.create({
      staffId,
      user: user._id,
      firstName,
      lastName,
      roleType,
      department: department || null,
      phone,
      shift: shift || 'Morning',
      status: 'Active',
    });

    user.profileRef = member._id;
    user.roleRefModel = 'Staff';
    await user.save();

    await logAudit({
      req,
      action: 'STAFF_CREATED',
      entity: 'Staff',
      entityId: member._id,
      details: { staffId, name: `${firstName} ${lastName}`, roleType },
    });

    res.status(201).json({ success: true, staff: member });
  } catch (error) {
    next(error);
  }
};

// @desc Update staff details
// @route PUT /api/staff/:id
const updateStaff = async (req, res, next) => {
  try {
    const member = await Staff.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!member) {
      return res.status(404).json({ success: false, message: 'Staff member not found' });
    }

    res.json({ success: true, staff: member });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllStaff,
  createStaff,
  updateStaff,
};
