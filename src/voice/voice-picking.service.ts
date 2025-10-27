import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

interface VoiceCommand {
  command: string;
  parameters: Record<string, any>;
  timestamp: Date;
  userId: string;
  sessionId: string;
}

interface PickTask {
  taskId: string;
  orderId: string;
  itemId: string;
  location: string;
  quantity: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
}

@Injectable()
export class VoicePickingService {
  private readonly logger = new Logger('VoicePickingService');

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async processVoiceCommand(command: VoiceCommand, tenantId: string): Promise<any> {
    try {
      const result = await this.interpretCommand(command.command);
      
      await this.db.execute(sql`
        INSERT INTO voice_commands (
          command, parameters, timestamp, user_id, session_id, tenant_id
        ) VALUES (
          ${command.command}, ${JSON.stringify(command.parameters)}, 
          ${command.timestamp}, ${command.userId}, ${command.sessionId}, ${tenantId}
        )
      `);

      return {
        success: true,
        interpretedCommand: result,
        response: this.generateVoiceResponse(result),
      };
    } catch (error) {
      this.logger.error(`Error processing voice command: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async startPickTask(taskId: string, userId: string, tenantId: string): Promise<any> {
    try {
      const task = await this.getPickTask(taskId, tenantId);
      
      if (!task) {
        throw new Error('Task not found');
      }

      await this.db.execute(sql`
        UPDATE pick_tasks 
        SET status = 'in_progress', started_at = NOW(), user_id = ${userId}
        WHERE task_id = ${taskId} AND tenant_id = ${tenantId}
      `);

      return {
        success: true,
        task,
        voiceInstructions: this.generatePickInstructions(task),
      };
    } catch (error) {
      this.logger.error(`Error starting pick task: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async confirmPick(taskId: string, itemId: string, quantity: number, tenantId: string): Promise<any> {
    try {
      await this.db.execute(sql`
        UPDATE pick_tasks 
        SET status = 'completed', completed_at = NOW(), picked_quantity = ${quantity}
        WHERE task_id = ${taskId} AND item_id = ${itemId} AND tenant_id = ${tenantId}
      `);

      return {
        success: true,
        message: `Picked ${quantity} units of item ${itemId}`,
        nextTask: await this.getNextTask(taskId, tenantId),
      };
    } catch (error) {
      this.logger.error(`Error confirming pick: ${error.message}`);
      throw error;
    }
  }

  async getPickTask(taskId: string, tenantId: string): Promise<PickTask | null> {
    try {
      const result = await this.db.execute(sql`
        SELECT task_id, order_id, item_id, location, quantity, status
        FROM pick_tasks 
        WHERE task_id = ${taskId} AND tenant_id = ${tenantId}
      `);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        taskId: String(row.task_id),
        orderId: String(row.order_id),
        itemId: String(row.item_id),
        location: String(row.location),
        quantity: Number(row.quantity),
        status: row.status as any,
      };
    } catch (error) {
      this.logger.error(`Error getting pick task: ${error.message}`);
      throw error;
    }
  }

  async getNextTask(currentTaskId: string, tenantId: string): Promise<PickTask | null> {
    try {
      const result = await this.db.execute(sql`
        SELECT task_id, order_id, item_id, location, quantity, status
        FROM pick_tasks 
        WHERE order_id = (
          SELECT order_id FROM pick_tasks WHERE task_id = ${currentTaskId}
        ) AND status = 'pending' AND tenant_id = ${tenantId}
        ORDER BY created_at ASC
        LIMIT 1
      `);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        taskId: String(row.task_id),
        orderId: String(row.order_id),
        itemId: String(row.item_id),
        location: String(row.location),
        quantity: Number(row.quantity),
        status: row.status as any,
      };
    } catch (error) {
      this.logger.error(`Error getting next task: ${error.message}`);
      throw error;
    }
  }

  private interpretCommand(command: string): any {
    const lowerCommand = command.toLowerCase();
    
    if (lowerCommand.includes('start') || lowerCommand.includes('begin')) {
      return { action: 'start_pick', parameters: {} };
    }
    
    if (lowerCommand.includes('confirm') || lowerCommand.includes('done')) {
      return { action: 'confirm_pick', parameters: {} };
    }
    
    if (lowerCommand.includes('next') || lowerCommand.includes('continue')) {
      return { action: 'next_task', parameters: {} };
    }
    
    if (lowerCommand.includes('repeat') || lowerCommand.includes('again')) {
      return { action: 'repeat_instructions', parameters: {} };
    }
    
    return { action: 'unknown', parameters: {} };
  }

  private generateVoiceResponse(interpretedCommand: any): string {
    const responses: Record<string, string> = {
      'start_pick': 'Starting pick task. Please proceed to the location.',
      'confirm_pick': 'Pick confirmed. Moving to next item.',
      'next_task': 'Loading next task...',
      'repeat_instructions': 'Repeating instructions...',
      'unknown': 'I did not understand that command. Please try again.',
    };

    return responses[interpretedCommand.action] || 'Command processed.';
  }

  private generatePickInstructions(task: PickTask): string {
    return `Please pick ${task.quantity} units of item ${task.itemId} from location ${task.location}.`;
  }
}