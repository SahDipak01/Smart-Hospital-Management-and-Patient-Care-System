import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  Stethoscope,
  Users,
  Bed,
  Pill,
  CreditCard,
  HeartPulse,
  Shield,
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Building,
  FlaskConical,
  UserCheck,
  Sparkles,
  ChevronRight,
  Zap,
  TrendingUp,
} from 'lucide-react';
import { HospitalLogo } from '../../components/common/HospitalLogo';

const STAFF_ROLES = ['staff', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'billing_staff'];

const DEMO_ROLES = [
  {
    role: 'admin',
    title: 'Hospital Administrator',
    badge: 'Full Executive Scope',
    email: 'admin@hospital.com',
    icon: ShieldCheck,
    description: 'System control center, user registration approvals, financial analytics, audit ledgers & bed capacity.',
    route: '/admin/dashboard',
  },
  {
    role: 'doctor',
    title: 'Lead Doctor / Cardiologist',
    badge: 'OPD & Clinical EMR',
    email: 'dr.sarah@hospital.com',
    icon: Stethoscope,
    description: 'OPD appointments, electronic medical records timeline, digital prescriptions, lab orders & diagnosis.',
    route: '/doctor/dashboard',
  },
  {
    role: 'patient',
    title: 'Registered Patient',
    badge: 'Patient Health Portal',
    email: 'john.doe@email.com',
    icon: Users,
    description: 'Personal health records (UHID: HMS-PAT-10001), appointment booking, diagnostic lab reports & invoices.',
    route: '/patient/dashboard',
  },
  {
    role: 'nurse',
    title: 'Head Nurse / Inpatient',
    badge: 'Ward & Bed Census',
    email: 'nurse.sarah@hospital.com',
    icon: Bed,
    description: 'Real-time ward bed matrix, patient admissions, discharges, bed transfers, and vital signs monitoring.',
    route: '/staff/dashboard',
  },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, startDemo, logout } = useAuth();
  const [loggingInRole, setLoggingInRole] = useState(null);

  const handle1ClickDemo = async (roleObj) => {
    setLoggingInRole(roleObj.role);
    try {
      const loggedUser = await startDemo(roleObj.role);
      if (loggedUser.role === 'admin') navigate('/admin/dashboard');
      else if (loggedUser.role === 'doctor') navigate('/doctor/dashboard');
      else if (loggedUser.role === 'patient') navigate('/patient/dashboard');
      else navigate('/staff/dashboard');
    } catch (err) {
      console.error('Demo login error:', err);
      navigate('/login');
    } finally {
      setLoggingInRole(null);
    }
  };

  const scrollToDemo = () => {
    const demoSection = document.getElementById('demo-suite');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-medical-500 selection:text-white">
      {/* Top Navigation Bar matching reference layout and main project colors */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Logo brand */}
          <Link to="/" className="hover:opacity-95 transition-opacity">
            <HospitalLogo iconSize="w-10 h-10 sm:w-11 sm:h-11" />
          </Link>

          {/* Slogan with Heartbeat Graphic */}
          <div className="hidden lg:flex items-center gap-2 text-right">
            <span className="text-xs sm:text-sm font-semibold italic text-[#0066cc]">
              Better Care. Healthier Tomorrow.
            </span>
            <svg className="w-10 h-5 text-[#0066cc]" viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M0 12h18l3-6 5 14 4-11 3 5 4-2h23" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          {/* Right Navigation Controls */}
          <div className="flex items-center gap-4 sm:gap-6">
            <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-slate-600">
              <button onClick={scrollToDemo} className="hover:text-medical-600 transition-colors">
                Live Demo
              </button>
              <Link to="/register" className="hover:text-medical-600 transition-colors">
                Staff Registration
              </Link>
            </nav>

            <div className="flex items-center gap-3">
              {isAuthenticated ? (
                <>
                  <button
                    onClick={() => {
                      if (user?.role === 'admin') navigate('/admin/dashboard');
                      else if (user?.role === 'doctor') navigate('/doctor/dashboard');
                      else if (user?.role === 'patient') navigate('/patient/dashboard');
                      else navigate('/staff/dashboard');
                    }}
                    className="text-xs sm:text-sm font-bold text-slate-800 hover:text-medical-600 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <span>My Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-medical-600" />
                  </button>
                  <button
                    onClick={logout}
                    className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition-colors hidden sm:block"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="text-sm font-semibold text-slate-700 hover:text-medical-600 px-3 py-2 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full text-sm font-bold text-white bg-medical-600 hover:bg-medical-700 shadow-md shadow-medical-600/25 transition-all transform active:scale-95"
                  >
                    <span>Patient / Staff Register</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section styled with main project blue aesthetic */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden">
        {/* Ambient Medical Blue subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[360px] bg-gradient-to-r from-sky-100/50 via-medical-50/40 to-slate-100/40 blur-3xl -z-10 pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 sm:space-y-8">
          {/* Top Pill Standards Badge matching user image: "Calibrated with..." */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-medical-50 border border-medical-200 text-medical-800 text-xs sm:text-sm font-medium shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-medical-600 flex-shrink-0" />
            <span>Calibrated with NABH, JCI & HL7 Healthcare Standards</span>
          </div>

          {/* Hero Headline in Main Project Typography & Color */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#0f2851] tracking-tight leading-[1.12]">
            Advanced Healthcare <br className="hidden sm:inline" />
            <span className="text-[#1565c0]">
              Management for a Healthier Society
            </span>
          </h1>

          {/* Subtitle description */}
          <p className="max-w-3xl mx-auto text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed font-normal">
            Comprehensive hospital management solution for patients, doctors and healthcare staff.
          </p>

          {/* 4 Feature Badges (Horizontal Row matching design) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col items-center text-center shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight">Secure & Reliable</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col items-center text-center shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                <Activity className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight">Smart Management</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col items-center text-center shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                <TrendingUp className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight">Better Care</span>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col items-center text-center shadow-xs">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                <Users className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-xs font-bold text-slate-800 leading-tight">Healthier Community</span>
            </div>
          </div>

          {/* Two Hero Action CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 pt-3">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-base font-bold text-white bg-medical-600 hover:bg-medical-700 shadow-lg shadow-medical-600/30 hover:shadow-xl transition-all transform active:scale-95"
            >
              <span>Register Account</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-base font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300/80 shadow-sm hover:shadow transition-all"
            >
              <Zap className="w-4 h-4 text-medical-500 fill-medical-500" />
              <span>Explore Portal (Demo Sign-in)</span>
            </Link>
          </div>

          {/* Verification Highlights Strip */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-medical-600" />
              <span>Zero-Config Instant Demo</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-medical-600" />
              <span>8 Role-Specific Dashboards</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-medical-600" />
              <span>127+ Interactive Demo Records</span>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Demo Section: "given the option for the demo and demo start after this pager in it" */}
      <section id="demo-suite" className="py-16 bg-slate-50 border-y border-slate-200/80 scroll-mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 space-y-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-medical-100 text-medical-800 text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Interactive Clinical Demo Suite</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              Experience Any Hospital Role in 1-Click
            </h2>
            <p className="text-sm sm:text-base text-slate-600">
              Select any role below to launch the live system immediately without entering passwords. All clinical data,
              bed telemetry, lab reports, and invoices are pre-populated and fully operational.
            </p>
          </div>

          {/* 8 Demo Role Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {DEMO_ROLES.map((item) => {
              const Icon = item.icon;
              const isCurrentLoggingIn = loggingInRole === item.role;

              return (
                <div
                  key={item.role}
                  className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="w-11 h-11 rounded-xl bg-medical-50 text-medical-600 flex items-center justify-center group-hover:bg-medical-600 group-hover:text-white transition-colors">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200/60">
                        {item.badge}
                      </span>
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-medical-700 transition-colors">
                        {item.title}
                      </h3>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{item.email}</p>
                    </div>

                    <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                  </div>

                  <div className="pt-5 mt-4 border-t border-slate-100">
                    <button
                      onClick={() => handle1ClickDemo(item)}
                      disabled={isCurrentLoggingIn}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-medical-700 bg-medical-50 hover:bg-medical-600 hover:text-white border border-medical-200 hover:border-medical-600 shadow-sm transition-all disabled:opacity-50"
                    >
                      {isCurrentLoggingIn ? (
                        <span>Launching Live Portal...</span>
                      ) : (
                        <>
                          <span>Launch {item.title.split(' ')[0]} Demo</span>
                          <ChevronRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Modules Breakdown Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Enterprise Healthcare Operations & Workflow
            </h2>
            <p className="text-sm text-slate-500">
              End-to-end integration across clinical encounters, ward telemetry, drug dispensing, and fiscal clearance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-medical-100 text-medical-700 flex items-center justify-center">
                <Bed className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Real-Time Ward Bed Matrix</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Live bed sensors tracking ICU, CCU, and General Wards with double-allocation prevention, inpatient stay
                counters, and automatic discharge summaries.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-medical-100 text-medical-700 flex items-center justify-center">
                <Pill className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Pharmacy Inventory & Dispensing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Automated stock deduction linked to verified doctor prescriptions, low-stock threshold triggers, and
                drug batch/expiry date controls.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-medical-100 text-medical-700 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Intelligent Symptom Triage</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Algorithmic severity grading detecting critical red-flag emergencies (acute coronary syndrome, trauma)
                with immediate routing to emergency bays.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-medical-100 text-medical-700 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Computerized Billing & Invoices</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Multi-service invoicing combining room charges, lab panels, pharmacy medications, and consultations
                with itemized tax receipts and balance clearance.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-medical-100 text-medical-700 flex items-center justify-center">
                <UserCheck className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Hospital Staff Duty Rosters</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Administration of nursing officers, pharmacists, laboratory technicians, and shift rotations (Morning,
                Evening, Night) with department mapping.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-slate-50/50 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-medical-100 text-medical-700 flex items-center justify-center">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Registration Approvals Hub</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Mandatory administrator credential verification for medical licenses, specialization dossiers, and
                controlled activation of staff accounts.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Hospital Operational Metrics Banner */}
      <section className="py-12 bg-slate-900 text-white border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-medical-400">127+</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 uppercase font-semibold">Registered Patients</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-sky-400">18 / 48</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 uppercase font-semibold">Doctors & Staff</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-amber-400">88 Beds</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 uppercase font-semibold">Live Ward Census</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-emerald-400">99.8%</p>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 uppercase font-semibold">Operational Uptime</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-100 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-medical-600 text-white flex items-center justify-center font-bold text-[10px]">
              +
            </div>
            <span className="font-bold text-slate-800">SmartCare Hospital Management System</span>
            <span>• Certified HL7 & NABH Clinical Standards</span>
          </div>

          <div className="flex items-center gap-6">
            <button onClick={scrollToDemo} className="hover:text-medical-600 transition-colors">
              Explore Demo
            </button>
            <Link to="/login" className="hover:text-medical-600 transition-colors">
              Staff Login
            </Link>
            <Link to="/register" className="hover:text-medical-600 transition-colors">
              Register Account
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
