const mongoose = require('mongoose');

const bedSchema = new mongoose.Schema(
  {
    bedNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    ward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ward',
      required: true,
    },
    bedType: {
      type: String,
      enum: ['Standard Electric', 'Semi-Fowler', 'ICU Ventilator Bed', 'Pediatric Crib', 'Oxygen Equipped'],
      default: 'Standard Electric',
    },
    status: {
      type: String,
      enum: ['Available', 'Occupied', 'Reserved', 'Maintenance'],
      default: 'Available',
    },
    currentAdmission: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admission',
      default: null,
    },
    dailyRate: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

bedSchema.index({ ward: 1, status: 1 });

module.exports = mongoose.model('Bed', bedSchema);
