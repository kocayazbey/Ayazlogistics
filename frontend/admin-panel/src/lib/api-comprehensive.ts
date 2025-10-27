import { apiClient } from './api-client';

// ============================================================================
// AUTHENTICATION API
// ============================================================================
export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post('/auth/login', { email, password }),
  register: (data: any) => apiClient.post('/auth/register', data),
  logout: () => apiClient.post('/auth/logout', {}),
  getProfile: () => apiClient.get('/auth/profile'),
  refreshToken: () => apiClient.post('/auth/refresh', {}), // Backend will read refresh token from cookie
  changePassword: (oldPassword: string, newPassword: string) =>
    apiClient.post('/auth/change-password', { currentPassword: oldPassword, newPassword }),
  forgotPassword: (email: string) =>
    apiClient.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    apiClient.post('/auth/reset-password', { token, password }),
  enable2FA: () => apiClient.post('/auth/2fa/enable', {}),
  verify2FA: (code: string) => apiClient.post('/auth/2fa/verify', { code }),
};

// ============================================================================
// DOCUMENT MANAGEMENT API
// ============================================================================
export const documentApi = {
  // Documents CRUD
  getAll: (params?: { customerId?: string; contractType?: string; status?: string }) => {
    const queryString = params ? `?${new URLSearchParams(params as any).toString()}` : '';
    return apiClient.get(`/documents${queryString}`);
  },
  getById: (id: string) => apiClient.get(`/documents/${id}`),
  create: (data: any) => apiClient.post('/documents', data),
  update: (id: string, data: any) => apiClient.put(`/documents/${id}`, data),
  delete: (id: string) => apiClient.delete(`/documents/${id}`),

  // Document Operations
  getSummary: () => apiClient.get('/documents/summary'),
  getExpiring: (daysAhead?: number) => {
    const queryString = daysAhead ? `?daysAhead=${daysAhead}` : '';
    return apiClient.get(`/documents/expiring${queryString}`);
  },
  submitForApproval: (id: string) =>
    apiClient.post(`/documents/${id}/submit-approval`, {}),
  renew: (id: string, newEndDate: string) =>
    apiClient.post(`/documents/${id}/renew`, { newEndDate }),
  terminate: (id: string, reason: string) =>
    apiClient.post(`/documents/${id}/terminate`, { reason }),

  // Proposal Management
  generateProposal: (data: any) =>
    apiClient.post('/documents/proposals/generate', data),
  getProposalStatus: (proposalNumber: string) =>
    apiClient.get(`/documents/proposals/${proposalNumber}/status`),
  acceptProposal: (proposalNumber: string, data: any) =>
    apiClient.post(`/documents/proposals/${proposalNumber}/accept`, data),
  rejectProposal: (proposalNumber: string, data: any) =>
    apiClient.post(`/documents/proposals/${proposalNumber}/reject`, data),
  convertProposalToContract: (proposalNumber: string) =>
    apiClient.post(`/documents/proposals/${proposalNumber}/convert`, {}),
  reviseProposal: (proposalNumber: string, revisions: any) =>
    apiClient.post(`/documents/proposals/${proposalNumber}/revise`, { revisions }),

  // File Operations
  upload: (file: File, metadata?: any) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });
    }
    return apiClient.post('/documents/upload', formData);
  },

  linkBillingContract: (legalContractId: string, billingContractId: string) =>
    apiClient.post(`/documents/${legalContractId}/link-billing/${billingContractId}`, {}),
};

