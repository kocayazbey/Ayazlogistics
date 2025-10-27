import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 Unauthorized - Token expired
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        // Try to refresh token
        const refreshToken = localStorage.getItem('refreshToken');
        if (refreshToken) {
          const response = await api.post('/auth/refresh', { refreshToken });
          const { accessToken } = response.data;
          localStorage.setItem('token', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return api(originalRequest);
        }
      } catch (refreshError) {
        // Refresh failed, logout user
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    // Handle other errors
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    return Promise.reject(error);
  }
);

export const auth = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  getProfile: () => api.get('/auth/profile'),
  refreshToken: () => api.post('/auth/refresh'),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    api.post('/auth/reset-password', { token, password }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const vehicles = {
  getAll: (params?: any) => api.get('/tms/vehicles', { params }),
  getOne: (id: string) => api.get(`/tms/vehicles/${id}`),
  create: (data: any) => api.post('/tms/vehicles', data),
  update: (id: string, data: any) => api.put(`/tms/vehicles/${id}`, data),
  delete: (id: string) => api.delete(`/tms/vehicles/${id}`),
};

export const warehouses = {
  getAll: (params?: any) => api.get('/wms/warehouses', { params }),
  getOne: (id: string) => api.get(`/wms/warehouses/${id}`),
  create: (data: any) => api.post('/wms/warehouses', data),
  update: (id: string, data: any) => api.put(`/wms/warehouses/${id}`, data),
  delete: (id: string) => api.delete(`/wms/warehouses/${id}`),
};

export const customers = {
  getAll: (params?: any) => api.get('/crm/customers', { params }),
  getOne: (id: string) => api.get(`/crm/customers/${id}`),
  create: (data: any) => api.post('/crm/customers', data),
  update: (id: string, data: any) => api.put(`/crm/customers/${id}`, data),
  delete: (id: string) => api.delete(`/crm/customers/${id}`),
};

export const billing = {
  getInvoices: (params?: any) => api.get('/billing/invoices', { params }),
  getContracts: (params?: any) => api.get('/billing/contracts', { params }),
  generateInvoice: (data: any) => api.post('/billing/generate-invoice', data),
  calculatePrice: (data: any) => api.post('/billing/calculate-price', data),
};

export const documents = {
  getAll: (params?: any) => api.get('/documents', { params }),
  upload: (formData: FormData) =>
    api.post('/documents', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  download: (id: string) => api.get(`/documents/${id}/download`, { responseType: 'blob' }),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

export const analytics = {
  getDashboard: () => api.get('/analytics/dashboards'),
  getKPIs: (params?: any) => api.get('/analytics/kpis', { params }),
};

export const wms = {
  // Inventory
  inventory: {
    getAll: (params?: any) => api.get('/wms/inventory', { params }),
    getOne: (id: string) => api.get(`/wms/inventory/${id}`),
    create: (data: any) => api.post('/wms/inventory', data),
    update: (id: string, data: any) => api.put(`/wms/inventory/${id}`, data),
    adjust: (id: string, data: any) => api.post(`/wms/inventory/${id}/adjust`, data),
    getMovements: (id: string, params?: any) => api.get(`/wms/inventory/${id}/movements`, { params }),
    getStats: (params?: any) => api.get('/wms/inventory/stats', { params }),
    getLowStock: (params?: any) => api.get('/wms/inventory/low-stock', { params }),
    getSlowMoving: (params?: any) => api.get('/wms/inventory/slow-moving', { params }),
  },

  // Operations
  operations: {
    getAll: (params?: any) => api.get('/wms/operations', { params }),
    getOne: (id: string) => api.get(`/wms/operations/${id}`),
    create: (data: any) => api.post('/wms/operations', data),
    update: (id: string, data: any) => api.put(`/wms/operations/${id}`, data),
    start: (id: string) => api.post(`/wms/operations/${id}/start`),
    complete: (id: string, data: any) => api.post(`/wms/operations/${id}/complete`, data),
    pause: (id: string) => api.post(`/wms/operations/${id}/pause`),
    resume: (id: string) => api.post(`/wms/operations/${id}/resume`),
    getActivities: (id: string) => api.get(`/wms/operations/${id}/activities`),
    getStats: (params?: any) => api.get('/wms/operations/stats', { params }),
  },

  // Receiving
  receiving: {
    getAll: (params?: any) => api.get('/wms/receiving', { params }),
    getOne: (id: string) => api.get(`/wms/receiving/${id}`),
    create: (data: any) => api.post('/wms/receiving', data),
    update: (id: string, data: any) => api.put(`/wms/receiving/${id}`, data),
    complete: (id: string, data: any) => api.post(`/wms/receiving/${id}/complete`, data),
    cancel: (id: string, data: any) => api.post(`/wms/receiving/${id}/cancel`, data),
  },

  // Picking
  picking: {
    getAll: (params?: any) => api.get('/wms/picking', { params }),
    getOne: (id: string) => api.get(`/wms/picking/${id}`),
    create: (data: any) => api.post('/wms/picking', data),
    update: (id: string, data: any) => api.put(`/wms/picking/${id}`, data),
    start: (id: string) => api.post(`/wms/picking/${id}/start`),
    complete: (id: string, data: any) => api.post(`/wms/picking/${id}/complete`, data),
    cancel: (id: string, data: any) => api.post(`/wms/picking/${id}/cancel`, data),
  },

  // Shipping
  shipping: {
    getAll: (params?: any) => api.get('/wms/shipping', { params }),
    getOne: (id: string) => api.get(`/wms/shipping/${id}`),
    create: (data: any) => api.post('/wms/shipping', data),
    update: (id: string, data: any) => api.put(`/wms/shipping/${id}`, data),
    ship: (id: string) => api.post(`/wms/shipping/${id}/ship`),
    cancel: (id: string, data: any) => api.post(`/wms/shipping/${id}/cancel`, data),
  },

  // Mobile
  mobile: {
    dashboard: (params?: any) => api.get('/mobile/dashboard', { params }),
    inventory: (params?: any) => api.get('/mobile/inventory', { params }),
    orders: (params?: any) => api.get('/mobile/orders', { params }),
    customers: (params?: any) => api.get('/mobile/customers', { params }),
    sync: (data: any) => api.post('/mobile/sync', data),
  },

  // Monitoring
  monitoring: {
    dashboard: (warehouseId: string) => api.get(`/wms/monitoring/dashboard/${warehouseId}`),
    ptes: (warehouseId: string) => api.get(`/wms/monitoring/ptes/${warehouseId}`),
    carts: (warehouseId: string) => api.get(`/wms/monitoring/carts/${warehouseId}`),
    docks: (warehouseId: string) => api.get(`/wms/monitoring/docks/${warehouseId}`),
    pickfaces: (warehouseId: string) => api.get(`/wms/monitoring/pickfaces/${warehouseId}`),
    alerts: (warehouseId: string) => api.get(`/wms/monitoring/alerts/${warehouseId}`),
  },

  // Advanced Features
  advanced: {
    shipping: {
      createPreOrder: (data: any) => api.post('/wms/shipping-advanced/pre-order', data),
      planShipment: (data: any) => api.post('/wms/shipping-advanced/shipment/plan', data),
      startShipment: (data: any) => api.post('/wms/shipping-advanced/shipment/start', data),
      approveShipment: (data: any) => api.post('/wms/shipping-advanced/shipment/approve', data),
      cancelShipment: (data: any) => api.post('/wms/shipping-advanced/shipment/cancel', data),
      cutInvoice: (data: any) => api.post('/wms/shipping-advanced/invoice/cut', data),
    },
    cycleCount: {
      dynamicPallet: (data: any) => api.post('/wms/cycle-count-advanced/dynamic-pallet', data),
      dynamicPickface: (data: any) => api.post('/wms/cycle-count-advanced/dynamic-pickface', data),
      createPlan: (data: any) => api.post('/wms/cycle-count-advanced/plan', data),
    },
  },
};

