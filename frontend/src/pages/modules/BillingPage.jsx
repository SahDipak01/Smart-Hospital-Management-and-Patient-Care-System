import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  CreditCard,
  Plus,
  Printer,
  DollarSign,
  Search,
  CheckCircle2,
  Trash2,
  Clock,
  ArrowRight,
} from 'lucide-react';

const BillingPage = () => {
  const { role } = useAuth();
  const [bills, setBills] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [selectedBillForPayment, setSelectedBillForPayment] = useState(null);
  const [printableBill, setPrintableBill] = useState(null);

  // Generate Bill Form
  const [selectedPatient, setSelectedPatient] = useState('');
  const [billItems, setBillItems] = useState([
    {
      category: 'Consultation',
      description: 'Specialist Physician Consultation',
      quantity: 1,
      unitPrice: 500,
    },
  ]);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Payment Form
  const [payAmount, setPayAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [transactionRef, setTransactionRef] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.append('status', statusFilter);

      const res = await api.get(`/billing?${params.toString()}`);
      if (res.data.success) {
        setBills(res.data.bills);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBills();
    if (role !== 'patient') {
      api.get('/patients?limit=100').then((res) => {
        if (res.data.success) setPatients(res.data.patients);
      });
    }
  }, [statusFilter]);

  const addBillItem = () => {
    setBillItems([
      ...billItems,
      {
        category: 'Laboratory',
        description: 'Diagnostic Test Panel',
        quantity: 1,
        unitPrice: 65,
      },
    ]);
  };

  const removeBillItem = (index) => {
    setBillItems(billItems.filter((_, i) => i !== index));
  };

  const updateBillItem = (index, field, value) => {
    const updated = [...billItems];
    updated[index][field] = value;
    setBillItems(updated);
  };

  const subTotal = billItems.reduce((acc, itm) => acc + Number(itm.quantity) * Number(itm.unitPrice), 0);
  const taxAmount = Math.round(subTotal * 0.05 * 100) / 100;
  const totalAmount = Math.max(0, subTotal + taxAmount - Number(discountAmount));

  const handleGenerateSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        patientId: selectedPatient,
        items: billItems.map((itm) => ({
          ...itm,
          amount: Number(itm.quantity) * Number(itm.unitPrice),
        })),
        discountAmount: Number(discountAmount),
        taxPercent: 5,
      };

      const res = await api.post('/billing/generate', payload);
      if (res.data.success) {
        setIsGenerateOpen(false);
        fetchBills();
        setPrintableBill(res.data.bill);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to generate bill');
    }
  };

  const openPaymentModal = (b) => {
    setSelectedBillForPayment(b);
    setPayAmount(String(b.balanceAmount));
    setTransactionRef(`TXN-${Date.now().toString().slice(-6)}`);
  };

  const handlePaymentSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingPayment(true);
    try {
      const res = await api.post(`/billing/${selectedBillForPayment._id}/payment`, {
        amount: Number(payAmount),
        paymentMethod,
        transactionRef,
      });

      if (res.data.success) {
        setSelectedBillForPayment(null);
        fetchBills();
        alert(res.data.message || 'Payment recorded successfully! Invoice status updated.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Payment processing failed');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // Financial aggregates
  const totalBilled = bills.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const totalCollected = bills.reduce((s, b) => s + (b.paidAmount || 0), 0);
  const totalBalance = bills.reduce((s, b) => s + (b.balanceAmount || 0), 0);

  const filteredBills = bills.filter((b) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const patName = `${b.patient?.firstName} ${b.patient?.lastName}`.toLowerCase();
    const num = b.billNumber?.toLowerCase();
    return patName.includes(term) || num.includes(term) || b.patient?.uhid?.toLowerCase().includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Billing & Invoices</h2>
          <p className="text-xs text-slate-500">Automated multi-service bill generation, payment logging, and tax invoicing</p>
        </div>

        {role !== 'patient' && (
          <button
            onClick={() => setIsGenerateOpen(true)}
            className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Generate Hospital Bill</span>
          </button>
        )}
      </div>

      {/* Financial Overview Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-sky-50 text-sky-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Billed</p>
            <p className="text-lg font-bold text-slate-900">${totalBilled.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Total Collected</p>
            <p className="text-lg font-bold text-emerald-600">${totalCollected.toFixed(2)}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase text-slate-400">Outstanding Balance</p>
            <p className="text-lg font-bold text-amber-700">${totalBalance.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by invoice #, patient, UHID..."
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
            <option value="All">All Invoices</option>
            <option value="Paid">Paid in Full</option>
            <option value="Partially Paid">Partially Paid</option>
            <option value="Pending">Pending Payment</option>
          </select>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Fetching financial billing ledger..." />
        ) : filteredBills.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="No billing records found"
            description="No hospital invoices match your current filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Invoice #</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Paid</th>
                  <th className="py-3 px-4">Balance</th>
                  <th className="py-3 px-4">Payment Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredBills.map((b) => (
                  <tr key={b._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-medical-700">
                      {b.billNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {new Date(b.billDate || b.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {b.patient?.firstName ? `${b.patient.firstName} ${b.patient.lastName || ''}`.trim() : (b.patient?.name || 'Walk-in Patient')}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{b.patient?.uhid || 'N/A'}</div>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-900">
                      ${Number(b.totalAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-bold text-emerald-600">
                      ${Number(b.paidAmount || 0).toFixed(2)}
                    </td>
                    <td className="py-3 px-4 font-bold text-amber-700">
                      ${Number(b.balanceAmount ?? Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0))).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <Badge>{b.paymentStatus || b.status || 'Pending'}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {Number(b.balanceAmount ?? Math.max(0, (b.totalAmount || 0) - (b.paidAmount || 0))) > 0 && (
                          <button
                            onClick={() => openPaymentModal(b)}
                            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold border border-emerald-200"
                          >
                            Pay Bill
                          </button>
                        )}
                        <button
                          onClick={() => setPrintableBill(b)}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Generate Bill Modal */}
      <Modal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        title="Generate Itemized Hospital Bill"
        subtitle="Aggregates consultation, room charges, laboratory tests, and pharmacy medications."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleGenerateSubmit} className="space-y-4">
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

          {/* Dynamic line items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700">Itemized Charges *</label>
              <button
                type="button"
                onClick={addBillItem}
                className="text-xs font-semibold text-medical-600 hover:text-medical-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Charge Item
              </button>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {billItems.map((itm, idx) => (
                <div key={idx} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs">
                  <select
                    value={itm.category}
                    onChange={(e) => updateBillItem(idx, 'category', e.target.value)}
                    className="w-32 px-2 py-1.5 border border-slate-200 rounded-lg bg-white"
                  >
                    <option value="Consultation">Consultation</option>
                    <option value="Bed Charges">Bed Charges</option>
                    <option value="Laboratory">Laboratory</option>
                    <option value="Pharmacy">Pharmacy</option>
                    <option value="Nursing Care">Nursing Care</option>
                    <option value="Surgery / Procedure">Procedure</option>
                    <option value="Other">Other</option>
                  </select>

                  <input
                    type="text"
                    required
                    placeholder="Item description"
                    value={itm.description}
                    onChange={(e) => updateBillItem(idx, 'description', e.target.value)}
                    className="flex-1 px-2.5 py-1.5 border border-slate-200 rounded-lg bg-white focus:outline-none"
                  />

                  <input
                    type="number"
                    min="1"
                    placeholder="Qty"
                    value={itm.quantity}
                    onChange={(e) => updateBillItem(idx, 'quantity', Number(e.target.value))}
                    className="w-16 px-2 py-1.5 border border-slate-200 rounded-lg bg-white text-center"
                  />

                  <input
                    type="number"
                    min="0"
                    placeholder="Price"
                    value={itm.unitPrice}
                    onChange={(e) => updateBillItem(idx, 'unitPrice', Number(e.target.value))}
                    className="w-20 px-2 py-1.5 border border-slate-200 rounded-lg bg-white font-mono"
                  />

                  {billItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeBillItem(idx)}
                      className="p-1 text-rose-500 hover:bg-rose-100 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Totals Summary */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Subtotal:</span>
              <span className="font-semibold text-slate-800">${subTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tax (5%):</span>
              <span className="font-semibold text-slate-800">${taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Discount Amount ($):</span>
              <input
                type="number"
                min="0"
                value={discountAmount}
                onChange={(e) => setDiscountAmount(Number(e.target.value))}
                className="w-20 px-2 py-1 border border-slate-200 rounded bg-white text-right"
              />
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 text-sm font-bold text-slate-900">
              <span>Final Total:</span>
              <span className="text-medical-700">${totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsGenerateOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Generate Bill
            </button>
          </div>
        </form>
      </Modal>

      {/* Record Payment Modal */}
      <Modal
        isOpen={!!selectedBillForPayment}
        onClose={() => setSelectedBillForPayment(null)}
        title="Record Bill Payment"
        subtitle={`Invoice #${selectedBillForPayment?.billNumber} • Outstanding Balance: $${selectedBillForPayment?.balanceAmount?.toFixed(2)}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handlePaymentSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">Payment Amount ($) *</label>
            <input
              type="number"
              step="0.01"
              required
              max={selectedBillForPayment?.balanceAmount}
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-bold text-slate-900"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Payment Method *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="Cash">Cash</option>
              <option value="Credit/Debit Card">Credit/Debit Card (POS)</option>
              <option value="UPI">UPI / Digital Wallet</option>
              <option value="Insurance">Third-Party Health Insurance</option>
              <option value="Net Banking">Net Banking</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Transaction Reference ID</label>
            <input
              type="text"
              required
              value={transactionRef}
              onChange={(e) => setTransactionRef(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none font-mono"
            />
          </div>

          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
            <Clock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Hospital Cashier Desk / Simulated Gateway</p>
              <p className="text-amber-700 mt-0.5">
                Ledger balances and patient accounts update immediately upon confirmation. For POS card swipes or UPI payments, record the transaction slip reference.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              disabled={isSubmittingPayment}
              onClick={() => setSelectedBillForPayment(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingPayment}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmittingPayment ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                'Record Payment'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Printable Invoice Modal */}
      <Modal
        isOpen={!!printableBill}
        onClose={() => setPrintableBill(null)}
        title="Hospital Tax Invoice"
        subtitle={`Invoice #${printableBill?.billNumber || ''}`}
        maxWidth="max-w-2xl"
      >
        {printableBill && (
          <div className="space-y-4">
            <div className="border border-slate-300 p-6 rounded-xl bg-white space-y-4 print-area">
              <div className="border-b-2 border-slate-800 pb-3 flex justify-between items-start">
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                    APEX MEMORIAL SMART HOSPITAL
                  </h3>
                  <p className="text-[10px] text-slate-600">
                    742 Healthcare Parkway, Medical District, NY 10001 • Tax ID: US-MED-99482
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-mono font-bold text-slate-800">{printableBill.billNumber}</p>
                  <p className="text-[10px] text-slate-500">
                    Date: {new Date(printableBill.billDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              {/* Patient Bar */}
              <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <p className="font-bold text-slate-900">
                    Billed To: {printableBill.patient?.firstName} {printableBill.patient?.lastName}
                  </p>
                  <p className="text-slate-500 text-[11px] font-mono">
                    UHID: {printableBill.patient?.uhid} • Phone: {printableBill.patient?.phone}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900">Status: {printableBill.paymentStatus}</p>
                  <p className="text-slate-500 text-[11px]">Due in 7 business days</p>
                </div>
              </div>

              {/* Items Table */}
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 uppercase text-[10px]">
                  <tr>
                    <th className="p-2 border">#</th>
                    <th className="p-2 border">Service Category</th>
                    <th className="p-2 border">Description</th>
                    <th className="p-2 border text-center">Qty</th>
                    <th className="p-2 border text-right">Unit Price</th>
                    <th className="p-2 border text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {printableBill.items?.map((itm, i) => (
                    <tr key={i}>
                      <td className="p-2 border text-slate-500 font-bold">{i + 1}</td>
                      <td className="p-2 border font-medium text-slate-700">{itm.category}</td>
                      <td className="p-2 border text-slate-800">{itm.description}</td>
                      <td className="p-2 border text-center">{itm.quantity}</td>
                      <td className="p-2 border text-right font-mono">${itm.unitPrice.toFixed(2)}</td>
                      <td className="p-2 border text-right font-mono font-bold">${itm.amount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Totals */}
              <div className="border-t border-slate-200 pt-3 text-xs space-y-1 ml-auto w-64">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal:</span>
                  <span className="font-mono">${printableBill.subTotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Tax (5%):</span>
                  <span className="font-mono">${printableBill.taxAmount.toFixed(2)}</span>
                </div>
                {printableBill.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discount:</span>
                    <span className="font-mono">-${printableBill.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-slate-200 pt-1 font-bold text-sm text-slate-900">
                  <span>Total Amount:</span>
                  <span className="font-mono">${printableBill.totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-emerald-700 font-semibold pt-0.5">
                  <span>Amount Paid:</span>
                  <span className="font-mono">${printableBill.paidAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-amber-800 font-bold pt-0.5 border-t border-dashed border-slate-300">
                  <span>Outstanding Balance:</span>
                  <span className="font-mono">${printableBill.balanceAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-md"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Invoice</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default BillingPage;
