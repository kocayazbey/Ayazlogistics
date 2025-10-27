import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';

/**
 * Forklift İşlemleri Servisi
 * RT (Reach Truck) ve TT (Turret Truck) operasyonları
 * Axata WMS'te var, AyazWMS'te eksik
 */

interface ForkliftTask {
  taskId: string;
  taskType: 'putaway' | 'retrieval' | 'transfer' | 'replenishment';
  forkliftType: 'RT' | 'TT' | 'standard' | 'narrow_aisle';
  fromLocation: string;
  toLocation: string;
  palletId: string;
  productInfo: {
    sku: string;
    quantity: number;
    weight: number;
  };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  assignedTo: string | null;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'blocked';
  createdAt: Date;
  estimatedDuration: number;
}

@Injectable()
export class ForkliftService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly wsGateway: WebSocketGateway,
  ) {}

  /**
   * RT İşlemleri (Reach Truck)
   * High-rack storage operations
   */
  async createRTTask(data: {
    warehouseId: string;
    taskType: 'putaway' | 'retrieval';
    palletId: string;
    fromLocation: string;
    toLocation: string;
    height: number;
    weight: number;
  }, userId: string) {
    // Validate height restrictions for RT
    if (data.height > 12) {
      throw new BadRequestException('RT cannot handle heights above 12m. Use TT instead.');
    }

    // Validate weight restrictions
    if (data.weight > 2500) {
      throw new BadRequestException('RT max weight is 2500kg');
    }

    const taskId = `RT-${Date.now()}`;

    const task: ForkliftTask = {
      taskId,
      taskType: data.taskType,
      forkliftType: 'RT',
      fromLocation: data.fromLocation,
      toLocation: data.toLocation,
      palletId: data.palletId,
      productInfo: {
        sku: 'SKU-TBD',
        quantity: 0,
        weight: data.weight,
      },
      priority: data.height > 8 ? 'high' : 'normal',
      assignedTo: null,
      status: 'pending',
      createdAt: new Date(),
      estimatedDuration: this.calculateRTDuration(data.height),
    };

    await this.eventBus.emit('forklift.task.created', {
      taskId,
      forkliftType: 'RT',
      warehouseId: data.warehouseId,
    });

    this.wsGateway.sendToRoom(`warehouse:${data.warehouseId}`, 'forklift:task', task);

    return task;
  }

  /**
   * RT Toplama
   * RT picking operation
   */
  async performRTPicking(data: {
    taskId: string;
    locationId: string;
    palletId: string;
    actualHeight: number;
    warehouseId: string;
  }, operatorId: string) {
    const startTime = Date.now();

    // Validate RT operation
    if (data.actualHeight > 12) {
      throw new BadRequestException('Location too high for RT. Switch to TT.');
    }

    await this.eventBus.emit('forklift.rt.picking.started', {
      taskId: data.taskId,
      operatorId,
      warehouseId: data.warehouseId,
    });

    // Simulate picking operation
    const duration = this.calculateRTDuration(data.actualHeight);

    return {
      taskId: data.taskId,
      status: 'completed',
      palletId: data.palletId,
      operatorId,
      actualHeight: data.actualHeight,
      duration,
      completedAt: new Date(),
    };
  }

  /**
   * TT İşlemleri (Turret Truck)
   * Very high rack operations
   */
  async createTTTask(data: {
    warehouseId: string;
    taskType: 'putaway' | 'retrieval';
    palletId: string;
    fromLocation: string;
    toLocation: string;
    height: number;
    aisleId: string;
  }, userId: string) {
    // TT can handle very high racks
    if (data.height > 18) {
      throw new BadRequestException('Height exceeds maximum TT capacity (18m)');
    }

    // TT requires specific aisle assignment
    if (!data.aisleId) {
      throw new BadRequestException('Aisle ID is required for TT operations');
    }

    const taskId = `TT-${Date.now()}`;

    const task: ForkliftTask = {
      taskId,
      taskType: data.taskType,
      forkliftType: 'TT',
      fromLocation: data.fromLocation,
      toLocation: data.toLocation,
      palletId: data.palletId,
      productInfo: {
        sku: 'SKU-TBD',
        quantity: 0,
        weight: 0,
      },
      priority: 'normal',
      assignedTo: null,
      status: 'pending',
      createdAt: new Date(),
      estimatedDuration: this.calculateTTDuration(data.height),
    };

    await this.eventBus.emit('forklift.task.created', {
      taskId,
      forkliftType: 'TT',
      aisleId: data.aisleId,
      warehouseId: data.warehouseId,
    });

    return task;
  }

  /**
   * Dar Koridor Yönetimi
   * Narrow aisle management for VNA operations
   */
  async manageNarrowAisle(data: {
    aisleId: string;
    warehouseId: string;
    operation: 'enter' | 'exit';
    forkliftId: string;
  }, operatorId: string) {
    const aisleStatus = await this.getAisleStatus(data.aisleId, data.warehouseId);

    if (data.operation === 'enter') {
      if (aisleStatus.occupied) {
        throw new BadRequestException(
          `Aisle ${data.aisleId} is occupied by ${aisleStatus.currentForklift}`,
        );
      }

      // Lock aisle for this forklift
      await this.lockAisle(data.aisleId, data.forkliftId, operatorId);

      await this.eventBus.emit('aisle.entered', {
        aisleId: data.aisleId,
        forkliftId: data.forkliftId,
        operatorId,
      });

      return {
        aisleId: data.aisleId,
        status: 'locked',
        forkliftId: data.forkliftId,
        enteredAt: new Date(),
      };
    } else {
      // Release aisle
      await this.unlockAisle(data.aisleId, data.forkliftId);

      await this.eventBus.emit('aisle.exited', {
        aisleId: data.aisleId,
        forkliftId: data.forkliftId,
        operatorId,
      });

      return {
        aisleId: data.aisleId,
        status: 'available',
        forkliftId: null,
        exitedAt: new Date(),
      };
    }
  }

  /**
   * Forklift Çalışma Alanı Kontrolü
   * Check if forklift can operate in specific zone
   */
  async validateWorkingArea(data: {
    forkliftId: string;
    targetZone: string;
    warehouseId: string;
  }) {
    // Mock - would check forklift working area assignments
    const forkliftAreas = ['Zone-A', 'Zone-B']; // From forklift definition
    const allowed = forkliftAreas.includes(data.targetZone);

    if (!allowed) {
      throw new BadRequestException(
        `Forklift ${data.forkliftId} not authorized for ${data.targetZone}`,
      );
    }

    return {
      forkliftId: data.forkliftId,
      zone: data.targetZone,
      authorized: true,
    };
  }

  /**
   * Assign task to forklift operator
   */
  async assignTask(taskId: string, operatorId: string, forkliftId: string, warehouseId: string) {
    await this.eventBus.emit('forklift.task.assigned', {
      taskId,
      operatorId,
      forkliftId,
    });

    this.wsGateway.sendToRoom(`warehouse:${warehouseId}`, 'forklift:task:assigned', {
      taskId,
      operatorId,
    });

    return {
      taskId,
      assignedTo: operatorId,
      forkliftId,
      assignedAt: new Date(),
    };
  }

  /**
   * Complete forklift task
   */
  async completeTask(data: {
    taskId: string;
    actualDuration: number;
    notes?: string;
    warehouseId: string;
  }, operatorId: string) {
    await this.eventBus.emit('forklift.task.completed', {
      taskId: data.taskId,
      operatorId,
      duration: data.actualDuration,
    });

    return {
      taskId: data.taskId,
      status: 'completed',
      completedBy: operatorId,
      duration: data.actualDuration,
      completedAt: new Date(),
    };
  }

  /**
   * Get forklift performance metrics
   */
  async getForkliftPerformance(data: {
    forkliftId?: string;
    operatorId?: string;
    warehouseId: string;
    startDate: Date;
    endDate: Date;
  }) {
    // Mock implementation
    return {
      forkliftId: data.forkliftId,
      operatorId: data.operatorId,
      period: { start: data.startDate, end: data.endDate },
      totalTasks: 0,
      completedTasks: 0,
      avgDuration: 0,
      efficiency: 0,
      utilizationRate: 0,
    };
  }

  // Helper methods
  private calculateRTDuration(height: number): number {
    // Base time 3 min + 0.5 min per meter above 4m
    const baseTime = 3;
    const additionalTime = height > 4 ? (height - 4) * 0.5 : 0;
    return baseTime + additionalTime;
  }

  private calculateTTDuration(height: number): number {
    // TT is slower but can go higher
    const baseTime = 4;
    const additionalTime = height > 6 ? (height - 6) * 0.7 : 0;
    return baseTime + additionalTime;
  }

  private async getAisleStatus(aisleId: string, warehouseId: string) {
    // Mock - would query aisle status table
    return {
      aisleId,
      occupied: false,
      currentForklift: null,
      lastActivity: null,
    };
  }

  private async lockAisle(aisleId: string, forkliftId: string, operatorId: string) {
    // Would update aisle lock status
    await this.eventBus.emit('aisle.locked', { aisleId, forkliftId, operatorId });
  }

  private async unlockAisle(aisleId: string, forkliftId: string) {
    // Would release aisle lock
    await this.eventBus.emit('aisle.unlocked', { aisleId, forkliftId });
  }
}

