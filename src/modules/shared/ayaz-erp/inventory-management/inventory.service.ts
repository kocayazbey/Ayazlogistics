import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventory } from '../../../database/schema/shared/erp.schema';

@Injectable()
export class InventoryService {
  constructor(
    @InjectRepository(Inventory)
    private inventoryRepository: Repository<Inventory>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Inventory[]> {
    const query = this.inventoryRepository.createQueryBuilder('inventory')
      .where('inventory.tenantId = :tenantId', { tenantId });

    if (filters?.category) {
      query.andWhere('inventory.category = :category', { category: filters.category });
    }

    if (filters?.status) {
      query.andWhere('inventory.status = :status', { status: filters.status });
    }

    if (filters?.lowStock) {
      query.andWhere('inventory.quantity <= inventory.reorderLevel');
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Inventory> {
    return this.inventoryRepository.findOne({
      where: { id, tenantId },
      relations: ['category', 'supplier'],
    });
  }

  async create(inventoryData: Partial<Inventory>, tenantId: string): Promise<Inventory> {
    const inventory = this.inventoryRepository.create({
      ...inventoryData,
      tenantId,
      itemNumber: this.generateItemNumber(),
      status: 'active',
    });
    return this.inventoryRepository.save(inventory);
  }

  async update(id: string, inventoryData: Partial<Inventory>, tenantId: string): Promise<Inventory> {
    await this.inventoryRepository.update({ id, tenantId }, inventoryData);
    return this.findOne(id, tenantId);
  }

  async updateQuantity(id: string, quantity: number, tenantId: string): Promise<Inventory> {
    const inventory = await this.findOne(id, tenantId);
    if (!inventory) {
      throw new Error('Inventory item not found');
    }

    inventory.quantity = quantity;
    inventory.lastUpdated = new Date();
    return this.inventoryRepository.save(inventory);
  }

  async getInventoryMetrics(tenantId: string): Promise<any> {
    const inventories = await this.findAll(tenantId);
    
    const total = inventories.length;
    const inStock = inventories.filter(i => i.quantity > 0).length;
    const outOfStock = inventories.filter(i => i.quantity === 0).length;
    const lowStock = inventories.filter(i => i.quantity <= i.reorderLevel).length;

    return {
      total,
      inStock,
      outOfStock,
      lowStock,
      stockRate: total > 0 ? (inStock / total) * 100 : 0,
    };
  }

  async getLowStockItems(tenantId: string): Promise<Inventory[]> {
    return this.inventoryRepository.find({
      where: {
        tenantId,
        quantity: { $lte: this.inventoryRepository.createQueryBuilder().select('reorderLevel') },
      },
    });
  }

  async getInventoryValue(tenantId: string): Promise<any> {
    const inventories = await this.findAll(tenantId);
    
    const totalValue = inventories.reduce((sum, item) => {
      return sum + (item.quantity * item.unitCost);
    }, 0);

    const categories = {};
    for (const item of inventories) {
      if (item.category) {
        categories[item.category] = (categories[item.category] || 0) + (item.quantity * item.unitCost);
      }
    }

    return {
      totalValue,
      categories,
      averageValue: inventories.length > 0 ? totalValue / inventories.length : 0,
    };
  }

  async getInventoryTurnover(tenantId: string): Promise<any> {
    const inventories = await this.findAll(tenantId);
    
    // Calculate inventory turnover metrics
    // This would typically involve:
    // 1. Analyzing sales data
    // 2. Calculating turnover rates
    // 3. Identifying slow-moving items
    // 4. Optimizing inventory levels

    return {
      averageTurnover: 0,
      fastMoving: [],
      slowMoving: [],
      recommendations: [],
    };
  }

  async generateInventoryReport(tenantId: string, reportType: string): Promise<any> {
    const inventories = await this.findAll(tenantId);
    
    const report = {
      reportType,
      generatedAt: new Date(),
      summary: {
        totalItems: inventories.length,
        totalValue: 0,
        lowStockItems: 0,
      },
      details: inventories,
    };

    return report;
  }

  private generateItemNumber(): string {
    const timestamp = Date.now();
    return `ITEM-${timestamp}`;
  }
}
