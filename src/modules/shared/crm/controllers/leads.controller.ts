import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { LeadsService } from '../ayaz-crm/leads/leads.service';
import { CreateLeadDto } from '../ayaz-crm/leads/dto/create-lead.dto';
import { UpdateLeadDto } from '../ayaz-crm/leads/dto/update-lead.dto';

@ApiTags('CRM Leads')
@Controller({ path: 'crm/leads', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all leads' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by lead status' })
  @ApiQuery({ name: 'source', required: false, description: 'Filter by lead source' })
  @ApiQuery({ name: 'assignedTo', required: false, description: 'Filter by assigned user' })
  @ApiQuery({ name: 'search', required: false, description: 'Search term' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Leads retrieved successfully' })
  async getLeads(
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('assignedTo') assignedTo?: string,
    @Query('search') search?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.leadsService.getLeads({
      tenantId,
      status,
      source,
      assignedTo,
      search,
      page,
      limit
    });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get leads statistics' })
  @ApiResponse({ status: 200, description: 'Statistics retrieved successfully' })
  async getLeadsStats(@CurrentUser('tenantId') tenantId: string) {
    return this.leadsService.getLeadsStats(tenantId);
  }

  @Get('conversion')
  @ApiOperation({ summary: 'Get leads conversion metrics' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for metrics' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for metrics' })
  @ApiResponse({ status: 200, description: 'Conversion metrics retrieved successfully' })
  async getLeadsConversion(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.leadsService.getLeadsConversion(tenantId, { startDate, endDate });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get lead by ID' })
  @ApiResponse({ status: 200, description: 'Lead retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async getLead(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.leadsService.getLead(id, tenantId);
  }

  @Post()
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Create new lead' })
  @ApiResponse({ status: 201, description: 'Lead created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createLead(
    @Body() createLeadDto: CreateLeadDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.leadsService.createLead(createLeadDto, userId, tenantId);
  }

  @Put(':id')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Update lead' })
  @ApiResponse({ status: 200, description: 'Lead updated successfully' })
  @ApiResponse({ status: 404, description: 'Lead not found' })
  async updateLead(
    @Param('id') id: string,
    @Body() updateLeadDto: UpdateLeadDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.leadsService.updateLead(id, updateLeadDto, userId, tenantId);
  }

  @Post(':id/qualify')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Qualify lead' })
  @ApiResponse({ status: 200, description: 'Lead qualified successfully' })
  @ApiResponse({ status: 400, description: 'Lead cannot be qualified' })
  async qualifyLead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.leadsService.qualifyLead(id, userId, tenantId);
  }

  @Post(':id/convert')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Convert lead to opportunity' })
  @ApiResponse({ status: 200, description: 'Lead converted successfully' })
  @ApiResponse({ status: 400, description: 'Lead cannot be converted' })
  async convertLead(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.leadsService.convertLead(id, userId, tenantId);
  }

  @Get(':id/activities')
  @ApiOperation({ summary: 'Get lead activities' })
  @ApiResponse({ status: 200, description: 'Activities retrieved successfully' })
  async getLeadActivities(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.leadsService.getLeadActivities(id, tenantId);
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get lead notes' })
  @ApiResponse({ status: 200, description: 'Notes retrieved successfully' })
  async getLeadNotes(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.leadsService.getLeadNotes(id, tenantId);
  }

  @Post(':id/notes')
  @Roles('admin', 'manager', 'sales_rep')
  @ApiOperation({ summary: 'Add note to lead' })
  @ApiResponse({ status: 201, description: 'Note added successfully' })
  @ApiResponse({ status: 400, description: 'Invalid note data' })
  async addLeadNote(
    @Param('id') id: string,
    @Body() noteData: { content: string; type?: string },
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.leadsService.addLeadNote(id, noteData, userId, tenantId);
  }
}
