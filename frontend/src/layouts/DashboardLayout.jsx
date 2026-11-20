import React, { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import Sidebar from '../components/common/Sidebar';
import { useAuth } from '../context/AuthContext';
import { LogOut } from 'lucide-react';

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { isDemoMode, exitDemo, role } = useAuth();
  const navigate = useNavigate();

  const handleExitDemo = async () => {
    await exitDemo();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col lg:pl-64 min-w-0">
        {/* Live Demo Notification Bar */}
        {isDemoMode && (
          <div className="bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white px-4 py-2 text-xs font-semibold flex items-center justify-between shadow-sm sticky top-0 z-50">
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider">
                Live Demo Session
              </span>
              <span className="hidden sm:inline">
                Exploring as <strong>{role?.toUpperCase()}</strong> in safe preview mode with realistic hospital data.
              </span>
            </div>
            <button
              onClick={handleExitDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-amber-900 text-xs font-bold hover:bg-amber-50 shadow-sm transition-all"
            >
              <LogOut className="w-3.5 h-3.5 text-amber-700" />
              <span>Exit Demo</span>
            </button>
          </div>
        )}

        <Navbar
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onSearch={(val) => setSearchQuery(val)}
        />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet context={{ searchQuery }} />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
