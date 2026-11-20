import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  UserCheck,
  Stethoscope,
  Heart,
  Pill,
  FlaskConical,
  CreditCard,
  Building,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Search,
  Filter,
  Shield,
  Eye,
  Calendar,
  Phone,
  Mail,
  Award,
} from 'lucide-react';

const ApprovalsPage = () => {
  const [requests, setRequests] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState({ pending: 0, approved: 0, rejected: 0, total: 0 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('Pending');
  const [roleFilter, setRoleFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals & Actions
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [isDossierOpen, setIsDossierOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [isRejectOpen, setIsRejectOpen] = useState(false);
  const [selectedDeptId, setSelectedDeptId] = useState('');
  const [roomNumber, setRoomNumber] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchApprovals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (roleFilter !== 'All') params.append('role', roleFilter);
      if (searchTerm) params.append('search', searchTerm);

      const [reqRes, statsRes, deptRes] = await Promise.all([
        api.get(`/auth/approvals?${params.toString()}`),
        api.get('/auth/approvals/stats'),
        api.get('/departments'),
      ]);

      if (reqRes.data.success) setRequests(reqRes.data.requests || reqRes.data.applicants || []);
      if (statsRes.data.success) setStats(statsRes.data.stats);
      if (deptRes.data.success) setDepartments(deptRes.data.departments || []);
    } catch (err) {
      console.error('Failed to load registration approvals:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [statusFilter, roleFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchApprovals();
  };

  const openApproveModal = (applicant) => {
    setSelectedApplicant(applicant);
    const existingDept =
      applicant.profileRef?.department?._id ||
      applicant.registrationDetails?.departmentId ||
      departments[0]?._id ||
      '';
    setSelectedDeptId(existingDept);
    setRoomNumber(applicant.registrationDetails?.roomNumber || applicant.profileRef?.roomNumber || 'OPD-101');
    setIsApproveOpen(true);
  };

  const handleApproveSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApplicant) return;
    setIsSubmitting(true);
    try {
      const res = await api.post(`/auth/approvals/${selectedApplicant._id}/approve`, {
        departmentId: selectedDeptId,
        roomNumber,
      });
      if (res.data.success) {
        setIsApproveOpen(false);
        setSelectedApplicant(null);
        fetchApprovals();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openRejectModal = (applicant) => {
    setSelectedApplicant(applicant);
    setRejectionReason('Clinical credentials or licensing documentation could not be verified.');
    setIsRejectOpen(true);
  };

  const handleRejectSubmit = async (e) => {
    e.preventDefault();
    if (!selectedApplicant) return;
    setIsSubmitting(true);
    try {
      const res = await api.post(`/auth/approvals/${selectedApplicant._id}/reject`, {
        reason: rejectionReason,
      });
      if (res.data.success) {
        setIsRejectOpen(false);
        setSelectedApplicant(null);
        fetchApprovals();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to reject registration');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDossier = (applicant) => {
    setSelectedApplicant(applicant);
    setIsDossierOpen(true);
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'doctor':
        return <Stethoscope className="w-4 h-4 text-sky-600" />;
      case 'nurse':
        return <Heart className="w-4 h-4 text-rose-500" />;
      case 'pharmacist':
        return <Pill className="w-4 h-4 text-emerald-600" />;
      case 'lab_technician':
        return <FlaskConical className="w-4 h-4 text-purple-600" />;
      case 'billing_staff':
        return <CreditCard className="w-4 h-4 text-amber-600" />;
      case 'receptionist':
        return <UserCheck className="w-4 h-4 text-blue-600" />;
      default:
        return <Shield className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatRoleLabel = (role) => {
    if (!role) return 'Staff';
    if (role === 'doctor') return 'Doctor (Physician)';
    if (role === 'lab_technician') return 'Lab Technician';
    if (role === 'billing_staff') return 'Billing Staff';
    return role.charAt(0).toUpperCase() + role.slice(1);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-medical-950 to-slate-900 p-6 rounded-2xl text-white shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              <Shield className="w-3 h-3 text-amber-400" /> Administrative Access Control
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">• Identity Verification</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold mt-2 tracking-tight">
            Registration & Role Approvals Hub
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl">
            Review and verify credentials for incoming Doctors, Nurses, Pharmacists, Laboratory Technicians, Receptionists, and Billing Staff. Unapproved applicants cannot access hospital workstations.
          </p>
        </div>

        {/* Quick Stats Pill */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-800/80 p-2.5 rounded-xl border border-slate-700/80">
          <div className="text-center px-3 py-1">
            <p className="text-[10px] text-amber-300 font-semibold uppercase">Pending</p>
            <p className="text-lg font-bold text-amber-400">{stats.pending}</p>
          </div>
          <div className="text-center px-3 py-1 border-l border-slate-700">
            <p className="text-[10px] text-emerald-300 font-semibold uppercase">Approved</p>
            <p className="text-lg font-bold text-emerald-400">{stats.approved}</p>
          </div>
          <div className="text-center px-3 py-1 border-l border-slate-700">
            <p className="text-[10px] text-rose-300 font-semibold uppercase">Rejected</p>
            <p className="text-lg font-bold text-rose-400">{stats.rejected}</p>
          </div>
          <div className="text-center px-3 py-1 border-l border-slate-700">
            <p className="text-[10px] text-slate-300 font-semibold uppercase">Total</p>
            <p className="text-lg font-bold text-white">{stats.total}</p>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs overflow-x-auto">
          {['Pending', 'Approved', 'Rejected', 'All'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all whitespace-nowrap ${
                statusFilter === st
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {st} {st === 'Pending' && stats.pending > 0 && `(${stats.pending})`}
            </button>
          ))}
        </div>

        {/* Role Filter & Search */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-slate-200 rounded-xl bg-white focus:outline-none focus:ring-2 focus:ring-medical-500/20"
          >
            <option value="All">All Roles</option>
            <option value="doctor">Doctors</option>
            <option value="nurse">Nurses</option>
            <option value="pharmacist">Pharmacists</option>
            <option value="lab_technician">Laboratory Technicians</option>
            <option value="receptionist">Receptionists</option>
            <option value="billing_staff">Billing Staff</option>
          </select>

          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="Search by name, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 w-full sm:w-56"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </form>
        </div>
      </div>

      {/* Main Applicant List */}
      {loading ? (
        <LoadingSpinner text="Retrieving applicant credentials and verification logs..." />
      ) : requests.length === 0 ? (
        <EmptyState
          title={`No ${statusFilter.toLowerCase()} registration requests`}
          description={
            statusFilter === 'Pending'
              ? 'All medical and staff registration applications have been verified. There are currently zero pending requests.'
              : 'No applicants matched your current search filters.'
          }
          icon={UserCheck}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((applicant) => {
            const details = applicant.registrationDetails || {};
            const isPending = applicant.approvalStatus === 'Pending';
            const isApproved = applicant.approvalStatus === 'Approved';
            const isRejected = applicant.approvalStatus === 'Rejected';

            return (
              <div
                key={applicant._id}
                className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm hover:shadow-md transition-all flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4"
              >
                {/* Left: Applicant Overview */}
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center flex-shrink-0 border border-slate-200">
                    {getRoleIcon(applicant.role)}
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-sm font-bold text-slate-900">{applicant.name}</h4>
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 flex items-center gap-1">
                        {getRoleIcon(applicant.role)}
                        <span>{formatRoleLabel(applicant.role)}</span>
                      </span>

                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                          <Clock className="w-3 h-3 text-amber-500" /> Awaiting Verification
                        </span>
                      )}

                      {isApproved && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved & Active
                        </span>
                      )}

                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                          <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-0.5">
                      <span className="flex items-center gap-1">
                        <Mail className="w-3.5 h-3.5 text-slate-400" />
                        {applicant.email}
                      </span>
                      {applicant.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          {applicant.phone}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Applied: {new Date(applicant.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    {/* Metadata highlights */}
                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-1">
                      {details.licenseNumber && (
                        <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 font-mono">
                          License: <strong className="text-slate-800">{details.licenseNumber}</strong>
                        </span>
                      )}
                      {details.specialization && (
                        <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                          Specialty: <strong className="text-slate-800">{details.specialization}</strong>
                        </span>
                      )}
                      {applicant.profileRef?.department?.name && (
                        <span className="bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200 flex items-center gap-1">
                          <Building className="w-3 h-3 text-slate-400" />
                          Dept: <strong className="text-slate-800">{applicant.profileRef.department.name}</strong>
                        </span>
                      )}
                    </div>

                    {isRejected && applicant.rejectionReason && (
                      <p className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded-lg border border-rose-200 mt-1">
                        <strong>Rejection Reason:</strong> {applicant.rejectionReason}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex items-center gap-2 self-end lg:self-center">
                  <button
                    onClick={() => openDossier(applicant)}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Dossier</span>
                  </button>

                  {isPending && (
                    <>
                      <button
                        onClick={() => openApproveModal(applicant)}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve & Activate</span>
                      </button>

                      <button
                        onClick={() => openRejectModal(applicant)}
                        className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-semibold transition-all flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Approve Modal with Department Assignment */}
      <Modal
        isOpen={isApproveOpen}
        onClose={() => setIsApproveOpen(false)}
        title="Approve & Activate Healthcare Account"
        subtitle={`Applicant: ${selectedApplicant?.name} • Role: ${formatRoleLabel(selectedApplicant?.role)}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleApproveSubmit} className="space-y-4">
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-emerald-900">Verification Confirmation</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                By approving this applicant, their account status will be set to Active. They will receive permission to sign in to their assigned hospital role dashboard immediately.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Assign Clinical Department *</label>
            <select
              value={selectedDeptId}
              onChange={(e) => setSelectedDeptId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 bg-white"
            >
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>
                  {dept.name} ({dept.code}) • Floor {dept.floor || '1'}
                </option>
              ))}
            </select>
          </div>

          {selectedApplicant?.role === 'doctor' && (
            <div>
              <label className="block text-xs font-semibold text-slate-700">OPD Consultation Room *</label>
              <input
                type="text"
                required
                value={roomNumber}
                onChange={(e) => setRoomNumber(e.target.value)}
                placeholder="e.g. OPD-305"
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 font-mono"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsApproveOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Activating Access...</span>
                </>
              ) : (
                'Confirm Approval'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal with Reason */}
      <Modal
        isOpen={isRejectOpen}
        onClose={() => setIsRejectOpen(false)}
        title="Reject Registration Request"
        subtitle={`Applicant: ${selectedApplicant?.name} • Role: ${formatRoleLabel(selectedApplicant?.role)}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleRejectSubmit} className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-rose-900">Rejection Notice</p>
              <p className="text-[11px] text-rose-700 mt-0.5">
                The applicant will not be granted access to the portal. The reason specified below will be displayed if they attempt to sign in.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Rejection Reason *</label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Specify why this registration was rejected (e.g. invalid license number, incomplete degree credentials)..."
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => setIsRejectOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              {isSubmitting ? 'Rejecting...' : 'Confirm Rejection'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Applicant Dossier Modal */}
      <Modal
        isOpen={isDossierOpen}
        onClose={() => setIsDossierOpen(false)}
        title="Applicant Clinical & Licensing Dossier"
        subtitle={`Applicant ID: ${selectedApplicant?._id}`}
        maxWidth="max-w-lg"
      >
        {selectedApplicant && (
          <div className="space-y-4 text-xs">
            {/* Identity Card */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center">
                {getRoleIcon(selectedApplicant.role)}
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">{selectedApplicant.name}</h3>
                <p className="text-slate-500">{selectedApplicant.email} • {selectedApplicant.phone}</p>
                <p className="text-[11px] font-semibold text-medical-700 mt-0.5">
                  Applied Role: {formatRoleLabel(selectedApplicant.role)}
                </p>
              </div>
            </div>

            {/* Submitted Registration Details */}
            <div className="space-y-2">
              <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">
                Submitted Credentials & Application Details
              </h4>
              <div className="bg-white border border-slate-200 rounded-xl p-3 divide-y divide-slate-100">
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">License / Council Reg No:</span>
                  <span className="font-mono font-bold text-slate-800">
                    {selectedApplicant.registrationDetails?.licenseNumber || 'Not submitted'}
                  </span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Qualifications:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedApplicant.registrationDetails?.qualifications ||
                      selectedApplicant.registrationDetails?.qualification ||
                      'Standard Degree'}
                  </span>
                </div>
                {selectedApplicant.registrationDetails?.specialization && (
                  <div className="py-1.5 flex justify-between">
                    <span className="text-slate-500">Specialization:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedApplicant.registrationDetails.specialization}
                    </span>
                  </div>
                )}
                {selectedApplicant.registrationDetails?.experienceYears && (
                  <div className="py-1.5 flex justify-between">
                    <span className="text-slate-500">Experience:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedApplicant.registrationDetails.experienceYears} Years
                    </span>
                  </div>
                )}
                {selectedApplicant.registrationDetails?.shiftPreference && (
                  <div className="py-1.5 flex justify-between">
                    <span className="text-slate-500">Shift Preference:</span>
                    <span className="font-semibold text-slate-800">
                      {selectedApplicant.registrationDetails.shiftPreference}
                    </span>
                  </div>
                )}
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Submission Timestamp:</span>
                  <span className="text-slate-700">
                    {new Date(selectedApplicant.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="py-1.5 flex justify-between">
                  <span className="text-slate-500">Verification Status:</span>
                  <span className="font-bold">
                    {selectedApplicant.approvalStatus}
                  </span>
                </div>
                {selectedApplicant.approvedBy && (
                  <div className="py-1.5 flex justify-between">
                    <span className="text-slate-500">Reviewed By:</span>
                    <span className="text-slate-700">
                      {selectedApplicant.approvedBy?.name || 'Administrator'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setIsDossierOpen(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold"
              >
                Close Dossier
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ApprovalsPage;
