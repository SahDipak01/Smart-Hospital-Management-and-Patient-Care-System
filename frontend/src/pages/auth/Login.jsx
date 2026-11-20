import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Stethoscope,
  Users,
  HeartPulse,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  XCircle,
  ArrowRight,
  Zap,
  CheckCircle2,
  ChevronRight,
} from 'lucide-react';

const FOUR_ROLES = [
  {
    id: 'admin',
    label: 'Administrator',
    icon: ShieldCheck,
    description: 'Executive command, approvals hub, audit logs, financials & bed capacity',
    placeholder: 'admin@hospital.com',
    defaultRoute: '/admin/dashboard',
  },
  {
    id: 'doctor',
    label: 'Doctor',
    icon: Stethoscope,
    description: 'OPD consultation queue, clinical EMR timeline, prescriptions & diagnostic orders',
    placeholder: 'dr.sarah@hospital.com',
    defaultRoute: '/doctor/dashboard',
  },
  {
    id: 'patient',
    label: 'Patient',
    icon: Users,
    description: 'Personal health card, appointment booking, lab reports, invoices & prescriptions',
    placeholder: 'john.doe@email.com',
    defaultRoute: '/patient/dashboard',
  },
  {
    id: 'nurse',
    label: 'Nurse',
    icon: HeartPulse,
    description: 'Ward bed matrix, inpatient vitals logging, care tasks & nursing station',
    placeholder: 'nurse.sarah@hospital.com',
    defaultRoute: '/staff/dashboard',
  },
];

const STAFF_ROLES = ['staff', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'billing_staff'];

