import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class CacheWarmingService {
  private readonly logger = new Logger(CacheWarmingService.name);

  constructor(private readonly httpService: HttpService) {}

  @Cron(CronExpression.EVERY_5_MINUTES)
  async warmCache() {
    this.logger.log('Starting cache warming process...');
    
    try {
      // Warm critical API endpoints
      await this.warmCriticalEndpoints();
      
      // Warm frequently accessed data
      await this.warmFrequentData();
      
      // Warm static assets
      await this.warmStaticAssets();
      
      this.logger.log('Cache warming completed successfully');
    } catch (error) {
      this.logger.error('Cache warming failed:', error);
    }
  }

  private async warmCriticalEndpoints() {
    const criticalEndpoints = [
      '/api/v1/health',
      '/api/v1/inventory',
      '/api/v1/shipments',
      '/api/v1/orders',
      '/api/v1/customers',
    ];

    for (const endpoint of criticalEndpoints) {
      try {
        await firstValueFrom(
          this.httpService.get(`http://localhost:3000${endpoint}`)
        );
        this.logger.debug(`Warmed endpoint: ${endpoint}`);
      } catch (error) {
        this.logger.warn(`Failed to warm endpoint ${endpoint}:`, error.message);
      }
    }
  }

  private async warmFrequentData() {
    // Warm frequently accessed data
    const frequentDataEndpoints = [
      '/api/v1/inventory?limit=100',
      '/api/v1/shipments?status=active&limit=50',
      '/api/v1/orders?status=pending&limit=50',
    ];

    for (const endpoint of frequentDataEndpoints) {
      try {
        await firstValueFrom(
          this.httpService.get(`http://localhost:3000${endpoint}`)
        );
        this.logger.debug(`Warmed frequent data: ${endpoint}`);
      } catch (error) {
        this.logger.warn(`Failed to warm frequent data ${endpoint}:`, error.message);
      }
    }
  }

  private async warmStaticAssets() {
    const staticAssets = [
      '/static/css/main.css',
      '/static/js/main.js',
      '/static/images/logo.png',
    ];

    for (const asset of staticAssets) {
      try {
        await firstValueFrom(
          this.httpService.get(`http://localhost:3000${asset}`)
        );
        this.logger.debug(`Warmed static asset: ${asset}`);
      } catch (error) {
        this.logger.warn(`Failed to warm static asset ${asset}:`, error.message);
      }
    }
  }
}
