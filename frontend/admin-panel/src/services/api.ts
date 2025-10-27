import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// WMS API
export const wmsApi = {
  // Warehouse Management
  warehouses: {
    getAll: (filters?: any) => api.get('/v1/wms/warehouses', { params: filters }),
    getById: (id: string) => api.get(`/v1/wms/warehouses/${id}`),
    create: (data: any) => api.post('/v1/wms/warehouses', data),
    update: (id: string, data: any) => api.put(`/v1/wms/warehouses/${id}`, data),
    delete: (id: string) => api.delete(`/v1/wms/warehouses/${id}`),
    getMetrics: (id: string) => api.get(`/v1/wms/warehouses/${id}/metrics`),
  },
  
  // Receiving
  receiving: {
    getAll: (filters?: any) => api.get('/v1/wms/receiving', { params: filters }),
    getById: (id: string) => api.get(`/v1/wms/receiving/${id}`),
    create: (data: any) => api.post('/v1/wms/receiving', data),
    update: (id: string, data: any) => api.put(`/v1/wms/receiving/${id}`, data),
  },
  
  // Picking
  picking: {
    getAll: (filters?: any) => api.get('/v1/wms/picking', { params: filters }),
    getById: (id: string) => api.get(`/v1/wms/picking/${id}`),
    create: (data: any) => api.post('/v1/wms/picking', data),
    update: (id: string, data: any) => api.put(`/v1/wms/picking/${id}`, data),
  },
  
  // Packing
  packing: {
    getAll: (filters?: any) => api.get('/v1/wms/packing', { params: filters }),
    getById: (id: string) => api.get(`/v1/wms/packing/${id}`),
    create: (data: any) => api.post('/v1/wms/packing', data),
    update: (id: string, data: any) => api.put(`/v1/wms/packing/${id}`, data),
  },
  
  // Shipping
  shipping: {
    getAll: (filters?: any) => api.get('/v1/wms/shipping', { params: filters }),
    getById: (id: string) => api.get(`/v1/wms/shipping/${id}`),
    create: (data: any) => api.post('/v1/wms/shipping', data),
    update: (id: string, data: any) => api.put(`/v1/wms/shipping/${id}`, data),
  },
};

// TMS API
export const tmsApi = {
  // Routes
  routes: {
    getAll: (filters?: any) => api.get('/v1/tms/routes', { params: filters }),
    getById: (id: string) => api.get(`/v1/tms/routes/${id}`),
    create: (data: any) => api.post('/v1/tms/routes', data),
    update: (id: string, data: any) => api.put(`/v1/tms/routes/${id}`, data),
    optimize: (id: string) => api.post(`/v1/tms/routes/${id}/optimize`),
    getMetrics: () => api.get('/v1/tms/routes/metrics/overview'),
    getFuelOptimization: (id: string) => api.get(`/v1/tms/routes/${id}/fuel-optimization`),
  },
  
  // Vehicles
  vehicles: {
    getAll: (filters?: any) => api.get('/v1/tms/vehicles', { params: filters }),
    getById: (id: string) => api.get(`/v1/tms/vehicles/${id}`),
    create: (data: any) => api.post('/v1/tms/vehicles', data),
    update: (id: string, data: any) => api.put(`/v1/tms/vehicles/${id}`, data),
    assignDriver: (id: string, driverId: string) => api.put(`/v1/tms/vehicles/${id}/assign-driver`, { driverId }),
    updateLocation: (id: string, location: any) => api.put(`/v1/tms/vehicles/${id}/location`, location),
    getMetrics: () => api.get('/v1/tms/vehicles/metrics/overview'),
    getMaintenanceSchedule: () => api.get('/v1/tms/vehicles/maintenance/schedule'),
    getFuelConsumption: (id: string) => api.get(`/v1/tms/vehicles/${id}/fuel-consumption`),
  },
  
  // Drivers
  drivers: {
    getAll: (filters?: any) => api.get('/v1/tms/drivers', { params: filters }),
    getById: (id: string) => api.get(`/v1/tms/drivers/${id}`),
    create: (data: any) => api.post('/v1/tms/drivers', data),
    update: (id: string, data: any) => api.put(`/v1/tms/drivers/${id}`, data),
    assignVehicle: (id: string, vehicleId: string) => api.put(`/v1/tms/drivers/${id}/assign-vehicle`, { vehicleId }),
    updateStatus: (id: string, status: string) => api.put(`/v1/tms/drivers/${id}/status`, { status }),
    getPerformance: (id: string) => api.get(`/v1/tms/drivers/${id}/performance`),
    getMetrics: () => api.get('/v1/tms/drivers/metrics/overview'),
    getLicenseExpiry: () => api.get('/v1/tms/drivers/license-expiry'),
  },
  
  // GPS Tracking
  gpsTracking: {
    getAll: (filters?: any) => api.get('/v1/tms/gps-tracking', { params: filters }),
    getById: (id: string) => api.get(`/v1/tms/gps-tracking/${id}`),
    create: (data: any) => api.post('/v1/tms/gps-tracking', data),
    updateLocation: (vehicleId: string, location: any) => api.put(`/v1/tms/gps-tracking/${vehicleId}/location`, location),
    getCurrentLocation: (vehicleId: string) => api.get(`/v1/tms/gps-tracking/${vehicleId}/current-location`),
    getRouteHistory: (vehicleId: string, dateRange?: any) => api.get(`/v1/tms/gps-tracking/${vehicleId}/route-history`, { params: dateRange }),
    getDistanceTraveled: (vehicleId: string, dateRange?: any) => api.get(`/v1/tms/gps-tracking/${vehicleId}/distance-traveled`, { params: dateRange }),
    getSpeedAnalysis: (vehicleId: string) => api.get(`/v1/tms/gps-tracking/${vehicleId}/speed-analysis`),
    getGeofenceAlerts: () => api.get('/v1/tms/gps-tracking/geofence-alerts'),
  },
  
  // Load Board
  loadBoard: {
    getAll: (filters?: any) => api.get('/v1/tms/load-board', { params: filters }),
    getById: (id: string) => api.get(`/v1/tms/load-board/${id}`),
    create: (data: any) => api.post('/v1/tms/load-board', data),
    update: (id: string, data: any) => api.put(`/v1/tms/load-board/${id}`, data),
    matchLoad: (id: string, carrierId: string) => api.put(`/v1/tms/load-board/${id}/match`, { carrierId }),
    getAvailableLoads: (filters?: any) => api.get('/v1/tms/load-board/available', { params: filters }),
    getMetrics: () => api.get('/v1/tms/load-board/metrics/overview'),
    optimizeMatching: () => api.get('/v1/tms/load-board/optimize-matching'),
  },
};

