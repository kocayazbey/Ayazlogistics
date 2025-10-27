import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { SustainabilityService } from './sustainability.service';
import { CreateCarbonEmissionDto } from './dto/create-carbon-emission.dto';
import { CreateSustainabilityGoalDto } from './dto/create-sustainability-goal.dto';

@ApiTags('Sustainability')
@Controller({ path: 'sustainability', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class SustainabilityController {
  constructor(private readonly sustainabilityService: SustainabilityService) {}

  @Get('dashboard')
  @Roles('admin', 'sustainability_manager', 'viewer')
  @ApiOperation({ summary: 'Get sustainability dashboard' })
  @ApiResponse({ status: 200, description: 'Sustainability dashboard retrieved successfully' })
  async getSustainabilityDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.sustainabilityService.getSustainabilityDashboard(tenantId);
  }

  @Post('carbon-emissions')
  @Roles('admin', 'sustainability_manager')
  @ApiOperation({ summary: 'Record carbon emission' })
  @ApiResponse({ status: 201, description: 'Carbon emission recorded successfully' })
  async recordCarbonEmission(
    @Body() createCarbonEmissionDto: CreateCarbonEmissionDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.sustainabilityService.recordCarbonEmission({ ...createCarbonEmissionDto, tenantId });
  }

  @Get('carbon-emissions')
  @Roles('admin', 'sustainability_manager', 'viewer')
  @ApiOperation({ summary: 'Get carbon emissions' })
  @ApiResponse({ status: 200, description: 'Carbon emissions retrieved successfully' })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  async getCarbonEmissions(
    @CurrentUser('tenantId') tenantId: string,
    @Query() query: { startDate?: string; endDate?: string }
  ) {
    return this.sustainabilityService.getCarbonEmissions(
      tenantId,
      query.startDate ? new Date(query.startDate) : undefined,
      query.endDate ? new Date(query.endDate) : undefined
    );
  }

  @Post('sustainability-goals')
  @Roles('admin', 'sustainability_manager')
  @ApiOperation({ summary: 'Create sustainability goal' })
  @ApiResponse({ status: 201, description: 'Sustainability goal created successfully' })
  async createSustainabilityGoal(
    @Body() createSustainabilityGoalDto: CreateSustainabilityGoalDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.sustainabilityService.createSustainabilityGoal({ ...createSustainabilityGoalDto, tenantId });
  }

  @Get('sustainability-goals')
  @Roles('admin', 'sustainability_manager', 'viewer')
  @ApiOperation({ summary: 'Get sustainability goals' })
  @ApiResponse({ status: 200, description: 'Sustainability goals retrieved successfully' })
  async getSustainabilityGoals(@CurrentUser('tenantId') tenantId: string) {
    return this.sustainabilityService.getSustainabilityGoals(tenantId);
  }

  @Post('reports')
  @Roles('admin', 'sustainability_manager')
  @ApiOperation({ summary: 'Generate sustainability report' })
  @ApiResponse({ status: 201, description: 'Sustainability report generated successfully' })
  async generateSustainabilityReport(
    @Body() body: { period: string },
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.sustainabilityService.generateSustainabilityReport(tenantId, body.period);
  }
}
