import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  Pill,
  Plus,
  Printer,
  Trash2,
  FileText,
  Activity,
  User,
  Clock,
  Search,
} from 'lucide-react';

const PrescriptionsPage = () => {
  const [searchParams] = useSearchParams();
  const prePatientId = searchParams.get('patientId');
  const preRecordId = searchParams.get('medicalRecordId');

  const { role } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(!!prePatientId);
  const [printableRx, setPrintableRx] = useState(null);

  // Form State
  const [selectedPatient, setSelectedPatient] = useState(prePatientId || '');
  const [medicines, setMedicines] = useState([
    {
      name: '',
      dosage: '500 mg',
      frequency: '1-0-1 (After meals)',
      duration: '5 days',
      route: 'Oral',
      instructions: 'Take with warm water',
      quantity: 10,
    },
  ]);
  const [generalInstructions, setGeneralInstructions] = useState('Rest adequately and take medications on time.');
  const [followUpDate, setFollowUpDate] = useState('');

  const fetchPrescriptions = async () => {
    try {
      setLoading(true);
      const res = await api.get('/prescriptions');
      if (res.data.success) {
        setPrescriptions(res.data.prescriptions);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrescriptions();
    if (role !== 'patient') {
      api.get('/patients?limit=100').then((res) => {
        if (res.data.success) setPatients(res.data.patients);
      });
    }
  }, [role]);

  const addMedicineRow = () => {
    setMedicines([
      ...medicines,
      {
        name: '',
        dosage: '10 mg',
        frequency: '0-0-1 (At bedtime)',
        duration: '7 days',
        route: 'Oral',
        instructions: 'Take after dinner',
        quantity: 7,
      },
    ]);
  };

  const removeMedicineRow = (index) => {
    setMedicines(medicines.filter((_, i) => i !== index));
  };

  const updateMedicine = (index, field, value) => {
    const updated = [...medicines];
    updated[index][field] = value;
    setMedicines(updated);
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patientId: selectedPatient,
        medicalRecordId: preRecordId || null,
        medicines,
        generalInstructions,
        followUpDate: followUpDate || null,
      };

      const res = await api.post('/prescriptions', payload);
      if (res.data.success) {
        setIsCreateOpen(false);
        fetchPrescriptions();
        setPrintableRx(res.data.prescription);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create prescription');
    }
  };

  const filteredPrescriptions = prescriptions.filter((rx) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const patName = `${rx.patient?.firstName} ${rx.patient?.lastName}`.toLowerCase();
    const rxNum = rx.prescriptionNumber?.toLowerCase();
    return patName.includes(term) || rxNum.includes(term) || rx.patient?.uhid?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Prescription Management</h2>
          <p className="text-xs text-slate-500">Doctor-authorized digital prescriptions with audit history and pharmacy dispensing links</p>
        </div>

        {role !== 'patient' && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create e-Prescription</span>
          </button>
        )}
      </div>

      {/* Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by Rx number, patient, UHID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
          />
        </div>
      </div>

      {/* Prescriptions Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Fetching prescription archives..." />
        ) : filteredPrescriptions.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="No prescriptions found"
            description="No active or archived e-Prescriptions match your search."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Rx Number</th>
                  <th className="py-3 px-4">Prescribed Date</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Authoring Doctor</th>
                  <th className="py-3 px-4">Prescribed Items</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredPrescriptions.map((rx) => (
                  <tr key={rx._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-medical-700">
                      {rx.prescriptionNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(rx.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {rx.patient?.firstName} {rx.patient?.lastName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{rx.patient?.uhid}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-slate-800">
                        Dr. {rx.doctor?.firstName} {rx.doctor?.lastName}
                      </div>
                      <div className="text-[10px] text-slate-400">{rx.doctor?.specialization}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {rx.medicines?.length || 0} Medication(s)
                      </span>
                      <p className="text-[10px] text-slate-500 truncate max-w-xs">
                        {rx.medicines?.map((m) => m.name).join(', ')}
                      </p>
                    </td>
                    <td className="py-3 px-4">
                      <Badge>{rx.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setPrintableRx(rx)}
                        className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print / View</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create e-Prescription Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Author e-Prescription"
        subtitle="Formulates verified medicine dosage, duration, and instructions. Logged in audit history."
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          {role !== 'patient' && (
            <div>
              <label className="block text-xs font-medium text-slate-700">Patient *</label>
              <select
                required
                value={selectedPatient}
                onChange={(e) => setSelectedPatient(e.target.value)}
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
          )}

          {/* Medicines dynamic table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-slate-700">
                Prescribed Medications *
              </label>
              <button
                type="button"
                onClick={addMedicineRow}
                className="text-xs font-semibold text-medical-600 hover:text-medical-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Drug Row
              </button>
            </div>

            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {medicines.map((med, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                  <div className="grid grid-cols-12 gap-2">
                    <div className="col-span-5">
                      <input
                        type="text"
                        required
                        placeholder="Drug Name (e.g. Amoxicillin)"
                        value={med.name}
                        onChange={(e) => updateMedicine(idx, 'name', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white font-medium"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Dosage (500mg)"
                        value={med.dosage}
                        onChange={(e) => updateMedicine(idx, 'dosage', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white"
                      />
                    </div>
                    <div className="col-span-3">
                      <input
                        type="text"
                        placeholder="Frequency (1-0-1)"
                        value={med.frequency}
                        onChange={(e) => updateMedicine(idx, 'frequency', e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none bg-white"
                      />
                    </div>
                    <div className="col-span-1 flex items-center justify-center">
                      {medicines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeMedicineRow(idx)}
                          className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="text"
                      placeholder="Duration (5 days)"
                      value={med.duration}
                      onChange={(e) => updateMedicine(idx, 'duration', e.target.value)}
                      className="w-full px-2.5 py-1 text-[11px] border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="text"
                      placeholder="Special Instructions"
                      value={med.instructions}
                      onChange={(e) => updateMedicine(idx, 'instructions', e.target.value)}
                      className="w-full px-2.5 py-1 text-[11px] border border-slate-200 rounded-lg bg-white"
                    />
                    <input
                      type="number"
                      placeholder="Total Qty"
                      value={med.quantity}
                      onChange={(e) => updateMedicine(idx, 'quantity', Number(e.target.value))}
                      className="w-full px-2.5 py-1 text-[11px] border border-slate-200 rounded-lg bg-white"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">General Patient Instructions</label>
            <textarea
              rows={2}
              value={generalInstructions}
              onChange={(e) => setGeneralInstructions(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Recommended Follow-Up Date</label>
            <input
              type="date"
              value={followUpDate}
              onChange={(e) => setFollowUpDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Issue & Commit e-Prescription
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Official Medical Prescription View */}
      <Modal
        isOpen={!!printableRx}
        onClose={() => setPrintableRx(null)}
        title="Digital Prescription Letterhead"
        subtitle={`Prescription Number: ${printableRx?.prescriptionNumber || ''}`}
        maxWidth="max-w-2xl"
      >
        {printableRx && (
          <div className="space-y-6">
            <div className="border border-slate-300 p-6 rounded-xl bg-white space-y-4 print-area">
              {/* Hospital Header */}
              <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    APEX MEMORIAL SMART HOSPITAL
                  </h3>
                  <p className="text-[10px] text-slate-600">
                    742 Healthcare Parkway, Medical District, NY 10001 • Tel: +1 (800) 555-0199
                  </p>
                  <p className="text-[10px] text-medical-700 font-semibold">
                    ISO-9001-2026 Certified Tertiary Health Facility
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-black text-medical-800 font-serif">Rx</span>
                  <p className="text-[10px] font-mono font-bold text-slate-700">{printableRx.prescriptionNumber}</p>
                </div>
              </div>

              {/* Patient and Doctor Metadata Bar */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <p className="font-semibold text-slate-800">
                    Patient: {printableRx.patient?.firstName} {printableRx.patient?.lastName}
                  </p>
                  <p className="text-slate-500 text-[11px] font-mono">
                    UHID: {printableRx.patient?.uhid} • Blood: {printableRx.patient?.bloodGroup}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">
                    Dr. {printableRx.doctor?.firstName} {printableRx.doctor?.lastName}
                  </p>
                  <p className="text-slate-500 text-[11px]">
                    {printableRx.doctor?.specialization} • {new Date(printableRx.date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Medication Table */}
              <div className="pt-2">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                    <tr>
                      <th className="p-2 border">#</th>
                      <th className="p-2 border">Medicine / Formulation</th>
                      <th className="p-2 border">Dosage & Frequency</th>
                      <th className="p-2 border">Duration</th>
                      <th className="p-2 border">Instructions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {printableRx.medicines?.map((m, idx) => (
                      <tr key={idx}>
                        <td className="p-2 border font-bold text-slate-500">{idx + 1}</td>
                        <td className="p-2 border font-bold text-slate-900">{m.name}</td>
                        <td className="p-2 border font-mono">{m.dosage} — {m.frequency}</td>
                        <td className="p-2 border">{m.duration}</td>
                        <td className="p-2 border text-slate-600">{m.instructions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* General Advice */}
              <div className="text-xs text-slate-700 border-t border-slate-200 pt-3">
                <p className="font-bold text-slate-900">Advice & Instructions:</p>
                <p className="text-slate-600 mt-1">{printableRx.generalInstructions}</p>
                {printableRx.followUpDate && (
                  <p className="mt-2 font-semibold text-medical-800">
                    Next Follow-up Consultation: {new Date(printableRx.followUpDate).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Doctor Signature Block */}
              <div className="pt-6 flex justify-end">
                <div className="text-center w-48 border-t border-slate-800 pt-1">
                  <p className="font-bold text-xs text-slate-900">
                    Dr. {printableRx.doctor?.firstName} {printableRx.doctor?.lastName}
                  </p>
                  <p className="text-[10px] text-slate-500">Authorized Medical Officer</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Prescription</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default PrescriptionsPage;
