const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    uhid: {
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
    dateOfBirth: {
      type: Date,
      required: true,
    },
    gender: {
      type: String,
      enum: ['Male', 'Female', 'Other'],
      required: true,
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'],
      default: 'Unknown',
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    address: {
      street: { type: String, default: '' },
      city: { type: String, default: '' },
      state: { type: String, default: '' },
      zipCode: { type: String, default: '' },
    },
    emergencyContact: {
      name: { type: String, default: '' },
      relationship: { type: String, default: '' },
      phone: { type: String, default: '' },
    },
    allergies: [
      {
        substance: String,
        severity: { type: String, enum: ['Mild', 'Moderate', 'Severe'], default: 'Moderate' },
        reaction: String,
      },
    ],
    chronicConditions: [
      {
        condition: String,
        diagnosedYear: String,
        status: { type: String, default: 'Active' },
      },
    ],
    insurance: {
      provider: { type: String, default: '' },
      policyNumber: { type: String, default: '' },
      coverageAmount: { type: Number, default: 0 },
      expiryDate: { type: Date, default: null },
    },
    status: {
      type: String,
      enum: ['Active', 'Inpatient', 'Discharged', 'Inactive'],
      default: 'Active',
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

patientSchema.index({ uhid: 1, phone: 1, firstName: 1, lastName: 1 });

module.exports = mongoose.model('Patient', patientSchema);
