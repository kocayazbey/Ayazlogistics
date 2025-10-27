import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './services/analytics.service';
import { DashboardService } from '../ayaz-analytics/dashboards/dashboard.service';
import { KPIService } from '../ayaz-analytics/kpi/kpi.service';
import { DatabaseModule } from '../../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, DashboardService, KPIService],
  exports: [AnalyticsService, DashboardService, KPIService],
})
export class AnalyticsModule {}

