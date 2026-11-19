const mongoose = require('mongoose');

const admissionSchema = new mongoose.Schema(
  {
    admissionNumber: {
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
    ward: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Ward',
      required: true,
    },
    bed: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Bed',
      required: true,
    },
    admissionDate: {
      type: Date,
      default: Date.now,
    },
    dischargeDate: {
      type: Date,
      default: null,
    },
    admissionDiagnosis: {
      type: String,
      required: true,
    },
    admissionReason: {
      type: String,
      default: '',
    },
    dischargeSummary: {
      dischargeCondition: { type: String, default: '' },
      adviceOnDischarge: { type: String, default: '' },
      followUpDate: { type: Date, default: null },
      summaryNotes: { type: String, default: '' },
    },
    status: {
      type: String,
      enum: ['Admitted', 'Discharged', 'Transferred'],
      default: 'Admitted',
    },
    vitalsLog: [
      {
        recordedAt: { type: Date, default: Date.now },
        bpSystolic: Number,
        bpDiastolic: Number,
        pulse: Number,
        spo2: Number,
        temperature: Number,
        notes: String,
        recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      },
    ],
    transferHistory: [
      {
        fromWard: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
        fromBed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed' },
        toWard: { type: mongoose.Schema.Types.ObjectId, ref: 'Ward' },
        toBed: { type: mongoose.Schema.Types.ObjectId, ref: 'Bed' },
        transferredAt: { type: Date, default: Date.now },
        reason: String,
      },
    ],
  },
  {
    timestamps: true,
  }
);

admissionSchema.index({ patient: 1, status: 1 });
admissionSchema.index({ bed: 1, status: 1 });

module.exports = mongoose.model('Admission', admissionSchema);
