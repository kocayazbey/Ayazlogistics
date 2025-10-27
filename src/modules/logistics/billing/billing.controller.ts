import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../core/auth/guards/roles.guard';
import { Roles } from '../../core/auth/decorators/roles.decorator';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreateContractDto } from './dto/create-contract.dto';
import { UpdateContractDto } from './dto/update-contract.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@ApiTags('Billing')
@Controller('billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Get('invoices')
  @Roles('admin', 'billing_manager', 'accountant')
  @ApiOperation({ summary: 'Get invoices list' })
  @ApiResponse({ status: 200, description: 'Invoices list retrieved successfully' })
  async getInvoices(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('customer') customer?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.billingService.getInvoices({ page, limit, status, customer, dateFrom, dateTo });
  }

  @Post('invoices')
  @Roles('admin', 'billing_manager')
  @ApiOperation({ summary: 'Create new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  async createInvoice(@Body() createInvoiceDto: CreateInvoiceDto) {
    return this.billingService.createInvoice(createInvoiceDto);
  }

  @Put('invoices/:id')
  @Roles('admin', 'billing_manager')
  @ApiOperation({ summary: 'Update invoice' })
  @ApiResponse({ status: 200, description: 'Invoice updated successfully' })
  async updateInvoice(
    @Param('id') id: string,
    @Body() updateInvoiceDto: UpdateInvoiceDto
  ) {
    return this.billingService.updateInvoice(id, updateInvoiceDto);
  }

  @Post('invoices/:id/send')
  @Roles('admin', 'billing_manager')
  @ApiOperation({ summary: 'Send invoice to customer' })
  @ApiResponse({ status: 200, description: 'Invoice sent successfully' })
  async sendInvoice(@Param('id') id: string) {
    return this.billingService.sendInvoice(id);
  }

  @Post('invoices/:id/approve')
  @Roles('admin', 'billing_manager')
  @ApiOperation({ summary: 'Approve invoice' })
  @ApiResponse({ status: 200, description: 'Invoice approved successfully' })
  async approveInvoice(@Param('id') id: string) {
    return this.billingService.approveInvoice(id);
  }

  @Get('contracts')
  @Roles('admin', 'billing_manager', 'accountant')
  @ApiOperation({ summary: 'Get contracts list' })
  @ApiResponse({ status: 200, description: 'Contracts list retrieved successfully' })
  async getContracts(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('customer') customer?: string,
    @Query('type') type?: string
  ) {
    return this.billingService.getContracts({ page, limit, status, customer, type });
  }

  @Post('contracts')
  @Roles('admin', 'billing_manager')
  @ApiOperation({ summary: 'Create new contract' })
  @ApiResponse({ status: 201, description: 'Contract created successfully' })
  async createContract(@Body() createContractDto: CreateContractDto) {
    return this.billingService.createContract(createContractDto);
  }

  @Put('contracts/:id')
  @Roles('admin', 'billing_manager')
  @ApiOperation({ summary: 'Update contract' })
  @ApiResponse({ status: 200, description: 'Contract updated successfully' })
  async updateContract(
    @Param('id') id: string,
    @Body() updateContractDto: UpdateContractDto
  ) {
    return this.billingService.updateContract(id, updateContractDto);
  }

  @Post('contracts/:id/activate')
  @Roles('admin', 'billing_manager')
  @ApiOperation({ summary: 'Activate contract' })
  @ApiResponse({ status: 200, description: 'Contract activated successfully' })
  async activateContract(@Param('id') id: string) {
    return this.billingService.activateContract(id);
  }

  @Post('contracts/:id/terminate')
  @Roles('admin', 'billing_manager')
  @ApiOperation({ summary: 'Terminate contract' })
  @ApiResponse({ status: 200, description: 'Contract terminated successfully' })
  async terminateContract(@Param('id') id: string) {
    return this.billingService.terminateContract(id);
  }

  @Get('payments')
  @Roles('admin', 'billing_manager', 'accountant')
  @ApiOperation({ summary: 'Get payments list' })
  @ApiResponse({ status: 200, description: 'Payments list retrieved successfully' })
  async getPayments(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.billingService.getPayments({ page, limit, status, method, dateFrom, dateTo });
  }

  @Post('payments')
  @Roles('admin', 'billing_manager')
  @ApiOperation({ summary: 'Create new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully' })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto) {
    return this.billingService.createPayment(createPaymentDto);
  }

  @Put('payments/:id')
  @Roles('admin', 'billing_manager')
  @ApiOperation({ summary: 'Update payment' })
  @ApiResponse({ status: 200, description: 'Payment updated successfully' })
  async updatePayment(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto
  ) {
    return this.billingService.updatePayment(id, updatePaymentDto);
  }

  @Post('payments/:id/process')
  @Roles('admin', 'billing_manager')
  @ApiOperation({ summary: 'Process payment' })
  @ApiResponse({ status: 200, description: 'Payment processed successfully' })
  async processPayment(@Param('id') id: string) {
    return this.billingService.processPayment(id);
  }

  @Get('analytics/revenue')
  @Roles('admin', 'billing_manager', 'accountant')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
  async getRevenueAnalytics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.billingService.getRevenueAnalytics(dateFrom, dateTo);
  }

  @Get('analytics/outstanding')
  @Roles('admin', 'billing_manager', 'accountant')
  @ApiOperation({ summary: 'Get outstanding payments analytics' })
  @ApiResponse({ status: 200, description: 'Outstanding payments analytics retrieved successfully' })
  async getOutstandingAnalytics() {
    return this.billingService.getOutstandingAnalytics();
  }

  @Get('analytics/customers')
  @Roles('admin', 'billing_manager', 'accountant')
  @ApiOperation({ summary: 'Get customer billing analytics' })
  @ApiResponse({ status: 200, description: 'Customer billing analytics retrieved successfully' })
  async getCustomerAnalytics(
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string
  ) {
    return this.billingService.getCustomerAnalytics(dateFrom, dateTo);
  }
}