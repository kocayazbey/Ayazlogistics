import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { productsApi } from '../lib/api/products.api';

// Mock the API
vi.mock('../lib/api/products.api', () => ({
  productsApi: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    getStats: vi.fn(),
  }
}));

describe('Products Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch products from API', async () => {
    const mockProducts = [
      {
        id: '1',
        name: 'Product A',
        sku: 'A001',
        category: 'Electronics',
        unitPrice: 100,
        stock: { current: 50, min: 10, max: 500 },
        status: 'active'
      }
    ];

    (productsApi.getAll as any).mockResolvedValue({ data: mockProducts });

    const result = await productsApi.getAll({ page: 1, limit: 20 });
    
    expect(productsApi.getAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(result.data).toEqual(mockProducts);
  });

  it('should handle API errors gracefully', async () => {
    (productsApi.getAll as any).mockRejectedValue(new Error('API Error'));

    try {
      await productsApi.getAll();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
    }
  });

  it('should fetch product statistics', async () => {
    const mockStats = {
      total: 100,
      active: 80,
      inactive: 20,
      lowStock: 5
    };

    (productsApi.getStats as any).mockResolvedValue({ data: mockStats });

    const result = await productsApi.getStats();
    
    expect(productsApi.getStats).toHaveBeenCalled();
    expect(result.data).toEqual(mockStats);
  });
});

