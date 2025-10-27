import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { FieldOperationsService } from './field-operations.service';
import { CreateOfflineOperationDto } from './dto/create-offline-operation.dto';
import { CreateProofOfDeliveryDto } from './dto/create-proof-of-delivery.dto';
import { CreateElectronicSignatureDto } from './dto/create-electronic-signature.dto';
import { CreateGeofenceDto } from './dto/create-geofence.dto';
import { CreateGeofenceEventDto } from './dto/create-geofence-event.dto';

@ApiTags('Mobile Field Operations')
@Controller({ path: 'mobile/field-operations', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FieldOperationsController {
  constructor(private readonly fieldOperationsService: FieldOperationsService) {}

  @Get('dashboard')
  @Roles('admin', 'field_manager', 'driver', 'viewer')
  @ApiOperation({ summary: 'Get field operations dashboard' })
  @ApiResponse({ status: 200, description: 'Field operations dashboard retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getFieldOperationsDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { startDate: string; endDate: string }
  ) {
    const period = {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    };
    return this.fieldOperationsService.getFieldOperationsDashboard(tenantId, period);
  }

  @Post('offline-operations')
  @Roles('admin', 'field_manager', 'driver')
  @ApiOperation({ summary: 'Create offline operation' })
  @ApiResponse({ status: 201, description: 'Offline operation created successfully' })
  async createOfflineOperation(
    @Body() createOfflineOperationDto: CreateOfflineOperationDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.fieldOperationsService.createOfflineOperation({ ...createOfflineOperationDto, tenantId });
  }

  @Get('offline-operations')
  @Roles('admin', 'field_manager', 'driver', 'viewer')
  @ApiOperation({ summary: 'Get offline operations' })
  @ApiResponse({ status: 200, description: 'Offline operations retrieved successfully' })
  @ApiQuery({ name: 'driverId', required: false, type: String })
  async getOfflineOperations(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { driverId?: string }
  ) {
    return this.fieldOperationsService.getOfflineOperations(tenantId, query.driverId);
  }

  @Post('offline-operations/sync')
  @Roles('admin', 'field_manager', 'driver')
  @ApiOperation({ summary: 'Sync offline operations' })
  @ApiResponse({ status: 200, description: 'Offline operations synced successfully' })
  async syncOfflineOperations(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('driverId') driverId: string
  ) {
    const syncedCount = await this.fieldOperationsService.syncOfflineOperations(tenantId, driverId);
    return { message: `Synced ${syncedCount} offline operations` };
  }

  @Post('proof-of-delivery')
  @Roles('admin', 'field_manager', 'driver')
  @ApiOperation({ summary: 'Create proof of delivery' })
  @ApiResponse({ status: 201, description: 'Proof of delivery created successfully' })
  async createProofOfDelivery(
    @Body() createProofOfDeliveryDto: CreateProofOfDeliveryDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.fieldOperationsService.createProofOfDelivery({ ...createProofOfDeliveryDto, tenantId });
  }

  @Post('electronic-signatures')
  @Roles('admin', 'field_manager', 'driver')
  @ApiOperation({ summary: 'Create electronic signature' })
  @ApiResponse({ status: 201, description: 'Electronic signature created successfully' })
  async createElectronicSignature(
    @Body() createElectronicSignatureDto: CreateElectronicSignatureDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.fieldOperationsService.createElectronicSignature({ ...createElectronicSignatureDto, tenantId });
  }

  @Post('geofences')
  @Roles('admin', 'field_manager')
  @ApiOperation({ summary: 'Create geofence' })
  @ApiResponse({ status: 201, description: 'Geofence created successfully' })
  async createGeofence(
    @Body() createGeofenceDto: CreateGeofenceDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.fieldOperationsService.createGeofence({ ...createGeofenceDto, tenantId });
  }

  @Get('geofences')
  @Roles('admin', 'field_manager', 'driver', 'viewer')
  @ApiOperation({ summary: 'Get geofences' })
  @ApiResponse({ status: 200, description: 'Geofences retrieved successfully' })
  async getGeofences(@CurrentUser('tenantId') tenantId: string) {
    return this.fieldOperationsService.getGeofences(tenantId);
  }

  @Post('geofence-events')
  @Roles('admin', 'field_manager', 'driver')
  @ApiOperation({ summary: 'Create geofence event' })
  @ApiResponse({ status: 201, description: 'Geofence event created successfully' })
  async createGeofenceEvent(
    @Body() createGeofenceEventDto: CreateGeofenceEventDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.fieldOperationsService.createGeofenceEvent({ ...createGeofenceEventDto, tenantId });
  }
}
