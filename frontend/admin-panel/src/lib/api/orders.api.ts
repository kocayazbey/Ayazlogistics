import { api } from '../api';

export interface Order {
  id: string;
  orderNumber: string;
  type: 'B2B' | 'B2C' | 'SUPPLIER';
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  customer: {
    id: string;
    name: string;
    email: string;
    phone: string;
    company?: string;
  };
  items: OrderItem[];
  shipping: {
    address: string;
    city: string;
    country: string;
    postalCode: string;
    method: string;
    trackingNumber?: string;
  };
  billing: {
    address: string;
    city: string;
    country: string;
    postalCode: string;
    taxNumber?: string;
  };
  totals: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
    total: number;
    currency: string;
  };
  payment: {
    method: string;
    status: string;
    transactionId?: string;
    paidAt?: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  shippedAt?: string;
}

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  weight: number;
  dimensions: {
    height: number;
    width: number;
    length: number;
  };
}

export interface OrderFilter {
  page?: number;
  limit?: number;
  search?: string;
  type?: 'B2B' | 'B2C' | 'SUPPLIER';
  status?: string;
  customerId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export const ordersApi = {
  getAll: (filter: OrderFilter = {}) => 
    api.get('/v1/orders', { params: filter }),
  
  getOne: (id: string) => 
    api.get(`/v1/orders/${id}`),
  
  create: (data: Partial<Order>) => 
    api.post('/v1/orders', data),
  
  update: (id: string, data: Partial<Order>) => 
    api.put(`/v1/orders/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/v1/orders/${id}`),
  
  updateStatus: (id: string, status: string) => 
    api.patch(`/v1/orders/${id}/status`, { status }),
  
  getStats: () => 
    api.get('/v1/orders/stats'),
  
  export: (filter: OrderFilter = {}) => 
    api.get('/v1/orders/export', { params: filter, responseType: 'blob' }),
};