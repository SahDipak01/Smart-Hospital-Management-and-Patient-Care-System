const Bill = require('../models/Bill');
const Payment = require('../models/Payment');
const Patient = require('../models/Patient');
const Notification = require('../models/Notification');
const { logAudit } = require('../middleware/audit');

// @desc Get bills with status filter
// @route GET /api/billing
const getBills = async (req, res, next) => {
  try {
    const { status, patientId, page = 1, limit = 50 } = req.query;
    let query = {};

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient) return res.json({ success: true, total: 0, bills: [] });
      query.patient = patient._id;
    } else {
      if (patientId) query.patient = patientId;
    }

    if (status && status !== 'All') {
      query.paymentStatus = status;
    }

    const total = await Bill.countDocuments(query);
    const bills = await Bill.find(query)
      .populate('patient', 'uhid firstName lastName phone email bloodGroup')
      .populate('admission')
      .populate('appointment')
      .sort({ billDate: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      bills,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get single bill by ID with payments history
// @route GET /api/billing/:id
const getBillById = async (req, res, next) => {
  try {
    const bill = await Bill.findById(req.params.id)
      .populate('patient')
      .populate('admission')
      .populate('appointment');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    if (req.user.role === 'patient') {
      const patient = await Patient.findOne({ user: req.user._id });
      if (!patient || bill.patient._id.toString() !== patient._id.toString()) {
        return res.status(403).json({ success: false, message: 'Access denied to other patient invoices.' });
      }
    }

    const payments = await Payment.find({ bill: bill._id }).sort({ paymentDate: -1 });

    res.json({ success: true, bill, payments });
  } catch (error) {
    next(error);
  }
};

// @desc Generate new comprehensive bill
// @route POST /api/billing/generate
const generateBill = async (req, res, next) => {
  try {
    const {
      patientId,
      admissionId,
      appointmentId,
      items,
      discountAmount = 0,
      taxPercent = 5,
      notes,
    } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'Please provide at least one bill item.' });
    }

    const calculatedItems = items.map((item) => ({
      category: item.category || 'Other',
      description: item.description || 'Hospital Service',
      quantity: Number(item.quantity) || 1,
      unitPrice: Number(item.unitPrice) || 0,
      amount: item.amount !== undefined ? Number(item.amount) : (Number(item.quantity) || 1) * (Number(item.unitPrice) || 0),
    }));

    const subTotal = calculatedItems.reduce((sum, item) => sum + (Number(item.quantity) * Number(item.unitPrice)), 0);
    const taxAmount = Math.round((subTotal * (taxPercent / 100)) * 100) / 100;
    const totalAmount = Math.max(0, subTotal + taxAmount - Number(discountAmount));

    const count = await Bill.countDocuments();
    const billNumber = `HMS-INV-${String(count + 10001)}`;

    const bill = await Bill.create({
      billNumber,
      patient: patientId,
      admission: admissionId || null,
      appointment: appointmentId || null,
      items: calculatedItems,
      subTotal,
      discountAmount,
      taxAmount,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      paymentStatus: 'Pending',
      notes: notes || '',
    });

    // Notify patient
    const patient = await Patient.findById(patientId).populate('user');
    if (patient && patient.user) {
      await Notification.create({
        recipient: patient.user._id,
        title: 'New Hospital Invoice Generated',
        message: `Invoice #${billNumber} for total $${totalAmount.toFixed(2)} has been generated.`,
        type: 'billing',
        linkUrl: `/patient/billing`,
      });
    }

    await logAudit({
      req,
      action: 'BILL_GENERATED',
      entity: 'Bill',
      entityId: bill._id,
      details: { billNumber, patientId, totalAmount },
    });

    res.status(201).json({ success: true, bill });
  } catch (error) {
    next(error);
  }
};

// @desc Record payment for a bill
// @route POST /api/billing/:id/payment
const recordPayment = async (req, res, next) => {
  try {
    const { amount, paymentMethod, transactionRef, receiptNotes } = req.body;
    const bill = await Bill.findById(req.params.id).populate('patient');

    if (!bill) {
      return res.status(404).json({ success: false, message: 'Bill not found' });
    }

    if (bill.paymentStatus === 'Paid' || bill.balanceAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'This invoice has already been settled in full. Duplicate payment prevented.',
      });
    }

    const payAmount = Number(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount.' });
    }

    if (payAmount > bill.balanceAmount) {
      return res.status(400).json({
        success: false,
        message: `Payment amount ($${payAmount}) exceeds outstanding balance ($${bill.balanceAmount}).`,
      });
    }

    if (transactionRef) {
      const existingTx = await Payment.findOne({ bill: bill._id, transactionRef });
      if (existingTx) {
        return res.status(409).json({
          success: false,
          message: `Duplicate transaction detected: A payment with reference ${transactionRef} has already been recorded for this invoice.`,
        });
      }
    }

    const count = await Payment.countDocuments();
    const paymentNumber = `HMS-PAY-${String(count + 10001)}`;

    const payment = await Payment.create({
      paymentNumber,
      bill: bill._id,
      patient: bill.patient._id,
      amount: payAmount,
      paymentMethod: paymentMethod || 'Cash',
      transactionRef: transactionRef || `TXN-${Date.now()}`,
      receiptNotes: receiptNotes || '',
      receivedBy: req.user._id,
    });

    bill.paidAmount += payAmount;
    bill.balanceAmount = Math.max(0, bill.totalAmount - bill.paidAmount);
    bill.paymentStatus = bill.balanceAmount === 0 ? 'Paid' : 'Partially Paid';
    await bill.save();

    await logAudit({
      req,
      action: 'PAYMENT_RECORDED',
      entity: 'Payment',
      entityId: payment._id,
      details: { paymentNumber, billNumber: bill.billNumber, amount: payAmount, paymentMethod },
    });

    res.json({
      success: true,
      message: `Payment of $${payAmount} recorded successfully. Balance: $${bill.balanceAmount}`,
      payment,
      bill,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getBills,
  getBillById,
  generateBill,
  recordPayment,
};
