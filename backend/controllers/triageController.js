const SymptomTriage = require('../models/SymptomTriage');
const Patient = require('../models/Patient');
const { logAudit } = require('../middleware/audit');

// Rule-based triage knowledge base
const RED_FLAG_SYMPTOMS = [
  'severe chest pain',
  'chest pain radiating to left arm',
  'sudden difficulty breathing',
  'severe shortness of breath',
  'sudden numbness',
  'facial drooping',
  'slurred speech',
  'loss of consciousness',
  'coughing up blood',
  'severe allergic reaction',
  'anaphylaxis',
  'uncontrolled bleeding',
];

const DEPARTMENT_ROUTING = {
  heart: 'Cardiology',
  chest: 'Cardiology',
  palpitation: 'Cardiology',
  breath: 'Pulmonology',
  cough: 'Pulmonology',
  wheezing: 'Pulmonology',
  asthma: 'Pulmonology',
  headache: 'Neurology',
  dizziness: 'Neurology',
  seizure: 'Neurology',
  numbness: 'Neurology',
  joint: 'Orthopedics',
  bone: 'Orthopedics',
  fracture: 'Orthopedics',
  back: 'Orthopedics',
  stomach: 'Gastroenterology',
  abdomen: 'Gastroenterology',
  vomiting: 'Gastroenterology',
  diarrhea: 'Gastroenterology',
  rash: 'Dermatology',
  skin: 'Dermatology',
  itching: 'Dermatology',
  fever: 'General Medicine',
  cold: 'General Medicine',
  fatigue: 'General Medicine',
};

// @desc Evaluate symptoms and generate triage guidance
// @route POST /api/triage/assess
const assessSymptoms = async (req, res, next) => {
  try {
    const { symptoms = [], chiefComplaint = '', patientId } = req.body;

    let targetPatientId = patientId;
    if (req.user.role === 'patient') {
      const selfPatient = await Patient.findOne({ user: req.user._id });
      if (selfPatient) targetPatientId = selfPatient._id;
    }

    if (!chiefComplaint && (!symptoms || !symptoms.length)) {
      return res.status(400).json({ success: false, message: 'Please provide symptoms or chief complaint.' });
    }

    const complaintLower = (chiefComplaint + ' ' + symptoms.map((s) => s.name).join(' ')).toLowerCase();

    // Check for red flags
    const emergencyFlags = [];
    RED_FLAG_SYMPTOMS.forEach((flag) => {
      if (complaintLower.includes(flag)) {
        emergencyFlags.push(`Warning: ${flag.toUpperCase()}`);
      }
    });

    // Calculate severity
    let score = 3;
    let severityLevel = 'Routine Care';

    if (emergencyFlags.length > 0) {
      score = 9;
      severityLevel = 'IMMEDIATE EMERGENCY';
    } else {
      const severeCount = symptoms.filter((s) => s.severity === 'Severe').length;
      const moderateCount = symptoms.filter((s) => s.severity === 'Moderate').length;

      if (severeCount >= 2) {
        score = 8;
        severityLevel = 'Urgent Medical Evaluation';
      } else if (severeCount === 1 || moderateCount >= 3) {
        score = 6;
        severityLevel = 'Priority Attention';
      } else {
        score = 3;
        severityLevel = 'Routine Care';
      }
    }

    // Determine recommended department
    let recommendedDepartment = 'General Medicine';
    for (const [keyword, dept] of Object.entries(DEPARTMENT_ROUTING)) {
      if (complaintLower.includes(keyword)) {
        recommendedDepartment = dept;
        break;
      }
    }

    // Guidance text
    let guidance = '';
    if (severityLevel === 'IMMEDIATE EMERGENCY') {
      guidance =
        'CRITICAL: Your reported symptoms indicate potential high-risk physiological distress. Do NOT wait for a scheduled appointment. Please proceed directly to the nearest Hospital Emergency Department or call an ambulance immediately.';
    } else if (severityLevel === 'Urgent Medical Evaluation') {
      guidance = `Your symptoms warrant prompt evaluation by a specialist in ${recommendedDepartment}. We strongly advise scheduling an appointment within 24 to 48 hours or visiting the Urgent Care clinic.`;
    } else if (severityLevel === 'Priority Attention') {
      guidance = `Your symptoms are categorized as Priority Attention. Book an OPD consultation with the ${recommendedDepartment} department in the coming days. Stay hydrated, avoid strenuous exertion, and seek emergency care if symptoms rapidly escalate.`;
    } else {
      guidance = `Your symptoms are currently categorized as Routine Care. Schedule an appointment with ${recommendedDepartment} for clinical examination. Keep track of your temperature and symptom duration.`;
    }

    const count = await SymptomTriage.countDocuments();
    const triageNumber = `HMS-TRG-${String(count + 1001)}`;

    const triageRecord = await SymptomTriage.create({
      triageNumber,
      patient: targetPatientId,
      symptoms,
      chiefComplaint,
      severityScore: score,
      severityLevel,
      emergencyFlags,
      guidance,
      recommendedDepartment,
      disclaimerAcknowledged: true,
    });

    await logAudit({
      req,
      action: 'SYMPTOM_TRIAGE_CONDUCTED',
      entity: 'SymptomTriage',
      entityId: triageRecord._id,
      details: { triageNumber, severityLevel, recommendedDepartment },
    });

    res.status(201).json({
      success: true,
      triage: triageRecord,
      disclaimer:
        'DISCLAIMER: This automated triage assessment provides informational guidance only and does NOT constitute a confirmed medical diagnosis or prescription. In case of life-threatening emergency, call emergency services immediately.',
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get triage history for patient
// @route GET /api/triage/history
const getTriageHistory = async (req, res, next) => {
  try {
    let query = {};
    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) return res.json({ success: true, history: [] });
      query.patient = patient._id;
    } else if (req.query.patientId) {
      query.patient = req.query.patientId;
    }

    const history = await SymptomTriage.find(query)
      .populate('patient', 'uhid firstName lastName phone')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, count: history.length, history });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assessSymptoms,
  getTriageHistory,
};
