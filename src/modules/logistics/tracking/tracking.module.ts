import { Module } from '@nestjs/common';
import { TrackingController } from './tracking.controller';
import { VehicleTrackingService } from '../../../modules/logistics/ayaz-tracking/vehicle-tracking/vehicle-tracking.service';
import { GeofencingService } from '../../../modules/logistics/ayaz-tracking/geofencing/geofencing.service';
import { SlaMonitoringService } from '../../../modules/logistics/ayaz-tracking/sla-monitoring/sla-monitoring.service';

@Module({
  controllers: [TrackingController],
  providers: [VehicleTrackingService, GeofencingService, SlaMonitoringService],
  exports: [VehicleTrackingService, GeofencingService, SlaMonitoringService],
})
export class TrackingModule {}

