import { getMockStore, saveMockStore } from './mockData';

// Generates a mock JWT token string
const generateMockToken = (user) => {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ id: user._id, role: user.role, email: user.email, exp: Date.now() / 1000 + 86400 * 7 }));
  return `mock.${header}.${payload}`;
};

export const handleMockRequest = async (config) => {
  const method = (config.method || 'get').toLowerCase();
  const rawUrl = config.url || '';
  
  // Normalize URL to always start with / and strip /api and query strings
  let cleanUrl = rawUrl.split('?')[0];
  if (cleanUrl.startsWith('/api')) {
    cleanUrl = cleanUrl.slice(4);
  }
  if (!cleanUrl.startsWith('/')) {
    cleanUrl = '/' + cleanUrl;
  }

  const data = typeof config.data === 'string' ? JSON.parse(config.data || '{}') : (config.data || {});
  const store = getMockStore();

  console.info(`[Apex Care Mock Engine] ${method.toUpperCase()} ${cleanUrl}`);

  // 1. Authentication Endpoints
  if (cleanUrl === '/auth/login' && method === 'post') {
    const { email, password } = data;
    const cleanEmail = (email || '').toLowerCase().trim();
    const user = store.users.find((u) => u.email.toLowerCase() === cleanEmail);

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

  if (cleanUrl === '/auth/me' && method === 'get') {
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

  if (cleanUrl === '/auth/register' && method === 'post') {
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

  if (cleanUrl === '/auth/logout' && method === 'post') {
    return { status: 200, data: { success: true, message: 'Logged out successfully' } };
  }

  if (cleanUrl === '/auth/forgot-password' && method === 'post') {
    return { status: 200, data: { success: true, message: 'Password reset link sent to registered email (Demo)' } };
  }

  if (cleanUrl.startsWith('/auth/reset-password') && method === 'put') {
    return { status: 200, data: { success: true, message: 'Password has been reset successfully' } };
  }

  // 2. Approvals Endpoints
  if (cleanUrl === '/auth/approvals/stats' && method === 'get') {
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

  if (cleanUrl.startsWith('/auth/approvals') && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        count: store.approvals.length,
        applicants: store.approvals,
      },
    };
  }

  if (cleanUrl.startsWith('/auth/approvals/') && cleanUrl.endsWith('/approve') && method === 'post') {
    const id = cleanUrl.split('/')[3];
    const app = store.approvals.find((a) => a._id === id);
    if (app) {
      app.approvalStatus = 'Approved';
      app.approvedBy = { name: 'Dr. Arthur Vance (Chief Administrator)' };
      app.approvalDate = new Date().toISOString();
    }
    saveMockStore(store);
    return { status: 200, data: { success: true, message: 'Applicant registration approved successfully' } };
  }

  if (cleanUrl.startsWith('/auth/approvals/') && cleanUrl.endsWith('/reject') && method === 'post') {
    const id = cleanUrl.split('/')[3];
    const app = store.approvals.find((a) => a._id === id);
    if (app) {
      app.approvalStatus = 'Rejected';
      app.rejectionReason = data.reason || 'Credentials could not be verified.';
    }
    saveMockStore(store);
    return { status: 200, data: { success: true, message: 'Applicant registration rejected' } };
  }

  // 3. Dashboards & Analytics
  if (cleanUrl === '/analytics/dashboard' && method === 'get') {
    const totalPatients = store.patients.length + 124;
    const totalDoctors = store.doctors.length + 16;
    const totalStaff = 48;
    const totalBeds = 88;
    const occupiedBeds = 66;
    const availableBeds = 18;
    const maintenanceBeds = 4;

    return {
      status: 200,
      data: {
        success: true,
        selectedRange: 'all',
        kpis: {
          totalPatients,
          totalDoctors,
          totalStaff,
          todayAppointments: {
            total: 16,
            completed: 10,
            pending: 5,
            cancelled: 1,
          },
          bedMetrics: {
            total: totalBeds,
            occupied: occupiedBeds,
            available: availableBeds,
            maintenance: maintenanceBeds,
            occupancyPercent: Math.round((occupiedBeds / totalBeds) * 100),
          },
          financials: {
            totalRevenue: 154200,
            totalCollected: 142000,
            outstandingBalance: 12200,
          },
          alerts: {
            lowStockMedicinesCount: store.inventory.filter((i) => i.status === 'Low Stock').length,
            lowStockMedicines: store.inventory.filter((i) => i.status === 'Low Stock'),
            pendingLabOrdersCount: store.labOrders.filter((l) => l.status !== 'Completed').length,
            activeInpatientsCount: occupiedBeds,
          },
        },
        charts: {
          departmentDistribution: [
            { name: 'Cardiology', value: 35 },
            { name: 'Neurology', value: 20 },
            { name: 'Orthopedics', value: 18 },
            { name: 'Pediatrics', value: 15 },
            { name: 'General Medicine', value: 30 },
          ],
          monthlyRegistrations: [
            { month: 'Jun 2026', patients: 45 },
            { month: 'Jul 2026', patients: 52 },
            { month: 'Aug 2026', patients: 61 },
            { month: 'Sep 2026', patients: 75 },
            { month: 'Oct 2026', patients: 88 },
            { month: 'Nov 2026', patients: 95 },
          ],
          monthlyRevenue: [
            { month: 'Jun 2026', revenue: 42000, collected: 39000 },
            { month: 'Jul 2026', revenue: 51000, collected: 48000 },
            { month: 'Aug 2026', revenue: 63000, collected: 59000 },
            { month: 'Sep 2026', revenue: 78000, collected: 72000 },
            { month: 'Oct 2026', revenue: 89000, collected: 83000 },
            { month: 'Nov 2026', revenue: 95000, collected: 90000 },
          ],
          bedOccupancy: [
            { name: 'Occupied', value: occupiedBeds, color: '#0284c7' },
            { name: 'Available', value: availableBeds, color: '#10b981' },
            { name: 'Maintenance', value: maintenanceBeds, color: '#f59e0b' },
          ],
        },
        recentActivities: store.auditLogs,
      },
    };
  }

  if (cleanUrl === '/analytics/doctor-summary' && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        doctor: {
          id: 'doc_1',
          name: 'Dr. Sarah Jenkins',
          doctorId: 'HMS-DOC-1001',
          specialization: 'Interventional Cardiology',
          department: 'Cardiology',
          roomNumber: 'OPD-302',
          consultationFee: 650,
        },
        stats: {
          todayTotal: store.appointments.length + 4,
          todayPending: 2,
          todayCompleted: 3,
          activeInpatients: 4,
          pendingLabCount: 2,
          totalPrescriptionsIssued: 14,
        },
        todayAppointments: store.appointments,
        upcomingAppointments: store.appointments,
        admissions: [],
        pendingLabOrders: store.labOrders,
      },
    };
  }

  if (cleanUrl === '/analytics/patient-summary' && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        patient: store.patients[0],
        stats: {
          upcomingAppointmentsCount: 1,
          prescriptionsCount: store.prescriptions.length,
          labReportsCount: store.labOrders.length,
          medicalRecordsCount: 3,
          totalBilled: 1620,
          totalPaid: 770,
          balanceDue: 850,
        },
        upcomingAppointments: store.appointments.slice(0, 1),
        recentAppointments: store.appointments,
        recentPrescriptions: store.prescriptions,
        recentLabReports: store.labOrders,
        bills: store.bills,
      },
    };
  }

  if (cleanUrl === '/analytics/global-search' && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        results: {
          patients: store.patients,
          doctors: store.doctors,
          appointments: store.appointments,
          medicines: store.inventory,
        },
      },
    };
  }

  // 4. Clinical & Operations Modules
  if (cleanUrl === '/departments' && method === 'get') {
    return { status: 200, data: { success: true, count: store.departments.length, departments: store.departments } };
  }

  if (cleanUrl === '/patients' && method === 'get') {
    return { status: 200, data: { success: true, count: store.patients.length, patients: store.patients } };
  }

  if (cleanUrl.startsWith('/patients/') && cleanUrl.endsWith('/timeline') && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        timeline: [
          { date: new Date().toISOString(), type: 'Consultation', title: 'Cardiology Review', details: 'Normal sinus rhythm, BP 120/80 mmHg' },
          { date: new Date(Date.now() - 86400000 * 3).toISOString(), type: 'Lab Test', title: 'Complete Blood Count (CBC)', details: 'Hemoglobin 14.2 g/dL' },
          { date: new Date(Date.now() - 86400000 * 14).toISOString(), type: 'Prescription', title: 'Hypertension Refill', details: 'Amlodipine 5mg - 30 days' },
        ],
      },
    };
  }

  if (cleanUrl.startsWith('/patients/') && method === 'get') {
    const id = cleanUrl.split('/')[2];
    const pat = store.patients.find((p) => p._id === id || p.uhid === id) || store.patients[0];
    return { status: 200, data: { success: true, patient: pat } };
  }

  if (cleanUrl === '/patients' && method === 'post') {
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

  if (cleanUrl === '/doctors' && method === 'get') {
    return { status: 200, data: { success: true, count: store.doctors.length, doctors: store.doctors } };
  }

  if (cleanUrl.startsWith('/doctors/') && cleanUrl.endsWith('/slots') && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        slots: ['09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '02:00 PM', '02:30 PM', '03:00 PM'],
      },
    };
  }

  if (cleanUrl === '/appointments' && method === 'get') {
    return { status: 200, data: { success: true, count: store.appointments.length, appointments: store.appointments } };
  }

  if (cleanUrl === '/appointments' && method === 'post') {
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

  if (cleanUrl.startsWith('/appointments/') && cleanUrl.endsWith('/check-in') && method === 'patch') {
    const id = cleanUrl.split('/')[2];
    const apt = store.appointments.find((a) => a._id === id);
    if (apt) apt.status = 'Checked-In';
    saveMockStore(store);
    return { status: 200, data: { success: true, appointment: apt } };
  }

  if (cleanUrl === '/prescriptions' && method === 'get') {
    return { status: 200, data: { success: true, count: store.prescriptions.length, prescriptions: store.prescriptions } };
  }

  if (cleanUrl === '/pharmacy/inventory' && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        count: store.inventory.length,
        inventory: store.inventory,
        alerts: {
          lowStockCount: store.inventory.filter((i) => i.status === 'Low Stock').length,
          expiringCount: 0,
        },
      },
    };
  }

  if (cleanUrl === '/lab/orders' && method === 'get') {
    return { status: 200, data: { success: true, count: store.labOrders.length, orders: store.labOrders } };
  }

  if (cleanUrl === '/lab/tests' && method === 'get') {
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

  if (cleanUrl === '/wards/wards' && method === 'get') {
    return { status: 200, data: { success: true, wards: store.wards } };
  }

  if (cleanUrl === '/wards/bed-matrix' && method === 'get') {
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

  if (cleanUrl === '/billing' && method === 'get') {
    return { status: 200, data: { success: true, count: store.bills.length, bills: store.bills } };
  }

  if (cleanUrl.startsWith('/billing/') && cleanUrl.endsWith('/payment') && method === 'post') {
    const id = cleanUrl.split('/')[2];
    const bill = store.bills.find((b) => b._id === id);
    if (bill) {
      bill.paidAmount = bill.totalAmount;
      bill.status = 'Paid';
    }
    saveMockStore(store);
    return { status: 200, data: { success: true, message: 'Payment processed successfully', bill } };
  }

  if (cleanUrl === '/triage/assess' && method === 'post') {
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

  if (cleanUrl === '/audit-logs' && method === 'get') {
    return { status: 200, data: { success: true, logs: store.auditLogs } };
  }

  if (cleanUrl === '/notifications' && method === 'get') {
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
