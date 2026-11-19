import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import Badge from '../../components/common/Badge';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import EmptyState from '../../components/common/EmptyState';
import {
  Calendar,
  Search,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  User,
  Stethoscope,
  UserCheck,
} from 'lucide-react';

const AppointmentsPage = () => {
  const { role, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Booking Wizard Modal
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [bookingDept, setBookingDept] = useState('');
  const [bookingDoctor, setBookingDoctor] = useState('');
  const [bookingDate, setBookingDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [bookingPatient, setBookingPatient] = useState('');
  const [bookingReason, setBookingReason] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reschedule / Cancel Modal
  const [statusModalApt, setStatusModalApt] = useState(null);
  const [cancelReason, setCancelReason] = useState('');

  const fetchAppointments = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'All') params.append('status', statusFilter);
      if (dateFilter) params.append('date', dateFilter);

      const res = await api.get(`/appointments?${params.toString()}`);
      if (res.data.success) {
        setAppointments(res.data.appointments);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, [statusFilter, dateFilter]);

  // Load dropdown resources
  useEffect(() => {
    const loadResources = async () => {
      try {
        const [deptRes, docRes] = await Promise.all([
          api.get('/departments'),
          api.get('/doctors?isApproved=true'),
        ]);
        if (deptRes.data.success) setDepartments(deptRes.data.departments);
        if (docRes.data.success) setDoctors(docRes.data.doctors);

        if (role !== 'patient') {
          const patRes = await api.get('/patients?limit=100');
          if (patRes.data.success) setPatients(patRes.data.patients);
        }
      } catch (err) {
        console.error(err);
      }
    };
    loadResources();
  }, [role]);

  // Fetch slots whenever doctor and date change in booking wizard
  useEffect(() => {
    if (bookingDoctor && bookingDate) {
      const fetchSlots = async () => {
        setSlotsLoading(true);
        setSelectedSlot('');
        setBookingError('');
        try {
          const res = await api.get(`/doctors/${bookingDoctor}/slots?date=${bookingDate}`);
          if (res.data.success) {
            setAvailableSlots(res.data.slots);
          }
        } catch (err) {
          console.error(err);
        } finally {
          setSlotsLoading(false);
        }
      };
      fetchSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [bookingDoctor, bookingDate]);

  const handleBookSubmit = async (e) => {
    e.preventDefault();
    setBookingError('');
    setIsSubmitting(true);

    try {
      const payload = {
        doctorId: bookingDoctor,
        departmentId: bookingDept,
        appointmentDate: bookingDate,
        timeSlot: selectedSlot,
        reason: bookingReason,
        patientId: role === 'patient' ? undefined : bookingPatient,
      };

      const res = await api.post('/appointments', payload);
      if (res.data.success) {
        setIsBookModalOpen(false);
        fetchAppointments();
        // Reset wizard
        setBookingDept('');
        setBookingDoctor('');
        setSelectedSlot('');
        setBookingReason('');
      }
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Failed to book appointment. Time slot may have just been reserved.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (id, status, extra = {}) => {
    try {
      const res = await api.patch(`/appointments/${id}/status`, { status, ...extra });
      if (res.data.success) {
        setStatusModalApt(null);
        fetchAppointments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Status update failed');
    }
  };

  const handleCheckIn = async (id) => {
    try {
      const res = await api.patch(`/appointments/${id}/check-in`);
      if (res.data.success) {
        alert(res.data.message);
        fetchAppointments();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Check-in failed');
    }
  };

  const filteredDoctorsForDept = bookingDept
    ? doctors.filter((d) => d.department?._id === bookingDept || d.department === bookingDept)
    : doctors;

  const filteredAppointments = appointments.filter((apt) => {
    if (!searchTerm) return true;
    const patName = `${apt.patient?.firstName} ${apt.patient?.lastName}`.toLowerCase();
    const docName = `${apt.doctor?.firstName} ${apt.doctor?.lastName}`.toLowerCase();
    const term = searchTerm.toLowerCase();
    return (
      patName.includes(term) ||
      docName.includes(term) ||
      apt.appointmentNumber?.toLowerCase().includes(term) ||
      apt.patient?.uhid?.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Appointment Scheduling Hub</h2>
          <p className="text-xs text-slate-500">Atomic slot booking engine with double-booking prevention and token queue</p>
        </div>

        <button
          onClick={() => {
            setIsBookModalOpen(true);
            setBookingError('');
          }}
          className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center gap-1.5 self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Book Appointment</span>
        </button>
      </div>

      {/* Filter and Date Strip */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by token, patient, doctor, UHID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Date:</span>
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-[10px] text-slate-400 hover:text-slate-600 underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value="All">All Statuses</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Checked-In">Checked In (Waiting Room)</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Appointments List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading appointment calendar & queue..." />
        ) : filteredAppointments.length === 0 ? (
          <EmptyState
            icon={Calendar}
            title="No appointments found"
            description="No scheduled consultations match your active filters."
            actionText="Schedule New Appointment"
            onAction={() => setIsBookModalOpen(true)}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Apt #</th>
                  <th className="py-3 px-4">Date & Slot</th>
                  <th className="py-3 px-4">Patient Name</th>
                  <th className="py-3 px-4">Doctor & Specialty</th>
                  <th className="py-3 px-4">Reason for Visit</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAppointments.map((apt) => (
                  <tr key={apt._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      #{apt.queueNumber}
                      <span className="block text-[10px] font-normal text-slate-400 font-mono">
                        {apt.appointmentNumber}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-700">
                      <div>{new Date(apt.appointmentDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                        <Clock className="w-2.5 h-2.5" /> {apt.timeSlot}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">
                        {apt.patient?.firstName} {apt.patient?.lastName}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">{apt.patient?.uhid}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-800">
                        Dr. {apt.doctor?.firstName} {apt.doctor?.lastName}
                      </div>
                      <div className="text-[10px] text-medical-600">{apt.doctor?.specialization}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                      {apt.reason}
                    </td>
                    <td className="py-3 px-4">
                      <Badge>{apt.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-right">
                      {apt.status === 'Confirmed' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleCheckIn(apt._id)}
                            title="Patient Check-In to Clinic"
                            className="px-2.5 py-1 bg-medical-50 hover:bg-medical-100 text-medical-700 rounded text-xs font-semibold border border-medical-200 transition-colors flex items-center gap-1"
                          >
                            <UserCheck className="w-3 h-3" />
                            <span>Check In</span>
                          </button>
                          {role !== 'patient' && (
                            <button
                              onClick={() => updateStatus(apt._id, 'Completed')}
                              title="Mark Completed"
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold border border-emerald-200 transition-colors"
                            >
                              Complete
                            </button>
                          )}
                          <button
                            onClick={() => setStatusModalApt(apt)}
                            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded text-xs font-semibold border border-rose-200 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      {apt.status === 'Checked-In' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-200">
                            In Waiting Room (Token #{apt.queueNumber})
                          </span>
                          {role !== 'patient' && (
                            <button
                              onClick={() => updateStatus(apt._id, 'Completed')}
                              title="Mark Completed"
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded text-xs font-semibold border border-emerald-200 transition-colors"
                            >
                              Complete
                            </button>
                          )}
                        </div>
                      )}
                      {apt.status === 'Completed' && (
                        <span className="text-[11px] font-medium text-emerald-600 flex items-center justify-end gap-1">
                          <CheckCircle className="w-3.5 h-3.5" /> Fulfilled
                        </span>
                      )}
                      {apt.status === 'Cancelled' && (
                        <span className="text-[11px] text-slate-400">Cancelled</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Smart Slot Booking Wizard Modal */}
      <Modal
        isOpen={isBookModalOpen}
        onClose={() => setIsBookModalOpen(false)}
        title="Smart Appointment Booking"
        subtitle="Select doctor and date to view live available slots. Conflict-prevention engine guarantees zero overlapping bookings."
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleBookSubmit} className="space-y-4">
          {bookingError && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{bookingError}</span>
            </div>
          )}

          {/* If caller is Admin/Staff, select Patient */}
          {role !== 'patient' && (
            <div>
              <label className="block text-xs font-medium text-slate-700">Patient *</label>
              <select
                required
                value={bookingPatient}
                onChange={(e) => setBookingPatient(e.target.value)}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="">Select Patient from Registry</option>
                {patients.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.firstName} {p.lastName} ({p.uhid}) - {p.phone}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700">Medical Department *</label>
              <select
                required
                value={bookingDept}
                onChange={(e) => {
                  setBookingDept(e.target.value);
                  setBookingDoctor('');
                }}
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
              <label className="block text-xs font-medium text-slate-700">Consulting Physician *</label>
              <select
                required
                value={bookingDoctor}
                onChange={(e) => setBookingDoctor(e.target.value)}
                className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
              >
                <option value="">Select Doctor</option>
                {filteredDoctorsForDept.map((doc) => (
                  <option key={doc._id} value={doc._id}>
                    Dr. {doc.firstName} {doc.lastName} (${doc.consultationFee})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Consultation Date *</label>
            <input
              type="date"
              required
              min={new Date().toISOString().split('T')[0]}
              value={bookingDate}
              onChange={(e) => setBookingDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          {/* Slot Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1.5">
              Available 20-Min Appointment Slots *
            </label>

            {slotsLoading ? (
              <p className="text-xs text-slate-400 py-3">Generating real-time availability slots...</p>
            ) : availableSlots.length === 0 ? (
              <p className="text-xs text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                Please select a doctor and date to view consultation slots.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-40 overflow-y-auto p-1">
                {availableSlots.map((item) => (
                  <button
                    type="button"
                    key={item.slot}
                    disabled={!item.isAvailable}
                    onClick={() => setSelectedSlot(item.slot)}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      selectedSlot === item.slot
                        ? 'border-medical-600 bg-medical-600 text-white shadow-md'
                        : item.isAvailable
                        ? 'border-slate-200 bg-white text-slate-800 hover:border-medical-400 hover:bg-sky-50/50'
                        : 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed line-through'
                    }`}
                  >
                    {item.slot}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700">Reason for Consultation *</label>
            <textarea
              required
              rows={2}
              placeholder="Describe primary symptoms or reason for visit..."
              value={bookingReason}
              onChange={(e) => setBookingReason(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsBookModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!selectedSlot || isSubmitting}
              className="px-4 py-2 bg-medical-600 hover:bg-medical-700 text-white rounded-xl text-xs font-semibold shadow-md disabled:opacity-50 transition-colors"
            >
              {isSubmitting ? 'Confirming...' : 'Confirm Appointment'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Cancellation Dialog */}
      <Modal
        isOpen={!!statusModalApt}
        onClose={() => setStatusModalApt(null)}
        title="Cancel Appointment"
        subtitle={`Token #${statusModalApt?.queueNumber} (${statusModalApt?.appointmentNumber})`}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-600">
            Are you sure you want to cancel this appointment with Dr. {statusModalApt?.doctor?.lastName}? This action will release the slot for other patients.
          </p>

          <div>
            <label className="block text-xs font-medium text-slate-700">Reason for Cancellation</label>
            <input
              type="text"
              placeholder="e.g. Patient rescheduled, emergency conflict"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              className="mt-1 block w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setStatusModalApt(null)}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Keep Appointment
            </button>
            <button
              onClick={() => updateStatus(statusModalApt._id, 'Cancelled', { cancellationReason: cancelReason })}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-md"
            >
              Confirm Cancellation
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default AppointmentsPage;
