import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { FinOpsService } from './finops.service';
import { CreateCostRecordDto } from './dto/create-cost-record.dto';
import { CreateUnitEconomicsDto } from './dto/create-unit-economics.dto';
import { CreateCostOptimizationDto } from './dto/create-cost-optimization.dto';

@ApiTags('FinOps')
@Controller({ path: 'finops', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class FinOpsController {
  constructor(private readonly finOpsService: FinOpsService) {}

  @Get('dashboard')
  @Roles('admin', 'finops_manager', 'viewer')
  @ApiOperation({ summary: 'Get FinOps dashboard' })
  @ApiResponse({ status: 200, description: 'FinOps dashboard retrieved successfully' })
  async getFinOpsDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.finOpsService.getFinOpsDashboard(tenantId);
  }

  @Post('costs')
  @Roles('admin', 'finops_manager')
  @ApiOperation({ summary: 'Record cost' })
  @ApiResponse({ status: 201, description: 'Cost recorded successfully' })
  async recordCost(
    @Body() createCostRecordDto: CreateCostRecordDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.finOpsService.recordCost({ ...createCostRecordDto, tenantId });
  }

  @Get('costs')
  @Roles('admin', 'finops_manager', 'viewer')
  @ApiOperation({ summary: 'Get costs' })
  @ApiResponse({ status: 200, description: 'Costs retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getCosts(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { period?: string }
  ) {
    return this.finOpsService.getCosts(tenantId, query.period);
  }

  @Post('unit-economics')
  @Roles('admin', 'finops_manager')
  @ApiOperation({ summary: 'Record unit economics' })
  @ApiResponse({ status: 201, description: 'Unit economics recorded successfully' })
  async recordUnitEconomics(
    @Body() createUnitEconomicsDto: CreateUnitEconomicsDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.finOpsService.recordUnitEconomics({ ...createUnitEconomicsDto, tenantId });
  }

  @Get('unit-economics')
  @Roles('admin', 'finops_manager', 'viewer')
  @ApiOperation({ summary: 'Get unit economics' })
  @ApiResponse({ status: 200, description: 'Unit economics retrieved successfully' })
  @ApiQuery({ name: 'period', required: false, type: String })
  async getUnitEconomics(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { period?: string }
  ) {
    return this.finOpsService.getUnitEconomics(tenantId, query.period);
  }

  @Post('cost-optimizations')
  @Roles('admin', 'finops_manager')
  @ApiOperation({ summary: 'Create cost optimization' })
  @ApiResponse({ status: 201, description: 'Cost optimization created successfully' })
  async createCostOptimization(
    @Body() createCostOptimizationDto: CreateCostOptimizationDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.finOpsService.createCostOptimization({ ...createCostOptimizationDto, tenantId });
  }

  @Get('cost-optimizations')
  @Roles('admin', 'finops_manager', 'viewer')
  @ApiOperation({ summary: 'Get cost optimizations' })
  @ApiResponse({ status: 200, description: 'Cost optimizations retrieved successfully' })
  async getCostOptimizations(@CurrentUser('tenantId') tenantId: string) {
    return this.finOpsService.getCostOptimizations(tenantId);
  }
}
