import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AdminLayout from './components/layout/AdminLayout';
import Dashboard from './pages/Dashboard';
import IntelligentInventoryDashboard from './components/intelligent-inventory/IntelligentInventoryDashboard';
import RouteOptimizationDashboard from './components/route-optimization/RouteOptimizationDashboard';
import CustomerSegmentationDashboard from './components/customer-segmentation/CustomerSegmentationDashboard';
import RiskAssessmentDashboard from './components/risk-assessment/RiskAssessmentDashboard';
import PerformanceMetricsDashboard from './components/performance-metrics/PerformanceMetricsDashboard';
import AutomatedDecisionEngineDashboard from './components/automated-decision-engine/AutomatedDecisionEngineDashboard';

// Import page components
import WMS from './pages/WMS';
import TMS from './pages/TMS';
import CRM from './pages/CRM';
import ERP from './pages/ERP';
import Billing from './pages/Billing';
import Analytics from './pages/Analytics';
import Orders from './pages/Orders';
import Vehicles from './pages/Vehicles';
import Warehouses from './pages/Warehouses';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Integrations from './pages/Integrations';
import Security from './pages/Security';
import Monitoring from './pages/Monitoring';
import Notifications from './pages/Notifications';
import Webhooks from './pages/Webhooks';
import Documents from './pages/Documents';
import Legal from './pages/Legal';
import Parameters from './pages/Parameters';
import Settings from './pages/Settings';

// Import new page components
import Warehouse from './pages/Warehouse';
import WarehouseStocks from './pages/WarehouseStocks';
import WarehouseLots from './pages/WarehouseLots';
import WarehouseShelves from './pages/WarehouseShelves';
import WarehouseTerminals from './pages/WarehouseTerminals';
import Logistics from './pages/Logistics';
import LogisticsVehicles from './pages/LogisticsVehicles';
import LogisticsRoutes from './pages/LogisticsRoutes';
import LogisticsTracking from './pages/LogisticsTracking';
import Suppliers from './pages/Suppliers';
import SuppliersOrders from './pages/SuppliersOrders';
import SuppliersSync from './pages/SuppliersSync';
import Finance from './pages/Finance';
import FinanceInvoices from './pages/FinanceInvoices';
import FinanceAccounts from './pages/FinanceAccounts';
import FinanceReports from './pages/FinanceReports';
import SettingsRoles from './pages/SettingsRoles';
import SettingsUsers from './pages/SettingsUsers';
import SettingsIntegrations from './pages/SettingsIntegrations';

