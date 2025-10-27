import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CycleCount } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class CycleCountingService {
  constructor(
    @InjectRepository(CycleCount)
    private cycleCountRepository: Repository<CycleCount>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<CycleCount[]> {
    const query = this.cycleCountRepository.createQueryBuilder('cycleCount')
      .where('cycleCount.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('cycleCount.status = :status', { status: filters.status });
    }

    if (filters?.warehouseId) {
      query.andWhere('cycleCount.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<CycleCount> {
    return this.cycleCountRepository.findOne({
      where: { id, tenantId },
      relations: ['items', 'warehouse'],
    });
  }

  async create(cycleCountData: Partial<CycleCount>, tenantId: string): Promise<CycleCount> {
    const cycleCount = this.cycleCountRepository.create({
      ...cycleCountData,
      tenantId,
      countNumber: this.generateCountNumber(),
      status: 'pending',
    });
    return this.cycleCountRepository.save(cycleCount);
  }

  async update(id: string, cycleCountData: Partial<CycleCount>, tenantId: string): Promise<CycleCount> {
    await this.cycleCountRepository.update({ id, tenantId }, cycleCountData);
    return this.findOne(id, tenantId);
  }

  async startCount(id: string, tenantId: string): Promise<CycleCount> {
    const cycleCount = await this.findOne(id, tenantId);
    if (!cycleCount) {
      throw new Error('Cycle count not found');
    }

    cycleCount.status = 'in_progress';
    cycleCount.startedAt = new Date();
    return this.cycleCountRepository.save(cycleCount);
  }

  async completeCount(id: string, tenantId: string): Promise<CycleCount> {
    const cycleCount = await this.findOne(id, tenantId);
    if (!cycleCount) {
      throw new Error('Cycle count not found');
    }

    cycleCount.status = 'completed';
    cycleCount.completedAt = new Date();
    return this.cycleCountRepository.save(cycleCount);
  }

  async generateABCClassification(warehouseId: string, tenantId: string): Promise<any> {
    // Implement ABC analysis logic
    // This would typically involve:
    // 1. Getting all items in warehouse
    // 2. Calculating usage value for each item
    // 3. Classifying items as A, B, or C based on Pareto principle

    return {
      aItems: [],
      bItems: [],
      cItems: [],
      classificationDate: new Date(),
    };
  }

  private generateCountNumber(): string {
    const timestamp = Date.now();
    return `CC-${timestamp}`;
  }
}