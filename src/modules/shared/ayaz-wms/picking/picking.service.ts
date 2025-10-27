import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PickingOrder } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class PickingService {
  constructor(
    @InjectRepository(PickingOrder)
    private pickingRepository: Repository<PickingOrder>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<PickingOrder[]> {
    const query = this.pickingRepository.createQueryBuilder('picking')
      .where('picking.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('picking.status = :status', { status: filters.status });
    }

    if (filters?.warehouseId) {
      query.andWhere('picking.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<PickingOrder> {
    return this.pickingRepository.findOne({
      where: { id, tenantId },
      relations: ['lineItems', 'warehouse'],
    });
  }

  async create(pickingData: Partial<PickingOrder>, tenantId: string): Promise<PickingOrder> {
    const picking = this.pickingRepository.create({
      ...pickingData,
      tenantId,
      pickingNumber: this.generatePickingNumber(),
      status: 'pending',
    });
    return this.pickingRepository.save(picking);
  }

  async update(id: string, pickingData: Partial<PickingOrder>, tenantId: string): Promise<PickingOrder> {
    await this.pickingRepository.update({ id, tenantId }, pickingData);
    return this.findOne(id, tenantId);
  }

  async startPicking(id: string, tenantId: string): Promise<PickingOrder> {
    const picking = await this.findOne(id, tenantId);
    if (!picking) {
      throw new Error('Picking order not found');
    }

    picking.status = 'in_progress';
    picking.startedAt = new Date();
    return this.pickingRepository.save(picking);
  }

  async completePicking(id: string, tenantId: string): Promise<PickingOrder> {
    const picking = await this.findOne(id, tenantId);
    if (!picking) {
      throw new Error('Picking order not found');
    }

    picking.status = 'completed';
    picking.completedAt = new Date();
    return this.pickingRepository.save(picking);
  }

  async optimizePickingRoute(pickingId: string, tenantId: string): Promise<any> {
    const picking = await this.findOne(pickingId, tenantId);
    if (!picking) {
      throw new Error('Picking order not found');
    }

    // Implement picking route optimization logic
    // This would typically involve:
    // 1. Getting all items to be picked
    // 2. Calculating optimal route through warehouse
    // 3. Updating picking order with optimized sequence

    return {
      optimizedRoute: [],
      estimatedTime: 0,
      totalDistance: 0,
    };
  }

  private generatePickingNumber(): string {
    const timestamp = Date.now();
    return `PIC-${timestamp}`;
  }
}