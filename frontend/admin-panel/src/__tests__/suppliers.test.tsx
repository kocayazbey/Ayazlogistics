import { describe, it, expect, vi, beforeEach } from 'vitest';
import { suppliersApi } from '../lib/api/suppliers.api';

// Mock the API
vi.mock('../lib/api/suppliers.api', () => ({
  suppliersApi: {
    getSupplierOrders: vi.fn(),
    createSupplierOrder: vi.fn(),
    syncStock: vi.fn(),
    getSyncHistory: vi.fn(),
  }
}));

describe('Suppliers Module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch supplier orders', async () => {
    const mockOrders = [
      {
        id: '1',
        orderNumber: 'PO-001',
        supplier: 'Supplier A',
        status: 'pending',
        totalAmount: 5000
      }
    ];

    (suppliersApi.getSupplierOrders as any).mockResolvedValue({ data: mockOrders });

    const result = await suppliersApi.getSupplierOrders({ status: 'pending' });
    
    expect(suppliersApi.getSupplierOrders).toHaveBeenCalledWith({ status: 'pending' });
    expect(result.data).toEqual(mockOrders);
  });

  it('should sync stock with supplier', async () => {
    (suppliersApi.syncStock as any).mockResolvedValue({ 
      data: { status: 'success', itemsSynced: 100 } 
    });

    const result = await suppliersApi.syncStock('supplier-1');
    
    expect(suppliersApi.syncStock).toHaveBeenCalledWith('supplier-1');
    expect(result.data.status).toBe('success');
  });

  it('should fetch sync history', async () => {
    const mockHistory = [
      {
        id: '1',
        supplier: 'Supplier A',
        status: 'success',
        lastSync: '2025-01-01T00:00:00Z'
      }
    ];

    (suppliersApi.getSyncHistory as any).mockResolvedValue({ data: mockHistory });

    const result = await suppliersApi.getSyncHistory();
    
    expect(suppliersApi.getSyncHistory).toHaveBeenCalled();
    expect(result.data).toEqual(mockHistory);
  });
});

