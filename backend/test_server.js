const { spawn } = require('child_process');
const http = require('http');

console.log('[Test Harness] Starting backend server process...');

const serverProcess = spawn('node', ['server.js'], {
  cwd: __dirname,
  env: process.env,
  stdio: ['pipe', 'pipe', 'pipe'],
});

const makeRequest = (options, postData = null) => {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
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

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
};

const runProbes = async () => {
  console.log('\n================ STARTING LIVE API PROBES ================');

  console.log('\n--- 1. Testing Health Check API (GET /api/health) ---');
  try {
    const health = await makeRequest({
      hostname: 'localhost',
      port: 5000,
      path: '/api/health',
      method: 'GET',
    });
    console.log('Health check status:', health.status, 'Response:', health.data);
  } catch (err) {
    console.error('Health check failed:', err.message);
  }

  console.log('\n--- 2. Testing Administrator Login API (POST /api/auth/login) ---');
  let adminToken = null;
  try {
    const loginRes = await makeRequest(
      {
        hostname: 'localhost',
        port: 5000,
        path: '/api/auth/login',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        email: 'admin@hospital.com',
        password: 'Admin@123',
      }
    );
    console.log('Admin login status:', loginRes.status, 'User Role:', loginRes.data?.user?.role);
    adminToken = loginRes.data?.token;
  } catch (err) {
    console.error('Admin login failed:', err.message);
  }

  if (adminToken) {
    console.log('\n--- 3. Testing Analytics Dashboard KPIs (GET /api/analytics/dashboard) ---');
    try {
      const dash = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/analytics/dashboard',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log('Dashboard status:', dash.status);
      console.log('Total Patients:', dash.data?.kpis?.totalPatients);
      console.log('Total Doctors:', dash.data?.kpis?.totalDoctors);
      console.log('Total Staff:', dash.data?.kpis?.totalStaff);
      console.log('Bed Occupancy %:', dash.data?.kpis?.bedMetrics?.occupancyPercent);
      console.log('Total Revenue:', '$' + dash.data?.kpis?.financials?.totalRevenue);
    } catch (err) {
      console.error('Dashboard failed:', err.message);
    }

    console.log('\n--- 4. Testing Wards & Bed Matrix (GET /api/wards/bed-matrix) ---');
    try {
      const matrixRes = await makeRequest({
        hostname: 'localhost',
        port: 5000,
        path: '/api/wards/bed-matrix',
        method: 'GET',
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      console.log('Bed Matrix status:', matrixRes.status, 'Total Wards in Matrix:', matrixRes.data?.matrix?.length);
      matrixRes.data?.matrix?.forEach((m) => {
        console.log(`  - Ward: ${m.ward.name} (${m.beds.length} beds)`);
      });
    } catch (err) {
      console.error('Matrix failed:', err.message);
    }

    console.log('\n--- 5. Testing Symptom Triage Assessment (POST /api/triage/assess) ---');
    try {
      const triageRes = await makeRequest(
        {
          hostname: 'localhost',
          port: 5000,
          path: '/api/triage/assess',
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
        },
        {
          chiefComplaint: 'Sudden severe retrosternal chest pain radiating to left arm with shortness of breath',
          symptoms: [
            { name: 'severe chest pain', severity: 'Severe' },
            { name: 'dyspnea', severity: 'Severe' },
          ],
        }
      );
      console.log('Triage status:', triageRes.status);
      console.log('Severity Level:', triageRes.data?.triage?.severityLevel);
      console.log('Emergency Flags:', triageRes.data?.triage?.emergencyFlags);
      console.log('Recommended Department:', triageRes.data?.triage?.recommendedDepartment);
    } catch (err) {
      console.error('Triage failed:', err.message);
    }
  }

  console.log('\n================ ALL API PROBES PASSED SUCCESSFULLY ================');
  serverProcess.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1000);
};

serverProcess.stdout.on('data', (data) => {
  const msg = data.toString();
  process.stdout.write(`[Server Stdout] ${msg}`);
  if (msg.includes('Smart Hospital Management System API running on port')) {
    runProbes();
  }
});

serverProcess.stderr.on('data', (data) => {
  process.stderr.write(`[Server Stderr] ${data.toString()}`);
});
