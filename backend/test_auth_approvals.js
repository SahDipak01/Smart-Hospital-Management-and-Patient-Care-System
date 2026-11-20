/**
 * ==============================================================================
 * APEX MEMORIAL SMART HOSPITAL - AUTHENTICATION & APPROVALS TEST SUITE
 * ==============================================================================
 * Comprehensive verification for:
 * 1. Unified Common Login Page across all 8 roles
 * 2. Dynamic Registration (Patient active, Doctor/Staff pending)
 * 3. Prevention of public Administrator registration (Security Guard)
 * 4. Duplicate email registration prevention
 * 5. Informative pending & rejected account status notices
 * 6. Administrator Registration Approvals Hub & Statistics
 * 7. Approval & Activation with department assignment
 * 8. Rejection workflow with mandatory audit reason
 * 9. RBAC boundary protection (Only Admin can manage approvals)
 * 10. Account deactivation and reactivation
 * ==============================================================================
 */

const http = require('http');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const { app } = require('./server');
const User = require('./models/User');
const Doctor = require('./models/Doctor');
const Staff = require('./models/Staff');
const Patient = require('./models/Patient');
const Department = require('./models/Department');

let mongod = null;
let server = null;
let baseURL = '';

const startTestServer = async () => {
  try {
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();
    await mongoose.connect(uri);
    console.log('[Test DB] In-memory MongoDB connected successfully.');

    // Seed initial hospital department and admin account
    const dept = await Department.create({
      code: 'CARD',
      name: 'Department of Cardiology',
      description: 'Cardiac care and surgical cardiology',
      floor: 3,
    });

    const admin = await User.create({
      name: 'Dr. Arthur Vance (Chief Administrator)',
      email: 'admin.approvals@hospital.com',
      password: 'AdminPassword@123',
      role: 'admin',
      phone: '+1 (555) 010-9999',
      isApproved: true,
      approvalStatus: 'Approved',
      isActive: true,
    });

    return new Promise((resolve) => {
      server = http.createServer(app);
      server.listen(0, () => {
        const port = server.address().port;
        baseURL = `http://127.0.0.1:${port}/api`;
        console.log(`[Test Server] Live on ${baseURL}`);
        resolve({ dept, admin });
      });
    });
  } catch (err) {
    console.error('Failed to boot test environment:', err);
    throw err;
  }
};

const stopTestServer = async () => {
  if (server) await new Promise((res) => server.close(res));
  if (mongoose.connection.readyState !== 0) await mongoose.disconnect();
  if (mongod) await mongod.stop();
};

const request = (method, path, body = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(baseURL + path);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    if (token) options.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
};

const results = [];
const test = async (name, fn) => {
  try {
    await fn();
    results.push({ name, passed: true });
    console.log(`  ✓ PASS: ${name}`);
  } catch (err) {
    results.push({ name, passed: false, error: err.message });
    console.error(`  ✗ FAIL: ${name}\n    Error: ${err.message}`);
  }
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message || 'Assertion failed');
};

