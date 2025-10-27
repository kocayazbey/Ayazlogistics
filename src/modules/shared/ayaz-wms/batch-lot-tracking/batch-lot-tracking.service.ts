import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BatchLot } from '../../../database/schema/shared/wms.schema';

@Injectable()
export class BatchLotTrackingService {
  constructor(
    @InjectRepository(BatchLot)
    private batchLotRepository: Repository<BatchLot>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<BatchLot[]> {
    const query = this.batchLotRepository.createQueryBuilder('batchLot')
      .where('batchLot.tenantId = :tenantId', { tenantId });

    if (filters?.itemId) {
      query.andWhere('batchLot.itemId = :itemId', { itemId: filters.itemId });
    }

    if (filters?.status) {
      query.andWhere('batchLot.status = :status', { status: filters.status });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<BatchLot> {
    return this.batchLotRepository.findOne({
      where: { id, tenantId },
      relations: ['item', 'location'],
    });
  }

  async create(batchLotData: Partial<BatchLot>, tenantId: string): Promise<BatchLot> {
    const batchLot = this.batchLotRepository.create({
      ...batchLotData,
      tenantId,
      batchNumber: this.generateBatchNumber(),
      lotNumber: this.generateLotNumber(),
    });
    return this.batchLotRepository.save(batchLot);
  }

  async update(id: string, batchLotData: Partial<BatchLot>, tenantId: string): Promise<BatchLot> {
    await this.batchLotRepository.update({ id, tenantId }, batchLotData);
    return this.findOne(id, tenantId);
  }

  async trackMovement(batchLotId: string, fromLocation: string, toLocation: string, tenantId: string): Promise<BatchLot> {
    const batchLot = await this.findOne(batchLotId, tenantId);
    if (!batchLot) {
      throw new Error('Batch/Lot not found');
    }

    // Update location
    batchLot.currentLocation = toLocation;
    batchLot.lastMovedAt = new Date();

    // Add to movement history
    if (!batchLot.movementHistory) {
      batchLot.movementHistory = [];
    }
    batchLot.movementHistory.push({
      from: fromLocation,
      to: toLocation,
      movedAt: new Date(),
    });

    return this.batchLotRepository.save(batchLot);
  }

  async getExpiringBatches(days: number, tenantId: string): Promise<BatchLot[]> {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + days);

    return this.batchLotRepository.find({
      where: {
        tenantId,
        expiryDate: { $lte: expiryDate },
        status: 'active',
      },
    });
  }

  async getBatchTraceability(batchNumber: string, tenantId: string): Promise<any> {
    const batchLot = await this.batchLotRepository.findOne({
      where: { batchNumber, tenantId },
    });

    if (!batchLot) {
      throw new Error('Batch not found');
    }

    return {
      batchNumber: batchLot.batchNumber,
      lotNumber: batchLot.lotNumber,
      itemId: batchLot.itemId,
      currentLocation: batchLot.currentLocation,
      status: batchLot.status,
      movementHistory: batchLot.movementHistory,
      createdAt: batchLot.createdAt,
      expiryDate: batchLot.expiryDate,
    };
  }

  private generateBatchNumber(): string {
    const timestamp = Date.now();
    return `BATCH-${timestamp}`;
  }

  private generateLotNumber(): string {
    const timestamp = Date.now();
    return `LOT-${timestamp}`;
  }
}