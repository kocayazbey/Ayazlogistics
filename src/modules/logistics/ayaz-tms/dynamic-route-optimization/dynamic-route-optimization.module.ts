import { Module } from '@nestjs/common';
import { DynamicRouteOptimizationController } from './dynamic-route-optimization.controller';
import { DynamicRouteOptimizationService } from './dynamic-route-optimization.service';
import { DatabaseModule } from '../../../../core/database/database.module';
import { EventsModule } from '../../../../core/events/events.module';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
  ],
  controllers: [DynamicRouteOptimizationController],
  providers: [DynamicRouteOptimizationService],
  exports: [DynamicRouteOptimizationService],
})
export class DynamicRouteOptimizationModule {}
