import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  Bed,
  Plus,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ShieldAlert,
  Activity,
  LogOut,
  Calendar,
  ArrowLeftRight,
} from 'lucide-react';

const WardBedPage = () => {
  const { role } = useAuth();
  const [matrix, setMatrix] = useState([]);
  const [wards, setWards] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [isAdmitOpen, setIsAdmitOpen] = useState(false);
  const [selectedAdmissionForDischarge, setSelectedAdmissionForDischarge] = useState(null);
  const [selectedAdmissionForTransfer, setSelectedAdmissionForTransfer] = useState(null);
  const [selectedBedInfo, setSelectedBedInfo] = useState(null);

  // Transfer Form
  const [transferTargetBedId, setTransferTargetBedId] = useState('');
  const [transferReason, setTransferReason] = useState('Clinical unit transfer');

  // Admission Form
  const [admitPatientId, setAdmitPatientId] = useState('');
  const [admitDoctorId, setAdmitDoctorId] = useState('');
  const [admitWardId, setAdmitWardId] = useState('');
  const [admitBedId, setAdmitBedId] = useState('');
  const [admissionDiagnosis, setAdmissionDiagnosis] = useState('');
  const [admissionReason, setAdmissionReason] = useState('');

  // Discharge Form
  const [dischargeCondition, setDischargeCondition] = useState('Stable & Recovered');
  const [adviceOnDischarge, setAdviceOnDischarge] = useState('Continue prescribed oral medications, rest, follow-up in 10 days.');
  const [dischargeSummaryNotes, setDischargeSummaryNotes] = useState('');

  const fetchBedMatrix = async () => {
    try {
      setLoading(true);
      const [matrixRes, wardRes, patRes, docRes] = await Promise.all([
        api.get('/wards/bed-matrix'),
        api.get('/wards/wards'),
        api.get('/patients?status=Active&limit=100'),
        api.get('/doctors?isApproved=true'),
      ]);

      if (matrixRes.data.success) setMatrix(matrixRes.data.matrix);
      if (wardRes.data.success) setWards(wardRes.data.wards);
      if (patRes.data.success) setPatients(patRes.data.patients);
      if (docRes.data.success) setDoctors(docRes.data.doctors);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBedMatrix();
  }, []);

  const handleAdmitSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patientId: admitPatientId,
        doctorId: admitDoctorId,
        wardId: admitWardId,
        bedId: admitBedId,
        admissionDiagnosis,
        admissionReason,
      };

      const res = await api.post('/wards/admissions', payload);
      if (res.data.success) {
        setIsAdmitOpen(false);
        fetchBedMatrix();
        alert('Patient admitted successfully! Bed marked Occupied.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Admission failed');
    }
  };

  const handleDischargeSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/wards/admissions/${selectedAdmissionForDischarge._id}/discharge`, {
        dischargeCondition,
        adviceOnDischarge,
        summaryNotes: dischargeSummaryNotes,
      });

      if (res.data.success) {
        setSelectedAdmissionForDischarge(null);
        setSelectedBedInfo(null);
        fetchBedMatrix();
        alert(`Discharge finalized! Bed released to Available. Total Stay: ${res.data.staySummary?.stayedDays} day(s).`);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Discharge failed');
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferTargetBedId) {
      alert('Please select a target vacant bed.');
      return;
    }
    try {
      const res = await api.post(`/wards/admissions/${selectedAdmissionForTransfer._id}/transfer`, {
        targetBedId: transferTargetBedId,
        reason: transferReason,
      });

      if (res.data.success) {
        setSelectedAdmissionForTransfer(null);
        setSelectedBedInfo(null);
        setTransferTargetBedId('');
        fetchBedMatrix();
        alert(res.data.message || 'Patient transferred successfully!');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Transfer failed');
    }
  };

  // All available beds across all wards for bed transfer
  const allAvailableBeds = matrix.flatMap((m) =>
    (m.beds || [])
      .filter((b) => b.status === 'Available')
      .map((b) => ({ ...b, wardName: m.ward.name, wardCode: m.ward.code }))
  );

  // Find available beds for selected ward
  const availableBedsForWard = admitWardId
    ? matrix
        .find((m) => m.ward.id === admitWardId)
        ?.beds.filter((b) => b.status === 'Available') || []
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Wards & Visual Bed Matrix</h2>
          <p className="text-xs text-slate-500">Real-time inpatient bed census, atomic double-allocation prevention, and discharge workflows</p>
        </div>

        {role !== 'patient' && (
          <button
            onClick={() => setIsAdmitOpen(true)}
            className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Admit Patient to Bed</span>
          </button>
        )}
      </div>

      {/* Bed Status Legend */}
      <div className="flex flex-wrap items-center gap-4 bg-white p-3 rounded-xl border border-slate-200/80 text-xs text-slate-600 shadow-sm">
        <span className="font-semibold text-slate-800">Bed Status Legend:</span>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-emerald-500" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-medical-600" />
          <span>Occupied (Inpatient)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Maintenance / Sanitization</span>
        </div>
      </div>

      {/* Wards Matrix Grid */}
      {loading ? (
        <LoadingSpinner text="Querying live ward sensor and bed allocation matrix..." />
      ) : matrix.length === 0 ? (
        <EmptyState icon={Bed} title="No wards configured" description="No hospital wards are currently active." />
      ) : (
        <div className="space-y-6">
          {matrix.map(({ ward, beds }) => {
            const occupiedCount = beds.filter((b) => b.status === 'Occupied').length;
            const occupancyRate = beds.length > 0 ? Math.round((occupiedCount / beds.length) * 100) : 0;

            return (
              <div key={ward.id} className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-sm space-y-4">
                {/* Ward Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-bold text-slate-900">{ward.name}</h3>
                      <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {ward.code}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {ward.floor} • Type: {ward.type} • Daily Rate: ${ward.dailyRate}/day
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-xs">
                    <span className="text-slate-500 font-medium">
                      {occupiedCount} / {beds.length} Beds Occupied ({occupancyRate}%)
                    </span>
                    <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-medical-600 h-full rounded-full transition-all"
                        style={{ width: `${occupancyRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Beds Cards Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                  {beds.map((b) => {
                    const isOccupied = b.status === 'Occupied';
                    const isAvailable = b.status === 'Available';
                    const admission = b.currentAdmission;

                    return (
                      <div
                        key={b._id}
                        onClick={() => setSelectedBedInfo(b)}
                        className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                          isOccupied
                            ? 'bg-sky-50/60 border-medical-300 hover:border-medical-500 shadow-sm'
                            : isAvailable
                            ? 'bg-emerald-50/40 border-emerald-200 hover:border-emerald-400'
                            : 'bg-amber-50/40 border-amber-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-slate-900 font-mono">{b.bedNumber}</span>
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${
                              isOccupied ? 'bg-medical-600' : isAvailable ? 'bg-emerald-500' : 'bg-amber-500'
                            }`}
                          />
                        </div>

                        <p className="text-[10px] text-slate-500 mt-1 truncate">{b.bedType}</p>

                        {isOccupied && admission?.patient && (
                          <div className="mt-2 pt-1.5 border-t border-medical-200/60 text-[10px]">
                            <p className="font-bold text-slate-800 truncate">
                              {admission.patient.firstName} {admission.patient.lastName}
                            </p>
                            <p className="text-slate-500 font-mono">{admission.patient.uhid}</p>
                          </div>
                        )}

                        {isAvailable && (
                          <div className="mt-2 pt-1.5 border-t border-emerald-200/60 text-[10px] text-emerald-700 font-medium">
                            Vacant & Ready
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bed Details & Action Modal */}
      <Modal
        isOpen={!!selectedBedInfo}
        onClose={() => setSelectedBedInfo(null)}
        title={`Bed Details: ${selectedBedInfo?.bedNumber || ''}`}
        subtitle={`Status: ${selectedBedInfo?.status || ''} • Rate: $${selectedBedInfo?.dailyRate}/day`}
        maxWidth="max-w-md"
      >
        {selectedBedInfo && (
          <div className="space-y-4 text-xs">
            {selectedBedInfo.status === 'Occupied' && selectedBedInfo.currentAdmission ? (
              <div className="space-y-3">
                <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-medical-800">
                    Current Inpatient
                  </span>
                  <p className="text-sm font-bold text-slate-900">
                    {selectedBedInfo.currentAdmission.patient?.firstName} {selectedBedInfo.currentAdmission.patient?.lastName}
                  </p>
                  <p className="text-slate-500 font-mono">
                    UHID: {selectedBedInfo.currentAdmission.patient?.uhid} • Blood: {selectedBedInfo.currentAdmission.patient?.bloodGroup}
                  </p>
                  <p className="text-slate-700 mt-1 font-medium">
                    Attending Physician: Dr. {selectedBedInfo.currentAdmission.doctor?.firstName} {selectedBedInfo.currentAdmission.doctor?.lastName}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    Admitted: {new Date(selectedBedInfo.currentAdmission.admissionDate).toLocaleDateString()}
                  </p>
                </div>

                {role !== 'patient' && (
                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <button
                      onClick={() => {
                        setSelectedAdmissionForTransfer(selectedBedInfo.currentAdmission);
                      }}
                      className="py-2.5 bg-sky-600 hover:bg-sky-700 text-white rounded-xl font-semibold shadow-md transition-colors flex items-center justify-center gap-1.5"
                    >
                      <ArrowLeftRight className="w-3.5 h-3.5" />
                      <span>Transfer Bed</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedAdmissionForDischarge(selectedBedInfo.currentAdmission);
                      }}
                      className="py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-semibold shadow-md transition-colors flex items-center justify-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Discharge</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-600 font-medium">This bed is currently {selectedBedInfo.status}.</p>
                {selectedBedInfo.status === 'Available' && role !== 'patient' && (
                  <button
                    onClick={() => {
                      setAdmitBedId(selectedBedInfo._id);
                      setAdmitWardId(selectedBedInfo.ward);
                      setIsAdmitOpen(true);
                      setSelectedBedInfo(null);
                    }}
                    className="mt-3 px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-sm"
                  >
                    Admit Patient to This Bed
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Inpatient Admission Modal */}
      <Modal
        isOpen={isAdmitOpen}
        onClose={() => setIsAdmitOpen(false)}
        title="Inpatient Ward Admission"
        subtitle="Allocates an available hospital bed and creates admission clinical records. Double-allocation prevented."
        maxWidth="max-w-xl"
      >
        <form onSubmit={handleAdmitSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">Patient *</label>
            <select
              required
              value={admitPatientId}
              onChange={(e) => setAdmitPatientId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="">Select Patient</option>
              {patients.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.firstName} {p.lastName} (UHID: {p.uhid})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Supervising Physician *</label>
            <select
              required
              value={admitDoctorId}
              onChange={(e) => setAdmitDoctorId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="">Select Doctor</option>
              {doctors.map((d) => (
                <option key={d._id} value={d._id}>
                  Dr. {d.firstName} {d.lastName} ({d.specialization})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Hospital Ward *</label>
              <select
                required
                value={admitWardId}
                onChange={(e) => {
                  setAdmitWardId(e.target.value);
                  setAdmitBedId('');
                }}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="">Select Ward</option>
                {wards.map((w) => (
                  <option key={w._id} value={w._id}>
                    {w.name} (${w.dailyRate}/day)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Available Bed *</label>
              <select
                required
                value={admitBedId}
                onChange={(e) => setAdmitBedId(e.target.value)}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="">Select Vacant Bed</option>
                {availableBedsForWard.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.bedNumber} ({b.bedType})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Admission Diagnosis *</label>
            <input
              type="text"
              required
              placeholder="e.g. Acute Coronary Syndrome, Post-Operative Monitoring"
              value={admissionDiagnosis}
              onChange={(e) => setAdmissionDiagnosis(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Admission Clinical Notes</label>
            <textarea
              rows={2}
              placeholder="Reason for hospitalization, immediate protocols..."
              value={admissionReason}
              onChange={(e) => setAdmissionReason(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAdmitOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Confirm Admission
            </button>
          </div>
        </form>
      </Modal>

      {/* Discharge Summary Modal */}
      <Modal
        isOpen={!!selectedAdmissionForDischarge}
        onClose={() => setSelectedAdmissionForDischarge(null)}
        title="Finalize Patient Discharge"
        subtitle={`Admission #${selectedAdmissionForDischarge?.admissionNumber}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleDischargeSubmit} className="space-y-4">
          <p className="text-xs text-slate-600">
            Finalize clinical discharge notes. Releasing this patient will set the bed back to <span className="text-emerald-600 font-bold">Available</span> and calculate bed stay totals.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700">Condition on Discharge *</label>
            <input
              type="text"
              required
              value={dischargeCondition}
              onChange={(e) => setDischargeCondition(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Advice & Discharge Summary</label>
            <textarea
              rows={2}
              required
              value={adviceOnDischarge}
              onChange={(e) => setAdviceOnDischarge(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedAdmissionForDischarge(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Confirm Discharge
            </button>
          </div>
        </form>
      </Modal>
      {/* Bed Transfer Modal */}
      <Modal
        isOpen={!!selectedAdmissionForTransfer}
        onClose={() => setSelectedAdmissionForTransfer(null)}
        title="Inpatient Bed Transfer"
        subtitle={`Admission #${selectedAdmissionForTransfer?.admissionNumber} - Patient: ${selectedAdmissionForTransfer?.patient?.firstName} ${selectedAdmissionForTransfer?.patient?.lastName}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4 text-xs">
          <div className="p-3 bg-sky-50 border border-sky-200 rounded-xl space-y-1">
            <span className="text-[10px] font-bold text-sky-800 uppercase tracking-wider">Current Bed</span>
            <p className="font-semibold text-slate-800">
              Bed {selectedAdmissionForTransfer?.bed?.bedNumber || 'Current'} ({selectedAdmissionForTransfer?.ward?.name || 'Current Ward'})
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Destination Vacant Bed *
            </label>
            <select
              required
              value={transferTargetBedId}
              onChange={(e) => setTransferTargetBedId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-slate-50"
            >
              <option value="">Select Destination Vacant Bed</option>
              {allAvailableBeds.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.bedNumber} — {b.wardName} (${b.dailyRate}/day)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Transfer Reason & Protocol Notes
            </label>
            <textarea
              rows={2}
              required
              value={transferReason}
              onChange={(e) => setTransferReason(e.target.value)}
              placeholder="e.g. Clinical stabilization, ward step-down, specialized care requirement"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setSelectedAdmissionForTransfer(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-xl text-xs font-semibold shadow-md flex items-center gap-1.5"
            >
              <ArrowLeftRight className="w-3.5 h-3.5" />
              <span>Execute Transfer</span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default WardBedPage;
