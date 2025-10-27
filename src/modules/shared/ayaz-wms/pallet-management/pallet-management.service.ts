import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Pallet } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class PalletManagementService {
  constructor(
    @InjectRepository(Pallet)
    private palletRepository: Repository<Pallet>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Pallet[]> {
    const query = this.palletRepository.createQueryBuilder('pallet')
      .where('pallet.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('pallet.status = :status', { status: filters.status });
    }

    if (filters?.warehouseId) {
      query.andWhere('pallet.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Pallet> {
    return this.palletRepository.findOne({
      where: { id, tenantId },
      relations: ['items', 'warehouse', 'location'],
    });
  }

  async create(palletData: Partial<Pallet>, tenantId: string): Promise<Pallet> {
    const pallet = this.palletRepository.create({
      ...palletData,
      tenantId,
      palletNumber: this.generatePalletNumber(),
      status: 'available',
    });
    return this.palletRepository.save(pallet);
  }

  async update(id: string, palletData: Partial<Pallet>, tenantId: string): Promise<Pallet> {
    await this.palletRepository.update({ id, tenantId }, palletData);
    return this.findOne(id, tenantId);
  }

  async assignPallet(palletId: string, orderId: string, tenantId: string): Promise<Pallet> {
    const pallet = await this.findOne(palletId, tenantId);
    if (!pallet) {
      throw new Error('Pallet not found');
    }

    if (pallet.status !== 'available') {
      throw new Error('Pallet is not available');
    }

    pallet.status = 'assigned';
    pallet.orderId = orderId;
    pallet.assignedAt = new Date();
    return this.palletRepository.save(pallet);
  }

  async releasePallet(palletId: string, tenantId: string): Promise<Pallet> {
    const pallet = await this.findOne(palletId, tenantId);
    if (!pallet) {
      throw new Error('Pallet not found');
    }

    pallet.status = 'available';
    pallet.orderId = null;
    pallet.releasedAt = new Date();
    return this.palletRepository.save(pallet);
  }

  async getPalletUtilization(warehouseId: string, tenantId: string): Promise<any> {
    const pallets = await this.palletRepository.find({
      where: { warehouseId, tenantId },
    });

    const total = pallets.length;
    const assigned = pallets.filter(p => p.status === 'assigned').length;
    const available = pallets.filter(p => p.status === 'available').length;
    const utilizationRate = total > 0 ? (assigned / total) * 100 : 0;

    return {
      total,
      assigned,
      available,
      utilizationRate,
    };
  }

  async optimizePalletLayout(warehouseId: string, tenantId: string): Promise<any> {
    // Implement pallet layout optimization logic
    // This would typically involve:
    // 1. Analyzing pallet usage patterns
    // 2. Optimizing pallet placement
    // 3. Minimizing movement distances
    // 4. Maximizing space utilization

    return {
      optimizedLayout: [],
      spaceUtilization: 0,
      movementReduction: 0,
      efficiencyGains: 0,
    };
  }

  private generatePalletNumber(): string {
    const timestamp = Date.now();
    return `PAL-${timestamp}`;
  }
}