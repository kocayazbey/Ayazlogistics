import { Module } from '@nestjs/common';
import { RequestIdMiddleware } from '../middleware/request-id.middleware';
import { TraceContextInterceptor } from '../interceptors/trace-context.interceptor';
import { SloTrackingInterceptor } from '../interceptors/slo-tracking.interceptor';
import { LgtmStackService } from '../services/lgtm-stack.service';
import { PrometheusRedUseService } from '../services/prometheus-red-use.service';
import { SloMonitoringService } from '../services/slo-monitoring.service';
import { LgtmStackController } from '../controllers/lgtm-stack.controller';
import { PrometheusRedUseController } from '../controllers/prometheus-red-use.controller';
import { SloMonitoringController } from '../controllers/slo-monitoring.controller';

@Module({
  providers: [
    RequestIdMiddleware,
    TraceContextInterceptor,
    SloTrackingInterceptor,
    LgtmStackService,
    PrometheusRedUseService,
    SloMonitoringService,
  ],
  controllers: [
    LgtmStackController,
    PrometheusRedUseController,
    SloMonitoringController,
  ],
  exports: [
    RequestIdMiddleware,
    TraceContextInterceptor,
    SloTrackingInterceptor,
    LgtmStackService,
    PrometheusRedUseService,
    SloMonitoringService,
  ],
})
export class ObservabilityModule {}
