const Ward = require('../models/Ward');
const Bed = require('../models/Bed');
const Admission = require('../models/Admission');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Bill = require('../models/Bill');
const { logAudit } = require('../middleware/audit');

// @desc Get all wards with occupancy summaries
// @route GET /api/wards
const getWards = async (req, res, next) => {
  try {
    const wards = await Ward.find({ isActive: true });
    const wardSummaries = await Promise.all(
      wards.map(async (ward) => {
        const totalBeds = await Bed.countDocuments({ ward: ward._id });
        const occupiedBeds = await Bed.countDocuments({ ward: ward._id, status: 'Occupied' });
        const availableBeds = await Bed.countDocuments({ ward: ward._id, status: 'Available' });
        const maintenanceBeds = await Bed.countDocuments({ ward: ward._id, status: 'Maintenance' });
        return {
          ...ward.toObject(),
          totalBeds,
          occupiedBeds,
          availableBeds,
          maintenanceBeds,
          occupancyRate: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        };
      })
    );
    res.json({ success: true, count: wardSummaries.length, wards: wardSummaries });
  } catch (error) {
    next(error);
  }
};

// @desc Create ward
// @route POST /api/wards
const createWard = async (req, res, next) => {
  try {
    const { wardCode, name, wardType, floor, totalBeds, dailyRate, nurseStationPhone } = req.body;

    const count = await Ward.countDocuments();
    const finalCode = wardCode || `WD-${String(count + 101)}`;

    const ward = await Ward.create({
      wardCode: finalCode,
      name,
      wardType,
      floor,
      totalBeds: totalBeds || 10,
      dailyRate: dailyRate || 1000,
      nurseStationPhone: nurseStationPhone || '',
    });

    // Automatically generate initial bed records for the ward
    const bedPromises = [];
    for (let i = 1; i <= ward.totalBeds; i++) {
      const bedNumber = `${ward.wardCode.replace('WD-', '')}-B${String(i).padStart(2, '0')}`;
      bedPromises.push(
        Bed.create({
          bedNumber,
          ward: ward._id,
          bedType: ward.wardType.includes('ICU') ? 'ICU Ventilator Bed' : 'Standard Electric',
          status: 'Available',
          dailyRate: ward.dailyRate,
        })
      );
    }
    await Promise.all(bedPromises);

    await logAudit({
      req,
      action: 'WARD_CREATED',
      entity: 'Ward',
      entityId: ward._id,
      details: { wardCode: ward.wardCode, name: ward.name, bedsCreated: ward.totalBeds },
    });

    res.status(201).json({ success: true, ward });
  } catch (error) {
    next(error);
  }
};

// @desc Get real-time bed matrix map
// @route GET /api/wards/bed-matrix
const getBedMatrix = async (req, res, next) => {
  try {
    const wards = await Ward.find({ isActive: true });
    const matrix = await Promise.all(
      wards.map(async (ward) => {
        const beds = await Bed.find({ ward: ward._id })
          .populate({
            path: 'currentAdmission',
            populate: [
              { path: 'patient', select: 'uhid firstName lastName gender bloodGroup' },
              { path: 'doctor', select: 'firstName lastName specialization' },
            ],
          })
          .sort({ bedNumber: 1 });

        return {
          ward: {
            id: ward._id,
            code: ward.wardCode,
            name: ward.name,
            type: ward.wardType,
            floor: ward.floor,
            dailyRate: ward.dailyRate,
          },
          beds,
        };
      })
    );

    res.json({ success: true, matrix });
  } catch (error) {
    next(error);
  }
};

// @desc Update bed status (Maintenance, Available, Reserved)
// @route PATCH /api/wards/beds/:id/status
const updateBedStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const bed = await Bed.findById(req.params.id);
    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found' });
    }

    if (bed.status === 'Occupied' && status !== 'Occupied') {
      return res.status(400).json({
        success: false,
        message: 'Cannot manually change status of an occupied bed. Please discharge or transfer the admitted patient first.',
      });
    }

    bed.status = status;
    await bed.save();

    res.json({ success: true, bed });
  } catch (error) {
    next(error);
  }
};

// @desc Inpatient Admission with strict double-allocation prevention
// @route POST /api/admissions
const admitPatient = async (req, res, next) => {
  try {
    const { patientId, doctorId, wardId, bedId, admissionDiagnosis, admissionReason } = req.body;

    // Check if patient is already admitted
    const activeAdmission = await Admission.findOne({ patient: patientId, status: 'Admitted' });
    if (activeAdmission) {
      return res.status(400).json({
        success: false,
        message: 'Patient is already admitted to a hospital ward under active admission #' + activeAdmission.admissionNumber,
      });
    }

    // Atomic bed availability check
    const bed = await Bed.findById(bedId);
    if (!bed) {
      return res.status(404).json({ success: false, message: 'Bed not found' });
    }
    if (bed.status !== 'Available') {
      return res.status(409).json({
        success: false,
        message: `Conflict: Bed ${bed.bedNumber} is currently ${bed.status}. Double allocation prevented.`,
      });
    }

    const count = await Admission.countDocuments();
    const admissionNumber = `HMS-ADM-${String(count + 10001)}`;

    const admission = await Admission.create({
      admissionNumber,
      patient: patientId,
      doctor: doctorId,
      ward: wardId,
      bed: bedId,
      admissionDiagnosis,
      admissionReason: admissionReason || '',
      status: 'Admitted',
    });

    // Mark bed as Occupied and assign current admission
    bed.status = 'Occupied';
    bed.currentAdmission = admission._id;
    await bed.save();

    // Mark patient as Inpatient
    await Patient.findByIdAndUpdate(patientId, { status: 'Inpatient' });

    await logAudit({
      req,
      action: 'PATIENT_ADMISSION',
      entity: 'Admission',
      entityId: admission._id,
      details: { admissionNumber, patientId, bedNumber: bed.bedNumber },
    });

    res.status(201).json({ success: true, message: 'Patient admitted successfully.', admission });
  } catch (error) {
    next(error);
  }
};

