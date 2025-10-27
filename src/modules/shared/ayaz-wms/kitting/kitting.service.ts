import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Kitting } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class KittingService {
  constructor(
    @InjectRepository(Kitting)
    private kittingRepository: Repository<Kitting>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Kitting[]> {
    const query = this.kittingRepository.createQueryBuilder('kitting')
      .where('kitting.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('kitting.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Kitting> {
    return this.kittingRepository.findOne({
      where: { id, tenantId },
      relations: ['kitItems', 'order'],
    });
  }

  async create(kittingData: Partial<Kitting>, tenantId: string): Promise<Kitting> {
    const kitting = this.kittingRepository.create({
      ...kittingData,
      tenantId,
      kittingNumber: this.generateKittingNumber(),
      status: 'pending',
    });
    return this.kittingRepository.save(kitting);
  }

  async update(id: string, kittingData: Partial<Kitting>, tenantId: string): Promise<Kitting> {
    await this.kittingRepository.update({ id, tenantId }, kittingData);
    return this.findOne(id, tenantId);
  }

  async startKitting(id: string, tenantId: string): Promise<Kitting> {
    const kitting = await this.findOne(id, tenantId);
    if (!kitting) {
      throw new Error('Kitting not found');
    }

    kitting.status = 'in_progress';
    kitting.startedAt = new Date();
    return this.kittingRepository.save(kitting);
  }

  async completeKitting(id: string, tenantId: string): Promise<Kitting> {
    const kitting = await this.findOne(id, tenantId);
    if (!kitting) {
      throw new Error('Kitting not found');
    }

    kitting.status = 'completed';
    kitting.completedAt = new Date();
    return this.kittingRepository.save(kitting);
  }

  async validateKit(kittingId: string, tenantId: string): Promise<any> {
    const kitting = await this.findOne(kittingId, tenantId);
    if (!kitting) {
      throw new Error('Kitting not found');
    }

    // Implement kit validation logic
    // This would typically involve:
    // 1. Checking all required items are present
    // 2. Verifying quantities match requirements
    // 3. Validating item conditions
    // 4. Confirming kit completeness

    return {
      isValid: true,
      missingItems: [],
      excessItems: [],
      validationDate: new Date(),
    };
  }

  async getKittingStats(tenantId: string): Promise<any> {
    const kittings = await this.findAll(tenantId);
    
    const total = kittings.length;
    const completed = kittings.filter(k => k.status === 'completed').length;
    const inProgress = kittings.filter(k => k.status === 'in_progress').length;
    const pending = kittings.filter(k => k.status === 'pending').length;

    return {
      total,
      completed,
      inProgress,
      pending,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  private generateKittingNumber(): string {
    const timestamp = Date.now();
    return `KIT-${timestamp}`;
  }
}