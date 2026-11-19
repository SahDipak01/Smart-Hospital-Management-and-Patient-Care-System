const Patient = require('../models/Patient');
const Doctor = require('../models/Doctor');
const Staff = require('../models/Staff');
const Appointment = require('../models/Appointment');
const Bed = require('../models/Bed');
const Ward = require('../models/Ward');
const Bill = require('../models/Bill');
const LabReport = require('../models/LabReport');
const Medicine = require('../models/Medicine');
const Admission = require('../models/Admission');
const MedicalRecord = require('../models/MedicalRecord');
const Prescription = require('../models/Prescription');
const AuditLog = require('../models/AuditLog');

// @desc Get comprehensive hospital dashboard KPIs & charts data
// @route GET /api/analytics/dashboard
const getDashboardData = async (req, res, next) => {
  try {
    const { range = 'all' } = req.query;
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // Range filter calculation for appointments & revenue
    let dateFilter = {};
    if (range === 'today') {
      dateFilter = { $gte: startOfToday, $lte: endOfToday };
    } else if (range === 'week') {
      const pastWeek = new Date(today);
      pastWeek.setDate(pastWeek.getDate() - 7);
      dateFilter = { $gte: pastWeek };
    } else if (range === 'month') {
      const pastMonth = new Date(today);
      pastMonth.setDate(pastMonth.getDate() - 30);
      dateFilter = { $gte: pastMonth };
    }

    const appointmentDateQuery = Object.keys(dateFilter).length ? { appointmentDate: dateFilter } : {};
    const billDateQuery = Object.keys(dateFilter).length ? { billDate: dateFilter } : {};

    // Counts & aggregates
    const [
      totalPatients,
      totalDoctors,
      totalStaff,
      todayAppointmentsTotal,
      todayCompleted,
      todayPending,
      todayCancelled,
      totalBeds,
      occupiedBeds,
      availableBeds,
      maintenanceBeds,
      activeAdmissions,
      bills,
      filteredBills,
      lowStockMedicines,
      pendingLabOrders,
      recentAuditLogs,
    ] = await Promise.all([
      Patient.countDocuments(),
      Doctor.countDocuments({ isApproved: true, status: 'Active' }),
      Staff.countDocuments({ status: 'Active' }),
      Appointment.countDocuments({ appointmentDate: { $gte: startOfToday, $lte: endOfToday } }),
      Appointment.countDocuments({ appointmentDate: { $gte: startOfToday, $lte: endOfToday }, status: 'Completed' }),
      Appointment.countDocuments({ appointmentDate: { $gte: startOfToday, $lte: endOfToday }, status: { $in: ['Pending', 'Confirmed'] } }),
      Appointment.countDocuments({ appointmentDate: { $gte: startOfToday, $lte: endOfToday }, status: 'Cancelled' }),
      Bed.countDocuments(),
      Bed.countDocuments({ status: 'Occupied' }),
      Bed.countDocuments({ status: 'Available' }),
      Bed.countDocuments({ status: 'Maintenance' }),
      Admission.countDocuments({ status: 'Admitted' }),
      Bill.find(),
      Bill.find(billDateQuery),
      Medicine.find({ $expr: { $lte: ['$stockQuantity', '$reorderLevel'] } }),
      LabReport.countDocuments({ status: { $in: ['Requested', 'Sample Collected', 'Processing'] } }),
      AuditLog.find().sort({ createdAt: -1 }).limit(10),
    ]);

    // Financial summaries
    const targetBills = Object.keys(billDateQuery).length ? filteredBills : bills;
    const totalRevenue = targetBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalCollected = targetBills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const outstandingBalance = targetBills.reduce((sum, b) => sum + (b.balanceAmount || 0), 0);

    // Department-wise distribution
    const departmentDistribution = await Appointment.aggregate([
      {
        $lookup: {
          from: 'departments',
          localField: 'department',
          foreignField: '_id',
          as: 'dept',
        },
      },
      { $unwind: '$dept' },
      {
        $group: {
          _id: '$dept.name',
          count: { $sum: 1 },
        },
      },
      { $project: { name: '$_id', value: '$count', _id: 0 } },
      { $sort: { value: -1 } },
    ]);

    // Monthly patient registration trend (last 6 months)
    const monthlyRegistrations = await Patient.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 },
    ]);

    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const formattedMonthly = monthlyRegistrations.map((m) => ({
      month: `${monthNames[m._id.month]} ${m._id.year}`,
      patients: m.count,
    }));

    // Monthly revenue trend
    const monthlyRevenueRaw = await Bill.aggregate([
      {
        $group: {
          _id: {
            year: { $year: '$billDate' },
            month: { $month: '$billDate' },
          },
          revenue: { $sum: '$totalAmount' },
          collected: { $sum: '$paidAmount' },
        },
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 6 },
    ]);

    const formattedRevenue = monthlyRevenueRaw.map((r) => ({
      month: `${monthNames[r._id.month]} ${r._id.year}`,
      revenue: Math.round(r.revenue),
      collected: Math.round(r.collected),
    }));

    // Bed occupancy breakdown
    const bedOccupancyData = [
      { name: 'Occupied', value: occupiedBeds, color: '#0284c7' },
      { name: 'Available', value: availableBeds, color: '#10b981' },
      { name: 'Maintenance', value: maintenanceBeds, color: '#f59e0b' },
    ];

    res.json({
      success: true,
      selectedRange: range,
      kpis: {
        totalPatients,
        totalDoctors,
        totalStaff,
        todayAppointments: {
          total: todayAppointmentsTotal,
          completed: todayCompleted,
          pending: todayPending,
          cancelled: todayCancelled,
        },
        bedMetrics: {
          total: totalBeds,
          occupied: occupiedBeds,
          available: availableBeds,
          maintenance: maintenanceBeds,
          occupancyPercent: totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0,
        },
        financials: {
          totalRevenue,
          totalCollected,
          outstandingBalance,
        },
        alerts: {
          lowStockMedicinesCount: lowStockMedicines.length,
          lowStockMedicines: lowStockMedicines.slice(0, 5),
          pendingLabOrdersCount: pendingLabOrders,
          activeInpatientsCount: activeAdmissions,
        },
      },
      charts: {
        departmentDistribution: departmentDistribution.length ? departmentDistribution : [
          { name: 'Cardiology', value: 35 },
          { name: 'Neurology', value: 20 },
          { name: 'Orthopedics', value: 18 },
          { name: 'Pediatrics', value: 15 },
          { name: 'General Medicine', value: 30 },
        ],
        monthlyRegistrations: formattedMonthly.length ? formattedMonthly : [
          { month: 'Jun 2026', patients: 45 },
          { month: 'Jul 2026', patients: 52 },
          { month: 'Aug 2026', patients: 61 },
          { month: 'Sep 2026', patients: 75 },
          { month: 'Oct 2026', patients: 88 },
          { month: 'Nov 2026', patients: 95 },
        ],
        monthlyRevenue: formattedRevenue.length ? formattedRevenue : [
          { month: 'Jun 2026', revenue: 4200, collected: 3900 },
          { month: 'Jul 2026', revenue: 5100, collected: 4800 },
          { month: 'Aug 2026', revenue: 6300, collected: 5900 },
          { month: 'Sep 2026', revenue: 7800, collected: 7200 },
          { month: 'Oct 2026', revenue: 8900, collected: 8300 },
          { month: 'Nov 2026', revenue: 9500, collected: 9000 },
        ],
        bedOccupancy: bedOccupancyData,
      },
      recentActivities: recentAuditLogs,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get Doctor Workbench Dashboard summary
// @route GET /api/analytics/doctor-summary
const getDoctorSummary = async (req, res, next) => {
  try {
    let doctor = null;
    if (req.user.role === 'doctor') {
      doctor = await Doctor.findOne({ user: req.user._id }).populate('department');
    } else if (req.query.doctorId) {
      doctor = await Doctor.findById(req.query.doctorId).populate('department');
    } else {
      doctor = await Doctor.findOne().populate('department');
    }

    if (!doctor) {
      return res.status(404).json({ success: false, message: 'Doctor profile not found.' });
    }

    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    const [todayAppointments, upcomingAppointments, admissions, pendingLabOrders, recentPrescriptions] = await Promise.all([
      Appointment.find({
        doctor: doctor._id,
        appointmentDate: { $gte: startOfToday, $lte: endOfToday },
      })
        .populate('patient', 'uhid firstName lastName gender bloodGroup dateOfBirth phone allergies')
        .sort({ queueNumber: 1 }),
      Appointment.find({
        doctor: doctor._id,
        appointmentDate: { $gt: endOfToday },
        status: { $in: ['Confirmed', 'Pending'] },
      })
        .populate('patient', 'uhid firstName lastName gender bloodGroup dateOfBirth phone')
        .sort({ appointmentDate: 1 })
        .limit(10),
      Admission.find({
        doctor: doctor._id,
        status: 'Admitted',
      })
        .populate('patient', 'uhid firstName lastName gender bloodGroup dateOfBirth phone')
        .populate('ward', 'name floor')
        .populate('bed', 'bedNumber type'),
      LabReport.find({
        doctor: doctor._id,
        status: { $in: ['Requested', 'Sample Collected', 'Processing', 'Completed'] },
      })
        .populate('patient', 'uhid firstName lastName gender bloodGroup')
        .populate('test', 'name category turnaroundHours price')
        .sort({ requestedDate: -1 })
        .limit(10),
      Prescription.find({ doctor: doctor._id })
        .populate('patient', 'uhid firstName lastName gender bloodGroup')
        .sort({ date: -1 })
        .limit(10),
    ]);

    const completedToday = todayAppointments.filter((a) => a.status === 'Completed').length;
    const pendingToday = todayAppointments.filter((a) => a.status === 'Confirmed' || a.status === 'Pending').length;

    res.json({
      success: true,
      doctor: {
        id: doctor._id,
        name: `Dr. ${doctor.firstName} ${doctor.lastName}`,
        doctorId: doctor.doctorId,
        specialization: doctor.specialization,
        department: doctor.department?.name || 'General Medicine',
        roomNumber: doctor.roomNumber,
        consultationFee: doctor.consultationFee,
        availableDays: doctor.availableDays,
        scheduleSlots: doctor.scheduleSlots,
      },
      stats: {
        todayTotal: todayAppointments.length,
        todayPending: pendingToday,
        todayCompleted: completedToday,
        activeInpatients: admissions.length,
        pendingLabCount: pendingLabOrders.filter((l) => l.status !== 'Completed').length,
        totalPrescriptionsIssued: recentPrescriptions.length,
      },
      todayAppointments,
      upcomingAppointments,
      admissions,
      pendingLabOrders,
      recentPrescriptions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Get Patient Portal Dashboard summary
// @route GET /api/analytics/patient-summary
const getPatientSummary = async (req, res, next) => {
  try {
    let patient = null;
    if (req.user.role === 'patient') {
      patient = await Patient.findOne({ user: req.user._id });
    } else if (req.query.patientId) {
      patient = await Patient.findById(req.query.patientId);
    }

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient profile not registered for this account.' });
    }

    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);

    const [appointments, prescriptions, labReports, medicalRecords, bills] = await Promise.all([
      Appointment.find({ patient: patient._id })
        .populate('doctor', 'firstName lastName specialization consultationFee roomNumber')
        .populate('department', 'name floor')
        .sort({ appointmentDate: -1 }),
      Prescription.find({ patient: patient._id })
        .populate('doctor', 'firstName lastName specialization')
        .sort({ date: -1 })
        .limit(10),
      LabReport.find({ patient: patient._id })
        .populate('test', 'name category turnaroundHours price parameters')
        .populate('doctor', 'firstName lastName')
        .sort({ requestedDate: -1 })
        .limit(10),
      MedicalRecord.find({ patient: patient._id })
        .populate('doctor', 'firstName lastName specialization')
        .sort({ visitDate: -1 })
        .limit(10),
      Bill.find({ patient: patient._id })
        .populate('appointment')
        .populate('admission')
        .sort({ billDate: -1 }),
    ]);

    const upcomingAppointments = appointments.filter(
      (a) => new Date(a.appointmentDate) >= startOfToday && (a.status === 'Confirmed' || a.status === 'Pending')
    );

    const totalBilled = bills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const totalPaid = bills.reduce((sum, b) => sum + (b.paidAmount || 0), 0);
    const balanceDue = bills.reduce((sum, b) => sum + (b.balanceAmount || 0), 0);

    res.json({
      success: true,
      patient,
      stats: {
        upcomingAppointmentsCount: upcomingAppointments.length,
        prescriptionsCount: prescriptions.length,
        labReportsCount: labReports.length,
        medicalRecordsCount: medicalRecords.length,
        totalBilled,
        totalPaid,
        balanceDue,
      },
      upcomingAppointments,
      recentAppointments: appointments.slice(0, 5),
      recentPrescriptions: prescriptions,
      recentLabReports: labReports,
      recentMedicalRecords: medicalRecords,
      bills,
    });
  } catch (error) {
    next(error);
  }
};

// @desc Global Real-Time Search across Hospital Entities
// @route GET /api/analytics/global-search
const globalSearch = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({
        success: true,
        count: 0,
        results: { patients: [], doctors: [], appointments: [], medicines: [] },
      });
    }

    const cleanQ = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(cleanQ, 'i');

    let patientsPromise = Promise.resolve([]);
    let doctorsPromise = Doctor.find({
      $or: [{ doctorId: regex }, { firstName: regex }, { lastName: regex }, { specialization: regex }],
    })
      .select('doctorId firstName lastName specialization roomNumber consultationFee')
      .populate('department', 'name code')
      .limit(5);

    let medicinesPromise = Medicine.find({
      isActive: true,
      $or: [{ name: regex }, { genericName: regex }, { itemCode: regex }],
    })
      .select('itemCode name strength stockQuantity unitPrice category')
      .limit(5);

    let appointmentsPromise = Promise.resolve([]);

    if (req.user.role === 'patient') {
      const selfPatient = await Patient.findOne({ user: req.user._id });
      if (selfPatient) {
        appointmentsPromise = Appointment.find({
          patient: selfPatient._id,
          $or: [{ appointmentNumber: regex }, { reason: regex }, { timeSlot: regex }],
        })
          .populate('doctor', 'firstName lastName specialization')
          .limit(5);
      }
    } else {
      patientsPromise = Patient.find({
        $or: [{ uhid: regex }, { firstName: regex }, { lastName: regex }, { phone: regex }],
      })
        .select('uhid firstName lastName gender bloodGroup phone status')
        .limit(5);

      appointmentsPromise = Appointment.find({ appointmentNumber: regex })
        .populate('patient', 'firstName lastName uhid')
        .populate('doctor', 'firstName lastName specialization')
        .limit(5);
    }

    const [patients, doctors, appointments, medicines] = await Promise.all([
      patientsPromise,
      doctorsPromise,
      appointmentsPromise,
      medicinesPromise,
    ]);

    const totalCount = patients.length + doctors.length + appointments.length + medicines.length;

    res.json({
      success: true,
      query: q.trim(),
      totalCount,
      results: {
        patients,
        doctors,
        appointments,
        medicines,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getDashboardData,
  getDoctorSummary,
  getPatientSummary,
  globalSearch,
};
