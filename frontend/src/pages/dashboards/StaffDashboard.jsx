import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import StatCard from '../../components/common/StatCard';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import {
  Users,
  Calendar,
  Pill,
  FlaskConical,
  Bed,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const StaffDashboard = () => {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState({});
  const [pendingLabs, setPendingLabs] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchStaffData = async () => {
      try {
        const [aptRes, invRes, labRes] = await Promise.all([
          api.get('/appointments'),
          api.get('/pharmacy/inventory?limit=1'),
          api.get('/lab/orders?status=Requested'),
        ]);

        if (aptRes.data.success) setAppointments(aptRes.data.appointments);
        if (invRes.data.success) setInventoryAlerts(invRes.data.alerts || {});
        if (labRes.data.success) setPendingLabs(labRes.data.orders);
      } catch (err) {
        console.error('Failed to load staff workstation data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStaffData();
  }, []);

  if (loading) return <LoadingSpinner text="Connecting to clinical nursing and lab queues..." />;

  const todayStr = new Date().toDateString();
  const todayAppointments = appointments.filter(
    (a) => new Date(a.appointmentDate).toDateString() === todayStr
  );

  const rawRole = user?.role || user?.profile?.roleType || 'staff';
  const roleDisplay = rawRole
    .replace('_', ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <div className="space-y-6">
      {/* Staff Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-6 rounded-2xl text-white shadow-md flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-200 bg-white/10 px-2.5 py-0.5 rounded-full border border-white/15">
            Hospital Operations & Staff Desk
          </span>
          <h2 className="text-xl sm:text-2xl font-bold mt-2">
            Welcome, {user?.name}
          </h2>
          <p className="text-xs text-emerald-100 mt-1">
            Department: {user?.profile?.department?.name || 'General Hospital Services'} • Role: {roleDisplay}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {rawRole === 'pharmacist' && (
            <button
              onClick={() => navigate('/staff/pharmacy')}
              className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Pill className="w-4 h-4 text-emerald-700" />
              <span>Pharmacy Dispensing</span>
            </button>
          )}

          {rawRole === 'lab_technician' && (
            <button
              onClick={() => navigate('/staff/lab')}
              className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <FlaskConical className="w-4 h-4 text-emerald-700" />
              <span>Lab Processing</span>
            </button>
          )}

          {rawRole === 'billing_staff' && (
            <button
              onClick={() => navigate('/staff/billing')}
              className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <span>Billing & Cashier</span>
            </button>
          )}

          {(rawRole === 'nurse' || rawRole === 'staff') && (
            <button
              onClick={() => navigate('/staff/wards')}
              className="px-4 py-2 bg-white text-emerald-900 hover:bg-emerald-50 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5"
            >
              <Bed className="w-4 h-4 text-emerald-700" />
              <span>Manage Beds</span>
            </button>
          )}

          <button
            onClick={() => navigate('/staff/appointments')}
            className="px-4 py-2 bg-emerald-900/60 hover:bg-emerald-900 border border-emerald-400/30 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5"
          >
            <Calendar className="w-4 h-4 text-emerald-300" />
            <span>OPD Queue</span>
          </button>
        </div>
      </div>

      {/* Staff KPI StatCards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <StatCard
          title="Today's OPD Queue"
          value={todayAppointments.length}
          subtitle="Outpatients scheduled today"
          icon={Calendar}
          color="blue"
          onClick={() => navigate('/staff/appointments')}
        />

        <StatCard
          title="Pending Lab Tests"
          value={pendingLabs.length}
          subtitle="Samples waiting collection/analysis"
          icon={FlaskConical}
          color="purple"
          onClick={() => navigate('/staff/lab')}
        />

        <StatCard
          title="Low Stock Medicines"
          value={inventoryAlerts.lowStockCount || 0}
          subtitle="Items below reorder safety threshold"
          icon={Pill}
          color="rose"
          onClick={() => navigate('/staff/pharmacy')}
        />

        <StatCard
          title="Expiring Medicines"
          value={inventoryAlerts.expiringSoonCount || 0}
          subtitle="Expiring in < 90 days"
          icon={Clock}
          color="amber"
          onClick={() => navigate('/staff/pharmacy')}
        />
      </div>

      {/* Quick Action Queue Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lab Orders Queue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Lab Diagnostic Worklist</h3>
              <p className="text-xs text-slate-500">Unprocessed laboratory test orders</p>
            </div>
            <button
              onClick={() => navigate('/staff/lab')}
              className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
            >
              <span>Worklist</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {pendingLabs.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                All diagnostic test orders are currently up-to-date.
              </div>
            ) : (
              pendingLabs.slice(0, 4).map((lab) => (
                <div
                  key={lab._id}
                  className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">
                        {lab.test?.name}
                      </span>
                      <Badge size="sm">{lab.status}</Badge>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Patient: {lab.patient?.firstName} {lab.patient?.lastName} ({lab.patient?.uhid})
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/staff/lab')}
                    className="px-3 py-1 bg-medical-50 hover:bg-medical-100 text-medical-700 rounded-lg text-xs font-semibold border border-medical-200"
                  >
                    Process
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Pharmacy Quick Access */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Pharmacy & Stock Operations</h3>
                <p className="text-xs text-slate-500">Real-time inventory thresholds & dispensing</p>
              </div>
              <button
                onClick={() => navigate('/staff/pharmacy')}
                className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
              >
                <span>Inventory</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-600 space-y-2">
              <p className="font-semibold text-slate-800">Dispensing Protocol:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-600">
                <li>Verify patient UHID and authorized doctor signature on e-Prescription.</li>
                <li>Check batch numbers and expiration dates prior to packaging.</li>
                <li>System automatically reduces stock quantities upon submission.</li>
              </ul>
            </div>
          </div>

          <button
            onClick={() => navigate('/staff/pharmacy')}
            className="mt-4 w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-colors"
          >
            Open Pharmacy Dispensing Terminal
          </button>
        </div>
      </div>
    </div>
  );
};

export default StaffDashboard;
