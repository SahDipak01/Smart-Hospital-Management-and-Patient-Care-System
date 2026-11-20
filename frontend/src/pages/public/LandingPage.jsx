import React from 'react';
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
  TrendingUp,
  LogIn,
} from 'lucide-react';
import { HospitalLogo } from '../../components/common/HospitalLogo';

const LandingPage = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Navigation Bar */}
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
              <Link to="/register" className="hover:text-blue-600 transition-colors">
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
                    className="text-xs sm:text-sm font-bold text-slate-800 hover:text-blue-600 flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <span>My Dashboard</span>
                    <ArrowRight className="w-4 h-4 text-blue-600" />
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
                    className="text-sm font-semibold text-slate-700 hover:text-blue-600 px-3 py-2 transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="inline-flex items-center gap-1.5 px-4 sm:px-5 py-2.5 rounded-full text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/25 transition-all transform active:scale-95"
                  >
                    <span>Register Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 overflow-hidden">
        {/* Ambient Medical Blue subtle glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[360px] bg-gradient-to-r from-sky-100/50 via-blue-50/40 to-slate-100/40 blur-3xl -z-10 pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-6 sm:space-y-8">
          {/* Top Pill Standards Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-xs sm:text-sm font-medium shadow-2xs">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>Calibrated with NABH, JCI & HL7 Healthcare Standards</span>
          </div>

          {/* Hero Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-[#0f2851] tracking-tight leading-[1.12]">
            Advanced Healthcare <br className="hidden sm:inline" />
            <span className="text-[#1565c0]">
              Management for a Healthier Society
            </span>
          </h1>

          {/* Subtitle description */}
          <p className="max-w-3xl mx-auto text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed font-normal">
            Comprehensive hospital management solution empowering clinicians, nursing teams, diagnostic laboratories,
            pharmacies, billing specialists, and patients with integrated EHRs, real-time bed management, computerized
            invoicing, and automated symptom triage.
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

          {/* Two Hero Action CTA Buttons (Clean Normal Flow) */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 sm:gap-4 pt-4">
            <Link
              to="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-base font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-600/30 hover:shadow-xl transition-all transform active:scale-95"
            >
              <span>Register Account</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </Link>

            <Link
              to="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-full text-base font-bold text-slate-800 bg-white hover:bg-slate-50 border border-slate-300/80 shadow-sm hover:shadow transition-all"
            >
              <LogIn className="w-4 h-4 text-blue-600" />
              <span>Sign In to Portal</span>
            </Link>
          </div>

          {/* Verification Highlights Strip */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>NABH & JCI Accredited Standards</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>Role-Based Access Security</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-blue-600" />
              <span>HIPAA Compliant Electronic Records</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Modules Breakdown Section */}
      <section className="py-20 bg-slate-50/70 border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16 space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f2851] tracking-tight">
              Enterprise Healthcare Operations & Workflow
            </h2>
            <p className="text-sm text-slate-600">
              End-to-end integration across clinical encounters, ward telemetry, drug dispensing, and fiscal clearance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Stethoscope className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">OPD Electronic Medical Records</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Comprehensive patient medical history, digital SOAP encounter documentation, e-prescriptions, ICD-10
                diagnostic tagging, and real-time consultation queue.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Pill className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Digital Pharmacy & Inventory</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Live pharmaceutical inventory, batch expiry tracking, barcode lookup, automated dispensing against doctor
                prescriptions, and stock alerts.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <Bed className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Ward & Bed Management Matrix</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Visual matrix across ICU, CCU, and General Wards. Direct inpatient admissions, discharges, bed
                transfers, and daily nursing vitals telemetry.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Multi-Service Automated Billing</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Consolidated invoicing across OPD visits, laboratory tests, medicines, and room charges with cash/card/UPI
                payments and instant printable receipts.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">AI-Powered Symptom Triage</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Emergency department triage prioritizing patient acuity (Emergency, Urgent, Routine), red-flag detection,
                and automatic specialist department assignment.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-6 rounded-2xl border border-slate-200/80 bg-white space-y-3 shadow-xs hover:shadow-md transition-shadow">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
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
              <p className="text-3xl sm:text-4xl font-extrabold text-blue-400">127+</p>
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
            <div className="w-6 h-6 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-[10px]">
              +
            </div>
            <span className="font-bold text-slate-800">Smart Hospital Management & Patient Care System</span>
            <span>• Certified HL7 & NABH Clinical Standards</span>
          </div>

          <div className="flex items-center gap-6">
            <Link to="/login" className="hover:text-blue-600 transition-colors font-semibold">
              Sign In
            </Link>
            <Link to="/register" className="hover:text-blue-600 transition-colors">
              Staff Registration
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
