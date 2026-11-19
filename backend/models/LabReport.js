const mongoose = require('mongoose');

const labReportSchema = new mongoose.Schema(
  {
    reportNumber: {
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
    test: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'LabTest',
      required: true,
    },
    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Appointment',
      default: null,
    },
    status: {
      type: String,
      enum: ['Requested', 'Sample Collected', 'Processing', 'Completed', 'Cancelled'],
      default: 'Requested',
    },
    priority: {
      type: String,
      enum: ['Routine', 'Urgent', 'STAT (Emergency)'],
      default: 'Routine',
    },
    requestedDate: {
      type: Date,
      default: Date.now,
    },
    sampleCollectedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    results: [
      {
        parameter: { type: String, required: true },
        observedValue: { type: String, default: '' },
        normalRange: { type: String, default: '' },
        unit: { type: String, default: '' },
        flag: {
          type: String,
          enum: ['normal', 'abnormal', 'critical'],
          default: 'normal',
        },
      },
    ],
    technicianNotes: {
      type: String,
      default: '',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    isVerifiedByDoctor: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

labReportSchema.index({ patient: 1, requestedDate: -1 });
labReportSchema.index({ doctor: 1, requestedDate: -1 });
labReportSchema.index({ status: 1 });

module.exports = mongoose.model('LabReport', labReportSchema);
