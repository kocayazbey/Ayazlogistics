import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { mobileTasks } from '../../../database/schema/mobile/tasks.schema';
import { eq, and, or, desc, count, like, gte, lte } from 'drizzle-orm';

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase
  ) {}

  async getTasksForRole(tenantId: string, role: string, filters: any) {
    this.logger.log(`Getting tasks for role: ${role} in tenant: ${tenantId}`);

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const offset = (page - 1) * limit;

    let whereConditions = [eq(mobileTasks.tenantId, tenantId)];

    // Filter by status
    if (filters.status) {
      whereConditions.push(eq(mobileTasks.status, filters.status as any));
    }

    // Filter by type
    if (filters.type) {
      whereConditions.push(eq(mobileTasks.type, filters.type as any));
    }

    // Filter by assigned user (for role-based filtering)
    if (filters.assignedTo) {
      whereConditions.push(eq(mobileTasks.assignedTo, filters.assignedTo));
    }

    // Filter by priority
    if (filters.priority) {
      whereConditions.push(eq(mobileTasks.priority, filters.priority as any));
    }

    const [tasksData, totalCount] = await Promise.all([
      this.db
        .select()
        .from(mobileTasks)
        .where(and(...whereConditions))
        .orderBy(desc(mobileTasks.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count() })
        .from(mobileTasks)
        .where(and(...whereConditions))
    ]);

    return {
      data: tasksData,
      pagination: {
        page,
        limit,
        total: totalCount[0]?.count || 0,
        totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
      }
    };
  }

  async createTask(taskData: any) {
    this.logger.log(`Creating task: ${taskData.title}`);

    const [newTask] = await this.db
      .insert(mobileTasks)
      .values({
        tenantId: taskData.tenantId,
        title: taskData.title,
        description: taskData.description,
        type: taskData.type,
        status: 'pending',
        priority: taskData.priority || 'medium',
        assignedTo: taskData.assignedTo,
        location: taskData.location,
        dueDate: taskData.dueDate ? new Date(taskData.dueDate) : null,
        notes: taskData.notes,
        metadata: taskData.metadata,
      })
      .returning();

    return newTask;
  }

  async updateTask(taskId: string, updateData: any, tenantId: string) {
    this.logger.log(`Updating task: ${taskId}`);

    const [updatedTask] = await this.db
      .update(mobileTasks)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(
        eq(mobileTasks.id, taskId),
        eq(mobileTasks.tenantId, tenantId)
      ))
      .returning();

    if (!updatedTask) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return updatedTask;
  }

  async updateTaskStatus(taskId: string, status: string, notes?: string, tenantId?: string) {
    this.logger.log(`Updating task status: ${taskId} -> ${status}`);

    const updateData: any = {
      status: status as any,
      updatedAt: new Date(),
    };

    if (status === 'in_progress' && !notes) {
      updateData.startedAt = new Date();
    }

    if (status === 'completed') {
      updateData.completedAt = new Date();
    }

    if (notes) {
      updateData.notes = notes;
    }

    const [updatedTask] = await this.db
      .update(mobileTasks)
      .set(updateData)
      .where(and(
        eq(mobileTasks.id, taskId),
        tenantId ? eq(mobileTasks.tenantId, tenantId) : undefined
      ))
      .returning();

    if (!updatedTask) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return updatedTask;
  }

  async getTaskDetails(taskId: string, tenantId: string) {
    this.logger.log(`Getting task details: ${taskId}`);

    const [task] = await this.db
      .select()
      .from(mobileTasks)
      .where(and(
        eq(mobileTasks.id, taskId),
        eq(mobileTasks.tenantId, tenantId)
      ))
      .limit(1);

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return task;
  }
}