const App: React.FC = () => {
  return (
    <Router>
      <Routes>
        <Route path="/admin" element={
          <AdminLayout title="Dashboard">
            <Dashboard />
          </AdminLayout>
        } />
        
        <Route path="/admin/intelligent-inventory" element={
          <AdminLayout 
            title="Intelligent Inventory Management"
            breadcrumbs={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Intelligent Inventory' }
            ]}
          >
            <IntelligentInventoryDashboard />
          </AdminLayout>
        } />
        
        <Route path="/admin/route-optimization" element={
          <AdminLayout 
            title="Dynamic Route Optimization"
            breadcrumbs={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Route Optimization' }
            ]}
          >
            <RouteOptimizationDashboard />
          </AdminLayout>
        } />
        
        <Route path="/admin/customer-segmentation" element={
          <AdminLayout 
            title="Customer Segmentation & Personalization"
            breadcrumbs={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Customer Segmentation' }
            ]}
          >
            <CustomerSegmentationDashboard />
          </AdminLayout>
        } />
        
        <Route path="/admin/risk-assessment" element={
          <AdminLayout 
            title="Risk Assessment & Management"
            breadcrumbs={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Risk Assessment' }
            ]}
          >
            <RiskAssessmentDashboard />
          </AdminLayout>
        } />
        
        <Route path="/admin/performance-metrics" element={
          <AdminLayout 
            title="Performance Metrics & Analytics"
            breadcrumbs={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Performance Metrics' }
            ]}
          >
            <PerformanceMetricsDashboard />
          </AdminLayout>
        } />
        
        <Route path="/admin/automated-decision-engine" element={
          <AdminLayout 
            title="Automated Decision Engine"
            breadcrumbs={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Decision Engine' }
            ]}
          >
            <AutomatedDecisionEngineDashboard />
          </AdminLayout>
        } />
        
        {/* AI Services Routes */}
        <Route path="/admin/ai-services" element={
          <AdminLayout 
            title="AI Services"
            breadcrumbs={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'AI Services' }
            ]}
          >
            <div className="text-center py-16">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">AI Services</h1>
              <p className="text-gray-600 mb-8">Advanced AI-powered services and capabilities</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-4xl mx-auto">
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">Predictive Maintenance</h3>
                  <p className="text-gray-600 text-sm">AI-powered equipment maintenance predictions</p>
                </div>
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">Dock Door Scheduling</h3>
                  <p className="text-gray-600 text-sm">Intelligent dock door optimization</p>
                </div>
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">Workforce Optimization</h3>
                  <p className="text-gray-600 text-sm">AI-driven workforce scheduling</p>
                </div>
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">Demand Forecasting</h3>
                  <p className="text-gray-600 text-sm">Predictive demand analysis</p>
                </div>
              </div>
            </div>
          </AdminLayout>
        } />
        
        {/* Analytics Routes */}
        <Route path="/admin/analytics" element={
          <AdminLayout 
            title="Analytics & Business Intelligence"
            breadcrumbs={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'Analytics' }
            ]}
          >
            <div className="text-center py-16">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">Analytics & Business Intelligence</h1>
              <p className="text-gray-600 mb-8">Comprehensive analytics and reporting</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">Business Intelligence</h3>
                  <p className="text-gray-600 text-sm">Advanced BI dashboards and reports</p>
                </div>
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">Real-time Monitoring</h3>
                  <p className="text-gray-600 text-sm">Live system and performance monitoring</p>
                </div>
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">Custom Reports</h3>
                  <p className="text-gray-600 text-sm">Customizable reporting and analytics</p>
                </div>
              </div>
            </div>
          </AdminLayout>
        } />
        
        {/* System Routes */}
        <Route path="/admin/system" element={
          <AdminLayout 
            title="System Administration"
            breadcrumbs={[
              { label: 'Dashboard', href: '/admin' },
              { label: 'System' }
            ]}
          >
            <div className="text-center py-16">
              <h1 className="text-3xl font-bold text-gray-900 mb-4">System Administration</h1>
              <p className="text-gray-600 mb-8">System configuration and management</p>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">Configuration</h3>
                  <p className="text-gray-600 text-sm">System settings and configuration</p>
                </div>
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">Users & Roles</h3>
                  <p className="text-gray-600 text-sm">User management and role assignment</p>
                </div>
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">Integrations</h3>
                  <p className="text-gray-600 text-sm">Third-party integrations and APIs</p>
                </div>
                <div className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                  <h3 className="font-semibold text-lg mb-2">API Management</h3>
                  <p className="text-gray-600 text-sm">API keys and endpoint management</p>
                </div>
              </div>
            </div>
          </AdminLayout>
        } />
        
        {/* Main Module Routes */}
        <Route path="/wms" element={
          <AdminLayout 
            title="WMS - Depo Yönetimi"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'WMS' }
            ]}
          >
            <WMS />
          </AdminLayout>
        } />
        
        <Route path="/tms" element={
          <AdminLayout 
            title="TMS - Taşıma Yönetimi"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'TMS' }
            ]}
          >
            <TMS />
          </AdminLayout>
        } />
        
        <Route path="/crm" element={
          <AdminLayout 
            title="CRM - Müşteri Yönetimi"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'CRM' }
            ]}
          >
            <CRM />
          </AdminLayout>
        } />
        
        <Route path="/erp" element={
          <AdminLayout 
            title="ERP - Kurumsal Kaynak"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'ERP' }
            ]}
          >
            <ERP />
          </AdminLayout>
        } />
        
        <Route path="/billing" element={
          <AdminLayout 
            title="Faturalama"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Faturalama' }
            ]}
          >
            <Billing />
          </AdminLayout>
        } />
        
        <Route path="/analytics" element={
          <AdminLayout 
            title="Analitik"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Analitik' }
            ]}
          >
            <Analytics />
          </AdminLayout>
        } />
        
        <Route path="/orders" element={
          <AdminLayout 
            title="Sipariş Yönetimi"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Siparişler' }
            ]}
          >
            <Orders />
          </AdminLayout>
        } />
        
        <Route path="/vehicles" element={
          <AdminLayout 
            title="Araçlar"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Araçlar' }
            ]}
          >
            <Vehicles />
          </AdminLayout>
        } />
        
        <Route path="/warehouses" element={
          <AdminLayout 
            title="Depolar"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Depolar' }
            ]}
          >
            <Warehouses />
          </AdminLayout>
        } />
        
        <Route path="/users" element={
          <AdminLayout 
            title="Kullanıcılar"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Kullanıcılar' }
            ]}
          >
            <Users />
          </AdminLayout>
        } />
        
        <Route path="/reports" element={
          <AdminLayout 
            title="Raporlar"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Raporlar' }
            ]}
          >
            <Reports />
          </AdminLayout>
        } />
        
        <Route path="/integrations" element={
          <AdminLayout 
            title="Entegrasyonlar"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Entegrasyonlar' }
            ]}
          >
            <Integrations />
          </AdminLayout>
        } />
        
        <Route path="/security" element={
          <AdminLayout 
            title="Güvenlik"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Güvenlik' }
            ]}
          >
            <Security />
          </AdminLayout>
        } />
        
        <Route path="/monitoring" element={
          <AdminLayout 
            title="İzleme"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'İzleme' }
            ]}
          >
            <Monitoring />
          </AdminLayout>
        } />
        
        <Route path="/notifications" element={
          <AdminLayout 
            title="Bildirimler"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Bildirimler' }
            ]}
          >
            <Notifications />
          </AdminLayout>
        } />
        
        <Route path="/webhooks" element={
          <AdminLayout 
            title="Webhooks"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Webhooks' }
            ]}
          >
            <Webhooks />
          </AdminLayout>
        } />
        
        <Route path="/documents" element={
          <AdminLayout 
            title="Dokümanlar"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Dokümanlar' }
            ]}
          >
            <Documents />
          </AdminLayout>
        } />
        
        <Route path="/legal" element={
          <AdminLayout 
            title="Yasal"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Yasal' }
            ]}
          >
            <Legal />
          </AdminLayout>
        } />
        
        <Route path="/parameters" element={
          <AdminLayout 
            title="Parametreler"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Parametreler' }
            ]}
          >
            <Parameters />
          </AdminLayout>
        } />
        
        <Route path="/settings" element={
          <AdminLayout 
            title="Ayarlar"
            breadcrumbs={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Ayarlar' }
            ]}
          >
            <Settings />
          </AdminLayout>
        } />
        
        {/* Dashboard Route */}
        <Route path="/dashboard" element={
          <AdminLayout title="Dashboard">
            <Dashboard />
          </AdminLayout>
        } />
        
        {/* Warehouse Routes */}
        <Route path="/warehouse" element={
          <AdminLayout title="Warehouse Management">
            <Warehouse />
          </AdminLayout>
        } />
        <Route path="/warehouse/stocks" element={
          <AdminLayout title="Stock Management" breadcrumbs={[{ label: 'Warehouse', href: '/warehouse' }, { label: 'Stocks' }]}>
            <WarehouseStocks />
          </AdminLayout>
        } />
        <Route path="/warehouse/lots" element={
          <AdminLayout title="Lots & Batches" breadcrumbs={[{ label: 'Warehouse', href: '/warehouse' }, { label: 'Lots & Batches' }]}>
            <WarehouseLots />
          </AdminLayout>
        } />
        <Route path="/warehouse/shelves" element={
          <AdminLayout title="Shelves" breadcrumbs={[{ label: 'Warehouse', href: '/warehouse' }, { label: 'Shelves' }]}>
            <WarehouseShelves />
          </AdminLayout>
        } />
        <Route path="/warehouse/terminals" element={
          <AdminLayout title="Handheld Devices" breadcrumbs={[{ label: 'Warehouse', href: '/warehouse' }, { label: 'Handheld Devices' }]}>
            <WarehouseTerminals />
          </AdminLayout>
        } />
        
        {/* Logistics Routes */}
        <Route path="/logistics" element={
          <AdminLayout title="Logistics Management">
            <Logistics />
          </AdminLayout>
        } />
        <Route path="/logistics/vehicles" element={
          <AdminLayout title="Vehicles" breadcrumbs={[{ label: 'Logistics', href: '/logistics' }, { label: 'Vehicles' }]}>
            <LogisticsVehicles />
          </AdminLayout>
        } />
        <Route path="/logistics/routes" element={
          <AdminLayout title="Routes" breadcrumbs={[{ label: 'Logistics', href: '/logistics' }, { label: 'Routes' }]}>
            <LogisticsRoutes />
          </AdminLayout>
        } />
        <Route path="/logistics/tracking" element={
          <AdminLayout title="Tracking" breadcrumbs={[{ label: 'Logistics', href: '/logistics' }, { label: 'Tracking' }]}>
            <LogisticsTracking />
          </AdminLayout>
        } />
        
        {/* Suppliers Routes */}
        <Route path="/suppliers" element={
          <AdminLayout title="Suppliers">
            <Suppliers />
          </AdminLayout>
        } />
        <Route path="/suppliers/orders" element={
          <AdminLayout title="Supplier Orders" breadcrumbs={[{ label: 'Suppliers', href: '/suppliers' }, { label: 'Orders' }]}>
            <SuppliersOrders />
          </AdminLayout>
        } />
        <Route path="/suppliers/sync" element={
          <AdminLayout title="Stock Sync" breadcrumbs={[{ label: 'Suppliers', href: '/suppliers' }, { label: 'Stock Sync' }]}>
            <SuppliersSync />
          </AdminLayout>
        } />
        
        {/* Finance Routes */}
        <Route path="/finance" element={
          <AdminLayout title="Finance">
            <Finance />
          </AdminLayout>
        } />
        <Route path="/finance/invoices" element={
          <AdminLayout title="Invoices" breadcrumbs={[{ label: 'Finance', href: '/finance' }, { label: 'Invoices' }]}>
            <FinanceInvoices />
          </AdminLayout>
        } />
        <Route path="/finance/accounts" element={
          <AdminLayout title="Accounts" breadcrumbs={[{ label: 'Finance', href: '/finance' }, { label: 'Accounts' }]}>
            <FinanceAccounts />
          </AdminLayout>
        } />
        <Route path="/finance/reports" element={
          <AdminLayout title="Finance Reports" breadcrumbs={[{ label: 'Finance', href: '/finance' }, { label: 'Reports' }]}>
            <FinanceReports />
          </AdminLayout>
        } />
        
        {/* Settings Routes */}
        <Route path="/settings/roles" element={
          <AdminLayout title="Role Management" breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Role Management' }]}>
            <SettingsRoles />
          </AdminLayout>
        } />
        <Route path="/settings/users" element={
          <AdminLayout title="User Management" breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'User Management' }]}>
            <SettingsUsers />
          </AdminLayout>
        } />
        <Route path="/settings/integrations" element={
          <AdminLayout title="Integrations" breadcrumbs={[{ label: 'Settings', href: '/settings' }, { label: 'Integrations' }]}>
            <SettingsIntegrations />
          </AdminLayout>
        } />
        
        {/* Default redirect to dashboard */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default App;
