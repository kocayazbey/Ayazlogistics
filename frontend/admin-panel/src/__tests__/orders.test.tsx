import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ordersApi } from '../lib/api/orders.api';

// Mock the API
vi.mock('../lib/api/orders.api', () => ({
  ordersApi: {
    getAll: vi.fn(),
    getOne: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateStatus: vi.fn(),
    getStats: vi.fn(),
  }
}));

describe('Orders (Sales) Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch orders from API', async () => {
    const mockOrders = [
      {
        id: '1',
        orderNumber: 'ORD-001',
        type: 'B2B',
        status: 'pending',
        totals: { total: 1000, currency: 'USD' }
      }
    ];

    (ordersApi.getAll as any).mockResolvedValue({ data: mockOrders });

    const result = await ordersApi.getAll({ page: 1, limit: 20 });
    
    expect(ordersApi.getAll).toHaveBeenCalledWith({ page: 1, limit: 20 });
    expect(result.data).toEqual(mockOrders);
  });

  it('should update order status', async () => {
    (ordersApi.updateStatus as any).mockResolvedValue({ 
      data: { id: '1', status: 'shipped' } 
    });

    const result = await ordersApi.updateStatus('1', 'shipped');
    
    expect(ordersApi.updateStatus).toHaveBeenCalledWith('1', 'shipped');
    expect(result.data.status).toBe('shipped');
  });

  it('should fetch order statistics', async () => {
    const mockStats = {
      total: 50,
      pending: 10,
      shipped: 30,
      delivered: 10
    };

    (ordersApi.getStats as any).mockResolvedValue({ data: mockStats });

    const result = await ordersApi.getStats();
    
    expect(ordersApi.getStats).toHaveBeenCalled();
    expect(result.data).toEqual(mockStats);
  });
});

