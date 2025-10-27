import { Module } from '@nestjs/common';
import { MonitoringController } from './controllers/monitoring.controller';
import { PickingCartController } from './controllers/picking-cart.controller';
import { ForkliftController } from './controllers/forklift.controller';
import { PackagingController } from './controllers/packaging.controller';
import { YardController } from './controllers/yard.controller';
import { CarrierController } from './controllers/carrier.controller';
import { BarcodeController } from './controllers/barcode.controller';
import { PerformanceController } from './controllers/performance.controller';
import { CycleCountAdvancedController } from './controllers/cycle-count-advanced.controller';
import { ShippingAdvancedController } from './controllers/shipping-advanced.controller';
import { ZoneController } from './controllers/zone.controller';
import { SupervisorController } from './controllers/supervisor.controller';
import { ProductionController } from './controllers/production.controller';
import { WorkflowController } from './controllers/workflow.controller';

import { RealTimeMonitoringService } from '../ayaz-wms/monitoring/real-time-monitoring.service';
import { PickingCartService } from '../ayaz-wms/picking-cart/picking-cart.service';
import { ForkliftService } from '../ayaz-wms/forklift/forklift.service';
import { PackagingService } from '../ayaz-wms/packaging/packaging.service';
import { YardManagementService } from '../ayaz-wms/yard-management/yard.service';
import { CarrierService } from '../ayaz-wms/carrier/carrier.service';
import { BarcodeManagementService } from '../ayaz-wms/barcode/barcode-management.service';
import { PerformanceReportingService } from '../ayaz-wms/performance/performance-reporting.service';
import { CycleCountAdvancedService } from '../ayaz-wms/cycle-count-advanced/cycle-count-advanced.service';
import { ShippingAdvancedService } from '../ayaz-wms/shipping-advanced/shipping-advanced.service';
import { ZoneManagementService } from '../ayaz-wms/location-zone/zone-management.service';
import { SupervisorOperationsService } from '../ayaz-wms/supervisor-mobile/supervisor-operations.service';
import { ProductionIntegrationService } from '../ayaz-wms/production/production-integration.service';
import { WorkflowEngineService } from '../ayaz-wms/workflow/workflow-engine.service';

@Module({
  controllers: [
    MonitoringController,
    PickingCartController,
    ForkliftController,
    PackagingController,
    YardController,
    CarrierController,
    BarcodeController,
    PerformanceController,
    CycleCountAdvancedController,
    ShippingAdvancedController,
    ZoneController,
    SupervisorController,
    ProductionController,
    WorkflowController,
  ],
  providers: [
    RealTimeMonitoringService,
    PickingCartService,
    ForkliftService,
    PackagingService,
    YardManagementService,
    CarrierService,
    BarcodeManagementService,
    PerformanceReportingService,
    CycleCountAdvancedService,
    ShippingAdvancedService,
    ZoneManagementService,
    SupervisorOperationsService,
    ProductionIntegrationService,
    WorkflowEngineService,
  ],
  exports: [
    RealTimeMonitoringService,
    PickingCartService,
    ForkliftService,
    PackagingService,
    YardManagementService,
    CarrierService,
    ZoneManagementService,
    SupervisorOperationsService,
    ProductionIntegrationService,
    WorkflowEngineService,
  ],
})
export class WMSAdvancedModule {}

