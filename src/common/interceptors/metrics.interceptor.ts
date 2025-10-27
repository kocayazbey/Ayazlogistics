import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrometheusService } from '../../core/metrics/prometheus.service';

@Injectable()
export class MetricsInterceptor implements NestInterceptor {
  constructor(private readonly prometheus: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const start = Date.now();

    this.prometheus.activeConnections.inc();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - start;
          const method = request.method;
          const route = request.route?.path || request.url;
          const status = response.statusCode;

          this.prometheus.recordRequest(method, route, status, duration);
          this.prometheus.activeConnections.dec();
        },
        error: (error) => {
          const duration = Date.now() - start;
          const method = request.method;
          const route = request.route?.path || request.url;
          const status = error.status || 500;

          this.prometheus.recordRequest(method, route, status, duration);
          this.prometheus.activeConnections.dec();
        },
      }),
    );
  }
}

