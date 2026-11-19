import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Modal from '../../components/common/Modal';
import {
  Calendar,
  Pill,
  FlaskConical,
  CreditCard,
  HeartPulse,
  Clock,
  ArrowRight,
  AlertCircle,
  Plus,
  FileText,
  CheckCircle2,
  DollarSign,
  Download,
  Activity,
  AlertTriangle,
  ShieldCheck,
  Stethoscope,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const PatientDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [summaryData, setSummaryData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Payment Modal State
  const [payModalBill, setPayModalBill] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [payChannel, setPayChannel] = useState('Credit Card');
  const [payLoading, setPayLoading] = useState(false);
  const [paySuccess, setPaySuccess] = useState('');
  const [payError, setPayError] = useState('');

  const fetchPatientSummary = async () => {
    try {
      setLoading(true);
      const res = await api.get('/analytics/patient-summary');
      if (res.data.success) {
        setSummaryData(res.data);
      }
    } catch (err) {
      console.error('Failed to load patient summary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatientSummary();
  }, []);

  const handlePayBill = async (e) => {
    e.preventDefault();
    if (!payModalBill) return;

    setPayLoading(true);
    setPaySuccess('');
    setPayError('');

    try {
      const res = await api.post(`/billing/${payModalBill._id}/payment`, {
        amount: Number(payAmount),
        paymentMethod: payChannel,
        notes: 'Online patient portal payment',
      });

      if (res.data.success) {
        setPaySuccess('Payment processed successfully!');
        setTimeout(() => {
          setPayModalBill(null);
          setPaySuccess('');
          fetchPatientSummary();
        }, 1200);
      }
    } catch (err) {
      setPayError(err.response?.data?.message || 'Payment processing failed. Try again.');
    } finally {
      setPayLoading(false);
    }
  };

  if (loading && !summaryData) return <LoadingSpinner text="Loading your comprehensive digital health records..." />;

  const patient = summaryData?.patient || user?.profile || {};
  const stats = summaryData?.stats || {};
  const upcomingAppointments = summaryData?.upcomingAppointments || [];
  const recentAppointments = summaryData?.recentAppointments || [];
  const recentPrescriptions = summaryData?.recentPrescriptions || [];
  const recentLabReports = summaryData?.recentLabReports || [];
  const recentMedicalRecords = summaryData?.recentMedicalRecords || [];
  const bills = summaryData?.bills || [];

  return (
    <div className="space-y-6">
      {/* Patient Health ID Card Header */}
      <div className="bg-gradient-to-r from-medical-800 via-sky-700 to-teal-700 p-6 rounded-2xl text-white shadow-xl flex flex-col md:flex-row md:items-center md:justify-between gap-4 border border-sky-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2.5 py-0.5 rounded-full border border-white/20">
              Unique Health ID: {patient.uhid || 'HMS-P-2026-0001'}
            </span>
            <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">
              Blood: {patient.bloodGroup || 'O+'}
            </span>
            <span className="text-[10px] font-bold bg-white/10 px-2 py-0.5 rounded-full">
              Gender: {patient.gender || 'Other'}
            </span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight">
            Hello, {patient.firstName || user?.name}
          </h2>
          <p className="text-xs text-sky-100 mt-1 max-w-xl">
            Welcome to your Apex Memorial Health Portal. Track verified doctor appointments, clinical consultation records, active prescriptions, and billing invoices.
          </p>

          {/* Documented Allergies Alert */}
          {patient.allergies?.length > 0 && (
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-rose-500/20 border border-rose-300/30 text-rose-100 text-xs font-medium">
              <AlertCircle className="w-3.5 h-3.5 text-rose-200" />
              <span>
                Documented Allergies: {patient.allergies.join(', ')}
              </span>
            </div>
          )}
        </div>

        {/* Quick Portal Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
          <button
            onClick={() => navigate('/patient/appointments')}
            className="px-4 py-2.5 bg-white text-medical-900 hover:bg-sky-50 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4 text-medical-600" />
            <span>Book Appointment</span>
          </button>
          <button
            onClick={() => navigate('/patient/triage')}
            className="px-4 py-2.5 bg-teal-800/90 hover:bg-teal-700 border border-teal-400/30 text-white rounded-xl text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
          >
            <HeartPulse className="w-4 h-4 text-teal-300" />
            <span>Symptom Triage</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Upcoming Visits"
          value={stats.upcomingAppointmentsCount || 0}
          subtitle="Scheduled doctor consultations"
          icon={Calendar}
          color="blue"
          onClick={() => navigate('/patient/appointments')}
        />

        <StatCard
          title="Active Prescriptions"
          value={stats.prescriptionsCount || 0}
          subtitle="Authorized medication regimens"
          icon={Pill}
          color="emerald"
          onClick={() => navigate('/patient/prescriptions')}
        />

        <StatCard
          title="Laboratory Reports"
          value={stats.labReportsCount || 0}
          subtitle="Diagnostic laboratory tests"
          icon={FlaskConical}
          color="purple"
          onClick={() => navigate('/patient/lab')}
        />

        <StatCard
          title="Outstanding Balance"
          value={`$${(stats.balanceDue || 0).toFixed(2)}`}
          subtitle={`Total Billed: $${(stats.totalBilled || 0).toFixed(2)}`}
          icon={CreditCard}
          color={stats.balanceDue > 0 ? 'rose' : 'emerald'}
          onClick={() => navigate('/patient/billing')}
        />
      </div>

      {/* Section: Upcoming Appointments & Active Prescriptions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Appointments Box */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Your Appointments</h3>
                <p className="text-xs text-slate-500">Upcoming and recent OPD visits</p>
              </div>
              <button
                onClick={() => navigate('/patient/appointments')}
                className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {recentAppointments.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No appointments recorded on your profile.
                </div>
              ) : (
                recentAppointments.slice(0, 3).map((apt) => (
                  <div
                    key={apt._id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          Dr. {apt.doctor?.firstName} {apt.doctor?.lastName}
                        </span>
                        <Badge size="sm">{apt.status}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                        {apt.doctor?.specialization} • Room {apt.doctor?.roomNumber || 'OPD'} • Token #{apt.queueNumber}
                      </p>
                      <p className="text-xs text-slate-700 mt-1 font-medium truncate">
                        Reason: {apt.reason}
                      </p>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <p className="text-xs font-semibold text-slate-800">
                        {new Date(apt.appointmentDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-[10px] text-slate-500 flex items-center gap-0.5 mt-0.5 justify-end font-mono">
                        <Clock className="w-2.5 h-2.5" /> {apt.timeSlot}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/patient/appointments')}
            className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
          >
            + Book a New Appointment
          </button>
        </div>

        {/* Prescriptions Box */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Active Prescriptions</h3>
                <p className="text-xs text-slate-500">Doctor-prescribed medicines and dosing schedules</p>
              </div>
              <button
                onClick={() => navigate('/patient/prescriptions')}
                className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
              >
                <span>All Prescriptions</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {recentPrescriptions.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No active prescriptions issued yet.
                </div>
              ) : (
                recentPrescriptions.slice(0, 3).map((rx) => (
                  <div
                    key={rx._id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-medical-800 font-mono bg-medical-50 px-2 py-0.5 rounded border border-medical-200">
                        {rx.prescriptionNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(rx.date).toLocaleDateString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Prescribed by Dr. {rx.doctor?.firstName} {rx.doctor?.lastName} ({rx.doctor?.specialization})
                    </p>

                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {rx.medicines?.map((m, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-medium"
                        >
                          {m.name} ({m.dosage} • {m.frequency})
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/patient/prescriptions')}
            className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
          >
            Download / Print Official Prescriptions
          </button>
        </div>
      </div>

      {/* Section: Diagnostic Lab Reports & Medical Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Diagnostic Lab Reports */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Diagnostic Laboratory Reports</h3>
                <p className="text-xs text-slate-500">Ordered blood, biochemistry, and pathology tests</p>
              </div>
              <button
                onClick={() => navigate('/patient/lab')}
                className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {recentLabReports.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No diagnostic laboratory reports available.
                </div>
              ) : (
                recentLabReports.slice(0, 3).map((lab) => (
                  <div
                    key={lab._id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{lab.test?.name}</span>
                        <Badge size="sm">{lab.status}</Badge>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Category: {lab.test?.category} • Requested: {new Date(lab.requestedDate).toLocaleDateString()}
                      </p>
                    </div>

                    <button
                      onClick={() => navigate('/patient/lab')}
                      className="px-2.5 py-1 text-xs font-semibold text-medical-600 bg-medical-50 hover:bg-medical-100 rounded-lg transition-colors flex-shrink-0"
                    >
                      View Report
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/patient/lab')}
            className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
          >
            Access Full Laboratory Diagnostics
          </button>
        </div>

        {/* Clinical Medical Records (EMR) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Clinical Consultation Records</h3>
                <p className="text-xs text-slate-500">Doctor-verified diagnoses and clinical progress notes</p>
              </div>
              <button
                onClick={() => navigate('/patient/emr')}
                className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
              >
                <span>Full Chart</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-3">
              {recentMedicalRecords.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  No clinical consultation encounters recorded yet.
                </div>
              ) : (
                recentMedicalRecords.slice(0, 3).map((rec) => (
                  <div
                    key={rec._id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/70"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-800">
                        Consultation ({new Date(rec.visitDate).toLocaleDateString()})
                      </span>
                      <span className="font-mono text-[10px] text-slate-400">{rec.recordNumber}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Doctor: Dr. {rec.doctor?.firstName} {rec.doctor?.lastName} ({rec.doctor?.specialization})
                    </p>
                    <p className="text-xs text-slate-700 font-medium mt-1">
                      Chief Complaint: {rec.chiefComplaints}
                    </p>
                    <p className="text-xs text-slate-600">
                      Diagnosis: {rec.diagnoses?.map((d) => d.description).join(', ')}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/patient/emr')}
            className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold border border-slate-200 transition-colors"
          >
            Inspect Complete Chronological Medical Timeline
          </button>
        </div>
      </div>

      {/* Section: Hospital Bills & Invoicing */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Hospital Billing & Invoices</h3>
            <p className="text-xs text-slate-500">Official medical invoices, itemized charges, and payment records</p>
          </div>
          <button
            onClick={() => navigate('/patient/billing')}
            className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
          >
            <span>Billing Hub</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {bills.length === 0 ? (
          <div className="text-center py-8 text-xs text-slate-400">
            No hospital invoices generated for your account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-y border-slate-100">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Bill Date</th>
                  <th className="py-2.5 px-3">Total Amount</th>
                  <th className="py-2.5 px-3">Amount Paid</th>
                  <th className="py-2.5 px-3">Balance Due</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Payment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {bills.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{b.billNumber}</td>
                    <td className="py-3 px-3 text-slate-600">{new Date(b.billDate).toLocaleDateString()}</td>
                    <td className="py-3 px-3 font-bold text-slate-900">${(b.totalAmount || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-semibold text-emerald-600">${(b.paidAmount || 0).toFixed(2)}</td>
                    <td className="py-3 px-3 font-semibold text-amber-700">
                      ${(b.balanceAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <Badge>{b.paymentStatus}</Badge>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {b.balanceAmount > 0 ? (
                        <button
                          onClick={() => {
                            setPayModalBill(b);
                            setPayAmount(String(b.balanceAmount));
                          }}
                          className="px-3 py-1 bg-medical-600 hover:bg-medical-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                        >
                          Pay Now
                        </button>
                      ) : (
                        <span className="text-[11px] font-semibold text-emerald-600 flex items-center gap-1 justify-end">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Settled
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Online Bill Payment Modal */}
      <Modal
        isOpen={!!payModalBill}
        onClose={() => setPayModalBill(null)}
        title={`Settle Invoice: ${payModalBill?.billNumber}`}
        maxWidth="max-w-md"
      >
        {paySuccess ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-sm text-slate-900">{paySuccess}</h4>
            <p className="text-xs text-slate-500">A receipt has been issued and linked to your patient profile.</p>
          </div>
        ) : (
          <form onSubmit={handlePayBill} className="space-y-4">
            {payError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {payError}
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1">
              <p className="text-slate-500">Invoice Balance Outstanding:</p>
              <p className="text-xl font-extrabold text-slate-900">${payModalBill?.balanceAmount?.toFixed(2)}</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Amount ($)</label>
              <input
                type="number"
                step="0.01"
                max={payModalBill?.balanceAmount}
                min="1"
                required
                value={payAmount}
                onChange={(e) => setPayAmount(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={payChannel}
                onChange={(e) => setPayChannel(e.target.value)}
                className="block w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
              >
                <option value="Credit Card">Credit / Debit Card</option>
                <option value="UPI">UPI / Instant Digital Payment</option>
                <option value="Insurance">Health Insurance Pre-Authorization</option>
                <option value="Cash">Cash at Hospital Desk</option>
              </select>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={payLoading}
                className="w-full py-2.5 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 transition-colors"
              >
                {payLoading ? 'Processing Secure Payment...' : `Confirm & Pay $${payAmount}`}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
};

export default PatientDashboard;
