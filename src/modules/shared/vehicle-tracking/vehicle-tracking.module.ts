import { Module } from '@nestjs/common';
import { VehicleTrackingController } from './vehicle-tracking.controller';
import { VehicleTrackingService } from './vehicle-tracking.service';
import { DatabaseModule } from '../../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [VehicleTrackingController],
  providers: [VehicleTrackingService],
  exports: [VehicleTrackingService],
})
export class VehicleTrackingModule {}
