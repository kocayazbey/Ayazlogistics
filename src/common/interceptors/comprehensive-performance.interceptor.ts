import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { Reflector } from '@nestjs/core';
import { PERFORMANCE_KEY, PERFORMANCE_OPTIONS_KEY } from '../decorators/performance.decorator';
import { Logger } from '@nestjs/common';

@Injectable()
export class ComprehensivePerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(ComprehensivePerformanceInterceptor.name);

  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    
    const isPerformanceTracked = this.reflector.get<boolean>(PERFORMANCE_KEY, context.getHandler());
    const options = this.reflector.get<any>(PERFORMANCE_OPTIONS_KEY, context.getHandler());
    
    if (!isPerformanceTracked) {
      return next.handle();
    }

    const startTime = process.hrtime.bigint();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();
    
    const requestId = request.headers['x-request-id'] || this.generateRequestId();
    const user = request.user;
    const tenantId = user?.tenantId;

    return next.handle().pipe(
      tap((data) => {
        const endTime = process.hrtime.bigint();
        const endMemory = process.memoryUsage();
        const endCpu = process.cpuUsage();
        
        const executionTime = Number(endTime - startTime) / 1000000; // Convert to milliseconds
        const memoryDelta = endMemory.heapUsed - startMemory.heapUsed;
        const cpuDelta = endCpu.user + endCpu.system;
        
        const performanceData = {
          requestId,
          tenantId,
          method: request.method,
          url: request.url,
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

        this.logPerformanceMetrics(performanceData, options);
        
        // Check for performance alerts
        if (options?.alertThreshold && executionTime > options.alertThreshold) {
          this.logger.warn(`[PERFORMANCE ALERT] Slow execution detected: ${executionTime}ms (threshold: ${options.alertThreshold}ms)`);
        }
        
        if (options?.memoryThreshold && endMemory.heapUsed > options.memoryThreshold) {
          this.logger.warn(`[MEMORY ALERT] High memory usage detected: ${endMemory.heapUsed} bytes (threshold: ${options.memoryThreshold} bytes)`);
        }
      }),
      catchError((error) => {
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1000000;
        
        this.logger.error(`[PERFORMANCE ERROR] Request failed after ${executionTime}ms: ${error.message}`);
        throw error;
      }),
    );
  }

  private logPerformanceMetrics(performanceData: any, options: any) {
    if (options?.enableProfiling) {
      this.logger.log(`[PERFORMANCE PROFILE] ${JSON.stringify(performanceData)}`);
    } else {
      this.logger.log(`[PERFORMANCE] ${performanceData.method} ${performanceData.url} - ${performanceData.executionTime}ms`);
    }
  }

  private generateRequestId(): string {
    return `perf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
