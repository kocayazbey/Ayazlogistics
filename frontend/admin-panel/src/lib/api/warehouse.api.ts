import { api } from '../api';

export interface Warehouse {
  id: string;
  name: string;
  code: string;
  address: string;
  city: string;
  country: string;
  postalCode: string;
  capacity: number;
  currentUsage: number;
  status: 'active' | 'inactive' | 'maintenance';
  manager: string;
  phone: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  location: string;
  quantity: number;
  reserved: number;
  available: number;
  minLevel: number;
  maxLevel: number;
  lastCounted: string;
  status: 'active' | 'inactive' | 'quarantine';
  createdAt: string;
  updatedAt: string;
}

export interface Lot {
  id: string;
  lotNumber: string;
  productId: string;
  productName: string;
  sku: string;
  warehouseId: string;
  location: string;
  quantity: number;
  receivedDate: string;
  expiryDate?: string;
  supplier: string;
  status: 'active' | 'expired' | 'quarantine' | 'consumed';
  createdAt: string;
  updatedAt: string;
}

export interface WarehouseFilter {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  city?: string;
}

export interface InventoryFilter {
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: string;
  category?: string;
  lowStock?: boolean;
  status?: string;
}

export interface LotFilter {
  page?: number;
  limit?: number;
  search?: string;
  warehouseId?: string;
  productId?: string;
  status?: string;
  expiryDateFrom?: string;
  expiryDateTo?: string;
}

export const warehouseApi = {
  // Warehouses
  getWarehouses: (filter: WarehouseFilter = {}) => 
    api.get('/v1/warehouses', { params: filter }),
  
  getWarehouse: (id: string) => 
    api.get(`/v1/warehouses/${id}`),
  
  createWarehouse: (data: Partial<Warehouse>) => 
    api.post('/v1/warehouses', data),
  
  updateWarehouse: (id: string, data: Partial<Warehouse>) => 
    api.put(`/v1/warehouses/${id}`, data),
  
  deleteWarehouse: (id: string) => 
    api.delete(`/v1/warehouses/${id}`),
  
  getWarehouseStats: (id: string) => 
    api.get(`/v1/warehouses/${id}/stats`),
  
  // Inventory
  getInventory: (filter: InventoryFilter = {}) => 
    api.get('/v1/warehouses/inventory', { params: filter }),
  
  getInventoryItem: (id: string) => 
    api.get(`/v1/warehouses/inventory/${id}`),
  
  updateInventory: (id: string, data: Partial<InventoryItem>) => 
    api.put(`/v1/warehouses/inventory/${id}`, data),
  
  adjustInventory: (id: string, quantity: number, reason: string) => 
    api.patch(`/v1/warehouses/inventory/${id}/adjust`, { quantity, reason }),
  
  getLowStock: (warehouseId?: string) => 
    api.get('/v1/warehouses/inventory/low-stock', { params: { warehouseId } }),
  
  getInventoryStats: (warehouseId?: string) => 
    api.get('/v1/warehouses/inventory/stats', { params: { warehouseId } }),
  
  // Lots
  getLots: (filter: LotFilter = {}) => 
    api.get('/v1/warehouses/lots', { params: filter }),
  
  getLot: (id: string) => 
    api.get(`/v1/warehouses/lots/${id}`),
  
  createLot: (data: Partial<Lot>) => 
    api.post('/v1/warehouses/lots', data),
  
  updateLot: (id: string, data: Partial<Lot>) => 
    api.put(`/v1/warehouses/lots/${id}`, data),
  
  deleteLot: (id: string) => 
    api.delete(`/v1/warehouses/lots/${id}`),
  
  getExpiringLots: (days: number = 30) => 
    api.get('/v1/warehouses/lots/expiring', { params: { days } }),
  
  getLotStats: (warehouseId?: string) => 
    api.get('/v1/warehouses/lots/stats', { params: { warehouseId } }),
  
  // Locations
  getLocations: (warehouseId: string) => 
    api.get(`/v1/warehouses/${warehouseId}/locations`),
  
  createLocation: (warehouseId: string, data: any) => 
    api.post(`/v1/warehouses/${warehouseId}/locations`, data),
  
  updateLocation: (warehouseId: string, locationId: string, data: any) => 
    api.put(`/v1/warehouses/${warehouseId}/locations/${locationId}`, data),
  
  deleteLocation: (warehouseId: string, locationId: string) => 
    api.delete(`/v1/warehouses/${warehouseId}/locations/${locationId}`),
};
