import { Injectable, NestInterceptor, ExecutionContext, CallHandler, Logger } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { SloMonitoringService } from '../services/slo-monitoring.service';

@Injectable()
export class SloTrackingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('SloTrackingInterceptor');

  constructor(private readonly sloMonitoringService: SloMonitoringService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();
    const endpoint = request.route?.path || request.url;
    const method = request.method;
    
    // Determine SLO based on endpoint
    const sloName = this.getSloName(endpoint, method);
    
    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - startTime;
        this.sloMonitoringService.recordRequest(sloName, true, duration);
        this.logger.debug(`SLO tracked for ${sloName}: success, ${duration}ms`);
      }),
      catchError((error) => {
        const duration = Date.now() - startTime;
        this.sloMonitoringService.recordRequest(sloName, false, duration);
        this.logger.error(`SLO tracked for ${sloName}: failure, ${duration}ms`, error);
        throw error;
      })
    );
  }

  private getSloName(endpoint: string, method: string): string {
    // Map endpoints to SLO names
    if (endpoint.includes('/auth/')) return 'auth-slo';
    if (endpoint.includes('/api/')) return 'api-slo';
    if (endpoint.includes('/health')) return 'health-slo';
    if (method === 'GET') return 'read-slo';
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return 'write-slo';
    
    return 'default-slo';
  }
}
