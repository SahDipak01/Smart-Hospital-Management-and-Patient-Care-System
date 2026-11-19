import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  Stethoscope,
  Search,
  Plus,
  Calendar,
  CheckCircle,
  XCircle,
  Building,
  DollarSign,
  Clock,
  Shield,
} from 'lucide-react';

const DoctorsPage = () => {
  const { role } = useAuth();
  const [doctors, setDoctors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');

  // Modals
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    specialization: '',
    department: '',
    consultationFee: 500,
    roomNumber: 'OPD-101',
    experienceYears: 5,
    degree: 'MBBS, MD',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const [docRes, deptRes] = await Promise.all([
        api.get('/doctors'),
        api.get('/departments'),
      ]);

      if (docRes.data.success) setDoctors(docRes.data.doctors);
      if (deptRes.data.success) setDepartments(deptRes.data.departments);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const toggleApproval = async (id) => {
    try {
      const res = await api.patch(`/doctors/${id}/approve`);
      if (res.data.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update doctor approval status');
    }
  };

  const toggleStatus = async (id) => {
    try {
      const res = await api.patch(`/doctors/${id}/status`);
      if (res.data.success) {
        fetchData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update doctor active status');
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        qualifications: [{ degree: formData.degree, institution: 'Medical University', year: 2016 }],
      };
      const res = await api.post('/doctors', payload);
      if (res.data.success) {
        setIsOnboardOpen(false);
        fetchData();
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          specialization: '',
          department: '',
          consultationFee: 500,
          roomNumber: 'OPD-101',
          experienceYears: 5,
          degree: 'MBBS, MD',
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to onboard doctor');
    }
  };

  const filteredDoctors = doctors.filter((doc) => {
    const matchesSearch =
      !searchTerm ||
      `${doc.firstName} ${doc.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.specialization.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.doctorId.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDept = deptFilter === 'All' || doc.department?._id === deptFilter;
    return matchesSearch && matchesDept;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Doctor & Specialist Registry</h2>
          <p className="text-xs text-slate-500">Verified clinicians, working schedules, consultation fees, and departments</p>
        </div>

        {role === 'admin' && (
          <button
            onClick={() => setIsOnboardOpen(true)}
            className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Onboard Doctor</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, specialization, ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Department:</span>
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          >
            <option value="All">All Departments</option>
            {departments.map((d) => (
              <option key={d._id} value={d._id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Doctors Grid */}
      {loading ? (
        <LoadingSpinner text="Fetching clinical faculty records..." />
      ) : filteredDoctors.length === 0 ? (
        <EmptyState
          icon={Stethoscope}
          title="No doctors found"
          description="No physician matches your search filter."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredDoctors.map((doc) => (
            <div
              key={doc._id}
              className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-medical-600 to-sky-400 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                      Dr
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">
                        Dr. {doc.firstName} {doc.lastName}
                      </h4>
                      <p className="text-xs text-medical-600 font-medium">{doc.specialization}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Badge size="sm">{doc.isApproved ? 'Approved' : 'Pending'}</Badge>
                    <Badge size="sm">{doc.status}</Badge>
                  </div>
                </div>

                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Building className="w-3.5 h-3.5" /> Department
                    </span>
                    <span className="font-semibold text-slate-800">{doc.department?.name || 'General'}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <DollarSign className="w-3.5 h-3.5" /> Consultation Fee
                    </span>
                    <span className="font-bold text-emerald-600">${doc.consultationFee}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" /> Clinic Room
                    </span>
                    <span className="font-medium text-slate-800">{doc.roomNumber}</span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Experience</span>
                    <span className="font-medium text-slate-800">{doc.experienceYears} Years</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => setSelectedDoctor(doc)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedules</span>
                </button>

                {role === 'admin' && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => toggleApproval(doc._id)}
                      title={doc.isApproved ? 'Suspend Doctor' : 'Approve Doctor'}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        doc.isApproved
                          ? 'bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {doc.isApproved ? 'Suspend' : 'Approve'}
                    </button>
                    <button
                      onClick={() => toggleStatus(doc._id)}
                      title={doc.status === 'Active' ? 'Deactivate Doctor' : 'Activate Doctor'}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        doc.status === 'Active'
                          ? 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                          : 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                      }`}
                    >
                      {doc.status === 'Active' ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Comprehensive Doctor Profile & Schedules Modal */}
      <Modal
        isOpen={!!selectedDoctor}
        onClose={() => setSelectedDoctor(null)}
        title={`Doctor Profile: Dr. ${selectedDoctor?.firstName || ''} ${selectedDoctor?.lastName || ''}`}
        subtitle={`${selectedDoctor?.specialization} • Department of ${selectedDoctor?.department?.name || 'General Medicine'}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Overview Strip */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <span className="text-slate-500 block text-[11px]">Doctor ID:</span>
              <span className="font-mono font-bold text-slate-800">{selectedDoctor?.doctorId}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Clinic Room:</span>
              <span className="font-semibold text-slate-800">{selectedDoctor?.roomNumber}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Consultation Fee:</span>
              <span className="font-bold text-emerald-600">${selectedDoctor?.consultationFee}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Experience:</span>
              <span className="font-semibold text-slate-800">{selectedDoctor?.experienceYears} Years</span>
            </div>
          </div>

          {/* Contact & Qualifications */}
          <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Contact Phone:</span>
              <span className="font-mono text-slate-800">{selectedDoctor?.phone || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Email Address:</span>
              <span className="text-slate-800">{selectedDoctor?.user?.email || 'N/A'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-500">Qualifications:</span>
              <span className="font-semibold text-slate-800">
                {selectedDoctor?.qualifications?.map((q) => `${q.degree} (${q.institution || ''})`).join(', ') || 'MBBS, MD'}
              </span>
            </div>
            {selectedDoctor?.bio && (
              <div className="pt-2 border-t border-slate-100">
                <span className="text-slate-500 block mb-1">Clinical Biography:</span>
                <p className="text-slate-700 leading-relaxed italic">{selectedDoctor.bio}</p>
              </div>
            )}
          </div>

          {/* Schedule Slots */}
          <div>
            <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-medical-600" />
              <span>OPD Consultation Schedule Slots</span>
            </h5>

            <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden text-xs">
              {(!selectedDoctor?.scheduleSlots || selectedDoctor.scheduleSlots.length === 0) ? (
                <p className="p-4 text-center text-slate-400">No scheduled slots configured.</p>
              ) : (
                selectedDoctor.scheduleSlots.map((slot, index) => (
                  <div key={index} className="p-2.5 flex items-center justify-between bg-slate-50/50">
                    <span className="font-bold text-slate-800">{slot.dayOfWeek}</span>
                    <span className="font-mono text-medical-700 font-semibold">
                      {slot.startTime} - {slot.endTime}
                    </span>
                    <span className="text-slate-500 text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {slot.slotDurationMinutes || 20} min slots
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Modal>

      {/* Onboard Doctor Modal */}
      <Modal
        isOpen={isOnboardOpen}
        onClose={() => setIsOnboardOpen(false)}
        title="Onboard Healthcare Practitioner"
        subtitle="Registers physician credentials, assigns department, and configures OPD clinic room."
      >
        <form onSubmit={handleOnboardSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Specialization *</label>
              <input
                type="text"
                required
                placeholder="e.g. Interventional Cardiology"
                value={formData.specialization}
                onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Department *</label>
              <select
                required
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Fee ($) *</label>
              <input
                type="number"
                required
                value={formData.consultationFee}
                onChange={(e) => setFormData({ ...formData, consultationFee: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">OPD Room *</label>
              <input
                type="text"
                required
                value={formData.roomNumber}
                onChange={(e) => setFormData({ ...formData, roomNumber: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Experience (Yrs)</label>
              <input
                type="number"
                value={formData.experienceYears}
                onChange={(e) => setFormData({ ...formData, experienceYears: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOnboardOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Onboard Doctor
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DoctorsPage;
