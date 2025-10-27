import React, { useState } from 'react';
import { 
  BarChart3, 
  Shield, 
  Activity, 
  Eye, 
  Settings,
  Bell,
  User,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import ComprehensiveDashboard from '../../components/comprehensive/ComprehensiveDashboard';
import SecurityMonitor from '../../components/comprehensive/SecurityMonitor';
import AnalyticsDashboard from '../../components/comprehensive/AnalyticsDashboard';
import PerformanceMonitor from '../../components/comprehensive/PerformanceMonitor';
import AuditTrail from '../../components/comprehensive/AuditTrail';

const ComprehensivePage: React.FC = () => {
  const [activeView, setActiveView] = useState<'dashboard' | 'security' | 'analytics' | 'performance' | 'audit'>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, component: ComprehensiveDashboard },
    { id: 'security', label: 'Security', icon: Shield, component: SecurityMonitor },
    { id: 'analytics', label: 'Analytics', icon: Activity, component: AnalyticsDashboard },
    { id: 'performance', label: 'Performance', icon: Activity, component: PerformanceMonitor },
    { id: 'audit', label: 'Audit Trail', icon: Eye, component: AuditTrail },
  ];

  const ActiveComponent = navigationItems.find(item => item.id === activeView)?.component || ComprehensiveDashboard;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">Comprehensive</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <div className="space-y-1">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id as any);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeView === item.id
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">Admin User</p>
              <p className="text-xs text-gray-500">admin@ayazlogistics.com</p>
            </div>
            <button className="text-gray-400 hover:text-gray-600">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <div className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between h-16 px-6">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-400 hover:text-gray-600"
              >
                <Menu className="w-6 h-6" />
              </button>
              <h2 className="text-lg font-semibold text-gray-900">
                {navigationItems.find(item => item.id === activeView)?.label}
              </h2>
            </div>

            <div className="flex items-center space-x-4">
              <button className="relative text-gray-400 hover:text-gray-600">
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
              </button>
              <button className="text-gray-400 hover:text-gray-600">
                <Settings className="w-5 h-5" />
              </button>
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <div className="p-6">
          <ActiveComponent />
        </div>
      </div>
    </div>
  );
};

export default ComprehensivePage;
