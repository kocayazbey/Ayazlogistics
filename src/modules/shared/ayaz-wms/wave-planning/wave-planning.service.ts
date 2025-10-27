import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface Wave {
  id: string;
  waveNumber: string;
  warehouseId: string;
  waveType: 'single_order' | 'batch' | 'zone' | 'discrete';
  status: 'planning' | 'released' | 'in_progress' | 'completed' | 'cancelled';
  orders: string[];
  totalLines: number;
  totalUnits: number;
  assignedWorkers: string[];
  zones: string[];
  priority: number;
  cutoffTime: Date;
  plannedStartTime?: Date;
  actualStartTime?: Date;
  plannedEndTime?: Date;
  actualEndTime?: Date;
  efficiency?: number;
  accuracy?: number;
  createdAt: Date;
}

@Injectable()
export class WavePlanningService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async optimizeWaves(
    warehouseId: string,
    orders: Array<{
      orderId: string;
      priority: number;
      lineCount: number;
      zones: string[];
      cutoffTime: Date;
    }>,
    availableWorkers: number,
    tenantId: string,
  ): Promise<Wave[]> {
    // Sort orders by priority and cutoff time
    const sortedOrders = [...orders].sort((a, b) => {
      if (a.priority !== b.priority) return b.priority - a.priority;
      return a.cutoffTime.getTime() - b.cutoffTime.getTime();
    });

    const waves: Wave[] = [];
    let currentWave: string[] = [];
    let currentLines = 0;
    const maxLinesPerWave = 500;

    for (const order of sortedOrders) {
      if (currentLines + order.lineCount > maxLinesPerWave && currentWave.length > 0) {
        // Create wave
        waves.push(await this.createWave(warehouseId, currentWave, tenantId));
        currentWave = [];
        currentLines = 0;
      }

      currentWave.push(order.orderId);
      currentLines += order.lineCount;
    }

    // Create final wave
    if (currentWave.length > 0) {
      waves.push(await this.createWave(warehouseId, currentWave, tenantId));
    }

    return waves;
  }

  private async createWave(
    warehouseId: string,
    orderIds: string[],
    tenantId: string,
  ): Promise<Wave> {
    const waveId = `WAVE-${Date.now()}`;
    const waveNumber = `W-${Date.now().toString().slice(-6)}`;

    const wave: Wave = {
      id: waveId,
      waveNumber,
      warehouseId,
      waveType: 'batch',
      status: 'planning',
      orders: orderIds,
      totalLines: 0,
      totalUnits: 0,
      assignedWorkers: [],
      zones: [],
      priority: 5,
      cutoffTime: new Date(Date.now() + 2 * 60 * 60 * 1000),
      createdAt: new Date(),
    };

    await this.eventBus.emit('wave.created', {
      waveId,
      waveNumber,
      orderCount: orderIds.length,
      tenantId,
    });

    return wave;
  }

  async releaseWave(waveId: string, tenantId: string, userId: string): Promise<void> {
    await this.eventBus.emit('wave.released', {
      waveId,
      releasedBy: userId,
      releasedAt: new Date(),
      tenantId,
    });
  }

  async simulateWave(
    warehouseId: string,
    orderIds: string[],
    workerCount: number,
    tenantId: string,
  ): Promise<{
    estimatedTime: number;
    estimatedLines: number;
    estimatedPicks: number;
    requiredWorkers: number;
    efficiency: number;
  }> {
    const totalLines = orderIds.length * 5; // Mock avg 5 lines per order
    const totalPicks = totalLines * 1.2; // Mock pick multiplier

    const picksPerWorkerPerHour = 150;
    const requiredHours = totalPicks / (picksPerWorkerPerHour * workerCount);

    return {
      estimatedTime: Math.ceil(requiredHours * 60), // minutes
      estimatedLines: totalLines,
      estimatedPicks: totalPicks,
      requiredWorkers: workerCount,
      efficiency: 85,
    };
  }
}