// ============================================================================
// LEGAL / HUKUK API
// ============================================================================
export const legalApi = {
  // Contracts
  getContracts: (params?: { customerId?: string; status?: string; approvalStatus?: string }) =>
    apiClient.get('/legal/contracts', params),
  getContractById: (id: string) => apiClient.get(`/legal/contracts/${id}`),
  submitForReview: (id: string) =>
    apiClient.post(`/legal/contracts/${id}/submit-review`, {}),

  // Approval Workflow
  approveLegal: (id: string, comments?: string) =>
    apiClient.post(`/legal/contracts/${id}/approve-legal`, { comments }),
  rejectLegal: (id: string, reason: string) =>
    apiClient.post(`/legal/contracts/${id}/reject-legal`, { reason }),
  approveAdmin: (id: string, comments?: string) =>
    apiClient.post(`/legal/contracts/${id}/approve-admin`, { comments }),
  customerSign: (id: string, signatureData: string, customerId: string) =>
    apiClient.post(`/legal/contracts/${id}/customer-sign`, { signatureData, customerId }),

  // Workflow & Approvals
  getWorkflow: (id: string) => apiClient.get(`/legal/contracts/${id}/workflow`),
  getPendingApprovals: (role: 'legal' | 'admin') =>
    apiClient.get('/legal/approvals/pending', { role }),
  delegateApproval: (id: string, toApproverId: string, reason: string) =>
    apiClient.post(`/legal/approvals/${id}/delegate`, { toApproverId, reason }),
  escalateApproval: (id: string, reason: string) =>
    apiClient.post(`/legal/approvals/${id}/escalate`, { reason }),

  // Analytics
  getSummary: () => apiClient.get('/legal/analytics/summary'),
  getExpiringContracts: (daysAhead?: number) =>
    apiClient.get('/legal/contracts/expiring/soon', { daysAhead }),

  // Contract Operations
  renewContract: (id: string, newEndDate: string) =>
    apiClient.post(`/legal/contracts/${id}/renew`, { newEndDate }),
  terminateContract: (id: string, reason: string) =>
    apiClient.post(`/legal/contracts/${id}/terminate`, { reason }),
};

// ============================================================================
// USER PORTAL API
// ============================================================================
export const portalApi = {
  // User Management
  getMyProfile: () => apiClient.get('/portal/users/me'),
  updateMyProfile: (data: any) => apiClient.put('/portal/users/me', data),
  getCustomerUsers: (customerId: string) =>
    apiClient.get(`/portal/users/customer/${customerId}`),
  createUser: (data: any) => apiClient.post('/portal/users', data),
  updatePermissions: (userId: string, permissions: any) =>
    apiClient.put(`/portal/users/${userId}/permissions`, { permissions }),

  // Order Tracking
  getOrders: (status?: string) => apiClient.get('/portal/orders', { status }),
  trackOrder: (orderNumber: string) =>
    apiClient.get(`/portal/orders/${orderNumber}/track`),
  trackByTrackingNumber: (trackingNumber: string) =>
    apiClient.get(`/portal/tracking/${trackingNumber}`),
  subscribeToOrderUpdates: (orderNumber: string, email: string, phone?: string) =>
    apiClient.post(`/portal/orders/${orderNumber}/subscribe`, { email, phone }),
  getDeliveryProof: (orderNumber: string) =>
    apiClient.get(`/portal/orders/${orderNumber}/delivery-proof`),

  // Inventory
  getInventory: (warehouseId?: string) =>
    apiClient.get('/portal/inventory', { warehouseId }),
  getInventorySummary: () => apiClient.get('/portal/inventory/summary'),
  getInventoryMovements: (productId: string, startDate?: string, endDate?: string) =>
    apiClient.get(`/portal/inventory/${productId}/movements`, { startDate, endDate }),
  getStockLevels: (productId: string, days?: number) =>
    apiClient.get(`/portal/inventory/${productId}/stock-levels`, { days }),
  requestInventoryReport: (format: 'pdf' | 'excel' | 'csv') =>
    apiClient.post('/portal/inventory/reports/request', { format }),

  // Notifications
  getNotifications: (params?: { read?: boolean; type?: string; limit?: number }) =>
    apiClient.get('/portal/notifications', params),
  markAsRead: (id: string) => apiClient.put(`/portal/notifications/${id}/mark-read`, {}),
  markAllAsRead: () => apiClient.put('/portal/notifications/mark-all-read', {}),
  deleteNotification: (id: string) =>
    apiClient.delete(`/portal/notifications/${id}`),

  // Documents
  uploadDocument: (file: File, metadata?: any) => {
    const formData = new FormData();
    formData.append('file', file);
    if (metadata) {
      Object.keys(metadata).forEach(key => {
        formData.append(key, metadata[key]);
      });
    }
    return apiClient.post('/portal/documents/upload', formData);
  },

  // Analytics
  getDashboard: () => apiClient.get('/portal/analytics/dashboard'),
};

