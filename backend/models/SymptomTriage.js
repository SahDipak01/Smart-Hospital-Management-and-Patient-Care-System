const mongoose = require('mongoose');

const symptomTriageSchema = new mongoose.Schema(
  {
    triageNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
    symptoms: [
      {
        name: { type: String, required: true },
        duration: String,
        severity: { type: String, enum: ['Mild', 'Moderate', 'Severe'], default: 'Moderate' },
      },
    ],
    chiefComplaint: {
      type: String,
      required: true,
    },
    severityScore: {
      type: Number,
      min: 1,
      max: 10,
      default: 3,
    },
    severityLevel: {
      type: String,
      enum: ['Routine Care', 'Priority Attention', 'Urgent Medical Evaluation', 'IMMEDIATE EMERGENCY'],
      default: 'Routine Care',
    },
    emergencyFlags: [String],
    guidance: {
      type: String,
      required: true,
    },
    recommendedDepartment: {
      type: String,
      default: 'General Medicine',
    },
    disclaimerAcknowledged: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

symptomTriageSchema.index({ patient: 1, createdAt: -1 });

module.exports = mongoose.model('SymptomTriage', symptomTriageSchema);
