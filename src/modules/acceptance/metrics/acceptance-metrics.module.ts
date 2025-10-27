import { Module } from '@nestjs/common';
import { AcceptanceMetricsController } from './acceptance-metrics.controller';
import { AcceptanceMetricsService } from './acceptance-metrics.service';

@Module({
  controllers: [AcceptanceMetricsController],
  providers: [AcceptanceMetricsService],
  exports: [AcceptanceMetricsService],
})
export class AcceptanceMetricsModule {}
