import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../core/database/database.module';

// Route Optimization
import { RouteOptimizationController } from './route-optimization/route-optimization.controller';
import { RouteOptimizationService } from './route-optimization/route-optimization.service';

// Dynamic Route Optimization
import { DynamicRouteOptimizationModule } from './dynamic-route-optimization/dynamic-route-optimization.module';

// Other Services
import { DeliveryTrackingService } from './delivery-tracking/delivery-tracking.service';
import { FreightCostService } from './freight-cost/freight-cost.service';
import { RateManagementService } from './rate-management/rate-management.service';
import { LoadPlanningService } from './load-planning/load-planning.service';
import { ConsolidationService } from './shipment-consolidation/consolidation.service';
import { TenderService } from './tender-management/tender.service';
import { CarrierService } from './carrier-management/carrier.service';
import { CrossDockService } from './cross-docking/cross-dock.service';
import { CustomsService } from './customs-clearance/customs.service';
import { DockSchedulerService } from './dock-scheduling/dock-scheduler.service';
import { DriverPerformanceService } from './driver-management/driver-performance.service';
import { DriverService } from './driver-management/driver.service';
import { FleetManagerService } from './fleet-management/fleet-manager.service';
import { FreightAuditService } from './freight-audit/freight-audit.service';
import { ForwarderService } from './freight-forwarding/forwarder.service';
import { GpsTrackingService } from './gps-tracking/gps-tracking.service';
import { LoadBoardService } from './load-matching/load-board.service';
import { TransportModeService } from './multimodal-transport/transport-mode.service';
import { VehicleService } from './vehicle-management/vehicle.service';

@Module({
  imports: [
    DatabaseModule,
    DynamicRouteOptimizationModule,
  ],
  controllers: [
    RouteOptimizationController,
  ],
  providers: [
    // Route Optimization
    RouteOptimizationService,
    
    // Core Services
    DeliveryTrackingService,
    FreightCostService,
    RateManagementService,
    LoadPlanningService,
    ConsolidationService,
    TenderService,
    
    // Management Services
    CarrierService,
    CrossDockService,
    CustomsService,
    DockSchedulerService,
    DriverPerformanceService,
    DriverService,
    FleetManagerService,
    FreightAuditService,
    ForwarderService,
    GpsTrackingService,
    LoadBoardService,
    TransportModeService,
    VehicleService,
  ],
  exports: [
    RouteOptimizationService,
    DeliveryTrackingService,
    FreightCostService,
    RateManagementService,
    LoadPlanningService,
    ConsolidationService,
    TenderService,
    CarrierService,
    CrossDockService,
    CustomsService,
    DockSchedulerService,
    DriverPerformanceService,
    DriverService,
    FleetManagerService,
    FreightAuditService,
    ForwarderService,
    GpsTrackingService,
    LoadBoardService,
    TransportModeService,
    VehicleService,
  ],
})
export class AyazTmsModule {}
