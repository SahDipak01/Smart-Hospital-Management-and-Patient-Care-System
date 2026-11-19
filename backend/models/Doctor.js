const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    firstName: {
      type: String,
      required: true,
      trim: true,
    },
    lastName: {
      type: String,
      required: true,
      trim: true,
    },
    specialization: {
      type: String,
      required: true,
      trim: true,
    },
    department: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Department',
      required: true,
    },
    qualifications: [
      {
        degree: String,
        institution: String,
        year: Number,
      },
    ],
    experienceYears: {
      type: Number,
      default: 1,
    },
    consultationFee: {
      type: Number,
      required: true,
      default: 500,
    },
    phone: {
      type: String,
      required: true,
    },
    licenseNumber: {
      type: String,
      trim: true,
      default: '',
    },
    roomNumber: {
      type: String,
      default: 'OPD-101',
    },
    scheduleSlots: [
      {
        dayOfWeek: {
          type: String,
          enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        },
        startTime: String, // e.g. "09:00"
        endTime: String,   // e.g. "13:00"
        slotDurationMinutes: { type: Number, default: 20 },
        maxPatientsPerSlot: { type: Number, default: 1 },
      },
    ],
    isApproved: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Inactive', 'On Leave', 'Suspended'],
      default: 'Active',
    },
    bio: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

doctorSchema.virtual('fullName').get(function () {
  return `Dr. ${this.firstName} ${this.lastName}`;
});

doctorSchema.index({ doctorId: 1, department: 1, specialization: 1 });

module.exports = mongoose.model('Doctor', doctorSchema);
