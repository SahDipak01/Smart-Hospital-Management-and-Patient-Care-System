import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  HeartPulse,
  AlertTriangle,
  Mic,
  MicOff,
  Send,
  Building,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldAlert,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const COMMON_SYMPTOMS = [
  'Fever & Chills',
  'Severe chest pain',
  'Shortness of breath',
  'Persistent Cough',
  'Throbbing Headache',
  'Dizziness or Lightheadedness',
  'Heart Palpitations',
  'Abdominal Cramps',
  'Joint Pain or Stiffness',
  'Numbness or Tingling',
  'Extreme Fatigue',
  'Skin Rash or Itching',
];

const SymptomTriagePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [selectedSymptoms, setSelectedSymptoms] = useState([]);
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recognitionSupported, setRecognitionSupported] = useState(false);
  const [loading, setLoading] = useState(false);
  const [assessmentResult, setAssessmentResult] = useState(null);
  const [triageHistory, setTriageHistory] = useState([]);

  // Check Web Speech API support
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      setRecognitionSupported(true);
    }
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/triage/history');
      if (res.data.success) {
        setTriageHistory(res.data.history);
      }
    } catch {
      // Ignore background error
    }
  };

  const toggleSymptom = (sym) => {
    if (selectedSymptoms.includes(sym)) {
      setSelectedSymptoms(selectedSymptoms.filter((s) => s !== sym));
    } else {
      setSelectedSymptoms([...selectedSymptoms, sym]);
    }
  };

  const toggleVoiceRecording = () => {
    if (!recognitionSupported) return;

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';

    recognition.onstart = () => setIsRecording(true);
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setChiefComplaint((prev) => (prev ? `${prev} ${transcript}` : transcript));
      setIsRecording(false);
    };
    recognition.onerror = () => setIsRecording(false);
    recognition.onend = () => setIsRecording(false);

    recognition.start();
  };

  const handleAssessSubmit = async (e) => {
    e.preventDefault();
    if (!chiefComplaint && selectedSymptoms.length === 0) {
      alert('Please select at least one symptom or describe your complaint.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        chiefComplaint: chiefComplaint || selectedSymptoms.join(', '),
        symptoms: selectedSymptoms.map((s) => ({
          name: s,
          severity: s.toLowerCase().includes('severe') ? 'Severe' : 'Moderate',
        })),
      };

      const res = await api.post('/triage/assess', payload);
      if (res.data.success) {
        setAssessmentResult(res.data.triage);
        fetchHistory();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Triage assessment failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Smart Symptom Reporting & Triage</h2>
        <p className="text-xs text-slate-500">
          Algorithmic preliminary severity evaluation, emergency red-flag detection, and specialty department routing
        </p>
      </div>

      {/* Prominent Clinical Disclaimer */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs">
        <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">CLINICAL SAFETY DISCLAIMER:</span>
          <p className="mt-0.5 text-amber-800">
            This automated symptom triage tool provides preliminary educational guidance and does NOT constitute a confirmed medical diagnosis, prescription, or clinical evaluation. If you are experiencing crushing chest pain, difficulty breathing, or sudden numbness, call 911 or visit the emergency room immediately.
          </p>
        </div>
      </div>

      {assessmentResult ? (
        <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-md space-y-5 animate-in fade-in duration-200">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[10px] font-mono text-slate-400">
                Triage Reference: #{assessmentResult.triageNumber}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">Preliminary Triage Assessment</h3>
            </div>
            <Badge size="lg">{assessmentResult.severityLevel}</Badge>
          </div>

          {/* Red Flag Warning */}
          {assessmentResult.emergencyFlags?.length > 0 && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 space-y-1">
              <div className="flex items-center gap-2 font-bold text-xs text-rose-800">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                <span>CRITICAL EMERGENCY RED FLAGS IDENTIFIED:</span>
              </div>
              <ul className="list-disc pl-5 text-xs text-rose-800 space-y-0.5 font-medium">
                {assessmentResult.emergencyFlags.map((flag, idx) => (
                  <li key={idx}>{flag}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Guidance and Recommendation */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs space-y-3">
            <div>
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Guidance & Assessment</span>
              <p className="text-slate-800 font-medium mt-1 leading-relaxed">{assessmentResult.guidance}</p>
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-bold block">Recommended Specialty</span>
                <span className="text-sm font-bold text-medical-700 flex items-center gap-1.5 mt-0.5">
                  <Building className="w-4 h-4" />
                  <span>{assessmentResult.recommendedDepartment}</span>
                </span>
              </div>

              <button
                onClick={() => navigate('/patient/appointments')}
                className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-md transition-colors flex items-center gap-1.5"
              >
                <span>Book Appointment</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex justify-center pt-2">
            <button
              onClick={() => {
                setAssessmentResult(null);
                setChiefComplaint('');
                setSelectedSymptoms([]);
              }}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
            >
              Perform New Symptom Check
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleAssessSubmit} className="space-y-6 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          {/* Quick Symptoms Multi-select */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
              1. Select Any Applicable Symptoms
            </label>
            <div className="flex flex-wrap gap-2">
              {COMMON_SYMPTOMS.map((sym) => {
                const isSelected = selectedSymptoms.includes(sym);
                return (
                  <button
                    type="button"
                    key={sym}
                    onClick={() => toggleSymptom(sym)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                      isSelected
                        ? 'bg-medical-600 border-medical-600 text-white shadow-sm'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {sym}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Chief Complaint Free Text & Voice Recognition */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                2. Describe What You Are Feeling *
              </label>

              {recognitionSupported && (
                <button
                  type="button"
                  onClick={toggleVoiceRecording}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border transition-all ${
                    isRecording
                      ? 'bg-rose-50 border-rose-300 text-rose-600 animate-pulse'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {isRecording ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
                  <span>{isRecording ? 'Listening...' : 'Voice Input'}</span>
                </button>
              )}
            </div>

            <textarea
              rows={4}
              required={selectedSymptoms.length === 0}
              placeholder="E.g., I've had sudden sharp retrosternal chest pain for the past 2 hours radiating to my left arm..."
              value={chiefComplaint}
              onChange={(e) => setChiefComplaint(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <span>Analyzing Symptoms & Emergency Indicators...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Submit Symptoms for Triage Assessment</span>
              </>
            )}
          </button>
        </form>
      )}

      {/* Previous Triage History */}
      {triageHistory.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
            Previous Triage Submissions
          </h4>

          <div className="divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {triageHistory.map((item) => (
              <div key={item._id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono font-bold text-slate-800">{item.triageNumber}</span>
                  <p className="text-[11px] text-slate-500 truncate max-w-md">{item.chiefComplaint}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge size="sm">{item.severityLevel}</Badge>
                  <span className="text-[10px] text-slate-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SymptomTriagePage;
