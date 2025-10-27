import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PackingOrder } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class PackingService {
  constructor(
    @InjectRepository(PackingOrder)
    private packingRepository: Repository<PackingOrder>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<PackingOrder[]> {
    const query = this.packingRepository.createQueryBuilder('packing')
      .where('packing.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('packing.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<PackingOrder> {
    return this.packingRepository.findOne({
      where: { id, tenantId },
      relations: ['items', 'warehouse'],
    });
  }

  async create(packingData: Partial<PackingOrder>, tenantId: string): Promise<PackingOrder> {
    const packing = this.packingRepository.create({
      ...packingData,
      tenantId,
      packingNumber: this.generatePackingNumber(),
      status: 'pending',
    });
    return this.packingRepository.save(packing);
  }

  private generatePackingNumber(): string {
    const timestamp = Date.now();
    return `PAK-${timestamp}`;
  }
}