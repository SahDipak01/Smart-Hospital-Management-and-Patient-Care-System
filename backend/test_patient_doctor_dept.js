// Automated Test Suite for Step 5: Patient, Doctor, and Department Management
require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');

const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const Department = require('./models/Department');
const { connectDB } = require('./config/db');
const seedDatabaseIfEmpty = require('./seed');

const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const departmentRoutes = require('./routes/departmentRoutes');

let server;
let baseUrl;

const startTestServer = () => {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    app.use('/api/auth', authRoutes);
    app.use('/api/patients', patientRoutes);
    app.use('/api/doctors', doctorRoutes);
    app.use('/api/departments', departmentRoutes);

    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({ success: false, message: err.message });
    });

    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      resolve();
    });
  });
};

const stopTestServer = () => {
  return new Promise((resolve) => {
    if (server) server.close(() => resolve());
    else resolve();
  });
};

const request = async (method, path, body = null, token = null) => {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = { method, headers };
  if (body) options.body = JSON.stringify(body);

  const res = await fetch(url, options);
  let data = null;
  try {
    data = await res.json();
  } catch (e) {
    data = null;
  }
  return { status: res.status, data };
};

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ PASS: ${name}`);
  } catch (error) {
    results.push({ name, passed: false, error: error.message });
    console.error(`  ✗ FAIL: ${name}\n    Error: ${error.message}`);
  }
};

const assert = (condition, msg) => {
  if (!condition) throw new Error(msg || 'Assertion failed');
};

const runAll = async () => {
  console.log('\n========================================================');
  console.log('  STARTING STEP 5 PATIENT, DOCTOR & DEPT TEST SUITE');
  console.log('========================================================\n');

  await connectDB();
  await seedDatabaseIfEmpty();
  await startTestServer();

  let adminToken = null;
  let doctorToken = null;
  let patientToken = null;

  // 1. Authenticate users
  console.log('--- Phase 1: Authentication ---');

  await test('Login as Administrator', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'admin@hospital.com',
      password: 'Admin@123',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    adminToken = res.data.token;
  });

  await test('Login as Doctor', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'dr.sarah@hospital.com',
      password: 'Doctor@123',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    doctorToken = res.data.token;
  });

  await test('Login as Patient', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'john.doe@email.com',
      password: 'Patient@123',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    patientToken = res.data.token;
  });

  // 2. Department Management Tests
  console.log('\n--- Phase 2: Department Management ---');

  let testDeptId = null;

  await test('Admin can create a new hospital department', async () => {
    const res = await request(
      'POST',
      '/departments',
      {
        code: 'ONCO',
        name: 'Oncology & Chemotherapy Center',
        description: 'Comprehensive cancer diagnostics, immunotherapy, and infusion suite',
        floor: '5th Floor - Specialized Wing',
        contactPhone: 'Ext. 501',
        icon: 'Activity',
      },
      adminToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.success === true, 'Success must be true');
    assert(res.data.department.code === 'ONCO', 'Code must be ONCO');
    testDeptId = res.data.department._id;
  });

  await test('Reject duplicate department code', async () => {
    const res = await request(
      'POST',
      '/departments',
      {
        code: 'ONCO',
        name: 'Duplicate Oncology',
        description: 'Test duplicate',
      },
      adminToken
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.message.includes('already exists'), 'Duplicate message required');
  });

  await test('Search and filter departments with doctor counts', async () => {
    const res = await request('GET', '/departments?search=Cardiology');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.departments.length > 0, 'Cardiology department must be found');
    assert(res.data.departments[0].doctorCount !== undefined, 'doctorCount must be populated');
  });

  await test('Get department details with assigned doctors list', async () => {
    const cardioDept = await Department.findOne({ code: 'CARD' });
    const res = await request('GET', `/departments/${cardioDept._id}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.doctors), 'Assigned doctors list must exist');
    assert(res.data.doctors.length > 0, 'Cardiology must have at least one doctor');
  });

  await test('Admin can assign doctor to department', async () => {
    const doctor = await Doctor.findOne();
    const res = await request(
      'PATCH',
      `/departments/${testDeptId}/assign-doctor`,
      { doctorId: doctor._id },
      adminToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.doctor.department.toString() === testDeptId.toString(), 'Doctor department must be updated');
  });

  await test('Admin can update department details', async () => {
    const res = await request(
      'PUT',
      `/departments/${testDeptId}`,
      { name: 'Comprehensive Oncology & Precision Medicine' },
      adminToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.department.name.includes('Precision Medicine'), 'Name should be updated');
  });

  await test('Doctor is FORBIDDEN from creating departments (403)', async () => {
    const res = await request(
      'POST',
      '/departments',
      { code: 'HACK', name: 'Unauthorized Dept' },
      doctorToken
    );
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('Patient is FORBIDDEN from creating departments (403)', async () => {
    const res = await request(
      'POST',
      '/departments',
      { code: 'HACK2', name: 'Unauthorized Dept' },
      patientToken
    );
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // 3. Doctor Management Tests
  console.log('\n--- Phase 3: Doctor Management ---');

  let testDocId = null;

  await test('Admin can onboard a new doctor', async () => {
    const res = await request(
      'POST',
      '/doctors',
      {
        firstName: 'Elena',
        lastName: 'Rostova',
        email: 'dr.elena@hospital.com',
        phone: '+1 555-4422',
        specialization: 'Medical Oncology',
        department: testDeptId,
        consultationFee: 550,
        roomNumber: 'ONCO-202',
        experienceYears: 8,
        qualifications: [{ degree: 'MBBS, DM Oncology', institution: 'Apex Medical School', year: 2014 }],
      },
      adminToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.doctor.doctorId.startsWith('HMS-DOC-'), 'Unique Doctor ID generated');
    testDocId = res.data.doctor._id;
  });

  await test('Search and filter doctors by department and specialization', async () => {
    const res = await request('GET', '/doctors?specialization=Cardiology');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.doctors.length > 0, 'Cardiologists should be returned');
    assert(res.data.doctors.every((d) => d.specialization.includes('Cardiology')), 'Filtered by Cardiology');
  });

  await test('Get individual doctor profile and slots', async () => {
    const res = await request('GET', `/doctors/${testDocId}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.doctor.roomNumber === 'ONCO-202', 'Doctor profile matches');

    // Test slots for a Monday
    const resSlots = await request('GET', `/doctors/${testDocId}/slots?date=2026-11-23`);
    assert(resSlots.status === 200, `Expected 200, got ${resSlots.status}`);
    assert(Array.isArray(resSlots.data.slots), 'Generated time slots must be array');
  });

  await test('Admin can toggle doctor approval and active status', async () => {
    const resApprove = await request('PATCH', `/doctors/${testDocId}/approve`, {}, adminToken);
    assert(resApprove.status === 200, `Expected 200, got ${resApprove.status}`);

    const resStatus = await request('PATCH', `/doctors/${testDocId}/status`, {}, adminToken);
    assert(resStatus.status === 200, `Expected 200, got ${resStatus.status}`);
    assert(resStatus.data.doctor.status === 'Inactive', 'Doctor should now be Inactive');
  });

  await test('Patient is FORBIDDEN from creating or updating doctors (403)', async () => {
    const res = await request(
      'POST',
      '/doctors',
      { firstName: 'Fake', lastName: 'Doc', email: 'fake@hospital.com' },
      patientToken
    );
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // 4. Patient Management Tests
  console.log('\n--- Phase 4: Patient Management ---');

  let testPatientId = null;

  await test('Admin/Staff/Doctor can register new patient with clinical info', async () => {
    const res = await request(
      'POST',
      '/patients',
      {
        firstName: 'Michael',
        lastName: 'Scott',
        email: 'michael.scott@dunder.com',
        phone: '+1 555-9090',
        dateOfBirth: '1975-03-15',
        gender: 'Male',
        bloodGroup: 'B+',
        address: { street: '1725 Slough Avenue', city: 'Scranton', state: 'PA', zipCode: '18503' },
        emergencyContact: { name: 'Dwight Schrute', relationship: 'Assistant', phone: '+1 555-8811' },
        allergies: [{ substance: 'Penicillin', severity: 'Severe' }],
        chronicConditions: [{ condition: 'Mild Hypertension' }],
      },
      doctorToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.patient.uhid.startsWith('HMS-P-'), 'Auto-generated UHID required');
    assert(res.data.patient.bloodGroup === 'B+', 'Blood group matches');
    assert(res.data.patient.emergencyContact.name === 'Dwight Schrute', 'Emergency contact saved');
    testPatientId = res.data.patient._id;
  });

  await test('Search, filter, and paginate patients', async () => {
    const res = await request('GET', '/patients?search=Michael&bloodGroup=B+&page=1&limit=10', null, doctorToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.patients.length > 0, 'Found registered patient');
    assert(res.data.total >= 1, 'Total count returned');
    assert(res.data.pages >= 1, 'Pages count returned');
  });

  await test('View individual patient profile and chronological timeline', async () => {
    const res = await request('GET', `/patients/${testPatientId}`, null, doctorToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.patient.firstName === 'Michael', 'Patient name matches');
    assert(res.data.history.medicalRecords !== undefined, 'History structure exists');

    const resTimeline = await request('GET', `/patients/${testPatientId}/timeline`, null, doctorToken);
    assert(resTimeline.status === 200, `Expected 200, got ${resTimeline.status}`);
    assert(Array.isArray(resTimeline.data.timeline), 'Timeline must be array');
  });

  await test('Patient is FORBIDDEN from accessing other patient records (403)', async () => {
    const res = await request('GET', `/patients/${testPatientId}`, null, patientToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // Cleanup test records
  await Department.deleteOne({ _id: testDeptId });
  await Doctor.deleteOne({ _id: testDocId });
  await User.deleteOne({ email: 'dr.elena@hospital.com' });
  await Patient.deleteOne({ _id: testPatientId });
  await User.deleteOne({ email: 'michael.scott@dunder.com' });

  await stopTestServer();
  await mongoose.disconnect();

  console.log('\n========================================================');
  console.log('  TEST SUMMARY');
  console.log('========================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`  Total Tests Run: ${total}`);
  console.log(`  Passed:          ${passed}`);
  console.log(`  Failed:          ${failed}`);

  if (failed > 0) {
    console.error('\n  FAILURES DETECTED:');
    results.filter((r) => !r.passed).forEach((r) => console.error(`   - ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('\n  ALL STEP 5 TESTS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  }
};

runAll().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