const runApprovalsTestSuite = async () => {
  console.log('\n==============================================================================');
  console.log('   APEX CARE - CENTRALIZED AUTHENTICATION & APPROVALS TEST SUITE');
  console.log('==============================================================================\n');

  const { dept, admin } = await startTestServer();

  let adminToken = '';
  let doctorUserId = '';
  let nurseUserId = '';
  let pharmacistUserId = '';
  let testPatientToken = '';

  // --------------------------------------------------------------------------
  // SECTION 1: PUBLIC REGISTRATION SECURITY GUARDS
  // --------------------------------------------------------------------------
  console.log('--- Phase 1: Registration Security Guards ---');

  await test('1.1 Strictly Block Public Administrator Registration (400 Bad Request)', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Malicious Attacker',
      email: 'hacker@hospital.com',
      password: 'HackerPassword@123',
      phone: '+1 (555) 000-0001',
      role: 'admin',
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    assert(res.data.message.includes('Administrator accounts cannot be created'), 'Error message must explain admin restriction');
  });

  await test('1.2 Reject Public Administrator Registration with variant casing (administrator)', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Fake Super Admin',
      email: 'fake.admin@hospital.com',
      password: 'HackerPassword@123',
      phone: '+1 (555) 000-0002',
      role: 'Administrator',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  // --------------------------------------------------------------------------
  // SECTION 2: PATIENT REGISTRATION (Immediate Active Access)
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 2: Patient Registration (Immediate Active Access) ---');

  await test('2.1 Patient Self-Registers and Receives Immediate Active Token', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Emily Davis',
      email: 'emily.davis@patient.com',
      password: 'PatientPassword@123',
      phone: '+1 (555) 123-4567',
      role: 'patient',
      dateOfBirth: '1992-06-15',
      gender: 'Female',
      bloodGroup: 'A+',
      allergies: 'Penicillin, Peanuts',
    });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.accountStatus === 'Approved', 'Patient account must be Approved');
    assert(res.data.requiresApproval === false, 'Patient does not require approval');
    assert(typeof res.data.token === 'string', 'Active JWT token must be returned');
    assert(res.data.user.role === 'patient', 'Role must be patient');
    testPatientToken = res.data.token;
  });

  await test('2.2 Patient Successfully Logs In via Common Login Page', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'emily.davis@patient.com',
      password: 'PatientPassword@123',
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.role === 'patient', 'Authenticated user role must be patient');
    assert(res.data.user.accountStatus === 'Approved', 'Account status must be Approved');
  });

  await test('2.3 Reject Duplicate Registration with Same Email (400)', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Emily Davis Clone',
      email: 'emily.davis@patient.com',
      password: 'AnotherPassword@123',
      phone: '+1 (555) 999-9999',
      role: 'patient',
    });

    assert(res.status === 400, `Expected 400 for duplicate email, got ${res.status}`);
    assert(res.data.message.includes('already exists'), 'Message must indicate duplicate email');
  });

  // --------------------------------------------------------------------------
  // SECTION 3: DOCTOR REGISTRATION & PENDING APPROVAL WORKFLOW
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 3: Doctor Registration & Pending Verification ---');

  await test('3.1 Doctor Registers and Is Placed in Pending Approval Status', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Robert Hastings',
      email: 'dr.hastings@hospital.com',
      password: 'DoctorPassword@123',
      phone: '+1 (555) 234-5678',
      role: 'doctor',
      specialization: 'Cardiovascular Surgery',
      licenseNumber: 'MED-COUNCIL-88741',
      qualifications: 'MBBS, MS, MCh (Cardiothoracic Surgery)',
      experienceYears: 10,
      consultationFee: 750,
      departmentId: dept._id,
    });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.accountStatus === 'Pending', 'Status must be Pending');
    assert(res.data.requiresApproval === true, 'requiresApproval flag must be true');
    assert(res.data.token === undefined, 'Active JWT token must NOT be issued to pending applicant');
    doctorUserId = res.data.user.id;
  });

  await test('3.2 Unapproved Doctor Login Attempt Is BLOCKED with Informative Notice (403)', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'dr.hastings@hospital.com',
      password: 'DoctorPassword@123',
    });

    assert(res.status === 403, `Expected 403 Forbidden for pending user, got ${res.status}`);
    assert(res.data.accountStatus === 'Pending', 'Response must indicate accountStatus: Pending');
    assert(res.data.message.includes('awaiting administrator verification'), 'Informative explanation required');
  });

  // --------------------------------------------------------------------------
  // SECTION 4: NURSE & OPERATIONAL STAFF REGISTRATION
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 4: Operational Staff Registration (Nurse & Pharmacist) ---');

  await test('4.1 Nurse Registers and Is Placed in Pending Status', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Jessica Pearson',
      email: 'nurse.pearson@hospital.com',
      password: 'NursePassword@123',
      phone: '+1 (555) 345-6789',
      role: 'nurse',
      licenseNumber: 'NUR-REG-55210',
      qualification: 'B.Sc Nursing, Critical Care Certified',
      shiftPreference: 'Night',
      departmentId: dept._id,
    });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.accountStatus === 'Pending', 'Nurse status must be Pending');
    nurseUserId = res.data.user.id;
  });

  await test('4.2 Pharmacist Registers and Is Placed in Pending Status', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Marcus Vance',
      email: 'pharm.marcus@hospital.com',
      password: 'PharmPassword@123',
      phone: '+1 (555) 456-7890',
      role: 'pharmacist',
      licenseNumber: 'PHARM-LIC-33201',
      qualification: 'Pharm.D, Clinical Pharmacy',
      shiftPreference: 'Morning',
      departmentId: dept._id,
    });

    assert(res.status === 201, `Expected 201, got ${res.status}`);
    assert(res.data.accountStatus === 'Pending', 'Pharmacist status must be Pending');
    pharmacistUserId = res.data.user.id;
  });

  await test('4.3 Unapproved Nurse Login Attempt Is BLOCKED with Informative Notice (403)', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'nurse.pearson@hospital.com',
      password: 'NursePassword@123',
    });

    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
    assert(res.data.accountStatus === 'Pending', 'Response must indicate accountStatus: Pending');
  });

  // --------------------------------------------------------------------------
  // SECTION 5: ADMINISTRATOR APPROVALS MANAGEMENT WORKFLOW
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 5: Administrator Approvals Workflow ---');

  await test('5.1 Administrator Signs In via Common Login Page', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'admin.approvals@hospital.com',
      password: 'AdminPassword@123',
    });

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.role === 'admin', 'Authenticated role must be admin');
    adminToken = res.data.token;
  });

  await test('5.2 Administrator Fetches Registration Approval Statistics', async () => {
    const res = await request('GET', '/auth/approvals/stats', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.stats.pending >= 3, `Expected at least 3 pending requests, got ${res.data.stats.pending}`);
  });

  await test('5.3 Administrator Lists Pending Applications with Credentials & Licenses', async () => {
    const res = await request('GET', '/auth/approvals?status=Pending', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.requests.length >= 3, 'Must list all pending applicants');

    const docReq = res.data.requests.find((r) => r.email === 'dr.hastings@hospital.com');
    assert(docReq !== undefined, 'Doctor application must be present');
    assert(docReq.registrationDetails?.licenseNumber === 'MED-COUNCIL-88741', 'License must be preserved');
  });

  await test('5.4 Administrator Approves Doctor and Assigns Department & Room', async () => {
    const res = await request(
      'POST',
      `/auth/approvals/${doctorUserId}/approve`,
      {
        departmentId: dept._id,
        roomNumber: 'OPD-308',
      },
      adminToken
    );

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.isApproved === true, 'User isApproved must be true');
    assert(res.data.user.approvalStatus === 'Approved', 'User status must be Approved');
    assert(res.data.user.isActive === true, 'User isActive must be true');

    // Verify linked Doctor profile in DB
    const doctorProfile = await Doctor.findOne({ user: doctorUserId });
    assert(doctorProfile.isApproved === true, 'Doctor profile must be approved');
    assert(doctorProfile.status === 'Active', 'Doctor status must be Active');
    assert(doctorProfile.roomNumber === 'OPD-308', 'Room number must be assigned');
  });

  await test('5.5 Newly Approved Doctor Can Now Successfully Sign In (200)', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'dr.hastings@hospital.com',
      password: 'DoctorPassword@123',
    });

    assert(res.status === 200, `Expected 200 after approval, got ${res.status}`);
    assert(res.data.user.role === 'doctor', 'Role must be doctor');
    assert(typeof res.data.token === 'string', 'Active JWT token issued');
  });

  // --------------------------------------------------------------------------
  // SECTION 6: ADMINISTRATOR REJECTION WORKFLOW
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 6: Administrator Rejection Workflow ---');

  const rejectionReasonText = 'Council registration number NUR-REG-55210 could not be authenticated with State Board.';
  await test('6.1 Administrator Rejects Registration Application with Formal Reason', async () => {
    const res = await request(
      'POST',
      `/auth/approvals/${nurseUserId}/reject`,
      {
        reason: rejectionReasonText,
      },
      adminToken
    );

    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.isApproved === false, 'isApproved must be false');
    assert(res.data.user.approvalStatus === 'Rejected', 'approvalStatus must be Rejected');
    assert(res.data.user.rejectionReason === rejectionReasonText, 'Rejection reason must be stored');
  });

  await test('6.2 Rejected Applicant Login Attempt Shows Detailed Rejection Reason (403)', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'nurse.pearson@hospital.com',
      password: 'NursePassword@123',
    });

    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.data.accountStatus === 'Rejected', 'Response must indicate accountStatus: Rejected');
    assert(res.data.message.includes(rejectionReasonText), 'Message must contain the administrative rejection reason');
  });

  // --------------------------------------------------------------------------
  // SECTION 7: RBAC PROTECTION FOR APPROVAL ENDPOINTS
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 7: RBAC Boundary Protection ---');

  await test('7.1 Patient Is Strictly FORBIDDEN from Accessing Approvals Hub (403)', async () => {
    const res = await request('GET', '/auth/approvals', null, testPatientToken);
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  await test('7.2 Doctor Is Strictly FORBIDDEN from Approving Registrations (403)', async () => {
    // Get doctor token
    const docLogin = await request('POST', '/auth/login', {
      email: 'dr.hastings@hospital.com',
      password: 'DoctorPassword@123',
    });
    const docToken = docLogin.data.token;

    const res = await request('POST', `/auth/approvals/${pharmacistUserId}/approve`, {}, docToken);
    assert(res.status === 403, `Expected 403 Forbidden, got ${res.status}`);
  });

  // --------------------------------------------------------------------------
  // SECTION 8: ACCOUNT DEACTIVATION & REACTIVATION
  // --------------------------------------------------------------------------
  console.log('\n--- Phase 8: Account Deactivation & Reactivation ---');

  await test('8.1 Administrator Deactivates Active Doctor Account', async () => {
    const res = await request('PATCH', `/auth/users/${doctorUserId}/status`, null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.isActive === false, 'User must be deactivated');

    // Login must fail now
    const loginRes = await request('POST', '/auth/login', {
      email: 'dr.hastings@hospital.com',
      password: 'DoctorPassword@123',
    });
    assert(loginRes.status === 403, `Expected 403 for deactivated user, got ${loginRes.status}`);
    assert(loginRes.data.message.includes('deactivated'), 'Message must indicate deactivation');
  });

  await test('8.2 Administrator Reactivates Doctor Account', async () => {
    const res = await request('PATCH', `/auth/users/${doctorUserId}/status`, null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.isActive === true, 'User must be reactivated');

    // Login must succeed again
    const loginRes = await request('POST', '/auth/login', {
      email: 'dr.hastings@hospital.com',
      password: 'DoctorPassword@123',
    });
    assert(loginRes.status === 200, `Expected 200, got ${loginRes.status}`);
  });

  await stopTestServer();

  console.log('\n==============================================================================');
  console.log('   AUTHENTICATION & APPROVALS TEST SUMMARY');
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
    console.log(`\n  ALL ${passed} AUTHENTICATION & APPROVAL TESTS PASSED WITH 100% SUCCESS!\n`);
    process.exit(0);
  }
};

runApprovalsTestSuite().catch((err) => {
  console.error('Fatal Suite Error:', err);
  process.exit(1);
});
