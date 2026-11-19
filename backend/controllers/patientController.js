const Patient = require('../models/Patient');
const User = require('../models/User');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const LabReport = require('../models/LabReport');
const Admission = require('../models/Admission');
const Appointment = require('../models/Appointment');
const { logAudit } = require('../middleware/audit');

// @desc Get all patients with search & filter
// @route GET /api/patients
const getAllPatients = async (req, res, next) => {
  try {
    const { search, bloodGroup, status, page = 1, limit = 20 } = req.query;
    let query = {};

    if (search) {
      query.$or = [
        { uhid: { $regex: search, $options: 'i' } },
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    if (bloodGroup && bloodGroup !== 'All') {
      query.bloodGroup = bloodGroup.replace(/ /g, '+');
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const total = await Patient.countDocuments(query);
    const patients = await Patient.find(query)
      .populate('user', 'email avatar isActive')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      patients,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single patient details with complete clinical history
// @route GET /api/patients/:id
const getPatientById = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id).populate('user', 'email avatar isActive');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Restrict patient role from accessing other patients' data
    if (req.user.role === 'patient') {
      const selfPatient = await Patient.findOne({ user: req.user._id });
      if (!selfPatient || selfPatient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied to other patient records.' });
      }
    }

    const [medicalRecords, prescriptions, labReports, admissions, appointments] = await Promise.all([
      MedicalRecord.find({ patient: patient._id }).populate('doctor', 'firstName lastName specialization').sort({ visitDate: -1 }),
      Prescription.find({ patient: patient._id }).populate('doctor', 'firstName lastName specialization').sort({ date: -1 }),
      LabReport.find({ patient: patient._id }).populate('test').populate('doctor', 'firstName lastName').sort({ requestedDate: -1 }),
      Admission.find({ patient: patient._id }).populate('ward').populate('bed').populate('doctor', 'firstName lastName').sort({ admissionDate: -1 }),
      Appointment.find({ patient: patient._id }).populate('doctor', 'firstName lastName specialization').sort({ appointmentDate: -1 }),
    ]);

    res.json({
      success: true,
      patient,
      history: {
        medicalRecords,
        prescriptions,
        labReports,
        admissions,
        appointments,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create new patient (Admin / Staff / Doctor)
// @route POST /api/patients
const createPatient = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      dateOfBirth,
      gender,
      bloodGroup,
      address,
      emergencyContact,
      allergies,
      chronicConditions,
      insurance,
    } = req.body;

    // Check if user already exists or create new patient user
    let user = await User.findOne({ email });
    if (!user) {
      const defaultPassword = 'Password@123';
      user = await User.create({
        name: `${firstName} ${lastName}`,
        email,
        password: defaultPassword,
        role: 'patient',
        phone,
      });
    }

    const count = await Patient.countDocuments();
    const uhid = `HMS-P-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    const patient = await Patient.create({
      uhid,
      user: user._id,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      bloodGroup: bloodGroup || 'Unknown',
      phone,
      email,
      address: address || {},
      emergencyContact: emergencyContact || {},
      allergies: allergies || [],
      chronicConditions: chronicConditions || [],
      insurance: insurance || {},
    });

    user.profileRef = patient._id;
    user.roleRefModel = 'Patient';
    await user.save();

    await logAudit({
      req,
      action: 'PATIENT_CREATE',
      entity: 'Patient',
      entityId: patient._id,
      details: { uhid, name: `${firstName} ${lastName}` },
    });

    res.status(201).json({ success: true, patient });
  } catch (error) {
    next(error);
  }
};

// @desc Update patient profile
// @route PUT /api/patients/:id
const updatePatient = async (req, res, next) => {
  try {
    const patient = await Patient.findById(req.params.id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (req.user.role === 'patient') {
      const selfPatient = await Patient.findOne({ user: req.user._id });
      if (!selfPatient || selfPatient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'You can only update your own profile.' });
      }
    }

    const allowedFields = [
      'firstName',
      'lastName',
      'phone',
      'address',
      'emergencyContact',
      'allergies',
      'chronicConditions',
      'insurance',
      'bloodGroup',
      'status',
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        patient[field] = req.body[field];
      }
    });

    await patient.save();

    await logAudit({
      req,
      action: 'PATIENT_UPDATE',
      entity: 'Patient',
      entityId: patient._id,
      details: { uhid: patient.uhid },
    });

    res.json({ success: true, patient });
  } catch (error) {
    next(error);
  }
};

// @desc Get chronological patient timeline
// @route GET /api/patients/:id/timeline
const getPatientTimeline = async (req, res, next) => {
  try {
    const patientId = req.params.id;
    const patient = await Patient.findById(patientId);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    // Restrict patient role from accessing other patients' timeline
    if (req.user.role === 'patient') {
      const selfPatient = await Patient.findOne({ user: req.user._id });
      if (!selfPatient || selfPatient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied to other patient timelines.' });
      }
    }

    const [appointments, records, prescriptions, labReports, admissions] = await Promise.all([
      Appointment.find({ patient: patientId }).populate('doctor', 'firstName lastName specialization').lean(),
      MedicalRecord.find({ patient: patientId }).populate('doctor', 'firstName lastName specialization').lean(),
      Prescription.find({ patient: patientId }).populate('doctor', 'firstName lastName specialization').lean(),
      LabReport.find({ patient: patientId }).populate('test').populate('doctor', 'firstName lastName').lean(),
      Admission.find({ patient: patientId }).populate('ward bed doctor').lean(),
    ]);

    const timeline = [];

    appointments.forEach((apt) => {
      timeline.push({
        id: `apt-${apt._id}`,
        type: 'APPOINTMENT',
        date: apt.appointmentDate,
        title: `Appointment: ${apt.status}`,
        subtitle: `With Dr. ${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''} (${apt.doctor?.specialization || ''})`,
        details: `Reason: ${apt.reason} | Time: ${apt.timeSlot}`,
        status: apt.status,
      });
    });

    records.forEach((rec) => {
      timeline.push({
        id: `rec-${rec._id}`,
        type: 'CLINICAL_VISIT',
        date: rec.visitDate,
        title: `Clinical Consultation (${rec.recordNumber})`,
        subtitle: `Dr. ${rec.doctor?.firstName || ''} ${rec.doctor?.lastName || ''}`,
        details: `Complaints: ${rec.chiefComplaints} | Diagnosis: ${rec.diagnoses?.map((d) => d.description).join(', ')}`,
        vitals: rec.vitals,
      });
    });

    prescriptions.forEach((rx) => {
      timeline.push({
        id: `rx-${rx._id}`,
        type: 'PRESCRIPTION',
        date: rx.date,
        title: `e-Prescription Issued (${rx.prescriptionNumber})`,
        subtitle: `Dr. ${rx.doctor?.firstName || ''} ${rx.doctor?.lastName || ''}`,
        details: `Prescribed ${rx.medicines?.length || 0} medicine(s): ${rx.medicines?.map((m) => m.name).join(', ')}`,
        status: rx.status,
      });
    });

    labReports.forEach((lab) => {
      timeline.push({
        id: `lab-${lab._id}`,
        type: 'LAB_TEST',
        date: lab.requestedDate,
        title: `Lab Test: ${lab.test?.name || 'Laboratory Order'}`,
        subtitle: `Status: ${lab.status}`,
        details: lab.results?.length ? `${lab.results.length} parameters evaluated` : 'Awaiting laboratory completion',
        status: lab.status,
      });
    });

    admissions.forEach((adm) => {
      timeline.push({
        id: `adm-${adm._id}`,
        type: 'ADMISSION',
        date: adm.admissionDate,
        title: `Hospital Admission (${adm.admissionNumber})`,
        subtitle: `${adm.ward?.name || 'Ward'} - Bed ${adm.bed?.bedNumber || ''}`,
        details: `Diagnosis: ${adm.admissionDiagnosis} | Status: ${adm.status}`,
        status: adm.status,
      });
    });

    // Sort descending by date
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ success: true, count: timeline.length, timeline });
  } catch (error) {
    next(error);
  }
};

// @desc Get logged-in patient's own profile, history, and complete timeline
// @route GET /api/patients/me/record
const getPatientSelfRecord = async (req, res, next) => {
  try {
    const patient = await Patient.findOne({ user: req.user._id }).populate('user', 'name email phone avatar isActive');
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not found for this user account.' });
    }

    const [medicalRecords, prescriptions, labReports, admissions, appointments] = await Promise.all([
      MedicalRecord.find({ patient: patient._id })
        .populate('doctor', 'firstName lastName specialization roomNumber')
        .sort({ visitDate: -1 }),
      Prescription.find({ patient: patient._id })
        .populate('doctor', 'firstName lastName specialization')
        .sort({ date: -1 }),
      LabReport.find({ patient: patient._id })
        .populate('test')
        .populate('doctor', 'firstName lastName')
        .sort({ requestedDate: -1 }),
      Admission.find({ patient: patient._id })
        .populate('ward bed doctor')
        .sort({ admissionDate: -1 }),
      Appointment.find({ patient: patient._id })
        .populate('doctor', 'firstName lastName specialization roomNumber consultationFee')
        .populate('department', 'name code floor')
        .sort({ appointmentDate: -1 }),
    ]);

    // Build comprehensive chronological timeline
    const timeline = [];

    appointments.forEach((apt) => {
      timeline.push({
        id: `apt-${apt._id}`,
        type: 'APPOINTMENT',
        date: apt.appointmentDate,
        title: `Appointment (${apt.status})`,
        subtitle: `With Dr. ${apt.doctor?.firstName || ''} ${apt.doctor?.lastName || ''} - ${apt.doctor?.specialization || 'Specialist'}`,
        details: `Reason: ${apt.reason} | Time: ${apt.timeSlot}`,
        status: apt.status,
      });
    });

    medicalRecords.forEach((rec) => {
      timeline.push({
        id: `rec-${rec._id}`,
        type: 'CLINICAL_VISIT',
        date: rec.visitDate,
        title: `Clinical Consultation (${rec.recordNumber})`,
        subtitle: `Consultant: Dr. ${rec.doctor?.firstName || ''} ${rec.doctor?.lastName || ''}`,
        details: `Complaints: ${rec.chiefComplaints || 'N/A'} | Diagnoses: ${rec.diagnoses?.map((d) => d.description).join(', ') || 'Under Observation'}`,
        vitals: rec.vitals,
        treatmentPlan: rec.treatmentPlan,
      });
    });

    prescriptions.forEach((rx) => {
      timeline.push({
        id: `rx-${rx._id}`,
        type: 'PRESCRIPTION',
        date: rx.date,
        title: `Prescription Issued (${rx.prescriptionNumber})`,
        subtitle: `Dr. ${rx.doctor?.firstName || ''} ${rx.doctor?.lastName || ''}`,
        details: `${rx.medicines?.length || 0} medicine(s) prescribed: ${rx.medicines?.map((m) => m.name).join(', ') || 'N/A'}`,
        status: rx.status,
        medicines: rx.medicines,
      });
    });

    labReports.forEach((lab) => {
      timeline.push({
        id: `lab-${lab._id}`,
        type: 'LAB_TEST',
        date: lab.requestedDate,
        title: `Laboratory Test: ${lab.test?.name || 'Diagnostic Evaluation'}`,
        subtitle: `Status: ${lab.status}`,
        details: lab.results?.length ? `${lab.results.length} parameters evaluated` : 'Awaiting laboratory completion',
        status: lab.status,
        results: lab.results,
      });
    });

    admissions.forEach((adm) => {
      timeline.push({
        id: `adm-${adm._id}`,
        type: 'ADMISSION',
        date: adm.admissionDate,
        title: `Inpatient Admission (${adm.admissionNumber})`,
        subtitle: `${adm.ward?.name || 'Inpatient Ward'} - Bed ${adm.bed?.bedNumber || ''}`,
        details: `Diagnosis: ${adm.admissionDiagnosis || 'Clinical Care'} | Status: ${adm.status}`,
        status: adm.status,
      });
    });

    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      success: true,
      patient,
      history: {
        medicalRecords,
        prescriptions,
        labReports,
        admissions,
        appointments,
      },
      timeline,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  getPatientTimeline,
  getPatientSelfRecord,
};
