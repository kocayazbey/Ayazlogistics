import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface HealthStatus {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  uptime: number;
  version: string;
  environment: string;
  services: Record<string, ServiceHealth>;
  metrics: SystemMetrics;
}

export interface ServiceHealth {
  status: 'healthy' | 'unhealthy' | 'degraded';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

export interface SystemMetrics {
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  cpu: {
    usage: number;
  };
  disk: {
    used: number;
    total: number;
    percentage: number;
  };
}

@Injectable()
export class HealthCheckService {
  private readonly logger = new Logger(HealthCheckService.name);
  private readonly startTime = Date.now();
  private serviceHealth = new Map<string, ServiceHealth>();

  constructor(private configService: ConfigService) {}

  async getHealthStatus(): Promise<HealthStatus> {
    const services = await this.checkAllServices();
    const metrics = await this.getSystemMetrics();
    
    const overallStatus = this.determineOverallStatus(services);
    
    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      uptime: Date.now() - this.startTime,
      version: this.configService.get('APP_VERSION', '1.0.0'),
      environment: this.configService.get('NODE_ENV', 'development'),
      services,
      metrics,
    };
  }

  async checkService(serviceName: string, checkFunction: () => Promise<any>): Promise<ServiceHealth> {
    const startTime = Date.now();
    
    try {
      await checkFunction();
      const responseTime = Date.now() - startTime;
      
      const health: ServiceHealth = {
        status: 'healthy',
        responseTime,
        lastCheck: new Date().toISOString(),
      };
      
      this.serviceHealth.set(serviceName, health);
      return health;
    } catch (error) {
      const health: ServiceHealth = {
        status: 'unhealthy',
        lastCheck: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      };
      
      this.serviceHealth.set(serviceName, health);
      this.logger.error(`Health check failed for ${serviceName}`, error);
      return health;
    }
  }

  private async checkAllServices(): Promise<Record<string, ServiceHealth>> {
    const services: Record<string, ServiceHealth> = {};
    
    // Database health check
    services.database = await this.checkService('database', async () => {
      // In a real implementation, you would check database connectivity
      await new Promise(resolve => setTimeout(resolve, 100));
    });

    // Redis health check
    services.redis = await this.checkService('redis', async () => {
      // In a real implementation, you would check Redis connectivity
      await new Promise(resolve => setTimeout(resolve, 50));
    });

    // External API health check
    services.externalAPI = await this.checkService('externalAPI', async () => {
      // In a real implementation, you would check external API connectivity
      await new Promise(resolve => setTimeout(resolve, 200));
    });

    return services;
  }

  private async getSystemMetrics(): Promise<SystemMetrics> {
    const memoryUsage = process.memoryUsage();
    const totalMemory = require('os').totalmem();
    const freeMemory = require('os').freemem();
    const usedMemory = totalMemory - freeMemory;

    return {
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: Math.round((memoryUsage.heapUsed / memoryUsage.heapTotal) * 100),
      },
      cpu: {
        usage: await this.getCpuUsage(),
      },
      disk: {
        used: usedMemory,
        total: totalMemory,
        percentage: Math.round((usedMemory / totalMemory) * 100),
      },
    };
  }

  private async getCpuUsage(): Promise<number> {
    // Simplified CPU usage calculation
    // In a real implementation, you would use a proper CPU monitoring library
    return Math.random() * 100;
  }

  private determineOverallStatus(services: Record<string, ServiceHealth>): 'healthy' | 'unhealthy' | 'degraded' {
    const serviceStatuses = Object.values(services).map(service => service.status);
    
    if (serviceStatuses.every(status => status === 'healthy')) {
      return 'healthy';
    }
    
    if (serviceStatuses.some(status => status === 'unhealthy')) {
      return 'unhealthy';
    }
    
    return 'degraded';
  }

  getServiceHealth(serviceName: string): ServiceHealth | null {
    return this.serviceHealth.get(serviceName) || null;
  }

  getAllServiceHealth(): Record<string, ServiceHealth> {
    const result: Record<string, ServiceHealth> = {};
    for (const [name, health] of this.serviceHealth) {
      result[name] = health;
    }
    return result;
  }

  resetServiceHealth(serviceName: string): void {
    this.serviceHealth.delete(serviceName);
    this.logger.log(`Health status reset for service: ${serviceName}`);
  }
}
