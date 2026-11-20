import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  ShieldCheck,
  Search,
  Download,
  Clock,
  Activity,
  User,
  Terminal,
} from 'lucide-react';

const AuditLogsPage = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (actionFilter !== 'All') params.append('action', actionFilter);
      if (searchTerm) params.append('search', searchTerm);

      const res = await api.get(`/audit-logs?${params.toString()}`);
      if (res.data.success) {
        setLogs(res.data.logs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [actionFilter]);

  useEffect(() => {
    const delay = setTimeout(fetchLogs, 300);
    return () => clearTimeout(delay);
  }, [searchTerm]);

  const exportToCSV = () => {
    if (!logs.length) return;
    const headers = ['Action', 'Entity', 'Entity ID', 'User Email', 'User Role', 'IP Address', 'Timestamp'];
    const rows = logs.map((l) => [
      `"${l.action}"`,
      `"${l.entity}"`,
      `"${l.entityId}"`,
      `"${l.userEmail}"`,
      `"${l.userRole}"`,
      `"${l.ipAddress}"`,
      `"${new Date(l.createdAt).toISOString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `hospital_audit_trail_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">System Audit & Compliance Logs</h2>
          <p className="text-xs text-slate-500">Immutable ledger tracking clinical modifications, security logins, and administrative actions</p>
        </div>

        <button
          onClick={exportToCSV}
          disabled={!logs.length}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto disabled:opacity-50"
        >
          <Download className="w-4 h-4" />
          <span>Export Audit CSV</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by action, email, entity..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-500">Filter Event:</span>
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          >
            <option value="All">All Audit Events</option>
            <option value="AUTH_LOGIN">Authentication Logins</option>
            <option value="PATIENT_CREATE">Patient Registrations</option>
            <option value="APPOINTMENT_BOOKED">Appointments Booked</option>
            <option value="MEDICAL_RECORD_CREATED">Medical Records Created</option>
            <option value="PRESCRIPTION_CREATED">Prescriptions Created</option>
            <option value="MEDICINE_DISPENSED">Medicine Dispenses</option>
            <option value="PATIENT_ADMISSION">Inpatient Admissions</option>
            <option value="BILL_GENERATED">Bills Generated</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Querying secure audit ledger..." />
        ) : logs.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="No audit events found"
            description="No system activities match your filter."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Timestamp</th>
                  <th className="py-3 px-4">Action Event</th>
                  <th className="py-3 px-4">Affected Entity</th>
                  <th className="py-3 px-4">Entity ID</th>
                  <th className="py-3 px-4">Actor Email</th>
                  <th className="py-3 px-4">Actor Role</th>
                  <th className="py-3 px-4 font-mono">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {(() => {
                        const raw = log.createdAt || log.timestamp;
                        const d = raw ? new Date(raw) : new Date();
                        return !isNaN(d.getTime()) ? d.toLocaleString() : 'Recent';
                      })()}
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-800">
                      {log.action}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        {log.entity || 'System'}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-500 text-[11px]">
                      {log.entityId || 'N/A'}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {log.userEmail || log.actor?.name || 'admin@hospital.com'}
                    </td>
                    <td className="py-3 px-4">
                      <Badge size="sm">{log.userRole || log.actor?.role || 'admin'}</Badge>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                      {log.ipAddress || '127.0.0.1'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AuditLogsPage;