// ============================================================================
// INTEGRATION API
// ============================================================================
export const integrationApi = {
  // Integration Management
  getAll: (params?: { type?: string; isActive?: boolean }) =>
    apiClient.get('/integrations', params),
  getById: (id: string) => apiClient.get(`/integrations/${id}`),
  create: (data: any) => apiClient.post('/integrations', data),
  update: (id: string, data: any) => apiClient.put(`/integrations/${id}`, data),
  delete: (id: string) => apiClient.delete(`/integrations/${id}`),

  // Integration Operations
  enable: (id: string) => apiClient.post(`/integrations/${id}/enable`, {}),
  disable: (id: string) => apiClient.post(`/integrations/${id}/disable`, {}),
  test: (id: string) => apiClient.post(`/integrations/${id}/test`, {}),
  triggerSync: (id: string, entity?: string) =>
    apiClient.post(`/integrations/${id}/sync`, { entity }),

  // Logs & History
  getLogs: (id: string, params?: { startDate?: string; endDate?: string; success?: boolean; limit?: number }) =>
    apiClient.get(`/integrations/${id}/logs`, params),
  getSyncHistory: (id: string, limit?: number) =>
    apiClient.get(`/integrations/${id}/sync-history`, { limit }),

  // Webhooks
  getWebhooks: (id: string) => apiClient.get(`/integrations/${id}/webhooks`),
  createWebhook: (id: string, data: any) =>
    apiClient.post(`/integrations/${id}/webhooks`, data),

  // Marketplace
  getMarketplace: (category?: string) =>
    apiClient.get('/integrations/marketplace/available', { category }),
  installFromMarketplace: (integrationId: string, config: any) =>
    apiClient.post(`/integrations/marketplace/${integrationId}/install`, config),
};

// ============================================================================
// TMS (Transport Management System) API
// ============================================================================
export const tmsApi = {
  // Vehicles
  getVehicles: (params?: any) => apiClient.get('/tms/vehicles', params),
  getVehicle: (id: string) => apiClient.get(`/tms/vehicles/${id}`),
  createVehicle: (data: any) => apiClient.post('/tms/vehicles', data),
  updateVehicle: (id: string, data: any) => apiClient.put(`/tms/vehicles/${id}`, data),
  deleteVehicle: (id: string) => apiClient.delete(`/tms/vehicles/${id}`),

  // Drivers
  getDrivers: (params?: any) => apiClient.get('/tms/drivers', params),
  getDriver: (id: string) => apiClient.get(`/tms/drivers/${id}`),
  createDriver: (data: any) => apiClient.post('/tms/drivers', data),
  updateDriver: (id: string, data: any) => apiClient.put(`/tms/drivers/${id}`, data),
  deleteDriver: (id: string) => apiClient.delete(`/tms/drivers/${id}`),

  // Routes
  getRoutes: (params?: any) => apiClient.get('/tms/routes', params),
  getRoute: (id: string) => apiClient.get(`/tms/routes/${id}`),
  createRoute: (data: any) => apiClient.post('/tms/routes', data),
  updateRoute: (id: string, data: any) => apiClient.put(`/tms/routes/${id}`, data),
  deleteRoute: (id: string) => apiClient.delete(`/tms/routes/${id}`),
  optimizeRoute: (data: any) => apiClient.post('/tms/routes/optimize', data),

  // Shipments
  getShipments: (params?: any) => apiClient.get('/tms/shipments', params),
  getShipment: (id: string) => apiClient.get(`/tms/shipments/${id}`),
  createShipment: (data: any) => apiClient.post('/tms/shipments', data),
  updateShipment: (id: string, data: any) =>
    apiClient.put(`/tms/shipments/${id}`, data),

  // Tracking
  getTracking: (trackingNumber: string) => apiClient.get(`/tms/tracking/${trackingNumber}`),
  updateTrackingStatus: (id: string, status: string) => 
    apiClient.patch(`/tms/shipments/${id}/tracking`, { status }),
  getShipmentTracking: (shipmentId: string) => 
    apiClient.get(`/tms/shipments/${shipmentId}/tracking`),
};

