import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { SLAService } from './sla.service';
import { CreateSLADto } from './dto/create-sla.dto';
import { CreateSLODto } from './dto/create-slo.dto';
import { CreateSupportPlanDto } from './dto/create-support-plan.dto';
import { CreateMaintenanceWindowDto } from './dto/create-maintenance-window.dto';

@ApiTags('Corporate SLA/SLO')
@Controller({ path: 'corporate/sla', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SLAController {
  constructor(private readonly slaService: SLAService) {}

  @Post()
  @Roles('admin', 'sla_manager')
  @ApiOperation({ summary: 'Create SLA' })
  @ApiResponse({ status: 201, description: 'SLA created successfully' })
  async createSLA(
    @Body() createSLADto: CreateSLADto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.slaService.createSLA({ ...createSLADto, tenantId });
  }

  @Get()
  @Roles('admin', 'sla_manager', 'viewer')
  @ApiOperation({ summary: 'Get all SLAs' })
  @ApiResponse({ status: 200, description: 'SLAs retrieved successfully' })
  async getSLAs(@CurrentUser('tenantId') tenantId: string) {
    return this.slaService.getSLAs(tenantId);
  }

  @Post('slo')
  @Roles('admin', 'sla_manager')
  @ApiOperation({ summary: 'Create SLO' })
  @ApiResponse({ status: 201, description: 'SLO created successfully' })
  async createSLO(@Body() createSLODto: CreateSLODto) {
    return this.slaService.createSLO(createSLODto);
  }

  @Get('compliance/:slaId')
  @Roles('admin', 'sla_manager', 'viewer')
  @ApiOperation({ summary: 'Get SLA compliance metrics' })
  @ApiResponse({ status: 200, description: 'SLA compliance retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getSLACompliance(
    @Param('slaId') slaId: string,
    @Query() query: { startDate: string; endDate: string }
  ) {
    const period = {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    };
    return this.slaService.calculateSLACompliance(slaId, period);
  }

  @Post('support-plans')
  @Roles('admin', 'sla_manager')
  @ApiOperation({ summary: 'Create support plan' })
  @ApiResponse({ status: 201, description: 'Support plan created successfully' })
  async createSupportPlan(
    @Body() createSupportPlanDto: CreateSupportPlanDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.slaService.createSupportPlan({ ...createSupportPlanDto, tenantId });
  }

  @Get('support-plans/metrics')
  @Roles('admin', 'sla_manager', 'viewer')
  @ApiOperation({ summary: 'Get support plan metrics' })
  @ApiResponse({ status: 200, description: 'Support plan metrics retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: true, type: String })
  @ApiQuery({ name: 'endDate', required: true, type: String })
  async getSupportPlanMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { startDate: string; endDate: string }
  ) {
    const period = {
      start: new Date(query.startDate),
      end: new Date(query.endDate),
    };
    return this.slaService.getSupportPlanMetrics(tenantId, period);
  }

  @Post('maintenance-windows')
  @Roles('admin', 'sla_manager')
  @ApiOperation({ summary: 'Create maintenance window' })
  @ApiResponse({ status: 201, description: 'Maintenance window created successfully' })
  async createMaintenanceWindow(
    @Body() createMaintenanceWindowDto: CreateMaintenanceWindowDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.slaService.createMaintenanceWindow({ ...createMaintenanceWindowDto, tenantId });
  }

  @Get('maintenance-windows')
  @Roles('admin', 'sla_manager', 'viewer')
  @ApiOperation({ summary: 'Get maintenance windows' })
  @ApiResponse({ status: 200, description: 'Maintenance windows retrieved successfully' })
  @ApiQuery({ name: 'status', required: false, type: String })
  async getMaintenanceWindows(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { status?: string }
  ) {
    return this.slaService.getMaintenanceWindows(tenantId, query.status);
  }

  @Put('maintenance-windows/:id/status')
  @Roles('admin', 'sla_manager')
  @ApiOperation({ summary: 'Update maintenance window status' })
  @ApiResponse({ status: 200, description: 'Maintenance window status updated successfully' })
  async updateMaintenanceWindowStatus(
    @Param('id') id: string,
    @Body() body: { status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' }
  ) {
    return this.slaService.updateMaintenanceWindowStatus(id, body.status);
  }
}
