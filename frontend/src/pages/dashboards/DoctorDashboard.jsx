import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  ArrowRight,
  Stethoscope,
  FileText,
  AlertCircle,
  Bed,
  FlaskConical,
  Pill,
  Search,
  Eye,
  Plus,
  HeartPulse,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const DoctorDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('queue'); // 'queue' | 'labs' | 'prescriptions' | 'inpatients'

  // Quick Patient EMR Inspection Modal State
  const [selectedPatientModal, setSelectedPatientModal] = useState(null);
  const [patientHistoryLoading, setPatientHistoryLoading] = useState(false);
  const [patientHistoryData, setPatientHistoryData] = useState(null);

  const fetchDoctorSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/doctor-summary');
      if (res.data.success) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error('Failed to load doctor workbench summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDoctorSummary();
  }, []);

  const openPatientHistory = async (patientId) => {
    try {
      setSelectedPatientModal(patientId);
      setPatientHistoryLoading(true);
      const res = await api.get(`/patients/${patientId}`);
      if (res.data.success) {
        setPatientHistoryData(res.data);
      }
    } catch (err) {
      console.error('Error fetching patient history:', err);
    } finally {
      setPatientHistoryLoading(false);
    }
  };

  const handleCheckIn = async (appointmentId) => {
    try {
      const res = await api.patch(`/appointments/${appointmentId}/check-in`);
      if (res.data.success) {
        fetchDoctorSummary();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Check-in failed');
    }
  };

  if (loading && !summaryData) return <LoadingSpinner text="Loading OPD queue, inpatient census, and lab orders..." />;

  const doc = summaryData?.doctor || {};
  const stats = summaryData?.stats || {};
  const todayAppointments = summaryData?.todayAppointments || [];
  const admissions = summaryData?.admissions || [];
  const pendingLabOrders = summaryData?.pendingLabOrders || [];
  const recentPrescriptions = summaryData?.recentPrescriptions || [];

  return (
    <div className="space-y-6">
      {/* Doctor Header Banner */}
      <div className="bg-gradient-to-r from-medical-900 via-sky-800 to-medical-800 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-sky-900">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
              Doctor Clinical Workbench
            </span>
            <span className="text-xs text-sky-200 font-mono">ID: {doc.doctorId || 'DOC-001'}</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight">
            Welcome, {doc.name || user?.name}
          </h2>
          <p className="text-xs text-sky-100 mt-1 flex flex-wrap items-center gap-2">
            <span className="font-semibold text-white">{doc.specialization || 'Clinical Specialist'}</span>
            <span>•</span>
            <span>Dept of {doc.department || 'Medicine'}</span>
            <span>•</span>
            <span>Clinic Room: <strong className="text-white">{doc.roomNumber || 'OPD-101'}</strong></span>
            <span>•</span>
            <span>Fee: <strong className="text-white">${doc.consultationFee || 100}</strong></span>
          </p>
        </div>

        {/* Action Triggers */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => navigate('/doctor/emr')}
            className="px-4 py-2.5 bg-white text-medical-900 hover:bg-sky-50 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
          >
            <Stethoscope className="w-4 h-4 text-medical-600" />
            <span>New Consultation</span>
          </button>
          <button
            onClick={() => navigate('/doctor/prescriptions')}
            className="px-4 py-2.5 bg-sky-700/80 hover:bg-sky-600 border border-sky-400/30 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Pill className="w-4 h-4 text-sky-200" />
            <span>Write Rx</span>
          </button>
          <button
            onClick={() => navigate('/doctor/lab')}
            className="px-4 py-2.5 bg-sky-700/80 hover:bg-sky-600 border border-sky-400/30 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <FlaskConical className="w-4 h-4 text-sky-200" />
            <span>Order Lab</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's OPD Queue"
          value={stats.todayTotal || 0}
          subtitle={`${stats.todayPending || 0} awaiting clinical encounter`}
          icon={Calendar}
          color="blue"
          onClick={() => setActiveTab('queue')}
        />

        <StatCard
          title="Completed Today"
          value={stats.todayCompleted || 0}
          subtitle="Consulted & prescriptions issued"
          icon={CheckCircle2}
          color="emerald"
          onClick={() => setActiveTab('queue')}
        />

        <StatCard
          title="Active Inpatient Rounds"
          value={stats.activeInpatients || 0}
          subtitle="Hospitalized under your supervision"
          icon={Bed}
          color="amber"
          onClick={() => setActiveTab('inpatients')}
        />

        <StatCard
          title="Pending Lab Tests"
          value={stats.pendingLabCount || 0}
          subtitle="Diagnostic specimens in pipeline"
          icon={FlaskConical}
          color="purple"
          onClick={() => setActiveTab('labs')}
        />
      </div>

      {/* Doctor Navigation Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto">
        {[
          { id: 'queue', label: `Today's OPD Queue (${todayAppointments.length})`, icon: Calendar },
          { id: 'labs', label: `Pending Lab Orders (${pendingLabOrders.length})`, icon: FlaskConical },
          { id: 'prescriptions', label: `Recent Prescriptions (${recentPrescriptions.length})`, icon: Pill },
          { id: 'inpatients', label: `Inpatient Census (${admissions.length})`, icon: Bed },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-medical-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200/80'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Today's Live OPD Queue */}
      {activeTab === 'queue' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Today's Patient Queue</h3>
              <p className="text-xs text-slate-500">Live outpatient consults in order of scheduled token number</p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-100">
              {todayAppointments.length} Total Patients Today
            </span>
          </div>

          {todayAppointments.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No outpatient appointments booked for today's OPD session.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Token #</th>
                    <th className="py-2.5 px-3">Patient Details</th>
                    <th className="py-2.5 px-3">Slot Time</th>
                    <th className="py-2.5 px-3">Chief Complaint</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Clinical Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {todayAppointments.map((apt) => (
                    <tr key={apt._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-bold text-slate-900">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 font-mono text-xs">
                          #{apt.queueNumber}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">
                          {apt.patient?.firstName} {apt.patient?.lastName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {apt.patient?.uhid} • {apt.patient?.gender}, {apt.patient?.bloodGroup}
                        </div>
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-600">
                        <span className="inline-flex items-center gap-1 font-mono">
                          <Clock className="w-3 h-3 text-slate-400" />
                          {apt.timeSlot}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                        {apt.reason}
                      </td>
                      <td className="py-3 px-3">
                        {apt.status === 'Checked-In' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-100 text-sky-800 border border-sky-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse"></span>
                            Checked In
                          </span>
                        ) : apt.status === 'Confirmed' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-50 text-amber-800 border border-amber-200">
                            Awaiting Arrival
                          </span>
                        ) : (
                          <Badge>{apt.status}</Badge>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openPatientHistory(apt.patient?._id)}
                            title="Inspect Medical History"
                            className="p-1.5 text-slate-500 hover:text-medical-600 hover:bg-medical-50 rounded-lg transition-colors border border-slate-200"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {apt.status === 'Confirmed' && (
                            <button
                              onClick={() => handleCheckIn(apt._id)}
                              title="Mark Patient Checked In"
                              className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded-lg text-xs font-semibold border border-sky-200 transition-colors"
                            >
                              Arrived
                            </button>
                          )}
                          {apt.status !== 'Completed' ? (
                            <button
                              onClick={() =>
                                navigate(`/doctor/emr?patientId=${apt.patient?._id}&appointmentId=${apt._id}`)
                              }
                              className={`px-3 py-1 rounded-lg text-xs font-semibold shadow-sm transition-all flex items-center gap-1 ${
                                apt.status === 'Checked-In'
                                  ? 'bg-medical-600 hover:bg-medical-700 text-white ring-2 ring-medical-500/30'
                                  : 'bg-slate-700 hover:bg-slate-800 text-white'
                              }`}
                            >
                              <Stethoscope className="w-3 h-3" />
                              <span>Consult</span>
                            </button>
                          ) : (
                            <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Done
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Pending Lab Reports */}
      {activeTab === 'labs' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Laboratory Diagnostic Orders</h3>
              <p className="text-xs text-slate-500">Diagnostic tests ordered by you awaiting analysis or results</p>
            </div>
            <button
              onClick={() => navigate('/doctor/lab')}
              className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
            >
              <span>Order New Test</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {pendingLabOrders.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No laboratory diagnostic test orders currently active.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-100">
                  <tr>
                    <th className="py-2.5 px-3">Order #</th>
                    <th className="py-2.5 px-3">Patient</th>
                    <th className="py-2.5 px-3">Test Name & Category</th>
                    <th className="py-2.5 px-3">Ordered Date</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pendingLabOrders.map((lab) => (
                    <tr key={lab._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {lab.reportNumber}
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-semibold text-slate-900">
                          {lab.patient?.firstName} {lab.patient?.lastName}
                        </span>
                        <div className="text-[10px] text-slate-400 font-mono">{lab.patient?.uhid}</div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{lab.test?.name}</div>
                        <div className="text-[10px] text-slate-400">{lab.test?.category}</div>
                      </td>
                      <td className="py-3 px-3 text-slate-500">
                        {new Date(lab.requestedDate).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-3">
                        <Badge>{lab.status}</Badge>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => navigate('/doctor/lab')}
                          className="px-2.5 py-1 text-xs font-semibold text-medical-600 bg-medical-50 hover:bg-medical-100 rounded-lg transition-colors"
                        >
                          View Results
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Recent Prescriptions Authored */}
      {activeTab === 'prescriptions' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Recent e-Prescriptions Authored</h3>
              <p className="text-xs text-slate-500">Official medical prescriptions issued from your workbench</p>
            </div>
            <button
              onClick={() => navigate('/doctor/prescriptions')}
              className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
            >
              <span>Prescription Hub</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {recentPrescriptions.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No prescriptions authored yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {recentPrescriptions.map((rx) => (
                <div key={rx._id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-medical-800 bg-medical-50 px-2 py-0.5 rounded border border-medical-200">
                      {rx.prescriptionNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">{new Date(rx.date).toLocaleDateString()}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800 mt-2">
                    Patient: {rx.patient?.firstName} {rx.patient?.lastName} ({rx.patient?.uhid})
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {rx.medicines?.map((m, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 font-medium">
                        {m.name} ({m.dosage})
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Inpatient Ward Rounds */}
      {activeTab === 'inpatients' && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Inpatient Ward Rounds Census</h3>
              <p className="text-xs text-slate-500">Hospitalized patients currently assigned under your direct clinical care</p>
            </div>
            <button
              onClick={() => navigate('/doctor/wards')}
              className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
            >
              <span>Bed Management</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {admissions.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-400">
              No active inpatients admitted under your care currently.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {admissions.map((adm) => (
                <div
                  key={adm._id}
                  className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs text-slate-900">
                        {adm.patient?.firstName} {adm.patient?.lastName}
                      </span>
                      <Badge size="sm">{adm.bed?.bedNumber || 'Bed'}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      {adm.ward?.name} ({adm.ward?.floor}) • Admitted: {new Date(adm.admissionDate).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-slate-700 font-medium mt-2 bg-white p-2 rounded-lg border border-slate-200">
                      Admission Diagnosis: {adm.admissionDiagnosis}
                    </p>
                  </div>
                  <div className="mt-3 pt-2 border-t border-slate-200 flex justify-end">
                    <button
                      onClick={() => openPatientHistory(adm.patient?._id)}
                      className="text-xs font-semibold text-medical-600 hover:underline flex items-center gap-1"
                    >
                      <Eye className="w-3 h-3" /> View Patient Chart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick Patient EMR Inspection Modal */}
      <Modal
        isOpen={!!selectedPatientModal}
        onClose={() => {
          setSelectedPatientModal(null);
          setPatientHistoryData(null);
        }}
        title="Patient Comprehensive Health Chart (360° EMR)"
        maxWidth="max-w-3xl"
      >
        {patientHistoryLoading ? (
          <div className="py-12">
            <LoadingSpinner text="Retrieving comprehensive clinical timeline..." />
          </div>
        ) : patientHistoryData ? (
          <div className="space-y-4">
            {/* Patient Header Summary */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h4 className="font-bold text-sm text-slate-900">
                  {patientHistoryData.patient?.firstName} {patientHistoryData.patient?.lastName}
                </h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  UHID: {patientHistoryData.patient?.uhid} • Blood: {patientHistoryData.patient?.bloodGroup} • Gender: {patientHistoryData.patient?.gender}
                </p>
              </div>
              <button
                onClick={() => {
                  setSelectedPatientModal(null);
                  navigate(`/doctor/emr?patientId=${patientHistoryData.patient?._id}`);
                }}
                className="px-3 py-1.5 bg-medical-600 text-white rounded-lg text-xs font-bold shadow-sm"
              >
                Open in Full Consultation EMR
              </button>
            </div>

            {/* Medical Records Summary */}
            <div>
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-medical-600" />
                <span>Recent Clinical Encounters</span>
              </h5>
              {(patientHistoryData.history?.medicalRecords || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No prior consultations recorded.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {patientHistoryData.history?.medicalRecords?.map((rec) => (
                    <div key={rec._id} className="p-2.5 rounded-lg border border-slate-200 bg-white text-xs">
                      <div className="flex items-center justify-between font-semibold text-slate-800">
                        <span>Visit: {new Date(rec.visitDate).toLocaleDateString()}</span>
                        <span className="font-mono text-[10px] text-slate-400">{rec.recordNumber}</span>
                      </div>
                      <p className="text-slate-600 mt-1">Chief Complaints: {rec.chiefComplaints}</p>
                      <p className="text-slate-600">Diagnoses: {rec.diagnoses?.map((d) => d.description).join(', ')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Prescriptions Summary */}
            <div>
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-emerald-600" />
                <span>Active Prescriptions</span>
              </h5>
              {(patientHistoryData.history?.prescriptions || []).length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No active prescriptions.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {patientHistoryData.history?.prescriptions?.flatMap((rx) => rx.medicines || [])?.map((med, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium">
                      {med.name} - {med.dosage} ({med.frequency})
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
};

export default DoctorDashboard;
