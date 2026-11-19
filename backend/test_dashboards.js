// Automated Verification Test Suite for Step 4: Role-Based Dashboards and Layout Integration
require('dotenv').config();
const mongoose = require('mongoose');
const express = require('express');
const http = require('http');

const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const Bill = require('./models/Bill');
const Payment = require('./models/Payment');
const { connectDB } = require('./config/db');
const seedDatabaseIfEmpty = require('./seed');

const authRoutes = require('./routes/authRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const billingRoutes = require('./routes/billingRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const appointmentRoutes = require('./routes/appointmentRoutes');
const labRoutes = require('./routes/labRoutes');

let server;
let baseUrl;

const startTestServer = () => {
  return new Promise((resolve) => {
    const app = express();
    app.use(express.json());

    app.use('/api/auth', authRoutes);
    app.use('/api/analytics', analyticsRoutes);
    app.use('/api/billing', billingRoutes);
    app.use('/api/notifications', notificationRoutes);
    app.use('/api/appointments', appointmentRoutes);
    app.use('/api/lab', labRoutes);

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
  console.log('  STARTING STEP 4 DASHBOARDS INTEGRATION TEST SUITE');
  console.log('========================================================\n');

  await connectDB();
  await seedDatabaseIfEmpty();
  await startTestServer();

  let adminToken = null;
  let doctorToken = null;
  let patientToken = null;
  let patientProfileId = null;

  // 1. Authenticate users
  console.log('--- Phase 1: User Session Setup ---');

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
    patientProfileId = res.data.user.profile?._id;
  });

  // 2. Administrator Dashboard
  console.log('\n--- Phase 2: Administrator Dashboard API ---');

  await test('Admin can retrieve comprehensive dashboard analytics', async () => {
    const res = await request('GET', '/analytics/dashboard', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Success flag must be true');
    assert(res.data.kpis.totalPatients > 0, 'Total patients must be > 0');
    assert(res.data.kpis.totalDoctors > 0, 'Total doctors must be > 0');
    assert(res.data.kpis.financials.totalRevenue > 0, 'Revenue must be > 0');
    assert(Array.isArray(res.data.charts.monthlyRegistrations), 'Monthly registrations chart data must exist');
    assert(Array.isArray(res.data.charts.departmentDistribution), 'Department distribution chart data must exist');
    assert(Array.isArray(res.data.charts.monthlyRevenue), 'Monthly revenue chart data must exist');
  });

  await test('Admin dashboard supports range filtering (today, week, month)', async () => {
    const resToday = await request('GET', '/analytics/dashboard?range=today', null, adminToken);
    assert(resToday.status === 200, `Expected 200, got ${resToday.status}`);
    assert(resToday.data.selectedRange === 'today', 'Range must be today');

    const resWeek = await request('GET', '/analytics/dashboard?range=week', null, adminToken);
    assert(resWeek.status === 200, `Expected 200, got ${resWeek.status}`);
    assert(resWeek.data.selectedRange === 'week', 'Range must be week');
  });

  await test('Patient is FORBIDDEN from accessing Admin Dashboard (403)', async () => {
    const res = await request('GET', '/analytics/dashboard', null, patientToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // 3. Doctor Workbench Dashboard
  console.log('\n--- Phase 3: Doctor Workbench Dashboard API ---');

  await test('Doctor can retrieve personal clinical workbench summary', async () => {
    const res = await request('GET', '/analytics/doctor-summary', null, doctorToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Success flag must be true');
    assert(res.data.doctor.name.includes('Dr.'), 'Doctor name must be formatted');
    assert(Array.isArray(res.data.todayAppointments), 'Today appointments must be array');
    assert(Array.isArray(res.data.admissions), 'Inpatient admissions must be array');
    assert(Array.isArray(res.data.pendingLabOrders), 'Pending lab orders must be array');
    assert(Array.isArray(res.data.recentPrescriptions), 'Recent prescriptions must be array');
    assert(res.data.stats.todayTotal !== undefined, 'Stats todayTotal must be defined');
  });

  await test('Patient is FORBIDDEN from accessing Doctor Workbench Summary (403)', async () => {
    const res = await request('GET', '/analytics/doctor-summary', null, patientToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // 4. Patient Portal Dashboard
  console.log('\n--- Phase 4: Patient Portal Dashboard API ---');

  await test('Patient can retrieve personal health portal summary', async () => {
    const res = await request('GET', '/analytics/patient-summary', null, patientToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Success flag must be true');
    assert(res.data.patient.uhid.startsWith('HMS-P-'), 'Patient UHID must be present');
    assert(Array.isArray(res.data.upcomingAppointments), 'Upcoming appointments must be array');
    assert(Array.isArray(res.data.recentPrescriptions), 'Prescriptions must be array');
    assert(Array.isArray(res.data.recentLabReports), 'Lab reports must be array');
    assert(Array.isArray(res.data.recentMedicalRecords), 'Medical records must be array');
    assert(Array.isArray(res.data.bills), 'Bills must be array');
    assert(res.data.stats.totalBilled !== undefined, 'totalBilled must be defined');
  });

  await test('Patient can process bill payment online', async () => {
    let bill = await Bill.findOne({ balanceAmount: { $gt: 0 } });
    if (!bill) {
      const patient = await Patient.findOne();
      bill = await Bill.create({
        billNumber: 'HMS-INV-TEST-001',
        patient: patient._id,
        billDate: new Date(),
        dueDate: new Date(Date.now() + 7 * 86400000),
        items: [{ category: 'Consultation', description: 'Specialist Visit', quantity: 1, unitPrice: 100, amount: 100 }],
        subTotal: 100,
        totalAmount: 100,
        paidAmount: 0,
        balanceAmount: 100,
        paymentStatus: 'Pending',
      });
    }
    assert(bill, 'Must have at least one bill with balance');

    const payAmount = 25.0;
    const initialBalance = bill.balanceAmount;

    const res = await request(
      'POST',
      `/billing/${bill._id}/payment`,
      {
        amount: payAmount,
        paymentMethod: 'Credit Card',
        notes: 'Test online payment from portal',
      },
      patientToken
    );

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Payment must succeed');
    assert(res.data.bill.balanceAmount === initialBalance - payAmount, 'Balance must be decremented');
  });

  // 5. Notifications
  console.log('\n--- Phase 5: Notification Center API ---');

  await test('User can fetch active in-app notifications and unread count', async () => {
    const res = await request('GET', '/notifications', null, patientToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Must return success');
    assert(Array.isArray(res.data.notifications), 'Notifications must be array');
  });

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
    console.log('\n  ALL STEP 4 DASHBOARD TESTS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  }
};

runAll().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
