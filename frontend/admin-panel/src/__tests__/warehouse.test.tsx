import { describe, it, expect, vi, beforeEach } from 'vitest';
import { warehouseApi } from '../lib/api/warehouse.api';

// Mock the API
vi.mock('../lib/api/warehouse.api', () => ({
  warehouseApi: {
    getWarehouses: vi.fn(),
    getInventory: vi.fn(),
    getLots: vi.fn(),
    getInventoryStats: vi.fn(),
    getLotStats: vi.fn(),
  }
}));

describe('Warehouse Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch warehouses', async () => {
    const mockWarehouses = [
      {
        id: '1',
        name: 'Main Warehouse',
        code: 'WH-001',
        status: 'active'
      }
    ];

    (warehouseApi.getWarehouses as any).mockResolvedValue({ data: mockWarehouses });

    const result = await warehouseApi.getWarehouses();
    
    expect(warehouseApi.getWarehouses).toHaveBeenCalled();
    expect(result.data).toEqual(mockWarehouses);
  });

  it('should fetch inventory', async () => {
    const mockInventory = [
      {
        id: '1',
        productName: 'Product A',
        quantity: 100,
        available: 80
      }
    ];

    (warehouseApi.getInventory as any).mockResolvedValue({ data: mockInventory });

    const result = await warehouseApi.getInventory({ warehouseId: '1' });
    
    expect(warehouseApi.getInventory).toHaveBeenCalledWith({ warehouseId: '1' });
    expect(result.data).toEqual(mockInventory);
  });

  it('should fetch inventory statistics', async () => {
    const mockStats = {
      totalItems: 500,
      totalLocations: 50,
      lowStockItems: 10
    };

    (warehouseApi.getInventoryStats as any).mockResolvedValue({ data: mockStats });

    const result = await warehouseApi.getInventoryStats();
    
    expect(warehouseApi.getInventoryStats).toHaveBeenCalled();
    expect(result.data).toEqual(mockStats);
  });
});

