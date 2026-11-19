import { getMockStore, saveMockStore } from './mockData';

// Generates a mock JWT token string
const generateMockToken = (user) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ id: user._id, role: user.role, email: user.email, exp: Date.now() / 1000 + 86400 * 7 }));
  return `mock.${header}.${payload}`;
};

export const handleMockRequest = async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const url = config.url || '';
  const data = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
  const store = getMockStore();

  console.info(`[Demo Fallback Layer] Handling ${method.toUpperCase()} ${url}`);

  // 1. Authentication Endpoints
  if (url === '/auth/login' && method === 'post') {
    const { email, password } = data;
    const user = store.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase().trim());

    if (!user) {
      const err = new Error('Invalid email or password');
      err.response = { status: 401, data: { success: false, message: 'Invalid credentials. Please verify your email and password.' } };
      throw err;
    }

    if (user.approvalStatus === 'Pending') {
      const err = new Error('Account pending administrator approval');
      err.response = { status: 403, data: { success: false, message: 'Your registration is currently under review by the Administrator.' } };
      throw err;
    }

    if (user.approvalStatus === 'Rejected') {
      const err = new Error('Account registration rejected');
      err.response = { status: 403, data: { success: false, message: 'Your registration was rejected. Reason: Qualifications could not be verified.' } };
      throw err;
    }

    const token = generateMockToken(user);
    return {
      status: 200,
      data: {
        success: true,
        message: 'Login successful (Interactive Cloud Preview)',
        token,
        user,
      },
    };
  }

  if (url === '/auth/me' && method === 'get') {
    const savedUser = localStorage.getItem('hms_user');
    const user = savedUser ? JSON.parse(savedUser) : store.users[0];
    return {
      status: 200,
      data: {
        success: true,
        user,
      },
    };
  }

  if (url === '/auth/register' && method === 'post') {
    const { role, name, email, phone, specialization, qualification, licenseNumber } = data;

    if (role === 'admin') {
      const err = new Error('Public administrator registration is restricted');
      err.response = { status: 400, data: { success: false, message: 'Administrator accounts cannot be registered publicly.' } };
      throw err;
    }

    const isPatient = role === 'patient';
    const newUser = {
      _id: `usr_${Date.now()}`,
      name: name || 'New User',
      email: email,
      role: role || 'patient',
      phone: phone || '+1 (555) 000-0000',
      isActive: isPatient,
      isApproved: isPatient,
      approvalStatus: isPatient ? 'Approved' : 'Pending',
      uhid: isPatient ? `HMS-PAT-${Math.floor(10000 + Math.random() * 90000)}` : undefined,
      registrationDetails: { specialization, qualification, licenseNumber },
      createdAt: new Date().toISOString(),
    };

    store.users.push(newUser);
    if (!isPatient) {
      store.approvals.unshift({
        _id: `appr_${Date.now()}`,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
        approvalStatus: 'Pending',
        createdAt: newUser.createdAt,
        registrationDetails: newUser.registrationDetails,
      });
    } else {
      store.patients.push({
        _id: `pat_${Date.now()}`,
        uhid: newUser.uhid,
        name: newUser.name,
        firstName: newUser.name.split(' ')[0],
        lastName: newUser.name.split(' ').slice(1).join(' ') || '',
        email: newUser.email,
        phone: newUser.phone,
        gender: data.gender || 'Not Specified',
        bloodGroup: data.bloodGroup || 'O+',
        status: 'Active',
        createdAt: newUser.createdAt,
      });
    }

    saveMockStore(store);

    const token = isPatient ? generateMockToken(newUser) : null;
    return {
      status: 201,
      data: {
        success: true,
        message: isPatient
          ? 'Registration successful! Welcome to Apex Care.'
          : 'Registration submitted successfully! Your account is queued for Administrator review.',
        token,
        user: newUser,
        approvalStatus: newUser.approvalStatus,
      },
    };
  }

  if (url === '/auth/logout' && method === 'post') {
    return { status: 200, data: { success: true, message: 'Logged out successfully' } };
  }

  if (url === '/auth/forgot-password' && method === 'post') {
    return { status: 200, data: { success: true, message: 'Password reset link sent to registered email (Demo)' } };
  }

  if (url.startsWith('/auth/reset-password') && method === 'put') {
    return { status: 200, data: { success: true, message: 'Password has been reset successfully' } };
  }

  // 2. Approvals Endpoints
  if (url.startsWith('/auth/approvals') && method === 'get') {
    if (url.includes('/stats')) {
      const pending = store.approvals.filter((a) => a.approvalStatus === 'Pending').length;
      const approved = store.approvals.filter((a) => a.approvalStatus === 'Approved').length;
      const rejected = store.approvals.filter((a) => a.approvalStatus === 'Rejected').length;
      return {
        status: 200,
        data: {
          success: true,
          stats: { pending, approved, rejected, total: store.approvals.length },
        },
      };
    }
    return {
      status: 200,
      data: {
        success: true,
        count: store.approvals.length,
        applicants: store.approvals,
      },
    };
  }

  if (url.includes('/auth/approvals/') && url.endsWith('/approve') && method === 'post') {
    const id = url.split('/')[3];
    const app = store.approvals.find((a) => a._id === id);
    if (app) {
      app.approvalStatus = 'Approved';
      app.approvedBy = { name: 'Dr. Arthur Vance (Chief Administrator)' };
      app.approvalDate = new Date().toISOString();
    }
    saveMockStore(store);
    return { status: 200, data: { success: true, message: 'Applicant registration approved successfully' } };
  }

  if (url.includes('/auth/approvals/') && url.endsWith('/reject') && method === 'post') {
    const id = url.split('/')[3];
    const app = store.approvals.find((a) => a._id === id);
    if (app) {
      app.approvalStatus = 'Rejected';
      app.rejectionReason = data.reason || 'Credentials could not be verified.';
    }
    saveMockStore(store);
    return { status: 200, data: { success: true, message: 'Applicant registration rejected' } };
  }

  // 3. Dashboards & Analytics
  if (url.startsWith('/analytics/dashboard') && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        stats: {
          totalPatients: store.patients.length + 120,
          totalDoctors: store.doctors.length + 16,
          totalStaff: 48,
          bedOccupancyRate: 76.5,
          appointmentsToday: store.appointments.length + 14,
          monthlyRevenue: 154200,
          pendingApprovals: store.approvals.filter((a) => a.approvalStatus === 'Pending').length,
          activeWardsCount: store.wards.length,
        },
        revenueBreakdown: [
          { name: 'Cardiology', value: 48500 },
          { name: 'Neurology', value: 36200 },
          { name: 'Orthopedics', value: 29400 },
          { name: 'General Medicine', value: 22100 },
          { name: 'Emergency', value: 18000 },
        ],
        monthlyTrends: [
          { month: 'Jun', patients: 320, revenue: 112000 },
          { month: 'Jul', patients: 380, revenue: 128000 },
          { month: 'Aug', patients: 410, revenue: 135000 },
          { month: 'Sep', patients: 460, revenue: 142000 },
          { month: 'Oct', patients: 510, revenue: 148000 },
          { month: 'Nov', patients: 540, revenue: 154200 },
        ],
        recentActivity: store.auditLogs,
      },
    };
  }

  if (url === '/analytics/doctor-summary' && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        summary: {
          todayAppointmentsCount: store.appointments.length,
          assignedPatientsCount: 18,
          pendingLabReportsCount: 2,
          prescriptionsWrittenToday: 5,
        },
        todaySchedule: store.appointments,
        recentPatients: store.patients,
      },
    };
  }

  if (url === '/analytics/patient-summary' && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        summary: {
          upcomingAppointmentsCount: 1,
          prescriptionsCount: store.prescriptions.length,
          labReportsCount: store.labOrders.length,
          unpaidBillsCount: store.bills.filter((b) => b.status === 'Pending').length,
        },
        upcomingAppointments: store.appointments.slice(0, 2),
        activePrescriptions: store.prescriptions,
        recentLabReports: store.labOrders,
        bills: store.bills,
      },
    };
  }

  // 4. Clinical & Management Modules
  if (url.startsWith('/departments') && method === 'get') {
    return { status: 200, data: { success: true, count: store.departments.length, departments: store.departments } };
  }

  if (url.startsWith('/patients') && method === 'get') {
    return { status: 200, data: { success: true, count: store.patients.length, patients: store.patients } };
  }

  if (url === '/patients' && method === 'post') {
    const newPat = {
      _id: `pat_${Date.now()}`,
      uhid: `HMS-PAT-${Math.floor(10000 + Math.random() * 90000)}`,
      name: `${data.firstName || ''} ${data.lastName || ''}`.trim(),
      ...data,
      status: 'Active',
      createdAt: new Date().toISOString(),
    };
    store.patients.unshift(newPat);
    saveMockStore(store);
    return { status: 201, data: { success: true, patient: newPat } };
  }

  if (url.startsWith('/doctors') && method === 'get') {
    return { status: 200, data: { success: true, count: store.doctors.length, doctors: store.doctors } };
  }

  if (url.startsWith('/appointments') && method === 'get') {
    return { status: 200, data: { success: true, count: store.appointments.length, appointments: store.appointments } };
  }

  if (url === '/appointments' && method === 'post') {
    const newApt = {
      _id: `apt_${Date.now()}`,
      appointmentNumber: `APT-202611-${Math.floor(1000 + Math.random() * 9000)}`,
      ...data,
      status: 'Confirmed',
      queueNumber: store.appointments.length + 1,
      createdAt: new Date().toISOString(),
    };
    store.appointments.unshift(newApt);
    saveMockStore(store);
    return { status: 201, data: { success: true, appointment: newApt } };
  }

  if (url.startsWith('/prescriptions') && method === 'get') {
    return { status: 200, data: { success: true, count: store.prescriptions.length, prescriptions: store.prescriptions } };
  }

  if (url.startsWith('/pharmacy/inventory') && method === 'get') {
    return { status: 200, data: { success: true, count: store.inventory.length, inventory: store.inventory } };
  }

  if (url.startsWith('/lab/orders') && method === 'get') {
    return { status: 200, data: { success: true, count: store.labOrders.length, orders: store.labOrders } };
  }

  if (url.startsWith('/lab/tests') && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        tests: [
          { _id: 't_1', code: 'CBC', name: 'Complete Blood Count (CBC)', category: 'Hematology', price: 45 },
          { _id: 't_2', code: 'LIPID', name: 'Comprehensive Lipid Profile', category: 'Biochemistry', price: 85 },
          { _id: 't_3', code: 'ECG', name: '12-Lead Electrocardiogram', category: 'Cardiology', price: 120 },
        ],
      },
    };
  }

  if (url.startsWith('/wards/wards') && method === 'get') {
    return { status: 200, data: { success: true, wards: store.wards } };
  }

  if (url.startsWith('/wards/bed-matrix') && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        matrix: store.wards.map((w) => ({
          ward: w.name,
          code: w.code,
          total: w.totalBeds,
          occupied: w.occupiedBeds,
          available: w.totalBeds - w.occupiedBeds,
        })),
      },
    };
  }

  if (url.startsWith('/billing') && method === 'get') {
    return { status: 200, data: { success: true, count: store.bills.length, bills: store.bills } };
  }

  if (url === '/triage/assess' && method === 'post') {
    const symptoms = (data.symptoms || []).join(' ').toLowerCase();
    let triageLevel = 'Non-Urgent (Green)';
    let recommendation = 'Standard outpatient consultation recommended within 48 hours.';
    let urgencyScore = 3;

    if (symptoms.includes('chest pain') || symptoms.includes('shortness of breath') || symptoms.includes('unconscious')) {
      triageLevel = 'Emergency (Red)';
      recommendation = 'IMMEDIATE ATTENTION REQUIRED: Report to Emergency Trauma Bay immediately.';
      urgencyScore = 9;
    } else if (symptoms.includes('fever') || symptoms.includes('fracture') || symptoms.includes('severe pain')) {
      triageLevel = 'Urgent (Yellow)';
      recommendation = 'Priority physician evaluation recommended within 2 to 4 hours.';
      urgencyScore = 6;
    }

    return {
      status: 200,
      data: {
        success: true,
        triageResult: {
          triageLevel,
          urgencyScore,
          suggestedDepartment: symptoms.includes('chest') ? 'Cardiology' : 'General Medicine',
          recommendation,
          assessedAt: new Date().toISOString(),
        },
      },
    };
  }

  if (url.startsWith('/audit-logs') && method === 'get') {
    return { status: 200, data: { success: true, logs: store.auditLogs } };
  }

  if (url.startsWith('/notifications') && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        notifications: [
          { _id: 'n_1', title: 'System Online', message: 'Interactive Hospital Care Preview initialized successfully.', isRead: false, createdAt: new Date().toISOString() },
          { _id: 'n_2', title: 'Pending Approval', message: '3 new staff/doctor registrations require your review.', isRead: false, createdAt: new Date().toISOString() },
        ],
      },
    };
  }

  // Catch-all generic fallback for any other requests
  return {
    status: 200,
    data: {
      success: true,
      message: 'Operation executed in interactive cloud preview mode',
    },
  };
};
