import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import StatCard from '../../components/common/StatCard';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import Badge from '../../components/common/Badge';
import {
  Users,
  Stethoscope,
  Calendar,
  Bed,
  DollarSign,
  Activity,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Clock,
  Filter,
  CheckCircle2,
  AlertCircle,
  FlaskConical,
  Pill,
  CreditCard,
  Shield,
  Layers,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  CartesianGrid,
  Legend,
} from 'recharts';

const PIE_COLORS = ['#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

const AdminDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedRange, setSelectedRange] = useState('all');
  const navigate = useNavigate();

  const fetchDashboard = async (range = selectedRange) => {
    try {
      setLoading(true);
      const res = await api.get(`/analytics/dashboard?range=${range}`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard(selectedRange);
  }, [selectedRange]);

  if (loading && !data) return <LoadingSpinner text="Aggregating clinical and hospital analytics..." />;

  const kpis = data?.kpis || {};
  const charts = data?.charts || {};
  const alerts = kpis?.alerts || {};
  const recentActivities = data?.recentActivities || [];

  return (
    <div className="space-y-6">
      {/* Top Banner with Date Range Filters */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-medical-950 via-slate-900 to-medical-900 p-6 rounded-2xl text-white shadow-xl border border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-medical-500/20 text-medical-300 border border-medical-500/30 uppercase tracking-wider">
              <Shield className="w-3 h-3 text-medical-400" /> Executive Operations Center
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">• Live Synced</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight">Hospital Command & Analytics</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Real-time operational monitoring, clinical throughput, bed census, pharmacy stock warnings, and revenue analytics.
          </p>
        </div>

        {/* Range Filter Buttons */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 self-start md:self-auto">
          <div className="bg-slate-800/90 p-1 rounded-xl border border-slate-700 flex items-center gap-1 text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-400 ml-2 mr-1" />
            {[
              { id: 'today', label: 'Today' },
              { id: 'week', label: '7 Days' },
              { id: 'month', label: '30 Days' },
              { id: 'all', label: 'All Time' },
            ].map((btn) => (
              <button
                key={btn.id}
                onClick={() => setSelectedRange(btn.id)}
                className={`px-3 py-1.5 rounded-lg font-semibold transition-all ${
                  selectedRange === btn.id
                    ? 'bg-medical-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => navigate('/admin/approvals')}
            className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Registration Approvals</span>
          </button>
          <button
            onClick={() => navigate('/admin/appointments')}
            className="px-4 py-2 bg-white text-medical-900 hover:bg-medical-50 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-1.5"
          >
            <span>OPD Queue</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Operational Critical Alerts Banner */}
      {(alerts.lowStockMedicinesCount > 0 || alerts.pendingLabOrdersCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {alerts.lowStockMedicinesCount > 0 && (
            <div
              onClick={() => navigate('/admin/pharmacy')}
              className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 flex items-center justify-between cursor-pointer hover:bg-amber-100/60 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
                  <Pill className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-900">
                    {alerts.lowStockMedicinesCount} Medicine(s) Below Reorder Level
                  </p>
                  <p className="text-[11px] text-amber-700">
                    {alerts.lowStockMedicines?.map((m) => m.name).join(', ') || 'Critical supplies depleted'}
                  </p>
                </div>
              </div>
              <span className="text-xs font-semibold text-amber-800 flex items-center gap-1">
                Restock <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          )}

          {alerts.pendingLabOrdersCount > 0 && (
            <div
              onClick={() => navigate('/admin/lab')}
              className="p-3.5 rounded-xl bg-sky-50 border border-sky-200/80 flex items-center justify-between cursor-pointer hover:bg-sky-100/60 transition-colors shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-sky-100 text-sky-700">
                  <FlaskConical className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-sky-900">
                    {alerts.pendingLabOrdersCount} Diagnostic Orders in Pipeline
                  </p>
                  <p className="text-[11px] text-sky-700">Awaiting specimen collection or laboratory processing</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-sky-800 flex items-center gap-1">
                View Lab <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          )}
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Registered Patients"
          value={kpis.totalPatients || 0}
          subtitle="Electronic health records active"
          icon={Users}
          color="blue"
          onClick={() => navigate('/admin/patients')}
        />

        <StatCard
          title="Medical Staff on Duty"
          value={`${kpis.totalDoctors || 0} Docs / ${kpis.totalStaff || 0} Staff`}
          subtitle="Verified active clinical practitioners"
          icon={Stethoscope}
          color="purple"
          onClick={() => navigate('/admin/doctors')}
        />

        <StatCard
          title="Today's Appointments"
          value={kpis.todayAppointments?.total || 0}
          subtitle={`${kpis.todayAppointments?.completed || 0} Completed • ${kpis.todayAppointments?.pending || 0} Awaiting`}
          icon={Calendar}
          color="emerald"
          onClick={() => navigate('/admin/appointments')}
        />

        <StatCard
          title="Bed Occupancy Rate"
          value={`${kpis.bedMetrics?.occupancyPercent || 0}%`}
          subtitle={`${kpis.bedMetrics?.occupied || 0} Occupied / ${kpis.bedMetrics?.total || 0} Total Beds`}
          icon={Bed}
          color="amber"
          onClick={() => navigate('/admin/wards')}
        />
      </div>

      {/* Financial Overview Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-3.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Gross Billed Revenue</p>
            <p className="text-lg font-extrabold text-slate-900">${(kpis.financials?.totalRevenue || 0).toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
          <div className="p-3 rounded-xl bg-sky-50 text-sky-600">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Cash Collected</p>
            <p className="text-lg font-extrabold text-emerald-600">${(kpis.financials?.totalCollected || 0).toFixed(2)}</p>
          </div>
        </div>

        <div className="flex items-center gap-3.5 p-3.5 bg-slate-50/80 rounded-xl border border-slate-100">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <CreditCard className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Outstanding Invoiced Balance</p>
            <p className="text-lg font-extrabold text-amber-700">${(kpis.financials?.outstandingBalance || 0).toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section 1: Inflow Trend & Financial Bar Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Patient Growth (Area Chart) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Patient Registration Inflow</h3>
              <p className="text-xs text-slate-500">Chronological enrollment trend from MongoDB</p>
            </div>
            <span className="text-[11px] font-semibold text-medical-700 bg-medical-50 px-2.5 py-1 rounded-full border border-medical-100">
              Live Aggregation
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyRegistrations || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="patientGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0284c7" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0284c7" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Area type="monotone" dataKey="patients" stroke="#0284c7" strokeWidth={2.5} fillOpacity={1} fill="url(#patientGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Monthly Revenue & Collection (Bar Chart) */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Monthly Revenue & Collections</h3>
              <p className="text-xs text-slate-500">Gross billed invoices vs actual payments collected ($)</p>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
              Invoicing Metric
            </span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.monthlyRevenue || []} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '12px',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                <Bar dataKey="revenue" name="Billed Revenue" fill="#0284c7" radius={[4, 4, 0, 0]} />
                <Bar dataKey="collected" name="Collected Cash" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Interactive Charts Section 2: Department Workload & Bed Census */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department Distribution (Donut Chart) */}
        <div className="lg:col-span-2 bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Clinical Department Workload</h3>
              <p className="text-xs text-slate-500">Distribution of patient appointments by medical specialty</p>
            </div>
            <button
              onClick={() => navigate('/admin/appointments')}
              className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
            >
              <span>View Roster</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={charts.departmentDistribution || []}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {(charts.departmentDistribution || []).map((entry, index) => (
                      <Cell key={`dept-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      border: 'none',
                      borderRadius: '8px',
                      color: '#fff',
                      fontSize: '11px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="space-y-2">
              {(charts.departmentDistribution || []).map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-xs p-2 rounded-lg bg-slate-50/70 border border-slate-100">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="font-medium text-slate-700 truncate">{d.name}</span>
                  </div>
                  <span className="font-bold text-slate-900 ml-2">{d.value} Visits</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Hospital Bed Matrix Census Breakdown */}
        <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900">Bed Census Status</h3>
              <Badge size="sm">{kpis.bedMetrics?.total || 0} Beds Total</Badge>
            </div>
            <p className="text-xs text-slate-500">Live ward occupancy breakdown</p>
          </div>

          <div className="h-44 w-full my-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.bedOccupancy || []}
                  cx="50%"
                  cy="50%"
                  innerRadius={45}
                  outerRadius={70}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {(charts.bedOccupancy || []).map((entry, index) => (
                    <Cell key={`bed-${index}`} fill={entry.color || PIE_COLORS[index]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#fff',
                    fontSize: '11px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-sky-600" /> Occupied Inpatients
              </span>
              <span className="font-bold text-slate-900">{kpis.bedMetrics?.occupied || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> Available Beds
              </span>
              <span className="font-bold text-emerald-600">{kpis.bedMetrics?.available || 0}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 text-slate-600">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> Sterilization/Maint.
              </span>
              <span className="font-bold text-amber-700">{kpis.bedMetrics?.maintenance || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent System Activities & Audit Feed */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Hospital Activity & Audit Trail</h3>
            <p className="text-xs text-slate-500">Live immutable audit logs of clinical encounters and operational events</p>
          </div>
          <button
            onClick={() => navigate('/admin/audit')}
            className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
          >
            <span>Full Audit Log</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {recentActivities.length === 0 ? (
            <p className="text-xs text-slate-400 py-6 text-center">No recent activity logged in audit trail.</p>
          ) : (
            recentActivities.map((act) => (
              <div key={act._id} className="py-3 flex items-center justify-between gap-4 hover:bg-slate-50/60 transition-colors px-2 rounded-xl">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-lg bg-slate-100 text-slate-600 flex-shrink-0">
                    <Activity className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-800">{act.action}</span>
                      <Badge size="sm">{act.entity || 'System'}</Badge>
                      {(act.userRole || act.actor?.role) && (
                        <span className="text-[10px] font-mono text-slate-400 uppercase">
                          [{act.userRole || act.actor?.role}]
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                      By <span className="font-medium text-slate-700">{act.userEmail || act.actor?.name || 'admin@hospital.com'}</span> • Action Target: {act.entityId || act.details || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400 flex-shrink-0">
                  <Clock className="w-3 h-3" />
                  <span>
                    {(() => {
                      const raw = act.createdAt || act.timestamp;
                      const d = raw ? new Date(raw) : new Date();
                      return !isNaN(d.getTime())
                        ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        : 'Just now';
                    })()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
