import { api } from '../api';

export interface Product {
  id: string;
  name: string;
  sku: string;
  description: string;
  category: string;
  supplier: string;
  unitCost: number;
  unitPrice: number;
  weight: number;
  dimensions: {
    height: number;
    width: number;
    length: number;
  };
  stock: {
    current: number;
    min: number;
    max: number;
  };
  status: 'active' | 'inactive' | 'discontinued';
  images: string[];
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ProductFilter {
  page?: number;
  limit?: number;
  search?: string;
  category?: string;
  status?: string;
  supplier?: string;
  minPrice?: number;
  maxPrice?: number;
  lowStock?: boolean;
}

export const productsApi = {
  getAll: (filter: ProductFilter = {}) => 
    api.get('/v1/products', { params: filter }),
  
  getOne: (id: string) => 
    api.get(`/v1/products/${id}`),
  
  create: (data: Partial<Product>) => 
    api.post('/v1/products', data),
  
  update: (id: string, data: Partial<Product>) => 
    api.put(`/v1/products/${id}`, data),
  
  delete: (id: string) => 
    api.delete(`/v1/products/${id}`),
  
  getCategories: () => 
    api.get('/v1/products/categories'),
  
  getSuppliers: () => 
    api.get('/v1/products/suppliers'),
  
  getLowStock: (filter: ProductFilter = {}) => 
    api.get('/v1/products/low-stock', { params: filter }),
  
  updateStock: (id: string, quantity: number, type: 'add' | 'subtract' | 'set') => 
    api.patch(`/v1/products/${id}/stock`, { quantity, type }),
  
  getStats: () => 
    api.get('/v1/products/stats'),
  
  bulkUpdate: (data: { ids: string[], updates: Partial<Product> }) => 
    api.patch('/v1/products/bulk', data),
  
  export: (filter: ProductFilter = {}) => 
    api.get('/v1/products/export', { params: filter, responseType: 'blob' }),
};