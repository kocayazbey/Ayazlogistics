import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReceivingOrder } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class ReceivingService {
  constructor(
    @InjectRepository(ReceivingOrder)
    private receivingRepository: Repository<ReceivingOrder>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<ReceivingOrder[]> {
    const query = this.receivingRepository.createQueryBuilder('receiving')
      .where('receiving.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('receiving.status = :status', { status: filters.status });
    }

    if (filters?.warehouseId) {
      query.andWhere('receiving.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<ReceivingOrder> {
    return this.receivingRepository.findOne({
      where: { id, tenantId },
      relations: ['lineItems', 'warehouse'],
    });
  }

  async create(receivingData: Partial<ReceivingOrder>, tenantId: string): Promise<ReceivingOrder> {
    const receiving = this.receivingRepository.create({
      ...receivingData,
      tenantId,
      receivingNumber: this.generateReceivingNumber(),
      status: 'pending',
    });
    return this.receivingRepository.save(receiving);
  }

  async update(id: string, receivingData: Partial<ReceivingOrder>, tenantId: string): Promise<ReceivingOrder> {
    await this.receivingRepository.update({ id, tenantId }, receivingData);
    return this.findOne(id, tenantId);
  }

  async startReceiving(id: string, tenantId: string): Promise<ReceivingOrder> {
    const receiving = await this.findOne(id, tenantId);
    if (!receiving) {
      throw new Error('Receiving order not found');
    }

    receiving.status = 'in_progress';
    receiving.startedAt = new Date();
    return this.receivingRepository.save(receiving);
  }

  async completeReceiving(id: string, tenantId: string): Promise<ReceivingOrder> {
    const receiving = await this.findOne(id, tenantId);
    if (!receiving) {
      throw new Error('Receiving order not found');
    }

    receiving.status = 'completed';
    receiving.completedAt = new Date();
    return this.receivingRepository.save(receiving);
  }

  private generateReceivingNumber(): string {
    const timestamp = Date.now();
    return `RCV-${timestamp}`;
  }
}