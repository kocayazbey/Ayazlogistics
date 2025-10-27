import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

interface SortingTask {
  itemId: string;
  barcode: string;
  destination: string;
  weight?: number;
  dimensions?: { length: number; width: number; height: number };
}

interface SorterStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  throughput: number;
  itemsProcessed: number;
  errorRate: number;
}

@Injectable()
export class AutomatedSortingService {
  private readonly logger = new Logger(AutomatedSortingService.name);
  private readonly sorterApiUrl = process.env.SORTER_API_URL || 'http://sorter-controller:8080';

  async sendToSorter(task: SortingTask): Promise<void> {
    try {
      await axios.post(`${this.sorterApiUrl}/sort`, task);
      this.logger.log(`Item ${task.itemId} sent to automated sorter`);
    } catch (error) {
      this.logger.error(`Failed to send item ${task.itemId} to sorter:`, error);
      throw error;
    }
  }

  async getSorterStatus(sorterId: string): Promise<SorterStatus> {
    try {
      const response = await axios.get(`${this.sorterApiUrl}/sorters/${sorterId}/status`);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to get sorter status for ${sorterId}:`, error);
      throw error;
    }
  }

  async getAllSorters(): Promise<SorterStatus[]> {
    try {
      const response = await axios.get(`${this.sorterApiUrl}/sorters`);
      return response.data;
    } catch (error) {
      this.logger.error('Failed to get all sorters:', error);
      return [];
    }
  }

  async optimizeSortingRoutes(items: SortingTask[]): Promise<SortingTask[]> {
    const sorted = [...items].sort((a, b) => {
      if (a.destination < b.destination) return -1;
      if (a.destination > b.destination) return 1;
      return 0;
    });

    this.logger.log(`Optimized sorting for ${items.length} items into ${new Set(items.map(i => i.destination)).size} destinations`);

    return sorted;
  }

  async batchSort(tasks: SortingTask[]): Promise<{ success: number; failed: number }> {
    let success = 0;
    let failed = 0;

    for (const task of tasks) {
      try {
        await this.sendToSorter(task);
        success++;
      } catch (error) {
        failed++;
      }
    }

    this.logger.log(`Batch sorting completed: ${success} success, ${failed} failed`);

    return { success, failed };
  }
}

