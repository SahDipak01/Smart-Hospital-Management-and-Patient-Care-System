import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  Users,
  Search,
  Plus,
  Eye,
  AlertCircle,
  Clock,
  Heart,
  FileText,
  Pill,
  FlaskConical,
  Bed,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

const PatientsPage = () => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [bloodFilter, setBloodFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal states
  const [isRegisterOpen, setIsRegisterOpen] = useState(false);
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  const [patientDetails, setPatientDetails] = useState(null);
  const [patientTimeline, setPatientTimeline] = useState([]);
  const [activeProfileTab, setActiveProfileTab] = useState('timeline');
  const [modalLoading, setModalLoading] = useState(false);

  // New patient form
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    gender: 'Male',
    bloodGroup: 'O+',
    address: { street: '', city: '', state: '', zipCode: '' },
    emergencyContact: { name: '', relationship: '', phone: '' },
    allergies: '',
    chronicConditions: '',
  });

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (bloodFilter !== 'All') params.append('bloodGroup', bloodFilter);
      if (statusFilter !== 'All') params.append('status', statusFilter);

      const res = await api.get(`/patients?${params.toString()}`);
      if (res.data.success) {
        setPatients(res.data.patients);
      }
    } catch (err) {
      console.error('Failed to fetch patients:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delayDebounce = setTimeout(fetchPatients, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm, bloodFilter, statusFilter]);

  const openPatientDetails = async (id) => {
    setSelectedPatientId(id);
    setModalLoading(true);
    setActiveProfileTab('timeline');
    try {
      const [detailRes, timeRes] = await Promise.all([
        api.get(`/patients/${id}`),
        api.get(`/patients/${id}/timeline`),
      ]);
      if (detailRes.data.success) setPatientDetails(detailRes.data);
      if (timeRes.data.success) setPatientTimeline(timeRes.data.timeline);
    } catch (err) {
      console.error(err);
    } finally {
      setModalLoading(false);
    }
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        allergies: formData.allergies ? [{ substance: formData.allergies, severity: 'Moderate' }] : [],
        chronicConditions: formData.chronicConditions ? [{ condition: formData.chronicConditions }] : [],
      };
      const res = await api.post('/patients', payload);
      if (res.data.success) {
        setIsRegisterOpen(false);
        fetchPatients();
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          dateOfBirth: '',
          gender: 'Male',
          bloodGroup: 'O+',
          address: { street: '', city: '', state: '', zipCode: '' },
          emergencyContact: { name: '', relationship: '', phone: '' },
          allergies: '',
          chronicConditions: '',
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create patient');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Patient Directory & EMR Records</h2>
          <p className="text-xs text-slate-500">Centralized electronic health database with unique UHIDs and medical timelines</p>
        </div>
        <button
          onClick={() => setIsRegisterOpen(true)}
          className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Patient Registration</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by UHID, name, or phone..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>Blood:</span>
            <select
              value={bloodFilter}
              onChange={(e) => setBloodFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="All">All Groups</option>
              <option value="A+">A+</option>
              <option value="A-">A-</option>
              <option value="B+">B+</option>
              <option value="B-">B-</option>
              <option value="AB+">AB+</option>
              <option value="AB-">AB-</option>
              <option value="O+">O+</option>
              <option value="O-">O-</option>
            </select>
          </div>

          <div className="flex items-center gap-1 text-xs text-slate-500">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active OPD</option>
              <option value="Inpatient">Inpatient (Admitted)</option>
              <option value="Discharged">Discharged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Patients Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Querying electronic patient records..." />
        ) : patients.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No patients found"
            description="No registered patient records match your current search and filter criteria."
            actionText="Register New Patient"
            onAction={() => setIsRegisterOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">UHID</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Age / Gender</th>
                  <th className="py-3 px-4">Blood Group</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Clinical Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {patients.map((p) => {
                  const age = p.dateOfBirth
                    ? Math.floor((new Date() - new Date(p.dateOfBirth)) / (365.25 * 24 * 60 * 60 * 1000))
                    : 'N/A';
                  return (
                    <tr key={p._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-4 font-bold font-mono text-medical-700">
                        {p.uhid}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-slate-900">
                          {p.firstName} {p.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400">{p.email || 'No email provided'}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {age} yrs • {p.gender}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700 text-[10px] border border-slate-200">
                          {p.bloodGroup}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {p.phone}
                      </td>
                      <td className="py-3 px-4">
                        <Badge>{p.status}</Badge>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => openPatientDetails(p._id)}
                          className="px-3 py-1 bg-medical-50 hover:bg-medical-100 text-medical-700 rounded-lg text-xs font-semibold border border-medical-200 inline-flex items-center gap-1 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View 360° EMR</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Patient 360 Profile & Timeline Modal */}
      <Modal
        isOpen={!!selectedPatientId}
        onClose={() => {
          setSelectedPatientId(null);
          setPatientDetails(null);
        }}
        title={`Patient Health Profile: ${patientDetails?.patient?.firstName || ''} ${patientDetails?.patient?.lastName || ''}`}
        subtitle={`UHID: ${patientDetails?.patient?.uhid || ''} • DOB: ${patientDetails?.patient?.dateOfBirth ? new Date(patientDetails.patient.dateOfBirth).toLocaleDateString() : ''}`}
        maxWidth="max-w-4xl"
      >
        {modalLoading ? (
          <LoadingSpinner text="Loading unified clinical records & timeline..." />
        ) : patientDetails ? (
          <div className="space-y-5">
            {/* Patient Header Summary Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Blood Group</span>
                <span className="font-bold text-slate-800">{patientDetails.patient?.bloodGroup}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Contact Phone</span>
                <span className="font-semibold text-slate-800">{patientDetails.patient?.phone}</span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Emergency Contact</span>
                <span className="font-semibold text-slate-800">
                  {patientDetails.patient?.emergencyContact?.name || 'None'}{' '}
                  {patientDetails.patient?.emergencyContact?.phone ? `(${patientDetails.patient.emergencyContact.phone})` : ''}
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase block">Current Status</span>
                <Badge size="sm">{patientDetails.patient?.status}</Badge>
              </div>
            </div>

            {/* Documented Allergies Warning */}
            {patientDetails.patient?.allergies?.length > 0 && (
              <div className="flex items-center gap-2 p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs">
                <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                <span className="font-medium">Allergies:</span>
                <span>
                  {patientDetails.patient.allergies.map((a) => `${a.substance} (${a.severity})`).join(', ')}
                </span>
              </div>
            )}

            {/* Profile Tabs */}
            <div className="border-b border-slate-200 flex gap-4 text-xs font-semibold">
              <button
                onClick={() => setActiveProfileTab('timeline')}
                className={`pb-2.5 flex items-center gap-1.5 transition-colors ${
                  activeProfileTab === 'timeline'
                    ? 'border-b-2 border-medical-600 text-medical-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Health Timeline ({patientTimeline.length})</span>
              </button>

              <button
                onClick={() => setActiveProfileTab('emr')}
                className={`pb-2.5 flex items-center gap-1.5 transition-colors ${
                  activeProfileTab === 'emr'
                    ? 'border-b-2 border-medical-600 text-medical-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Clinical Notes ({patientDetails.history?.medicalRecords?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveProfileTab('prescriptions')}
                className={`pb-2.5 flex items-center gap-1.5 transition-colors ${
                  activeProfileTab === 'prescriptions'
                    ? 'border-b-2 border-medical-600 text-medical-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <Pill className="w-4 h-4" />
                <span>Prescriptions ({patientDetails.history?.prescriptions?.length || 0})</span>
              </button>

              <button
                onClick={() => setActiveProfileTab('lab')}
                className={`pb-2.5 flex items-center gap-1.5 transition-colors ${
                  activeProfileTab === 'lab'
                    ? 'border-b-2 border-medical-600 text-medical-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <FlaskConical className="w-4 h-4" />
                <span>Lab Reports ({patientDetails.history?.labReports?.length || 0})</span>
              </button>
            </div>

            {/* Tab 1: Chronological Medical Timeline */}
            {activeProfileTab === 'timeline' && (
              <div className="space-y-4 max-h-96 overflow-y-auto pr-2">
                {patientTimeline.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No timeline events recorded yet.</p>
                ) : (
                  patientTimeline.map((item) => (
                    <div key={item.id} className="relative pl-6 border-l-2 border-slate-200 pb-3 last:pb-0">
                      <span className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-medical-600 ring-4 ring-white" />
                      <div className="text-[10px] text-slate-400 font-mono">
                        {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                      <div className="text-xs font-bold text-slate-900 mt-0.5">{item.title}</div>
                      <div className="text-[11px] font-medium text-medical-700">{item.subtitle}</div>
                      <div className="text-xs text-slate-600 mt-1 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                        {item.details}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 2: Clinical EMR Notes */}
            {activeProfileTab === 'emr' && (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {patientDetails.history?.medicalRecords?.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">No clinical consultation notes recorded.</p>
                ) : (
                  patientDetails.history?.medicalRecords?.map((rec) => (
                    <div key={rec._id} className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs text-slate-900 font-mono">{rec.recordNumber}</span>
                        <span className="text-xs text-slate-400">{new Date(rec.visitDate).toLocaleDateString()}</span>
                      </div>
                      <p className="text-xs text-slate-500">Dr. {rec.doctor?.firstName} {rec.doctor?.lastName} ({rec.doctor?.specialization})</p>
                      
                      <div className="grid grid-cols-4 gap-2 bg-slate-50 p-2 rounded-lg text-[11px] text-slate-700">
                        <span>BP: {rec.vitals?.bpSystolic}/{rec.vitals?.bpDiastolic} mmHg</span>
                        <span>Pulse: {rec.vitals?.heartRate} bpm</span>
                        <span>Temp: {rec.vitals?.temperature} °F</span>
                        <span>SpO2: {rec.vitals?.spo2}%</span>
                      </div>

                      <div className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">Chief Complaints:</span> {rec.chiefComplaints}
                      </div>
                      <div className="text-xs text-slate-700">
                        <span className="font-semibold text-slate-900">Diagnoses:</span>{' '}
                        {rec.diagnoses?.map((d) => `${d.description} (${d.code || 'Primary'})`).join(', ')}
                      </div>
                      {rec.treatmentPlan && (
                        <div className="text-xs text-slate-600 bg-sky-50/50 p-2 rounded border border-sky-100">
                          <span className="font-semibold text-sky-900">Treatment Plan:</span> {rec.treatmentPlan}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tab 3: Prescriptions */}
            {activeProfileTab === 'prescriptions' && (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {patientDetails.history?.prescriptions?.map((rx) => (
                  <div key={rx._id} className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs font-mono text-slate-800">{rx.prescriptionNumber}</span>
                      <Badge size="sm">{rx.status}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Authored {new Date(rx.date).toLocaleDateString()} by Dr. {rx.doctor?.firstName} {rx.doctor?.lastName}
                    </p>
                    <div className="mt-2 space-y-1">
                      {rx.medicines?.map((m, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs bg-slate-50 p-2 rounded">
                          <span className="font-semibold text-slate-800">{m.name} ({m.dosage})</span>
                          <span className="text-slate-500 font-mono">{m.frequency} • {m.duration}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Tab 4: Lab Reports */}
            {activeProfileTab === 'lab' && (
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {patientDetails.history?.labReports?.map((lab) => (
                  <div key={lab._id} className="p-3.5 rounded-xl border border-slate-200 bg-white">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">{lab.test?.name}</span>
                      <Badge size="sm">{lab.status}</Badge>
                    </div>
                    <div className="mt-2 space-y-1 text-xs">
                      {lab.results?.map((res, i) => (
                        <div key={i} className="flex items-center justify-between p-1.5 bg-slate-50 rounded">
                          <span className="text-slate-700">{res.parameter}</span>
                          <span className="font-bold text-slate-900">
                            {res.observedValue || 'Pending'} {res.unit} (Ref: {res.normalRange})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* New Patient Registration Modal */}
      <Modal
        isOpen={isRegisterOpen}
        onClose={() => setIsRegisterOpen(false)}
        title="Register New Patient"
        subtitle="Generates an official Unique Health ID (UHID) and initializes an electronic record."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleRegisterSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-700">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Contact Phone *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Date of Birth *</label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500/20 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Gender *</label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500/20 focus:outline-none"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Blood Group</label>
              <select
                value={formData.bloodGroup}
                onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500/20 focus:outline-none"
              >
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="Unknown">Unknown</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Known Allergies</label>
              <input
                type="text"
                placeholder="e.g. Penicillin, Aspirin"
                value={formData.allergies}
                onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-medical-500/20 focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsRegisterOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors"
            >
              Register & Generate UHID
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PatientsPage;
