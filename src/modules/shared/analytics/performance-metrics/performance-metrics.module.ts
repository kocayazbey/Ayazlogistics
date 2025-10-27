import { Module } from '@nestjs/common';
import { PerformanceMetricsController } from './performance-metrics.controller';
import { PerformanceMetricsService } from './performance-metrics.service';
import { DatabaseModule } from '../../../../core/database/database.module';
import { EventsModule } from '../../../../core/events/events.module';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
  ],
  controllers: [PerformanceMetricsController],
  providers: [PerformanceMetricsService],
  exports: [PerformanceMetricsService],
})
export class PerformanceMetricsModule {}
