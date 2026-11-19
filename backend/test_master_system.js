// ==============================================================================
// MASTER END-TO-END SYSTEM INTEGRATION TEST SUITE
// Apex Memorial Smart Hospital Management & Patient Care System
// ==============================================================================
require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');

// Model Imports
const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const Department = require('./models/Department');
const Appointment = require('./models/Appointment');
const MedicalRecord = require('./models/MedicalRecord');
const Prescription = require('./models/Prescription');
const Medicine = require('./models/Medicine');
const PharmacyDispense = require('./models/PharmacyDispense');
const LabTest = require('./models/LabTest');
const LabReport = require('./models/LabReport');
const Ward = require('./models/Ward');
const Bed = require('./models/Bed');
const Admission = require('./models/Admission');
const Bill = require('./models/Bill');
const Payment = require('./models/Payment');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const Staff = require('./models/Staff');

const { connectDB } = require('./config/db');
const seedDatabaseIfEmpty = require('./seed');

// Route Imports
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const doctorRoutes = require('./routes/doctorRoutes');
const departmentRoutes = require('./routes/departmentRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const medicalRecordRoutes = require('./routes/medicalRecordRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const pharmacyRoutes = require('./routes/pharmacyRoutes');
const labRoutes = require('./routes/labRoutes');
const wardBedRoutes = require('./routes/wardBedRoutes');
const billingRoutes = require('./routes/billingRoutes');
const triageRoutes = require('./routes/triageRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const staffRoutes = require('./routes/staffRoutes');
const auditRoutes = require('./routes/auditRoutes');

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
    app.use('/api/appointments', appointmentRoutes);
    app.use('/api/medical-records', medicalRecordRoutes);
    app.use('/api/prescriptions', prescriptionRoutes);
    app.use('/api/pharmacy', pharmacyRoutes);
    app.use('/api/lab', labRoutes);
    app.use('/api/wards', wardBedRoutes);
    app.use('/api/billing', billingRoutes);
    app.use('/api/triage', triageRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/staff', staffRoutes);
    app.use('/api/audit-logs', auditRoutes);

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

const runMasterSuite = async () => {
  console.log('\n==============================================================================');
  console.log('   APEX CARE SMART HOSPITAL - FINAL MASTER SYSTEM INTEGRATION SUITE');
  console.log('==============================================================================\n');

  await connectDB();
  await seedDatabaseIfEmpty();
  await startTestServer();

  let adminToken, doctorToken, patientToken, staffToken;
  let adminUser, doctorUser, patientUser;
  let doctorProfileId, departmentId;
  let testPatientId, testPatientUhid;
  let appointmentId, appointmentSlot;
  let medicalRecordId, prescriptionId;
  let labOrderId, admissionId, bedId;
  let billId;

  // --------------------------------------------------------------------------
  // SECTION 1: AUTHENTICATION & MULTI-ROLE SESSIONS
  // --------------------------------------------------------------------------
  console.log('--- Phase 1: Authentication & Role Verification ---');

  await test('1.1 Admin Authentication & Profile Verification', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'admin@hospital.com',
      password: 'Admin@123',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.role === 'admin', 'User role must be admin');
    adminToken = res.data.token;
    adminUser = res.data.user;
  });

  await test('1.2 Doctor Authentication & Profile Loading', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'dr.sarah@hospital.com',
      password: 'Doctor@123',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.role === 'doctor', 'User role must be doctor');
    doctorToken = res.data.token;
    doctorUser = res.data.user;
    doctorProfileId = res.data.user.profile?._id;
  });

  await test('1.3 Patient Authentication & UHID Retrieval', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'john.doe@email.com',
      password: 'Patient@123',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.role === 'patient', 'User role must be patient');
    patientToken = res.data.token;
    patientUser = res.data.user;
  });

  await test('1.4 Staff Authentication & Workstation Access', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'nurse.clara@hospital.com',
      password: 'Staff@123',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.role === 'staff', 'User role must be staff');
    staffToken = res.data.token;
  });

  // --------------------------------------------------------------------------
  // SECTION 2: CLINICAL DEPARTMENTS & DOCTOR SCHEDULE SLOTS
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 2: Clinical Departments & Availability Engine ---');

  await test('2.1 Retrieve Clinical Departments Catalog with Doctor Aggregation', async () => {
    const res = await request('GET', '/departments');
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.departments.length >= 6, 'Should have at least 6 departments');
    const cardio = res.data.departments.find((d) => d.code === 'CARD');
    assert(cardio !== undefined, 'Cardiology department must exist');
    departmentId = cardio._id;
    assert(cardio.doctorCount >= 1, 'Cardiology should have doctors assigned');
  });

  await test('2.2 Generate Doctor Availability Slots on Consultation Date', async () => {
    // Generate target future date
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 4);
    const dateStr = targetDate.toISOString().split('T')[0];

    const res = await request('GET', `/doctors/${doctorProfileId}/slots?date=${dateStr}`);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.slots), 'Slots must be an array');
    const avail = res.data.slots.find((s) => s.isAvailable);
    assert(avail !== undefined, 'Should have at least one available slot');
    appointmentSlot = avail.slot;
  });

  // --------------------------------------------------------------------------
  // SECTION 3: PATIENT REGISTRATION, CLINICAL DATA & SELF-RECORD
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 3: Patient Registration & EMR Self-Record ---');

  let newPatientToken;
  await test('3.1 Register New Patient with Auto-UHID and Clinical Safety Info', async () => {
    const uniqueEmail = `patient.master.${Date.now()}@healthtest.com`;
    const res = await request('POST', '/auth/register', {
      name: 'Alexander Hamilton',
      email: uniqueEmail,
      password: 'Password@123',
      phone: '+1 555-0199',
      dateOfBirth: '1985-01-11',
      gender: 'Male',
      bloodGroup: 'O+',
      emergencyContact: { name: 'Elizabeth Schuyler', relationship: 'Spouse', phone: '+1 555-0198' },
      allergies: 'Penicillin, Shellfish',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.user.profile.uhid.startsWith('HMS-P-'), 'UHID must start with HMS-P-');
    testPatientId = res.data.user.profile._id;
    testPatientUhid = res.data.user.profile.uhid;
    newPatientToken = res.data.token;
  });

  await test('3.2 Patient Can Access Own Complete EMR Record & Timeline via /me/record', async () => {
    const res = await request('GET', '/patients/me/record', null, newPatientToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.patient.uhid === testPatientUhid, 'UHID must match logged in patient');
    assert(Array.isArray(res.data.timeline), 'Timeline must be array');
    assert(res.data.history.medicalRecords !== undefined, 'History records structure must exist');
  });

  // --------------------------------------------------------------------------
  // SECTION 4: APPOINTMENT BOOKING & DOUBLE-BOOKING PREVENTION
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 4: Appointment Scheduling & Conflict Engine ---');

  const aptDate = new Date();
  aptDate.setDate(aptDate.getDate() + 4);
  const aptDateStr = aptDate.toISOString().split('T')[0];

  await test('4.1 Atomic Appointment Booking with Confirmation', async () => {
    const res = await request(
      'POST',
      '/appointments',
      {
        doctorId: doctorProfileId,
        departmentId,
        appointmentDate: aptDateStr,
        timeSlot: appointmentSlot,
        reason: 'Comprehensive cardiac assessment',
      },
      newPatientToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.appointment.status === 'Confirmed', 'Status must be Confirmed');
    assert(res.data.appointment.appointmentNumber.startsWith('HMS-APT-'), 'Must have appointment number');
    appointmentId = res.data.appointment._id;
  });

  await test('4.2 Prevent Double-Booking for Overlapping Slot (409 Conflict)', async () => {
    const res = await request(
      'POST',
      '/appointments',
      {
        patientId: testPatientId,
        doctorId: doctorProfileId,
        departmentId,
        appointmentDate: aptDateStr,
        timeSlot: appointmentSlot,
        reason: 'Attempted duplicate booking',
      },
      adminToken
    );
    assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
    assert(res.data.message.includes('Conflict'), 'Message must indicate conflict');
  });

  await test('4.3 OPD Reception Patient Check-In & Queue Wait Estimation', async () => {
    const res = await request(
      'PATCH',
      `/appointments/${appointmentId}/check-in`,
      null,
      staffToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.appointment.status === 'Checked-In', 'Status must be Checked-In');
    assert(res.data.appointment.checkedInAt !== undefined, 'checkedInAt must be recorded');
    assert(res.data.queueWait !== undefined, 'queueWait info must be provided');
    assert(typeof res.data.queueWait.estimatedWaitMinutes === 'number', 'estimatedWaitMinutes must be a number');
  });

  // --------------------------------------------------------------------------
  // SECTION 5: CLINICAL CONSULTATION & DIAGNOSIS RECORDING
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 5: Doctor Consultation & EMR Recording ---');

  await test('5.1 Doctor Records Clinical Consultation, Vitals & ICD Diagnosis', async () => {
    const res = await request(
      'POST',
      '/medical-records',
      {
        patientId: testPatientId,
        appointmentId,
        vitals: {
          bpSystolic: 122,
          bpDiastolic: 78,
          heartRate: 68,
          temperature: 98.4,
          spo2: 99,
          weightKg: 78,
          heightCm: 180,
          bmi: 24.1,
        },
        chiefComplaints: 'Occasional mild palpitations after heavy exercise',
        clinicalObservations: 'Resting pulse normal, regular rhythm, no murmurs on auscultation',
        diagnoses: [
          { code: 'I49.9', description: 'Cardiac arrhythmia, unspecified - mild benign', type: 'Primary' },
        ],
        treatmentPlan: 'Maintain regular hydration, reduce caffeine, 30 days follow-up',
        notes: 'Advised stress test and lipid profile.',
      },
      doctorToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.record.recordNumber.startsWith('HMS-EMR-'), 'Record number must start with HMS-EMR-');
    medicalRecordId = res.data.record._id;

    // Verify linked appointment was automatically updated to Completed
    const aptCheck = await request('GET', `/appointments/${appointmentId}`, null, adminToken);
    assert(aptCheck.data.appointment.status === 'Completed', 'Appointment status must be auto-marked Completed');
  });

  // --------------------------------------------------------------------------
  // SECTION 6: e-PRESCRIPTION & PHARMACY DISPENSING
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 6: e-Prescriptions & Pharmacy Inventory ---');

  await test('6.1 Doctor Authors Electronic Prescription', async () => {
    const res = await request(
      'POST',
      '/prescriptions',
      {
        patientId: testPatientId,
        appointmentId,
        medicalRecordId,
        medicines: [
          {
            name: 'Metoprolol Tartrate',
            dosage: '25 mg',
            frequency: '1-0-0 (Morning)',
            duration: '14 days',
            route: 'Oral',
            instructions: 'Take with morning meal',
            quantity: 14,
          },
        ],
        generalInstructions: 'Follow all dosage guidelines carefully. Do not abruptly discontinue.',
        followUpDate: '2026-12-15',
      },
      doctorToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.prescription.prescriptionNumber.startsWith('HMS-RX-'), 'Must have RX number');
    prescriptionId = res.data.prescription._id;
  });

  await test('6.2 Pharmacy Dispenses Prescription with Atomic Stock Decrement', async () => {
    // 1. Locate medicine
    const medRes = await request('GET', '/pharmacy/inventory?search=Metoprolol', null, staffToken);
    let med = medRes.data.medicines?.[0];
    if (!med) {
      // Add if not present
      const addRes = await request(
        'POST',
        '/pharmacy/inventory',
        {
          name: 'Metoprolol Tartrate',
          genericName: 'Metoprolol',
          category: 'Cardiovascular',
          dosageForm: 'Tablet',
          strength: '25 mg',
          unitPrice: 12.5,
          stockQuantity: 100,
          reorderLevel: 20,
          batchNumber: 'MET-2026-01',
          expiryDate: '2028-06-30',
        },
        adminToken
      );
      med = addRes.data.medicine;
    }

    const prevStock = med.stockQuantity;

    // 2. Dispense
    const disRes = await request(
      'POST',
      '/pharmacy/dispense',
      {
        prescriptionId,
        patientId: testPatientId,
        items: [{ medicineId: med._id, quantity: 14 }],
        notes: 'Dispensed full 14 day regimen with dosage card',
      },
      staffToken
    );
    assert(disRes.status === 201, `Expected 201, got ${disRes.status}`);

    // 3. Verify stock decrement
    const checkRes = await request('GET', `/pharmacy/inventory?search=Metoprolol`, null, staffToken);
    const updatedStock = checkRes.data.medicines[0].stockQuantity;
    assert(updatedStock === prevStock - 14, `Stock must be decremented by 14 (${prevStock} -> ${updatedStock})`);
  });

  // --------------------------------------------------------------------------
  // SECTION 7: LABORATORY WORKFLOW
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 7: Laboratory Diagnostic Workflow ---');

  let lipidTestId;
  await test('7.1 Doctor Orders Diagnostic Laboratory Test', async () => {
    // Locate or create lab test
    const testsRes = await request('GET', '/lab/tests?search=Lipid', null, staffToken);
    let lipidTest = testsRes.data.tests?.[0];
    if (!lipidTest) {
      const createRes = await request(
        'POST',
        '/lab/tests',
        {
          testCode: 'LT-LIPID',
          name: 'Comprehensive Lipid Profile Panel',
          category: 'Biochemistry',
          price: 75,
          sampleType: 'Blood (Fasting)',
          parameters: [
            { name: 'Total Cholesterol', unit: 'mg/dL', normalRange: '125 - 200' },
            { name: 'HDL Cholesterol', unit: 'mg/dL', normalRange: '> 40' },
            { name: 'LDL Cholesterol', unit: 'mg/dL', normalRange: '< 100' },
          ],
        },
        adminToken
      );
      lipidTest = createRes.data.test;
    }
    lipidTestId = lipidTest._id;

    const orderRes = await request(
      'POST',
      '/lab/orders',
      {
        patientId: testPatientId,
        testId: lipidTestId,
        appointmentId,
        priority: 'Routine',
      },
      doctorToken
    );
    assert(orderRes.status === 201, `Expected 201, got ${orderRes.status}`);
    assert(orderRes.data.order.status === 'Requested', 'Initial status must be Requested');
    labOrderId = orderRes.data.order._id;
  });

  await test('7.2 Lab Technician Records Results & Finalizes Report', async () => {
    const updateRes = await request(
      'PATCH',
      `/lab/orders/${labOrderId}`,
      {
        status: 'Completed',
        results: [
          { parameter: 'Total Cholesterol', observedValue: '178', unit: 'mg/dL', normalRange: '125 - 200', flag: 'normal' },
          { parameter: 'HDL Cholesterol', observedValue: '48', unit: 'mg/dL', normalRange: '> 40', flag: 'normal' },
          { parameter: 'LDL Cholesterol', observedValue: '96', unit: 'mg/dL', normalRange: '< 100', flag: 'normal' },
        ],
        technicianNotes: 'Fasting specimen analyzed on Roche Cobas chemistry platform.',
      },
      staffToken
    );
    assert(updateRes.status === 200, `Expected 200, got ${updateRes.status}`);
    assert(updateRes.data.order.status === 'Completed', 'Order status must be Completed');
    assert(updateRes.data.order.completedAt !== null, 'completedAt must be recorded');
  });

  // --------------------------------------------------------------------------
  // SECTION 8: WARDS, BED ALLOCATION & DISCHARGE
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 8: Wards, Bed Matrix & Inpatient Discharge ---');

  await test('8.1 Inpatient Bed Allocation & Double Allocation Prevention', async () => {
    const matrixRes = await request('GET', '/wards/bed-matrix', null, staffToken);
    const wardEntry = matrixRes.data.matrix?.[0];
    assert(wardEntry !== undefined, 'At least one ward must exist');
    const vacantBed = wardEntry.beds.find((b) => b.status === 'Available');
    assert(vacantBed !== undefined, 'Vacant bed required for test');
    bedId = vacantBed._id;

    // 1. Admit patient
    const admitRes = await request(
      'POST',
      '/wards/admissions',
      {
        patientId: testPatientId,
        doctorId: doctorProfileId,
        wardId: wardEntry.ward.id,
        bedId,
        admissionDiagnosis: 'Post-catheterization clinical observation',
      },
      staffToken
    );
    assert(admitRes.status === 201, `Expected 201, got ${admitRes.status}`);
    assert(admitRes.data.admission.status === 'Admitted', 'Status must be Admitted');
    admissionId = admitRes.data.admission._id;

    // 2. Double-bed allocation rejection test
    const dupRes = await request(
      'POST',
      '/wards/admissions',
      {
        patientId: patientUser.profile?._id || testPatientId,
        doctorId: doctorProfileId,
        wardId: wardEntry.ward.id,
        bedId,
        admissionDiagnosis: 'Duplicate bed attempt',
      },
      staffToken
    );
    assert(dupRes.status === 409, `Expected 409 Conflict for occupied bed, got ${dupRes.status}`);
  });

  let secondBedId;
  await test('8.2 Inpatient Bed Transfer to Another Ward/Bed & History Audit', async () => {
    // Find another available bed
    const matrixRes = await request('GET', '/wards/bed-matrix', null, staffToken);
    const allAvailableBeds = matrixRes.data.matrix
      .flatMap((m) => m.beds)
      .filter((b) => b.status === 'Available' && b._id.toString() !== bedId.toString());
    assert(allAvailableBeds.length > 0, 'Another available bed must exist for transfer test');
    secondBedId = allAvailableBeds[0]._id;

    const transferRes = await request(
      'POST',
      `/wards/admissions/${admissionId}/transfer`,
      {
        targetBedId: secondBedId,
        reason: 'Patient relocated to step-down telemetry observation unit',
      },
      staffToken
    );
    assert(transferRes.status === 200, `Expected 200, got ${transferRes.status}`);
    assert(transferRes.data.admission.bed.toString() === secondBedId.toString(), 'Admission bed must be updated to target bed');
    assert(transferRes.data.admission.transferHistory.length === 1, 'Transfer history must record 1 entry');
    assert(transferRes.data.admission.transferHistory[0].fromBed.toString() === bedId.toString(), 'Original bed recorded in history');

    // Verify bed matrix status reflects transfer
    const postMatrix = await request('GET', '/wards/bed-matrix', null, staffToken);
    const allBeds = postMatrix.data.matrix.flatMap((m) => m.beds);
    const oldBedCheck = allBeds.find((b) => b._id.toString() === bedId.toString());
    const newBedCheck = allBeds.find((b) => b._id.toString() === secondBedId.toString());
    assert(oldBedCheck.status === 'Available', 'Old bed must now be Available');
    assert(newBedCheck.status === 'Occupied', 'Target bed must now be Occupied');

    // Update bedId to secondBedId so discharge releases the new bed
    bedId = secondBedId;
  });

  await test('8.3 Discharge Inpatient, Calculate Stay Days & Release Bed', async () => {
    const dischRes = await request(
      'POST',
      `/wards/admissions/${admissionId}/discharge`,
      {
        dischargeCondition: 'Hemodynamically stable, ambulatory, no complications',
        adviceOnDischarge: 'Continue prescribed medications, avoid vigorous activity for 7 days',
        followUpDate: '2026-12-05',
      },
      staffToken
    );
    assert(dischRes.status === 200, `Expected 200, got ${dischRes.status}`);
    assert(dischRes.data.admission.status === 'Discharged', 'Status must be Discharged');
    assert(dischRes.data.staySummary.stayedDays >= 1, 'Stayed days must be >= 1');

    // Verify bed is released back to Available
    const matrixCheck = await request('GET', '/wards/bed-matrix', null, staffToken);
    const allBeds = matrixCheck.data.matrix.flatMap((m) => m.beds);
    const releasedBed = allBeds.find((b) => b._id.toString() === bedId.toString());
    assert(releasedBed.status === 'Available', 'Bed must be restored to Available');
  });

  // --------------------------------------------------------------------------
  // SECTION 9: BILLING, INVOICE GENERATION & PAYMENT RECORDING
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 9: Billing, Invoice Generation & Settlement ---');

  await test('9.1 Generate Comprehensive Itemized Hospital Bill', async () => {
    const res = await request(
      'POST',
      '/billing/generate',
      {
        patientId: testPatientId,
        admissionId,
        appointmentId,
        items: [
          { category: 'Consultation', description: 'Specialist Cardiology Consultation', quantity: 1, unitPrice: 650 },
          { category: 'Laboratory', description: 'Comprehensive Lipid Profile Panel', quantity: 1, unitPrice: 75 },
          { category: 'Pharmacy', description: 'Metoprolol Tartrate 25mg (14 units)', quantity: 1, unitPrice: 175 },
          { category: 'Bed Charges', description: 'Ward Observation (1 day)', quantity: 1, unitPrice: 1000 },
        ],
        discountAmount: 100,
        taxPercent: 5,
        notes: 'Executive healthcare coverage itemized billing',
      },
      adminToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.bill.billNumber.startsWith('HMS-INV-'), 'Must have invoice number');
    // Subtotal: 650 + 75 + 175 + 1000 = 1900. Tax 5%: 95. Discount: 100. Total = 1895
    assert(res.data.bill.subTotal === 1900, 'Subtotal must be 1900');
    assert(res.data.bill.totalAmount === 1895, 'Total amount must be 1895');
    assert(res.data.bill.paymentStatus === 'Pending', 'Initial payment status must be Pending');
    billId = res.data.bill._id;
  });

  await test('9.2 Patient Records Settlement Payment and Clears Balance', async () => {
    const res = await request(
      'POST',
      `/billing/${billId}/payment`,
      {
        amount: 1895,
        paymentMethod: 'Credit Card',
        transactionRef: 'TXN-ONLINE-998822',
        receiptNotes: 'Simulated online payment settlement via Patient Portal',
      },
      newPatientToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.bill.paymentStatus === 'Paid', 'Status must be Paid');
    assert(res.data.bill.balanceAmount === 0, 'Balance must be reduced to 0');
    assert(res.data.payment.paymentNumber.startsWith('HMS-PAY-'), 'Payment receipt generated');
  });

  await test('9.3 Reject Duplicate Payment on Fully Settled Invoice (400)', async () => {
    const res = await request(
      'POST',
      `/billing/${billId}/payment`,
      {
        amount: 100,
        paymentMethod: 'Cash',
        transactionRef: 'TXN-DUPLICATE-PAY',
      },
      staffToken
    );
    assert(res.status === 400, `Expected 400 for already settled bill, got ${res.status}`);
    assert(res.data.message.toLowerCase().includes('settled'), 'Message should indicate bill is settled');
  });

  await test('9.4 Prevent Duplicate Transaction Reference on Invoice (409)', async () => {
    // Generate a second bill to test duplicate transaction reference rejection
    const genRes = await request(
      'POST',
      '/billing/generate',
      {
        patientId: testPatientId,
        items: [{ category: 'Consultation', description: 'Follow-up Evaluation', quantity: 1, unitPrice: 200 }],
        taxPercent: 0,
      },
      adminToken
    );
    const secondBillId = genRes.data.bill._id;

    // First payment with reference
    const pay1 = await request(
      'POST',
      `/billing/${secondBillId}/payment`,
      {
        amount: 50,
        paymentMethod: 'Credit Card',
        transactionRef: 'TXN-UNIQUE-REF-001',
      },
      staffToken
    );
    assert(pay1.status === 200, `Expected 200, got ${pay1.status}`);

    // Second payment attempting exact same reference
    const pay2 = await request(
      'POST',
      `/billing/${secondBillId}/payment`,
      {
        amount: 50,
        paymentMethod: 'Credit Card',
        transactionRef: 'TXN-UNIQUE-REF-001',
      },
      staffToken
    );
    assert(pay2.status === 409, `Expected 409 Conflict for duplicate transactionRef, got ${pay2.status}`);

    // Clean up second bill
    await Bill.deleteOne({ _id: secondBillId });
    await Payment.deleteMany({ bill: secondBillId });
  });

  // --------------------------------------------------------------------------
  // SECTION 10: SYMPTOM TRIAGE & RED-FLAG EMERGENCY ROUTING
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 10: Clinical Symptom Triage Engine ---');

  await test('10.1 Algorithmic Emergency Detection & Department Recommendation', async () => {
    const res = await request(
      'POST',
      '/triage/assess',
      {
        chiefComplaint: 'Severe chest pain radiating to left arm with acute shortness of breath and diaphoresis',
        symptoms: [{ name: 'severe chest pain', severity: 'Severe' }],
      },
      newPatientToken
    );
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.triage.severityLevel === 'IMMEDIATE EMERGENCY', 'Must flag IMMEDIATE EMERGENCY');
    assert(res.data.triage.recommendedDepartment === 'Cardiology', 'Must route to Cardiology');
    assert(res.data.triage.emergencyFlags.length > 0, 'Must identify red-flag indicators');
  });

  // --------------------------------------------------------------------------
  // SECTION 11: NOTIFICATIONS & AUDIT TRAIL
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 11: Notifications & Audit Trail ---');

  await test('11.1 Patient Receives In-App Notifications for System Events', async () => {
    const res = await request('GET', '/notifications', null, newPatientToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.notifications.length > 0, 'Patient should have notifications from bookings/bills');
  });

  await test('11.2 Audit Log Recorded Immutable System Events', async () => {
    const res = await request('GET', '/audit-logs?limit=20', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.logs.length > 0, 'Audit logs must exist');
    const actions = res.data.logs.map((l) => l.action);
    assert(actions.includes('APPOINTMENT_BOOKED'), 'Must log APPOINTMENT_BOOKED');
    assert(actions.includes('BILL_GENERATED'), 'Must log BILL_GENERATED');
  });

  // --------------------------------------------------------------------------
  // SECTION 12: ROLE-BASED ACCESS CONTROL (RBAC) BOUNDARIES
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 12: RBAC Boundary Protection ---');

  await test('12.1 Patient is FORBIDDEN from Accessing Admin Audit Trail (403)', async () => {
    const res = await request('GET', '/audit-logs', null, newPatientToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('12.2 Patient is FORBIDDEN from Accessing Other Patients Directory (403)', async () => {
    const res = await request('GET', '/patients', null, newPatientToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  await test('12.3 Doctor is FORBIDDEN from Creating Hospital Departments (403)', async () => {
    const res = await request('POST', '/departments', { code: 'HACK', name: 'Unauthorized Dept' }, doctorToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // --------------------------------------------------------------------------
  // SECTION 13: DASHBOARD ANALYTICS INTEGRATION
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 13: Dashboard Analytics & Operational Reporting ---');

  await test('13.1 Administrator Executive Dashboard Analytics', async () => {
    const res = await request('GET', '/analytics/dashboard', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.kpis.totalPatients >= 1, 'totalPatients KPI populated');
    assert(res.data.kpis.totalDoctors >= 1, 'totalDoctors KPI populated');
    assert(res.data.kpis.financials.totalRevenue >= 0, 'Revenue calculated');
    assert(Array.isArray(res.data.charts.monthlyRegistrations), 'Monthly inflow chart data ready');
  });

  await test('13.2 Doctor Clinical Workbench Summary', async () => {
    const res = await request('GET', '/analytics/doctor-summary', null, doctorToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.doctor.name !== undefined, 'Doctor profile resolved');
    assert(Array.isArray(res.data.todayAppointments), 'Today appointments array ready');
  });

  await test('13.3 Patient Health Portal Summary', async () => {
    const res = await request('GET', '/analytics/patient-summary', null, newPatientToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.patient.uhid === testPatientUhid, 'Patient summary UHID resolved');
    assert(res.data.stats !== undefined, 'Patient stats tracked');
    assert(Array.isArray(res.data.upcomingAppointments), 'Upcoming appointments array ready');
  });

  // --------------------------------------------------------------------------
  // SECTION 14: GLOBAL OMNISEARCH & CROSS-MODULE SAFETY
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 14: Global Omnisearch & Operational Safety ---');

  await test('14.1 Unified Omnisearch Across Patients, Doctors, and Medicines', async () => {
    // 1. Search by Medicine name
    const medSearch = await request('GET', '/analytics/global-search?q=Metoprolol', null, staffToken);
    assert(medSearch.status === 200, `Expected 200, got ${medSearch.status}`);
    assert(medSearch.data.results.medicines.length > 0, 'Should find Metoprolol medicine');

    // 2. Search by Patient UHID
    const uhidSearch = await request('GET', `/analytics/global-search?q=${testPatientUhid}`, null, adminToken);
    assert(uhidSearch.status === 200, `Expected 200, got ${uhidSearch.status}`);
    assert(uhidSearch.data.results.patients.length > 0, 'Should find patient by UHID');

    // 3. Search by Doctor name
    const docSearch = await request('GET', '/analytics/global-search?q=Sarah', null, adminToken);
    assert(docSearch.status === 200, `Expected 200, got ${docSearch.status}`);
    assert(docSearch.data.results.doctors.length > 0, 'Should find doctor by name');
  });

  await test('14.2 Patient Privacy Protection in Omnisearch (No Directory Leakage)', async () => {
    const patientSearch = await request('GET', '/analytics/global-search?q=Doe', null, newPatientToken);
    assert(patientSearch.status === 200, `Expected 200, got ${patientSearch.status}`);
    assert(patientSearch.data.results.patients.length === 0, 'Patient must not see directory listings of other patients');
  });

  // Clean up created records for this run
  await Appointment.deleteOne({ _id: appointmentId });
  await MedicalRecord.deleteOne({ _id: medicalRecordId });
  await Prescription.deleteOne({ _id: prescriptionId });
  await LabReport.deleteOne({ _id: labOrderId });
  await Admission.deleteOne({ _id: admissionId });
  await Bill.deleteOne({ _id: billId });
  await Payment.deleteMany({ bill: billId });
  await Patient.deleteOne({ _id: testPatientId });
  await User.deleteOne({ email: newPatientToken ? undefined : null });

  await stopTestServer();
  await mongoose.disconnect();

  console.log('\n==============================================================================');
  console.log('   FINAL MASTER SUITE SUMMARY');
  console.log('==============================================================================');
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  console.log(`  Total Tests Run:  ${total}`);
  console.log(`  Passed:           ${passed}`);
  console.log(`  Failed:           ${failed}`);

  if (failed > 0) {
    console.error('\n  FAILURES:');
    results.filter((r) => !r.passed).forEach((r) => console.error(`   - ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log(`\n  ALL ${passed} REAL-WORLD INTEGRATION WORKFLOW TESTS PASSED WITH 100% SUCCESS!\n`);
    process.exit(0);
  }
};

runMasterSuite().catch((err) => {
  console.error('Fatal Master Suite Error:', err);
  process.exit(1);
});
