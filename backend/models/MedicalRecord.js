const mongoose = require('mongoose');

const medicalRecordSchema = new mongoose.Schema(
  {
    recordNumber: {
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
    visitDate: {
      type: Date,
      default: Date.now,
    },
    vitals: {
      bpSystolic: { type: Number, default: 120 },
      bpDiastolic: { type: Number, default: 80 },
      heartRate: { type: Number, default: 72 },
      temperature: { type: Number, default: 98.6 }, // Fahrenheit
      spo2: { type: Number, default: 99 },          // %
      respiratoryRate: { type: Number, default: 16 },
      weightKg: { type: Number, default: 70 },
      heightCm: { type: Number, default: 170 },
      bmi: { type: Number, default: 24.2 },
    },
    chiefComplaints: {
      type: String,
      required: true,
    },
    clinicalObservations: {
      type: String,
      default: '',
    },
    diagnoses: [
      {
        code: { type: String, default: '' },
        description: { type: String, required: true },
        type: { type: String, enum: ['Primary', 'Secondary', 'Differential'], default: 'Primary' },
      },
    ],
    treatmentPlan: {
      type: String,
      default: '',
    },
    notes: {
      type: String,
      default: '',
    },
    attachments: [
      {
        title: String,
        fileUrl: String,
        fileType: String,
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  {
    timestamps: true,
  }
);

medicalRecordSchema.index({ patient: 1, visitDate: -1 });
medicalRecordSchema.index({ doctor: 1, visitDate: -1 });

module.exports = mongoose.model('MedicalRecord', medicalRecordSchema);
