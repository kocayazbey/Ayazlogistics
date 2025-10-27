import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Warehouse } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class WarehouseService {
  constructor(
    @InjectRepository(Warehouse)
    private warehouseRepository: Repository<Warehouse>,
  ) {}

  async findAll(tenantId: string): Promise<Warehouse[]> {
    return this.warehouseRepository.find({
      where: { tenantId },
      relations: ['locations'],
    });
  }

  async findOne(id: string, tenantId: string): Promise<Warehouse> {
    return this.warehouseRepository.findOne({
      where: { id, tenantId },
      relations: ['locations'],
    });
  }

  async create(warehouseData: Partial<Warehouse>, tenantId: string): Promise<Warehouse> {
    const warehouse = this.warehouseRepository.create({
      ...warehouseData,
      tenantId,
    });
    return this.warehouseRepository.save(warehouse);
  }

  async update(id: string, warehouseData: Partial<Warehouse>, tenantId: string): Promise<Warehouse> {
    await this.warehouseRepository.update({ id, tenantId }, warehouseData);
    return this.findOne(id, tenantId);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.warehouseRepository.delete({ id, tenantId });
  }

  async getWarehouseStats(warehouseId: string, tenantId: string) {
    const warehouse = await this.findOne(warehouseId, tenantId);
    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    return {
      totalLocations: warehouse.locations?.length || 0,
      occupiedLocations: warehouse.locations?.filter(loc => loc.isOccupied).length || 0,
      availableLocations: warehouse.locations?.filter(loc => !loc.isOccupied).length || 0,
      utilizationRate: warehouse.locations?.length > 0 
        ? (warehouse.locations.filter(loc => loc.isOccupied).length / warehouse.locations.length) * 100 
        : 0,
    };
  }
}