import { Controller, Get, Post, Body, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { OperationalExcellenceService } from './operational-excellence.service';
import { CreateDORAMetricsDto } from './dto/create-dora-metrics.dto';
import { CreateDeploymentDto } from './dto/create-deployment.dto';
import { CreateIncidentDto } from './dto/create-incident.dto';
import { CreateDisasterRecoveryDto } from './dto/create-disaster-recovery.dto';
import { UpdateDeploymentStatusDto } from './dto/update-deployment-status.dto';
import { UpdateIncidentStatusDto } from './dto/update-incident-status.dto';

@ApiTags('Operational Excellence')
@Controller({ path: 'operations/excellence', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OperationalExcellenceController {
  constructor(private readonly operationalExcellenceService: OperationalExcellenceService) {}

  @Get('dashboard')
  @Roles('admin', 'operations_manager', 'viewer')
  @ApiOperation({ summary: 'Get operational excellence dashboard' })
  @ApiResponse({ status: 200, description: 'Operational excellence dashboard retrieved successfully' })
  async getOperationalExcellenceDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.operationalExcellenceService.getOperationalExcellenceDashboard(tenantId);
  }

  @Post('dora-metrics')
  @Roles('admin', 'operations_manager')
  @ApiOperation({ summary: 'Record DORA metrics' })
  @ApiResponse({ status: 201, description: 'DORA metrics recorded successfully' })
  async recordDORAMetrics(
    @Body() createDORAMetricsDto: CreateDORAMetricsDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationalExcellenceService.recordDORAMetrics({ ...createDORAMetricsDto, tenantId });
  }

  @Get('dora-metrics')
  @Roles('admin', 'operations_manager', 'viewer')
  @ApiOperation({ summary: 'Get DORA metrics' })
  @ApiResponse({ status: 200, description: 'DORA metrics retrieved successfully' })
  async getDORAMetrics(@CurrentUser('tenantId') tenantId: string) {
    return this.operationalExcellenceService.getDORAMetrics(tenantId);
  }

  @Post('deployments')
  @Roles('admin', 'operations_manager')
  @ApiOperation({ summary: 'Create deployment' })
  @ApiResponse({ status: 201, description: 'Deployment created successfully' })
  async createDeployment(
    @Body() createDeploymentDto: CreateDeploymentDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationalExcellenceService.createDeployment({ ...createDeploymentDto, tenantId });
  }

  @Patch('deployments/:id/status')
  @Roles('admin', 'operations_manager')
  @ApiOperation({ summary: 'Update deployment status' })
  @ApiResponse({ status: 200, description: 'Deployment status updated successfully' })
  async updateDeploymentStatus(
    @Param('id') id: string,
    @Body() updateDeploymentStatusDto: UpdateDeploymentStatusDto
  ) {
    return this.operationalExcellenceService.updateDeploymentStatus(
      id,
      updateDeploymentStatusDto.status,
      updateDeploymentStatusDto.endTime,
      updateDeploymentStatusDto.rollbackTime
    );
  }

  @Post('incidents')
  @Roles('admin', 'operations_manager')
  @ApiOperation({ summary: 'Create incident' })
  @ApiResponse({ status: 201, description: 'Incident created successfully' })
  async createIncident(
    @Body() createIncidentDto: CreateIncidentDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationalExcellenceService.createIncident({ ...createIncidentDto, tenantId });
  }

  @Patch('incidents/:id/status')
  @Roles('admin', 'operations_manager')
  @ApiOperation({ summary: 'Update incident status' })
  @ApiResponse({ status: 200, description: 'Incident status updated successfully' })
  async updateIncidentStatus(
    @Param('id') id: string,
    @Body() updateIncidentStatusDto: UpdateIncidentStatusDto
  ) {
    return this.operationalExcellenceService.updateIncidentStatus(
      id,
      updateIncidentStatusDto.status,
      updateIncidentStatusDto.endTime,
      updateIncidentStatusDto.mttr,
      updateIncidentStatusDto.rootCause,
      updateIncidentStatusDto.resolution
    );
  }

  @Post('disaster-recovery')
  @Roles('admin', 'operations_manager')
  @ApiOperation({ summary: 'Create disaster recovery plan' })
  @ApiResponse({ status: 201, description: 'Disaster recovery plan created successfully' })
  async createDisasterRecovery(
    @Body() createDisasterRecoveryDto: CreateDisasterRecoveryDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.operationalExcellenceService.createDisasterRecovery({ ...createDisasterRecoveryDto, tenantId });
  }
}
