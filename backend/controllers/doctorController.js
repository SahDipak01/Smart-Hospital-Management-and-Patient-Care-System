const Doctor = require('../models/Doctor');
const User = require('../models/User');
const Appointment = require('../models/Appointment');
const Department = require('../models/Department');
const { logAudit } = require('../middleware/audit');

// @desc Get all doctors with filters
// @route GET /api/doctors
const getAllDoctors = async (req, res, next) => {
  try {
    const { department, specialization, search, isApproved, status } = req.query;
    let query = {};

    if (department && department !== 'All') {
      query.department = department;
    }

    if (specialization && specialization !== 'All') {
      query.specialization = { $regex: specialization, $options: 'i' };
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (isApproved !== undefined) {
      query.isApproved = isApproved === 'true';
    }

    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { specialization: { $regex: search, $options: 'i' } },
        { doctorId: { $regex: search, $options: 'i' } },
      ];
    }

    const doctors = await Doctor.find(query)
      .populate('department', 'name code floor')
      .populate('user', 'email avatar isActive')
      .sort({ createdAt: -1 });

    res.json({ success: true, count: doctors.length, doctors });
  } catch (error) {
    next(error);
  }
};

// @desc Get doctor by ID
// @route GET /api/doctors/:id
const getDoctorById = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id)
      .populate('department')
      .populate('user', 'email avatar isActive');

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    res.json({ success: true, doctor });
  } catch (error) {
    next(error);
  }
};

// @desc Create new doctor (Admin)
// @route POST /api/doctors
const createDoctor = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      specialization,
      department,
      qualifications,
      experienceYears,
      consultationFee,
      roomNumber,
      scheduleSlots,
      bio,
    } = req.body;

    let user = await User.findOne({ email });
    if (!user) {
      const defaultPassword = 'Password@123';
      user = await User.create({
        name: `Dr. ${firstName} ${lastName}`,
        email,
        password: defaultPassword,
        role: 'doctor',
        phone,
      });
    }

    const count = await Doctor.countDocuments();
    const doctorId = `HMS-DOC-${String(count + 1).padStart(4, '0')}`;

    const defaultSlots = [
      { dayOfWeek: 'Monday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 20 },
      { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 20 },
      { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 20 },
      { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 20 },
      { dayOfWeek: 'Friday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 20 },
    ];

    const doctor = await Doctor.create({
      doctorId,
      user: user._id,
      firstName,
      lastName,
      specialization,
      department,
      qualifications: qualifications || [{ degree: 'MBBS, MD', institution: 'Apex Medical University', year: 2015 }],
      experienceYears: experienceYears || 5,
      consultationFee: consultationFee || 500,
      phone,
      roomNumber: roomNumber || 'OPD-101',
      scheduleSlots: scheduleSlots?.length ? scheduleSlots : defaultSlots,
      bio: bio || '',
      isApproved: true,
      status: 'Active',
    });

    user.profileRef = doctor._id;
    user.roleRefModel = 'Doctor';
    await user.save();

    await logAudit({
      req,
      action: 'DOCTOR_CREATE',
      entity: 'Doctor',
      entityId: doctor._id,
      details: { doctorId, name: `Dr. ${firstName} ${lastName}` },
    });

    res.status(201).json({ success: true, doctor });
  } catch (error) {
    next(error);
  }
};

// @desc Update doctor profile
// @route PUT /api/doctors/:id
const updateDoctor = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    // Role check: Only admin or the doctor themselves
    if (req.user.role === 'doctor' && doctor.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Unauthorized to modify another doctor profile' });
    }

    const fields = [
      'firstName',
      'lastName',
      'phone',
      'specialization',
      'department',
      'consultationFee',
      'roomNumber',
      'scheduleSlots',
      'status',
      'bio',
      'experienceYears',
    ];

    fields.forEach((f) => {
      if (req.body[f] !== undefined) {
        doctor[f] = req.body[f];
      }
    });

    await doctor.save();

    await logAudit({
      req,
      action: 'DOCTOR_UPDATE',
      entity: 'Doctor',
      entityId: doctor._id,
      details: { doctorId: doctor.doctorId },
    });

    res.json({ success: true, doctor });
  } catch (error) {
    next(error);
  }
};

