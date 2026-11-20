import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Activity,
  Lock,
  Mail,
  Shield,
  AlertCircle,
  Eye,
  EyeOff,
  Clock,
  XCircle,
  Users,
} from 'lucide-react';

const STAFF_ROLES = ['staff', 'nurse', 'receptionist', 'pharmacist', 'lab_technician', 'billing_staff'];

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorInfo, setErrorInfo] = useState(null); // { message, accountStatus }
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const savedEmail = localStorage.getItem('hms_remembered_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorInfo(null);
    setIsLoading(true);

    try {
      const user = await login(email, password, rememberMe);
      // Automatic role-based redirection identified strictly from the database
      if (user.role === 'admin') {
        navigate('/admin/dashboard');
      } else if (user.role === 'doctor') {
        navigate('/doctor/dashboard');
      } else if (user.role === 'patient') {
        navigate('/patient/dashboard');
      } else if (STAFF_ROLES.includes(user.role)) {
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-medical-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-medical-600 to-sky-400 text-white shadow-xl shadow-medical-500/30 mb-4">
          <Activity className="h-8 w-8" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Apex Memorial Hospital
        </h2>
        <p className="mt-1.5 text-sm text-slate-400">
          Centralized Hospital Information & Patient Care System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          {/* Universal Portal Scope Notice */}
          <div className="mb-6 p-3.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-medical-50 text-medical-600 flex-shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div className="text-left">
              <p className="text-xs font-bold text-slate-800">Universal Healthcare Login</p>
              <p className="text-[11px] text-slate-500">
                Single sign-on for Administrators, Doctors, Patients, Nurses, Receptionists, Pharmacists, Lab Techs, and Billing Staff.
              </p>
            </div>
          </div>

          {/* Pending Approval Notice */}
          {errorInfo && errorInfo.accountStatus === 'Pending' && (
            <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
              <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-amber-950">Registration Awaiting Administrator Approval</p>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Your registration application has been received and is currently under review by hospital administration. Once your medical credentials and licensing details are verified, you will be able to log in to your dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Rejected Registration Notice */}
          {errorInfo && errorInfo.accountStatus === 'Rejected' && (
            <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs flex items-start gap-2.5">
              <XCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-bold text-rose-950">Registration Application Rejected</p>
                <p className="text-[11px] text-rose-800 mt-0.5">
                  {errorInfo.message}
                </p>
              </div>
            </div>
          )}

          {/* Standard Authentication Error */}
          {errorInfo && !errorInfo.accountStatus && (
            <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorInfo.message}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-xs font-semibold text-slate-700">Account Email Address</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="h-4 w-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                  placeholder="e.g. name@hospital.com or patient@email.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">Password</label>
              <div className="mt-1 relative rounded-xl shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-10 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                  placeholder="Enter your confidential password"
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
              className="w-full mt-2 flex justify-center py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-semibold text-white bg-medical-600 hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Verifying Credentials & Role...' : 'Sign In to Portal'}
            </button>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4 space-y-2">
            <p className="text-xs text-slate-500">
              Need to register?{' '}
              <Link to="/register" className="font-semibold text-medical-600 hover:text-medical-700">
                Dynamic Registration Portal
              </Link>
            </p>
            <p className="text-[11px] text-slate-400">
              Healthcare professionals, staff members, and patients can register for appropriate access.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
