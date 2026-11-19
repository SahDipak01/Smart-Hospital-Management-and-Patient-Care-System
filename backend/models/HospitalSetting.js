const mongoose = require('mongoose');

const hospitalSettingSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: 'Apex Memorial Smart Hospital & Research Center',
    },
    tagline: {
      type: String,
      default: 'Compassionate Care, Advanced Technology',
    },
    registrationNumber: {
      type: String,
      default: 'HOSP-ISO-9001-2026',
    },
    emergencyPhone: {
      type: String,
      default: '+1 (800) 555-EMERGENCY',
    },
    receptionPhone: {
      type: String,
      default: '+1 (800) 555-0199',
    },
    email: {
      type: String,
      default: 'contact@apexsmarthealth.org',
    },
    address: {
      street: { type: String, default: '450 Healthcare Boulevard' },
      city: { type: String, default: 'Metro City' },
      state: { type: String, default: 'State' },
      zipCode: { type: String, default: '10001' },
    },
    taxRatePercent: {
      type: Number,
      default: 5.0,
    },
    currency: {
      type: String,
      default: '$',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('HospitalSetting', hospitalSettingSchema);
