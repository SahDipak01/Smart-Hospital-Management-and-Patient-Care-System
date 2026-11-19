import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import Modal from '../../components/common/Modal';
import {
  Activity,
  AlertCircle,
  Stethoscope,
  Heart,
  Pill,
  FlaskConical,
  CreditCard,
  UserCheck,
  User,
  Shield,
  CheckCircle2,
  Clock,
  Building,
  Mail,
  Lock,
  Phone,
  FileText,
  Award,
  ArrowRight,
} from 'lucide-react';

const ROLES = [
  {
    id: 'patient',
    label: 'Patient',
    subtitle: 'Immediate Active Access',
    icon: User,
    color: 'emerald',
    badge: 'Immediate Access',
  },
  {
    id: 'doctor',
    label: 'Doctor (Physician)',
    subtitle: 'Requires License Verification',
    icon: Stethoscope,
    color: 'sky',
    badge: 'Admin Approval Required',
  },
  {
    id: 'nurse',
    label: 'Nurse',
    subtitle: 'Ward & Clinical Care',
    icon: Heart,
    color: 'rose',
    badge: 'Admin Approval Required',
  },
  {
    id: 'receptionist',
    label: 'Receptionist',
    subtitle: 'Front Desk & Patient Intake',
    icon: UserCheck,
    color: 'blue',
    badge: 'Admin Approval Required',
  },
  {
    id: 'pharmacist',
    label: 'Pharmacist',
    subtitle: 'Pharmacy Inventory & Dispensing',
    icon: Pill,
    color: 'teal',
    badge: 'Admin Approval Required',
  },
  {
    id: 'lab_technician',
    label: 'Laboratory Technician',
    subtitle: 'Diagnostics & Specimen Testing',
    icon: FlaskConical,
    color: 'purple',
    badge: 'Admin Approval Required',
  },
  {
    id: 'billing_staff',
    label: 'Billing & Cashier Staff',
    subtitle: 'Invoicing & Ledger Accounts',
    icon: CreditCard,
    color: 'amber',
    badge: 'Admin Approval Required',
  },
];

