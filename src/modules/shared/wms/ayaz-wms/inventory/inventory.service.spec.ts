import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([{ id: 'test-item-id' }]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: DRIZZLE_ORM,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('getInventoryItems', () => {
    it('should return inventory items with pagination', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Product A', quantityOnHand: 100 },
        { id: 'item-2', name: 'Product B', quantityOnHand: 50 },
      ];

      const [itemsData, totalCount] = await Promise.all([
        Promise.resolve(mockItems),
        Promise.resolve([{ count: 2 }]),
      ]);

      mockDb.select.mockResolvedValue(itemsData);
      mockDb.select.mockResolvedValueOnce(itemsData).mockResolvedValueOnce([{ count: 2 }]);

      const result = await service.getInventoryItems({
        tenantId: 'tenant-123',
        page: 1,
        limit: 10,
      });

      expect(result.items).toEqual(mockItems);
      expect(result.pagination.total).toBe(2);
    });

    it('should filter by warehouse', async () => {
      const mockItems = [{ id: 'item-1', warehouseId: 'warehouse-123' }];

      mockDb.select.mockResolvedValue(mockItems);
      mockDb.select.mockResolvedValueOnce(mockItems).mockResolvedValueOnce([{ count: 1 }]);

      await service.getInventoryItems({
        tenantId: 'tenant-123',
        warehouseId: 'warehouse-123',
        page: 1,
        limit: 10,
      });

      expect(mockDb.where).toHaveBeenCalled();
    });

    it('should filter by category', async () => {
      const mockItems = [{ id: 'item-1', category: 'Electronics' }];

      mockDb.select.mockResolvedValue(mockItems);
      mockDb.select.mockResolvedValueOnce(mockItems).mockResolvedValueOnce([{ count: 1 }]);

      await service.getInventoryItems({
        tenantId: 'tenant-123',
        category: 'Electronics',
        page: 1,
        limit: 10,
      });

      expect(mockDb.where).toHaveBeenCalled();
    });
  });

  describe('getInventoryStats', () => {
    it('should return inventory statistics', async () => {
      const mockStats = {
        totalItems: 100,
        totalQuantity: 5000,
        totalValue: 25000,
        avgQuantity: 50,
        lowStockItems: 5,
        statusBreakdown: { active: 95, inactive: 5 },
      };

      const [stats, statusStats, lowStockCount] = await Promise.all([
        Promise.resolve([mockStats]),
        Promise.resolve([{ status: 'active', count: 95 }]),
        Promise.resolve([{ count: 5 }]),
      ]);

      mockDb.select.mockResolvedValueOnce([mockStats])
        .mockResolvedValueOnce([{ status: 'active', count: 95 }])
        .mockResolvedValueOnce([{ count: 5 }]);

      const result = await service.getInventoryStats('tenant-123');

      expect(result).toEqual(mockStats);
    });
  });

  describe('getABCAnalysis', () => {
    it('should return ABC analysis', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Product A', quantity: 100, unitCost: 50, totalValue: 5000 },
        { id: 'item-2', name: 'Product B', quantity: 50, unitCost: 30, totalValue: 1500 },
      ];

      mockDb.select.mockResolvedValue(mockItems);

      const result = await service.getABCAnalysis('tenant-123');

      expect(result.totalItems).toBe(2);
      expect(result.abcAnalysis).toHaveLength(2);
      expect(result.summary).toHaveProperty('A');
      expect(result.summary).toHaveProperty('B');
      expect(result.summary).toHaveProperty('C');
    });
  });

  describe('getLowStockItems', () => {
    it('should return low stock items', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Product A', quantityOnHand: 5 },
        { id: 'item-2', name: 'Product B', quantityOnHand: 3 },
      ];

      mockDb.select.mockResolvedValue(mockItems);

      const result = await service.getLowStockItems('tenant-123', undefined, 10);

      expect(result).toEqual(mockItems);
    });
  });

  describe('getSlowMovingItems', () => {
    it('should return slow moving items', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Product A', lastMovementDate: new Date('2023-01-01') },
      ];

      mockDb.select.mockResolvedValue(mockItems);

      const result = await service.getSlowMovingItems('tenant-123', undefined, 90);

      expect(result).toEqual(mockItems);
    });
  });

  describe('getInventoryItem', () => {
    it('should return inventory item by id', async () => {
      const mockItem = {
        inventory: { id: 'item-1', name: 'Product A' },
        warehouse: { id: 'warehouse-1', name: 'Main Warehouse' },
        product: { id: 'product-1', name: 'Product A' },
      };

      mockDb.select.mockResolvedValue([mockItem]);

      const result = await service.getInventoryItem('item-1', 'tenant-123');

      expect(result).toEqual(mockItem);
    });

    it('should throw NotFoundException when item not found', async () => {
      mockDb.select.mockResolvedValue([]);

      await expect(service.getInventoryItem('invalid-id', 'tenant-123')).rejects.toThrow(
        NotFoundException
      );
    });
  });

  describe('createInventoryItem', () => {
    it('should create inventory item', async () => {
      const itemData = {
        warehouseId: 'warehouse-123',
        productId: 'product-123',
        sku: 'SKU-001',
        name: 'Product A',
        quantityOnHand: 100,
        unitCost: 25.50,
      };

      const mockItem = { id: 'item-123', ...itemData };
      mockDb.insert.mockResolvedValue([mockItem]);

      const result = await service.createInventoryItem(itemData, 'user-123', 'tenant-123');

      expect(result).toEqual(mockItem);
      expect(mockDb.insert).toHaveBeenCalled();
    });
  });

  describe('updateInventoryItem', () => {
    it('should update inventory item', async () => {
      const updateData = {
        name: 'Updated Product',
        unitCost: 30.00,
      };

      const mockItem = { id: 'item-123', ...updateData };
      mockDb.select.mockResolvedValue([{ inventory: { id: 'item-123' } }]);
      mockDb.update.mockResolvedValue([mockItem]);

      const result = await service.updateInventoryItem('item-123', updateData, 'user-123', 'tenant-123');

      expect(result).toEqual(mockItem);
      expect(mockDb.update).toHaveBeenCalled();
    });
  });

  describe('adjustInventory', () => {
    it('should adjust inventory quantity', async () => {
      const adjustmentData = {
        type: 'adjustment',
        quantity: 10,
        reason: 'Stock correction',
      };

      const mockItem = { id: 'item-123', quantityOnHand: 110 };
      mockDb.select.mockResolvedValue([{ inventory: { id: 'item-123', quantityOnHand: 100, quantityReserved: 0 } }]);
      mockDb.update.mockResolvedValue([mockItem]);

      const result = await service.adjustInventory('item-123', adjustmentData, 'user-123', 'tenant-123');

      expect(result).toEqual(mockItem);
      expect(mockDb.update).toHaveBeenCalled();
    });

    it('should throw BadRequestException for insufficient inventory', async () => {
      const adjustmentData = {
        type: 'adjustment',
        quantity: -200, // More than available
        reason: 'Stock correction',
      };

      mockDb.select.mockResolvedValue([{ inventory: { id: 'item-123', quantityOnHand: 100, quantityReserved: 0 } }]);

      await expect(service.adjustInventory('item-123', adjustmentData, 'user-123', 'tenant-123')).rejects.toThrow(
        BadRequestException
      );
    });
  });

  describe('getInventoryMovements', () => {
    it('should return inventory movements', async () => {
      const mockMovements = [
        { id: 'movement-1', type: 'in', quantity: 100, reason: 'Purchase' },
        { id: 'movement-2', type: 'out', quantity: -50, reason: 'Sale' },
      ];

      mockDb.select.mockResolvedValue(mockMovements);

      const result = await service.getInventoryMovements('item-123', 'tenant-123', {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      });

      expect(result).toEqual(mockMovements);
    });
  });

  describe('getInventoryValuation', () => {
    it('should return inventory valuation', async () => {
      const mockItems = [
        { id: 'item-1', name: 'Product A', quantity: 100, unitCost: 25, totalValue: 2500 },
        { id: 'item-2', name: 'Product B', quantity: 50, unitCost: 30, totalValue: 1500 },
      ];

      mockDb.select.mockResolvedValue(mockItems);

      const result = await service.getInventoryValuation('tenant-123');

      expect(result.totalItems).toBe(2);
      expect(result.totalValue).toBe(4000);
      expect(result.items).toHaveLength(2);
    });
  });
});
