import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { EDIService } from './edi.service';
import { CreateEDIConnectionDto } from './dto/create-edi-connection.dto';
import { CreateEDIDocumentDto } from './dto/create-edi-document.dto';
import { CreateEDIMappingDto } from './dto/create-edi-mapping.dto';
import { CreateShippingAPIConnectionDto } from './dto/create-shipping-api-connection.dto';
import { CreateERPConnectionDto } from './dto/create-erp-connection.dto';

@ApiTags('EDI Integration')
@Controller({ path: 'integrations/edi', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EDIController {
  constructor(private readonly ediService: EDIService) {}

  @Get('dashboard')
  @Roles('admin', 'integration_manager', 'viewer')
  @ApiOperation({ summary: 'Get integration dashboard' })
  @ApiResponse({ status: 200, description: 'Integration dashboard retrieved successfully' })
  async getIntegrationDashboard(@CurrentUser('tenantId') tenantId: string) {
    return this.ediService.getIntegrationDashboard(tenantId);
  }

  @Post('connections')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Create EDI connection' })
  @ApiResponse({ status: 201, description: 'EDI connection created successfully' })
  async createEDIConnection(
    @Body() createEDIConnectionDto: CreateEDIConnectionDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.ediService.createEDIConnection({ ...createEDIConnectionDto, tenantId });
  }

  @Get('connections')
  @Roles('admin', 'integration_manager', 'viewer')
  @ApiOperation({ summary: 'Get EDI connections' })
  @ApiResponse({ status: 200, description: 'EDI connections retrieved successfully' })
  async getEDIConnections(@CurrentUser('tenantId') tenantId: string) {
    return this.ediService.getEDIConnections(tenantId);
  }

  @Post('documents')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Create EDI document' })
  @ApiResponse({ status: 201, description: 'EDI document created successfully' })
  async createEDIDocument(@Body() createEDIDocumentDto: CreateEDIDocumentDto) {
    return this.ediService.createEDIDocument(createEDIDocumentDto);
  }

  @Put('documents/:id/process')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Process EDI document' })
  @ApiResponse({ status: 200, description: 'EDI document processing started' })
  async processEDIDocument(@Param('id') id: string) {
    return this.ediService.processEDIDocument(id);
  }

  @Post('mappings')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Create EDI mapping' })
  @ApiResponse({ status: 201, description: 'EDI mapping created successfully' })
  async createEDIMapping(@Body() createEDIMappingDto: CreateEDIMappingDto) {
    return this.ediService.createEDIMapping(createEDIMappingDto);
  }

  @Post('shipping-api')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Create shipping API connection' })
  @ApiResponse({ status: 201, description: 'Shipping API connection created successfully' })
  async createShippingAPIConnection(
    @Body() createShippingAPIConnectionDto: CreateShippingAPIConnectionDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.ediService.createShippingAPIConnection({ ...createShippingAPIConnectionDto, tenantId });
  }

  @Post('erp')
  @Roles('admin', 'integration_manager')
  @ApiOperation({ summary: 'Create ERP connection' })
  @ApiResponse({ status: 201, description: 'ERP connection created successfully' })
  async createERPConnection(
    @Body() createERPConnectionDto: CreateERPConnectionDto,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.ediService.createERPConnection({ ...createERPConnectionDto, tenantId });
  }
}
