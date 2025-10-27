import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { PerformanceMonitorService } from '../services/performance-monitor.service';
import { PERFORMANCE_KEY, PERFORMANCE_SKIP_KEY } from '../decorators/performance.decorator';

@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  constructor(private performanceMonitorService: PerformanceMonitorService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const performanceConfig = this.reflector.getAllAndOverride(PERFORMANCE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    const skipPerformance = this.reflector.getAllAndOverride(PERFORMANCE_SKIP_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipPerformance || !performanceConfig) {
      return next.handle();
    }

    const startTime = Date.now();
    const startMemory = process.memoryUsage();
    const startCpu = process.cpuUsage();
    
    const service = context.getClass().name;
    const method = context.getHandler().name;

    return next.handle().pipe(
      tap(async (data) => {
        try {
          const duration = Date.now() - startTime;
          const memoryUsage = process.memoryUsage().heapUsed - startMemory.heapUsed;
          const cpuUsage = process.cpuUsage(startCpu).user + process.cpuUsage(startCpu).system;

          await this.performanceMonitorService.recordMetric({
            service,
            method,
            duration,
            memoryUsage,
            cpuUsage,
            success: true,
          });

          // Log slow operations if configured
          if (performanceConfig.logSlow && duration > (performanceConfig.slowThreshold || 1000)) {
            this.logger.warn(
              `Slow operation: ${service}.${method} took ${duration}ms`
            );
          }

        } catch (error) {
          this.logger.error('Failed to record performance metric', error.stack);
        }
      }),
      catchError(async (error) => {
        try {
          const duration = Date.now() - startTime;
          const memoryUsage = process.memoryUsage().heapUsed - startMemory.heapUsed;
          const cpuUsage = process.cpuUsage(startCpu).user + process.cpuUsage(startCpu).system;

          await this.performanceMonitorService.recordMetric({
            service,
            method,
            duration,
            memoryUsage,
            cpuUsage,
            success: false,
            error: error.message,
          });

        } catch (recordError) {
          this.logger.error('Failed to record performance metric for error', recordError.stack);
        }

        throw error;
      })
    );
  }
}