// CRM API
export const crmApi = {
  // Customers
  customers: {
    getAll: (filters?: any) => api.get('/v1/crm/customers', { params: filters }),
    getById: (id: string) => api.get(`/v1/crm/customers/${id}`),
    create: (data: any) => api.post('/v1/crm/customers', data),
    update: (id: string, data: any) => api.put(`/v1/crm/customers/${id}`, data),
    updateStatus: (id: string, status: string) => api.put(`/v1/crm/customers/${id}/status`, { status }),
    getMetrics: () => api.get('/v1/crm/customers/metrics/overview'),
    getCustomerValue: (id: string) => api.get(`/v1/crm/customers/${id}/value`),
    getSegments: () => api.get('/v1/crm/customers/segments/analysis'),
  },
  
  // Leads
  leads: {
    getAll: (filters?: any) => api.get('/v1/crm/leads', { params: filters }),
    getById: (id: string) => api.get(`/v1/crm/leads/${id}`),
    create: (data: any) => api.post('/v1/crm/leads', data),
    update: (id: string, data: any) => api.put(`/v1/crm/leads/${id}`, data),
    updateStatus: (id: string, status: string) => api.put(`/v1/crm/leads/${id}/status`, { status }),
    assignLead: (id: string, assignedTo: string) => api.put(`/v1/crm/leads/${id}/assign`, { assignedTo }),
    convertToCustomer: (id: string) => api.post(`/v1/crm/leads/${id}/convert`),
    getMetrics: () => api.get('/v1/crm/leads/metrics/overview'),
    getSources: () => api.get('/v1/crm/leads/sources/analysis'),
    getPipeline: () => api.get('/v1/crm/leads/pipeline/analysis'),
  },
  
  // Activities
  activities: {
    getAll: (filters?: any) => api.get('/v1/crm/activities', { params: filters }),
    getById: (id: string) => api.get(`/v1/crm/activities/${id}`),
    create: (data: any) => api.post('/v1/crm/activities', data),
    update: (id: string, data: any) => api.put(`/v1/crm/activities/${id}`, data),
    updateStatus: (id: string, status: string) => api.put(`/v1/crm/activities/${id}/status`, { status }),
    completeActivity: (id: string, notes: string) => api.put(`/v1/crm/activities/${id}/complete`, { notes }),
    getMetrics: () => api.get('/v1/crm/activities/metrics/overview'),
    getTypes: () => api.get('/v1/crm/activities/types/analysis'),
    getUpcoming: (days?: number) => api.get('/v1/crm/activities/upcoming', { params: { days } }),
    getOverdue: () => api.get('/v1/crm/activities/overdue'),
  },
};

