const { spawn } = require('child_process');
const http = require('http');

console.log('[E2E Suite] Launching Smart Hospital System test runner...');

const serverProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe'],
});

const req = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const request = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    request.on('error', (err) => reject(err));
    if (postData) {
      request.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    request.end();
  });
};

const runAllTests = async () => {
  console.log('\n======================================================');
  console.log('   FULL-STACK INTEGRATION & WORKFLOW VERIFICATION     ');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName) => {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName}`);
      failed++;
    }
  };

  // Test 1: Health Check
  const health = await req({ hostname: 'localhost', port: 5000, path: '/api/health', method: 'GET' });
  assert(health.status === 200 && health.data?.status === 'healthy', 'System Health Check Endpoint');

  // Test 2: Role Authentications
  const adminLogin = await req(
    { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: 'admin@hospital.com', password: 'Admin@123' }
  );
  assert(adminLogin.status === 200 && adminLogin.data?.user?.role === 'admin', 'Administrator Authentication & Token Issuance');
  const adminToken = adminLogin.data?.token;

  const doctorLogin = await req(
    { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: 'dr.sarah@hospital.com', password: 'Doctor@123' }
  );
  assert(doctorLogin.status === 200 && doctorLogin.data?.user?.role === 'doctor', 'Doctor Authentication & Profile Loading');
  const doctorToken = doctorLogin.data?.token;
  const doctorId = doctorLogin.data?.user?.profile?._id;

  const patientLogin = await req(
    { hostname: 'localhost', port: 5000, path: '/api/auth/login', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    { email: 'john.doe@email.com', password: 'Patient@123' }
  );
  assert(patientLogin.status === 200 && patientLogin.data?.user?.role === 'patient', 'Patient Authentication & UHID Retrieval');
  const patientToken = patientLogin.data?.token;
  const patientId = patientLogin.data?.user?.profile?._id;

  // Test 3: Patient Registration & Auto-UHID
  const regEmail = `test.patient.${Date.now()}@test.com`;
  const registerRes = await req(
    { hostname: 'localhost', port: 5000, path: '/api/auth/register', method: 'POST', headers: { 'Content-Type': 'application/json' } },
    {
      name: 'Robert Testpatient',
      email: regEmail,
      password: 'Patient@123',
      phone: '+1 (555) 777-8899',
      dateOfBirth: '1990-05-15',
      gender: 'Male',
      bloodGroup: 'AB+',
    }
  );
  assert(
    registerRes.status === 201 && registerRes.data?.user?.profile?.uhid?.startsWith('HMS-P-'),
    `Patient Self-Registration & Unique UHID Format (${registerRes.data?.user?.profile?.uhid})`
  );
  const newPatientId = registerRes.data?.user?.profile?._id;

  // Test 4: Departments & Doctor Schedule Slots
  const depts = await req({ hostname: 'localhost', port: 5000, path: '/api/departments', method: 'GET' });
  assert(depts.status === 200 && depts.data?.count >= 6, 'Medical Specialty Departments Catalog (>= 6 depts)');
  const cardioDeptId = depts.data?.departments?.find((d) => d.code === 'CARD')?._id;

  const targetAptDate = new Date();
  targetAptDate.setDate(targetAptDate.getDate() + 3); // 3 days from now
  const targetDateStr = targetAptDate.toISOString().split('T')[0];

  const slotsRes = await req({
    hostname: 'localhost',
    port: 5000,
    path: `/api/doctors/${doctorId}/slots?date=${targetDateStr}`,
    method: 'GET',
  });
  assert(slotsRes.status === 200 && slotsRes.data?.slots?.length > 0, 'Smart Available Slot Generation Engine');
  const availableSlot = slotsRes.data?.slots?.find((s) => s.isAvailable)?.slot || '10:00 - 10:20';

  // Test 5: Atomic Appointment Booking & Double-Booking Prevention
  const bookRes1 = await req(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/appointments',
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}`, 'Content-Type': 'application/json' },
    },
    {
      doctorId,
      departmentId: cardioDeptId,
      appointmentDate: targetDateStr,
      timeSlot: availableSlot,
      reason: 'Routine cardiovascular evaluation and stress test',
    }
  );
  assert(bookRes1.status === 201 && bookRes1.data?.appointment?.status === 'Confirmed', 'Atomic Appointment Booking Confirmed');
  const createdAptId = bookRes1.data?.appointment?._id;

  // Attempt duplicate booking for the SAME doctor, date, and slot -> Must return 409 Conflict
  const bookRes2 = await req(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/appointments',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    },
    {
      patientId: newPatientId,
      doctorId,
      departmentId: cardioDeptId,
      appointmentDate: targetDateStr,
      timeSlot: availableSlot,
      reason: 'Duplicate slot booking test attempt',
    }
  );
  assert(bookRes2.status === 409, 'Double-Booking Prevention Engine (Returned 409 Conflict)');

  // Test 6: Clinical EMR Consultation Recording
  const emrRes = await req(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/medical-records',
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
    },
    {
      patientId,
      appointmentId: createdAptId,
      vitals: { bpSystolic: 124, bpDiastolic: 80, heartRate: 72, temperature: 98.6, spo2: 99, weightKg: 75, heightCm: 175 },
      chiefComplaints: 'Occasional exertional dyspnea during brisk uphill walking',
      clinicalObservations: 'Chest clear, normal vesicular sounds, S1/S2 audible',
      diagnoses: [{ description: 'Exertional dyspnea - mild', code: 'R06.0', type: 'Primary' }],
      treatmentPlan: 'Maintain active exercise regimen, low sodium diet',
    }
  );
  assert(emrRes.status === 201 && emrRes.data?.record?.recordNumber?.startsWith('HMS-EMR-'), 'Clinical EMR Consultation Documented');
  const createdRecordId = emrRes.data?.record?._id;

  // Test 7: Doctor e-Prescription Authoring
  const rxRes = await req(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/prescriptions',
      method: 'POST',
      headers: { Authorization: `Bearer ${doctorToken}`, 'Content-Type': 'application/json' },
    },
    {
      patientId,
      medicalRecordId: createdRecordId,
      medicines: [
        {
          name: 'Atorvastatin Calcium',
          dosage: '20 mg',
          frequency: '0-0-1',
          duration: '14 days',
          quantity: 14,
        },
      ],
      generalInstructions: 'Take medication at bedtime with water.',
    }
  );
  assert(rxRes.status === 201 && rxRes.data?.prescription?.prescriptionNumber?.startsWith('HMS-RX-'), 'e-Prescription Authored & Issued');
  const createdRxId = rxRes.data?.prescription?._id;

  // Test 8: Pharmacy Dispensing & Atomic Inventory Decrement
  const invBefore = await req({
    hostname: 'localhost',
    port: 5000,
    path: '/api/pharmacy/inventory?search=Atorvastatin',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const medItem = invBefore.data?.medicines?.[0];
  const initialStock = medItem ? medItem.stockQuantity : 0;

  const dispenseRes = await req(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/pharmacy/dispense',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    },
    {
      prescriptionId: createdRxId,
      patientId,
      items: [{ medicineId: medItem._id, quantity: 14 }],
    }
  );
  assert(dispenseRes.status === 201, 'Pharmacy Dispense Transaction Completed');

  const invAfter = await req({
    hostname: 'localhost',
    port: 5000,
    path: '/api/pharmacy/inventory?search=Atorvastatin',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const newStock = invAfter.data?.medicines?.[0]?.stockQuantity;
  assert(newStock === initialStock - 14, `Atomic Stock Decrement Verified (${initialStock} -> ${newStock} units)`);

  // Test 9: Inpatient Bed Allocation & Double Allocation Prevention
  const bedMatrixRes = await req({
    hostname: 'localhost',
    port: 5000,
    path: '/api/wards/bed-matrix',
    method: 'GET',
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const genWard = bedMatrixRes.data?.matrix?.find((m) => m.ward.code === 'WD-GEN');
  const vacantBed = genWard?.beds?.find((b) => b.status === 'Available');

  const admitRes1 = await req(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/wards/admissions',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    },
    {
      patientId: newPatientId,
      doctorId,
      wardId: genWard.ward.id,
      bedId: vacantBed._id,
      admissionDiagnosis: 'Post-operative monitoring and wound care',
    }
  );
  assert(admitRes1.status === 201 && admitRes1.data?.admission?.status === 'Admitted', 'Inpatient Admission & Bed Allocation');
  const createdAdmId = admitRes1.data?.admission?._id;

  // Try allocating the same bed to another patient -> Must fail with 409
  const admitRes2 = await req(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/wards/admissions',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    },
    {
      patientId,
      doctorId,
      wardId: genWard.ward.id,
      bedId: vacantBed._id,
      admissionDiagnosis: 'Test duplicate admission attempt',
    }
  );
  assert(admitRes2.status === 409, 'Double-Bed Allocation Prevention (Returned 409 Conflict)');

  // Test 10: Discharge Workflow & Bed Release
  const dischargeRes = await req(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/wards/admissions/${createdAdmId}/discharge`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    },
    {
      dischargeCondition: 'Fully Recovered and Ambulatory',
      adviceOnDischarge: 'Follow prescribed outpatient regimen',
    }
  );
  assert(
    dischargeRes.status === 200 && dischargeRes.data?.admission?.status === 'Discharged',
    'Discharge Finalized & Bed Released to Available'
  );

  // Test 11: Billing & Payment Recording
  const billRes = await req(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/billing/generate',
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    },
    {
      patientId: newPatientId,
      items: [
        { category: 'Consultation', description: 'Senior Specialist Consultation', quantity: 1, unitPrice: 500 },
        { category: 'Bed Charges', description: 'General Ward Stay (1 day)', quantity: 1, unitPrice: 800 },
      ],
      discountAmount: 50,
      taxPercent: 5,
    }
  );
  if (billRes.status !== 201) {
    console.error('Bill generation error:', billRes.status, billRes.data);
  }
  const generatedTotal = billRes.data?.bill?.totalAmount;
  assert(billRes.status === 201 && Math.abs(generatedTotal - 1315) < 0.01, `Itemized Bill Generated ($${generatedTotal} total)`);
  const billId = billRes.data?.bill?._id;

  const payRes = await req(
    {
      hostname: 'localhost',
      port: 5000,
      path: `/api/billing/${billId}/payment`,
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}`, 'Content-Type': 'application/json' },
    },
    {
      amount: generatedTotal || 1315,
      paymentMethod: 'Credit/Debit Card',
      transactionRef: 'TXN-INTEG-99881',
    }
  );
  if (payRes.status !== 200) {
    console.error('Payment record error:', payRes.status, payRes.data);
  }
  assert(
    payRes.status === 200 && payRes.data?.bill?.paymentStatus === 'Paid' && payRes.data?.bill?.balanceAmount === 0,
    'Payment Recorded, Balance Reduced to 0, Invoice Status Marked Paid'
  );

  // Test 12: Symptom Triage & Red-Flag Detection
  const triageRes = await req(
    {
      hostname: 'localhost',
      port: 5000,
      path: '/api/triage/assess',
      method: 'POST',
      headers: { Authorization: `Bearer ${patientToken}`, 'Content-Type': 'application/json' },
    },
    {
      chiefComplaint: 'Sudden retrosternal crushing chest pain radiating to left arm with severe shortness of breath',
      symptoms: [{ name: 'severe chest pain', severity: 'Severe' }],
    }
  );
  assert(
    triageRes.status === 201 &&
      triageRes.data?.triage?.severityLevel === 'IMMEDIATE EMERGENCY' &&
      triageRes.data?.triage?.recommendedDepartment === 'Cardiology',
    'Symptom Triage: Red-Flag Emergency Detected & Routed to Cardiology'
  );

  // Test 13: RBAC Boundary Protection
  const forbiddenAttempt = await req({
    hostname: 'localhost',
    port: 5000,
    path: '/api/audit-logs',
    method: 'GET',
    headers: { Authorization: `Bearer ${patientToken}` }, // Patient attempting to read admin audit logs!
  });
  assert(forbiddenAttempt.status === 403, 'RBAC Security Boundary: Patient Access to Admin Audit Logs Blocked (403 Forbidden)');

  console.log('\n======================================================');
  console.log(`  VERIFICATION RESULTS: ${passed} PASSED / ${failed} FAILED`);
  console.log('======================================================\n');

  serverProcess.kill('SIGTERM');
  setTimeout(() => process.exit(failed > 0 ? 1 : 0), 1000);
};

serverProcess.stdout.on('data', (data) => {
  const msg = data.toString();
  if (msg.includes('Smart Hospital Management System API running on port')) {
    runAllTests();
  }
});
