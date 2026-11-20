import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  LogIn,
  Play,
  ChevronRight,
  ShieldCheck,
  Activity,
  AlertCircle,
  X,
  Stethoscope,
  HeartPulse,
  UserCheck,
  CheckCircle2,
  TrendingUp,
  Building2,
  Users,
} from 'lucide-react';
import { HospitalLogo, HospitalHeartIcon } from '../../components/common/HospitalLogo';

// 4 Authorized Roles for Login & Live Demo
const ROLES = [
  {
    id: 'admin',
    name: 'Administrator',
    email: 'admin@hospital.com',
    dashboardRoute: '/admin/dashboard',
    badge: 'Executive Oversight',
    description: 'System control center, user registration approvals, financial analytics, audit logs & bed census.',
    // Custom SVG User with Shield
    icon: (isSelected) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6 transition-colors" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M17 11l2 2 4-4" stroke={isSelected ? '#1976d2' : '#0284c7'} />
        <path d="M19 19a5 5 0 0 0 3-4.5V11l-3-1-3 1v3.5a5 5 0 0 0 3 4.5z" stroke={isSelected ? '#1976d2' : '#0284c7'} />
      </svg>
    ),
  },
  {
    id: 'doctor',
    name: 'Doctor',
    email: 'dr.sarah@hospital.com',
    dashboardRoute: '/doctor/dashboard',
    badge: 'Clinical EMR & OPD',
    description: 'OPD appointments, electronic medical records timeline, digital prescriptions & lab orders.',
    // Stethoscope Icon
    icon: (isSelected) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6 transition-colors" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4.5 3v5a4.5 4.5 0 0 0 9 0V3" />
        <path d="M9 12.5v5.5a3 3 0 0 0 3 3h2" />
        <circle cx="18" cy="18" r="3" />
        <circle cx="4.5" cy="3" r="1.5" />
        <circle cx="13.5" cy="3" r="1.5" />
      </svg>
    ),
  },
  {
    id: 'patient',
    name: 'Patient',
    email: 'john.doe@email.com',
    dashboardRoute: '/patient/dashboard',
    badge: 'Patient Health Portal',
    description: 'Personal health card, appointment booking, diagnostic lab reports & invoices.',
    // User with Heart Icon
    icon: (isSelected) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6 transition-colors" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19.5 13.5c-.8-.8-2-.8-2.8 0l-.7.7-.7-.7c-.8-.8-2-.8-2.8 0-.8.8-.8 2 0 2.8l3.5 3.5 3.5-3.5c.8-.8.8-2 0-2.8z" fill={isSelected ? '#1976d2' : '#0284c7'} stroke="none" />
      </svg>
    ),
  },
  {
    id: 'nurse',
    name: 'Nurse',
    email: 'nurse.sarah@hospital.com',
    dashboardRoute: '/staff/dashboard',
    badge: 'Ward & Bed Census',
    description: 'Real-time ward bed matrix, patient admissions, discharges, bed transfers & vitals monitoring.',
    // Nurse with Cross Cap Icon
    icon: (isSelected) => (
      <svg viewBox="0 0 24 24" className="w-6 h-6 transition-colors" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="11" r="4" />
        {/* Nurse Cap */}
        <path d="M7 6h10l-1.5-3h-7L7 6z" fill={isSelected ? '#e3f2fd' : '#f0f9ff'} stroke="currentColor" />
        <path d="M12 3.5v2M11 4.5h2" stroke={isSelected ? '#1976d2' : '#0284c7'} strokeWidth="1.5" />
      </svg>
    ),
  },
];

