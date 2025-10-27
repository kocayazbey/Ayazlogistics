import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../core/auth/guards/roles.guard';
import { Roles } from '../../../core/auth/decorators/roles.decorator';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { AccountingService } from './accounting.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';

@ApiTags('Accounting')
@Controller({ path: 'accounting', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class AccountingController {
  constructor(private readonly accountingService: AccountingService) {}

  @Get('dashboard')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get accounting dashboard' })
  @ApiResponse({ status: 200, description: 'Dashboard data retrieved successfully' })
  async getDashboard(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.accountingService.getDashboard(tenantId, { dateFrom, dateTo });
  }

  @Get('revenue')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiResponse({ status: 200, description: 'Revenue analytics retrieved successfully' })
  async getRevenueAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('period') period?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.accountingService.getRevenueAnalytics(tenantId, { period, dateFrom, dateTo });
  }

  @Get('expenses')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get expenses analytics' })
  @ApiResponse({ status: 200, description: 'Expenses analytics retrieved successfully' })
  async getExpensesAnalytics(
    @CurrentUser('tenantId') tenantId: string,
    @Query('period') period?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.accountingService.getExpensesAnalytics(tenantId, { period, dateFrom, dateTo });
  }

  @Get('profit-loss')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get profit and loss statement' })
  @ApiResponse({ status: 200, description: 'P&L statement retrieved successfully' })
  async getProfitLossStatement(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.accountingService.getProfitLossStatement(tenantId, dateFrom, dateTo);
  }

  @Get('balance-sheet')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get balance sheet' })
  @ApiResponse({ status: 200, description: 'Balance sheet retrieved successfully' })
  async getBalanceSheet(
    @CurrentUser('tenantId') tenantId: string,
    @Query('asOf') asOf: string,
  ) {
    return this.accountingService.getBalanceSheet(tenantId, asOf);
  }

  @Get('cash-flow')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get cash flow statement' })
  @ApiResponse({ status: 200, description: 'Cash flow statement retrieved successfully' })
  async getCashFlowStatement(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.accountingService.getCashFlowStatement(tenantId, dateFrom, dateTo);
  }

  @Get('accounts')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get chart of accounts' })
  @ApiResponse({ status: 200, description: 'Chart of accounts retrieved successfully' })
  async getChartOfAccounts(@CurrentUser('tenantId') tenantId: string) {
    return this.accountingService.getChartOfAccounts(tenantId);
  }

  @Get('transactions')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get accounting transactions' })
  @ApiResponse({ status: 200, description: 'Transactions retrieved successfully' })
  async getTransactions(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('accountId') accountId?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.accountingService.getTransactions(tenantId, { page, limit, accountId, dateFrom, dateTo });
  }

  @Post('transactions')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Create accounting transaction' })
  @ApiResponse({ status: 201, description: 'Transaction created successfully' })
  async createTransaction(
    @Body() transaction: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.createTransaction(transaction, tenantId, userId);
  }

  @Get('expenses')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get expenses' })
  @ApiResponse({ status: 200, description: 'Expenses retrieved successfully' })
  async getExpenses(
    @CurrentUser('tenantId') tenantId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
    @Query('dateFrom') dateFrom?: string,
    @Query('dateTo') dateTo?: string,
  ) {
    return this.accountingService.getExpenses(tenantId, { page, limit, category, dateFrom, dateTo });
  }

  @Post('expenses')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Create expense' })
  @ApiResponse({ status: 201, description: 'Expense created successfully' })
  async createExpense(
    @Body() createExpenseDto: CreateExpenseDto,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.accountingService.createExpense(createExpenseDto, tenantId, userId);
  }

  @Get('expenses/:id')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get expense by ID' })
  @ApiResponse({ status: 200, description: 'Expense retrieved successfully' })
  async getExpenseById(@Param('id') id: string, @CurrentUser('tenantId') tenantId: string) {
    return this.accountingService.getExpenseById(id, tenantId);
  }

  @Put('expenses/:id')
  @Roles('admin', 'accountant')
  @ApiOperation({ summary: 'Update expense' })
  @ApiResponse({ status: 200, description: 'Expense updated successfully' })
  async updateExpense(
    @Param('id') id: string,
    @Body() updateExpenseDto: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.accountingService.updateExpense(id, updateExpenseDto, tenantId);
  }

  @Get('reports/financial-summary')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get financial summary report' })
  @ApiResponse({ status: 200, description: 'Financial summary retrieved successfully' })
  async getFinancialSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
  ) {
    return this.accountingService.getFinancialSummary(tenantId, dateFrom, dateTo);
  }

  @Get('reports/aging-report')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get accounts receivable aging report' })
  @ApiResponse({ status: 200, description: 'Aging report retrieved successfully' })
  async getAgingReport(@CurrentUser('tenantId') tenantId: string) {
    return this.accountingService.getAgingReport(tenantId);
  }

  @Get('reports/tax-report')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Get tax report' })
  @ApiResponse({ status: 200, description: 'Tax report retrieved successfully' })
  async getTaxReport(
    @CurrentUser('tenantId') tenantId: string,
    @Query('period') period: string,
  ) {
    return this.accountingService.getTaxReport(tenantId, period);
  }

  @Post('reports/export')
  @Roles('admin', 'accountant', 'manager')
  @ApiOperation({ summary: 'Export accounting report' })
  @ApiResponse({ status: 200, description: 'Report exported successfully' })
  async exportReport(
    @Body() exportRequest: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    return this.accountingService.exportReport(exportRequest, tenantId);
  }
}
