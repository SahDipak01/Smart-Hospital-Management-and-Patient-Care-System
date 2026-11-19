const MedicalRecord = require('../models/MedicalRecord');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Appointment = require('../models/Appointment');
const { logAudit } = require('../middleware/audit');

// @desc Get medical records
// @route GET /api/medical-records
const getRecords = async (req, res, next) => {
  try {
    const { patientId, doctorId, page = 1, limit = 20 } = req.query;
    let query = {};

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) return res.json({ success: true, count: 0, records: [] });
      query.patient = patient._id;
    } else {
      if (patientId) query.patient = patientId;
      if (doctorId) query.doctor = doctorId;
    }

    const total = await MedicalRecord.countDocuments(query);
    const records = await MedicalRecord.find(query)
      .populate('patient', 'uhid firstName lastName gender bloodGroup dateOfBirth phone')
      .populate('doctor', 'doctorId firstName lastName specialization')
      .populate('appointment')
      .sort({ visitDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      records,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single medical record
// @route GET /api/medical-records/:id
const getRecordById = async (req, res, next) => {
  try {
    const record = await MedicalRecord.findById(req.params.id)
      .populate('patient')
      .populate('doctor')
      .populate('appointment');

    if (!record) {
      return res.status(404).json({ success: false, message: 'Medical record not found' });
    }

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient || record.patient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied to other patient medical records.' });
      }
    }

    res.json({ success: true, record });
  } catch (error) {
    next(error);
  }
};

// @desc Create medical record (Doctor only)
// @route POST /api/medical-records
const createRecord = async (req, res, next) => {
  try {
    const {
      patientId,
      appointmentId,
      vitals,
      chiefComplaints,
      clinicalObservations,
      diagnoses,
      treatmentPlan,
      notes,
    } = req.body;

    let doctorId = req.body.doctorId;
    if (req.user.role === 'doctor') {
      const doc = await Doctor.findOne({ user: req.user._id });
      if (!doc) return res.status(403).json({ success: false, message: 'Doctor profile missing.' });
      doctorId = doc._id;
    }

    const count = await MedicalRecord.countDocuments();
    const recordNumber = `HMS-EMR-${String(count + 10001)}`;

    const record = await MedicalRecord.create({
      recordNumber,
      patient: patientId,
      doctor: doctorId,
      appointment: appointmentId || null,
      vitals: vitals || {},
      chiefComplaints,
      clinicalObservations: clinicalObservations || '',
      diagnoses: diagnoses || [],
      treatmentPlan: treatmentPlan || '',
      notes: notes || '',
    });

    // Auto-update appointment status to Completed if linked
    if (appointmentId) {
      await Appointment.findByIdAndUpdate(appointmentId, { status: 'Completed' });
    }

    await logAudit({
      req,
      action: 'MEDICAL_RECORD_CREATED',
      entity: 'MedicalRecord',
      entityId: record._id,
      details: { recordNumber, patientId },
    });

    res.status(201).json({ success: true, record });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecords,
  getRecordById,
  createRecord,
};
