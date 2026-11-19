const Appointment = require('../models/Appointment');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Notification = require('../models/Notification');
const { logAudit } = require('../middleware/audit');

// @desc Get appointments list (Role-aware: Doctors see assigned, Patients see own, Admins see all)
// @route GET /api/appointments
const getAllAppointments = async (req, res, next) => {
  try {
    const { status, date, doctorId, patientId, page = 1, limit = 50 } = req.query;
    let query = {};

    // Role-based restrictions
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) return res.json({ success: true, total: 0, appointments: [] });
      query.patient = patient._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) return res.json({ success: true, total: 0, appointments: [] });
      query.doctor = doctor._id;
    } else {
      if (doctorId) query.doctor = doctorId;
      if (patientId) query.patient = patientId;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);
      query.appointmentDate = { $gte: startOfDay, $lte: endOfDay };
    }

    const total = await Appointment.countDocuments(query);
    const appointments = await Appointment.find(query)
      .populate('patient', 'uhid firstName lastName phone bloodGroup dateOfBirth gender')
      .populate('doctor', 'doctorId firstName lastName specialization consultationFee roomNumber')
      .populate('department', 'name code floor')
      .sort({ appointmentDate: -1, timeSlot: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      appointments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single appointment
// @route GET /api/appointments/:id
const getAppointmentById = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient')
      .populate('doctor')
      .populate('department');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient || appointment.patient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied to other patient appointments.' });
      }
    }

    res.json({ success: true, appointment });
  } catch (error) {
    next(error);
  }
};

