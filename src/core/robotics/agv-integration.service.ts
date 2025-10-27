import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface AGVTask {
  id: string;
  type: 'transport' | 'pickup' | 'dropoff';
  fromLocation: { x: number; y: number };
  toLocation: { x: number; y: number };
  priority: number;
  payload?: any;
}

interface AGVStatus {
  id: string;
  battery: number;
  location: { x: number; y: number };
  status: 'idle' | 'busy' | 'charging' | 'error';
  currentTask?: string;
}

@Injectable()
export class AGVIntegrationService {
  private readonly logger = new Logger(AGVIntegrationService.name);
  private readonly agvApiUrl = process.env.AGV_API_URL || 'http://agv-controller:8080';

  async assignTask(agvId: string, task: AGVTask): Promise<void> {
    try {
      await axios.post(`${this.agvApiUrl}/agv/${agvId}/tasks`, task);
      this.logger.log(`Task assigned to AGV ${agvId}: ${task.type}`);
    } catch (error) {
      this.logger.error(`Failed to assign task to AGV ${agvId}:`, error);
      throw error;
    }
  }

  async getAGVStatus(agvId: string): Promise<AGVStatus> {
    try {
      const response = await axios.get(`${this.agvApiUrl}/agv/${agvId}/status`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get AGV status for ${agvId}:`, error);
      throw error;
    }
  }

  async getAllAGVs(): Promise<AGVStatus[]> {
    try {
      const response = await axios.get(`${this.agvApiUrl}/agv`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get all AGVs:', error);
      return [];
    }
  }

  async findNearestAvailableAGV(location: { x: number; y: number }): Promise<string | null> {
    const agvs = await this.getAllAGVs();
    const availableAGVs = agvs.filter(agv => agv.status === 'idle' && agv.battery > 20);

    if (availableAGVs.length === 0) return null;

    let nearestAGV = availableAGVs[0];
    let minDistance = this.calculateDistance(location, nearestAGV.location);

    availableAGVs.forEach(agv => {
      const distance = this.calculateDistance(location, agv.location);
      if (distance < minDistance) {
        minDistance = distance;
        nearestAGV = agv;
      }
    });

    return nearestAGV.id;
  }

  private calculateDistance(pos1: { x: number; y: number }, pos2: { x: number; y: number }): number {
    return Math.sqrt(Math.pow(pos2.x - pos1.x, 2) + Math.pow(pos2.y - pos1.y, 2));
  }

  async cancelTask(agvId: string, taskId: string): Promise<void> {
    await axios.delete(`${this.agvApiUrl}/agv/${agvId}/tasks/${taskId}`);
    this.logger.log(`Task ${taskId} cancelled for AGV ${agvId}`);
  }

  async sendToCharging(agvId: string): Promise<void> {
    await axios.post(`${this.agvApiUrl}/agv/${agvId}/charge`);
    this.logger.log(`AGV ${agvId} sent to charging station`);
  }
}

