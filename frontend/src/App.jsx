import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import DashboardLayout from './layouts/DashboardLayout';
import LoadingSpinner from './components/common/LoadingSpinner';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';
import ResetPassword from './pages/auth/ResetPassword';

// Dashboards
import AdminDashboard from './pages/dashboards/AdminDashboard';
import DoctorDashboard from './pages/dashboards/DoctorDashboard';
import PatientDashboard from './pages/dashboards/PatientDashboard';
import StaffDashboard from './pages/dashboards/StaffDashboard';

// Modules
import PatientsPage from './pages/modules/PatientsPage';
import DoctorsPage from './pages/modules/DoctorsPage';
import AppointmentsPage from './pages/modules/AppointmentsPage';
import EMRConsultationPage from './pages/modules/EMRConsultationPage';
import PrescriptionsPage from './pages/modules/PrescriptionsPage';
import LaboratoryPage from './pages/modules/LaboratoryPage';
import PharmacyPage from './pages/modules/PharmacyPage';
import WardBedPage from './pages/modules/WardBedPage';
import BillingPage from './pages/modules/BillingPage';
import SymptomTriagePage from './pages/modules/SymptomTriagePage';
import StaffManagementPage from './pages/modules/StaffManagementPage';
import AuditLogsPage from './pages/modules/AuditLogsPage';
import ProfilePage from './pages/modules/ProfilePage';
import DepartmentsPage from './pages/modules/DepartmentsPage';
import PatientMedicalHistoryPage from './pages/modules/PatientMedicalHistoryPage';
import ApprovalsPage from './pages/modules/ApprovalsPage';

const STAFF_ROLES = ['staff', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'billing_staff'];

// Protected Route Guard with RBAC
const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <LoadingSpinner text="Checking session authorization..." />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check direct role match or staff group match
  const isDirectMatch = allowedRoles && allowedRoles.includes(role);
  const isStaffMatch = allowedRoles && allowedRoles.includes('staff') && STAFF_ROLES.includes(role);

  if (allowedRoles && !isDirectMatch && !isStaffMatch) {
    // Redirect to user's own home dashboard
    if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
    if (role === 'patient') return <Navigate to="/patient/dashboard" replace />;
    if (STAFF_ROLES.includes(role)) return <Navigate to="/staff/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

// Root index redirector
const RootRedirect = () => {
  const { isAuthenticated, role, loading } = useAuth();

  if (loading) return null;

  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'doctor') return <Navigate to="/doctor/dashboard" replace />;
  if (role === 'patient') return <Navigate to="/patient/dashboard" replace />;
  if (STAFF_ROLES.includes(role)) return <Navigate to="/staff/dashboard" replace />;
  return <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL || '/'}>
        <Routes>
          {/* Public Authentication Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />

          {/* Root Redirect */}
          <Route path="/" element={<RootRedirect />} />

          {/* Administrator Scope */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<AdminDashboard />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="doctors" element={<DoctorsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="emr" element={<EMRConsultationPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
            <Route path="lab" element={<LaboratoryPage />} />
            <Route path="pharmacy" element={<PharmacyPage />} />
            <Route path="wards" element={<WardBedPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="triage" element={<SymptomTriagePage />} />
            <Route path="staff" element={<StaffManagementPage />} />
            <Route path="approvals" element={<ApprovalsPage />} />
            <Route path="audit" element={<AuditLogsPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Doctor Scope */}
          <Route
            path="/doctor"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<DoctorDashboard />} />
            <Route path="departments" element={<DepartmentsPage />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="emr" element={<EMRConsultationPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
            <Route path="lab" element={<LaboratoryPage />} />
            <Route path="wards" element={<WardBedPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Patient Scope */}
          <Route
            path="/patient"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<PatientDashboard />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="emr" element={<PatientMedicalHistoryPage />} />
            <Route path="prescriptions" element={<PrescriptionsPage />} />
            <Route path="lab" element={<LaboratoryPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="triage" element={<SymptomTriagePage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Staff Scope (Nurses, Receptionists, Pharmacists, Lab Techs, Billing Staff) */}
          <Route
            path="/staff"
            element={
              <ProtectedRoute allowedRoles={['staff', ...STAFF_ROLES]}>
                <DashboardLayout />
              </ProtectedRoute>
            }
          >
            <Route path="dashboard" element={<StaffDashboard />} />
            <Route path="patients" element={<PatientsPage />} />
            <Route path="appointments" element={<AppointmentsPage />} />
            <Route path="pharmacy" element={<PharmacyPage />} />
            <Route path="lab" element={<LaboratoryPage />} />
            <Route path="wards" element={<WardBedPage />} />
            <Route path="billing" element={<BillingPage />} />
            <Route path="profile" element={<ProfilePage />} />
          </Route>

          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
