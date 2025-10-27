import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';
// import axios from 'axios'; // Removed unused import

interface RoboticSystem {
  systemId: string;
  type: 'conveyor' | 'palletizer' | 'agv' | 'robotic_arm' | 'automated_sorter' | 'as_rs';
  manufacturer: string;
  model: string;
  warehouseId: string;
  locationId: string;
  status: 'error' | 'maintenance' | 'idle' | 'charging' | 'working';
  batteryLevel: number;
  currentTask?: string | undefined;
  lastMaintenance: Date;
  nextMaintenance: Date;
}

interface TaskAssignment {
  taskId: string;
  systemId: string;
  taskType: 'sort' | 'transport' | 'pick' | 'place' | 'palletize' | 'depalletize';
  sourceLocation: string;
  destinationLocation: string;
  items: any[];
  priority: 'high' | 'normal' | 'low' | 'urgent';
  status: 'assigned' | 'in_progress' | 'completed' | 'failed';
  estimatedDuration: number;
}

@Injectable()
export class WarehouseAutomationService {
  private readonly logger = new Logger('WarehouseAutomationService');

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async getSystemStatus(systemId: string, tenantId: string): Promise<RoboticSystem | null> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          system_id, type, manufacturer, model, warehouse_id, location_id,
          status, battery_level, current_task, last_maintenance, next_maintenance
        FROM robotic_systems 
        WHERE system_id = ${systemId} AND tenant_id = ${tenantId}
      `);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      if (!row) return null;
      
      return {
        systemId: String(row.system_id),
        type: row.type as any,
        manufacturer: String(row.manufacturer),
        model: String(row.model),
        warehouseId: String(row.warehouse_id),
        locationId: String(row.location_id),
        status: row.status as any,
        batteryLevel: parseFloat(String(row.battery_level || '0')),
        currentTask: row.current_task ? String(row.current_task) : undefined,
        lastMaintenance: new Date(String(row.last_maintenance)),
        nextMaintenance: new Date(String(row.next_maintenance)),
      };
    } catch (error) {
      this.logger.error(`Error getting system status: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async assignTask(task: TaskAssignment, tenantId: string): Promise<void> {
    try {
      await this.db.execute(sql`
        INSERT INTO robotic_tasks (
          task_id, system_id, task_type, source_location, destination_location,
          items, priority, status, estimated_duration, tenant_id, created_at
        ) VALUES (
          ${task.taskId}, ${task.systemId}, ${task.taskType}, ${task.sourceLocation},
          ${task.destinationLocation}, ${JSON.stringify(task.items)}, ${task.priority},
          ${task.status}, ${task.estimatedDuration}, ${tenantId}, NOW()
        )
      `);

      await this.db.execute(sql`
        UPDATE robotic_systems 
        SET status = 'working', current_task = ${task.taskId}
        WHERE system_id = ${task.systemId} AND tenant_id = ${tenantId}
      `);

      this.logger.log(`Task ${task.taskId} assigned to system ${task.systemId}`);
    } catch (error) {
      this.logger.error(`Error assigning task: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async completeTask(taskId: string, systemId: string, tenantId: string): Promise<void> {
    try {
      await this.db.execute(sql`
        UPDATE robotic_tasks 
        SET status = 'completed', completed_at = NOW()
        WHERE task_id = ${taskId} AND tenant_id = ${tenantId}
      `);

      await this.db.execute(sql`
        UPDATE robotic_systems 
        SET status = 'idle', current_task = NULL
        WHERE system_id = ${systemId} AND tenant_id = ${tenantId}
      `);

      this.logger.log(`Task ${taskId} completed by system ${systemId}`);
    } catch (error) {
      this.logger.error(`Error completing task: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getAvailableSystems(warehouseId: string, taskType: string, tenantId: string): Promise<RoboticSystem[]> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          system_id, type, manufacturer, model, warehouse_id, location_id,
          status, battery_level, current_task, last_maintenance, next_maintenance
        FROM robotic_systems 
        WHERE warehouse_id = ${warehouseId} 
          AND type = ${taskType}
          AND status IN ('idle', 'charging')
          AND battery_level > 20
          AND tenant_id = ${tenantId}
        ORDER BY battery_level DESC, last_maintenance ASC
      `);

      return result.map(row => ({
        systemId: String(row.system_id),
        type: row.type as any,
        manufacturer: String(row.manufacturer),
        model: String(row.model),
        warehouseId: String(row.warehouse_id),
        locationId: String(row.location_id),
        status: row.status as any,
        batteryLevel: parseFloat(String(row.battery_level)),
        currentTask: row.current_task ? String(row.current_task) : undefined,
        lastMaintenance: new Date(String(row.last_maintenance)),
        nextMaintenance: new Date(String(row.next_maintenance)),
      } as RoboticSystem));
    } catch (error) {
      this.logger.error(`Error getting available systems: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async optimizeTaskAssignment(warehouseId: string, tenantId: string): Promise<void> {
    try {
      const pendingTasks = await this.db.execute(sql`
        SELECT task_id, task_type, source_location, destination_location, 
               items, priority, estimated_duration
        FROM robotic_tasks 
        WHERE status = 'pending' AND warehouse_id = ${warehouseId} AND tenant_id = ${tenantId}
        ORDER BY priority DESC, created_at ASC
      `);

      for (const task of pendingTasks) {
        const availableSystems = await this.getAvailableSystems(
          warehouseId, 
          String(task.task_type), 
          tenantId
        );

        if (availableSystems.length > 0) {
          const bestSystem = availableSystems[0];
          if (bestSystem) {
            await this.assignTask({
            taskId: String(task.task_id),
            systemId: bestSystem.systemId,
            taskType: task.task_type as any,
            sourceLocation: String(task.source_location),
            destinationLocation: String(task.destination_location),
            items: JSON.parse(String(task.items)),
            priority: task.priority as any,
            status: 'assigned',
            estimatedDuration: Number(task.estimated_duration),
          }, tenantId);
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error optimizing task assignment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async getSystemHealth(systemId: string, tenantId: string): Promise<any> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          system_id, type, manufacturer, model, warehouse_id, location_id,
          status, battery_level, current_task, last_maintenance, next_maintenance
        FROM robotic_systems 
        WHERE system_id = ${systemId} AND tenant_id = ${tenantId}
      `);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      if (!row) return null;
      
      return {
        systemId: String(row.system_id),
        type: row.type,
        status: row.status,
        batteryLevel: parseFloat(String(row.battery_level || '100')),
        health: this.calculateSystemHealth(row),
        maintenanceStatus: parseFloat(String(row.days_until_maintenance || '0')) < 7 ? 'due_soon' : 'ok',
      };
    } catch (error) {
      this.logger.error(`Error getting system health: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  private calculateSystemHealth(system: any): string {
    const batteryLevel = parseFloat(String(system.battery_level || '0'));
    const daysSinceMaintenance = Math.floor(
      (Date.now() - new Date(String(system.last_maintenance)).getTime()) / (1000 * 60 * 60 * 24)
    );

    if (batteryLevel < 20 || daysSinceMaintenance > 30) {
      return 'critical';
    } else if (batteryLevel < 50 || daysSinceMaintenance > 14) {
      return 'warning';
    } else {
      return 'healthy';
    }
  }

  async getPerformanceMetrics(warehouseId: string, period: { start: Date; end: Date }, tenantId: string): Promise<any> {
    try {
      const result = await this.db.execute(sql`
        SELECT 
          COUNT(*) as total_tasks,
          COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
          COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
          AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/60) as avg_duration_minutes,
          COUNT(DISTINCT system_id) as systems_used
        FROM robotic_tasks 
        WHERE warehouse_id = ${warehouseId} 
          AND created_at BETWEEN ${period.start} AND ${period.end}
          AND tenant_id = ${tenantId}
      `);

      const row = result[0];
      if (!row) return {
        totalTasks: 0,
        completedTasks: 0,
        failedTasks: 0,
        successRate: 0,
        avgDuration: 0,
        systemsUtilized: 0,
      };
      
      const total = parseInt(String(row.total_tasks || '0'));
      const completed = parseInt(String(row.completed_tasks || '0'));

      return {
        totalTasks: total,
        completedTasks: completed,
        failedTasks: parseInt(String(row.failed_tasks || '0')),
        successRate: total > 0 ? (completed / total) * 100 : 0,
        avgDuration: parseFloat(String(row.avg_duration_minutes || '0')),
        systemsUtilized: parseInt(String(row.systems_used || '0')),
      };
    } catch (error) {
      this.logger.error(`Error getting performance metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
}