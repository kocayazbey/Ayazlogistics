import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LoadBoard } from '../../../database/schema/shared/tms.schema';

@Injectable()
export class LoadBoardService {
  constructor(
    @InjectRepository(LoadBoard)
    private loadBoardRepository: Repository<LoadBoard>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<LoadBoard[]> {
    const query = this.loadBoardRepository.createQueryBuilder('loadBoard')
      .where('loadBoard.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('loadBoard.status = :status', { status: filters.status });
    }

    if (filters?.origin) {
      query.andWhere('loadBoard.origin = :origin', { origin: filters.origin });
    }

    if (filters?.destination) {
      query.andWhere('loadBoard.destination = :destination', { destination: filters.destination });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<LoadBoard> {
    return this.loadBoardRepository.findOne({
      where: { id, tenantId },
      relations: ['carrier', 'shipper'],
    });
  }

  async create(loadBoardData: Partial<LoadBoard>, tenantId: string): Promise<LoadBoard> {
    const loadBoard = this.loadBoardRepository.create({
      ...loadBoardData,
      tenantId,
      loadNumber: this.generateLoadNumber(),
      status: 'available',
    });
    return this.loadBoardRepository.save(loadBoard);
  }

  async update(id: string, loadBoardData: Partial<LoadBoard>, tenantId: string): Promise<LoadBoard> {
    await this.loadBoardRepository.update({ id, tenantId }, loadBoardData);
    return this.findOne(id, tenantId);
  }

  async matchLoads(loadId: string, carrierId: string, tenantId: string): Promise<LoadBoard> {
    const loadBoard = await this.findOne(loadId, tenantId);
    if (!loadBoard) {
      throw new Error('Load not found');
    }

    loadBoard.carrierId = carrierId;
    loadBoard.status = 'matched';
    loadBoard.matchedAt = new Date();
    return this.loadBoardRepository.save(loadBoard);
  }

  async getAvailableLoads(tenantId: string, filters?: any): Promise<LoadBoard[]> {
    const query = this.loadBoardRepository.createQueryBuilder('loadBoard')
      .where('loadBoard.tenantId = :tenantId', { tenantId })
      .andWhere('loadBoard.status = :status', { status: 'available' });

    if (filters?.origin) {
      query.andWhere('loadBoard.origin = :origin', { origin: filters.origin });
    }

    if (filters?.destination) {
      query.andWhere('loadBoard.destination = :destination', { destination: filters.destination });
    }

    if (filters?.weight) {
      query.andWhere('loadBoard.weight <= :weight', { weight: filters.weight });
    }

    return query.getMany();
  }

  async getLoadMetrics(tenantId: string): Promise<any> {
    const loads = await this.findAll(tenantId);
    
    const total = loads.length;
    const available = loads.filter(l => l.status === 'available').length;
    const matched = loads.filter(l => l.status === 'matched').length;
    const inTransit = loads.filter(l => l.status === 'in_transit').length;
    const delivered = loads.filter(l => l.status === 'delivered').length;

    return {
      total,
      available,
      matched,
      inTransit,
      delivered,
      matchRate: total > 0 ? (matched / total) * 100 : 0,
    };
  }

  async optimizeLoadMatching(tenantId: string): Promise<any> {
    // Implement load matching optimization logic
    // This would typically involve:
    // 1. Analyzing available loads and carriers
    // 2. Matching based on location, capacity, and preferences
    // 3. Optimizing for cost and efficiency
    // 4. Generating match recommendations

    return {
      optimizedMatches: [],
      totalSavings: 0,
      matchEfficiency: 0,
      recommendations: [],
    };
  }

  private generateLoadNumber(): string {
    const timestamp = Date.now();
    return `LOAD-${timestamp}`;
  }
}