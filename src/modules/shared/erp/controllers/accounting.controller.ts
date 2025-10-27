import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../core/auth/guards/roles.guard';
import { Roles } from '../../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../../core/auth/decorators/current-user.decorator';
import { AccountingService } from '../ayaz-erp/accounting/accounting.service';
import { CreateTransactionDto } from '../ayaz-erp/accounting/dto/create-transaction.dto';
import { UpdateTransactionDto } from '../ayaz-erp/accounting/dto/update-transaction.dto';
import { CreateInvoiceDto } from '../ayaz-erp/accounting/dto/create-invoice.dto';

@ApiTags('ERP Accounting')
@Controller({ path: 'erp/accounting', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('transactions')
  @ApiOperation({ summary: 'Get all transactions' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by transaction type' })
  @ApiQuery({ name: 'account', required: false, description: 'Filter by account' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for transactions' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for transactions' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(
    @Query('type') type?: string,
    @Query('account') account?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.getTransactions({
      tenantId,
      type,
      account,
      startDate,
      endDate,
      page,
      limit
    });
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Get all accounts' })
  @ApiQuery({ name: 'type', required: false, description: 'Filter by account type' })
  @ApiResponse({ status: 200, description: 'Accounts retrieved successfully' })
  async getAccounts(
    @Query('type') type?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.getAccounts(tenantId, type);
  }

  @Get('balance-sheet')
  @ApiOperation({ summary: 'Get balance sheet' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'Balance sheet date' })
  @ApiResponse({ status: 200, description: 'Balance sheet retrieved successfully' })
  async getBalanceSheet(
    @Query('asOfDate') asOfDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.getBalanceSheet(tenantId, asOfDate);
  }

  @Get('income-statement')
  @ApiOperation({ summary: 'Get income statement' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for statement' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for statement' })
  @ApiResponse({ status: 200, description: 'Income statement retrieved successfully' })
  async getIncomeStatement(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.getIncomeStatement(tenantId, { startDate, endDate });
  }

  @Get('cash-flow')
  @ApiOperation({ summary: 'Get cash flow statement' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for cash flow' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for cash flow' })
  @ApiResponse({ status: 200, description: 'Cash flow statement retrieved successfully' })
  async getCashFlowStatement(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.getCashFlowStatement(tenantId, { startDate, endDate });
  }

  @Get('invoices')
  @ApiOperation({ summary: 'Get all invoices' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by invoice status' })
  @ApiQuery({ name: 'customer', required: false, description: 'Filter by customer' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for invoices' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for invoices' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @ApiResponse({ status: 200, description: 'Invoices retrieved successfully' })
  async getInvoices(
    @Query('status') status?: string,
    @Query('customer') customer?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.getInvoices({
      tenantId,
      status,
      customer,
      startDate,
      endDate,
      page,
      limit
    });
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get invoice by ID' })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async getInvoice(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.getInvoice(id, tenantId);
  }

  @Post('transactions')
  @Roles('admin', 'manager', 'accountant')
  @ApiOperation({ summary: 'Create new transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createTransaction(
    @Body() createTransactionDto: CreateTransactionDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.createTransaction(createTransactionDto, userId, tenantId);
  }

  @Put('transactions/:id')
  @Roles('admin', 'manager', 'accountant')
  @ApiOperation({ summary: 'Update transaction' })
  @ApiResponse({ status: 200, description: 'Transaction updated successfully' })
  @ApiResponse({ status: 404, description: 'Transaction not found' })
  async updateTransaction(
    @Param('id') id: string,
    @Body() updateTransactionDto: UpdateTransactionDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.updateTransaction(id, updateTransactionDto, userId, tenantId);
  }

  @Post('invoices')
  @Roles('admin', 'manager', 'accountant')
  @ApiOperation({ summary: 'Create new invoice' })
  @ApiResponse({ status: 201, description: 'Invoice created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  async createInvoice(
    @Body() createInvoiceDto: CreateInvoiceDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.createInvoice(createInvoiceDto, userId, tenantId);
  }

  @Post('invoices/:id/send')
  @Roles('admin', 'manager', 'accountant')
  @ApiOperation({ summary: 'Send invoice to customer' })
  @ApiResponse({ status: 200, description: 'Invoice sent successfully' })
  @ApiResponse({ status: 400, description: 'Invoice cannot be sent' })
  async sendInvoice(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.sendInvoice(id, userId, tenantId);
  }

  @Post('invoices/:id/pay')
  @Roles('admin', 'manager', 'accountant')
  @ApiOperation({ summary: 'Mark invoice as paid' })
  @ApiResponse({ status: 200, description: 'Invoice marked as paid' })
  @ApiResponse({ status: 400, description: 'Invoice cannot be paid' })
  async payInvoice(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.payInvoice(id, userId, tenantId);
  }

  @Get('reports/profit-loss')
  @ApiOperation({ summary: 'Get profit and loss report' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date for report' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date for report' })
  @ApiResponse({ status: 200, description: 'Profit and loss report retrieved successfully' })
  async getProfitLossReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.getProfitLossReport(tenantId, { startDate, endDate });
  }

  @Get('reports/aged-receivables')
  @ApiOperation({ summary: 'Get aged receivables report' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'Report date' })
  @ApiResponse({ status: 200, description: 'Aged receivables report retrieved successfully' })
  async getAgedReceivablesReport(
    @Query('asOfDate') asOfDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.getAgedReceivablesReport(tenantId, asOfDate);
  }

  @Get('reports/aged-payables')
  @ApiOperation({ summary: 'Get aged payables report' })
  @ApiQuery({ name: 'asOfDate', required: false, description: 'Report date' })
  @ApiResponse({ status: 200, description: 'Aged payables report retrieved successfully' })
  async getAgedPayablesReport(
    @Query('asOfDate') asOfDate?: string,
    @CurrentUser('tenantId') tenantId: string
  ) {
    return this.accountingService.getAgedPayablesReport(tenantId, asOfDate);
  }
}
