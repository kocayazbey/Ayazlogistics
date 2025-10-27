import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Consolidation } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class ConsolidationService {
  constructor(
    @InjectRepository(Consolidation)
    private consolidationRepository: Repository<Consolidation>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Consolidation[]> {
    const query = this.consolidationRepository.createQueryBuilder('consolidation')
      .where('consolidation.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('consolidation.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Consolidation> {
    return this.consolidationRepository.findOne({
      where: { id, tenantId },
      relations: ['orders', 'shipment'],
    });
  }

  async create(consolidationData: Partial<Consolidation>, tenantId: string): Promise<Consolidation> {
    const consolidation = this.consolidationRepository.create({
      ...consolidationData,
      tenantId,
      consolidationNumber: this.generateConsolidationNumber(),
      status: 'pending',
    });
    return this.consolidationRepository.save(consolidation);
  }

  async update(id: string, consolidationData: Partial<Consolidation>, tenantId: string): Promise<Consolidation> {
    await this.consolidationRepository.update({ id, tenantId }, consolidationData);
    return this.findOne(id, tenantId);
  }

  async optimizeConsolidation(orders: any[], tenantId: string): Promise<any> {
    // Implement consolidation optimization logic
    // This would typically involve:
    // 1. Grouping orders by destination
    // 2. Optimizing shipment consolidation
    // 3. Calculating cost savings
    // 4. Determining optimal shipping methods

    const optimizedConsolidation = {
      consolidatedShipments: [],
      totalSavings: 0,
      averageTransitTime: 0,
      consolidationRate: 0,
    };

    return optimizedConsolidation;
  }

  async calculateSavings(consolidationId: string, tenantId: string): Promise<any> {
    const consolidation = await this.findOne(consolidationId, tenantId);
    if (!consolidation) {
      throw new Error('Consolidation not found');
    }

    // Calculate cost savings from consolidation
    const individualShippingCost = 0; // Calculate individual shipping costs
    const consolidatedShippingCost = 0; // Calculate consolidated shipping cost
    const savings = individualShippingCost - consolidatedShippingCost;

    return {
      individualShippingCost,
      consolidatedShippingCost,
      savings,
      savingsPercentage: individualShippingCost > 0 ? (savings / individualShippingCost) * 100 : 0,
    };
  }

  private generateConsolidationNumber(): string {
    const timestamp = Date.now();
    return `CONS-${timestamp}`;
  }
}