// @desc Admin approve/suspend doctor
// @route PATCH /api/doctors/:id/approve
const toggleDoctorApproval = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    doctor.isApproved = !doctor.isApproved;
    await doctor.save();

    await logAudit({
      req,
      action: 'DOCTOR_APPROVAL_TOGGLE',
      entity: 'Doctor',
      entityId: doctor._id,
      details: { isApproved: doctor.isApproved },
    });

    res.json({ success: true, message: `Doctor approval status updated to ${doctor.isApproved}`, doctor });
  } catch (error) {
    next(error);
  }
};

// @desc Admin toggle doctor active/inactive status
// @route PATCH /api/doctors/:id/status
const toggleDoctorStatus = async (req, res, next) => {
  try {
    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    doctor.status = doctor.status === 'Active' ? 'Inactive' : 'Active';
    await doctor.save();

    await logAudit({
      req,
      action: 'DOCTOR_STATUS_TOGGLED',
      entity: 'Doctor',
      entityId: doctor._id,
      details: { doctorId: doctor.doctorId, status: doctor.status },
    });

    res.json({ success: true, message: `Doctor status updated to ${doctor.status}`, doctor });
  } catch (error) {
    next(error);
  }
};

// @desc Smart Slot Generator: Get available booking slots for a doctor on a specific date
// @route GET /api/doctors/:id/slots
const getDoctorSlots = async (req, res, next) => {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'Please specify a date query (YYYY-MM-DD).' });
    }

    const doctor = await Doctor.findById(req.params.id);
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const targetDate = new Date(date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const targetDayName = dayNames[targetDate.getDay()];

    const schedule = doctor.scheduleSlots.find((s) => s.dayOfWeek.toLowerCase() === targetDayName.toLowerCase());

    if (!schedule) {
      return res.json({
        success: true,
        date,
        day: targetDayName,
        availableSlots: [],
        message: `Dr. ${doctor.lastName} is not scheduled for consultations on ${targetDayName}s.`,
      });
    }

    // Generate slots: e.g. from 09:00 to 13:00 in 20 min intervals
    const [startH, startM] = schedule.startTime.split(':').map(Number);
    const [endH, endM] = schedule.endTime.split(':').map(Number);
    const duration = schedule.slotDurationMinutes || 20;

    let startTotalMinutes = startH * 60 + startM;
    const endTotalMinutes = endH * 60 + endM;

    const generatedSlots = [];
    while (startTotalMinutes + duration <= endTotalMinutes) {
      const slotStartH = Math.floor(startTotalMinutes / 60);
      const slotStartM = startTotalMinutes % 60;
      const slotEndH = Math.floor((startTotalMinutes + duration) / 60);
      const slotEndM = (startTotalMinutes + duration) % 60;

      const formatTime = (h, m) => `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      const timeSlotStr = `${formatTime(slotStartH, slotStartM)} - ${formatTime(slotEndH, slotEndM)}`;

      generatedSlots.push(timeSlotStr);
      startTotalMinutes += duration;
    }

    // Query existing booked appointments for this doctor on this day
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    const bookedAppointments = await Appointment.find({
      doctor: doctor._id,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      status: { $nin: ['Cancelled'] },
    });

    const bookedSlotSet = new Set(bookedAppointments.map((a) => a.timeSlot));

    const slotObjects = generatedSlots.map((slot) => ({
      slot,
      isAvailable: !bookedSlotSet.has(slot),
    }));

    res.json({
      success: true,
      date,
      day: targetDayName,
      doctor: {
        id: doctor._id,
        name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        fee: doctor.consultationFee,
        room: doctor.roomNumber,
      },
      slots: slotObjects,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  toggleDoctorApproval,
  toggleDoctorStatus,
  getDoctorSlots,
};
