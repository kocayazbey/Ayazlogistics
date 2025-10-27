import { api } from './api';

export interface SupplierOrder {
  id: string;
  orderNumber: string;
  supplier: string;
  status: string;
  totalAmount: number;
  currency: string;
  orderDate: string;
  expectedDelivery: string;
  items: number;
  priority: string;
}

export interface StockSync {
  id: string;
  supplier: string;
  status: string;
  lastSync: string;
  nextSync: string;
  itemsSynced: number;
  totalItems: number;
  autoSync: boolean;
  syncFrequency: string;
}

export const suppliersApi = {
  // Supplier Orders
  getSupplierOrders: (params?: any) => api.get('/v1/suppliers/orders', { params }),
  getSupplierOrder: (id: string) => api.get(`/v1/suppliers/orders/${id}`),
  createSupplierOrder: (data: any) => api.post('/v1/suppliers/orders', data),
  updateSupplierOrder: (id: string, data: any) => api.put(`/v1/suppliers/orders/${id}`, data),
  deleteSupplierOrder: (id: string) => api.delete(`/v1/suppliers/orders/${id}`),

  // Stock Sync
  syncStock: (supplierId: string) => api.post(`/v1/suppliers/${supplierId}/sync`),
  getSyncStatus: (supplierId: string) => api.get(`/v1/suppliers/${supplierId}/sync/status`),
  getSyncHistory: (params?: any) => api.get('/v1/suppliers/sync/history', { params }),
  enableAutoSync: (supplierId: string, frequency: string) => 
    api.post(`/v1/suppliers/${supplierId}/sync/auto`, { frequency }),
  disableAutoSync: (supplierId: string) => 
    api.delete(`/v1/suppliers/${supplierId}/sync/auto`),
};

