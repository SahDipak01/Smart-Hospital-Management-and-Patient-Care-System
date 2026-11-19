import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  Building,
  Search,
  Plus,
  Stethoscope,
  Phone,
  Layers,
  Edit2,
  CheckCircle,
  XCircle,
  Eye,
  UserCheck,
  Shield,
  ArrowRight,
  Activity,
  Heart,
  Brain,
  Bone,
  Baby,
  Zap,
} from 'lucide-react';

const DEPT_ICONS = {
  Heart,
  Brain,
  Bone,
  Baby,
  Stethoscope,
  Zap,
  Activity,
  Building,
};

const DepartmentsPage = () => {
  const { role } = useAuth();
  const isAdmin = role === 'admin';

  const [departments, setDepartments] = useState([]);
  const [allDoctors, setAllDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  const [selectedDeptDetails, setSelectedDeptDetails] = useState(null);
  const [deptDoctors, setDeptDoctors] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Assign Doctor Modal
  const [isAssignOpen, setIsAssignOpen] = useState(false);
  const [assignDept, setAssignDept] = useState(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    floor: '1st Floor',
    contactPhone: '',
    headDoctor: '',
    icon: 'Activity',
  });
  const [formError, setFormError] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (statusFilter !== 'All') params.append('isActive', statusFilter === 'Active' ? 'true' : 'false');

      const [deptRes, docRes] = await Promise.all([
        api.get(`/departments?${params.toString()}`),
        api.get('/doctors'),
      ]);

      if (deptRes.data.success) setDepartments(deptRes.data.departments);
      if (docRes.data.success) setAllDoctors(docRes.data.doctors);
    } catch (err) {
      console.error('Failed to fetch departments:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const delay = setTimeout(fetchDepartments, 250);
    return () => clearTimeout(delay);
  }, [searchTerm, statusFilter]);

  const openDetails = async (dept) => {
    try {
      setSelectedDeptDetails(dept);
      setDetailsLoading(true);
      const res = await api.get(`/departments/${dept._id}`);
      if (res.data.success) {
        setDeptDoctors(res.data.doctors || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setDetailsLoading(false);
    }
  };

  const openCreateModal = () => {
    setEditingDept(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      floor: '1st Floor',
      contactPhone: '',
      headDoctor: '',
      icon: 'Activity',
    });
    setFormError('');
    setIsAddEditOpen(true);
  };

  const openEditModal = (dept) => {
    setEditingDept(dept);
    setFormData({
      code: dept.code,
      name: dept.name,
      description: dept.description || '',
      floor: dept.floor || '1st Floor',
      contactPhone: dept.contactPhone || '',
      headDoctor: dept.headDoctor?._id || '',
      icon: dept.icon || 'Activity',
    });
    setFormError('');
    setIsAddEditOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError('');

    try {
      if (editingDept) {
        const res = await api.put(`/departments/${editingDept._id}`, formData);
        if (res.data.success) {
          setIsAddEditOpen(false);
          fetchDepartments();
        }
      } else {
        const res = await api.post('/departments', formData);
        if (res.data.success) {
          setIsAddEditOpen(false);
          fetchDepartments();
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save department.');
    } finally {
      setFormLoading(false);
    }
  };

  const toggleStatus = async (dept) => {
    try {
      const res = await api.patch(`/departments/${dept._id}/status`);
      if (res.data.success) {
        fetchDepartments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle status.');
    }
  };

  const handleAssignDoctor = async (e) => {
    e.preventDefault();
    if (!selectedDoctorId || !assignDept) return;

    try {
      const res = await api.patch(`/departments/${assignDept._id}/assign-doctor`, {
        doctorId: selectedDoctorId,
      });
      if (res.data.success) {
        setIsAssignOpen(false);
        fetchDepartments();
        if (selectedDeptDetails?._id === assignDept._id) {
          openDetails(assignDept);
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reassign doctor.');
    }
  };

  const totalDoctorsCount = departments.reduce((acc, d) => acc + (d.doctorCount || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-gradient-to-r from-medical-900 to-slate-900 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-medical-500/20 text-medical-200 border border-medical-500/30 uppercase tracking-wider">
              <Building className="w-3 h-3 text-medical-400" /> Hospital Infrastructure
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold mt-2">Department Management</h2>
          <p className="text-xs text-slate-300 mt-1">
            Clinical specialties, medical staff allocation, hospital floor wings, and departmental heads.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openCreateModal}
            className="px-4 py-2.5 bg-medical-600 hover:bg-medical-500 rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create Department</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search departments by code, name, description, floor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 font-medium text-slate-700"
          >
            <option value="All">All Statuses</option>
            <option value="Active">Active Only</option>
            <option value="Inactive">Inactive Only</option>
          </select>
        </div>
      </div>

      {/* Department Cards Grid */}
      {loading ? (
        <LoadingSpinner text="Fetching hospital clinical departments..." />
      ) : departments.length === 0 ? (
        <EmptyState
          icon={Building}
          title="No departments found"
          description="Adjust your search query or create a new department."
          actionText={isAdmin ? "Create Department" : undefined}
          onAction={isAdmin ? openCreateModal : undefined}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {departments.map((dept) => {
            const IconComponent = DEPT_ICONS[dept.icon] || Building;
            return (
              <div
                key={dept._id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-medical-50 text-medical-600 border border-medical-100 flex items-center justify-center flex-shrink-0">
                        <IconComponent className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{dept.name}</h3>
                          <span className="font-mono text-[10px] font-bold text-medical-700 bg-medical-50 px-2 py-0.5 rounded border border-medical-200">
                            {dept.code}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
                          <Layers className="w-3 h-3 text-slate-400" />
                          <span>{dept.floor}</span>
                        </p>
                      </div>
                    </div>

                    <Badge size="sm">{dept.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>

                  <p className="text-xs text-slate-600 mt-3 line-clamp-2 leading-relaxed">
                    {dept.description || 'Specialized clinical care and patient diagnostics.'}
                  </p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] font-medium text-slate-500">Head of Department:</span>
                      <span className="font-semibold text-slate-800">
                        {dept.headDoctor ? `Dr. ${dept.headDoctor.firstName} ${dept.headDoctor.lastName}` : 'Unassigned'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-slate-600">
                      <span className="text-[11px] font-medium text-slate-500">Medical Doctors:</span>
                      <span className="font-bold text-medical-700 bg-medical-50 px-2 py-0.5 rounded text-[11px]">
                        {dept.doctorCount} Doctors
                      </span>
                    </div>
                    {dept.contactPhone && (
                      <div className="flex items-center justify-between text-slate-600">
                        <span className="text-[11px] font-medium text-slate-500">Extension:</span>
                        <span className="font-mono text-[11px] text-slate-700">{dept.contactPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => openDetails(dept)}
                    className="flex-1 py-1.5 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View Team</span>
                  </button>

                  {isAdmin && (
                    <>
                      <button
                        onClick={() => {
                          setAssignDept(dept);
                          setSelectedDoctorId('');
                          setIsAssignOpen(true);
                        }}
                        title="Assign Doctor"
                        className="p-2 text-slate-500 hover:text-medical-600 hover:bg-medical-50 rounded-xl border border-slate-200 transition-colors"
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => openEditModal(dept)}
                        title="Edit Department"
                        className="p-2 text-slate-500 hover:text-medical-600 hover:bg-medical-50 rounded-xl border border-slate-200 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => toggleStatus(dept)}
                        title={dept.isActive ? 'Deactivate' : 'Activate'}
                        className={`p-2 rounded-xl border transition-colors ${
                          dept.isActive
                            ? 'text-slate-400 hover:text-rose-600 hover:bg-rose-50 border-slate-200'
                            : 'text-emerald-600 bg-emerald-50 hover:bg-emerald-100 border-emerald-200'
                        }`}
                      >
                        {dept.isActive ? <XCircle className="w-3.5 h-3.5" /> : <CheckCircle className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* View Department Details & Medical Team Modal */}
      <Modal
        isOpen={!!selectedDeptDetails}
        onClose={() => setSelectedDeptDetails(null)}
        title={selectedDeptDetails ? `${selectedDeptDetails.name} (${selectedDeptDetails.code})` : 'Department Details'}
        maxWidth="max-w-2xl"
      >
        {detailsLoading ? (
          <div className="py-8">
            <LoadingSpinner text="Retrieving department clinical roster..." />
          </div>
        ) : selectedDeptDetails ? (
          <div className="space-y-4">
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-2">
              <p className="text-slate-700 leading-relaxed">{selectedDeptDetails.description}</p>
              <div className="flex flex-wrap gap-4 pt-2 border-t border-slate-200/80 text-slate-600">
                <span>Floor: <strong className="text-slate-800">{selectedDeptDetails.floor}</strong></span>
                <span>Contact: <strong className="text-slate-800">{selectedDeptDetails.contactPhone || 'N/A'}</strong></span>
                <span>Status: <strong className="text-emerald-600">{selectedDeptDetails.isActive ? 'Active' : 'Inactive'}</strong></span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-medical-600" />
                  <span>Assigned Clinical Doctors ({deptDoctors.length})</span>
                </h4>

                {isAdmin && (
                  <button
                    onClick={() => {
                      setAssignDept(selectedDeptDetails);
                      setSelectedDoctorId('');
                      setIsAssignOpen(true);
                    }}
                    className="text-xs font-semibold text-medical-600 hover:text-medical-700 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Assign Doctor
                  </button>
                )}
              </div>

              {deptDoctors.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400 bg-slate-50 rounded-xl border border-slate-100">
                  No doctors currently assigned to this department.
                </div>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {deptDoctors.map((doc) => (
                    <div
                      key={doc._id}
                      className="p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900">Dr. {doc.firstName} {doc.lastName}</span>
                          <span className="font-mono text-[10px] text-slate-400">({doc.doctorId})</span>
                          <Badge size="sm">{doc.status}</Badge>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {doc.specialization} • Room: {doc.roomNumber} • Fee: ${doc.consultationFee}
                        </p>
                      </div>

                      <span className="text-[11px] font-mono text-slate-400">{doc.phone}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      {/* Add / Edit Department Modal */}
      <Modal
        isOpen={isAddEditOpen}
        onClose={() => setIsAddEditOpen(false)}
        title={editingDept ? `Edit Department: ${editingDept.name}` : 'Create New Department'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Code</label>
              <input
                type="text"
                required
                maxLength={6}
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl uppercase font-mono"
                placeholder="e.g. CARD"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Floor Location</label>
              <input
                type="text"
                required
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                placeholder="e.g. 3rd Floor"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Department Name</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              placeholder="e.g. Cardiology & Cardiovascular Surgery"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Clinical Description</label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              placeholder="Scope of medical practice..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / Ext</label>
              <input
                type="text"
                value={formData.contactPhone}
                onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
                placeholder="Ext. 301"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department Icon</label>
              <select
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
              >
                <option value="Heart">Heart (Cardio)</option>
                <option value="Brain">Brain (Neuro)</option>
                <option value="Bone">Bone (Ortho)</option>
                <option value="Baby">Baby (Peds)</option>
                <option value="Stethoscope">Stethoscope (General)</option>
                <option value="Zap">Zap (Emergency)</option>
                <option value="Activity">Activity (General)</option>
                <option value="Building">Building</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Head of Department (Doctor)</label>
            <select
              value={formData.headDoctor}
              onChange={(e) => setFormData({ ...formData, headDoctor: e.target.value })}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            >
              <option value="">None / Unassigned</option>
              {allDoctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  Dr. {doc.firstName} {doc.lastName} ({doc.specialization})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={formLoading}
              className="w-full py-2.5 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 transition-colors"
            >
              {formLoading ? 'Saving...' : editingDept ? 'Update Department' : 'Create Department'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Assign Doctor to Department Modal */}
      <Modal
        isOpen={isAssignOpen}
        onClose={() => setIsAssignOpen(false)}
        title={assignDept ? `Assign Doctor to ${assignDept.name}` : 'Assign Doctor'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleAssignDoctor} className="space-y-4">
          <p className="text-xs text-slate-600">
            Select a verified doctor to assign to the <strong>{assignDept?.name}</strong> clinical roster.
          </p>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Doctor</label>
            <select
              required
              value={selectedDoctorId}
              onChange={(e) => setSelectedDoctorId(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl"
            >
              <option value="">Choose a doctor...</option>
              {allDoctors.map((doc) => (
                <option key={doc._id} value={doc._id}>
                  Dr. {doc.firstName} {doc.lastName} — {doc.specialization} (Currently: {doc.department?.name || 'Unassigned'})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!selectedDoctorId}
              className="w-full py-2.5 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 transition-colors"
            >
              Confirm Assignment
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default DepartmentsPage;