// @desc Book appointment with double-booking prevention & conflict checking
// @route POST /api/appointments
const bookAppointment = async (req, res, next) => {
  try {
    const { doctorId, departmentId, appointmentDate, timeSlot, reason, symptomsSummary, patientId } = req.body;

    let targetPatientId = patientId;

    // If caller is patient, enforce their own profile
    if (req.user.role === 'patient') {
      const selfPatient = await Patient.findOne({ user: req.user._id });
      if (!selfPatient) {
        return res.status(400).json({ success: false, message: 'Patient profile not registered for this account.' });
      }
      targetPatientId = selfPatient._id;
    }

    if (!targetPatientId || !doctorId || !departmentId || !appointmentDate || !timeSlot || !reason) {
      return res.status(400).json({ success: false, message: 'Please provide all required appointment fields.' });
    }

    const doctor = await Doctor.findById(doctorId).populate('user');
    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Selected doctor not found' });
    }

    const patient = await Patient.findById(targetPatientId).populate('user');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient record not found' });
    }

    const targetDate = new Date(appointmentDate);
    const startOfDay = new Date(targetDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(targetDate);
    endOfDay.setHours(23, 59, 59, 999);

    // CRITICAL: Double-booking prevention check
    const existingConflict = await Appointment.findOne({
      doctor: doctor._id,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      timeSlot,
      status: { $in: ['Confirmed', 'Pending'] },
    });

    if (existingConflict) {
      return res.status(409).json({
        success: false,
        message: `Conflict detected: The time slot ${timeSlot} on ${targetDate.toLocaleDateString()} is already booked with Dr. ${doctor.lastName}. Please choose an alternative slot.`,
      });
    }

    // Queue number calculation for the day
    const dayAppointmentsCount = await Appointment.countDocuments({
      doctor: doctor._id,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
    });
    const queueNumber = dayAppointmentsCount + 1;

    // Generate unique Appointment number
    const countTotal = await Appointment.countDocuments();
    const appointmentNumber = `HMS-APT-${String(countTotal + 1001)}`;

    const appointment = await Appointment.create({
      appointmentNumber,
      patient: patient._id,
      doctor: doctor._id,
      department: departmentId,
      appointmentDate: targetDate,
      timeSlot,
      status: 'Confirmed',
      queueNumber,
      reason,
      symptomsSummary: symptomsSummary || '',
    });

    // Send notifications to Patient & Doctor
    if (patient.user) {
      await Notification.create({
        recipient: patient.user._id,
        title: 'Appointment Confirmed',
        message: `Your appointment with Dr. ${doctor.firstName} ${doctor.lastName} is scheduled for ${targetDate.toDateString()} at ${timeSlot}. Token #${queueNumber}.`,
        type: 'appointment',
        linkUrl: `/patient/appointments`,
      });
    }

    if (doctor.user) {
      await Notification.create({
        recipient: doctor.user._id,
        title: 'New Patient Booked',
        message: `Patient ${patient.firstName} ${patient.lastName} (UHID: ${patient.uhid}) booked slot ${timeSlot} on ${targetDate.toDateString()}.`,
        type: 'appointment',
        linkUrl: `/doctor/appointments`,
      });
    }

    await logAudit({
      req,
      action: 'APPOINTMENT_BOOKED',
      entity: 'Appointment',
      entityId: appointment._id,
      details: { appointmentNumber, timeSlot, doctor: doctor.doctorId, patient: patient.uhid },
    });

    res.status(201).json({
      success: true,
      message: 'Appointment booked and confirmed successfully.',
      appointment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Update appointment status (Confirm, Complete, Cancel, Reschedule)
// @route PATCH /api/appointments/:id/status
const updateAppointmentStatus = async (req, res, next) => {
  try {
    const { status, cancellationReason, newDate, newSlot } = req.body;
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient')
      .populate('doctor');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient || appointment.patient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied to other patient appointments.' });
      }
    }

    if (status === 'Cancelled') {
      appointment.status = 'Cancelled';
      appointment.cancellationReason = cancellationReason || 'Cancelled by user/hospital';
    } else if (status === 'Rescheduled' && newDate && newSlot) {
      // Check conflict for new slot
      const targetDate = new Date(newDate);
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      const conflict = await Appointment.findOne({
        doctor: appointment.doctor._id,
        appointmentDate: { $gte: startOfDay, $lte: endOfDay },
        timeSlot: newSlot,
        status: { $in: ['Confirmed', 'Pending'] },
        _id: { $ne: appointment._id },
      });

      if (conflict) {
        return res.status(409).json({ success: false, message: 'Target rescheduling slot is already booked.' });
      }

      appointment.appointmentDate = targetDate;
      appointment.timeSlot = newSlot;
      appointment.status = 'Confirmed';
    } else if (status) {
      appointment.status = status;
    }

    await appointment.save();

    await logAudit({
      req,
      action: 'APPOINTMENT_STATUS_UPDATE',
      entity: 'Appointment',
      entityId: appointment._id,
      details: { newStatus: appointment.status, appointmentNumber: appointment.appointmentNumber },
    });

    res.json({ success: true, message: `Appointment status updated to ${appointment.status}`, appointment });
  } catch (error) {
    next(error);
  }
};

// @desc Patient / Reception Check-In for OPD Appointment
// @route PATCH /api/appointments/:id/check-in
const checkInAppointment = async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id)
      .populate('patient')
      .populate('doctor');

    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    if (appointment.status === 'Completed' || appointment.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: `Cannot check in an appointment that is already ${appointment.status}.`,
      });
    }

    appointment.status = 'Checked-In';
    appointment.checkedInAt = new Date();
    await appointment.save();

    // Calculate queue waiting information: how many patients ahead of this patient for the same doctor today
    const startOfDay = new Date(appointment.appointmentDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(appointment.appointmentDate);
    endOfDay.setHours(23, 59, 59, 999);

    const aheadCount = await Appointment.countDocuments({
      doctor: appointment.doctor._id,
      appointmentDate: { $gte: startOfDay, $lte: endOfDay },
      queueNumber: { $lt: appointment.queueNumber },
      status: { $in: ['Confirmed', 'Checked-In', 'In-Consultation'] },
    });

    const estimatedWaitMinutes = aheadCount * 20;

    await logAudit({
      req,
      action: 'APPOINTMENT_CHECKED_IN',
      entity: 'Appointment',
      entityId: appointment._id,
      details: {
        appointmentNumber: appointment.appointmentNumber,
        queueNumber: appointment.queueNumber,
        aheadCount,
      },
    });

    res.json({
      success: true,
      message: `Checked in successfully! Token #${appointment.queueNumber}. ${aheadCount} patient(s) ahead (~${estimatedWaitMinutes} mins wait).`,
      appointment,
      queueInfo: {
        tokenNumber: appointment.queueNumber,
        patientsAhead: aheadCount,
        estimatedWaitMinutes,
      },
      queueWait: {
        tokenNumber: appointment.queueNumber,
        patientsAhead: aheadCount,
        estimatedWaitMinutes,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllAppointments,
  getAppointmentById,
  bookAppointment,
  updateAppointmentStatus,
  checkInAppointment,
};
