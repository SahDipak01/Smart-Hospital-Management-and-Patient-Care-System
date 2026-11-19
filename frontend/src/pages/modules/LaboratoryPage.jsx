import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  FlaskConical,
  Plus,
  Printer,
  CheckCircle,
  Clock,
  Search,
  AlertTriangle,
  FileCheck,
} from 'lucide-react';

const LaboratoryPage = () => {
  const [searchParams] = useSearchParams();
  const prePatientId = searchParams.get('patientId');

  const { role } = useAuth();
  const [orders, setOrders] = useState([]);
  const [tests, setTests] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isOrderOpen, setIsOrderOpen] = useState(!!prePatientId);
  const [selectedOrderForResults, setSelectedOrderForResults] = useState(null);
  const [printableReport, setPrintableReport] = useState(null);

  // New Order Form
  const [selectedPatient, setSelectedPatient] = useState(prePatientId || '');
  const [selectedTest, setSelectedTest] = useState('');
  const [orderPriority, setOrderPriority] = useState('Routine');

  // Results Form
  const [resultValues, setResultValues] = useState([]);
  const [technicianNotes, setTechnicianNotes] = useState('');

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.append('status', statusFilter);

      const [orderRes, testRes] = await Promise.all([
        api.get(`/lab/orders?${params.toString()}`),
        api.get('/lab/tests'),
      ]);

      if (orderRes.data.success) setOrders(orderRes.data.orders);
      if (testRes.data.success) setTests(testRes.data.tests);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    if (role !== 'patient') {
      api.get('/patients?limit=100').then((res) => {
        if (res.data.success) setPatients(res.data.patients);
      });
    }
  }, [statusFilter]);

  const handleOrderSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patientId: selectedPatient,
        testId: selectedTest,
        priority: orderPriority,
      };

      const res = await api.post('/lab/orders', payload);
      if (res.data.success) {
        setIsOrderOpen(false);
        fetchOrders();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to order lab test');
    }
  };

  const openResultsModal = (order) => {
    setSelectedOrderForResults(order);
    setResultValues(
      order.results?.map((r) => ({
        parameter: r.parameter,
        observedValue: r.observedValue || '',
        normalRange: r.normalRange,
        unit: r.unit,
        flag: r.flag || 'normal',
      })) || []
    );
    setTechnicianNotes(order.technicianNotes || '');
  };

  const handleResultsSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.patch(`/lab/orders/${selectedOrderForResults._id}`, {
        status: 'Completed',
        results: resultValues,
        technicianNotes,
      });

      if (res.data.success) {
        setSelectedOrderForResults(null);
        fetchOrders();
        setPrintableReport(res.data.order);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit test results');
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      const res = await api.patch(`/lab/orders/${orderId}`, { status: newStatus });
      if (res.data.success) {
        fetchOrders();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update order status');
    }
  };

  const updateResultValue = (index, val) => {
    const updated = [...resultValues];
    updated[index].observedValue = val;
    // Check if numeric and compare with range
    updated[index].flag = 'normal'; // default
    setResultValues(updated);
  };

  const toggleFlag = (index, flag) => {
    const updated = [...resultValues];
    updated[index].flag = flag;
    setResultValues(updated);
  };

  const filteredOrders = orders.filter((o) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const patName = `${o.patient?.firstName} ${o.patient?.lastName}`.toLowerCase();
    const testName = o.test?.name?.toLowerCase();
    const repNum = o.reportNumber?.toLowerCase();
    return patName.includes(term) || testName?.includes(term) || repNum?.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Laboratory & Pathology Services</h2>
          <p className="text-xs text-slate-500">Diagnostic test ordering, specimen accessioning, and clinical parameter reporting</p>
        </div>

        {role !== 'patient' && (
          <button
            onClick={() => setIsOrderOpen(true)}
            className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Order Diagnostic Test</span>
          </button>
        )}
      </div>

      {/* Filter and Search */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by report #, test name, patient..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Requested">Requested</option>
            <option value="Sample Collected">Sample Collected</option>
            <option value="Processing">Processing</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Fetching laboratory accession records..." />
        ) : filteredOrders.length === 0 ? (
          <EmptyState
            icon={FlaskConical}
            title="No laboratory orders found"
            description="No active diagnostic test requests found."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Report #</th>
                  <th className="py-3 px-4">Diagnostic Test</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Priority / Sample</th>
                  <th className="py-3 px-4">Order Date</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => (
                  <tr key={ord._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-medical-700">
                      {ord.reportNumber}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{ord.test?.name}</div>
                      <div className="text-[10px] text-slate-400">{ord.test?.category}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {ord.patient?.firstName} {ord.patient?.lastName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{ord.patient?.uhid}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">{ord.priority}</span>
                      <span className="block text-[10px] text-slate-400">{ord.test?.sampleType || 'Specimen'}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(ord.requestedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </td>
                    <td className="py-3 px-4">
                      <Badge>{ord.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Sample Collected action */}
                        {role !== 'patient' && ord.status === 'Requested' && (
                          <button
                            onClick={() => updateOrderStatus(ord._id, 'Sample Collected')}
                            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-700 rounded text-xs font-semibold border border-sky-200"
                          >
                            Collect Sample
                          </button>
                        )}

                        {/* Enter Results action */}
                        {role !== 'patient' && (ord.status === 'Sample Collected' || ord.status === 'Processing') && (
                          <button
                            onClick={() => openResultsModal(ord)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold border border-emerald-200"
                          >
                            Enter Results
                          </button>
                        )}

                        {/* View Completed Report */}
                        {ord.status === 'Completed' && (
                          <button
                            onClick={() => setPrintableReport(ord)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold inline-flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Report</span>
                          </button>
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

      {/* Order Test Modal */}
      <Modal
        isOpen={isOrderOpen}
        onClose={() => setIsOrderOpen(false)}
        title="Order Diagnostic Laboratory Test"
        subtitle="Select pathology/biochemistry test from catalog to initiate lab accessioning."
      >
        <form onSubmit={handleOrderSubmit} className="space-y-4">
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

          <div>
            <label className="block text-xs font-medium text-slate-700">Laboratory Test *</label>
            <select
              required
              value={selectedTest}
              onChange={(e) => setSelectedTest(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="">Select Test from Catalog</option>
              {tests.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.category}) — ${t.price} [Turnaround: {t.turnaroundHours}h]
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Clinical Priority</label>
            <select
              value={orderPriority}
              onChange={(e) => setOrderPriority(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="Routine">Routine (Standard Schedule)</option>
              <option value="Urgent">Urgent Priority</option>
              <option value="STAT (Emergency)">STAT (Emergency Trauma Bay)</option>
            </select>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsOrderOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Confirm Test Order
            </button>
          </div>
        </form>
      </Modal>

      {/* Enter Results Modal */}
      <Modal
        isOpen={!!selectedOrderForResults}
        onClose={() => setSelectedOrderForResults(null)}
        title={`Enter Diagnostic Results: ${selectedOrderForResults?.test?.name || ''}`}
        subtitle={`Accession #${selectedOrderForResults?.reportNumber} • Patient: ${selectedOrderForResults?.patient?.firstName} ${selectedOrderForResults?.patient?.lastName}`}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleResultsSubmit} className="space-y-4">
          <p className="text-xs text-slate-500">
            Log observed biological values against normal reference ranges. Mark parameters abnormal or critical where flagged.
          </p>

          <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
            {resultValues.map((r, idx) => (
              <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800">{r.parameter}</span>
                  <span className="text-slate-400 font-mono text-[11px]">
                    Normal Range: {r.normalRange} {r.unit}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="Observed Value (e.g. 14.2)"
                    value={r.observedValue}
                    onChange={(e) => updateResultValue(idx, e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none"
                  />

                  {/* Flag selector pills */}
                  <button
                    type="button"
                    onClick={() => toggleFlag(idx, 'normal')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                      r.flag === 'normal'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Normal
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFlag(idx, 'abnormal')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                      r.flag === 'abnormal'
                        ? 'bg-amber-600 text-white border-amber-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Abnormal
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleFlag(idx, 'critical')}
                    className={`px-2 py-1 rounded text-[11px] font-semibold border ${
                      r.flag === 'critical'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-slate-50 text-slate-600 border-slate-200'
                    }`}
                  >
                    Critical
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Technician Remarks & Observations</label>
            <textarea
              rows={2}
              placeholder="Sample clarity, verification notes, specimen comments..."
              value={technicianNotes}
              onChange={(e) => setTechnicianNotes(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setSelectedOrderForResults(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Finalize & Publish Report
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Laboratory Diagnostic Report */}
      <Modal
        isOpen={!!printableReport}
        onClose={() => setPrintableReport(null)}
        title="Diagnostic Laboratory Report"
        subtitle={`Accession #${printableReport?.reportNumber || ''}`}
        maxWidth="max-w-2xl"
      >
        {printableReport && (
          <div className="space-y-4">
            <div className="border border-slate-300 p-6 rounded-xl bg-white space-y-4 print-area">
              <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    APEX CENTRAL CLINICAL LABORATORIES
                  </h3>
                  <p className="text-[10px] text-slate-600">
                    Department of Pathology & Molecular Diagnostics • ISO 15189 Accredited
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-bold text-slate-800">{printableReport.reportNumber}</p>
                  <p className="text-[10px] text-emerald-600 font-bold uppercase">FINAL REPORT</p>
                </div>
              </div>

              {/* Patient Bar */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <p className="font-bold text-slate-900">
                    Patient: {printableReport.patient?.firstName} {printableReport.patient?.lastName}
                  </p>
                  <p className="text-slate-500 text-[11px] font-mono">
                    UHID: {printableReport.patient?.uhid} • Gender: {printableReport.patient?.gender}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-800">Test: {printableReport.test?.name}</p>
                  <p className="text-slate-500 text-[11px]">
                    Completed: {printableReport.completedAt ? new Date(printableReport.completedAt).toLocaleString() : 'Recent'}
                  </p>
                </div>
              </div>

              {/* Results Table */}
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border">Analyte / Test Parameter</th>
                    <th className="p-2 border">Observed Result</th>
                    <th className="p-2 border">Reference Range</th>
                    <th className="p-2 border">Unit</th>
                    <th className="p-2 border">Status Flag</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printableReport.results?.map((res, i) => (
                    <tr key={i} className={res.flag === 'critical' ? 'bg-rose-50/50' : ''}>
                      <td className="p-2 border font-medium text-slate-800">{res.parameter}</td>
                      <td className={`p-2 border font-bold ${res.flag === 'critical' ? 'text-rose-600' : res.flag === 'abnormal' ? 'text-amber-600' : 'text-slate-900'}`}>
                        {res.observedValue}
                      </td>
                      <td className="p-2 border text-slate-600 font-mono">{res.normalRange}</td>
                      <td className="p-2 border text-slate-500">{res.unit}</td>
                      <td className="p-2 border">
                        <Badge size="sm">{res.flag}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Tech remarks */}
              {printableReport.technicianNotes && (
                <div className="text-xs text-slate-700 border-t border-slate-200 pt-2">
                  <span className="font-bold">Remarks: </span>
                  <span>{printableReport.technicianNotes}</span>
                </div>
              )}

              {/* Signoff */}
              <div className="pt-6 flex justify-between items-end border-t border-slate-200 text-xs text-slate-500">
                <div>
                  <p className="text-[10px]">Electronic Laboratory Verification System</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">Dr. Robert Langdon, MD</p>
                  <p className="text-[10px]">Consultant Pathologist</p>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Diagnostic Report</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default LaboratoryPage;
