const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');
const Department = require('../models/Department');
const { logAudit } = require('../middleware/audit');
const { STAFF_ROLES } = require('../middleware/rbac');

const ALL_STAFF_ROLES = ['staff', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'billing_staff'];

const generateToken = (id) => {
  return jwt.sign(
    { id },
    process.env.JWT_SECRET || 'smart_hospital_super_secure_jwt_secret_key_2026_production',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// @desc Dynamic User Registration for all supported roles
// @route POST /api/auth/register
const register = async (req, res, next) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      role = 'patient',
      // Patient fields
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContact,
      allergies,
      // Doctor & Staff fields
      departmentId,
      specialization,
      licenseNumber,
      qualifications,
      qualification,
      experienceYears,
      consultationFee,
      roomNumber,
      deskNumber,
      shiftPreference,
      bio,
    } = req.body;

    // 1. Security Check: Block public Administrator registration
    const targetRole = String(role).toLowerCase().trim();
    if (targetRole === 'admin' || targetRole === 'administrator') {
      return res.status(400).json({
        success: false,
        message: 'Security Alert: Administrator accounts cannot be created via public registration.',
      });
    }

    // 2. Prevent Duplicate Email Registrations
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists. Please sign in or use another email.',
      });
    }

    // 3. Name Parsing
    const nameParts = (name || '').trim().split(' ');
    const firstName = nameParts[0] || 'User';
    const lastName = nameParts.slice(1).join(' ') || '';

    // =========================================================================
    // BRANCH A: PATIENT REGISTRATION (Immediate Active Access)
    // =========================================================================
    if (targetRole === 'patient') {
      const user = await User.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password,
        role: 'patient',
        phone: (phone || '').trim(),
        isApproved: true,
        approvalStatus: 'Approved',
        isActive: true,
      });

      const count = await Patient.countDocuments();
      const uhid = `HMS-P-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

      const patient = await Patient.create({
        uhid,
        user: user._id,
        firstName,
        lastName,
        dateOfBirth: dateOfBirth || new Date(1995, 0, 1),
        gender: gender || 'Other',
        bloodGroup: bloodGroup || 'Unknown',
        phone: phone || '',
        email: email.toLowerCase().trim(),
        address: address || {},
        emergencyContact: emergencyContact || {},
        allergies: allergies || [],
      });

      user.profileRef = patient._id;
      user.roleRefModel = 'Patient';
      await user.save();

      await logAudit({
        user,
        action: 'PATIENT_REGISTER',
        entity: 'Patient',
        entityId: patient._id,
        details: { uhid, email: user.email },
      });

      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        accountStatus: 'Approved',
        requiresApproval: false,
        message: 'Patient account registered successfully! Your digital health profile is active.',
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          accountStatus: 'Approved',
          profile: patient,
        },
      });
    }

    // =========================================================================
    // BRANCH B: DOCTOR REGISTRATION (Requires Admin Approval)
    // =========================================================================
    if (targetRole === 'doctor') {
      let deptId = departmentId;
      if (!deptId) {
        const firstDept = await Department.findOne();
        deptId = firstDept?._id;
      }

      const user = await User.create({
        name: name.trim().startsWith('Dr.') ? name.trim() : `Dr. ${name.trim()}`,
        email: email.toLowerCase().trim(),
        password,
        role: 'doctor',
        phone: (phone || '').trim(),
        isApproved: false,
        approvalStatus: 'Pending',
        isActive: false, // Inactive until administrator approval
        registrationDetails: {
          specialization: specialization || 'General Medicine',
          departmentId: deptId,
          licenseNumber: licenseNumber || '',
          qualifications: qualifications || 'MBBS',
          experienceYears: Number(experienceYears) || 1,
          consultationFee: Number(consultationFee) || 500,
          roomNumber: roomNumber || 'OPD-TBD',
          bio: bio || '',
        },
      });

      const count = await Doctor.countDocuments();
      const doctorId = `HMS-DOC-${String(count + 1).padStart(4, '0')}`;

      // Build qualifications array
      const qualificationsList = Array.isArray(qualifications)
        ? qualifications
        : [{ degree: qualifications || 'MBBS', institution: 'Accredited Medical University', year: new Date().getFullYear() - 3 }];

      const doctor = await Doctor.create({
        doctorId,
        user: user._id,
        firstName,
        lastName,
        specialization: specialization || 'General Medicine',
        department: deptId,
        qualifications: qualificationsList,
        licenseNumber: licenseNumber || '',
        experienceYears: Number(experienceYears) || 1,
        consultationFee: Number(consultationFee) || 500,
        phone: phone || '',
        roomNumber: roomNumber || 'OPD-TBD',
        bio: bio || '',
        isApproved: false,
        status: 'Inactive',
      });

      user.profileRef = doctor._id;
      user.roleRefModel = 'Doctor';
      await user.save();

      await logAudit({
        user,
        action: 'DOCTOR_REGISTRATION_SUBMITTED',
        entity: 'Doctor',
        entityId: doctor._id,
        details: { doctorId, email: user.email, specialization },
      });

      return res.status(201).json({
        success: true,
        accountStatus: 'Pending',
        requiresApproval: true,
        message: 'Doctor registration submitted successfully! Your clinical application is currently pending administrator verification. You will be able to access the Doctor Workbench once approved.',
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          accountStatus: 'Pending',
        },
      });
    }

    // =========================================================================
    // BRANCH C: STAFF REGISTRATION (Nurse, Receptionist, Pharmacist, Lab Tech, Billing Staff)
    // =========================================================================
    const validStaffRoles = ['nurse', 'receptionist', 'pharmacist', 'lab_technician', 'billing_staff', 'staff'];
    const staffRoleType = validStaffRoles.includes(targetRole) ? targetRole : 'nurse';

    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: staffRoleType, // e.g. 'nurse', 'pharmacist'
      phone: (phone || '').trim(),
      isApproved: false,
      approvalStatus: 'Pending',
      isActive: false, // Inactive until admin approval
      registrationDetails: {
        roleType: staffRoleType,
        departmentId: departmentId || null,
        licenseNumber: licenseNumber || '',
        qualification: qualification || qualifications || '',
        deskNumber: deskNumber || '',
        specialization: specialization || '',
        shiftPreference: shiftPreference || 'Morning',
      },
    });

    const count = await Staff.countDocuments();
    const staffId = `HMS-STF-${String(count + 101)}`;

    const staff = await Staff.create({
      staffId,
      user: user._id,
      firstName,
      lastName,
      roleType: staffRoleType,
      department: departmentId || null,
      licenseNumber: licenseNumber || '',
      qualification: qualification || qualifications || '',
      deskNumber: deskNumber || '',
      specialization: specialization || '',
      phone: phone || '',
      shift: shiftPreference || 'Morning',
      isApproved: false,
      status: 'Pending',
    });

    user.profileRef = staff._id;
    user.roleRefModel = 'Staff';
    await user.save();

    await logAudit({
      user,
      action: 'STAFF_REGISTRATION_SUBMITTED',
      entity: 'Staff',
      entityId: staff._id,
      details: { staffId, email: user.email, roleType: staffRoleType },
    });

    const displayRole = staffRoleType.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    return res.status(201).json({
      success: true,
      accountStatus: 'Pending',
      requiresApproval: true,
      message: `${displayRole} registration submitted successfully! Your application is awaiting administrator verification. Once verified, you will be granted access to your staff workstation.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        accountStatus: 'Pending',
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Unified Login for all 8 hospital roles
// @route POST /api/auth/login
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide both email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. Incorrect password.' });
    }

    // 1. Check Approval Status for Doctors and Staff Personnel
    if (user.role !== 'admin' && user.role !== 'patient') {
      if (user.approvalStatus === 'Pending' || !user.isApproved) {
        return res.status(403).json({
          success: false,
          accountStatus: 'Pending',
          message: 'Your account registration is currently awaiting administrator verification. Please contact hospital administration once your credentials have been verified.',
        });
      }

      if (user.approvalStatus === 'Rejected') {
        return res.status(403).json({
          success: false,
          accountStatus: 'Rejected',
          message: `Your registration request was rejected by the administrator. Reason: ${user.rejectionReason || 'Verification criteria not met.'}`,
        });
      }
    }

    // 2. Check Active Status
    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        accountStatus: 'Inactive',
        message: 'Your account has been deactivated. Please contact the hospital administrator.',
      });
    }

    user.lastLogin = new Date();
    await user.save();

    // Fetch related profile
    let profile = null;
    if (user.role === 'patient') {
      profile = await Patient.findOne({ user: user._id });
    } else if (user.role === 'doctor') {
      profile = await Doctor.findOne({ user: user._id }).populate('department');
    } else if (ALL_STAFF_ROLES.includes(user.role)) {
      profile = await Staff.findOne({ user: user._id }).populate('department');
    }

    await logAudit({
      user,
      action: 'AUTH_LOGIN',
      entity: 'User',
      entityId: user._id,
      details: { role: user.role },
    });

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        accountStatus: user.approvalStatus || 'Approved',
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get current user profile
// @route GET /api/auth/me
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    let profile = null;

    if (user.role === 'patient') {
      profile = await Patient.findOne({ user: user._id });
    } else if (user.role === 'doctor') {
      profile = await Doctor.findOne({ user: user._id }).populate('department');
    } else if (ALL_STAFF_ROLES.includes(user.role)) {
      profile = await Staff.findOne({ user: user._id }).populate('department');
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        profile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get all users (Admin only)
// @route GET /api/auth/users
const getAllUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json({ success: true, count: users.length, users });
  } catch (error) {
    next(error);
  }
};

