const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const Patient = require('./models/Patient');
const Doctor = require('./models/Doctor');
const Department = require('./models/Department');
const Staff = require('./models/Staff');
const Ward = require('./models/Ward');
const Bed = require('./models/Bed');
const Medicine = require('./models/Medicine');
const LabTest = require('./models/LabTest');
const Appointment = require('./models/Appointment');
const MedicalRecord = require('./models/MedicalRecord');
const Prescription = require('./models/Prescription');
const LabReport = require('./models/LabReport');
const Admission = require('./models/Admission');
const Bill = require('./models/Bill');
const Payment = require('./models/Payment');
const Notification = require('./models/Notification');
const AuditLog = require('./models/AuditLog');
const HospitalSetting = require('./models/HospitalSetting');

const seedDatabaseIfEmpty = async () => {
  try {
    const existingUsers = await User.countDocuments();
    if (existingUsers > 0) {
      console.log(`[Seeder] Database already populated with ${existingUsers} users. Skipping seeder.`);
      return;
    }

    console.log('[Seeder] Fresh database detected. Seeding comprehensive clinical & operational records...');

    // 1. Hospital Settings
    await HospitalSetting.create({
      name: 'Apex Memorial Smart Hospital & Research Center',
      tagline: 'Precision Care, Advanced Medical Technology',
      registrationNumber: 'MED-GOV-ISO-9001-2026',
      emergencyPhone: '+1 (800) 555-9111',
      receptionPhone: '+1 (800) 555-0199',
      email: 'contact@apexsmarthealth.org',
      address: {
        street: '742 Healthcare Parkway, Medical District',
        city: 'Metro City',
        state: 'NY',
        zipCode: '10001',
      },
      taxRatePercent: 5.0,
      currency: '$',
    });

    // 2. Departments
    const deptsData = [
      { code: 'CARD', name: 'Cardiology', description: 'Advanced cardiovascular care and interventional diagnostics', floor: '3rd Floor - East Wing', icon: 'Heart', contactPhone: 'Ext. 301' },
      { code: 'NEUR', name: 'Neurology', description: 'Comprehensive neurology, brain and spinal column disorder treatment', floor: '4th Floor - West Wing', icon: 'Brain', contactPhone: 'Ext. 401' },
      { code: 'ORTH', name: 'Orthopedics', description: 'Joint replacement, trauma surgery, and sports medicine center', floor: '2nd Floor - North Wing', icon: 'Bone', contactPhone: 'Ext. 201' },
      { code: 'PEDI', name: 'Pediatrics', description: 'Dedicated neonatal, infant, and adolescent medical care', floor: '2nd Floor - South Wing', icon: 'Baby', contactPhone: 'Ext. 205' },
      { code: 'GENM', name: 'General Medicine', description: 'Primary health consultations, chronic disease management, and internal medicine', floor: '1st Floor - OPD Wing', icon: 'Stethoscope', contactPhone: 'Ext. 101' },
      { code: 'EMER', name: 'Emergency & Trauma Care', description: '24/7 Level-1 trauma response, resuscitation, and acute emergency care', floor: 'Ground Floor - Trauma Bay', icon: 'Zap', contactPhone: 'Ext. 911' },
    ];
    const departments = await Department.insertMany(deptsData);
    const deptMap = {};
    departments.forEach((d) => (deptMap[d.code] = d._id));

    // 3. User Accounts & Profiles
    const adminPassword = 'Admin@123';
    const doctorPassword = 'Doctor@123';
    const patientPassword = 'Patient@123';
    const staffPassword = 'Staff@123';

    // Admin User
    const adminUser = await User.create({
      name: 'Dr. Arthur Vance (Chief Administrator)',
      email: 'admin@hospital.com',
      password: adminPassword,
      role: 'admin',
      phone: '+1 (555) 010-0001',
      isApproved: true,
      approvalStatus: 'Approved',
      isActive: true,
    });

    // Doctor Accounts
    const doctorConfigs = [
      {
        email: 'dr.sarah@hospital.com',
        firstName: 'Sarah',
        lastName: 'Jenkins',
        specialization: 'Interventional Cardiology',
        deptCode: 'CARD',
        doctorId: 'HMS-DOC-1001',
        fee: 650,
        room: 'OPD-302',
        exp: 12,
        qualifications: [{ degree: 'MBBS, MD (Cardiology), FACC', institution: 'Johns Hopkins Medical School', year: 2014 }],
      },
      {
        email: 'dr.james@hospital.com',
        firstName: 'James',
        lastName: 'Wilson',
        specialization: 'Neurology & Stroke Care',
        deptCode: 'NEUR',
        doctorId: 'HMS-DOC-1002',
        fee: 700,
        room: 'OPD-401',
        exp: 15,
        qualifications: [{ degree: 'MBBS, DM (Neurology)', institution: 'Harvard Medical School', year: 2011 }],
      },
      {
        email: 'dr.emily@hospital.com',
        firstName: 'Emily',
        lastName: 'Rodriguez',
        specialization: 'Orthopedic & Joint Surgery',
        deptCode: 'ORTH',
        doctorId: 'HMS-DOC-1003',
        fee: 550,
        room: 'OPD-205',
        exp: 9,
        qualifications: [{ degree: 'MBBS, MS (Orthopedics)', institution: 'Stanford University', year: 2017 }],
      },
      {
        email: 'dr.michael@hospital.com',
        firstName: 'Michael',
        lastName: 'Chang',
        specialization: 'General Pediatrics',
        deptCode: 'PEDI',
        doctorId: 'HMS-DOC-1004',
        fee: 450,
        room: 'OPD-210',
        exp: 8,
        qualifications: [{ degree: 'MBBS, MD (Pediatrics)', institution: 'Columbia University', year: 2018 }],
      },
    ];

    const doctors = [];
    for (const d of doctorConfigs) {
      const u = await User.create({
        name: `Dr. ${d.firstName} ${d.lastName}`,
        email: d.email,
        password: doctorPassword,
        role: 'doctor',
        phone: '+1 (555) 012-00' + d.doctorId.slice(-2),
        isApproved: true,
        approvalStatus: 'Approved',
        isActive: true,
      });

      const doc = await Doctor.create({
        doctorId: d.doctorId,
        user: u._id,
        firstName: d.firstName,
        lastName: d.lastName,
        specialization: d.specialization,
        department: deptMap[d.deptCode],
        qualifications: d.qualifications,
        experienceYears: d.exp,
        consultationFee: d.fee,
        phone: u.phone,
        roomNumber: d.room,
        isApproved: true,
        status: 'Active',
        scheduleSlots: [
          { dayOfWeek: 'Monday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 20 },
          { dayOfWeek: 'Tuesday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 20 },
          { dayOfWeek: 'Wednesday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 20 },
          { dayOfWeek: 'Thursday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 20 },
          { dayOfWeek: 'Friday', startTime: '09:00', endTime: '13:00', slotDurationMinutes: 20 },
          { dayOfWeek: 'Saturday', startTime: '10:00', endTime: '13:00', slotDurationMinutes: 20 },
        ],
      });

      u.profileRef = doc._id;
      u.roleRefModel = 'Doctor';
      await u.save();
      doctors.push(doc);
    }

    // Patient Accounts
    const patientConfigs = [
      {
        email: 'john.doe@email.com',
        firstName: 'John',
        lastName: 'Doe',
        uhid: 'HMS-P-2026-0001',
        dob: new Date(1985, 4, 12),
        gender: 'Male',
        bloodGroup: 'O+',
        phone: '+1 (555) 234-5678',
        address: { street: '124 Maple Avenue', city: 'Metro City', state: 'NY', zipCode: '10002' },
        emergencyContact: { name: 'Sarah Doe', relationship: 'Spouse', phone: '+1 (555) 234-9999' },
        allergies: [{ substance: 'Penicillin', severity: 'Severe', reaction: 'Anaphylaxis / Skin Urticaria' }],
        chronicConditions: [{ condition: 'Essential Hypertension', diagnosedYear: '2020', status: 'Active' }],
      },
      {
        email: 'maria.garcia@email.com',
        firstName: 'Maria',
        lastName: 'Garcia',
        uhid: 'HMS-P-2026-0002',
        dob: new Date(1992, 8, 24),
        gender: 'Female',
        bloodGroup: 'A+',
        phone: '+1 (555) 345-6789',
        address: { street: '88 Lexington Blvd', city: 'Metro City', state: 'NY', zipCode: '10005' },
        emergencyContact: { name: 'Carlos Garcia', relationship: 'Brother', phone: '+1 (555) 345-0000' },
        allergies: [],
        chronicConditions: [{ condition: 'Type 2 Diabetes Mellitus', diagnosedYear: '2022', status: 'Under Control' }],
      },
      {
        email: 'david.smith@email.com',
        firstName: 'David',
        lastName: 'Smith',
        uhid: 'HMS-P-2026-0003',
        dob: new Date(1978, 1, 15),
        gender: 'Male',
        bloodGroup: 'B+',
        phone: '+1 (555) 456-7890',
        address: { street: '512 Pinecrest Way', city: 'Metro City', state: 'NY', zipCode: '10009' },
        emergencyContact: { name: 'Lisa Smith', relationship: 'Spouse', phone: '+1 (555) 456-1111' },
        allergies: [{ substance: 'Sulfa Drugs', severity: 'Moderate', reaction: 'Cutaneous Rash' }],
        chronicConditions: [{ condition: 'Coronary Artery Disease', diagnosedYear: '2021', status: 'Active Monitoring' }],
      },
    ];

    const patients = [];
    for (const p of patientConfigs) {
      const u = await User.create({
        name: `${p.firstName} ${p.lastName}`,
        email: p.email,
        password: patientPassword,
        role: 'patient',
        phone: p.phone,
      });

      const pat = await Patient.create({
        uhid: p.uhid,
        user: u._id,
        firstName: p.firstName,
        lastName: p.lastName,
        dateOfBirth: p.dob,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        phone: p.phone,
        email: p.email,
        address: p.address,
        emergencyContact: p.emergencyContact,
        allergies: p.allergies,
        chronicConditions: p.chronicConditions,
      });

      u.profileRef = pat._id;
      u.roleRefModel = 'Patient';
      await u.save();
      patients.push(pat);
    }

    // Staff Accounts
    const staffConfigs = [
      { email: 'nurse.clara@hospital.com', firstName: 'Clara', lastName: 'Oswald', roleType: 'nurse', deptCode: 'EMER', shift: 'Morning' },
      { email: 'pharmacist.alex@hospital.com', firstName: 'Alex', lastName: 'Mercer', roleType: 'pharmacist', deptCode: 'GENM', shift: 'Morning' },
      { email: 'lab.robert@hospital.com', firstName: 'Robert', lastName: 'Langdon', roleType: 'lab_technician', deptCode: 'GENM', shift: 'Morning' },
    ];

    for (const s of staffConfigs) {
      const u = await User.create({
        name: `${s.firstName} ${s.lastName}`,
        email: s.email,
        password: staffPassword,
        role: 'staff',
        phone: '+1 (555) 888-000' + s.firstName.length,
        isApproved: true,
        approvalStatus: 'Approved',
        isActive: true,
      });

      const stf = await Staff.create({
        staffId: `HMS-STF-10${s.firstName.length}`,
        user: u._id,
        firstName: s.firstName,
        lastName: s.lastName,
        roleType: s.roleType,
        department: deptMap[s.deptCode],
        phone: u.phone,
        shift: s.shift,
        status: 'Active',
      });

      u.profileRef = stf._id;
      u.roleRefModel = 'Staff';
      await u.save();
    }

    // 4. Wards and Beds
    const wardsData = [
      { wardCode: 'WD-ICU', name: 'Intensive Care Unit (ICU)', wardType: 'ICU', floor: '3rd Floor', totalBeds: 6, dailyRate: 2500, nurseStationPhone: 'Ext. 350' },
      { wardCode: 'WD-CCU', name: 'Cardiac Care Unit (CCU)', wardType: 'CCU', floor: '3rd Floor', totalBeds: 6, dailyRate: 2200, nurseStationPhone: 'Ext. 360' },
      { wardCode: 'WD-GEN', name: 'General Medical Ward', wardType: 'General Ward', floor: '2nd Floor', totalBeds: 10, dailyRate: 800, nurseStationPhone: 'Ext. 250' },
      { wardCode: 'WD-PED', name: 'Pediatric Care Ward', wardType: 'Pediatric', floor: '2nd Floor', totalBeds: 6, dailyRate: 950, nurseStationPhone: 'Ext. 270' },
      { wardCode: 'WD-PVT', name: 'Private Deluxe Suite', wardType: 'Private Deluxe', floor: '5th Floor', totalBeds: 4, dailyRate: 3200, nurseStationPhone: 'Ext. 510' },
    ];

    const wards = await Ward.insertMany(wardsData);
    const createdBeds = [];

    for (const ward of wards) {
      for (let i = 1; i <= ward.totalBeds; i++) {
        const bedNumber = `${ward.wardCode.replace('WD-', '')}-${String(i).padStart(2, '0')}`;
        const bed = await Bed.create({
          bedNumber,
          ward: ward._id,
          bedType: ward.wardType.includes('ICU') ? 'ICU Ventilator Bed' : ward.wardType.includes('Pediatric') ? 'Pediatric Crib' : 'Standard Electric',
          status: 'Available',
          dailyRate: ward.dailyRate,
        });
        createdBeds.push(bed);
      }
    }

    // 5. Medicines Catalog
    const medicinesData = [
      { itemCode: 'MED-1001', name: 'Amoxicillin & Clavulanate', genericName: 'Amoxicillin / Clavulanic Acid', category: 'Antibiotics', dosageForm: 'Tablet', strength: '625 mg', unitPrice: 18.5, stockQuantity: 240, reorderLevel: 50, batchNumber: 'AMX-2026-A1', expiryDate: new Date(2027, 8, 1), manufacturer: 'Pfizer Pharmaceuticals', rackLocation: 'Rack A-01' },
      { itemCode: 'MED-1002', name: 'Atorvastatin Calcium', genericName: 'Atorvastatin', category: 'Cardiovascular', dosageForm: 'Tablet', strength: '20 mg', unitPrice: 22.0, stockQuantity: 310, reorderLevel: 40, batchNumber: 'ATV-2026-C2', expiryDate: new Date(2027, 11, 15), manufacturer: 'Novartis Healthcare', rackLocation: 'Rack B-03' },
      { itemCode: 'MED-1003', name: 'Metformin Hydrochloride ER', genericName: 'Metformin', category: 'Endocrine & Diabetes', dosageForm: 'Tablet', strength: '500 mg', unitPrice: 12.0, stockQuantity: 450, reorderLevel: 60, batchNumber: 'MET-2026-D4', expiryDate: new Date(2028, 2, 20), manufacturer: 'Merck & Co.', rackLocation: 'Rack C-02' },
      { itemCode: 'MED-1004', name: 'Azithromycin Monohydrate', genericName: 'Azithromycin', category: 'Antibiotics', dosageForm: 'Tablet', strength: '500 mg', unitPrice: 25.0, stockQuantity: 18, reorderLevel: 30, batchNumber: 'AZT-2026-F1', expiryDate: new Date(2027, 4, 10), manufacturer: 'GSK Pharma', rackLocation: 'Rack A-04' }, // Low stock sample!
      { itemCode: 'MED-1005', name: 'Pantoprazole Gastro-Resistant', genericName: 'Pantoprazole', category: 'Gastrointestinal', dosageForm: 'Tablet', strength: '40 mg', unitPrice: 14.5, stockQuantity: 520, reorderLevel: 50, batchNumber: 'PAN-2026-G8', expiryDate: new Date(2027, 10, 5), manufacturer: 'AstraZeneca', rackLocation: 'Rack D-01' },
      { itemCode: 'MED-1006', name: 'Salbutamol Inhaler', genericName: 'Albuterol / Salbutamol', category: 'Respiratory', dosageForm: 'Inhaler', strength: '100 mcg/dose', unitPrice: 32.0, stockQuantity: 85, reorderLevel: 25, batchNumber: 'SAL-2026-H3', expiryDate: new Date(2027, 6, 30), manufacturer: 'Cipla Respiratory', rackLocation: 'Rack E-02' },
      { itemCode: 'MED-1007', name: 'Paracetamol IV Infusion', genericName: 'Acetaminophen / Paracetamol', category: 'Analgesics & Pain Relief', dosageForm: 'IV Fluid', strength: '1000 mg / 100ml', unitPrice: 15.0, stockQuantity: 110, reorderLevel: 30, batchNumber: 'PCM-2026-J1', expiryDate: new Date(2027, 9, 12), manufacturer: 'Fresenius Kabi', rackLocation: 'Rack F-01' },
      { itemCode: 'MED-1008', name: 'Heparin Sodium Injection', genericName: 'Heparin', category: 'Emergency & Critical Care', dosageForm: 'Injection', strength: '5000 IU/ml', unitPrice: 48.0, stockQuantity: 12, reorderLevel: 25, batchNumber: 'HEP-2026-K9', expiryDate: new Date(2026, 11, 28), manufacturer: 'Sanofi Aventis', rackLocation: 'Emergency Bay Cold' }, // Low stock & expiring soon!
    ];
    await Medicine.insertMany(medicinesData);

    // 6. Lab Test Catalog
    const labTestsData = [
      {
        testCode: 'LT-101',
        name: 'Complete Blood Count (CBC) with Differential',
        category: 'Hematology',
        price: 45.0,
        turnaroundHours: 4,
        sampleType: 'Blood',
        parameters: [
          { name: 'Hemoglobin (Hb)', normalRange: '13.5 - 17.5', unit: 'g/dL' },
          { name: 'Total Leukocyte Count (WBC)', normalRange: '4,500 - 11,000', unit: '/mcL' },
          { name: 'Platelet Count', normalRange: '150,000 - 450,000', unit: '/mcL' },
          { name: 'Hematocrit (PCV)', normalRange: '41 - 50', unit: '%' },
          { name: 'Neutrophils', normalRange: '40 - 70', unit: '%' },
        ],
      },
      {
        testCode: 'LT-102',
        name: 'Comprehensive Lipid Panel',
        category: 'Biochemistry',
        price: 65.0,
        turnaroundHours: 6,
        sampleType: 'Serum',
        parameters: [
          { name: 'Total Cholesterol', normalRange: '< 200', unit: 'mg/dL' },
          { name: 'High-Density Lipoprotein (HDL)', normalRange: '> 40', unit: 'mg/dL' },
          { name: 'Low-Density Lipoprotein (LDL)', normalRange: '< 100', unit: 'mg/dL' },
          { name: 'Triglycerides', normalRange: '< 150', unit: 'mg/dL' },
        ],
      },
      {
        testCode: 'LT-103',
        name: 'Cardiac High-Sensitivity Troponin I',
        category: 'Cardiology Diagnostics',
        price: 85.0,
        turnaroundHours: 1,
        sampleType: 'Plasma',
        parameters: [
          { name: 'hs-cTnI', normalRange: '< 14', unit: 'ng/L' },
        ],
      },
      {
        testCode: 'LT-104',
        name: 'Glycated Hemoglobin (HbA1c)',
        category: 'Biochemistry',
        price: 50.0,
        turnaroundHours: 6,
        sampleType: 'Blood',
        parameters: [
          { name: 'HbA1c Level', normalRange: '< 5.7', unit: '%' },
          { name: 'Estimated Avg Glucose (eAG)', normalRange: '< 117', unit: 'mg/dL' },
        ],
      },
      {
        testCode: 'LT-105',
        name: 'Renal Function & Electrolytes (KFT)',
        category: 'Biochemistry',
        price: 55.0,
        turnaroundHours: 4,
        sampleType: 'Serum',
        parameters: [
          { name: 'Blood Urea Nitrogen (BUN)', normalRange: '7 - 20', unit: 'mg/dL' },
          { name: 'Serum Creatinine', normalRange: '0.7 - 1.3', unit: 'mg/dL' },
          { name: 'Serum Sodium (Na+)', normalRange: '136 - 145', unit: 'mmol/L' },
          { name: 'Serum Potassium (K+)', normalRange: '3.5 - 5.1', unit: 'mmol/L' },
        ],
      },
    ];
    const createdLabTests = await LabTest.insertMany(labTestsData);

    // 7. Inpatient Admission (Patient David Smith into CCU-01)
    const ccuBed = createdBeds.find((b) => b.bedNumber === 'CCU-01');
    const ccuWard = wards.find((w) => w.wardCode === 'WD-CCU');

    const admission = await Admission.create({
      admissionNumber: 'HMS-ADM-10001',
      patient: patients[2]._id,
      doctor: doctors[0]._id, // Dr. Sarah Jenkins (Cardiology)
      ward: ccuWard._id,
      bed: ccuBed._id,
      admissionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Admitted 2 days ago
      admissionDiagnosis: 'Acute Coronary Syndrome - Non-ST Elevation Myocardial Infarction (NSTEMI)',
      admissionReason: 'Severe retrosternal chest pain radiating to left jaw and diaphoresis on exertion.',
      status: 'Admitted',
      vitalsLog: [
        {
          recordedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
          bpSystolic: 128,
          bpDiastolic: 82,
          pulse: 74,
          spo2: 98,
          temperature: 98.4,
          notes: 'Hemodynamically stable post-heparin protocol.',
          recordedBy: adminUser._id,
        },
      ],
    });

    ccuBed.status = 'Occupied';
    ccuBed.currentAdmission = admission._id;
    await ccuBed.save();
    patients[2].status = 'Inpatient';
    await patients[2].save();

    // 8. Appointments
    const today = new Date();
    today.setHours(9, 0, 0, 0);

    const appointmentsData = [
      {
        appointmentNumber: 'HMS-APT-1001',
        patient: patients[0]._id, // John Doe
        doctor: doctors[0]._id,   // Dr. Sarah Jenkins
        department: deptMap['CARD'],
        appointmentDate: today,
        timeSlot: '09:20 - 09:40',
        status: 'Completed',
        queueNumber: 1,
        reason: 'Quarterly cardiovascular follow-up & blood pressure evaluation',
        symptomsSummary: 'Occasional mild palpitations after exertion',
      },
      {
        appointmentNumber: 'HMS-APT-1002',
        patient: patients[1]._id, // Maria Garcia
        doctor: doctors[1]._id,   // Dr. James Wilson (Neurology)
        department: deptMap['NEUR'],
        appointmentDate: today,
        timeSlot: '10:00 - 10:20',
        status: 'Confirmed',
        queueNumber: 2,
        reason: 'Recurrent unilateral throbbing headache with photophobia',
        symptomsSummary: 'Episodes lasting 6-8 hours, preceded by visual aura',
      },
      {
        appointmentNumber: 'HMS-APT-1003',
        patient: patients[0]._id, // John Doe
        doctor: doctors[2]._id,   // Dr. Emily Rodriguez (Orthopedics)
        department: deptMap['ORTH'],
        appointmentDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
        timeSlot: '11:00 - 11:20',
        status: 'Confirmed',
        queueNumber: 1,
        reason: 'Right knee stiffness and crepitus during stair climbing',
        symptomsSummary: 'Discomfort worsening in cold mornings',
      },
    ];
    const createdAppointments = await Appointment.insertMany(appointmentsData);

    // 9. Clinical Consultation & EMR (For John Doe's completed appointment)
    const medicalRecord = await MedicalRecord.create({
      recordNumber: 'HMS-EMR-10001',
      patient: patients[0]._id,
      doctor: doctors[0]._id,
      appointment: createdAppointments[0]._id,
      visitDate: today,
      vitals: {
        bpSystolic: 132,
        bpDiastolic: 84,
        heartRate: 76,
        temperature: 98.6,
        spo2: 99,
        respiratoryRate: 16,
        weightKg: 78,
        heightCm: 178,
        bmi: 24.6,
      },
      chiefComplaints: 'Occasional episodes of mild flutter palpitations; requesting cardiovascular review.',
      clinicalObservations: 'S1/S2 heard normally, no murmurs, chest clear bilaterally, extremities warm, pulses bounding and symmetrical.',
      diagnoses: [
        { code: 'I10', description: 'Essential (primary) hypertension - stage 1', type: 'Primary' },
        { code: 'R00.2', description: 'Benign premature ventricular contractions (Palpitations)', type: 'Secondary' },
      ],
      treatmentPlan: 'Maintain low-sodium dietary regimen, continue Atorvastatin 20mg daily at bedtime, ordered 24-hr lipid panel and 12-lead resting ECG.',
      notes: 'Patient advised to log daily morning blood pressure readings.',
    });

    // 10. Prescription (For John Doe)
    const prescription = await Prescription.create({
      prescriptionNumber: 'HMS-RX-10001',
      patient: patients[0]._id,
      doctor: doctors[0]._id,
      appointment: createdAppointments[0]._id,
      medicalRecord: medicalRecord._id,
      date: today,
      diagnoses: ['Essential Hypertension', 'Hyperlipidemia'],
      medicines: [
        {
          name: 'Atorvastatin Calcium',
          genericName: 'Atorvastatin',
          dosage: '20 mg',
          frequency: '0-0-1 (At Bedtime)',
          duration: '30 days',
          route: 'Oral',
          instructions: 'Take with warm water after dinner',
          quantity: 30,
          dispensed: true,
          dispensedQuantity: 30,
        },
        {
          name: 'Pantoprazole Gastro-Resistant',
          genericName: 'Pantoprazole',
          dosage: '40 mg',
          frequency: '1-0-0 (Empty Stomach)',
          duration: '14 days',
          route: 'Oral',
          instructions: 'Take 30 minutes before morning breakfast',
          quantity: 14,
          dispensed: true,
          dispensedQuantity: 14,
        },
      ],
      generalInstructions: 'Follow DASH dietary pattern; reduce salt intake to < 2.3g daily. 30 min brisk walk 5x/week.',
      followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      status: 'Dispensed',
      auditTrail: [
        {
          action: 'CREATED',
          performedBy: doctors[0].user,
          timestamp: today,
          notes: 'Standard outpatient cardiology prescription issued.',
        },
      ],
    });

    // 11. Laboratory Order & Completed Results (Lipid Panel for John Doe)
    const labReport = await LabReport.create({
      reportNumber: 'HMS-LAB-10001',
      patient: patients[0]._id,
      doctor: doctors[0]._id,
      test: createdLabTests[1]._id, // Lipid Panel
      appointment: createdAppointments[0]._id,
      priority: 'Routine',
      status: 'Completed',
      requestedDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
      sampleCollectedAt: new Date(Date.now() - 20 * 60 * 60 * 1000),
      completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000),
      results: [
        { parameter: 'Total Cholesterol', observedValue: '215', normalRange: '< 200', unit: 'mg/dL', flag: 'abnormal' },
        { parameter: 'High-Density Lipoprotein (HDL)', observedValue: '48', normalRange: '> 40', unit: 'mg/dL', flag: 'normal' },
        { parameter: 'Low-Density Lipoprotein (LDL)', observedValue: '138', normalRange: '< 100', unit: 'mg/dL', flag: 'abnormal' },
        { parameter: 'Triglycerides', observedValue: '145', normalRange: '< 150', unit: 'mg/dL', flag: 'normal' },
      ],
      technicianNotes: 'Serum sample was non-hemolyzed. Fasting state confirmed (12 hours).',
      performedBy: adminUser._id,
      isVerifiedByDoctor: true,
    });

    // 12. Billing & Invoices
    const bill = await Bill.create({
      billNumber: 'HMS-INV-10001',
      patient: patients[0]._id,
      appointment: createdAppointments[0]._id,
      billDate: today,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      items: [
        { category: 'Consultation', description: 'Senior Specialist Consultation - Dr. Sarah Jenkins', quantity: 1, unitPrice: 650, amount: 650 },
        { category: 'Laboratory', description: 'Comprehensive Lipid Panel (LT-102)', quantity: 1, unitPrice: 65, amount: 65 },
        { category: 'Pharmacy', description: 'Atorvastatin 20mg (30 tabs) + Pantoprazole 40mg (14 tabs)', quantity: 1, unitPrice: 36.5, amount: 36.5 },
      ],
      subTotal: 751.5,
      discountAmount: 0,
      taxAmount: 37.58,
      totalAmount: 789.08,
      paidAmount: 789.08,
      balanceAmount: 0,
      paymentStatus: 'Paid',
      notes: 'Paid in full via contactless debit card transaction.',
    });

    await Payment.create({
      paymentNumber: 'HMS-PAY-10001',
      bill: bill._id,
      patient: patients[0]._id,
      amount: 789.08,
      paymentMethod: 'Credit/Debit Card',
      transactionRef: 'POS-CHASE-9920141',
      paymentDate: today,
      receiptNotes: 'Receipt issued to patient email.',
      receivedBy: adminUser._id,
    });

    // Second Bill with Outstanding Balance for Patient Portal Testing
    await Bill.create({
      billNumber: 'HMS-INV-10002',
      patient: patients[0]._id,
      admission: admission._id,
      billDate: today,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      items: [
        { category: 'Bed Charges', description: 'CCU Bed Care Daily Charge (Bed CCU-01)', quantity: 1, unitPrice: 350, amount: 350 },
        { category: 'Surgery / Procedure', description: 'Continuous Cardiac Rhythm Monitoring', quantity: 1, unitPrice: 120, amount: 120 },
      ],
      subTotal: 470,
      discountAmount: 0,
      taxAmount: 23.5,
      totalAmount: 493.5,
      paidAmount: 100,
      balanceAmount: 393.5,
      paymentStatus: 'Partially Paid',
      notes: 'Initial admission deposit received. Outstanding balance due upon discharge.',
    });

    // 13. System Notifications
    await Notification.create([
      {
        recipient: patients[0].user,
        title: 'Prescription Available',
        message: 'Your prescription #HMS-RX-10001 has been generated and medications have been dispensed.',
        type: 'prescription',
        linkUrl: '/patient/prescriptions',
        isRead: false,
      },
      {
        recipient: patients[0].user,
        title: 'Laboratory Report Finalized',
        message: 'Your Comprehensive Lipid Panel results (Report #HMS-LAB-10001) are now ready for review.',
        type: 'lab',
        linkUrl: '/patient/lab-reports',
        isRead: true,
      },
      {
        recipient: doctors[0].user,
        title: 'Patient Admitted to CCU',
        message: 'David Smith (UHID: HMS-P-2026-0003) admitted to CCU-01 under your clinical supervision.',
        type: 'bed',
        linkUrl: '/doctor/patients',
        isRead: false,
      },
    ]);

    // 14. Audit Logs
    await AuditLog.create([
      {
        user: adminUser._id,
        userEmail: adminUser.email,
        userRole: 'admin',
        action: 'SYSTEM_INITIALIZED',
        entity: 'HospitalSetting',
        entityId: 'SYSTEM',
        details: { message: 'Hospital database initialized with production-grade clinical configuration.' },
        ipAddress: '127.0.0.1',
      },
      {
        user: doctors[0].user,
        userEmail: doctors[0].email,
        userRole: 'doctor',
        action: 'CONSULTATION_COMPLETED',
        entity: 'MedicalRecord',
        entityId: medicalRecord._id,
        details: { recordNumber: medicalRecord.recordNumber, patientUhid: patients[0].uhid },
        ipAddress: '127.0.0.1',
      },
    ]);

    console.log('[Seeder] Master database successfully seeded with:');
    console.log(' - 1 Hospital configuration');
    console.log(' - 6 Medical Departments');
    console.log(' - 1 Administrator, 4 Doctors, 3 Patients, 3 Staff users');
    console.log(' - 5 Wards with 32 Beds');
    console.log(' - 8 Pharmacy Medicines (including stock and alerts)');
    console.log(' - 5 Laboratory Diagnostic Tests');
    console.log(' - Real Inpatient Admission in CCU');
    console.log(' - Real Appointments, EMR, e-Prescription, Lab Report, and Invoices');
  } catch (err) {
    console.error('[Seeder Error]', err.message, err.stack);
  }
};

module.exports = seedDatabaseIfEmpty;
