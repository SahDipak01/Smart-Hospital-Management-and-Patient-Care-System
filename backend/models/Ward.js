const mongoose = require('mongoose');

const wardSchema = new mongoose.Schema(
  {
    wardCode: {
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
    wardType: {
      type: String,
      enum: ['General Ward', 'ICU', 'CCU', 'Pediatric', 'Maternity', 'Post-Operative', 'Private Deluxe'],
      required: true,
    },
    floor: {
      type: String,
      required: true,
    },
    totalBeds: {
      type: Number,
      required: true,
      min: 1,
    },
    dailyRate: {
      type: Number,
      required: true,
      min: 0,
    },
    nurseStationPhone: {
      type: String,
      default: '',
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

module.exports = mongoose.model('Ward', wardSchema);
