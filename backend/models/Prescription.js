const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    medicalRecord: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'MedicalRecord',
      default: null,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    diagnoses: [String],
    medicines: [
      {
        name: { type: String, required: true },
        genericName: { type: String, default: '' },
        dosage: { type: String, required: true }, // e.g. "500mg"
        frequency: { type: String, required: true }, // e.g. "1-0-1 (After meals)"
        duration: { type: String, required: true }, // e.g. "5 days"
        route: { type: String, enum: ['Oral', 'IV', 'IM', 'Topical', 'Inhalation', 'Sublingual'], default: 'Oral' },
        instructions: { type: String, default: 'Take with warm water' },
        quantity: { type: Number, default: 10 },
        dispensed: { type: Boolean, default: false },
        dispensedQuantity: { type: Number, default: 0 },
      },
    ],
    generalInstructions: {
      type: String,
      default: 'Rest adequately and drink plenty of fluids.',
    },
    followUpDate: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ['Active', 'Dispensed', 'Cancelled'],
      default: 'Active',
    },
    auditTrail: [
      {
        action: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        notes: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

prescriptionSchema.index({ patient: 1, date: -1 });
prescriptionSchema.index({ doctor: 1, date: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
