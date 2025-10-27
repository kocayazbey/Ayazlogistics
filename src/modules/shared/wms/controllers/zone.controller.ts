import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { ZoneManagementService } from '../../ayaz-wms/location-zone/zone-management.service';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { WmsPermissionGuard } from '../guards/wms-permission.guard';
import { WmsPermissions, WMS_PERMISSIONS } from '../decorators/wms-permissions.decorator';
import { AuditLoggingInterceptor } from '../../../../common/interceptors/audit-logging.interceptor';

@ApiTags('WMS Zone Management')
@Controller({ path: 'wms/zones', version: '1' })
@UseGuards(JwtAuthGuard, WmsPermissionGuard)
@UseInterceptors(AuditLoggingInterceptor)
@ApiBearerAuth()
export class ZoneController {
  constructor(private readonly zoneService: ZoneManagementService) {}

  @Post('bulk-create-locations')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_BULK_CREATE)
  @ApiOperation({ summary: 'Bulk create locations (Toplu Göz Oluşturma)' })
  async bulkCreate(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.bulkCreateLocations(data, userId);
  }

  @Post()
  @WmsPermissions(WMS_PERMISSIONS.ZONE_CREATE)
  @ApiOperation({ summary: 'Create zone' })
  async createZone(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.createZone(data, userId);
  }

  @Post('picking-routes')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_ROUTE_CREATE)
  @ApiOperation({ summary: 'Create picking route' })
  async createRoute(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.createPickingRoute(data, userId);
  }

  @Post('putaway-strategies')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_STRATEGY_CREATE)
  @ApiOperation({ summary: 'Create putaway strategy' })
  async createStrategy(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.createPutawayStrategy(data, userId);
  }

  @Post('evaluate-putaway')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_MANAGE)
  @ApiOperation({ summary: 'Evaluate putaway strategy for product' })
  async evaluatePutaway(@Body() data: any) {
    return this.zoneService.evaluatePutawayStrategy(data);
  }

  @Post('location-groups')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_CREATE)
  @ApiOperation({ summary: 'Create location group' })
  async createGroup(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.createLocationGroup(data, userId);
  }

  @Post('toggle-locations')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_MANAGE)
  @ApiOperation({ summary: 'Bulk toggle locations (open/close)' })
  async toggleLocations(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.bulkToggleLocations(data, userId);
  }

  @Post('bulk-update-locations')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_MANAGE)
  @ApiOperation({ summary: 'Bulk update location attributes' })
  async bulkUpdate(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.bulkUpdateLocations(data, userId);
  }

  @Post('reorganize-picking')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_MANAGE)
  @ApiOperation({ summary: 'Reorganize picking areas (ABC analysis)' })
  async reorganize(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.reorganizePickingAreas(data, userId);
  }

  @Post('define-capacities')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_MANAGE)
  @ApiOperation({ summary: 'Define location capacities' })
  async defineCapacities(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.defineLocationCapacities(data, userId);
  }

  @Post('height-groups')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_CREATE)
  @ApiOperation({ summary: 'Define height groups' })
  async defineHeightGroups(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.defineHeightGroups(data, userId);
  }

  @Post('putaway-levels')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_STRATEGY_CREATE)
  @ApiOperation({ summary: 'Define putaway level preferences' })
  async definePutawayLevels(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.definePutawayLevels(data, userId);
  }

  @Post('forklift-work-areas')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_MANAGE)
  @ApiOperation({ summary: 'Assign forklift working areas' })
  async assignWorkAreas(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.assignForkliftWorkAreas(data, userId);
  }

  @Post('tt-reverse-locations')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_CREATE)
  @ApiOperation({ summary: 'Define TT reverse entry locations' })
  async defineTTReverse(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.defineTTReverseLocations(data, userId);
  }

  @Post('special-zones')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_CREATE)
  @ApiOperation({ summary: 'Define special zone (hazmat, cold, etc)' })
  async defineSpecialZone(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.defineSpecialZone(data, userId);
  }

  @Post('crossdock-assignment')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_MANAGE)
  @ApiOperation({ summary: 'Assign customer to cross-dock location' })
  async assignCrossDock(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.assignCustomerToCrossDock(data, userId);
  }

  @Post('picking-areas')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_CREATE)
  @ApiOperation({ summary: 'Define picking area' })
  async definePickingArea(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.definePickingArea(data, userId);
  }

  @Post('shipping-docks')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_CREATE)
  @ApiOperation({ summary: 'Define shipping dock' })
  async defineShippingDock(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.defineShippingDock(data, userId);
  }

  @Post('priority-codes')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_MANAGE)
  @ApiOperation({ summary: 'Define shipment priority codes' })
  async definePriorityCodes(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.defineShipmentPriorityCodes(data, userId);
  }

  @Post('narrow-aisles')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_CREATE)
  @ApiOperation({ summary: 'Define narrow aisle' })
  async defineNarrowAisle(@Body() data: any, @CurrentUser('id') userId: string) {
    return this.zoneService.defineNarrowAisle(data, userId);
  }

  @Get(':zoneCode/summary')
  @WmsPermissions(WMS_PERMISSIONS.ZONE_VIEW)
  @ApiOperation({ summary: 'Get zone summary' })
  async getZoneSummary(@Param('zoneCode') zoneCode: string, @Query('warehouseId') warehouseId: string) {
    return this.zoneService.getZoneSummary(zoneCode, warehouseId);
  }
}

