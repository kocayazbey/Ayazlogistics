import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { OpportunitiesService } from '../ayaz-crm/opportunities/opportunities.service';
import { CreateOpportunityDto } from '../ayaz-crm/opportunities/dto/create-opportunity.dto';
import { UpdateOpportunityDto } from '../ayaz-crm/opportunities/dto/update-opportunity.dto';

@ApiTags('CRM Opportunities')
@Controller({ path: 'crm/opportunities', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class OpportunitiesController {
  constructor(private readonly opportunitiesService: OpportunitiesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all opportunities' })
  @ApiQuery({ name: 'stage', required: false, description: 'Filter by opportunity stage' })
  @ApiQuery({ name: 'assignedTo', required: false, description: 'Filter by assigned user' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Opportunities retrieved successfully' })
  async getOpportunities(
    @Query('stage') stage?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.opportunitiesService.getOpportunities({
      tenantId,
      stage,
      assignedTo,
      search,
      page,
      limit
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get opportunities statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getOpportunitiesStats(@CurrentUser('tenantId') tenantId: string) {
    return this.opportunitiesService.getOpportunitiesStats(tenantId);
  }

  @Get('pipeline')
  @ApiOperation({ summary: 'Get sales pipeline' })
  @ApiResponse({ status: 200, description: 'Pipeline retrieved successfully' })
  async getSalesPipeline(@CurrentUser('tenantId') tenantId: string) {
    return this.opportunitiesService.getSalesPipeline(tenantId);
  }

  @Get('forecast')
  @ApiOperation({ summary: 'Get sales forecast' })
  @ApiQuery({ name: 'period', required: false, description: 'Forecast period' })
  @ApiResponse({ status: 200, description: 'Sales forecast retrieved successfully' })
  async getSalesForecast(
    @Query('period') period?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.opportunitiesService.getSalesForecast(tenantId, period);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get opportunity by ID' })
  @ApiResponse({ status: 200, description: 'Opportunity retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  async getOpportunity(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.opportunitiesService.getOpportunity(id, tenantId);
  }

  @Post()
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Create new opportunity' })
  @ApiResponse({ status: 201, description: 'Opportunity created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createOpportunity(
    @Body() createOpportunityDto: CreateOpportunityDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.opportunitiesService.createOpportunity(createOpportunityDto, userId, tenantId);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Update opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity updated successfully' })
  @ApiResponse({ status: 404, description: 'Opportunity not found' })
  async updateOpportunity(
    @Param('id') id: string,
    @Body() updateOpportunityDto: UpdateOpportunityDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.opportunitiesService.updateOpportunity(id, updateOpportunityDto, userId, tenantId);
  }

  @Post(':id/advance')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Advance opportunity stage' })
  @ApiResponse({ status: 200, description: 'Opportunity advanced successfully' })
  @ApiResponse({ status: 400, description: 'Opportunity cannot be advanced' })
  async advanceOpportunity(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.opportunitiesService.advanceOpportunity(id, userId, tenantId);
  }

  @Post(':id/close')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Close opportunity' })
  @ApiResponse({ status: 200, description: 'Opportunity closed successfully' })
  @ApiResponse({ status: 400, description: 'Opportunity cannot be closed' })
  async closeOpportunity(
    @Param('id') id: string,
    @Body() closeData: { outcome: string; reason?: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.opportunitiesService.closeOpportunity(id, closeData, userId, tenantId);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get opportunity activities' })
  @ApiResponse({ status: 200, description: 'Activities retrieved successfully' })
  async getOpportunityActivities(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.opportunitiesService.getOpportunityActivities(id, tenantId);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get opportunity notes' })
  @ApiResponse({ status: 200, description: 'Notes retrieved successfully' })
  async getOpportunityNotes(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.opportunitiesService.getOpportunityNotes(id, tenantId);
  }

  @Post(':id/notes')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Add note to opportunity' })
  @ApiResponse({ status: 201, description: 'Note added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid note data' })
  async addOpportunityNote(
    @Param('id') id: string,
    @Body() noteData: { content: string; type?: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.opportunitiesService.addOpportunityNote(id, noteData, userId, tenantId);
  }
}
