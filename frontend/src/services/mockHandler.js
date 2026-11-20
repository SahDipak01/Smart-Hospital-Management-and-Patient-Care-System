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
    let filtered = [...store.approvals];
    const urlObj = new URL('http://dummy.com' + (config.url || ''));
    const statusParam = urlObj.searchParams.get('status');
    const roleParam = urlObj.searchParams.get('role');
    const searchParam = urlObj.searchParams.get('search');

    if (statusParam && statusParam !== 'All') {
      filtered = filtered.filter((a) => a.approvalStatus === statusParam);
    }
    if (roleParam && roleParam !== 'All') {
      filtered = filtered.filter((a) => a.role === roleParam);
    }
    if (searchParam) {
      const q = searchParam.toLowerCase();
      filtered = filtered.filter((a) => a.name?.toLowerCase().includes(q) || a.email?.toLowerCase().includes(q));
    }

    return {
      status: 200,
      data: {
        success: true,
        count: filtered.length,
        applicants: filtered,
        requests: filtered,
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
      const user = store.users.find((u) => u.email === app.email);
      if (user) {
        user.isApproved = true;
        user.approvalStatus = 'Approved';
        user.isActive = true;
      }
    }
    saveMockStore(store);
    return { status: 200, data: { success: true, message: 'Applicant registration approved successfully' } };
  }

  if (cleanUrl.startsWith('/auth/approvals/') && cleanUrl.endsWith('/reject') && method === 'post') {
    const id = cleanUrl.split('/')[3];
    const app = store.approvals.find((a) => a._id === id);
    if (app) {
      app.approvalStatus = 'Rejected';
      app.rejectionReason = data?.reason || 'Credentials could not be verified.';
      const user = store.users.find((u) => u.email === app.email);
      if (user) {
        user.approvalStatus = 'Rejected';
        user.isActive = false;
      }
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

  // 4. Pharmacy & Medication Inventory
  if (cleanUrl === '/pharmacy/inventory' && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        count: store.inventory.length,
        inventory: store.inventory,
        medicines: store.inventory,
        alerts: {
          lowStockCount: store.inventory.filter((i) => i.status === 'Low Stock' || (i.stockQuantity || i.stock) <= (i.reorderLevel || 50)).length,
          lowStockMedicines: store.inventory.filter((i) => i.status === 'Low Stock' || (i.stockQuantity || i.stock) <= (i.reorderLevel || 50)),
          expiringCount: 1,
        },
      },
    };
  }

  if (cleanUrl === '/pharmacy/inventory' && method === 'post') {
    const newMed = {
      _id: `med_${Date.now()}`,
      name: data.name || 'New Medicine',
      genericName: data.genericName || data.name || 'Generic Compound',
      category: data.category || 'Antibiotics',
      dosageForm: data.dosageForm || 'Tablet',
      strength: data.strength || '500 mg',
      unitPrice: Number(data.unitPrice) || 15.0,
      price: Number(data.unitPrice) || 15.0,
      stockQuantity: Number(data.stockQuantity) || 100,
      stock: Number(data.stockQuantity) || 100,
      reorderLevel: Number(data.reorderLevel) || 20,
      batchNumber: data.batchNumber || `BAT-2026-${Date.now().toString().slice(-4)}`,
      expiryDate: data.expiryDate || '2028-12-31',
      manufacturer: data.manufacturer || 'Apex Pharmaceuticals',
      rackLocation: data.rackLocation || 'Rack A-01',
      status: Number(data.stockQuantity) <= Number(data.reorderLevel) ? 'Low Stock' : 'In Stock',
      createdAt: new Date().toISOString(),
    };
    store.inventory.unshift(newMed);
    saveMockStore(store);
    return { status: 201, data: { success: true, message: 'Medicine added to inventory successfully', medicine: newMed } };
  }

  if (cleanUrl === '/pharmacy/dispense' && method === 'post') {
    const items = data.items || [];
    items.forEach((item) => {
      const med = store.inventory.find(
        (m) =>
          m._id === item.medicineId ||
          (item.prescriptionMedicineName && m.name.toLowerCase().includes(item.prescriptionMedicineName.toLowerCase()))
      );
      if (med) {
        const qty = Number(item.quantity) || 1;
        med.stockQuantity = Math.max(0, (med.stockQuantity || med.stock || 50) - qty);
        med.stock = med.stockQuantity;
        if (med.stockQuantity <= (med.reorderLevel || 20)) {
          med.status = 'Low Stock';
        }
      }
    });
    saveMockStore(store);
    return { status: 200, data: { success: true, message: 'Medications dispensed successfully and stock adjusted' } };
  }

  // 5. Diagnostics & Laboratory
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

  // 6. Ward Management & Inpatient Bed Matrix
  if (cleanUrl === '/wards/wards' && method === 'get') {
    return { status: 200, data: { success: true, wards: store.wards } };
  }

  if (cleanUrl === '/wards/bed-matrix' && method === 'get') {
    const matrix = store.wards.map((w) => ({
      ward: {
        id: w._id,
        _id: w._id,
        name: w.name,
        code: w.code,
        floor: w.floor,
        type: w.type || 'General Inpatient',
        dailyRate: w.dailyRate || 350,
      },
      beds: w.beds || [],
    }));
    return { status: 200, data: { success: true, matrix } };
  }

  if (cleanUrl === '/wards/admissions' && method === 'post') {
    const { patientId, doctorId, wardId, bedId, admissionDiagnosis, admissionReason } = data;
    const patientObj = store.patients.find((p) => p._id === patientId) || {
      _id: patientId,
      firstName: 'Admitted',
      lastName: 'Patient',
      uhid: `HMS-PAT-${Math.floor(10000 + Math.random() * 90000)}`,
      gender: 'Male',
      age: 45,
    };
    const doctorObj = store.doctors.find((d) => d._id === doctorId) || { name: 'Dr. Sarah Jenkins' };

    const ward = store.wards.find((w) => w._id === wardId);
    if (ward && ward.beds) {
      const bed = ward.beds.find((b) => b._id === bedId);
      if (bed) {
        bed.status = 'Occupied';
        bed.currentAdmission = {
          _id: `adm_${Date.now()}`,
          patient: patientObj,
          doctor: doctorObj,
          admissionDate: new Date().toISOString(),
          admissionDiagnosis: admissionDiagnosis || 'Clinical in-patient observation',
          admissionReason: admissionReason || 'Routine care',
          status: 'Admitted',
        };
        ward.occupiedBeds = (ward.occupiedBeds || 0) + 1;
      }
    }
    saveMockStore(store);
    return { status: 201, data: { success: true, message: 'Patient admitted successfully! Bed marked Occupied.' } };
  }

  if (cleanUrl.startsWith('/wards/admissions/') && cleanUrl.endsWith('/discharge') && method === 'post') {
    const admId = cleanUrl.split('/')[3];
    store.wards.forEach((w) => {
      (w.beds || []).forEach((b) => {
        if (b.currentAdmission?._id === admId || b.currentAdmission?.patient?._id === admId) {
          b.status = 'Available';
          b.currentAdmission = null;
          w.occupiedBeds = Math.max(0, (w.occupiedBeds || 1) - 1);
        }
      });
    });
    saveMockStore(store);
    return {
      status: 200,
      data: {
        success: true,
        message: 'Patient discharged successfully! Bed released to Available.',
        staySummary: { stayedDays: 3 },
      },
    };
  }

  if (cleanUrl.startsWith('/wards/admissions/') && cleanUrl.endsWith('/transfer') && method === 'post') {
    const admId = cleanUrl.split('/')[3];
    const { targetBedId } = data;
    let transferAdm = null;

    // Find and remove from source bed
    store.wards.forEach((w) => {
      (w.beds || []).forEach((b) => {
        if (b.currentAdmission?._id === admId) {
          transferAdm = b.currentAdmission;
          b.status = 'Available';
          b.currentAdmission = null;
          w.occupiedBeds = Math.max(0, (w.occupiedBeds || 1) - 1);
        }
      });
    });

    // Assign to target bed
    if (transferAdm) {
      store.wards.forEach((w) => {
        (w.beds || []).forEach((b) => {
          if (b._id === targetBedId) {
            b.status = 'Occupied';
            b.currentAdmission = transferAdm;
            w.occupiedBeds = (w.occupiedBeds || 0) + 1;
          }
        });
      });
    }
    saveMockStore(store);
    return { status: 200, data: { success: true, message: 'Patient transferred to target bed successfully' } };
  }

  // 7. Hospital Billing & Invoicing
  if (cleanUrl === '/billing' && method === 'get') {
    let filtered = [...store.bills];
    const urlObj = new URL('http://dummy.com' + (config.url || ''));
    const statusParam = urlObj.searchParams.get('status');
    if (statusParam && statusParam !== 'All') {
      filtered = filtered.filter((b) => b.status === statusParam);
    }
    return { status: 200, data: { success: true, count: filtered.length, bills: filtered } };
  }

  if (cleanUrl === '/billing/generate' && method === 'post') {
    const patientObj = store.patients.find((p) => p._id === data.patientId) || store.patients[0];
    const items = data.items || [];
    const subTotal = items.reduce(
      (acc, itm) => acc + (Number(itm.amount) || Number(itm.quantity) * Number(itm.unitPrice) || 0),
      0
    );
    const taxAmount = Math.round(subTotal * 0.05 * 100) / 100;
    const discountAmount = Number(data.discountAmount) || 0;
    const totalAmount = Math.max(0, subTotal + taxAmount - discountAmount);

    const newBill = {
      _id: `bill_${Date.now()}`,
      billNumber: `INV-${new Date().getFullYear()}${String(new Date().getMonth() + 1).padStart(2, '0')}-${Math.floor(
        1000 + Math.random() * 9000
      )}`,
      patient: patientObj,
      items,
      subTotal,
      taxAmount,
      discountAmount,
      totalAmount,
      paidAmount: 0,
      balanceAmount: totalAmount,
      status: 'Pending',
      createdAt: new Date().toISOString(),
      payments: [],
    };
    store.bills.unshift(newBill);
    saveMockStore(store);
    return { status: 201, data: { success: true, message: 'Hospital billing invoice generated', bill: newBill } };
  }

  if (cleanUrl.startsWith('/billing/') && cleanUrl.endsWith('/payment') && method === 'post') {
    const id = cleanUrl.split('/')[2];
    const bill = store.bills.find((b) => b._id === id);
    if (bill) {
      const payAmt = Number(data.amount) || bill.balanceAmount || bill.totalAmount;
      bill.paidAmount = (bill.paidAmount || 0) + payAmt;
      bill.balanceAmount = Math.max(0, (bill.totalAmount || 0) - bill.paidAmount);
      bill.status = bill.balanceAmount <= 0 ? 'Paid' : 'Partially Paid';
      bill.paymentMethod = data.paymentMethod || 'Cash';
      if (!bill.payments) bill.payments = [];
      bill.payments.push({
        amount: payAmt,
        paymentMethod: data.paymentMethod || 'Cash',
        transactionRef: data.transactionRef || `TXN-${Date.now().toString().slice(-6)}`,
        recordedAt: new Date().toISOString(),
      });
    }
    saveMockStore(store);
    return { status: 200, data: { success: true, message: 'Payment recorded successfully', bill } };
  }

  // 8. Symptom Triage Assessment
  if (cleanUrl === '/triage/assess' && method === 'post') {
    const symptomsArr = Array.isArray(data.symptoms)
      ? data.symptoms.map((s) => (typeof s === 'string' ? s : s.name)).join(' ')
      : String(data.symptoms || '');
    const combined = `${data.chiefComplaint || ''} ${symptomsArr}`.toLowerCase();

    let severityLevel = 'Non-Urgent Routine (Green)';
    let emergencyFlags = [];
    let guidance =
      'Standard outpatient clinical evaluation recommended within 48 to 72 hours. Maintain adequate hydration, bed rest, and report any acute worsening of symptoms.';
    let recommendedDepartment = 'General Outpatient Care';
    let urgencyScore = 3;

    if (
      combined.includes('chest') ||
      combined.includes('shortness of breath') ||
      combined.includes('unconscious') ||
      combined.includes('palpitations') ||
      combined.includes('severe')
    ) {
      severityLevel = 'Critical Emergency (Red)';
      emergencyFlags = [
        'Potential acute coronary syndrome or myocardial ischemia',
        'Severe acute cardiopulmonary distress detected',
        'Immediate vital signs stabilization and resuscitation telemetry required',
      ];
      guidance =
        'CRITICAL TRIAGE PRIORITY: Immediate presentation to Emergency Trauma Bay 1 required. Continuous 12-lead ECG telemetry, high-flow oxygen, and stat troponin biomarker evaluation indicated.';
      recommendedDepartment = 'Cardiology & Emergency Trauma Care';
      urgencyScore = 9;
    } else if (
      combined.includes('fever') ||
      combined.includes('cramps') ||
      combined.includes('headache') ||
      combined.includes('dizziness')
    ) {
      severityLevel = 'Urgent Priority (Yellow)';
      emergencyFlags = ['Systemic febrile syndrome with potential infectious etiology'];
      guidance =
        'Priority physician consultation indicated within 2 to 4 hours. Complete blood count, baseline vitals check, and antipyretic administration recommended.';
      recommendedDepartment = combined.includes('cramps') ? 'Gastroenterology' : 'General Internal Medicine';
      urgencyScore = 6;
    }

    const triageObj = {
      _id: `trg_${Date.now()}`,
      triageNumber: `TRG-${Math.floor(100000 + Math.random() * 900000)}`,
      severityLevel,
      emergencyFlags,
      guidance,
      recommendedDepartment,
      urgencyScore,
      assessedAt: new Date().toISOString(),
    };

    if (!store.triageHistory) store.triageHistory = [];
    store.triageHistory.unshift(triageObj);
    saveMockStore(store);

    return {
      status: 200,
      data: {
        success: true,
        triage: triageObj,
        triageResult: triageObj,
      },
    };
  }

  if (cleanUrl === '/triage/history' && method === 'get') {
    return { status: 200, data: { success: true, history: store.triageHistory || [] } };
  }

  // 9. Hospital Staff Roster Management
  if (cleanUrl === '/staff' && method === 'get') {
    let list = store.staff || [];
    const urlObj = new URL('http://dummy.com' + (config.url || ''));
    const roleParam = urlObj.searchParams.get('roleType');
    if (roleParam && roleParam !== 'All') {
      list = list.filter((s) => s.roleType === roleParam || s.role === roleParam);
    }
    return { status: 200, data: { success: true, count: list.length, staff: list } };
  }

  if (cleanUrl === '/staff' && method === 'post') {
    const newStaff = {
      _id: `stf_${Date.now()}`,
      staffId: `HMS-STF-${Math.floor(1000 + Math.random() * 9000)}`,
      name: `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Clinical Staff Member',
      firstName: data.firstName || 'Staff',
      lastName: data.lastName || 'Member',
      email: data.email || 'staff@hospital.com',
      phone: data.phone || '+1 (555) 010-9999',
      roleType: data.roleType || 'nurse',
      role: data.roleType || 'nurse',
      department: data.department || 'General Medicine',
      shift: data.shift || 'Morning',
      status: 'Active',
      isActive: true,
      createdAt: new Date().toISOString(),
    };
    if (!store.staff) store.staff = [];
    store.staff.unshift(newStaff);
    saveMockStore(store);
    return { status: 201, data: { success: true, message: 'Staff member registered successfully', staff: newStaff } };
  }

  // 10. Audit Logs & Notifications
  if (cleanUrl === '/audit-logs' && method === 'get') {
    return { status: 200, data: { success: true, logs: store.auditLogs } };
  }

  if (cleanUrl === '/notifications' && method === 'get') {
    return {
      status: 200,
      data: {
        success: true,
        notifications: [
          {
            _id: 'n_1',
            title: 'System Online',
            message: 'Interactive Hospital Care Preview initialized successfully.',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
          {
            _id: 'n_2',
            title: 'Pending Approval',
            message: 'New staff & medical doctor registration applications require review.',
            isRead: false,
            createdAt: new Date().toISOString(),
          },
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