const Login = () => {
  const [activeTab, setActiveTab] = useState('login'); // 'login' | 'demo'
  const [selectedRole, setSelectedRole] = useState('admin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null); // { message, accountStatus }
  const [isLoading, setIsLoading] = useState(false);
  const [demoStartingRole, setDemoStartingRole] = useState(null);

  const { login, startDemo } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('hms_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  // Update email placeholder or clear error when role changes
  const handleRoleSelect = (roleId) => {
    setSelectedRole(roleId);
    setErrorInfo(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorInfo(null);

    if (!email || !password) {
      setErrorInfo({ message: 'Please enter both your email address and password.' });
      return;
    }

    setIsLoading(true);

    try {
      const user = await login(email, password, rememberMe);

      // Verify that user role matches or is permitted for the selected role
      const userRole = user.role;
      const isRoleMatched =
        userRole === selectedRole ||
        (selectedRole === 'nurse' && (userRole === 'nurse' || userRole === 'staff')) ||
        userRole === 'admin';

      if (!isRoleMatched) {
        console.warn(`Role mismatch: Authenticated as ${userRole}, but selected ${selectedRole}.`);
      }

      // Automatic role-based redirection identified strictly from backend/database
      if (userRole === 'admin') {
        navigate('/admin/dashboard');
      } else if (userRole === 'doctor') {
        navigate('/doctor/dashboard');
      } else if (userRole === 'patient') {
        navigate('/patient/dashboard');
      } else if (STAFF_ROLES.includes(userRole)) {
        navigate('/staff/dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      const data = err.response?.data;
      setErrorInfo({
        message: data?.message || err.message || 'Authentication failed. Please verify credentials.',
        accountStatus: data?.accountStatus || null,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartLiveDemo = async (roleId) => {
    setDemoStartingRole(roleId);
    setErrorInfo(null);
    try {
      const loggedUser = await startDemo(roleId);
      if (loggedUser.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (loggedUser.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else if (loggedUser.role === 'patient') {
        navigate('/patient/dashboard');
      } else {
        navigate('/staff/dashboard');
      }
    } catch (err) {
      console.error('Demo launch error:', err);
      setErrorInfo({ message: 'Failed to initialize live demo session. Please try again.' });
    } finally {
      setDemoStartingRole(null);
    }
  };

  const currentRoleObj = FOUR_ROLES.find((r) => r.id === selectedRole) || FOUR_ROLES[0];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-medical-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8 selection:bg-medical-500 selection:text-white">
      {/* Hospital Logo & Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-xl text-center px-4">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-medical-600 to-sky-400 text-white shadow-xl shadow-medical-500/30 group-hover:scale-105 transition-transform">
            <Activity className="h-7 w-7 stroke-[2.5]" />
          </div>
          <div className="text-left">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              SmartCare Hospital
            </h1>
            <p className="text-xs text-sky-200/80 font-medium">
              Enterprise Clinical & Patient Care Operating System
            </p>
          </div>
        </Link>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-3xl border border-slate-100">
          {/* Top Mode Switcher: Account Sign-In vs Live Demo Access */}
          <div className="mb-6 p-1.5 rounded-2xl bg-slate-100 flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorInfo(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'login'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Shield className="w-4 h-4 text-medical-600" />
              <span>Account Sign-In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('demo');
                setErrorInfo(null);
              }}
              className={`flex-1 py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                activeTab === 'demo'
                  ? 'bg-medical-600 text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
              <span>Explore with Live Demo</span>
            </button>
          </div>

          {/* ========================================================================= */}
          {/* TAB 1: STANDARD ACCOUNT SIGN-IN */}
          {/* ========================================================================= */}
          {activeTab === 'login' && (
            <div className="space-y-6">
              {/* Role Selection (Strictly 4 Roles: Administrator, Doctor, Patient, Nurse) */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Select Your Hospital Role:
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {FOUR_ROLES.map((r) => {
                    const Icon = r.icon;
                    const isSelected = selectedRole === r.id;

                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => handleRoleSelect(r.id)}
                        className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? 'bg-medical-50/80 border-medical-500 shadow-xs text-medical-900 ring-2 ring-medical-500/20'
                            : 'bg-slate-50/70 border-slate-200/90 text-slate-600 hover:bg-slate-100 hover:border-slate-300'
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                            isSelected ? 'bg-medical-600 text-white shadow-sm' : 'bg-white text-slate-500'
                          }`}
                        >
                          <Icon className="w-4 h-4 stroke-[2.2]" />
                        </div>
                        <span className="text-xs font-bold">{r.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Role Description Notice */}
                <div className="mt-2.5 px-3 py-1.5 rounded-lg bg-slate-50 text-[11px] text-slate-500 border border-slate-200/60">
                  <span className="font-semibold text-slate-700">{currentRoleObj.label} Portal: </span>
                  <span>{currentRoleObj.description}</span>
                </div>
              </div>

              {/* Status & Error Alerts */}
              {errorInfo && errorInfo.accountStatus === 'Pending' && (
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-amber-950">Registration Awaiting Administrator Approval</p>
                    <p className="text-[11px] text-amber-800 mt-0.5">
                      Your account registration has been submitted and is awaiting administrator verification. Once
                      your clinical licensing and credentials are confirmed, your access will be activated.
                    </p>
                  </div>
                </div>
              )}

              {errorInfo && errorInfo.accountStatus === 'Rejected' && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
                  <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-rose-950">Registration Application Rejected</p>
                    <p className="text-[11px] text-rose-800 mt-0.5">{errorInfo.message}</p>
                  </div>
                </div>
              )}

              {errorInfo && !errorInfo.accountStatus && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorInfo.message}</span>
                </div>
              )}

              {/* Main Sign-In Form */}
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Account Email Address</label>
                  <div className="mt-1 relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Mail className="h-4 w-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="block w-full pl-9 pr-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                      placeholder={`e.g. ${currentRoleObj.placeholder}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Password</label>
                  <div className="mt-1 relative rounded-xl shadow-2xs">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <Lock className="h-4 w-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="block w-full pl-9 pr-10 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                      placeholder="Enter confidential password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password Row */}
                <div className="flex items-center justify-between pt-1">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-medical-600 focus:ring-medical-500 border-slate-300"
                    />
                    <span className="text-xs text-slate-600 font-medium">Remember Me</span>
                  </label>

                  <Link
                    to="/forgot-password"
                    className="text-xs font-medium text-medical-600 hover:text-medical-700 hover:underline"
                  >
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-2 flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-medical-600 hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Verifying Credentials...' : `Sign In as ${currentRoleObj.label}`}
                </button>
              </form>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: LIVE DEMO ACCESS OPTION (Strictly 4 Roles) */}
          {/* ========================================================================= */}
          {activeTab === 'demo' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <div className="flex items-center gap-2 font-bold text-amber-900">
                  <Zap className="w-4 h-4 text-amber-600 fill-amber-600" />
                  <span>Interactive Live Demo Environment</span>
                </div>
                <p className="mt-1 text-amber-800 leading-relaxed">
                  Explore the system using realistic sample data. Demo sessions run in isolated preview mode without
                  modifying production records. You can exit anytime via the persistent <strong>Exit Demo</strong> button.
                </p>
              </div>

              {errorInfo && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorInfo.message}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {FOUR_ROLES.map((r) => {
                  const Icon = r.icon;
                  const isStarting = demoStartingRole === r.id;

                  return (
                    <div
                      key={r.id}
                      className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 hover:bg-white hover:border-medical-300 hover:shadow-md transition-all flex flex-col justify-between space-y-3"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="w-9 h-9 rounded-xl bg-medical-100 text-medical-700 flex items-center justify-center font-bold">
                            <Icon className="w-4 h-4 stroke-[2.2]" />
                          </div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                            Demo Mode
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900">{r.label} Demo</h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed">{r.description}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleStartLiveDemo(r.id)}
                        disabled={isStarting}
                        className="w-full py-2 px-3 rounded-xl text-xs font-bold text-white bg-medical-600 hover:bg-medical-700 shadow-sm flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
                      >
                        {isStarting ? (
                          <span>Starting Demo Session...</span>
                        ) : (
                          <>
                            <span>Start {r.label} Demo</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>

              <div className="pt-2 text-center">
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
                >
                  Return to Standard Account Sign-In
                </button>
              </div>
            </div>
          )}

          {/* Footer Registration Notice */}
          <div className="mt-8 text-center border-t border-slate-100 pt-5 space-y-1.5">
            <p className="text-xs text-slate-500">
              Need a new hospital account?{' '}
              <Link to="/register" className="font-bold text-medical-600 hover:text-medical-700 hover:underline">
                Public Registration Portal
              </Link>
            </p>
            <p className="text-[11px] text-slate-400">
              Patient registrations are activated immediately; medical doctors and nursing staff require administrator verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
