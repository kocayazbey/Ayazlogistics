import { Controller, Post, Get, Put, Body, Param, Query, UseGuards, UseFilters, UseInterceptors, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { PermissionGuard } from '../../../../common/guards/permission.guard';
import { TenantIsolationGuard } from '../../../../common/guards/tenant-isolation.guard';
import { RateLimitGuard } from '../../../../common/guards/rate-limit.guard';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { AuditInterceptor } from '../../../../common/interceptors/audit.interceptor';
import { PerformanceInterceptor } from '../../../../common/interceptors/performance.interceptor';
import { ResponseTransformInterceptor } from '../../../../common/interceptors/response-transform.interceptor';
import { 
  Audit, AuditCreate, AuditRead, AuditUpdate, AuditDelete,
  RequirePermissions, RequireRoles,
  RateLimit, RateLimitAPI, RateLimitSearch,
  Performance, TrackPerformance, PerformanceAlert,
  Security, SecurityStrict, SecurityModerate,
  Monitoring, MonitoringFull, MonitoringPerformance,
  Analytics, AnalyticsBusiness, AnalyticsTechnical,
  Tenant, TenantRequired, TenantIsolated,
  Validation, ValidationStrict, ValidationLoose,
  CacheKey, CacheKeyShort, CacheKeyMedium, CacheKeyLong,
  FeatureFlag, FeatureFlagEnabled, FeatureFlagDisabled,
  Versioning, Version, Deprecated, Breaking,
  Experimental, ExperimentalFeature, ExperimentalAudit,
  AI, AIGPT3, AIGPT4, AICache, AIAudit,
  Blockchain, Ethereum, Polygon, BlockchainAudit
} from '../../../../common/decorators';
import { TransportModeService } from '../../ayaz-tms/multimodal-transport/transport-mode.service';
import { CarrierManagementService } from '../../ayaz-tms/carrier-management/carrier.service';
import { ForwarderService } from '../../ayaz-tms/freight-forwarding/forwarder.service';
import { RateManagementService } from '../../ayaz-tms/rate-management/rate-management.service';
import { DockSchedulerService } from '../../ayaz-tms/dock-scheduling/dock-scheduler.service';
import { FleetManagerService } from '../../ayaz-tms/fleet-management/fleet-manager.service';
import { DriverPerformanceService } from '../../ayaz-tms/driver-management/driver-performance.service';
import { CustomsClearanceService } from '../../ayaz-tms/customs-clearance/customs.service';
import { TenderManagementService } from '../../ayaz-tms/tender-management/tender.service';
import { ConsolidationService } from '../../ayaz-tms/shipment-consolidation/consolidation.service';
import { LoadBoardService } from '../../ayaz-tms/load-matching/load-board.service';
import { FreightAuditService } from '../../ayaz-tms/freight-audit/freight-audit.service';
import { LoadPlanningService } from '../../ayaz-tms/load-planning/load-planning.service';
import { CrossDockService } from '../../ayaz-tms/cross-docking/cross-dock.service';

@ApiTags('TMS Extended')
@Controller({ path: 'tms/extended', version: '1' })
@UseGuards(JwtAuthGuard, TenantIsolationGuard, PermissionGuard, RateLimitGuard)
@UseInterceptors(AuditInterceptor, PerformanceInterceptor, ResponseTransformInterceptor)
@SecurityStrict()
@MonitoringFull()
@AnalyticsBusiness()
@TenantIsolated()
@TrackPerformance()
@RateLimitAPI()
@ApiBearerAuth()
export class TMSExtendedController {
  private readonly logger = new Logger(TMSExtendedController.name);
  constructor(
    private readonly transportMode: TransportModeService,
    private readonly carrier: CarrierManagementService,
    private readonly forwarder: ForwarderService,
    private readonly rateManagement: RateManagementService,
    private readonly dockScheduler: DockSchedulerService,
    private readonly fleetManager: FleetManagerService,
    private readonly driverPerformance: DriverPerformanceService,
    private readonly customs: CustomsClearanceService,
    private readonly tender: TenderManagementService,
    private readonly consolidation: ConsolidationService,
    private readonly loadBoard: LoadBoardService,
    private readonly freightAudit: FreightAuditService,
    private readonly loadPlanning: LoadPlanningService,
    private readonly crossDock: CrossDockService,
  ) {}

  @Post('multimodal/plan')
  @ApiOperation({ 
    summary: 'Plan multimodal route',
    description: 'Plan optimal multimodal transportation route with comprehensive validation and security controls'
  })
  @ApiResponse({ status: 200, description: 'Route planned successfully' })
  @ApiResponse({ status: 400, description: 'Bad Request - Invalid input data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 429, description: 'Too Many Requests' })
  @ApiResponse({ status: 500, description: 'Internal Server Error' })
  @AuditCreate('multimodal_route')
  @RequirePermissions('tms:multimodal:create')
  @RequireRoles('admin', 'manager', 'logistics_manager')
  @TrackPerformance()
  @SecurityModerate()
  @MonitoringPerformance()
  @AnalyticsBusiness()
  @TenantRequired()
  @ValidationStrict()
  @RateLimitAPI()
  @CacheKeyMedium('multimodal_plan')
  async planMultimodal(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string
  ) {
    try {
      this.logger.log(`Planning multimodal route for tenant: ${tenantId} by user: ${userId}`);
      
      if (!tenantId || !userId) {
        throw new HttpException('Tenant ID and User ID are required', HttpStatus.BAD_REQUEST);
      }

      if (!data.origin || !data.destination || !data.cargoDetails) {
        throw new HttpException('Origin, destination, and cargo details are required', HttpStatus.BAD_REQUEST);
      }

      const result = await this.transportMode.planMultimodalRoute(
        data.origin,
        data.destination,
        data.cargoDetails,
        data.preferences
      );

      this.logger.log(`Successfully planned multimodal route for tenant: ${tenantId}`);
      return result;
    } catch (error) {
      this.logger.error(`Failed to plan multimodal route for tenant ${tenantId}:`, error);
      throw new HttpException(
        `Failed to plan multimodal route: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }
  }

  @Get('carriers')
  async getCarriers(@Query('mode') mode: string, @Query('serviceType') serviceType: string) {
    return await this.carrier.getCarriers(mode, serviceType);
  }

  @Post('carriers/request-bids')
  async requestBids(@Body() data: any) {
    return await this.carrier.requestBids(data);
  }

  @Post('forwarding/shipment')
  async createForwarding(@Body() data: any) {
    return await this.forwarder.createForwardingShipment(data);
  }

  @Post('forwarding/commission')
  async calculateCommission(@Body() data: any) {
    return await this.forwarder.calculateCommission(data.freightCost, data.mode, data.serviceType);
  }

  @Get('rates/contract')
  async getContractRate(@Query() query: any) {
    return await this.rateManagement.getApplicableRate(
      query.customerId,
      query.mode,
      query.origin,
      query.destination,
      query.date ? new Date(query.date) : new Date()
    );
  }

  @Post('rates/spot-quote')
  async generateSpotQuote(@Body() data: any) {
    return await this.rateManagement.generateSpotQuote(data);
  }

  @Post('dock/schedule')
  async scheduleDock(@Body() data: any) {
    return await this.dockScheduler.scheduleAppointment(data);
  }

  @Post('dock/check-in/:appointmentId')
  async checkIn(@Param('appointmentId') id: string) {
    return await this.dockScheduler.checkInVehicle(id);
  }

  @Post('fleet/maintenance')
  async scheduleMaintenance(@Body() data: any) {
    return await this.fleetManager.scheduleMaintenance(data);
  }

  @Get('fleet/fuel-efficiency/:vehicleId')
  async getFuelEfficiency(@Param('vehicleId') id: string, @Query() query: any) {
    return await this.fleetManager.calculateFuelEfficiency(
      id,
      new Date(query.startDate),
      new Date(query.endDate)
    );
  }

  @Get('drivers/performance/:driverId')
  async getDriverPerformance(@Param('driverId') id: string, @Query() query: any) {
    return await this.driverPerformance.getDriverPerformance(
      id,
      new Date(query.startDate),
      new Date(query.endDate)
    );
  }

  @Post('drivers/safety-event')
  async recordSafetyEvent(@Body() data: any) {
    return await this.driverPerformance.recordSafetyEvent(data);
  }

  @Post('customs/declaration')
  async createCustomsDeclaration(@Body() data: any) {
    return await this.customs.createDeclaration(data);
  }

  @Post('customs/calculate-duties')
  async calculateDuties(@Body() data: any) {
    return await this.customs.calculateDutiesAndTaxes(data);
  }

  @Post('tender/create')
  async createTender(@Body() data: any) {
    return await this.tender.createTender(data);
  }

  @Post('tender/:id/publish')
  async publishTender(@Param('id') id: string, @Body() data: { invitedCarriers: string[] }) {
    return await this.tender.publishTender(id, data.invitedCarriers);
  }

  @Post('consolidation/find-opportunities')
  async findConsolidation(@Body() data: { shipments: any[] }) {
    return await this.consolidation.findConsolidationOpportunities(data.shipments);
  }

  @Post('load-board/post')
  async postLoad(@Body() data: any) {
    return await this.loadBoard.postLoad(data);
  }

  @Post('load-board/match')
  async matchLoads(@Body() data: any) {
    return await this.loadBoard.matchLoadsWithCapacity(data.loads, data.capacity);
  }

  @Post('audit/invoice')
  async auditInvoice(@Body() data: any) {
    return await this.freightAudit.auditInvoice(data.invoice, data.shipmentData);
  }

  @Post('audit/dispute')
  @ApiOperation({ summary: 'Dispute freight invoice' })
  async disputeInvoice(@Body() data: any) {
    return await this.freightAudit.disputeInvoice(data.invoiceId, data.reason, data.disputedAmount);
  }

  @Get('audit/summary')
  @ApiOperation({ summary: 'Get freight audit summary' })
  async getAuditSummary(@Query() query: any) {
    return await this.freightAudit.getAuditSummary(
      new Date(query.startDate),
      new Date(query.endDate)
    );
  }

  @Post('load-planning/optimize')
  @ApiOperation({ summary: 'Optimize load planning' })
  async optimizeLoadPlanning(@Body() data: any) {
    return await this.loadPlanning.optimizeLoad(data.items, data.vehicles);
  }

  @Post('load-planning/consolidate')
  @ApiOperation({ summary: 'Consolidate shipments' })
  async consolidateShipments(@Body() data: any) {
    return await this.loadPlanning.consolidateShipments(data.shipments);
  }

  @Get('load-planning/suggestions')
  @ApiOperation({ summary: 'Get load optimization suggestions' })
  async getLoadSuggestions(@Query() query: any) {
    return await this.loadPlanning.suggestLoadOptimization(
      query.currentLoad,
      query.vehicle
    );
  }

  @Post('cross-dock/schedule')
  @ApiOperation({ summary: 'Schedule cross-dock operation' })
  async scheduleCrossDock(@Body() data: any) {
    return await this.crossDock.scheduleCrossDock(data);
  }

  @Post('cross-dock/optimize')
  @ApiOperation({ summary: 'Optimize cross-dock schedule' })
  async optimizeCrossDock(@Body() data: any) {
    return await this.crossDock.optimizeCrossDockSchedule(data.operations);
  }

  @Get('cross-dock/performance/:warehouseId')
  @ApiOperation({ summary: 'Get cross-dock performance metrics' })
  async getCrossDockPerformance(
    @Param('warehouseId') warehouseId: string,
    @Query('date') date: string
  ) {
    return await this.crossDock.trackCrossDockPerformance(
      warehouseId,
      new Date(date)
    );
  }

  @Get('forwarding/:shipmentId/track')
  @ApiOperation({ summary: 'Track forwarding shipment' })
  async trackForwarding(@Param('shipmentId') shipmentId: string) {
    return await this.forwarder.trackForwardingShipment(shipmentId);
  }

  @Get('forwarding/commission-report')
  @ApiOperation({ summary: 'Get commission report' })
  async getCommissionReport(@Query() query: any) {
    return await this.forwarder.getCommissionReport(
      new Date(query.startDate),
      new Date(query.endDate)
    );
  }

  @Get('load-board/backhaul/:vehicleId')
  @ApiOperation({ summary: 'Find backhaul opportunities' })
  async findBackhaul(
    @Param('vehicleId') vehicleId: string,
    @Query() query: any
  ) {
    return await this.loadBoard.getBackhaulOpportunities(
      vehicleId,
      query.deliveryLocation,
      query.homeBase
    );
  }

  @Post('load-board/optimize')
  @ApiOperation({ summary: 'Optimize load matching' })
  async optimizeLoadMatching(@Body() data: any) {
    return await this.loadBoard.optimizeLoadMatching(data.loads, data.capacity);
  }

  @Get('fleet/health/:vehicleId')
  @ApiOperation({ summary: 'Get vehicle health score' })
  async getVehicleHealth(@Param('vehicleId') vehicleId: string) {
    return await this.fleetManager.getVehicleHealthScore(vehicleId);
  }

  @Post('fleet/maintenance/predict')
  @ApiOperation({ summary: 'Predict maintenance needs' })
  async predictMaintenance(@Body() data: any) {
    return await this.fleetManager.predictMaintenanceNeeds(data.vehicleId);
  }

  @Get('fleet/utilization')
  @ApiOperation({ summary: 'Get fleet utilization report' })
  async getFleetUtilization(@Query() query: any) {
    return await this.fleetManager.getFleetUtilization(
      new Date(query.startDate),
      new Date(query.endDate)
    );
  }

  @Get('carriers/performance/:carrierId')
  @ApiOperation({ summary: 'Track carrier performance' })
  async trackCarrierPerformance(
    @Param('carrierId') carrierId: string,
    @Query() query: any
  ) {
    return await this.carrier.trackCarrierPerformance(
      carrierId,
      new Date(query.startDate),
      new Date(query.endDate)
    );
  }

  @Post('carriers/select')
  @ApiOperation({ summary: 'Select best carrier from bids' })
  async selectCarrier(@Body() data: any) {
    return await this.carrier.selectCarrier(data.bids, data.criteria);
  }

  @Post('tender/:id/award')
  @ApiOperation({ summary: 'Award tender to carrier' })
  async awardTender(@Param('id') id: string, @Body() data: any) {
    return await this.tender.awardTender(id, data.bidId);
  }

  @Get('tender/:id/evaluate')
  @ApiOperation({ summary: 'Evaluate tender bids' })
  async evaluateTenderBids(@Param('id') tenderId: string) {
    return await this.tender.evaluateBids(tenderId);
  }
}

