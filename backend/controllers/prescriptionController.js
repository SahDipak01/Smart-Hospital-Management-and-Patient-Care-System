const Prescription = require('../models/Prescription');
const Doctor = require('../models/Doctor');
const Patient = require('../models/Patient');
const Notification = require('../models/Notification');
const { logAudit } = require('../middleware/audit');

// @desc Get prescriptions
// @route GET /api/prescriptions
const getPrescriptions = async (req, res, next) => {
  try {
    const { patientId, doctorId, status, page = 1, limit = 20 } = req.query;
    let query = {};

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) return res.json({ success: true, count: 0, prescriptions: [] });
      query.patient = patient._id;
    } else {
      if (patientId) query.patient = patientId;
      if (doctorId) query.doctor = doctorId;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const total = await Prescription.countDocuments(query);
    const prescriptions = await Prescription.find(query)
      .populate('patient', 'uhid firstName lastName gender bloodGroup dateOfBirth phone')
      .populate('doctor', 'doctorId firstName lastName specialization roomNumber')
      .populate('appointment')
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      prescriptions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get prescription by ID
// @route GET /api/prescriptions/:id
const getPrescriptionById = async (req, res, next) => {
  try {
    const prescription = await Prescription.findById(req.params.id)
      .populate('patient')
      .populate('doctor')
      .populate('appointment')
      .populate('medicalRecord');

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient || prescription.patient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied to other patient prescriptions.' });
      }
    }

    res.json({ success: true, prescription });
  } catch (error) {
    next(error);
  }
};

// @desc Create prescription (Doctor only)
// @route POST /api/prescriptions
const createPrescription = async (req, res, next) => {
  try {
    const {
      patientId,
      appointmentId,
      medicalRecordId,
      medicines,
      diagnoses,
      generalInstructions,
      followUpDate,
    } = req.body;

    let doctorId = req.body.doctorId;
    if (req.user.role === 'doctor') {
      const doc = await Doctor.findOne({ user: req.user._id });
      if (!doc) return res.status(403).json({ success: false, message: 'Doctor profile missing.' });
      doctorId = doc._id;
    }

    const count = await Prescription.countDocuments();
    const prescriptionNumber = `HMS-RX-${String(count + 10001)}`;

    const prescription = await Prescription.create({
      prescriptionNumber,
      patient: patientId,
      doctor: doctorId,
      appointment: appointmentId || null,
      medicalRecord: medicalRecordId || null,
      diagnoses: diagnoses || [],
      medicines: medicines || [],
      generalInstructions: generalInstructions || 'Follow all prescribed dosages as instructed.',
      followUpDate: followUpDate || null,
      status: 'Active',
      auditTrail: [
        {
          action: 'CREATED',
          performedBy: req.user._id,
          timestamp: new Date(),
          notes: 'Initial e-Prescription authored by doctor.',
        },
      ],
    });

    // Notify patient
    const patient = await Patient.findById(patientId).populate('user');
    if (patient && patient.user) {
      await Notification.create({
        recipient: patient.user._id,
        title: 'New Prescription Issued',
        message: `Your prescription (${prescriptionNumber}) has been authored and is ready for pharmacy dispensing or download.`,
        type: 'prescription',
        linkUrl: `/patient/prescriptions`,
      });
    }

    await logAudit({
      req,
      action: 'PRESCRIPTION_CREATED',
      entity: 'Prescription',
      entityId: prescription._id,
      details: { prescriptionNumber, patientId },
    });

    res.status(201).json({ success: true, prescription });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
};
