import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { MONITORING_KEY, MONITORING_OPTIONS_KEY } from '../decorators/monitoring.decorator';
import { Logger } from '@nestjs/common';

@Injectable()
export class ComprehensiveMonitoringInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ComprehensiveMonitoringInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const isMonitoringEnabled = this.reflector.get<boolean>(MONITORING_KEY, context.getHandler());
    const options = this.reflector.get<any>(MONITORING_OPTIONS_KEY, context.getHandler());
    
    if (!isMonitoringEnabled) {
      return next.handle();
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();
    
    const requestId = request.headers['x-request-id'] || this.generateRequestId();
    const user = request.user;
    const tenantId = user?.tenantId;
    const ip = request.ip;
    const userAgent = request.headers['user-agent'];

    return next.handle().pipe(
      tap((data) => {
        const endTime = Date.now();
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage();
        
        const executionTime = endTime - startTime;
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        const cpuDelta = endCpu.user + endCpu.system;
        
        const monitoringData = {
          requestId,
          tenantId,
          userId: user?.id,
          method: request.method,
          url: request.url,
          ip,
          userAgent,
          executionTime,
          memoryUsage: {
            heapUsed: endMemory.heapUsed,
            heapTotal: endMemory.heapTotal,
            external: endMemory.external,
            rss: endMemory.rss,
            delta: memoryDelta,
          },
          cpuUsage: {
            user: endCpu.user,
            system: endCpu.system,
            total: cpuDelta,
          },
          responseSize: JSON.stringify(data).length,
          statusCode: response.statusCode,
          timestamp: new Date(),
        };

        this.logMonitoringMetrics(monitoringData, options);
        this.checkAlerts(monitoringData, options);
      }),
      catchError((error) => {
        const endTime = Date.now();
        const executionTime = endTime - startTime;
        
        const errorData = {
          requestId,
          tenantId,
          userId: user?.id,
          method: request.method,
          url: request.url,
          ip,
          userAgent,
          executionTime,
          error: {
            message: error.message,
            stack: error.stack,
            statusCode: error.status || 500,
          },
          timestamp: new Date(),
        };

        this.logErrorMetrics(errorData, options);
        throw error;
      }),
    );
  }

  private logMonitoringMetrics(data: any, options: any) {
    if (options?.trackMetrics) {
      this.logger.log(`[METRICS] ${JSON.stringify(data)}`);
    }
    
    if (options?.trackHealth) {
      this.logger.log(`[HEALTH] ${data.method} ${data.url} - ${data.statusCode} - ${data.executionTime}ms`);
    }
    
    if (options?.trackLatency) {
      this.logger.log(`[LATENCY] ${data.method} ${data.url} - ${data.executionTime}ms`);
    }
    
    if (options?.trackThroughput) {
      this.logger.log(`[THROUGHPUT] ${data.method} ${data.url} - ${data.responseSize} bytes`);
    }
    
    if (options?.trackResourceUsage) {
      this.logger.log(`[RESOURCE] Memory: ${data.memoryUsage.heapUsed} bytes, CPU: ${data.cpuUsage.total}μs`);
    }
  }

  private logErrorMetrics(data: any, options: any) {
    if (options?.trackErrors) {
      this.logger.error(`[ERROR METRICS] ${JSON.stringify(data)}`);
    }
  }

  private checkAlerts(data: any, options: any) {
    if (!options?.enableAlerts) return;

    const thresholds = options.alertThresholds || {};
    
    // Latency alert
    if (thresholds.latency && data.executionTime > thresholds.latency) {
      this.logger.warn(`[LATENCY ALERT] ${data.method} ${data.url} exceeded latency threshold: ${data.executionTime}ms > ${thresholds.latency}ms`);
    }
    
    // Memory alert
    if (thresholds.memoryUsage && data.memoryUsage.heapUsed > thresholds.memoryUsage) {
      this.logger.warn(`[MEMORY ALERT] ${data.method} ${data.url} exceeded memory threshold: ${data.memoryUsage.heapUsed} bytes > ${thresholds.memoryUsage} bytes`);
    }
    
    // CPU alert
    if (thresholds.cpuUsage && data.cpuUsage.total > thresholds.cpuUsage) {
      this.logger.warn(`[CPU ALERT] ${data.method} ${data.url} exceeded CPU threshold: ${data.cpuUsage.total}μs > ${thresholds.cpuUsage}μs`);
    }
    
    // Error rate alert
    if (thresholds.errorRate && data.statusCode >= 400) {
      this.logger.warn(`[ERROR RATE ALERT] ${data.method} ${data.url} returned error status: ${data.statusCode}`);
    }
  }

  private generateRequestId(): string {
    return `mon_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
