import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Calendar,
  FileText,
  Pill,
  FlaskConical,
  Bed,
  CreditCard,
  Stethoscope,
  ShieldCheck,
  HeartPulse,
  Sparkles,
  ClipboardList,
  User,
  Building,
} from 'lucide-react';

const Sidebar = ({ isOpen, onClose }) => {
  const { role } = useAuth();

  const getNavLinks = () => {
    switch (role) {
      case 'admin':
        return [
          { to: '/admin/dashboard', label: 'Executive Dashboard', icon: LayoutDashboard },
          { to: '/admin/departments', label: 'Clinical Departments', icon: Building },
          { to: '/admin/patients', label: 'Patient Management', icon: Users },
          { to: '/admin/doctors', label: 'Doctor Management', icon: Stethoscope },
          { to: '/admin/appointments', label: 'Appointments Hub', icon: Calendar },
          { to: '/admin/emr', label: 'Electronic Medical Records', icon: FileText },
          { to: '/admin/prescriptions', label: 'Prescriptions', icon: ClipboardList },
          { to: '/admin/lab', label: 'Laboratory Services', icon: FlaskConical },
          { to: '/admin/pharmacy', label: 'Pharmacy Inventory', icon: Pill },
          { to: '/admin/wards', label: 'Wards & Bed Matrix', icon: Bed },
          { to: '/admin/billing', label: 'Billing & Payments', icon: CreditCard },
          { to: '/admin/triage', label: 'Symptom Triage', icon: Sparkles },
          { to: '/admin/staff', label: 'Hospital Staff', icon: UserCheck },
          { to: '/admin/approvals', label: 'Registration Approvals', icon: ShieldCheck },
          { to: '/admin/audit', label: 'Audit Trail & Logs', icon: FileText },
          { to: '/admin/profile', label: 'Profile & Security', icon: User },
        ];
      case 'doctor':
        return [
          { to: '/doctor/dashboard', label: 'Doctor Workbench', icon: LayoutDashboard },
          { to: '/doctor/departments', label: 'Clinical Departments', icon: Building },
          { to: '/doctor/patients', label: 'Assigned Patients', icon: Users },
          { to: '/doctor/appointments', label: 'OPD Schedule & Queue', icon: Calendar },
          { to: '/doctor/emr', label: 'Clinical Consultations', icon: FileText },
          { to: '/doctor/prescriptions', label: 'e-Prescriptions', icon: ClipboardList },
          { to: '/doctor/lab', label: 'Lab Test Orders', icon: FlaskConical },
          { to: '/doctor/wards', label: 'Inpatient Beds', icon: Bed },
          { to: '/doctor/profile', label: 'Profile & Security', icon: User },
        ];
      case 'patient':
        return [
          { to: '/patient/dashboard', label: 'Patient Portal', icon: LayoutDashboard },
          { to: '/patient/appointments', label: 'Book Appointment', icon: Calendar },
          { to: '/patient/emr', label: 'Medical History', icon: FileText },
          { to: '/patient/prescriptions', label: 'My Prescriptions', icon: Pill },
          { to: '/patient/lab', label: 'Laboratory Reports', icon: FlaskConical },
          { to: '/patient/billing', label: 'Bills & Invoices', icon: CreditCard },
          { to: '/patient/triage', label: 'Symptom Checker', icon: HeartPulse },
          { to: '/patient/profile', label: 'Profile & Security', icon: User },
        ];
      case 'staff':
      case 'nurse':
      case 'receptionist':
      case 'pharmacist':
      case 'lab_technician':
      case 'billing_staff':
        return [
          { to: '/staff/dashboard', label: 'Staff Workstation', icon: LayoutDashboard },
          { to: '/staff/patients', label: 'Patient Desk', icon: Users },
          { to: '/staff/appointments', label: 'Appointments Queue', icon: Calendar },
          { to: '/staff/pharmacy', label: 'Pharmacy Dispensing', icon: Pill },
          { to: '/staff/lab', label: 'Lab Test Processing', icon: FlaskConical },
          { to: '/staff/wards', label: 'Ward Bed Allocation', icon: Bed },
          { to: '/staff/billing', label: 'Billing & Cashier', icon: CreditCard },
          { to: '/staff/profile', label: 'Profile & Security', icon: User },
        ];
      default:
        return [];
    }
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar container */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-slate-300 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } flex flex-col justify-between`}
      >
        <div className="flex flex-col flex-1 overflow-y-auto">
          {/* Sidebar Header */}
          <div className="flex h-16 items-center px-6 border-b border-slate-800">
            <span className="text-xs font-bold uppercase tracking-wider text-medical-400">
              Healthcare Operations
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1 px-3 py-4">
            {navLinks.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => onClose && onClose()}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-medical-600 text-white shadow-lg shadow-medical-600/30'
                        : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-200'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  <span className="truncate">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-slate-800 text-[11px] text-slate-500 text-center">
          <p className="font-medium text-slate-400">Apex Memorial Hospital</p>
          <p className="text-[10px] text-slate-600 mt-0.5">MERN v2.6 Professional</p>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