// @desc Discharge patient and release bed
// @route POST /api/admissions/:id/discharge
const dischargePatient = async (req, res, next) => {
  try {
    const { dischargeCondition, adviceOnDischarge, followUpDate, summaryNotes } = req.body;
    const admission = await Admission.findById(req.params.id)
      .populate('bed')
      .populate('ward')
      .populate('patient');

    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission record not found' });
    }

    if (admission.status === 'Discharged') {
      return res.status(400).json({ success: false, message: 'Patient has already been discharged.' });
    }

    admission.dischargeDate = new Date();
    admission.status = 'Discharged';
    admission.dischargeSummary = {
      dischargeCondition: dischargeCondition || 'Stable & Recovered',
      adviceOnDischarge: adviceOnDischarge || 'Continue prescribed oral medications, follow-up as scheduled.',
      followUpDate: followUpDate || null,
      summaryNotes: summaryNotes || '',
    };
    await admission.save();

    // Release Bed back to Available
    if (admission.bed) {
      await Bed.findByIdAndUpdate(admission.bed._id, {
        status: 'Available',
        currentAdmission: null,
      });
    }

    // Set Patient status back to Discharged/Active
    await Patient.findByIdAndUpdate(admission.patient._id, { status: 'Discharged' });

    // Calculate days stayed for billing reference
    const diffTime = Math.abs(new Date(admission.dischargeDate) - new Date(admission.admissionDate));
    const stayedDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const bedCharges = stayedDays * (admission.ward?.dailyRate || 1000);

    await logAudit({
      req,
      action: 'PATIENT_DISCHARGE',
      entity: 'Admission',
      entityId: admission._id,
      details: { admissionNumber: admission.admissionNumber, stayedDays, bedCharges },
    });

    res.json({
      success: true,
      message: 'Patient discharged successfully and bed released.',
      admission,
      staySummary: {
        stayedDays,
        bedCharges,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get all admissions
// @route GET /api/admissions
const getAdmissions = async (req, res, next) => {
  try {
    const { status, patientId } = req.query;
    let query = {};

    if (status && status !== 'All') query.status = status;
    if (patientId) query.patient = patientId;

    const admissions = await Admission.find(query)
      .populate('patient', 'uhid firstName lastName phone bloodGroup gender dateOfBirth')
      .populate('doctor', 'doctorId firstName lastName specialization')
      .populate('ward', 'wardCode name wardType floor dailyRate')
      .populate('bed', 'bedNumber bedType')
      .sort({ admissionDate: -1 });

    res.json({ success: true, count: admissions.length, admissions });
  } catch (error) {
    next(error);
  }
};

// @desc Transfer patient to a different bed/ward
// @route POST /api/wards/admissions/:id/transfer
const transferBed = async (req, res, next) => {
  try {
    const { targetBedId, targetWardId, reason } = req.body;
    const admission = await Admission.findById(req.params.id)
      .populate('ward')
      .populate('bed')
      .populate('patient');

    if (!admission) {
      return res.status(404).json({ success: false, message: 'Admission record not found' });
    }

    if (admission.status !== 'Admitted') {
      return res.status(400).json({
        success: false,
        message: `Cannot transfer bed for an admission that is ${admission.status}.`,
      });
    }

    const oldBed = admission.bed;
    const oldWard = admission.ward;

    // Check target bed
    const targetBed = await Bed.findById(targetBedId).populate('ward');
    if (!targetBed) {
      return res.status(404).json({ success: false, message: 'Target bed not found' });
    }

    if (targetBed.status !== 'Available') {
      return res.status(409).json({
        success: false,
        message: `Conflict: Target bed ${targetBed.bedNumber} is currently ${targetBed.status}. Double allocation prevented.`,
      });
    }

    // Release old bed
    if (oldBed) {
      await Bed.findByIdAndUpdate(oldBed._id, {
        status: 'Available',
        currentAdmission: null,
      });
    }

    // Occupy target bed
    targetBed.status = 'Occupied';
    targetBed.currentAdmission = admission._id;
    await targetBed.save();

    // Record transfer history
    admission.transferHistory.push({
      fromWard: oldWard ? oldWard._id : null,
      fromBed: oldBed ? oldBed._id : null,
      toWard: targetBed.ward._id,
      toBed: targetBed._id,
      transferredAt: new Date(),
      reason: reason || 'Internal hospital ward reassignment',
    });

    admission.bed = targetBed._id;
    admission.ward = targetBed.ward._id;
    await admission.save();

    await logAudit({
      req,
      action: 'BED_TRANSFER',
      entity: 'Admission',
      entityId: admission._id,
      details: {
        admissionNumber: admission.admissionNumber,
        fromBed: oldBed?.bedNumber,
        toBed: targetBed.bedNumber,
        toWard: targetBed.ward.name,
      },
    });

    res.json({
      success: true,
      message: `Patient successfully transferred from Bed ${oldBed?.bedNumber || 'N/A'} to Bed ${targetBed.bedNumber} (${targetBed.ward.name}).`,
      admission,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWards,
  createWard,
  getBedMatrix,
  updateBedStatus,
  admitPatient,
  dischargePatient,
  getAdmissions,
  transferBed,
};
