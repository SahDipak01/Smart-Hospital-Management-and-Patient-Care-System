const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema(
  {
    itemCode: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    genericName: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: [
        'Antibiotics',
        'Analgesics & Pain Relief',
        'Antipyretics',
        'Cardiovascular',
        'Respiratory',
        'Gastrointestinal',
        'Endocrine & Diabetes',
        'Vitamins & Supplements',
        'Emergency & Critical Care',
        'Other',
      ],
      default: 'Other',
    },
    brand: {
      type: String,
      default: '',
    },
    dosageForm: {
      type: String,
      enum: ['Tablet', 'Capsule', 'Syrup', 'Injection', 'Ointment', 'Drops', 'Inhaler', 'IV Fluid'],
      required: true,
    },
    strength: {
      type: String,
      required: true, // e.g. "500 mg"
    },
    unitPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    stockQuantity: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    reorderLevel: {
      type: Number,
      default: 20,
    },
    batchNumber: {
      type: String,
      required: true,
    },
    expiryDate: {
      type: Date,
      required: true,
    },
    manufacturer: {
      type: String,
      default: '',
    },
    rackLocation: {
      type: String,
      default: 'Rack A-1',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

medicineSchema.index({ name: 1, genericName: 1, category: 1 });
medicineSchema.index({ expiryDate: 1, stockQuantity: 1 });

module.exports = mongoose.model('Medicine', medicineSchema);
