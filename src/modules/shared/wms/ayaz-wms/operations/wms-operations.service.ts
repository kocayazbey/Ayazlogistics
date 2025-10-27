import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WmsOperation } from './entities/wms-operation.entity';
import { CreateOperationDto } from './dto/create-operation.dto';
import { UpdateOperationDto } from './dto/update-operation.dto';
import { OperationStatusDto } from './dto/operation-status.dto';
import { OperationActivity } from './entities/operation-activity.entity';

@Injectable()
export class WmsOperationsService {
  constructor(
    @InjectRepository(WmsOperation)
    private readonly operationRepository: Repository<WmsOperation>,
    @InjectRepository(OperationActivity)
    private readonly activityRepository: Repository<OperationActivity>
  ) {}

  async getOperations(filters: {
    tenantId: string;
    warehouseId?: string;
    status?: string;
    type?: string;
    page: number;
    limit: number;
  }) {
    const query = this.operationRepository
      .createQueryBuilder('operation')
      .where('operation.tenantId = :tenantId', { tenantId: filters.tenantId })
      .leftJoinAndSelect('operation.warehouse', 'warehouse')
      .leftJoinAndSelect('operation.assignedUser', 'user')
      .orderBy('operation.createdAt', 'DESC');

    if (filters.warehouseId) {
      query.andWhere('operation.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    if (filters.status) {
      query.andWhere('operation.status = :status', { status: filters.status });
    }

    if (filters.type) {
      query.andWhere('operation.type = :type', { type: filters.type });
    }

    const [operations, total] = await query
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return {
      operations,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    };
  }

  async getOperationsStats(tenantId: string, warehouseId?: string) {
    const query = this.operationRepository
      .createQueryBuilder('operation')
      .where('operation.tenantId = :tenantId', { tenantId });

    if (warehouseId) {
      query.andWhere('operation.warehouseId = :warehouseId', { warehouseId });
    }

    const stats = await query
      .select([
        'operation.status',
        'operation.type',
        'COUNT(*) as count',
        'AVG(operation.duration) as avgDuration',
        'AVG(operation.efficiency) as avgEfficiency'
      ])
      .groupBy('operation.status, operation.type')
      .getRawMany();

    const totalOperations = await query.getCount();
    const activeOperations = await query
      .andWhere('operation.status IN (:...statuses)', { statuses: ['pending', 'in_progress'] })
      .getCount();

    return {
      totalOperations,
      activeOperations,
      completedOperations: totalOperations - activeOperations,
      stats: stats.reduce((acc, stat) => {
        const key = `${stat.operation_status}_${stat.operation_type}`;
        acc[key] = {
          count: parseInt(stat.count),
          avgDuration: parseFloat(stat.avgDuration) || 0,
          avgEfficiency: parseFloat(stat.avgEfficiency) || 0
        };
        return acc;
      }, {})
    };
  }

  async getOperation(id: string, tenantId: string) {
    const operation = await this.operationRepository.findOne({
      where: { id, tenantId },
      relations: ['warehouse', 'assignedUser', 'activities']
    });

    if (!operation) {
      throw new NotFoundException('Operation not found');
    }

    return operation;
  }

  async createOperation(createOperationDto: CreateOperationDto, userId: string, tenantId: string) {
    const operation = this.operationRepository.create({
      ...createOperationDto,
      tenantId,
      createdBy: userId,
      status: 'pending'
    });

    const savedOperation = await this.operationRepository.save(operation);

    // Create initial activity
    await this.createActivity(savedOperation.id, {
      type: 'created',
      description: 'Operation created',
      userId,
      metadata: { operationData: createOperationDto }
    });

    return savedOperation;
  }

  async updateOperation(id: string, updateOperationDto: UpdateOperationDto, userId: string, tenantId: string) {
    const operation = await this.getOperation(id, tenantId);

    if (operation.status === 'completed') {
      throw new BadRequestException('Cannot update completed operation');
    }

    Object.assign(operation, updateOperationDto);
    operation.updatedBy = userId;
    operation.updatedAt = new Date();

    const savedOperation = await this.operationRepository.save(operation);

    await this.createActivity(id, {
      type: 'updated',
      description: 'Operation updated',
      userId,
      metadata: { updateData: updateOperationDto }
    });

    return savedOperation;
  }

  async startOperation(id: string, userId: string, tenantId: string) {
    const operation = await this.getOperation(id, tenantId);

    if (operation.status !== 'pending') {
      throw new BadRequestException('Operation can only be started from pending status');
    }

    operation.status = 'in_progress';
    operation.startedAt = new Date();
    operation.startedBy = userId;

    const savedOperation = await this.operationRepository.save(operation);

    await this.createActivity(id, {
      type: 'started',
      description: 'Operation started',
      userId
    });

    return savedOperation;
  }

  async completeOperation(id: string, operationStatusDto: OperationStatusDto, userId: string, tenantId: string) {
    const operation = await this.getOperation(id, tenantId);

    if (operation.status !== 'in_progress') {
      throw new BadRequestException('Operation must be in progress to complete');
    }

    operation.status = 'completed';
    operation.completedAt = new Date();
    operation.completedBy = userId;
    operation.duration = operationStatusDto.duration;
    operation.efficiency = operationStatusDto.efficiency;
    operation.notes = operationStatusDto.notes;

    const savedOperation = await this.operationRepository.save(operation);

    await this.createActivity(id, {
      type: 'completed',
      description: 'Operation completed',
      userId,
      metadata: { completionData: operationStatusDto }
    });

    return savedOperation;
  }

  async pauseOperation(id: string, userId: string, tenantId: string) {
    const operation = await this.getOperation(id, tenantId);

    if (operation.status !== 'in_progress') {
      throw new BadRequestException('Operation must be in progress to pause');
    }

    operation.status = 'paused';
    operation.pausedAt = new Date();
    operation.pausedBy = userId;

    const savedOperation = await this.operationRepository.save(operation);

    await this.createActivity(id, {
      type: 'paused',
      description: 'Operation paused',
      userId
    });

    return savedOperation;
  }

  async resumeOperation(id: string, userId: string, tenantId: string) {
    const operation = await this.getOperation(id, tenantId);

    if (operation.status !== 'paused') {
      throw new BadRequestException('Operation must be paused to resume');
    }

    operation.status = 'in_progress';
    operation.resumedAt = new Date();
    operation.resumedBy = userId;

    const savedOperation = await this.operationRepository.save(operation);

    await this.createActivity(id, {
      type: 'resumed',
      description: 'Operation resumed',
      userId
    });

    return savedOperation;
  }

  async getOperationActivities(id: string, tenantId: string) {
    await this.getOperation(id, tenantId); // Verify operation exists

    return this.activityRepository.find({
      where: { operationId: id },
      order: { createdAt: 'DESC' },
      relations: ['user']
    });
  }

  async getPerformanceMetrics(tenantId: string, filters: {
    warehouseId?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const query = this.operationRepository
      .createQueryBuilder('operation')
      .where('operation.tenantId = :tenantId', { tenantId })
      .andWhere('operation.status = :status', { status: 'completed' });

    if (filters.warehouseId) {
      query.andWhere('operation.warehouseId = :warehouseId', { warehouseId: filters.warehouseId });
    }

    if (filters.startDate) {
      query.andWhere('operation.completedAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('operation.completedAt <= :endDate', { endDate: filters.endDate });
    }

    const metrics = await query
      .select([
        'AVG(operation.duration) as avgDuration',
        'AVG(operation.efficiency) as avgEfficiency',
        'COUNT(*) as totalOperations',
        'operation.type'
      ])
      .groupBy('operation.type')
      .getRawMany();

    const totalCompleted = await query.getCount();
    const avgResponseTime = await query
      .select('AVG(operation.duration)')
      .getRawOne();

    return {
      totalCompleted,
      avgResponseTime: parseFloat(avgResponseTime.avg) || 0,
      metrics: metrics.map(metric => ({
        type: metric.operation_type,
        avgDuration: parseFloat(metric.avgDuration) || 0,
        avgEfficiency: parseFloat(metric.avgEfficiency) || 0,
        totalOperations: parseInt(metric.totalOperations)
      }))
    };
  }

  private async createActivity(operationId: string, activityData: {
    type: string;
    description: string;
    userId: string;
    metadata?: any;
  }) {
    const activity = this.activityRepository.create({
      operationId,
      type: activityData.type,
      description: activityData.description,
      userId: activityData.userId,
      metadata: activityData.metadata
    });

    return this.activityRepository.save(activity);
  }
}
