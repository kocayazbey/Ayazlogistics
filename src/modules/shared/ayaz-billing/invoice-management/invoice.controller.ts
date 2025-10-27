import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { InvoiceService } from './invoice.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';

@ApiTags('Billing - Invoice Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/billing/invoices')
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async findAll(
    @CurrentUser() user: any,
    @Query('status') status?: string,
    @Query('customer') customer?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = { status, customer };
    if (startDate && endDate) {
      filters.dateRange = { startDate: new Date(startDate), endDate: new Date(endDate) };
    }
    return this.invoiceService.findAll(user.tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoiceService.findOne(id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  async create(@CurrentUser() user: any, @Body() invoiceData: any) {
    return this.invoiceService.create(invoiceData, user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() invoiceData: any,
  ) {
    return this.invoiceService.update(id, invoiceData, user.tenantId);
  }

  @Put(':id/send')
  @ApiOperation({ summary: 'Send invoice' })
  @ApiResponse({ status: 200, description: 'Invoice sent successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async sendInvoice(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoiceService.sendInvoice(id, user.tenantId);
  }

  @Put(':id/paid')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async markAsPaid(@CurrentUser() user: any, @Param('id') id: string) {
    return this.invoiceService.markAsPaid(id, user.tenantId);
  }

  @Get('metrics/overview')
  @ApiOperation({ summary: 'Get invoice metrics' })
  @ApiResponse({ status: 200, description: 'Invoice metrics retrieved successfully' })
  async getMetrics(@CurrentUser() user: any) {
    return this.invoiceService.getInvoiceMetrics(user.tenantId);
  }

  @Get('revenue/analysis')
  @ApiOperation({ summary: 'Get revenue metrics' })
  @ApiResponse({ status: 200, description: 'Revenue metrics retrieved successfully' })
  async getRevenueMetrics(@CurrentUser() user: any) {
    return this.invoiceService.getRevenueMetrics(user.tenantId);
  }

  @Get('overdue/list')
  @ApiOperation({ summary: 'Get overdue invoices' })
  @ApiResponse({ status: 200, description: 'Overdue invoices retrieved successfully' })
  async getOverdueInvoices(@CurrentUser() user: any) {
    return this.invoiceService.getOverdueInvoices(user.tenantId);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate invoice report' })
  @ApiResponse({ status: 200, description: 'Invoice report generated successfully' })
  async generateReport(
    @CurrentUser() user: any,
    @Body('reportType') reportType: string,
    @Body('dateRange') dateRange?: any,
  ) {
    return this.invoiceService.generateInvoiceReport(user.tenantId, reportType, dateRange);
  }
}
