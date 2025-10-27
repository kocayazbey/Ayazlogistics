import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { InvoicingService } from './invoicing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('Invoicing')
@Controller({ path: 'invoicing', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  @Get('invoices')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async getInvoices(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('customerId') customerId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.invoicingService.getInvoices(tenantId, { page, limit, status, customerId, dateFrom, dateTo });
  }

  @Get('invoices/:id')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  async getInvoiceById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.invoicingService.getInvoiceById(id, tenantId);
  }

  @Post('invoices')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Create new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  async createInvoice(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicingService.createInvoice(createInvoiceDto, tenantId, userId);
  }

  @Put('invoices/:id')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  async updateInvoice(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.invoicingService.updateInvoice(id, updateInvoiceDto, tenantId);
  }

  @Post('invoices/:id/send')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Send invoice to customer' })
  @ApiResponse({ status: 200, description: 'Invoice sent successfully' })
  async sendInvoice(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicingService.sendInvoice(id, tenantId, userId);
  }

  @Post('invoices/:id/mark-paid')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid successfully' })
  async markInvoiceAsPaid(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicingService.markInvoiceAsPaid(id, tenantId, userId);
  }

  @Post('invoices/:id/cancel')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Cancel invoice' })
  @ApiResponse({ status: 200, description: 'Invoice cancelled successfully' })
  async cancelInvoice(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicingService.cancelInvoice(id, reason, tenantId, userId);
  }

  @Get('invoices/:id/pdf')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Generate invoice PDF' })
  @ApiResponse({ status: 200, description: 'Invoice PDF generated successfully' })
  async generateInvoicePDF(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.invoicingService.generateInvoicePDF(id, tenantId);
  }

  @Get('payments')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get all payments' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully' })
  async getPayments(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('status') status?: string,
    @Query('invoiceId') invoiceId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.invoicingService.getPayments(tenantId, { page, limit, status, invoiceId, dateFrom, dateTo });
  }

  @Get('payments/:id')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully' })
  async getPaymentById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.invoicingService.getPaymentById(id, tenantId);
  }

  @Post('payments')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Create new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  async createPayment(
    @Body() createPaymentDto: CreatePaymentDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicingService.createPayment(createPaymentDto, tenantId, userId);
  }

  @Put('payments/:id')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Update payment' })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  async updatePayment(
    @Param('id') id: string,
    @Body() updatePaymentDto: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.invoicingService.updatePayment(id, updatePaymentDto, tenantId);
  }

  @Post('payments/:id/refund')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Process payment refund' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully' })
  async processRefund(
    @Param('id') id: string,
    @Body('amount') amount: number,
    @Body('reason') reason: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.invoicingService.processRefund(id, amount, reason, tenantId, userId);
  }

  @Get('customers/:customerId/invoices')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get customer invoices' })
  @ApiResponse({ status: 200, description: 'Customer invoices retrieved successfully' })
  async getCustomerInvoices(
    @Param('customerId') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.invoicingService.getCustomerInvoices(customerId, tenantId, { page, limit });
  }

  @Get('customers/:customerId/balance')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get customer account balance' })
  @ApiResponse({ status: 200, description: 'Customer balance retrieved successfully' })
  async getCustomerBalance(
    @Param('customerId') customerId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.invoicingService.getCustomerBalance(customerId, tenantId);
  }

  @Get('reports/outstanding-invoices')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get outstanding invoices report' })
  @ApiResponse({ status: 200, description: 'Outstanding invoices report retrieved successfully' })
  async getOutstandingInvoicesReport(@CurrentUser('tenantId') tenantId: string) {
    return this.invoicingService.getOutstandingInvoicesReport(tenantId);
  }

  @Get('reports/revenue-summary')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get revenue summary report' })
  @ApiResponse({ status: 200, description: 'Revenue summary report retrieved successfully' })
  async getRevenueSummaryReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.invoicingService.getRevenueSummaryReport(tenantId, dateFrom, dateTo);
  }

  @Get('reports/payment-summary')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get payment summary report' })
  @ApiResponse({ status: 200, description: 'Payment summary report retrieved successfully' })
  async getPaymentSummaryReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.invoicingService.getPaymentSummaryReport(tenantId, dateFrom, dateTo);
  }

  @Post('reports/export')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Export invoicing report' })
  @ApiResponse({ status: 200, description: 'Report exported successfully' })
  async exportInvoicingReport(
    @Body() exportRequest: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.invoicingService.exportInvoicingReport(exportRequest, tenantId);
  }
}
