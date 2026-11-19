import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  FileText,
  HeartPulse,
  Activity,
  Calendar,
  Pill,
  FlaskConical,
  Bed,
  Printer,
  ShieldAlert,
  User,
  Phone,
  Clock,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  Stethoscope,
  CreditCard,
} from 'lucide-react';

const PatientMedicalHistoryPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  const fetchRecord = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/patients/me/record');
      if (res.data.success) {
        setData(res.data);
      } else {
        setError(res.data.message || 'Unable to load medical records.');
      }
    } catch (err) {
      console.error('Error fetching patient self medical record:', err);
      setError(err.response?.data?.message || 'Failed to retrieve electronic medical records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecord();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[500px] flex items-center justify-center">
        <LoadingSpinner text="Retrieving verified Electronic Medical Records..." />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center max-w-lg mx-auto">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <h3 className="text-base font-bold text-rose-900 mb-1">Medical Record Unavailable</h3>
          <p className="text-xs text-rose-700 mb-4">{error || 'No patient record linked to this account.'}</p>
          <button
            onClick={fetchRecord}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all"
          >
            Retry Loading
          </button>
        </div>
      </div>
    );
  }

  const { patient, history, timeline } = data;

  // Filter timeline items according to selected tab
  const filteredTimeline = (timeline || []).filter((item) => {
    if (activeTab === 'all') return true;
    if (activeTab === 'consultations') return item.type === 'CLINICAL_VISIT';
    if (activeTab === 'prescriptions') return item.type === 'PRESCRIPTION';
    if (activeTab === 'lab') return item.type === 'LAB_TEST';
    if (activeTab === 'admissions') return item.type === 'ADMISSION';
    if (activeTab === 'appointments') return item.type === 'APPOINTMENT';
    return true;
  });

  const getTimelineIcon = (type) => {
    switch (type) {
      case 'CLINICAL_VISIT':
        return <Stethoscope className="w-4 h-4 text-medical-600" />;
      case 'PRESCRIPTION':
        return <Pill className="w-4 h-4 text-emerald-600" />;
      case 'LAB_TEST':
        return <FlaskConical className="w-4 h-4 text-amber-600" />;
      case 'ADMISSION':
        return <Bed className="w-4 h-4 text-indigo-600" />;
      case 'APPOINTMENT':
        return <Calendar className="w-4 h-4 text-sky-600" />;
      default:
        return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  const getTimelineBadge = (type) => {
    switch (type) {
      case 'CLINICAL_VISIT':
        return <Badge variant="info">Doctor Consultation</Badge>;
      case 'PRESCRIPTION':
        return <Badge variant="success">Prescription</Badge>;
      case 'LAB_TEST':
        return <Badge variant="warning">Diagnostic Lab</Badge>;
      case 'ADMISSION':
        return <Badge variant="default">Inpatient Admission</Badge>;
      case 'APPOINTMENT':
        return <Badge variant="outline">OPD Appointment</Badge>;
      default:
        return <Badge variant="outline">Clinical Event</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header and Print Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Electronic Medical History & Timeline</h2>
          <p className="text-xs text-slate-500">
            Comprehensive chronological health records, clinical diagnoses, vitals, prescriptions, and laboratory reports
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto print:hidden">
          <Link
            to="/patient/appointments"
            className="px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-3.5 h-3.5 text-medical-600" />
            <span>Book Visit</span>
          </Link>
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Health Record</span>
          </button>
        </div>
      </div>

      {/* Patient Digital Health Card */}
      <div className="bg-gradient-to-br from-medical-900 via-slate-900 to-sky-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        {/* Background Decorative Rings */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-medical-500/10 pointer-events-none blur-2xl" />
        <div className="absolute bottom-0 right-32 -mb-20 w-48 h-48 rounded-full bg-sky-500/10 pointer-events-none blur-xl" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Identity & Blood Group */}
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-xl font-black text-white shrink-0 shadow-inner">
              {patient.bloodGroup || 'O+'}
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight">
                  {patient.firstName} {patient.lastName}
                </h3>
                <span className="px-2.5 py-0.5 rounded-full bg-medical-500/30 border border-medical-400/40 text-[11px] font-semibold uppercase tracking-wider text-medical-200">
                  {patient.uhid}
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1 flex items-center gap-3 flex-wrap">
                <span>{patient.gender || 'Not specified'}</span>
                <span>•</span>
                <span>
                  DOB: {patient.dateOfBirth ? new Date(patient.dateOfBirth).toLocaleDateString() : 'N/A'}
                </span>
                <span>•</span>
                <span>Phone: {patient.phone || 'N/A'}</span>
                <span>•</span>
                <span>Status: <strong className="text-emerald-300 font-medium">{patient.status || 'Active'}</strong></span>
              </p>
            </div>
          </div>

          {/* Quick Metrics Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3 text-center">
              <span className="block text-[11px] font-medium text-slate-300">Consultations</span>
              <span className="text-lg font-bold text-white">{history?.medicalRecords?.length || 0}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3 text-center">
              <span className="block text-[11px] font-medium text-slate-300">Prescriptions</span>
              <span className="text-lg font-bold text-white">{history?.prescriptions?.length || 0}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3 text-center">
              <span className="block text-[11px] font-medium text-slate-300">Lab Reports</span>
              <span className="text-lg font-bold text-white">{history?.labReports?.length || 0}</span>
            </div>
            <div className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-3 text-center">
              <span className="block text-[11px] font-medium text-slate-300">Admissions</span>
              <span className="text-lg font-bold text-white">{history?.admissions?.length || 0}</span>
            </div>
          </div>
        </div>

        {/* Safety & Clinical Details: Allergies & Emergency Contact */}
        <div className="relative z-10 mt-6 pt-6 border-t border-white/10 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-rose-300 block mb-0.5">Known Allergies & Clinical Alerts:</span>
              {patient.allergies?.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {patient.allergies.map((allg, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-rose-500/20 border border-rose-400/30 text-[11px] font-medium text-rose-200"
                    >
                      {typeof allg === 'string' ? allg : `${allg.substance} (${allg.severity || 'Moderate'})`}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-slate-300">No known drug or environmental allergies documented.</span>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2.5">
            <User className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-sky-300 block mb-0.5">Emergency Contact:</span>
              <span className="text-slate-200">
                {patient.emergencyContact?.name
                  ? `${patient.emergencyContact.name} (${patient.emergencyContact.relationship || 'Next of kin'}) • ${patient.emergencyContact.phone || 'No phone'}`
                  : 'No designated emergency contact on file.'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-2xl border border-slate-200/80 max-w-fit overflow-x-auto print:hidden">
        {[
          { key: 'all', label: `All Events (${timeline?.length || 0})` },
          { key: 'consultations', label: `Consultations (${history?.medicalRecords?.length || 0})` },
          { key: 'prescriptions', label: `Prescriptions (${history?.prescriptions?.length || 0})` },
          { key: 'lab', label: `Lab Reports (${history?.labReports?.length || 0})` },
          { key: 'admissions', label: `Admissions (${history?.admissions?.length || 0})` },
          { key: 'appointments', label: `Appointments (${history?.appointments?.length || 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap ${
              activeTab === tab.key
                ? 'bg-white text-medical-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Chronological Timeline Feed */}
      <div className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-sm">
        {filteredTimeline.length === 0 ? (
          <EmptyState
            title="No Records in this Category"
            description="No clinical events or medical history records have been documented under this view."
          />
        ) : (
          <div className="relative border-l-2 border-slate-100 ml-4 pl-6 space-y-6">
            {filteredTimeline.map((item) => (
              <div key={item.id} className="relative group">
                {/* Timeline Node Bullet */}
                <div className="absolute -left-[35px] top-1 w-8 h-8 rounded-full bg-slate-50 border-2 border-medical-500 flex items-center justify-center shadow-sm">
                  {getTimelineIcon(item.type)}
                </div>

                {/* Content Card */}
                <div className="bg-slate-50/70 hover:bg-slate-50 border border-slate-200/80 rounded-2xl p-4 transition-all">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{item.title}</h4>
                      {getTimelineBadge(item.type)}
                    </div>
                    <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(item.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>

                  <p className="text-xs font-semibold text-medical-700 mb-1">{item.subtitle}</p>
                  <p className="text-xs text-slate-600 mb-2 leading-relaxed">{item.details}</p>

                  {/* Vitals summary if clinical visit */}
                  {item.vitals && Object.keys(item.vitals).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      {item.vitals.bpSystolic && (
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">Blood Pressure</span>
                          <span className="font-bold text-slate-800">
                            {item.vitals.bpSystolic}/{item.vitals.bpDiastolic} mmHg
                          </span>
                        </div>
                      )}
                      {item.vitals.heartRate && (
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">Heart Rate</span>
                          <span className="font-bold text-slate-800">{item.vitals.heartRate} bpm</span>
                        </div>
                      )}
                      {item.vitals.temperature && (
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">Temperature</span>
                          <span className="font-bold text-slate-800">{item.vitals.temperature} °F</span>
                        </div>
                      )}
                      {item.vitals.spo2 && (
                        <div className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-100">
                          <span className="text-[10px] text-slate-400 block">Oxygen SpO2</span>
                          <span className="font-bold text-slate-800">{item.vitals.spo2}%</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Medicines list if prescription */}
                  {item.medicines?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                        Prescribed Regimen:
                      </span>
                      <div className="space-y-1">
                        {item.medicines.map((m, mIdx) => (
                          <div
                            key={mIdx}
                            className="bg-white px-3 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs"
                          >
                            <span className="font-medium text-slate-800">{m.name}</span>
                            <span className="text-slate-500">
                              {m.dosage} • {m.frequency} • {m.duration}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Lab results summary if lab test */}
                  {item.results?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-200/80">
                      <span className="text-[11px] font-semibold text-slate-700 block mb-1.5">
                        Laboratory Parameters:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {item.results.map((r, rIdx) => (
                          <div
                            key={rIdx}
                            className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center justify-between text-xs"
                          >
                            <span className="text-slate-700 font-medium">{r.parameter}</span>
                            <span className="font-bold text-slate-900">
                              {r.observedValue || 'Pending'} {r.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientMedicalHistoryPage;