// ============================================================================
// WMS (Warehouse Management System) API
// ============================================================================
export const wmsApi = {
  // Warehouses
  getWarehouses: (params?: any) => apiClient.get('/wms/warehouses', params),
  getWarehouse: (id: string) => apiClient.get(`/wms/warehouses/${id}`),
  createWarehouse: (data: any) => apiClient.post('/wms/warehouses', data),
  updateWarehouse: (id: string, data: any) =>
    apiClient.put(`/wms/warehouses/${id}`, data),
  deleteWarehouse: (id: string) => apiClient.delete(`/wms/warehouses/${id}`),

  // Inventory
  getInventory: (params?: any) => apiClient.get('/wms/inventory', params),
  getInventoryItem: (id: string) => apiClient.get(`/wms/inventory/${id}`),
  adjustInventory: (id: string, data: any) =>
    apiClient.post(`/wms/inventory/${id}/adjust`, data),
  transferInventory: (data: any) => apiClient.post('/wms/inventory/transfer', data),

  // Products
  getProducts: (params?: any) => apiClient.get('/wms/products', params),
  getProduct: (id: string) => apiClient.get(`/wms/products/${id}`),
  createProduct: (data: any) => apiClient.post('/wms/products', data),
  updateProduct: (id: string, data: any) => apiClient.put(`/wms/products/${id}`, data),

  // Picking & Packing
  getPickingTasks: (params?: any) => apiClient.get('/wms/picking-tasks', params),
  createPickingTask: (data: any) => apiClient.post('/wms/picking-tasks', data),
  completePickingTask: (id: string, data: any) =>
    apiClient.post(`/wms/picking-tasks/${id}/complete`, data),

  // Receiving
  getReceivings: (params?: any) => apiClient.get('/wms/receiving', params),
  createReceiving: (data: any) => apiClient.post('/wms/receiving', data),
  completeReceiving: (id: string, data: any) =>
    apiClient.post(`/wms/receiving/${id}/complete`, data),

  // Zones
  getZones: (warehouseId: string) => apiClient.get('/wms/zones', { warehouseId }),
  createZone: (data: any) => apiClient.post('/wms/zones', data),

  // Lots & Batches
  getLots: (params?: any) => apiClient.get('/wms/lots', params),
  getLot: (id: string) => apiClient.get(`/wms/lots/${id}`),
  createLot: (data: any) => apiClient.post('/wms/lots', data),
  updateLot: (id: string, data: any) => apiClient.put(`/wms/lots/${id}`, data),
  deleteLot: (id: string) => apiClient.delete(`/wms/lots/${id}`),

  // Locations/Shelves
  getLocations: (params?: any) => apiClient.get('/wms/locations', params),
  getLocation: (id: string) => apiClient.get(`/wms/locations/${id}`),
  createLocation: (data: any) => apiClient.post('/wms/locations', data),
  updateLocation: (id: string, data: any) => apiClient.put(`/wms/locations/${id}`, data),
  deleteLocation: (id: string) => apiClient.delete(`/wms/locations/${id}`),

  // Handheld Devices/Terminals
  getTerminals: (params?: any) => apiClient.get('/wms/terminals', params),
  getTerminal: (id: string) => apiClient.get(`/wms/terminals/${id}`),
  createTerminal: (data: any) => apiClient.post('/wms/terminals', data),
  updateTerminal: (id: string, data: any) => apiClient.put(`/wms/terminals/${id}`, data),
  syncTerminal: (id: string) => apiClient.post(`/wms/terminals/${id}/sync`),
};

