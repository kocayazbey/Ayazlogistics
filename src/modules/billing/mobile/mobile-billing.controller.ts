import { Controller, Get, Post, Patch, Param, Body, UseGuards, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { MobileBillingService } from './mobile-billing.service';

@ApiTags('Mobile Billing')
@Controller('api/billing')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class MobileBillingController {
  constructor(private readonly mobileBillingService: MobileBillingService) {}

  @Get('invoices')
  @Roles('finance_manager', 'manager', 'accountant')
  @ApiOperation({ summary: 'Get invoices' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getInvoices(
    @CurrentUser('tenantId') tenantId: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
    @Query('search') search?: string,
  ) {
    const filters = {
      customerId,
      status,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
      search,
    };
    return await this.mobileBillingService.getInvoices(tenantId, filters);
  }

  @Get('invoices/:id')
  @Roles('finance_manager', 'manager', 'accountant')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async getInvoiceById(
    @Param('id') invoiceId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.mobileBillingService.getInvoiceById(invoiceId, tenantId);
  }

  @Post('invoices')
  @Roles('finance_manager', 'accountant')
  @ApiOperation({ summary: 'Create invoice' })
  async createInvoice(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: {
      customerId: string;
      amount: number;
      tax: number;
      dueDate: string;
      notes?: string;
    },
  ) {
    return await this.mobileBillingService.createInvoice(tenantId, userId, {
      ...data,
      dueDate: new Date(data.dueDate),
    });
  }

  @Patch('invoices/:id')
  @Roles('finance_manager', 'accountant')
  @ApiOperation({ summary: 'Update invoice' })
  async updateInvoice(
    @Param('id') invoiceId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() data: any,
  ) {
    return await this.mobileBillingService.updateInvoice(invoiceId, tenantId, data);
  }

  @Post('invoices/:id/send')
  @Roles('finance_manager', 'accountant')
  @ApiOperation({ summary: 'Send invoice' })
  async sendInvoice(
    @Param('id') invoiceId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return await this.mobileBillingService.sendInvoice(invoiceId, tenantId);
  }

  @Get('payments')
  @Roles('finance_manager', 'manager', 'accountant')
  @ApiOperation({ summary: 'Get payments' })
  @ApiQuery({ name: 'invoiceId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'method', required: false })
  @ApiQuery({ name: 'dateFrom', required: false })
  @ApiQuery({ name: 'dateTo', required: false })
  async getPayments(
    @CurrentUser('tenantId') tenantId: string,
    @Query('invoiceId') invoiceId?: string,
    @Query('status') status?: string,
    @Query('method') method?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    const filters = {
      invoiceId,
      status,
      method,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
    };
    return await this.mobileBillingService.getPayments(tenantId, filters);
  }

  @Post('payments')
  @Roles('finance_manager', 'accountant')
  @ApiOperation({ summary: 'Create payment' })
  async createPayment(
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
    @Body() data: {
      invoiceId: string;
      amount: number;
      method: string;
      transactionId?: string;
    },
  ) {
    return await this.mobileBillingService.createPayment(tenantId, userId, data);
  }

  @Post('payments/:id/process')
  @Roles('finance_manager', 'accountant')
  @ApiOperation({ summary: 'Process payment' })
  async processPayment(
    @Param('id') paymentId: string,
    @CurrentUser('tenantId') tenantId: string,
    @Body() data: { status: 'completed' | 'failed' },
  ) {
    return await this.mobileBillingService.processPayment(paymentId, tenantId, data.status);
  }

  @Get('metrics')
  @Roles('finance_manager', 'manager')
  @ApiOperation({ summary: 'Get billing metrics' })
  @ApiQuery({ name: 'period', required: false, enum: ['week', 'month', 'quarter', 'year'] })
  async getBillingMetrics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('period') period: 'week' | 'month' | 'quarter' | 'year' = 'month',
  ) {
    return await this.mobileBillingService.getBillingMetrics(tenantId, period);
  }

  @Get('customers')
  @Roles('finance_manager', 'manager', 'accountant')
  @ApiOperation({ summary: 'Get customers' })
  @ApiQuery({ name: 'search', required: false })
  async getCustomers(
    @CurrentUser('tenantId') tenantId: string,
    @Query('search') search?: string,
  ) {
    return await this.mobileBillingService.getCustomers(tenantId, search);
  }
}