import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  UserCheck,
  Plus,
  Search,
  Building,
  Clock,
  Shield,
} from 'lucide-react';

const StaffManagementPage = () => {
  const [staffList, setStaffList] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('All');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    roleType: 'nurse',
    department: '',
    shift: 'Morning',
  });

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (roleFilter !== 'All') params.append('roleType', roleFilter);

      const [stfRes, deptRes] = await Promise.all([
        api.get(`/staff?${params.toString()}`),
        api.get('/departments'),
      ]);

      if (stfRes.data.success) setStaffList(stfRes.data.staff || []);
      if (deptRes.data.success) setDepartments(deptRes.data.departments || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, [roleFilter]);

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/staff', formData);
      if (res.data.success) {
        setIsAddOpen(false);
        fetchStaff();
        setFormData({
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          roleType: 'nurse',
          department: '',
          shift: 'Morning',
        });
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register staff');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hospital Staff & Duty Rosters</h2>
          <p className="text-xs text-slate-500">Administration of nursing officers, pharmacists, laboratory technicians, and duty shifts</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Register Staff Member</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Staff Specialty:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          >
            <option value="All">All Staff Roles</option>
            <option value="nurse">Nursing Officer</option>
            <option value="pharmacist">Clinical Pharmacist</option>
            <option value="lab_technician">Laboratory Technician</option>
            <option value="receptionist">Medical Receptionist</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Fetching hospital staff records..." />
        ) : staffList.length === 0 ? (
          <EmptyState
            icon={UserCheck}
            title="No staff members found"
            description="No active staff records match your criteria."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Role Title</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Assigned Shift</th>
                  <th className="py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {staffList.map((stf) => (
                  <tr key={stf._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-800">{stf.staffId}</td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {stf.name || `${stf.firstName || ''} ${stf.lastName || ''}`.trim() || 'Staff Member'}
                      </div>
                      <div className="text-[10px] text-slate-400">{stf.user?.email || stf.email}</div>
                    </td>
                    <td className="py-3 px-4 capitalize font-medium text-slate-700">
                      {(stf.roleType || stf.role || 'Staff').replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {stf.department?.name || stf.department || 'General Operations'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">{stf.phone}</td>
                    <td className="py-3 px-4">
                      <span className="font-medium text-slate-800">{stf.shift} Shift</span>
                    </td>
                    <td className="py-3 px-4">
                      <Badge>{stf.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Register Staff Modal */}
      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Register Hospital Staff Member"
        subtitle="Configures credentials, role assignment, and duty shift schedule."
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">First Name *</label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Last Name *</label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Email Address *</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700">Phone Number *</label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Role Type *</label>
              <select
                value={formData.roleType}
                onChange={(e) => setFormData({ ...formData, roleType: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="nurse">Nurse</option>
                <option value="pharmacist">Pharmacist</option>
                <option value="lab_technician">Lab Tech</option>
                <option value="receptionist">Receptionist</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Department</label>
              <select
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="">Select Department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Shift *</label>
              <select
                value={formData.shift}
                onChange={(e) => setFormData({ ...formData, shift: e.target.value })}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="Morning">Morning</option>
                <option value="Evening">Evening</option>
                <option value="Night">Night</option>
              </select>
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
              Confirm Staff Registration
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default StaffManagementPage;