const Login = () => {
  const [selectedRole, setSelectedRole] = useState('admin');
  const [email, setEmail] = useState('admin@hospital.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(false);
  const [launchingDemoRole, setLaunchingDemoRole] = useState(null);

  const { login, startDemo } = useAuth();
  const navigate = useNavigate();

  // Remember me logic
  useEffect(() => {
    const savedEmail = localStorage.getItem('hms_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
      // Auto-match role if matching standard accounts
      const matched = ROLES.find((r) => r.email === savedEmail);
      if (matched) setSelectedRole(matched.id);
    }
  }, []);

  // When user switches role tab, update the email field to match that role's account
  const handleRoleChange = (roleId) => {
    setSelectedRole(roleId);
    setError(null);
    const targetRole = ROLES.find((r) => r.id === roleId);
    if (targetRole) {
      setEmail(targetRole.email);
    }
    // Clean password field on role switch for security
    setPassword('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please provide both your email address and password.');
      return;
    }

    setIsLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('hms_remembered_email', email);
      } else {
        localStorage.removeItem('hms_remembered_email');
      }

      const loggedUser = await login(email, password, selectedRole);

      // Route to appropriate dashboard
      if (loggedUser.role === 'admin') navigate('/admin/dashboard');
      else if (loggedUser.role === 'doctor') navigate('/doctor/dashboard');
      else if (loggedUser.role === 'patient') navigate('/patient/dashboard');
      else navigate('/staff/dashboard');
    } catch (err) {
      console.error('Login error:', err);
      setError(
        err.response?.data?.message ||
          'Invalid credentials. Please verify your email and password.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Launch live demo with realistic sample data
  const handleStartDemo = async (roleId) => {
    setLaunchingDemoRole(roleId);
    setError(null);

    try {
      const loggedUser = await startDemo(roleId);
      setIsDemoModalOpen(false);

      if (loggedUser.role === 'admin') navigate('/admin/dashboard');
      else if (loggedUser.role === 'doctor') navigate('/doctor/dashboard');
      else if (loggedUser.role === 'patient') navigate('/patient/dashboard');
      else navigate('/staff/dashboard');
    } catch (err) {
      console.error('Demo launch error:', err);
      setError('Unable to initialize demo session. Please try again.');
    } finally {
      setLaunchingDemoRole(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#ebf5fc] via-[#f2f8fd] to-[#e4f0fa] flex flex-col justify-between selection:bg-blue-600 selection:text-white relative overflow-x-hidden font-sans">
      {/* Top Navigation Bar with Slogan & ECG Pulse */}
      <header className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 sm:pt-6 pb-2 flex items-center justify-between z-10">
        <Link to="/" className="hover:opacity-95 transition-opacity">
          <HospitalLogo iconSize="w-10 h-10 sm:w-11 sm:h-11" />
        </Link>

        {/* Slogan with ECG Heartbeat Graphic matching mockup */}
        <div className="hidden sm:flex items-center gap-2 text-right">
          <span className="text-sm sm:text-base font-semibold italic text-[#0066cc]">
            Better Care. Healthier Tomorrow.
          </span>
          <svg className="w-12 h-6 text-[#0066cc]" viewBox="0 0 60 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M0 12h18l3-6 5 14 4-11 3 5 4-2h23" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </header>

      {/* Main Content Area: Split Screen (Left Hero Presentation, Right Elevated Login Card) */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 flex items-center">
        <div className="w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
          
          {/* LEFT COLUMN: Healthcare Management Presentation */}
          <section className="lg:col-span-7 flex flex-col justify-between space-y-6 lg:pr-4">
            <div>
              {/* Primary Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-[44px] font-black tracking-tight leading-[1.14]">
                <span className="text-[#0f2851] block">Advanced Healthcare</span>
                <span className="text-[#1565c0] block mt-0.5">Management for a Healthier Society</span>
              </h1>

              {/* Sub-headline */}
              <p className="mt-3.5 text-sm sm:text-base text-slate-600 max-w-xl font-normal leading-relaxed">
                Comprehensive hospital management solution for patients, doctors and healthcare staff.
              </p>

              {/* 4 Feature Badges (Horizontal Row matching design) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 mt-6 max-w-2xl">
                {/* Badge 1: Secure & Reliable */}
                <div className="bg-white/80 backdrop-blur-xs border border-white/90 rounded-2xl p-3 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                    <ShieldCheck className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 leading-tight">Secure<br />& Reliable</span>
                </div>

                {/* Badge 2: Smart Management */}
                <div className="bg-white/80 backdrop-blur-xs border border-white/90 rounded-2xl p-3 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                    <Activity className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 leading-tight">Smart<br />Management</span>
                </div>

                {/* Badge 3: Better Care */}
                <div className="bg-white/80 backdrop-blur-xs border border-white/90 rounded-2xl p-3 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                    <TrendingUp className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 leading-tight">Better<br />Care</span>
                </div>

                {/* Badge 4: Healthier Community */}
                <div className="bg-white/80 backdrop-blur-xs border border-white/90 rounded-2xl p-3 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-shadow">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-1.5">
                    <Users className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 leading-tight">Healthier<br />Community</span>
                </div>
              </div>
            </div>

            {/* Hospital Building Architectural Visual */}
            <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl border-2 border-white/80 bg-slate-900 group max-h-[300px] sm:max-h-[360px]">
              <img
                src="/images/hospital-facade.jpg"
                alt="Smart Hospital Campus Facade"
                className="w-full h-full object-cover object-center group-hover:scale-102 transition-transform duration-700 opacity-95"
                onError={(e) => {
                  // Fallback to high resolution healthcare campus photo if local crop is unavailable
                  e.currentTarget.src =
                    'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?auto=format&fit=crop&w=1200&q=80';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent pointer-events-none" />

              {/* Hospital Entrance Sign Overlay */}
              <div className="absolute top-4 left-4 bg-blue-600/90 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-lg shadow-md flex items-center gap-1.5">
                <span className="text-white text-base leading-none font-black">+</span>
                <span>HOSPITAL MAIN ENTRANCE</span>
              </div>
            </div>

            {/* Decorative Wave with "Your Health. Our Priority." */}
            <div className="hidden sm:flex items-center gap-3 pt-1 text-slate-500 text-xs font-semibold">
              <svg className="w-8 h-4 text-blue-600" viewBox="0 0 40 20" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M0 10h12l3-6 4 12 3-9 2 4 3-1h13" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span>Your Health. Our Priority.</span>
            </div>
          </section>

          {/* RIGHT COLUMN: Modern Role-Based Elevated Card */}
          <section className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[460px] bg-white rounded-3xl sm:rounded-[2rem] shadow-2xl shadow-blue-900/15 border border-slate-100 p-6 sm:p-8 relative transition-all">
              
              {/* Card Header with Centered Logo */}
              <div className="text-center flex flex-col items-center">
                <HospitalHeartIcon className="w-12 h-12 mb-1" />
                <h2 className="text-2xl font-black text-[#0f2851] tracking-tight">
                  Smart Hospital
                </h2>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Management & Patient Care System
                </p>
                <div className="w-12 h-0.5 bg-blue-100 mx-auto mt-2.5 rounded-full" />
              </div>

              {/* Sub-header */}
              <div className="mt-4 mb-3 text-center">
                <span className="text-sm sm:text-base font-bold text-slate-800">
                  Login to Your Account
                </span>
              </div>

              {/* 4 Role Selector Buttons (Admin, Doctor, Patient, Nurse) */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                {ROLES.map((r) => {
                  const isSelected = selectedRole === r.id;
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => handleRoleChange(r.id)}
                      className={`flex flex-col items-center justify-center p-2 sm:p-2.5 rounded-xl transition-all cursor-pointer text-center ${
                        isSelected
                          ? 'bg-[#eef5fc] border-2 border-[#1976d2] text-[#0d47a1] shadow-xs'
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-200 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className={`mb-1 ${isSelected ? 'text-[#1976d2]' : 'text-slate-500'}`}>
                        {r.icon(isSelected)}
                      </div>
                      <span className={`text-[11px] sm:text-xs font-bold leading-tight ${isSelected ? 'text-[#0d47a1]' : 'text-slate-700'}`}>
                        {r.name}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Feedback Error Banner */}
              {error && (
                <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-600" />
                  <div className="flex-1">
                    <p className="font-semibold">{error}</p>
                  </div>
                  <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Account Sign-In Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-3.5">
                {/* Email Address Field */}
                <div>
                  <label className="sr-only">Email address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter your email address"
                      required
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                  </div>
                </div>

                {/* Password Field with Show/Hide Toggle */}
                <div>
                  <label className="sr-only">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                    <span>Remember me</span>
                  </label>

                  <Link
                    to="/forgot-password"
                    className="font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                  >
                    Forgot Password?
                  </Link>
                </div>

                {/* Primary Login Button matching mockup */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 py-3 px-4 rounded-xl text-white font-bold text-sm sm:text-base bg-[#0d6efd] hover:bg-[#0b5ed7] shadow-md shadow-blue-500/20 hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-75 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Authenticating...</span>
                    </div>
                  ) : (
                    <>
                      <LogIn className="w-4 h-4" />
                      <span>Login</span>
                    </>
                  )}
                </button>
              </form>

              {/* Divider: OR */}
              <div className="relative my-4 flex items-center justify-center">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest absolute">
                  OR
                </span>
              </div>

              {/* Mint Green Live Demo Card matching mockup */}
              <div
                onClick={() => setIsDemoModalOpen(true)}
                className="bg-[#dcfce7] hover:bg-[#bbf7d0] border border-[#86efac] rounded-2xl p-3 sm:p-3.5 flex items-center justify-between transition-all cursor-pointer group shadow-2xs"
                role="button"
                tabIndex={0}
                title="Explore the hospital system with realistic sample data"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-600/15 flex items-center justify-center text-emerald-700 group-hover:scale-105 transition-transform flex-shrink-0">
                    <Play className="w-4 h-4 fill-emerald-600 text-emerald-600 ml-0.5" />
                  </div>
                  <div>
                    <div className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-950 leading-tight">
                      Live Demo
                    </div>
                    <div className="text-[11px] text-slate-600 font-medium">
                      Explore the system with sample data
                    </div>
                  </div>
                </div>

                <div className="text-slate-500 group-hover:text-slate-800 group-hover:translate-x-1 transition-all">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>

              {/* Compliance & Security Footer inside card */}
              <div className="mt-4 pt-3.5 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[10px] sm:text-[11px] font-semibold text-slate-500">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                <span>Secure Access</span>
                <span className="text-slate-300">|</span>
                <span>Role-Based Permissions</span>
                <span className="text-slate-300">|</span>
                <span>HIPAA Compliant</span>
              </div>

            </div>
          </section>

        </div>
      </main>

      {/* Subtle Bottom Wave Accent */}
      <footer className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-center sm:text-left text-[11px] text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 z-10">
        <div>
          © {new Date().getFullYear()} Smart Hospital Management & Patient Care System. All rights reserved.
        </div>
        <div className="flex items-center gap-4">
          <Link to="/" className="hover:text-blue-600 transition-colors">Hospital Portal</Link>
          <Link to="/register" className="hover:text-blue-600 transition-colors">Staff Registration</Link>
          <button onClick={() => setIsDemoModalOpen(true)} className="hover:text-blue-600 transition-colors">Demo Mode</button>
        </div>
      </footer>

      {/* LIVE DEMO ROLE CHOOSER MODAL */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-lg w-full p-6 sm:p-7 relative">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Play className="w-4 h-4 fill-emerald-600 text-emerald-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Live Demo Portal</h3>
                  <p className="text-xs text-slate-500">Select an authorized role to explore the simulated system</p>
                </div>
              </div>
              <button
                onClick={() => setIsDemoModalOpen(false)}
                className="w-8 h-8 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 4 Demo Roles Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5">
              {ROLES.map((r) => {
                const isLaunching = launchingDemoRole === r.id;
                return (
                  <button
                    key={r.id}
                    disabled={launchingDemoRole !== null}
                    onClick={() => handleStartDemo(r.id)}
                    className="flex flex-col text-left p-3.5 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/40 transition-all group cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 group-hover:bg-emerald-100 group-hover:text-emerald-700 flex items-center justify-center transition-colors">
                        {r.icon(false)}
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full">
                        {r.badge}
                      </span>
                    </div>

                    <div className="text-sm font-bold text-slate-900 group-hover:text-emerald-950">
                      {r.name}
                    </div>
                    <div className="text-[11px] text-slate-500 line-clamp-2 mt-1">
                      {r.description}
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-700">
                      <span>{isLaunching ? 'Starting demo...' : 'Launch Demo'}</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Safe sandbox environment with realistic sample records</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
