import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  Pill,
  Search,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Package,
  Layers,
  ArrowRight,
} from 'lucide-react';

const PharmacyPage = () => {
  const { role } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [alerts, setAlerts] = useState({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [expiringFilter, setExpiringFilter] = useState(false);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDispenseOpen, setIsDispenseOpen] = useState(false);
  const [prescriptions, setPrescriptions] = useState([]);
  const [selectedRxId, setSelectedRxId] = useState('');
  const [dispenseItems, setDispenseItems] = useState([]);
  const [dispensePatientId, setDispensePatientId] = useState('');

  // Add Medicine Form
  const [newMed, setNewMed] = useState({
    name: '',
    genericName: '',
    category: 'Antibiotics',
    dosageForm: 'Tablet',
    strength: '500 mg',
    unitPrice: 15.0,
    stockQuantity: 100,
    reorderLevel: 20,
    batchNumber: 'BAT-2026-X1',
    expiryDate: '2027-12-31',
    manufacturer: 'Pfizer Pharmaceuticals',
    rackLocation: 'Rack A-01',
  });

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter !== 'All') params.append('category', categoryFilter);
      if (lowStockFilter) params.append('lowStock', 'true');
      if (expiringFilter) params.append('expiringSoon', 'true');

      const res = await api.get(`/pharmacy/inventory?${params.toString()}`);
      if (res.data.success) {
        setMedicines(res.data.medicines || res.data.inventory || []);
        setAlerts(res.data.alerts || {});
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [categoryFilter, lowStockFilter, expiringFilter]);

  useEffect(() => {
    const delayDebounce = setTimeout(fetchInventory, 300);
    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const loadPrescriptionsForDispensing = async () => {
    try {
      const res = await api.get('/prescriptions?status=Active');
      if (res.data.success) {
        setPrescriptions(res.data.prescriptions);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const openDispenseModal = () => {
    setIsDispenseOpen(true);
    loadPrescriptionsForDispensing();
    setSelectedRxId('');
    setDispenseItems([]);
  };

  const handleRxSelect = (rxId) => {
    setSelectedRxId(rxId);
    const rx = prescriptions.find((p) => p._id === rxId);
    if (rx) {
      setDispensePatientId(rx.patient?._id);
      // Map prescribed items to dispense rows
      const items = (rx.medicines || []).map((m) => {
        // Find matching medicine in stock
        const match = medicines.find(
          (med) => med.name.toLowerCase().includes(m.name.toLowerCase()) || m.name.toLowerCase().includes(med.name.toLowerCase())
        );
        return {
          prescriptionMedicineName: m.name,
          medicineId: match ? match._id : '',
          availableStock: match ? match.stockQuantity : 0,
          quantity: m.quantity || 10,
          unitPrice: match ? match.unitPrice : 15,
        };
      });
      setDispenseItems(items);
    }
  };

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/pharmacy/inventory', newMed);
      if (res.data.success) {
        setIsAddOpen(false);
        fetchInventory();
        setNewMed({
          name: '',
          genericName: '',
          category: 'Antibiotics',
          dosageForm: 'Tablet',
          strength: '500 mg',
          unitPrice: 15.0,
          stockQuantity: 100,
          reorderLevel: 20,
          batchNumber: 'BAT-2026-X1',
          expiryDate: '2027-12-31',
          manufacturer: 'Pfizer Pharmaceuticals',
          rackLocation: 'Rack A-01',
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add medicine');
    }
  };

  const handleDispenseSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        prescriptionId: selectedRxId || null,
        patientId: dispensePatientId,
        items: dispenseItems.map((item) => ({
          medicineId: item.medicineId,
          quantity: Number(item.quantity),
        })),
      };

      const res = await api.post('/pharmacy/dispense', payload);
      if (res.data.success) {
        setIsDispenseOpen(false);
        fetchInventory();
        alert('Medications dispensed successfully! Stock quantities have been automatically updated.');
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to dispense medications');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Pharmacy & Medicine Inventory</h2>
          <p className="text-xs text-slate-500">Stock inventory management, batch & expiry monitoring, and prescription-linked dispensing</p>
        </div>

        {role !== 'patient' && (
          <div className="flex gap-2 self-start sm:self-auto">
            <button
              onClick={openDispenseModal}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Dispense Medications</span>
            </button>
            <button
              onClick={() => setIsAddOpen(true)}
              className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Add Medicine</span>
            </button>
          </div>
        )}
      </div>

      {/* Alert Warning Banners */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => {
            setLowStockFilter(!lowStockFilter);
            setExpiringFilter(false);
          }}
          className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            lowStockFilter
              ? 'bg-rose-100 border-rose-400 ring-2 ring-rose-400'
              : 'bg-rose-50/70 border-rose-200 hover:bg-rose-100/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-100 text-rose-700 rounded-lg">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-rose-900">Low Stock Alert</h4>
              <p className="text-[11px] text-rose-700">
                {alerts.lowStockCount || 0} medicine(s) below minimum safety reorder level
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-rose-700">
            {lowStockFilter ? 'Filtering' : 'View'}
          </span>
        </div>

        <div
          onClick={() => {
            setExpiringFilter(!expiringFilter);
            setLowStockFilter(false);
          }}
          className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
            expiringFilter
              ? 'bg-amber-100 border-amber-400 ring-2 ring-amber-400'
              : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/50'
          }`}
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-100 text-amber-700 rounded-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-amber-900">Upcoming Expirations</h4>
              <p className="text-[11px] text-amber-700">
                {alerts.expiringSoonCount || 0} batch(es) expiring in less than 90 days
              </p>
            </div>
          </div>
          <span className="text-xs font-bold text-amber-700">
            {expiringFilter ? 'Filtering' : 'View'}
          </span>
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
            placeholder="Search by name, generic, item code..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          >
            <option value="All">All Categories</option>
            <option value="Antibiotics">Antibiotics</option>
            <option value="Analgesics & Pain Relief">Analgesics & Pain Relief</option>
            <option value="Cardiovascular">Cardiovascular</option>
            <option value="Respiratory">Respiratory</option>
            <option value="Gastrointestinal">Gastrointestinal</option>
            <option value="Endocrine & Diabetes">Endocrine & Diabetes</option>
            <option value="Emergency & Critical Care">Emergency & Critical Care</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Querying medicine inventory database..." />
        ) : medicines.length === 0 ? (
          <EmptyState
            icon={Pill}
            title="No inventory records found"
            description="No medicines match your current filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Item Code</th>
                  <th className="py-3 px-4">Medicine Name</th>
                  <th className="py-3 px-4">Category / Form</th>
                  <th className="py-3 px-4">Unit Price</th>
                  <th className="py-3 px-4">Stock Level</th>
                  <th className="py-3 px-4">Batch #</th>
                  <th className="py-3 px-4">Expiry Date</th>
                  <th className="py-3 px-4">Rack Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {medicines.map((m) => {
                  const stock = m.stockQuantity ?? m.stock ?? 0;
                  const price = Number(m.unitPrice ?? m.price ?? 0);
                  const reorder = m.reorderLevel ?? 50;
                  const isLow = stock <= reorder;
                  const itemCode = m.itemCode || m.batchNumber || `MED-${m._id?.slice(-4) || '101'}`;
                  const isExpiring = m.expiryDate ? new Date(m.expiryDate) < new Date(Date.now() + 90 * 24 * 60 * 60 * 1000) : false;
                  return (
                    <tr
                      key={m._id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isLow ? 'bg-rose-50/30' : isExpiring ? 'bg-amber-50/30' : ''
                      }`}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-700">
                        {itemCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{m.name}</div>
                        <div className="text-[10px] text-slate-400">{m.genericName || m.name} ({m.strength || 'Standard'})</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">{m.category}</span>
                        <span className="block text-[10px] text-slate-400">{m.dosageForm || 'Tablet/Vial'}</span>
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-600">
                        ${price.toFixed(2)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-bold ${
                            isLow ? 'text-rose-600' : 'text-slate-900'
                          }`}
                        >
                          {stock} units
                        </span>
                        {isLow && (
                          <span className="block text-[10px] text-rose-500 font-semibold uppercase">
                            Low Stock (Reorder: {reorder})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-600">
                        {m.batchNumber}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`font-semibold ${
                            isExpiring ? 'text-amber-700' : 'text-slate-700'
                          }`}
                        >
                          {new Date(m.expiryDate).toLocaleDateString([], { month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium">
                        {m.rackLocation}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Medicine Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add Medicine to Inventory"
        subtitle="Catalog new pharmaceutical formulation with batch tracking and reorder thresholds."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Medicine Trade Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Amoxicillin Clavulanate"
                value={newMed.name}
                onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Generic Formula *</label>
              <input
                type="text"
                required
                placeholder="e.g. Amoxicillin / Clavulanic Acid"
                value={newMed.genericName}
                onChange={(e) => setNewMed({ ...newMed, genericName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Category *</label>
              <select
                value={newMed.category}
                onChange={(e) => setNewMed({ ...newMed, category: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="Antibiotics">Antibiotics</option>
                <option value="Analgesics & Pain Relief">Analgesics & Pain Relief</option>
                <option value="Cardiovascular">Cardiovascular</option>
                <option value="Respiratory">Respiratory</option>
                <option value="Gastrointestinal">Gastrointestinal</option>
                <option value="Endocrine & Diabetes">Endocrine & Diabetes</option>
                <option value="Emergency & Critical Care">Emergency & Critical Care</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Dosage Form *</label>
              <select
                value={newMed.dosageForm}
                onChange={(e) => setNewMed({ ...newMed, dosageForm: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Inhaler">Inhaler</option>
                <option value="IV Fluid">IV Fluid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Strength (mg/ml) *</label>
              <input
                type="text"
                required
                value={newMed.strength}
                onChange={(e) => setNewMed({ ...newMed, strength: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Unit Price ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={newMed.unitPrice}
                onChange={(e) => setNewMed({ ...newMed, unitPrice: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Initial Stock *</label>
              <input
                type="number"
                required
                value={newMed.stockQuantity}
                onChange={(e) => setNewMed({ ...newMed, stockQuantity: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Reorder Alert Level</label>
              <input
                type="number"
                value={newMed.reorderLevel}
                onChange={(e) => setNewMed({ ...newMed, reorderLevel: Number(e.target.value) })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Batch Number *</label>
              <input
                type="text"
                required
                value={newMed.batchNumber}
                onChange={(e) => setNewMed({ ...newMed, batchNumber: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Expiry Date *</label>
              <input
                type="date"
                required
                value={newMed.expiryDate}
                onChange={(e) => setNewMed({ ...newMed, expiryDate: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Rack Location</label>
              <input
                type="text"
                value={newMed.rackLocation}
                onChange={(e) => setNewMed({ ...newMed, rackLocation: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Add to Stock
            </button>
          </div>
        </form>
      </Modal>

      {/* Prescription Dispense Terminal Modal */}
      <Modal
        isOpen={isDispenseOpen}
        onClose={() => setIsDispenseOpen(false)}
        title="Prescription Dispensing Terminal"
        subtitle="Validate authorized e-Prescription and issue medications. Decrements stock quantities atomically."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleDispenseSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700">Select Active e-Prescription *</label>
            <select
              required
              value={selectedRxId}
              onChange={(e) => handleRxSelect(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            >
              <option value="">Select Prescription</option>
              {prescriptions.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.prescriptionNumber} — Patient: {p.patient?.firstName} {p.patient?.lastName} (Dr. {p.doctor?.lastName})
                </option>
              ))}
            </select>
          </div>

          {dispenseItems.length > 0 && (
            <div className="space-y-2 border border-slate-200 rounded-xl p-3 bg-slate-50">
              <span className="block text-xs font-bold text-slate-700">
                Prescribed Drug Items & Stock Availability:
              </span>

              {dispenseItems.map((item, idx) => {
                const hasStock = item.availableStock >= item.quantity;
                return (
                  <div key={idx} className="p-2.5 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{item.prescriptionMedicineName}</span>
                      <p className={`text-[11px] ${hasStock ? 'text-emerald-600' : 'text-rose-600 font-semibold'}`}>
                        Available Stock: {item.availableStock} units (Requested: {item.quantity})
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-800">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </span>
                      <Badge size="sm" variant={hasStock ? 'success' : 'danger'}>
                        {hasStock ? 'In Stock' : 'Low Stock'}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDispenseOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedRxId || dispenseItems.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50"
            >
              Confirm Dispense & Deduct Inventory
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default PharmacyPage;
