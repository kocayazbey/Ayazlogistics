import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Activity } from '../../../database/schema/shared/crm.schema';

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(Activity)
    private activityRepository: Repository<Activity>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Activity[]> {
    const query = this.activityRepository.createQueryBuilder('activity')
      .where('activity.tenantId = :tenantId', { tenantId });

    if (filters?.type) {
      query.andWhere('activity.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      query.andWhere('activity.status = :status', { status: filters.status });
    }

    if (filters?.assignedTo) {
      query.andWhere('activity.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    if (filters?.dateRange) {
      query.andWhere('activity.dueDate BETWEEN :startDate AND :endDate', {
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Activity> {
    return this.activityRepository.findOne({
      where: { id, tenantId },
      relations: ['assignedTo', 'customer', 'lead'],
    });
  }

  async create(activityData: Partial<Activity>, tenantId: string): Promise<Activity> {
    const activity = this.activityRepository.create({
      ...activityData,
      tenantId,
      activityNumber: this.generateActivityNumber(),
      status: 'pending',
    });
    return this.activityRepository.save(activity);
  }

  async update(id: string, activityData: Partial<Activity>, tenantId: string): Promise<Activity> {
    await this.activityRepository.update({ id, tenantId }, activityData);
    return this.findOne(id, tenantId);
  }

  async updateStatus(id: string, status: string, tenantId: string): Promise<Activity> {
    const activity = await this.findOne(id, tenantId);
    if (!activity) {
      throw new Error('Activity not found');
    }

    activity.status = status;
    activity.statusUpdatedAt = new Date();
    return this.activityRepository.save(activity);
  }

  async completeActivity(id: string, notes: string, tenantId: string): Promise<Activity> {
    const activity = await this.findOne(id, tenantId);
    if (!activity) {
      throw new Error('Activity not found');
    }

    activity.status = 'completed';
    activity.completedAt = new Date();
    activity.notes = notes;
    return this.activityRepository.save(activity);
  }

  async getActivityMetrics(tenantId: string): Promise<any> {
    const activities = await this.findAll(tenantId);
    
    const total = activities.length;
    const pending = activities.filter(a => a.status === 'pending').length;
    const inProgress = activities.filter(a => a.status === 'in_progress').length;
    const completed = activities.filter(a => a.status === 'completed').length;
    const overdue = activities.filter(a => {
      return a.status !== 'completed' && a.dueDate < new Date();
    }).length;

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
    };
  }

  async getActivityTypes(tenantId: string): Promise<any> {
    const activities = await this.findAll(tenantId);
    
    const types = {};
    for (const activity of activities) {
      types[activity.type] = (types[activity.type] || 0) + 1;
    }

    return types;
  }

  async getUpcomingActivities(tenantId: string, days: number = 7): Promise<Activity[]> {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + days);

    return this.activityRepository.find({
      where: {
        tenantId,
        status: 'pending',
        dueDate: { $lte: endDate },
      },
      order: { dueDate: 'ASC' },
    });
  }

  async getOverdueActivities(tenantId: string): Promise<Activity[]> {
    return this.activityRepository.find({
      where: {
        tenantId,
        status: { $in: ['pending', 'in_progress'] },
        dueDate: { $lt: new Date() },
      },
      order: { dueDate: 'ASC' },
    });
  }

  private generateActivityNumber(): string {
    const timestamp = Date.now();
    return `ACT-${timestamp}`;
  }
}