// ============================================================================
// CRM API
// ============================================================================
export const crmApi = {
  // Customers
  getCustomers: (params?: any) => apiClient.get('/crm/customers', params),
  getCustomer: (id: string) => apiClient.get(`/crm/customers/${id}`),
  createCustomer: (data: any) => apiClient.post('/crm/customers', data),
  updateCustomer: (id: string, data: any) =>
    apiClient.put(`/crm/customers/${id}`, data),
  deleteCustomer: (id: string) => apiClient.delete(`/crm/customers/${id}`),

  // Leads
  getLeads: (params?: any) => apiClient.get('/crm/leads', params),
  createLead: (data: any) => apiClient.post('/crm/leads', data),
  convertLead: (id: string) => apiClient.post(`/crm/leads/${id}/convert`, {}),

  // Campaigns
  getCampaigns: (params?: any) => apiClient.get('/crm/campaigns', params),
  createCampaign: (data: any) => apiClient.post('/crm/campaigns', data),
};

// ============================================================================
// BILLING API
// ============================================================================
export const billingApi = {
  // Invoices
  getInvoices: (params?: any) => apiClient.get('/billing/invoices', params),
  getInvoice: (id: string) => apiClient.get(`/billing/invoices/${id}`),
  createInvoice: (data: any) => apiClient.post('/billing/invoices', data),
  generateInvoice: (data: any) => apiClient.post('/billing/generate-invoice', data),

  // Contracts
  getContracts: (params?: any) => apiClient.get('/billing/contracts', params),
  getContract: (id: string) => apiClient.get(`/billing/contracts/${id}`),
  createContract: (data: any) => apiClient.post('/billing/contracts', data),

  // Pricing
  calculatePrice: (data: any) => apiClient.post('/billing/calculate-price', data),
  getMetrics: (period: string) => apiClient.get(`/billing/metrics?period=${period}`),

  // Accounts
  getAccounts: (params?: any) => apiClient.get('/finance/accounts', params),
  getAccount: (id: string) => apiClient.get(`/finance/accounts/${id}`),
  createAccount: (data: any) => apiClient.post('/finance/accounts', data),
  updateAccount: (id: string, data: any) => apiClient.put(`/finance/accounts/${id}`, data),
  getBalance: (id: string) => apiClient.get(`/finance/accounts/${id}/balance`),

  // Reports
  getFinancialReports: (params?: any) => apiClient.get('/finance/reports', params),
  generateReport: (data: any) => apiClient.post('/finance/reports/generate', data),
  exportReport: (id: string, format: string) => 
    apiClient.get(`/finance/reports/${id}/export`, { format }),
};

// ============================================================================
// ANALYTICS API
// ============================================================================
export const analyticsApi = {
  getDashboard: () => apiClient.get('/analytics/dashboards'),
  getKPIs: (params?: any) => apiClient.get('/analytics/kpis', params),
  getPredictiveInsights: () => apiClient.get('/analytics/predictive'),
  getReports: (type: string, params?: any) =>
    apiClient.get(`/analytics/reports/${type}`, params),
};

// ============================================================================
// TRACKING API
// ============================================================================
export const trackingApi = {
  getShipments: () => apiClient.get('/tracking/shipments'),
  getShipmentById: (id: string) => apiClient.get(`/tracking/shipments/${id}`),
  trackByNumber: (trackingNumber: string) =>
    apiClient.get(`/tracking/${trackingNumber}`),
  updateLocation: (shipmentId: string, data: any) =>
    apiClient.post(`/tracking/shipments/${shipmentId}/location`, data),
};