// ERP API
export const erpApi = {
  // Finance
  finance: {
    getAll: (filters?: any) => api.get('/v1/erp/finance', { params: filters }),
    getById: (id: string) => api.get(`/v1/erp/finance/${id}`),
    create: (data: any) => api.post('/v1/erp/finance', data),
    update: (id: string, data: any) => api.put(`/v1/erp/finance/${id}`, data),
    approveTransaction: (id: string) => api.put(`/v1/erp/finance/${id}/approve`),
    getMetrics: () => api.get('/v1/erp/finance/metrics/overview'),
    getCashFlow: (dateRange?: any) => api.get('/v1/erp/finance/cash-flow/analysis', { params: dateRange }),
    getBudgetAnalysis: () => api.get('/v1/erp/finance/budget/analysis'),
    generateReport: (reportType: string, dateRange?: any) => api.post('/v1/erp/finance/reports/generate', { reportType, dateRange }),
  },
  
  // HR
  hr: {
    employees: {
      getAll: (filters?: any) => api.get('/v1/erp/hr/employees', { params: filters }),
      getById: (id: string) => api.get(`/v1/erp/hr/employees/${id}`),
      create: (data: any) => api.post('/v1/erp/hr/employees', data),
      update: (id: string, data: any) => api.put(`/v1/erp/hr/employees/${id}`, data),
      updateStatus: (id: string, status: string) => api.put(`/v1/erp/hr/employees/${id}/status`, { status }),
      getMetrics: () => api.get('/v1/erp/hr/employees/metrics/overview'),
      getDepartmentMetrics: () => api.get('/v1/erp/hr/employees/department-metrics'),
      getPerformance: (id: string) => api.get(`/v1/erp/hr/employees/${id}/performance`),
      getPayrollSummary: (dateRange?: any) => api.get('/v1/erp/hr/employees/payroll-summary', { params: dateRange }),
      getAttendanceReport: (dateRange?: any) => api.get('/v1/erp/hr/employees/attendance-report', { params: dateRange }),
    },
  },
  
  // Inventory
  inventory: {
    getAll: (filters?: any) => api.get('/v1/erp/inventory', { params: filters }),
    getById: (id: string) => api.get(`/v1/erp/inventory/${id}`),
    create: (data: any) => api.post('/v1/erp/inventory', data),
    update: (id: string, data: any) => api.put(`/v1/erp/inventory/${id}`, data),
    updateQuantity: (id: string, quantity: number) => api.put(`/v1/erp/inventory/${id}/quantity`, { quantity }),
    getMetrics: () => api.get('/v1/erp/inventory/metrics/overview'),
    getLowStockItems: () => api.get('/v1/erp/inventory/low-stock'),
    getInventoryValue: () => api.get('/v1/erp/inventory/value/analysis'),
    getInventoryTurnover: () => api.get('/v1/erp/inventory/turnover/analysis'),
    generateReport: (reportType: string) => api.post('/v1/erp/inventory/reports/generate', { reportType }),
  },
  
  // Purchasing
  purchasing: {
    getAll: (filters?: any) => api.get('/v1/erp/purchasing', { params: filters }),
    getById: (id: string) => api.get(`/v1/erp/purchasing/${id}`),
    create: (data: any) => api.post('/v1/erp/purchasing', data),
    update: (id: string, data: any) => api.put(`/v1/erp/purchasing/${id}`, data),
    approveOrder: (id: string) => api.put(`/v1/erp/purchasing/${id}/approve`),
    receiveOrder: (id: string) => api.put(`/v1/erp/purchasing/${id}/receive`),
    getMetrics: () => api.get('/v1/erp/purchasing/metrics/overview'),
    getSupplierMetrics: () => api.get('/v1/erp/purchasing/supplier-metrics'),
    getCostAnalysis: () => api.get('/v1/erp/purchasing/cost-analysis'),
    generateReport: (reportType: string, dateRange?: any) => api.post('/v1/erp/purchasing/reports/generate', { reportType, dateRange }),
  },
};

