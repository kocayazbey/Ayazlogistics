import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, between } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface WorkerTask {
  id: string;
  workerId: string;
  taskType: 'receiving' | 'putaway' | 'picking' | 'packing' | 'loading' | 'cycle_count' | 'replenishment';
  orderId?: string;
  startTime: Date;
  endTime?: Date;
  targetTime?: number; // minutes
  actualTime?: number; // minutes
  unitsProcessed?: number;
  status: 'assigned' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
  performance?: {
    unitsPerHour: number;
    accuracy: number;
    efficiency: number;
  };
}

interface WorkerPerformance {
  workerId: string;
  workerName: string;
  period: { startDate: Date; endDate: Date };
  totalTasks: number;
  completedTasks: number;
  avgTaskTime: number;
  avgUnitsPerHour: number;
  accuracy: number;
  efficiency: number;
  totalHours: number;
  byTaskType: Record<string, {
    count: number;
    avgTime: number;
    unitsPerHour: number;
  }>;
}

interface LaborForecast {
  date: Date;
  shift: 'morning' | 'afternoon' | 'night';
  taskType: string;
  estimatedVolume: number;
  requiredWorkers: number;
  estimatedHours: number;
}

@Injectable()
export class LaborManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async assignTask(
    task: Omit<WorkerTask, 'id' | 'status' | 'startTime'>,
    tenantId: string,
  ): Promise<WorkerTask> {
    const taskId = `TASK-${Date.now()}`;

    const workerTask: WorkerTask = {
      id: taskId,
      ...task,
      status: 'assigned',
      startTime: new Date(),
    };

    await this.eventBus.emit('worker.task.assigned', {
      taskId,
      workerId: task.workerId,
      taskType: task.taskType,
      orderId: task.orderId,
      tenantId,
    });

    return workerTask;
  }

  async startTask(taskId: string, workerId: string, tenantId: string): Promise<void> {
    await this.eventBus.emit('worker.task.started', {
      taskId,
      workerId,
      startTime: new Date(),
      tenantId,
    });
  }

  async completeTask(
    taskId: string,
    workerId: string,
    unitsProcessed: number,
    tenantId: string,
  ): Promise<void> {
    const endTime = new Date();

    await this.eventBus.emit('worker.task.completed', {
      taskId,
      workerId,
      endTime,
      unitsProcessed,
      tenantId,
    });

    // Calculate performance
    await this.calculateTaskPerformance(taskId, tenantId);
  }

  async pauseTask(taskId: string, workerId: string, reason: string, tenantId: string): Promise<void> {
    await this.eventBus.emit('worker.task.paused', {
      taskId,
      workerId,
      pauseTime: new Date(),
      reason,
      tenantId,
    });
  }

  async resumeTask(taskId: string, workerId: string, tenantId: string): Promise<void> {
    await this.eventBus.emit('worker.task.resumed', {
      taskId,
      workerId,
      resumeTime: new Date(),
      tenantId,
    });
  }

  private async calculateTaskPerformance(taskId: string, tenantId: string): Promise<void> {
    // Mock: Would calculate performance metrics
    const performance = {
      unitsPerHour: 150,
      accuracy: 99.5,
      efficiency: 95.0,
    };

    await this.eventBus.emit('worker.performance.calculated', {
      taskId,
      performance,
      tenantId,
    });
  }

  async getWorkerPerformance(
    workerId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<WorkerPerformance> {
    // Mock: Would query and calculate from tasks
    return {
      workerId,
      workerName: 'Worker Name',
      period: { startDate, endDate },
      totalTasks: 0,
      completedTasks: 0,
      avgTaskTime: 0,
      avgUnitsPerHour: 0,
      accuracy: 0,
      efficiency: 0,
      totalHours: 0,
      byTaskType: {},
    };
  }

  async getTeamPerformance(
    warehouseId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<any> {
    return {
      warehouseId,
      period: { startDate, endDate },
      totalWorkers: 0,
      totalTasks: 0,
      avgUnitsPerHour: 0,
      avgAccuracy: 0,
      avgEfficiency: 0,
      topPerformers: [],
      needsImprovement: [],
    };
  }

  async forecastLaborNeeds(
    warehouseId: string,
    forecastDate: Date,
    estimatedVolume: {
      receiving: number;
      picking: number;
      packing: number;
      shipping: number;
    },
    tenantId: string,
  ): Promise<LaborForecast[]> {
    const forecasts: LaborForecast[] = [];

    const shifts: Array<'morning' | 'afternoon' | 'night'> = ['morning', 'afternoon', 'night'];

    for (const shift of shifts) {
      // Receiving
      if (estimatedVolume.receiving > 0) {
        const receivingWorkers = Math.ceil(estimatedVolume.receiving / 100); // 100 units per worker per shift
        forecasts.push({
          date: forecastDate,
          shift,
          taskType: 'receiving',
          estimatedVolume: estimatedVolume.receiving,
          requiredWorkers: receivingWorkers,
          estimatedHours: receivingWorkers * 8,
        });
      }

      // Picking
      if (estimatedVolume.picking > 0) {
        const pickingWorkers = Math.ceil(estimatedVolume.picking / 150);
        forecasts.push({
          date: forecastDate,
          shift,
          taskType: 'picking',
          estimatedVolume: estimatedVolume.picking,
          requiredWorkers: pickingWorkers,
          estimatedHours: pickingWorkers * 8,
        });
      }

      // Packing
      if (estimatedVolume.packing > 0) {
        const packingWorkers = Math.ceil(estimatedVolume.packing / 80);
        forecasts.push({
          date: forecastDate,
          shift,
          taskType: 'packing',
          estimatedVolume: estimatedVolume.packing,
          requiredWorkers: packingWorkers,
          estimatedHours: packingWorkers * 8,
        });
      }
    }

    return forecasts;
  }

  async getWorkerUtilization(
    workerId: string,
    date: Date,
    tenantId: string,
  ): Promise<{
    workerId: string;
    date: Date;
    totalWorkTime: number;
    activeTaskTime: number;
    idleTime: number;
    utilizationRate: number;
  }> {
    // Mock: Would calculate from time tracking
    return {
      workerId,
      date,
      totalWorkTime: 480, // 8 hours in minutes
      activeTaskTime: 420,
      idleTime: 60,
      utilizationRate: 87.5,
    };
  }

  async optimizeTaskAssignment(
    availableWorkers: Array<{ id: string; skills: string[]; currentLocation: string }>,
    pendingTasks: Array<{ id: string; taskType: string; location: string; priority: number }>,
  ): Promise<Array<{ workerId: string; taskId: string; estimatedTime: number }>> {
    const assignments: Array<{ workerId: string; taskId: string; estimatedTime: number }> = [];

    // Sort tasks by priority
    const sortedTasks = [...pendingTasks].sort((a, b) => b.priority - a.priority);

    for (const task of sortedTasks) {
      // Find best worker (closest with required skills)
      const bestWorker = this.findBestWorkerForTask(availableWorkers, task);

      if (bestWorker) {
        assignments.push({
          workerId: bestWorker.id,
          taskId: task.id,
          estimatedTime: this.estimateTaskTime(task.taskType),
        });

        // Remove worker from available list
        availableWorkers = availableWorkers.filter(w => w.id !== bestWorker.id);
      }
    }

    return assignments;
  }

  private findBestWorkerForTask(
    workers: Array<{ id: string; skills: string[]; currentLocation: string }>,
    task: { id: string; taskType: string; location: string },
  ): { id: string; skills: string[]; currentLocation: string } | null {
    // Simple logic: find worker with required skills closest to task location
    const qualifiedWorkers = workers.filter(w => w.skills.includes(task.taskType));

    if (qualifiedWorkers.length === 0) {
      return workers[0] || null;
    }

    // For simplicity, return first qualified worker
    return qualifiedWorkers[0];
  }

  private estimateTaskTime(taskType: string): number {
    const estimatedTimes: Record<string, number> = {
      'receiving': 45,
      'putaway': 30,
      'picking': 25,
      'packing': 20,
      'loading': 40,
      'cycle_count': 60,
      'replenishment': 35,
    };

    return estimatedTimes[taskType] || 30;
  }

  private async findAvailableQuarantineZone(
    warehouseId: string,
    severity: string,
    tenantId: string,
  ): Promise<string | null> {
    // Mock: Would find appropriate quarantine zone
    return 'ZONE-QTN-01';
  }
}

