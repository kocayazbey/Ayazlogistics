import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PutawayOrder } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class PutawayService {
  constructor(
    @InjectRepository(PutawayOrder)
    private putawayRepository: Repository<PutawayOrder>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<PutawayOrder[]> {
    const query = this.putawayRepository.createQueryBuilder('putaway')
      .where('putaway.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('putaway.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<PutawayOrder> {
    return this.putawayRepository.findOne({
      where: { id, tenantId },
      relations: ['items', 'warehouse'],
    });
  }

  async create(putawayData: Partial<PutawayOrder>, tenantId: string): Promise<PutawayOrder> {
    const putaway = this.putawayRepository.create({
      ...putawayData,
      tenantId,
      putawayNumber: this.generatePutawayNumber(),
      status: 'pending',
    });
    return this.putawayRepository.save(putaway);
  }

  private generatePutawayNumber(): string {
    const timestamp = Date.now();
    return `PUT-${timestamp}`;
  }
}