// Billing API
export const billingApi = {
  // Invoices
  invoices: {
    getAll: (filters?: any) => api.get('/v1/billing/invoices', { params: filters }),
    getById: (id: string) => api.get(`/v1/billing/invoices/${id}`),
    create: (data: any) => api.post('/v1/billing/invoices', data),
    update: (id: string, data: any) => api.put(`/v1/billing/invoices/${id}`, data),
    sendInvoice: (id: string) => api.put(`/v1/billing/invoices/${id}/send`),
    markAsPaid: (id: string) => api.put(`/v1/billing/invoices/${id}/paid`),
    getMetrics: () => api.get('/v1/billing/invoices/metrics/overview'),
    getRevenueMetrics: () => api.get('/v1/billing/invoices/revenue/analysis'),
    getOverdueInvoices: () => api.get('/v1/billing/invoices/overdue/list'),
    generateReport: (reportType: string, dateRange?: any) => api.post('/v1/billing/invoices/reports/generate', { reportType, dateRange }),
  },
  
  // Contracts
  contracts: {
    getAll: (filters?: any) => api.get('/v1/billing/contracts', { params: filters }),
    getById: (id: string) => api.get(`/v1/billing/contracts/${id}`),
    create: (data: any) => api.post('/v1/billing/contracts', data),
    update: (id: string, data: any) => api.put(`/v1/billing/contracts/${id}`, data),
    activateContract: (id: string) => api.put(`/v1/billing/contracts/${id}/activate`),
    renewContract: (id: string, newEndDate: string) => api.put(`/v1/billing/contracts/${id}/renew`, { newEndDate }),
    getMetrics: () => api.get('/v1/billing/contracts/metrics/overview'),
    getExpiringContracts: (days?: number) => api.get('/v1/billing/contracts/expiring', { params: { days } }),
    getContractValue: (id: string) => api.get(`/v1/billing/contracts/${id}/value`),
    generateReport: (reportType: string) => api.post('/v1/billing/contracts/reports/generate', { reportType }),
  },
  
  // Payments
  payments: {
    getAll: (filters?: any) => api.get('/v1/billing/payments', { params: filters }),
    getById: (id: string) => api.get(`/v1/billing/payments/${id}`),
    create: (data: any) => api.post('/v1/billing/payments', data),
    update: (id: string, data: any) => api.put(`/v1/billing/payments/${id}`, data),
    processPayment: (id: string) => api.put(`/v1/billing/payments/${id}/process`),
    refundPayment: (id: string, refundAmount: number) => api.put(`/v1/billing/payments/${id}/refund`, { refundAmount }),
    getMetrics: () => api.get('/v1/billing/payments/metrics/overview'),
    getPaymentMethods: () => api.get('/v1/billing/payments/methods/analysis'),
    getRevenueMetrics: () => api.get('/v1/billing/payments/revenue/analysis'),
    getPaymentTrends: (dateRange?: any) => api.get('/v1/billing/payments/trends/analysis', { params: dateRange }),
    generateReport: (reportType: string, dateRange?: any) => api.post('/v1/billing/payments/reports/generate', { reportType, dateRange }),
  },
};

// Analytics API
export const analyticsApi = {
  // Dashboard
  dashboard: {
    getOverview: () => api.get('/v1/analytics/dashboard/overview'),
    getMetrics: (category?: string) => api.get('/v1/analytics/dashboard/metrics', { params: { category } }),
    getKPIs: () => api.get('/v1/analytics/dashboard/kpis'),
    getAlerts: () => api.get('/v1/analytics/dashboard/alerts'),
  },
  
  // Reports
  reports: {
    getAll: (filters?: any) => api.get('/v1/analytics/reports', { params: filters }),
    getById: (id: string) => api.get(`/v1/analytics/reports/${id}`),
    create: (data: any) => api.post('/v1/analytics/reports', data),
    update: (id: string, data: any) => api.put(`/v1/analytics/reports/${id}`, data),
    generate: (id: string) => api.post(`/v1/analytics/reports/${id}/generate`),
    getMetrics: () => api.get('/v1/analytics/reports/metrics/overview'),
  },
  
  // Metrics
  metrics: {
    getAll: (filters?: any) => api.get('/v1/analytics/metrics', { params: filters }),
    getById: (id: string) => api.get(`/v1/analytics/metrics/${id}`),
    create: (data: any) => api.post('/v1/analytics/metrics', data),
    update: (id: string, data: any) => api.put(`/v1/analytics/metrics/${id}`, data),
    getTrends: (id: string, dateRange?: any) => api.get(`/v1/analytics/metrics/${id}/trends`, { params: dateRange }),
    getComparison: (id: string, compareWith?: string) => api.get(`/v1/analytics/metrics/${id}/comparison`, { params: { compareWith } }),
  },
};

export default api;