// ============================================================================
// ERP API
// ============================================================================
export const erpApi = {
  // Finance
  getFinancials: () => apiClient.get('/erp/financials'),
  getTransactions: () => apiClient.get('/erp/transactions'),
  getBudgets: () => apiClient.get('/erp/budgets'),

  // HR
  getEmployees: (params?: any) => apiClient.get('/erp/employees', params),
  getEmployee: (id: string) => apiClient.get(`/erp/employees/${id}`),

  // Inventory
  getStockCards: (params?: any) => apiClient.get('/erp/stock-cards', params),
  getStockMovements: (params?: any) =>
    apiClient.get('/erp/stock-movements', params),
};

// ============================================================================
// AI & ML API
// ============================================================================
export const aiApi = {
  getDemandForecast: (params: any) => apiClient.post('/ai/demand-forecast', params),
  getRouteOptimization: (data: any) =>
    apiClient.post('/ai/route-optimization', data),
  getAnomalyDetection: () => apiClient.get('/ai/anomaly-detection'),
  getSmartLoadPlanning: (data: any) =>
    apiClient.post('/ai/load-planning', data),
  getDynamicPricing: (data: any) => apiClient.post('/ai/dynamic-pricing', data),
};

// ============================================================================
// NOTIFICATION API
// ============================================================================
export const notificationApi = {
  getAll: (params?: any) => apiClient.get('/notifications', params),
  markAsRead: (id: string) => apiClient.put(`/notifications/${id}/read`, {}),
  markAllAsRead: () => apiClient.put('/notifications/read-all', {}),
  delete: (id: string) => apiClient.delete(`/notifications/${id}`),
  getPreferences: () => apiClient.get('/notifications/preferences'),
  updatePreferences: (data: any) =>
    apiClient.put('/notifications/preferences', data),
};

// ============================================================================
// WEBHOOKS API
// ============================================================================
export const webhookApi = {
  getAll: () => apiClient.get('/webhooks'),
  create: (data: any) => apiClient.post('/webhooks', data),
  update: (id: string, data: any) => apiClient.put(`/webhooks/${id}`, data),
  delete: (id: string) => apiClient.delete(`/webhooks/${id}`),
  test: (id: string) => apiClient.post(`/webhooks/${id}/test`, {}),
  getLogs: (id: string, params?: any) =>
    apiClient.get(`/webhooks/${id}/logs`, params),
};

// ============================================================================
// AUDIT API
// ============================================================================
export const auditApi = {
  getLogs: (params?: any) => apiClient.get('/audit/logs', params),
  getLog: (id: string) => apiClient.get(`/audit/logs/${id}`),
  exportLogs: (params: any) => apiClient.post('/audit/export', params),
};

// ============================================================================
// SUSTAINABILITY API
// ============================================================================
export const sustainabilityApi = {
  getCarbonFootprint: (params?: any) =>
    apiClient.get('/sustainability/carbon-footprint', params),
  getWasteReduction: () => apiClient.get('/sustainability/waste-reduction'),
  getEnvironmentalMetrics: () =>
    apiClient.get('/sustainability/environmental-metrics'),
};

// ============================================================================
// EXPORT AGGREGATED API
// ============================================================================
export const api = {
  auth: authApi,
  document: documentApi,
  legal: legalApi,
  portal: portalApi,
  integration: integrationApi,
  tms: tmsApi,
  wms: wmsApi,
  crm: crmApi,
  billing: billingApi,
  analytics: analyticsApi,
  tracking: trackingApi,
  erp: erpApi,
  ai: aiApi,
  notification: notificationApi,
  webhook: webhookApi,
  audit: auditApi,
  sustainability: sustainabilityApi,
};

export default api;

