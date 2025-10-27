import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { MetricsService } from '../../../../core/metrics/metrics.service';

/**
 * WMS Performance Monitoring Interceptor
 * Tracks performance metrics for all WMS operations
 */
@Injectable()
export class WmsPerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger('WMS-Performance');

  constructor(private readonly metricsService: MetricsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    
    const operationType = this.extractOperationType(url);
    const startTime = Date.now();
    const startMemory = process.memoryUsage().heapUsed;

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          const memoryUsed = process.memoryUsage().heapUsed - startMemory;

          // Record metrics
          this.metricsService.recordHttpRequestDuration(
            operationType,
            method,
            'success',
            duration
          );

          this.metricsService.recordMemoryUsage(operationType, memoryUsed);

          // Log slow operations
          if (duration > 500) {
            this.logger.warn(
              `Slow WMS operation: ${operationType} took ${duration}ms, used ${this.formatBytes(memoryUsed)} memory`
            );
          }

          // Record operation count
          this.metricsService.incrementCounter(`wms_operations_total`, {
            operation: operationType,
            status: 'success',
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;

          this.metricsService.recordHttpRequestDuration(
            operationType,
            method,
            'error',
            duration
          );

          this.metricsService.incrementCounter(`wms_operations_total`, {
            operation: operationType,
            status: 'error',
            error_type: error.constructor.name,
          });

          this.logger.error(
            `WMS operation failed: ${operationType} - ${duration}ms - ${error.message}`
          );
        },
      }),
    );
  }

  private extractOperationType(url: string): string {
    if (url.includes('/receiving')) return 'receiving';
    if (url.includes('/picking')) return 'picking';
    if (url.includes('/putaway')) return 'putaway';
    if (url.includes('/packing')) return 'packing';
    if (url.includes('/shipping')) return 'shipping';
    if (url.includes('/inventory')) return 'inventory';
    if (url.includes('/warehouses')) return 'warehouse';
    if (url.includes('/cycle-count')) return 'cycle_count';
    return 'other';
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

