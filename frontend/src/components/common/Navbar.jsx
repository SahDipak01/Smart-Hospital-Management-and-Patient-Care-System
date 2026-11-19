import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import NotificationDropdown from './NotificationDropdown';
import {
  Activity,
  LogOut,
  User,
  Shield,
  Stethoscope,
  HeartPulse,
  UserCheck,
  Search,
  X,
  Calendar,
  Pill,
  Users,
  Command,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';

const Navbar = ({ onToggleSidebar, onSearch }) => {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  // Global search state
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchInputRef = useRef(null);
  const searchContainerRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Keyboard shortcut Ctrl+K / Cmd+K to focus search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Click outside listener for search dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search query
  useEffect(() => {
    if (!searchTerm || searchTerm.trim().length < 2) {
      setSearchResults(null);
      setIsDropdownOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearching(true);
        const res = await api.get(`/analytics/global-search?q=${encodeURIComponent(searchTerm.trim())}`);
        if (res.data.success) {
          setSearchResults(res.data.results);
          setIsDropdownOpen(true);
        }
      } catch (err) {
        console.error('Global search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const handleSelectResult = (path) => {
    setIsDropdownOpen(false);
    setSearchTerm('');
    navigate(path);
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'admin':
        return <Shield className="w-3.5 h-3.5 text-indigo-600" />;
      case 'doctor':
        return <Stethoscope className="w-3.5 h-3.5 text-medical-600" />;
      case 'patient':
        return <HeartPulse className="w-3.5 h-3.5 text-rose-600" />;
      case 'staff':
        return <UserCheck className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <User className="w-3.5 h-3.5 text-slate-500" />;
    }
  };

  const roleBadgeColors = {
    admin: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    doctor: 'bg-sky-50 text-sky-700 border-sky-200',
    patient: 'bg-rose-50 text-rose-700 border-rose-200',
    staff: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  };

  const hasAnyResults =
    searchResults &&
    (searchResults.patients?.length > 0 ||
      searchResults.doctors?.length > 0 ||
      searchResults.appointments?.length > 0 ||
      searchResults.medicines?.length > 0);

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 sm:px-6 backdrop-blur-md">
      {/* Left section: Hamburger & Logo */}
      <div className="flex items-center gap-4">
        <button
          onClick={onToggleSidebar}
          className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          aria-label="Toggle Navigation"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>

        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-medical-700 to-sky-500 text-white shadow-md shadow-medical-500/20">
            <Activity className="h-5 w-5" />
          </div>
          <div className="hidden sm:block">
            <h1 className="text-sm font-bold text-slate-900 tracking-tight leading-tight">
              APEX MEMORIAL
            </h1>
            <p className="text-[10px] font-medium text-medical-600 uppercase tracking-wider">
              Smart Hospital System
            </p>
          </div>
        </div>
      </div>

      {/* Center: Global Search Bar with Live Popover Dropdown */}
      <div className="hidden md:flex flex-1 max-w-lg mx-6 relative" ref={searchContainerRef}>
        <div className="relative w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchTerm}
            placeholder="Search patients (UHID/name), doctors, appointments... (Ctrl+K)"
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (onSearch) onSearch(e.target.value);
            }}
            onFocus={() => {
              if (hasAnyResults) setIsDropdownOpen(true);
            }}
            className="w-full pl-9 pr-14 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-medical-500/20 focus:border-medical-500 transition-all placeholder:text-slate-400"
          />
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isSearching ? (
              <Loader2 className="w-3.5 h-3.5 text-medical-600 animate-spin" />
            ) : searchTerm ? (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSearchResults(null);
                  setIsDropdownOpen(false);
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <span className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-200/70 text-[10px] font-semibold text-slate-500 rounded-md">
                <Command className="w-2.5 h-2.5" /> K
              </span>
            )}
          </div>
        </div>

        {/* Global Search Results Dropdown */}
        {isDropdownOpen && (
          <div className="absolute left-0 top-full mt-2 w-full bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
            <div className="p-3 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
              <span>Quick Search Results for "{searchTerm}"</span>
              <span className="text-[10px] text-slate-400">Esc to close</span>
            </div>

            <div className="max-h-96 overflow-y-auto divide-y divide-slate-100 p-2">
              {!hasAnyResults && !isSearching ? (
                <div className="p-4 text-center text-xs text-slate-400">
                  No matching hospital records found.
                </div>
              ) : null}

              {/* Patients Section */}
              {searchResults?.patients?.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <Users className="w-3 h-3 text-medical-600" />
                    <span>Patients ({searchResults.patients.length})</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.patients.map((pat) => (
                      <button
                        key={pat._id}
                        onClick={() => handleSelectResult(role === 'doctor' ? `/doctor/patients` : `/admin/patients`)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-medical-50/80 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-medical-700">
                            {pat.firstName} {pat.lastName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            {pat.uhid} • {pat.gender}, {pat.bloodGroup} • {pat.phone}
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 group-hover:bg-medical-100 group-hover:text-medical-800">
                          {pat.status || 'Active'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Doctors Section */}
              {searchResults?.doctors?.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <Stethoscope className="w-3 h-3 text-sky-600" />
                    <span>Doctors ({searchResults.doctors.length})</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.doctors.map((doc) => (
                      <button
                        key={doc._id}
                        onClick={() => handleSelectResult(role === 'patient' ? `/patient/appointments` : `/admin/doctors`)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-sky-50 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-sky-700">
                            Dr. {doc.firstName} {doc.lastName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {doc.specialization} • Room {doc.roomNumber || 'OPD'} • {doc.department?.name}
                          </p>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-sky-600 transition-colors" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Appointments Section */}
              {searchResults?.appointments?.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <Calendar className="w-3 h-3 text-emerald-600" />
                    <span>Appointments ({searchResults.appointments.length})</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.appointments.map((apt) => (
                      <button
                        key={apt._id}
                        onClick={() => handleSelectResult(`/${role}/appointments`)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-emerald-50 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                            {apt.appointmentNumber}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Patient: {apt.patient?.firstName} {apt.patient?.lastName} • Dr. {apt.doctor?.lastName} ({apt.timeSlot})
                          </p>
                        </div>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                          {apt.status}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Medicines Section */}
              {searchResults?.medicines?.length > 0 && (
                <div className="py-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <Pill className="w-3 h-3 text-purple-600" />
                    <span>Pharmacy Inventory ({searchResults.medicines.length})</span>
                  </div>
                  <div className="space-y-1 mt-1">
                    {searchResults.medicines.map((med) => (
                      <button
                        key={med._id}
                        onClick={() => handleSelectResult(role === 'staff' ? `/staff/pharmacy` : `/admin/pharmacy`)}
                        className="w-full text-left px-3 py-2 rounded-xl hover:bg-purple-50 transition-colors flex items-center justify-between group"
                      >
                        <div>
                          <p className="text-xs font-bold text-slate-900 group-hover:text-purple-700">
                            {med.name} ({med.strength})
                          </p>
                          <p className="text-[11px] text-slate-500">
                            Code: {med.itemCode} • Category: {med.category} • ${med.unitPrice}
                          </p>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            med.stockQuantity <= 20
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          Stock: {med.stockQuantity}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right section: Role pill, Notification, User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Active Role Pill */}
        <div
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-semibold capitalize ${
            roleBadgeColors[role] || 'bg-slate-100 text-slate-700 border-slate-200'
          }`}
        >
          {getRoleIcon()}
          <span>{role}</span>
        </div>

        {/* Notifications */}
        <NotificationDropdown />

        {/* User avatar & name */}
        <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
          <button
            onClick={() => navigate(`/${role}/profile`)}
            title="View & Edit Profile"
            className="flex items-center gap-2 text-left hover:opacity-80 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shadow-inner">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-xs font-semibold text-slate-800 leading-tight truncate max-w-[140px]">
                {user?.name}
              </p>
              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{user?.email}</p>
            </div>
          </button>

          {/* Quick Logout */}
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
