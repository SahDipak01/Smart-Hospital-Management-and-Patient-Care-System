const Medicine = require('../models/Medicine');
const PharmacyDispense = require('../models/PharmacyDispense');
const Prescription = require('../models/Prescription');
const Bill = require('../models/Bill');
const { logAudit } = require('../middleware/audit');

// @desc Get medicine inventory with filters & alerts
// @route GET /api/pharmacy/inventory
const getInventory = async (req, res, next) => {
  try {
    const { search, category, lowStock, expiringSoon, page = 1, limit = 50 } = req.query;
    let query = { isActive: true };

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { genericName: { $regex: search, $options: 'i' } },
        { itemCode: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'All') {
      query.category = category;
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stockQuantity', '$reorderLevel'] };
    }

    if (expiringSoon === 'true') {
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);
      query.expiryDate = { $lte: ninetyDaysFromNow };
    }

    const total = await Medicine.countDocuments(query);
    const medicines = await Medicine.find(query)
      .sort({ stockQuantity: 1, name: 1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    // Summary alert metrics
    const lowStockCount = await Medicine.countDocuments({
      isActive: true,
      $expr: { $lte: ['$stockQuantity', '$reorderLevel'] },
    });

    const ninetyDays = new Date();
    ninetyDays.setDate(ninetyDays.getDate() + 90);
    const expiringSoonCount = await Medicine.countDocuments({
      isActive: true,
      expiryDate: { $lte: ninetyDays },
    });

    res.json({
      success: true,
      total,
      page: Number(page),
      pages: Math.ceil(total / limit),
      alerts: {
        lowStockCount,
        expiringSoonCount,
      },
      medicines,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Add medicine item to inventory
// @route POST /api/pharmacy/inventory
const addMedicine = async (req, res, next) => {
  try {
    const {
      name,
      genericName,
      category,
      brand,
      dosageForm,
      strength,
      unitPrice,
      stockQuantity,
      reorderLevel,
      batchNumber,
      expiryDate,
      manufacturer,
      rackLocation,
    } = req.body;

    const count = await Medicine.countDocuments();
    const itemCode = `MED-${String(count + 1001)}`;

    const medicine = await Medicine.create({
      itemCode,
      name,
      genericName,
      category,
      brand: brand || '',
      dosageForm,
      strength,
      unitPrice,
      stockQuantity,
      reorderLevel: reorderLevel || 20,
      batchNumber,
      expiryDate,
      manufacturer: manufacturer || '',
      rackLocation: rackLocation || 'A-1',
    });

    await logAudit({
      req,
      action: 'MEDICINE_ADDED',
      entity: 'Medicine',
      entityId: medicine._id,
      details: { itemCode, name, stockQuantity },
    });

    res.status(201).json({ success: true, medicine });
  } catch (error) {
    next(error);
  }
};

// @desc Update medicine stock / details
// @route PUT /api/pharmacy/inventory/:id
const updateMedicine = async (req, res, next) => {
  try {
    const medicine = await Medicine.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    await logAudit({
      req,
      action: 'MEDICINE_UPDATED',
      entity: 'Medicine',
      entityId: medicine._id,
      details: { itemCode: medicine.itemCode, updatedStock: medicine.stockQuantity },
    });

    res.json({ success: true, medicine });
  } catch (error) {
    next(error);
  }
};

// @desc Dispense prescription medications with atomic stock decrement
// @route POST /api/pharmacy/dispense
const dispensePrescription = async (req, res, next) => {
  try {
    const { prescriptionId, patientId, items, notes } = req.body;

    if (!items || !items.length) {
      return res.status(400).json({ success: false, message: 'No items provided for dispensing.' });
    }

    let calculatedTotal = 0;
    const dispenseItems = [];

    // Check stock for every requested item before deducting
    for (const item of items) {
      const med = await Medicine.findById(item.medicineId);
      if (!med) {
        return res.status(404).json({ success: false, message: `Medicine record not found: ${item.medicineId}` });
      }

      if (med.stockQuantity < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `Insufficient inventory for ${med.name}. Available: ${med.stockQuantity}, Requested: ${item.quantity}.`,
        });
      }

      const subTotal = med.unitPrice * item.quantity;
      calculatedTotal += subTotal;

      dispenseItems.push({
        medicine: med._id,
        medicineName: med.name,
        batchNumber: med.batchNumber,
        quantity: item.quantity,
        unitPrice: med.unitPrice,
        subTotal,
      });

      // Atomic stock decrement
      med.stockQuantity -= item.quantity;
      await med.save();
    }

    const count = await PharmacyDispense.countDocuments();
    const dispenseNumber = `HMS-DIS-${String(count + 10001)}`;

    const dispense = await PharmacyDispense.create({
      dispenseNumber,
      prescription: prescriptionId || null,
      patient: patientId,
      dispensedBy: req.user._id,
      items: dispenseItems,
      totalAmount: calculatedTotal,
      paymentStatus: 'Billed',
      notes: notes || '',
    });

    // Mark prescription status as Dispensed if linked
    if (prescriptionId) {
      await Prescription.findByIdAndUpdate(prescriptionId, {
        status: 'Dispensed',
        $push: {
          auditTrail: {
            action: 'DISPENSED',
            performedBy: req.user._id,
            timestamp: new Date(),
            notes: `Dispensed under transaction #${dispenseNumber}`,
          },
        },
      });
    }

    await logAudit({
      req,
      action: 'MEDICINE_DISPENSED',
      entity: 'PharmacyDispense',
      entityId: dispense._id,
      details: { dispenseNumber, totalAmount: calculatedTotal, itemCount: items.length },
    });

    res.status(201).json({
      success: true,
      message: 'Prescription medications dispensed successfully and inventory updated.',
      dispense,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get dispense history
// @route GET /api/pharmacy/dispenses
const getDispenses = async (req, res, next) => {
  try {
    const dispenses = await PharmacyDispense.find()
      .populate('patient', 'uhid firstName lastName phone')
      .populate('dispensedBy', 'name email')
      .populate('prescription', 'prescriptionNumber')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ success: true, count: dispenses.length, dispenses });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getInventory,
  addMedicine,
  updateMedicine,
  dispensePrescription,
  getDispenses,
};
