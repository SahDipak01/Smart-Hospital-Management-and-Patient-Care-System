// Comprehensive Automated Test Suite for Authentication and RBAC
// Testing: Registration, Login, Validation, Bcrypt Hashing, JWTs, Expiration,
// Profile Update, Change Password, Forgot/Reset Password, Role Authorization,
// Patient Data Isolation, and Audit Logging.

require('dotenv').config();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const express = require('express');
const http = require('http');

const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const AuditLog = require('./models/AuditLog');
const { connectDB } = require('./config/db');
const seedDatabaseIfEmpty = require('./seed');

// Import routes
const authRoutes = require('./routes/authRoutes');
const patientRoutes = require('./routes/patientRoutes');
const auditRoutes = require('./routes/auditRoutes');
const labRoutes = require('./routes/labRoutes');

let server;
let baseUrl;

const startTestServer = () => {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json());

    app.use('/api/auth', authRoutes);
    app.use('/api/patients', patientRoutes);
    app.use('/api/audit-logs', auditRoutes);
    app.use('/api/lab', labRoutes);

    // Global error handler
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({ success: false, message: err.message });
    });

    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api`;
      console.log(`[Test Server] Running on ${baseUrl}`);
      resolve();
    });
  });
};

const stopTestServer = () => {
  return new Promise((resolve) => {
    if (server) {
      server.close(() => resolve());
    } else {
      resolve();
    }
  });
};

// Helper for making HTTP requests
const request = async (method, path, body = null, token = null) => {
  const url = `${baseUrl}${path}`;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const options = {
    method,
    headers,
  };
  if (body) {
    options.body = JSON.stringify(body);
  }

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

const runAllTests = async () => {
  console.log('\n========================================================');
  console.log('  STARTING STEP 3 AUTHENTICATION & RBAC TEST SUITE');
  console.log('========================================================\n');

  await connectDB();
  await seedDatabaseIfEmpty();
  await startTestServer();

  // Clean test-specific users if any
  const testEmails = [
    'test_patient_new@hospital.com',
    'test_temp@hospital.com',
    'patient.alice@email.com',
    'patient.bob@email.com',
  ];
  await User.deleteMany({ email: { $in: testEmails } });

  let adminToken = null;
  let doctorToken = null;
  let patientAliceToken = null;
  let patientBobToken = null;
  let patientAliceId = null;
  let patientBobId = null;

  // ----------------------------------------------------
  // TEST GROUP 1: Registration Validation & Execution
  // ----------------------------------------------------
  console.log('\n--- Group 1: Registration & Validation ---');

  await test('Reject registration with name < 2 chars', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'A',
      email: 'valid@hospital.com',
      password: 'Password@123',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.message.includes('Name is required'), `Got message: ${res.data.message}`);
  });

  await test('Reject registration with invalid email format', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Alice Patient',
      email: 'not-an-email',
      password: 'Password@123',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.message.includes('valid email'), `Got message: ${res.data.message}`);
  });

  await test('Reject registration with password < 6 chars', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Alice Patient',
      email: 'alice@hospital.com',
      password: '123',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.message.includes('at least 6 characters'), `Got message: ${res.data.message}`);
  });

  await test('Successfully register new patient and auto-generate UHID', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Alice Wonderland',
      email: 'patient.alice@email.com',
      password: 'Password@123',
      phone: '+1 555-0199',
      gender: 'Female',
      bloodGroup: 'A+',
      dateOfBirth: '1992-05-15',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}: ${JSON.stringify(res.data)}`);
    assert(res.data.success === true, 'Success flag must be true');
    assert(res.data.token, 'Must return JWT token');
    assert(res.data.user.role === 'patient', 'Registered role must be patient');
    assert(res.data.user.profile.uhid.startsWith('HMS-P-'), `UHID invalid: ${res.data.user.profile.uhid}`);
    patientAliceToken = res.data.token;
    patientAliceId = res.data.user.profile._id;
  });

  await test('Reject duplicate patient registration with same email', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Alice Duplicate',
      email: 'patient.alice@email.com',
      password: 'Password@123',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.message.includes('already exists'), `Expected duplicate message, got: ${res.data.message}`);
  });

  // Register second patient for data isolation tests
  await test('Register Patient Bob for data isolation verification', async () => {
    const res = await request('POST', '/auth/register', {
      name: 'Bob Builder',
      email: 'patient.bob@email.com',
      password: 'Password@123',
      phone: '+1 555-0288',
      gender: 'Male',
      bloodGroup: 'O+',
      dateOfBirth: '1988-11-20',
    });
    assert(res.status === 201, `Expected 201, got ${res.status}`);
    patientBobToken = res.data.token;
    patientBobId = res.data.user.profile._id;
  });

  // ----------------------------------------------------
  // TEST GROUP 2: Password Hashing Verification
  // ----------------------------------------------------
  console.log('\n--- Group 2: Password Hashing & Encryption ---');

  await test('Verify password stored in MongoDB is bcrypt hashed', async () => {
    const userInDb = await User.findOne({ email: 'patient.alice@email.com' }).select('+password');
    assert(userInDb, 'User must exist in DB');
    assert(userInDb.password !== 'Password@123', 'Password must NEVER be stored in plain text');
    assert(userInDb.password.startsWith('$2'), `Password must be a valid bcrypt hash: ${userInDb.password}`);
    const isMatch = await bcrypt.compare('Password@123', userInDb.password);
    assert(isMatch === true, 'Bcrypt compare must succeed for correct password');
  });

  // ----------------------------------------------------
  // TEST GROUP 3: Login Authentication & Errors
  // ----------------------------------------------------
  console.log('\n--- Group 3: Login Authentication ---');

  await test('Reject login with invalid email format', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'bad-email-format',
      password: 'Password@123',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Reject login with missing password', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'admin@hospital.com',
      password: '',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
  });

  await test('Reject login for non-existent email', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'nonexistent.user.2026@hospital.com',
      password: 'SomePassword@123',
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.data.message.includes('Invalid credentials'), `Got message: ${res.data.message}`);
  });

  await test('Reject login for incorrect password', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'patient.alice@email.com',
      password: 'WrongPassword@999',
    });
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.data.message.includes('Invalid credentials'), `Got message: ${res.data.message}`);
  });

  await test('Successful Admin login with credentials', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'admin@hospital.com',
      password: 'Admin@123',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Success flag must be true');
    assert(res.data.token, 'Must return JWT token');
    assert(res.data.user.role === 'admin', 'Role must be admin');
    adminToken = res.data.token;
  });

  await test('Successful Doctor login with credentials', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'dr.sarah@hospital.com',
      password: 'Doctor@123',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.role === 'doctor', 'Role must be doctor');
    doctorToken = res.data.token;
  });

  await test('Successful Patient login with credentials', async () => {
    const res = await request('POST', '/auth/login', {
      email: 'patient.alice@email.com',
      password: 'Password@123',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.role === 'patient', 'Role must be patient');
  });

  await test('Reject login when account is deactivated', async () => {
    // Temporarily deactivate Alice
    await User.updateOne({ email: 'patient.alice@email.com' }, { isActive: false });
    const res = await request('POST', '/auth/login', {
      email: 'patient.alice@email.com',
      password: 'Password@123',
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.data.message.includes('deactivated'), `Got message: ${res.data.message}`);
    // Reactivate Alice
    await User.updateOne({ email: 'patient.alice@email.com' }, { isActive: true });
  });

  // ----------------------------------------------------
  // TEST GROUP 4: JWT Handling & Expiration
  // ----------------------------------------------------
  console.log('\n--- Group 4: JWT Protection & Expiration ---');

  await test('Allow authenticated access to /api/auth/me with valid token', async () => {
    const res = await request('GET', '/auth/me', null, patientAliceToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.email === 'patient.alice@email.com', 'Returned user email must match');
  });

  await test('Reject protected route when Authorization header is missing', async () => {
    const res = await request('GET', '/auth/me');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.data.message.includes('token missing'), `Got message: ${res.data.message}`);
  });

  await test('Reject protected route with invalid/tampered token', async () => {
    const res = await request('GET', '/auth/me', null, 'invalid_header.tampered_payload.fake_signature');
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.data.message.includes('Invalid authorization token'), `Got message: ${res.data.message}`);
  });

  await test('Reject protected route with expired JWT token', async () => {
    const user = await User.findOne({ email: 'patient.alice@email.com' });
    const expiredToken = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET || 'smart_hospital_super_secure_jwt_secret_key_2026_production',
      { expiresIn: '-1s' } // Expired 1 second ago
    );
    const res = await request('GET', '/auth/me', null, expiredToken);
    assert(res.status === 401, `Expected 401, got ${res.status}`);
    assert(res.data.message.includes('session has expired'), `Got message: ${res.data.message}`);
  });

  // ----------------------------------------------------
  // TEST GROUP 5: Profile Updates & Password Change
  // ----------------------------------------------------
  console.log('\n--- Group 5: User Profile & Password Change ---');

  await test('Update user profile name and phone', async () => {
    const res = await request(
      'PUT',
      '/auth/profile',
      {
        name: 'Alice W. Updated',
        phone: '+1 555-9988',
        profileData: {
          bloodGroup: 'AB+',
        },
      },
      patientAliceToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.user.name === 'Alice W. Updated', 'Name was not updated');
    assert(res.data.user.phone === '+1 555-9988', 'Phone was not updated');
  });

  await test('Reject password change with incorrect current password', async () => {
    const res = await request(
      'PUT',
      '/auth/change-password',
      {
        currentPassword: 'WrongCurrentPassword',
        newPassword: 'BrandNewPassword@2026',
      },
      patientAliceToken
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.message.includes('does not match'), `Got message: ${res.data.message}`);
  });

  await test('Reject password change when new password is identical to current', async () => {
    const res = await request(
      'PUT',
      '/auth/change-password',
      {
        currentPassword: 'Password@123',
        newPassword: 'Password@123',
      },
      patientAliceToken
    );
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.message.includes('identical'), `Got message: ${res.data.message}`);
  });

  await test('Successfully change password with valid current password', async () => {
    const res = await request(
      'PUT',
      '/auth/change-password',
      {
        currentPassword: 'Password@123',
        newPassword: 'BrandNewPassword@2026',
      },
      patientAliceToken
    );
    assert(res.status === 200, `Expected 200, got ${res.status}`);

    // Verify old password fails login
    const oldLoginRes = await request('POST', '/auth/login', {
      email: 'patient.alice@email.com',
      password: 'Password@123',
    });
    assert(oldLoginRes.status === 401, 'Old password must fail authentication');

    // Verify new password succeeds login
    const newLoginRes = await request('POST', '/auth/login', {
      email: 'patient.alice@email.com',
      password: 'BrandNewPassword@2026',
    });
    assert(newLoginRes.status === 200, 'New password must authenticate successfully');
    patientAliceToken = newLoginRes.data.token;
  });

  // ----------------------------------------------------
  // TEST GROUP 6: Forgot & Reset Password Workflow
  // ----------------------------------------------------
  console.log('\n--- Group 6: Forgot & Reset Password Flow ---');

  let resetToken = null;

  await test('Reject forgot-password with nonexistent email', async () => {
    const res = await request('POST', '/auth/forgot-password', {
      email: 'nonexistent999@hospital.com',
    });
    assert(res.status === 404, `Expected 404, got ${res.status}`);
  });

  await test('Generate password reset token for valid email', async () => {
    const res = await request('POST', '/auth/forgot-password', {
      email: 'patient.alice@email.com',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.resetToken, 'Response must provide resetToken');
    resetToken = res.data.resetToken;

    // Verify resetPasswordToken is stored in DB hashed
    const userInDb = await User.findOne({ email: 'patient.alice@email.com' }).select('+resetPasswordToken +resetPasswordExpire');
    assert(userInDb.resetPasswordToken, 'Hashed token must be in DB');
    assert(userInDb.resetPasswordExpire > Date.now(), 'Token expire must be in the future');
  });

  await test('Reject password reset with invalid or corrupted token', async () => {
    const res = await request('PUT', '/auth/reset-password/totally_invalid_token_123', {
      password: 'NewResetPassword@2026',
    });
    assert(res.status === 400, `Expected 400, got ${res.status}`);
    assert(res.data.message.includes('invalid or has expired'), `Got message: ${res.data.message}`);
  });

  await test('Successfully reset password using valid crypto reset token', async () => {
    const res = await request('PUT', `/auth/reset-password/${resetToken}`, {
      password: 'ResetPasswordSuccess@2026',
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Success must be true');

    // Verify token fields are cleared in DB
    const userInDb = await User.findOne({ email: 'patient.alice@email.com' }).select('+resetPasswordToken +resetPasswordExpire');
    assert(!userInDb.resetPasswordToken, 'resetPasswordToken must be cleared after use');

    // Verify login with newly reset password works
    const loginRes = await request('POST', '/auth/login', {
      email: 'patient.alice@email.com',
      password: 'ResetPasswordSuccess@2026',
    });
    assert(loginRes.status === 200, 'Must successfully login with newly reset password');
    patientAliceToken = loginRes.data.token;
  });

  // ----------------------------------------------------
  // TEST GROUP 7: Role-Based Access Control (RBAC) & Route Protection
  // ----------------------------------------------------
  console.log('\n--- Group 7: Role-Based Access Control (RBAC) ---');

  await test('Admin can access Audit Logs endpoint (/api/audit-logs)', async () => {
    const res = await request('GET', '/audit-logs', null, adminToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.success === true, 'Admin must be granted access');
  });

  await test('Doctor is FORBIDDEN from accessing Audit Logs (403)', async () => {
    const res = await request('GET', '/audit-logs', null, doctorToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.data.message.includes('not authorized'), `Got message: ${res.data.message}`);
  });

  await test('Patient is FORBIDDEN from accessing Audit Logs (403)', async () => {
    const res = await request('GET', '/audit-logs', null, patientAliceToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.data.message.includes('not authorized'), `Got message: ${res.data.message}`);
  });

  await test('Doctor can view patient directory (/api/patients)', async () => {
    const res = await request('GET', '/patients', null, doctorToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(Array.isArray(res.data.patients), 'Doctor should receive patients list');
  });

  await test('Patient is FORBIDDEN from viewing patient directory (/api/patients)', async () => {
    const res = await request('GET', '/patients', null, patientAliceToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.data.message.includes('not authorized'), `Got message: ${res.data.message}`);
  });

  await test('Patient is FORBIDDEN from creating lab catalog tests (/api/lab/tests)', async () => {
    const res = await request(
      'POST',
      '/lab/tests',
      {
        name: 'Hacked Test',
        category: 'Hematology',
        price: 50,
      },
      patientAliceToken
    );
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // ----------------------------------------------------
  // TEST GROUP 8: Patient Data Boundary & Cross-Patient Isolation
  // ----------------------------------------------------
  console.log('\n--- Group 8: Patient Data Boundary & Isolation ---');

  await test('Patient Alice can view HER OWN patient profile (/api/patients/:id)', async () => {
    const res = await request('GET', `/patients/${patientAliceId}`, null, patientAliceToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.patient._id === patientAliceId.toString(), 'Must return Alice profile');
  });

  await test('Patient Alice is BLOCKED (403) from accessing Patient Bob profile', async () => {
    const res = await request('GET', `/patients/${patientBobId}`, null, patientAliceToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.data.message.includes('Access denied'), `Got message: ${res.data.message}`);
  });

  await test('Patient Alice is BLOCKED (403) from updating Patient Bob profile', async () => {
    const res = await request(
      'PUT',
      `/patients/${patientBobId}`,
      { firstName: 'Hacked Bob' },
      patientAliceToken
    );
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.data.message.includes('only update your own profile'), `Got message: ${res.data.message}`);
  });

  await test('Patient Alice is BLOCKED (403) from viewing Patient Bob timeline', async () => {
    const res = await request('GET', `/patients/${patientBobId}/timeline`, null, patientAliceToken);
    assert(res.status === 403, `Expected 403, got ${res.status}`);
    assert(res.data.message.includes('Access denied'), `Got message: ${res.data.message}`);
  });

  // ----------------------------------------------------
  // TEST GROUP 9: Audit Trail Recording
  // ----------------------------------------------------
  console.log('\n--- Group 9: Audit Trail Recording ---');

  await test('Verify unauthorized access attempt was recorded in Audit Logs', async () => {
    const unauthorizedLogs = await AuditLog.find({ action: 'UNAUTHORIZED_ACCESS_ATTEMPT' });
    assert(unauthorizedLogs.length > 0, 'AuditLog must have recorded UNAUTHORIZED_ACCESS_ATTEMPT');
    const lastAttempt = unauthorizedLogs[unauthorizedLogs.length - 1];
    assert(lastAttempt.details.userRole === 'patient', `Expected patient role in log, got ${lastAttempt.details.userRole}`);
  });

  // ----------------------------------------------------
  // TEST GROUP 10: Logout
  // ----------------------------------------------------
  console.log('\n--- Group 10: Logout ---');

  await test('User can log out and create audit log', async () => {
    const res = await request('POST', '/auth/logout', {}, patientAliceToken);
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    assert(res.data.message.includes('Logged out successfully'), `Got message: ${res.data.message}`);

    const logoutLog = await AuditLog.findOne({ action: 'AUTH_LOGOUT' }).sort({ createdAt: -1 });
    assert(logoutLog, 'AUTH_LOGOUT must be logged in AuditLog');
  });

  // Clean up
  await User.deleteMany({ email: { $in: testEmails } });
  await Patient.deleteMany({ _id: { $in: [patientAliceId, patientBobId] } });
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
    console.error('\n  FAILURES:');
    results.filter((r) => !r.passed).forEach((r) => console.error(`   - ${r.name}: ${r.error}`));
    process.exit(1);
  } else {
    console.log('\n  ALL TESTS PASSED WITH 100% SUCCESS!\n');
    process.exit(0);
  }
};

runAllTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