const Register = () => {
  const [selectedRole, setSelectedRole] = useState('patient');
  const [departments, setDepartments] = useState([]);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingModalData, setPendingModalData] = useState(null);

  // Common Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    gender: 'Male',

    // Patient Fields
    dateOfBirth: '',
    bloodGroup: 'O+',
    address: { street: '', city: '', state: '', zipCode: '' },
    emergencyContact: { name: '', relationship: '', phone: '' },
    allergies: '',

    // Doctor & Staff Shared/Specific Fields
    departmentId: '',
    specialization: '',
    licenseNumber: '',
    qualifications: '',
    qualification: '',
    experienceYears: 1,
    consultationFee: 500,
    roomNumber: '',
    deskNumber: '',
    shiftPreference: 'Morning',
    bio: '',
  });

  const { register } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const res = await api.get('/departments');
        if (res.data.success && res.data.departments?.length > 0) {
          setDepartments(res.data.departments);
          setFormData((prev) => ({
            ...prev,
            departmentId: res.data.departments[0]._id,
          }));
        }
      } catch (err) {
        console.error('Failed to load departments for registration:', err);
      }
    };
    fetchDepartments();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData((prev) => ({
        ...prev,
        [parent]: { ...prev[parent], [child]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        role: selectedRole,
        allergies: formData.allergies
          ? formData.allergies.split(',').map((a) => ({ substance: a.trim(), severity: 'Moderate' }))
          : [],
      };

      const result = await register(payload);

      if (selectedRole === 'patient') {
        // Immediate active session
        navigate('/patient/dashboard');
      } else {
        // Doctor or staff registration awaiting admin approval
        setPendingModalData({
          role: selectedRole,
          name: formData.name,
          email: formData.email,
          message:
            result.message ||
            'Registration submitted successfully! Your account is awaiting administrator verification.',
        });
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Registration failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-medical-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-3xl text-center">
        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-medical-600 to-sky-400 text-white shadow-xl shadow-medical-500/30 mb-3">
          <Activity className="h-7 w-7" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Hospital Dynamic Registration Portal
        </h2>
        <p className="mt-1 text-xs text-slate-300 max-w-lg mx-auto">
          Select your hospital role below. Dynamic registration fields and authorization checks will adapt automatically.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-3xl px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 shadow-2xl rounded-2xl border border-slate-100">
          {/* Step 1: Role Selection Cards */}
          <div className="mb-6">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2.5">
              Step 1: Select Your Hospital User Role *
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {ROLES.map((r) => {
                const IconComponent = r.icon;
                const isSelected = selectedRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setSelectedRole(r.id);
                      setError('');
                    }}
                    className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                      isSelected
                        ? 'border-medical-600 bg-medical-50/50 ring-2 ring-medical-500/30 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <div
                          className={`p-1.5 rounded-lg ${
                            isSelected ? 'bg-medical-600 text-white' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <IconComponent className="w-4 h-4" />
                        </div>
                        {isSelected && <CheckCircle2 className="w-4 h-4 text-medical-600" />}
                      </div>
                      <p className="text-xs font-bold text-slate-900 leading-tight">{r.label}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">{r.subtitle}</p>
                    </div>

                    <div className="mt-2">
                      <span
                        className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          r.id === 'patient'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {r.id === 'patient' ? 'Active on Submit' : 'Approval Required'}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Note on Restricted Admin Setup */}
            <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Looking for Administrator account?</span>
              </span>
              <span className="font-semibold text-slate-600">
                Created through secure setup or authorized administrator
              </span>
            </div>
          </div>

          {error && (
            <div className="mb-5 flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 2: Dynamic Registration Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border-t border-slate-100 pt-4">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                Step 2: Enter Account Credentials & Profile Details
              </h3>

              {/* Common Credentials */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">Full Name *</label>
                  <input
                    type="text"
                    required
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    placeholder={selectedRole === 'doctor' ? 'Dr. First Last' : 'First Last'}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Email Address *</label>
                  <input
                    type="email"
                    required
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="name@hospital.com or personal@email.com"
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Secure Password *</label>
                  <input
                    type="password"
                    required
                    name="password"
                    minLength={6}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Minimum 6 characters"
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Contact Phone Number *</label>
                  <input
                    type="tel"
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700">Gender *</label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 bg-white"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* DYNAMIC SECTION A: PATIENT FIELDS */}
            {selectedRole === 'patient' && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Patient Clinical Profile & Emergency Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Date of Birth *</label>
                    <input
                      type="date"
                      required
                      name="dateOfBirth"
                      value={formData.dateOfBirth}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Blood Group *</label>
                    <select
                      name="bloodGroup"
                      value={formData.bloodGroup}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 bg-white"
                    >
                      {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'].map((bg) => (
                        <option key={bg} value={bg}>
                          {bg}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Street Address</label>
                    <input
                      type="text"
                      name="address.street"
                      value={formData.address?.street}
                      onChange={handleChange}
                      placeholder="123 Hospital Way"
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">City / State</label>
                    <input
                      type="text"
                      name="address.city"
                      value={formData.address?.city}
                      onChange={handleChange}
                      placeholder="e.g. Metro City, NY"
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Emergency Contact Name</label>
                    <input
                      type="text"
                      name="emergencyContact.name"
                      value={formData.emergencyContact?.name}
                      onChange={handleChange}
                      placeholder="Next of kin name"
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Emergency Contact Phone</label>
                    <input
                      type="tel"
                      name="emergencyContact.phone"
                      value={formData.emergencyContact?.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">
                      Known Medical Allergies (comma separated)
                    </label>
                    <input
                      type="text"
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleChange}
                      placeholder="e.g. Penicillin, Sulfa drugs, Peanuts, Latex"
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DYNAMIC SECTION B: DOCTOR FIELDS */}
            {selectedRole === 'doctor' && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Doctor Clinical Licensing & Specialization Details
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Medical Council License Number *</label>
                    <input
                      type="text"
                      required
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      placeholder="e.g. MED-REG-98442"
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Specialization *</label>
                    <input
                      type="text"
                      required
                      name="specialization"
                      value={formData.specialization}
                      onChange={handleChange}
                      placeholder="e.g. Interventional Cardiology, Neurology"
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Clinical Department *</label>
                    <select
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white"
                    >
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Medical Degrees & Qualifications *</label>
                    <input
                      type="text"
                      required
                      name="qualifications"
                      value={formData.qualifications}
                      onChange={handleChange}
                      placeholder="e.g. MBBS, MD (Cardiology), FACC"
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Experience (Years) *</label>
                    <input
                      type="number"
                      required
                      min={0}
                      name="experienceYears"
                      value={formData.experienceYears}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Consultation Fee ($) *</label>
                    <input
                      type="number"
                      required
                      min={50}
                      name="consultationFee"
                      value={formData.consultationFee}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-semibold text-slate-700">Preferred OPD Cabin / Room Number</label>
                    <input
                      type="text"
                      name="roomNumber"
                      value={formData.roomNumber}
                      onChange={handleChange}
                      placeholder="e.g. OPD-305 (Optional, admin will verify)"
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* DYNAMIC SECTION C: NURSE & STAFF FIELDS */}
            {selectedRole !== 'patient' && selectedRole !== 'doctor' && (
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Professional Credentials & Department Assignment
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Council License / Registration Number *
                    </label>
                    <input
                      type="text"
                      required
                      name="licenseNumber"
                      value={formData.licenseNumber}
                      onChange={handleChange}
                      placeholder="e.g. NUR-9921 or PHARM-4402"
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Degree / Qualification *</label>
                    <input
                      type="text"
                      required
                      name="qualification"
                      value={formData.qualification}
                      onChange={handleChange}
                      placeholder={
                        selectedRole === 'nurse'
                          ? 'e.g. BSN, Registered Nurse'
                          : selectedRole === 'pharmacist'
                          ? 'e.g. B.Pharm, Pharm.D'
                          : selectedRole === 'lab_technician'
                          ? 'e.g. B.Sc Medical Laboratory Technology'
                          : 'e.g. Bachelor of Business Administration'
                      }
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Assigned Department / Ward</label>
                    <select
                      name="departmentId"
                      value={formData.departmentId}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 bg-white"
                    >
                      {departments.map((dept) => (
                        <option key={dept._id} value={dept._id}>
                          {dept.name} ({dept.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700">Shift Preference *</label>
                    <select
                      name="shiftPreference"
                      value={formData.shiftPreference}
                      onChange={handleChange}
                      className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 bg-white"
                    >
                      <option value="Morning">Morning Shift (07:00 - 15:00)</option>
                      <option value="Evening">Evening Shift (15:00 - 23:00)</option>
                      <option value="Night">Night Shift (23:00 - 07:00)</option>
                      <option value="Rotating">Rotating Duty</option>
                    </select>
                  </div>

                  {selectedRole === 'lab_technician' && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Laboratory Specialty</label>
                      <input
                        type="text"
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleChange}
                        placeholder="e.g. Hematology, Clinical Biochemistry"
                        className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20"
                      />
                    </div>
                  )}

                  {(selectedRole === 'receptionist' || selectedRole === 'billing_staff') && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700">Counter / Desk Number</label>
                      <input
                        type="text"
                        name="deskNumber"
                        value={formData.deskNumber}
                        onChange={handleChange}
                        placeholder="e.g. Desk-01 or Cashier Counter B"
                        className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 px-4 border border-transparent rounded-xl shadow-md text-sm font-bold text-white bg-medical-600 hover:bg-medical-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-medical-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Submitting Application...</span>
                  </>
                ) : selectedRole === 'patient' ? (
                  <>
                    <span>Create Active Patient Account</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                ) : (
                  <>
                    <span>Submit Application for Administrator Review</span>
                    <Clock className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 text-center border-t border-slate-100 pt-4">
            <p className="text-xs text-slate-500">
              Already registered?{' '}
              <Link to="/login" className="font-semibold text-medical-600 hover:text-medical-700">
                Sign In through Central Login
              </Link>
            </p>
          </div>
        </div>
      </div>

      {/* Pending Approval Confirmation Modal */}
      <Modal
        isOpen={!!pendingModalData}
        onClose={() => navigate('/login')}
        title="Application Submitted for Verification"
        subtitle={`Role: ${pendingModalData?.role?.toUpperCase()} • Applicant: ${pendingModalData?.name}`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <Clock className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="text-sm font-bold text-amber-950">Awaiting Administrator Approval</h4>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Thank you for applying. Because you are registering for a healthcare role (
                <strong>{pendingModalData?.role}</strong>), your clinical credentials and licensing details must be verified by the Hospital Administrator before workstation activation.
              </p>
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Applicant:</span>
              <span className="font-semibold text-slate-800">{pendingModalData?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account Email:</span>
              <span className="font-mono text-slate-800">{pendingModalData?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Account Status:</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                Pending Verification
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500 text-center">
            Once approved, you will be able to log in directly via the common login page.
          </p>

          <button
            onClick={() => navigate('/login')}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-md transition-all"
          >
            Return to Login Portal
          </button>
        </div>
      </Modal>
    </div>
  );
};

export default Register;
