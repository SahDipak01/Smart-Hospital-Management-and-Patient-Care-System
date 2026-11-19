import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge';
import {
  FileText,
  Activity,
  Heart,
  User,
  CheckCircle,
  Plus,
  Trash2,
  Stethoscope,
  Pill,
  FlaskConical,
} from 'lucide-react';

const EMRConsultationPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const prePatientId = searchParams.get('patientId');
  const preAppointmentId = searchParams.get('appointmentId');

  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(prePatientId || '');
  const [patientProfile, setPatientProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [submittedRecord, setSubmittedRecord] = useState(null);

  // Form State
  const [vitals, setVitals] = useState({
    bpSystolic: 120,
    bpDiastolic: 80,
    heartRate: 72,
    temperature: 98.6,
    spo2: 99,
    respiratoryRate: 16,
    weightKg: 70,
    heightCm: 172,
    bmi: 23.7,
  });

  const [chiefComplaints, setChiefComplaints] = useState('');
  const [clinicalObservations, setClinicalObservations] = useState('');
  const [diagnoses, setDiagnoses] = useState([
    { code: '', description: '', type: 'Primary' },
  ]);
  const [treatmentPlan, setTreatmentPlan] = useState('');
  const [notes, setNotes] = useState('');

  // Auto-calculate BMI
  useEffect(() => {
    if (vitals.weightKg > 0 && vitals.heightCm > 0) {
      const heightM = vitals.heightCm / 100;
      const calculatedBmi = Math.round((vitals.weightKg / (heightM * heightM)) * 10) / 10;
      setVitals((prev) => ({ ...prev, bmi: calculatedBmi }));
    }
  }, [vitals.weightKg, vitals.heightCm]);

  useEffect(() => {
    const loadPatients = async () => {
      try {
        const res = await api.get('/patients?limit=100');
        if (res.data.success) setPatients(res.data.patients);
      } catch (err) {
        console.error(err);
      }
    };
    loadPatients();
  }, []);

  useEffect(() => {
    if (selectedPatient) {
      const loadPatient = async () => {
        try {
          const res = await api.get(`/patients/${selectedPatient}`);
          if (res.data.success) setPatientProfile(res.data.patient);
        } catch (err) {
          console.error(err);
        }
      };
      loadPatient();
    } else {
      setPatientProfile(null);
    }
  }, [selectedPatient]);

  useEffect(() => {
    if (selectedPatient) {
      const savedDraft = localStorage.getItem(`emr_draft_${selectedPatient}`);
      if (savedDraft) {
        try {
          const draft = JSON.parse(savedDraft);
          if (draft.chiefComplaints) setChiefComplaints(draft.chiefComplaints);
          if (draft.clinicalObservations) setClinicalObservations(draft.clinicalObservations);
          if (draft.treatmentPlan) setTreatmentPlan(draft.treatmentPlan);
          if (draft.notes) setNotes(draft.notes);
          if (draft.vitals) setVitals((prev) => ({ ...prev, ...draft.vitals }));
          if (draft.diagnoses && draft.diagnoses.length) setDiagnoses(draft.diagnoses);
        } catch {
          // Ignore corrupted draft
        }
      }
    }
  }, [selectedPatient]);

  useEffect(() => {
    if (selectedPatient && (chiefComplaints || clinicalObservations || treatmentPlan || notes)) {
      const draftData = { chiefComplaints, clinicalObservations, treatmentPlan, notes, vitals, diagnoses };
      localStorage.setItem(`emr_draft_${selectedPatient}`, JSON.stringify(draftData));
    }
  }, [selectedPatient, chiefComplaints, clinicalObservations, treatmentPlan, notes, vitals, diagnoses]);

  const addDiagnosisRow = () => {
    setDiagnoses([...diagnoses, { code: '', description: '', type: 'Secondary' }]);
  };

  const removeDiagnosisRow = (index) => {
    setDiagnoses(diagnoses.filter((_, i) => i !== index));
  };

  const updateDiagnosis = (index, field, value) => {
    const updated = [...diagnoses];
    updated[index][field] = value;
    setDiagnoses(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        patientId: selectedPatient,
        appointmentId: preAppointmentId || null,
        vitals,
        chiefComplaints,
        clinicalObservations,
        diagnoses: diagnoses.filter((d) => d.description.trim() !== ''),
        treatmentPlan,
        notes,
      };

      const res = await api.post('/medical-records', payload);
      if (res.data.success) {
        setSubmittedRecord(res.data.record);
        if (selectedPatient) {
          localStorage.removeItem(`emr_draft_${selectedPatient}`);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit clinical consultation record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Clinical Consultation & EMR Encounter</h2>
        <p className="text-xs text-slate-500">Document patient complaints, physiological vitals, clinical observations, and diagnosis</p>
      </div>

      {submittedRecord ? (
        <div className="bg-white p-8 rounded-2xl border border-slate-200/80 shadow-md text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-50/50">
            <CheckCircle className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900">Encounter Documented Successfully</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Official EMR Record <span className="font-mono font-bold text-slate-800">#{submittedRecord.recordNumber}</span> has been committed to the patient's medical history.
          </p>

          <div className="flex flex-wrap justify-center gap-3 pt-4 border-t border-slate-100">
            <button
              onClick={() =>
                navigate(`/doctor/prescriptions?patientId=${selectedPatient}&medicalRecordId=${submittedRecord._id}`)
              }
              className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
            >
              <Pill className="w-4 h-4" />
              <span>Write e-Prescription</span>
            </button>

            <button
              onClick={() =>
                navigate(`/doctor/lab?patientId=${selectedPatient}`)
              }
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Order Lab Tests</span>
            </button>

            <button
              onClick={() => {
                setSubmittedRecord(null);
                setChiefComplaints('');
                setClinicalObservations('');
                setTreatmentPlan('');
              }}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 text-xs font-medium"
            >
              Start Next Patient Encounter
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Patient Selection Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              1. Select Patient for Clinical Encounter
            </label>

            <select
              required
              value={selectedPatient}
              onChange={(e) => setSelectedPatient(e.target.value)}
              className="block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20"
            >
              <option value="">Select Patient by UHID or Name</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.firstName} {p.lastName} (UHID: {p.uhid}) • {p.gender}, {p.bloodGroup} • {p.phone}
                </option>
              ))}
            </select>

            {patientProfile && (
              <div className="space-y-2 mt-2">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-sky-50/50 p-3 rounded-xl border border-sky-100 text-xs">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Full Name</span>
                    <span className="font-semibold text-slate-900">{patientProfile.firstName} {patientProfile.lastName}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">UHID</span>
                    <span className="font-mono font-bold text-medical-700">{patientProfile.uhid}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Blood Group</span>
                    <span className="font-bold text-slate-800">{patientProfile.bloodGroup}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Status</span>
                    <span className="font-semibold text-emerald-700">{patientProfile.status || 'Active'}</span>
                  </div>
                </div>

                {/* Prominent Allergy Safety Alert Banner */}
                {patientProfile.allergies?.length > 0 && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-900">
                    <span className="text-sm">⚠️</span>
                    <div>
                      <span className="font-bold uppercase tracking-wider text-[11px] text-rose-800 block">
                        Contraindication & Allergy Safety Alert:
                      </span>
                      <p className="mt-0.5 font-medium">
                        Documented Allergies: {patientProfile.allergies.map(a => typeof a === 'string' ? a : `${a.substance} (${a.severity || 'Moderate'})`).join(', ')}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Physiological Vitals Panel */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                2. Physiological Vitals & Biometrics
              </label>
              <span className="text-[11px] font-semibold text-medical-600">
                Auto-calculated BMI: {vitals.bmi} kg/m²
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-[11px] text-slate-500">BP Systolic (mmHg)</label>
                <input
                  type="number"
                  value={vitals.bpSystolic}
                  onChange={(e) => setVitals({ ...vitals, bpSystolic: Number(e.target.value) })}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500">BP Diastolic (mmHg)</label>
                <input
                  type="number"
                  value={vitals.bpDiastolic}
                  onChange={(e) => setVitals({ ...vitals, bpDiastolic: Number(e.target.value) })}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500">Heart Rate (bpm)</label>
                <input
                  type="number"
                  value={vitals.heartRate}
                  onChange={(e) => setVitals({ ...vitals, heartRate: Number(e.target.value) })}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500">Temperature (°F)</label>
                <input
                  type="number"
                  step="0.1"
                  value={vitals.temperature}
                  onChange={(e) => setVitals({ ...vitals, temperature: Number(e.target.value) })}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500">SpO2 Oxygen (%)</label>
                <input
                  type="number"
                  value={vitals.spo2}
                  onChange={(e) => setVitals({ ...vitals, spo2: Number(e.target.value) })}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500">Resp Rate (/min)</label>
                <input
                  type="number"
                  value={vitals.respiratoryRate}
                  onChange={(e) => setVitals({ ...vitals, respiratoryRate: Number(e.target.value) })}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500">Weight (kg)</label>
                <input
                  type="number"
                  value={vitals.weightKg}
                  onChange={(e) => setVitals({ ...vitals, weightKg: Number(e.target.value) })}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-500">Height (cm)</label>
                <input
                  type="number"
                  value={vitals.heightCm}
                  onChange={(e) => setVitals({ ...vitals, heightCm: Number(e.target.value) })}
                  className="mt-1 w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Clinical Symptoms and Observations */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              3. Clinical Examination & Chief Complaints
            </label>

            <div>
              <label className="block text-xs font-medium text-slate-700">Chief Complaints *</label>
              <textarea
                required
                rows={2}
                value={chiefComplaints}
                onChange={(e) => setChiefComplaints(e.target.value)}
                placeholder="Patient-reported symptoms, onset, duration, and precipitating factors..."
                className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Clinical Observations & Physical Exam</label>
              <textarea
                rows={2}
                value={clinicalObservations}
                onChange={(e) => setClinicalObservations(e.target.value)}
                placeholder="Auscultation, palpation, chest findings, neurological reflexes..."
                className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          {/* Diagnoses Matrix */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                4. Doctor Diagnoses (ICD Classification)
              </label>
              <button
                type="button"
                onClick={addDiagnosisRow}
                className="text-xs text-medical-600 hover:text-medical-800 font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Secondary Diagnosis
              </button>
            </div>

            <div className="space-y-2">
              {diagnoses.map((diag, index) => (
                <div key={index} className="flex items-center gap-2">
                  <select
                    value={diag.type}
                    onChange={(e) => updateDiagnosis(index, 'type', e.target.value)}
                    className="w-28 px-2 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Secondary">Secondary</option>
                    <option value="Differential">Differential</option>
                  </select>

                  <input
                    type="text"
                    required
                    placeholder="Diagnosis description (e.g. Essential Hypertension, Bronchitis)"
                    value={diag.description}
                    onChange={(e) => updateDiagnosis(index, 'description', e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                  />

                  <input
                    type="text"
                    placeholder="ICD Code (e.g. I10)"
                    value={diag.code}
                    onChange={(e) => updateDiagnosis(index, 'code', e.target.value)}
                    className="w-24 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg font-mono"
                  />

                  {diagnoses.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeDiagnosisRow(index)}
                      className="p-1.5 text-rose-500 hover:bg-rose-50 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Treatment Plan */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
              5. Treatment Protocol & Clinical Advice
            </label>
            <textarea
              rows={2}
              value={treatmentPlan}
              onChange={(e) => setTreatmentPlan(e.target.value)}
              placeholder="Recommended therapies, dietary advice, follow-up instructions..."
              className="mt-1 w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="submit"
              disabled={loading || !selectedPatient}
              className="px-6 py-2.5 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50 transition-colors"
            >
              {loading ? 'Submitting Clinical Record...' : 'Finalize & Commit Encounter'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default EMRConsultationPage;