// @desc Toggle user active status
// @route PATCH /api/auth/users/:id/status
const toggleUserStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.isActive = !user.isActive;
    await user.save();

    await logAudit({
      req,
      action: 'USER_STATUS_TOGGLE',
      entity: 'User',
      entityId: user._id,
      details: { isActive: user.isActive },
    });

    res.json({ success: true, message: `User status changed to ${user.isActive ? 'Active' : 'Inactive'}`, user });
  } catch (error) {
    next(error);
  }
};

// @desc Update user profile (Name, Phone, Avatar, and linked role profile)
// @route PUT /api/auth/profile
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { name, phone, avatar, profileData } = req.body;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    let updatedProfile = null;

    if (user.role === 'patient') {
      const patient = await Patient.findOne({ user: user._id });
      if (patient) {
        if (name) {
          const parts = name.trim().split(' ');
          patient.firstName = parts[0] || patient.firstName;
          patient.lastName = parts.slice(1).join(' ') || patient.lastName;
        }
        if (phone !== undefined) patient.phone = phone;
        if (profileData) {
          const { dateOfBirth, gender, bloodGroup, address, emergencyContact, allergies, chronicConditions } = profileData;
          if (dateOfBirth) patient.dateOfBirth = dateOfBirth;
          if (gender) patient.gender = gender;
          if (bloodGroup) patient.bloodGroup = bloodGroup;
          if (address) patient.address = { ...patient.address, ...address };
          if (emergencyContact) patient.emergencyContact = { ...patient.emergencyContact, ...emergencyContact };
          if (allergies) patient.allergies = allergies;
          if (chronicConditions) patient.chronicConditions = chronicConditions;
        }
        await patient.save();
        updatedProfile = patient;
      }
    } else if (user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: user._id }).populate('department');
      if (doctor) {
        if (name) {
          const parts = name.trim().split(' ');
          doctor.firstName = parts[0] || doctor.firstName;
          doctor.lastName = parts.slice(1).join(' ') || doctor.lastName;
        }
        if (phone !== undefined) doctor.phone = phone;
        if (profileData) {
          const { bio, consultationFee, roomNumber, availableDays } = profileData;
          if (bio !== undefined) doctor.bio = bio;
          if (consultationFee !== undefined) doctor.consultationFee = consultationFee;
          if (roomNumber !== undefined) doctor.roomNumber = roomNumber;
          if (availableDays) doctor.availableDays = availableDays;
        }
        await doctor.save();
        updatedProfile = doctor;
      }
    } else if (ALL_STAFF_ROLES.includes(user.role)) {
      const staff = await Staff.findOne({ user: user._id }).populate('department');
      if (staff) {
        if (name) {
          const parts = name.trim().split(' ');
          staff.firstName = parts[0] || staff.firstName;
          staff.lastName = parts.slice(1).join(' ') || staff.lastName;
        }
        if (phone !== undefined) staff.phone = phone;
        await staff.save();
        updatedProfile = staff;
      }
    }

    await logAudit({
      user,
      action: 'USER_PROFILE_UPDATE',
      entity: 'User',
      entityId: user._id,
      details: { role: user.role, name: user.name },
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        avatar: user.avatar,
        profile: updatedProfile,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Change user password
// @route PUT /api/auth/change-password
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(req.user._id).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Current password does not match.' });
    }

    user.password = newPassword;
    await user.save();

    await logAudit({
      user,
      action: 'PASSWORD_CHANGE',
      entity: 'User',
      entityId: user._id,
      details: { email: user.email },
    });

    res.json({
      success: true,
      message: 'Password changed successfully. You can now use your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc Forgot password - generate reset token
// @route POST /api/auth/forgot-password
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account registered with this email address.',
      });
    }

    const resetToken = user.getResetPasswordToken();
    await user.save({ validateBeforeSave: false });

    await logAudit({
      user,
      action: 'PASSWORD_RESET_REQUEST',
      entity: 'User',
      entityId: user._id,
      details: { email: user.email },
    });

    res.json({
      success: true,
      message: 'Password reset token generated successfully. In production, a secure email with reset instructions is dispatched.',
      resetToken,
      expiresInMinutes: 15,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Reset password with token
// @route PUT /api/auth/reset-password/:token
const resetPassword = async (req, res, next) => {
  try {
    const rawToken = req.params.token;
    const resetPasswordToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset token is invalid or has expired. Please request a new token.',
      });
    }

    user.password = req.body.password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    await logAudit({
      user,
      action: 'PASSWORD_RESET_SUCCESS',
      entity: 'User',
      entityId: user._id,
      details: { email: user.email },
    });

    res.json({
      success: true,
      message: 'Password has been reset successfully. You can now sign in with your new password.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc Logout user
// @route POST /api/auth/logout
const logout = async (req, res, next) => {
  try {
    if (req.user) {
      await logAudit({
        user: req.user,
        action: 'AUTH_LOGOUT',
        entity: 'User',
        entityId: req.user._id,
        details: { email: req.user.email },
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully from session.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get all registration approval requests (Admin only)
// @route GET /api/auth/approvals
const getRegistrationApprovals = async (req, res, next) => {
  try {
    const { status, role, search } = req.query;
    let query = {
      role: { $nin: ['admin', 'patient'] },
    };

    if (status && status !== 'All') {
      query.approvalStatus = status;
    }

    if (role && role !== 'All') {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const requests = await User.find(query)
      .populate({
        path: 'profileRef',
        populate: { path: 'department', select: 'name code floor' },
      })
      .populate('approvedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    next(error);
  }
};

// @desc Get registration approval statistics (Admin only)
// @route GET /api/auth/approvals/stats
const getApprovalStats = async (req, res, next) => {
  try {
    const nonPatients = { role: { $nin: ['admin', 'patient'] } };
    const [pending, approved, rejected, total] = await Promise.all([
      User.countDocuments({ ...nonPatients, approvalStatus: 'Pending' }),
      User.countDocuments({ ...nonPatients, approvalStatus: 'Approved' }),
      User.countDocuments({ ...nonPatients, approvalStatus: 'Rejected' }),
      User.countDocuments(nonPatients),
    ]);

    res.json({
      success: true,
      stats: { pending, approved, rejected, total },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Approve applicant registration request and activate account (Admin only)
// @route POST /api/auth/approvals/:id/approve
const approveRegistration = async (req, res, next) => {
  try {
    const { departmentId, roomNumber } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Applicant user not found.' });
    }

    user.isApproved = true;
    user.approvalStatus = 'Approved';
    user.isActive = true;
    user.approvalDate = new Date();
    user.approvedBy = req.user._id;

    // Activate linked Doctor or Staff profile
    if (user.role === 'doctor') {
      let doctor = await Doctor.findOne({ user: user._id });
      if (doctor) {
        doctor.isApproved = true;
        doctor.status = 'Active';
        if (departmentId) doctor.department = departmentId;
        if (roomNumber) doctor.roomNumber = roomNumber;
        await doctor.save();
      }
    } else if (ALL_STAFF_ROLES.includes(user.role)) {
      let staff = await Staff.findOne({ user: user._id });
      if (staff) {
        staff.isApproved = true;
        staff.status = 'Active';
        if (departmentId) staff.department = departmentId;
        await staff.save();
      }
    }

    await user.save();

    await logAudit({
      req,
      action: 'REGISTRATION_APPROVED',
      entity: 'User',
      entityId: user._id,
      details: {
        applicantName: user.name,
        role: user.role,
        approvedBy: req.user.name,
        departmentId,
      },
    });

    res.json({
      success: true,
      message: `Applicant ${user.name} has been approved and activated as ${user.role}.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Reject registration request with audit reason (Admin only)
// @route POST /api/auth/approvals/:id/reject
const rejectRegistration = async (req, res, next) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ success: false, message: 'Applicant user not found.' });
    }

    user.isApproved = false;
    user.approvalStatus = 'Rejected';
    user.isActive = false;
    user.rejectionReason = reason || 'Clinical credentials or licensing documentation could not be verified.';
    user.approvalDate = new Date();
    user.approvedBy = req.user._id;

    if (user.role === 'doctor') {
      await Doctor.findOneAndUpdate({ user: user._id }, { status: 'Inactive', isApproved: false });
    } else if (ALL_STAFF_ROLES.includes(user.role)) {
      await Staff.findOneAndUpdate({ user: user._id }, { status: 'Inactive', isApproved: false });
    }

    await user.save();

    await logAudit({
      req,
      action: 'REGISTRATION_REJECTED',
      entity: 'User',
      entityId: user._id,
      details: {
        applicantName: user.name,
        role: user.role,
        reason: user.rejectionReason,
        rejectedBy: req.user.name,
      },
    });

    res.json({
      success: true,
      message: `Registration request for ${user.name} has been rejected.`,
      user,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  getAllUsers,
  toggleUserStatus,
  updateProfile,
  changePassword,
  forgotPassword,
  resetPassword,
  logout,
  getRegistrationApprovals,
  getApprovalStats,
  approveRegistration,
  rejectRegistration,
};
