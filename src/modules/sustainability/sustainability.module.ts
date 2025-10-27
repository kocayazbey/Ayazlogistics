import { Module } from '@nestjs/common';
import { SustainabilityController } from './sustainability.controller';
import { CarbonTrackingService } from './carbon-tracking.service';

@Module({
  controllers: [SustainabilityController],
  providers: [CarbonTrackingService],
  exports: [CarbonTrackingService],
})
export class SustainabilityModule {}

