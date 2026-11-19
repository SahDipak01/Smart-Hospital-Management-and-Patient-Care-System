const mongoose = require('mongoose');

const labTestSchema = new mongoose.Schema(
  {
    testCode: {
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
    category: {
      type: String,
      enum: ['Hematology', 'Biochemistry', 'Microbiology', 'Pathology', 'Radiology', 'Immunology', 'Cardiology Diagnostics'],
      required: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      default: null,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    turnaroundHours: {
      type: Number,
      default: 24,
    },
    sampleType: {
      type: String,
      enum: ['Blood', 'Urine', 'Serum', 'Plasma', 'Sputum', 'Stool', 'Swab', 'Biopsy', 'Imaging', 'None'],
      default: 'Blood',
    },
    parameters: [
      {
        name: { type: String, required: true },
        normalRange: { type: String, required: true },
        unit: { type: String, default: '' },
      },
    ],
    preparationInstructions: {
      type: String,
      default: 'No special preparation needed.',
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

module.exports = mongoose.model('LabTest', labTestSchema);
