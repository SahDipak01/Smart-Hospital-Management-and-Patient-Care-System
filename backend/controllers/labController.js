const LabTest = require('../models/LabTest');
const LabReport = require('../models/LabReport');
const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Notification = require('../models/Notification');
const { logAudit } = require('../middleware/audit');

// @desc Get available lab test catalog
// @route GET /api/lab/tests
const getTests = async (req, res, next) => {
  try {
    const { category, search } = req.query;
    let query = { isActive: true };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { testCode: { $regex: search, $options: 'i' } },
      ];
    }

    const tests = await LabTest.find(query).sort({ name: 1 });
    res.json({ success: true, count: tests.length, tests });
  } catch (error) {
    next(error);
  }
};

// @desc Add test to catalog (Admin)
// @route POST /api/lab/tests
const createTest = async (req, res, next) => {
  try {
    const { testCode, name, category, price, turnaroundHours, sampleType, parameters, preparationInstructions } = req.body;

    const count = await LabTest.countDocuments();
    const finalCode = testCode || `LT-${String(count + 101)}`;

    const test = await LabTest.create({
      testCode: finalCode,
      name,
      category,
      price,
      turnaroundHours: turnaroundHours || 24,
      sampleType: sampleType || 'Blood',
      parameters: parameters || [],
      preparationInstructions: preparationInstructions || 'Standard test protocol',
    });

    res.status(201).json({ success: true, test });
  } catch (error) {
    next(error);
  }
};

// @desc Get lab report orders (Role-aware)
// @route GET /api/lab/orders
const getOrders = async (req, res, next) => {
  try {
    const { status, patientId, doctorId, page = 1, limit = 50 } = req.query;
    let query = {};

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) return res.json({ success: true, total: 0, orders: [] });
      query.patient = patient._id;
    } else if (req.user.role === 'doctor') {
      const doctor = await Doctor.findOne({ user: req.user._id });
      if (!doctor) return res.json({ success: true, total: 0, orders: [] });
      query.doctor = doctor._id;
    } else {
      if (patientId) query.patient = patientId;
      if (doctorId) query.doctor = doctorId;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    const total = await LabReport.countDocuments(query);
    const orders = await LabReport.find(query)
      .populate('patient', 'uhid firstName lastName phone gender dateOfBirth bloodGroup')
      .populate('doctor', 'doctorId firstName lastName specialization')
      .populate('test')
      .populate('performedBy', 'name')
      .sort({ requestedDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      orders,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Create lab test order (Doctor/Admin)
// @route POST /api/lab/orders
const createOrder = async (req, res, next) => {
  try {
    const { patientId, testId, appointmentId, priority } = req.body;

    let doctorId = req.body.doctorId;
    if (req.user.role === 'doctor') {
      const doc = await Doctor.findOne({ user: req.user._id });
      if (doc) doctorId = doc._id;
    }

    const test = await LabTest.findById(testId);
    if (!test) {
      return res.status(404).json({ success: false, message: 'Lab test not found in catalog.' });
    }

    const count = await LabReport.countDocuments();
    const reportNumber = `HMS-LAB-${String(count + 10001)}`;

    // Prepare default results template from test parameters
    const initialResults = (test.parameters || []).map((p) => ({
      parameter: p.name,
      observedValue: '',
      normalRange: p.normalRange,
      unit: p.unit,
      flag: 'normal',
    }));

    const order = await LabReport.create({
      reportNumber,
      patient: patientId,
      doctor: doctorId,
      test: testId,
      appointment: appointmentId || null,
      priority: priority || 'Routine',
      status: 'Requested',
      results: initialResults,
    });

    await logAudit({
      req,
      action: 'LAB_ORDER_CREATED',
      entity: 'LabReport',
      entityId: order._id,
      details: { reportNumber, testName: test.name, patientId },
    });

    res.status(201).json({ success: true, order });
  } catch (error) {
    next(error);
  }
};

// @desc Update lab test order status & enter results
// @route PATCH /api/lab/orders/:id
const updateOrder = async (req, res, next) => {
  try {
    const { status, results, technicianNotes } = req.body;
    const order = await LabReport.findById(req.params.id)
      .populate('patient')
      .populate('doctor')
      .populate('test');

    if (!order) {
      return res.status(404).json({ success: false, message: 'Lab order not found' });
    }

    if (status) {
      order.status = status;
      if (status === 'Sample Collected') {
        order.sampleCollectedAt = new Date();
      }
      if (status === 'Completed') {
        order.completedAt = new Date();
        order.performedBy = req.user._id;

        // Send Notification to Patient & Doctor
        const patient = await Patient.findById(order.patient._id).populate('user');
        if (patient && patient.user) {
          await Notification.create({
            recipient: patient.user._id,
            title: 'Laboratory Report Completed',
            message: `Your lab results for ${order.test.name} (Report #${order.reportNumber}) are now finalized and available.`,
            type: 'lab',
            linkUrl: `/patient/lab-reports`,
          });
        }
      }
    }

    if (results && Array.isArray(results)) {
      order.results = results;
    }

    if (technicianNotes !== undefined) {
      order.technicianNotes = technicianNotes;
    }

    await order.save();

    await logAudit({
      req,
      action: 'LAB_ORDER_UPDATED',
      entity: 'LabReport',
      entityId: order._id,
      details: { reportNumber: order.reportNumber, status: order.status },
    });

    res.json({ success: true, message: `Lab order updated to ${order.status}`, order });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getTests,
  createTest,
  getOrders,
  createOrder,
  updateOrder,
};
