import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { FinanceService } from '../ayaz-erp/finance/finance.service';
import { PersonnelService } from '../ayaz-erp/hr/personnel/personnel.service';
import { PayrollService } from '../ayaz-erp/hr/payroll/payroll.service';
import { StockCardsService } from '../ayaz-erp/inventory/stock-cards/stock-cards.service';
import { PurchaseOrdersService } from '../ayaz-erp/procurement/purchase-orders/purchase-orders.service';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';

@ApiTags('ERP')
@Controller({ path: 'erp', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ERPController {
  constructor(
    private readonly financeService: FinanceService,
    private readonly personnelService: PersonnelService,
    private readonly payrollService: PayrollService,
    private readonly stockCardsService: StockCardsService,
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  @Get('finance/accounts')
  @ApiOperation({ summary: 'Get GL accounts' })
  async getGLAccounts(@CurrentUser('tenantId') tenantId: string, @Query('type') accountType?: string) {
    return this.financeService.getGLAccounts(tenantId, accountType);
  }

  @Post('finance/accounts')
  @ApiOperation({ summary: 'Create GL account' })
  async createGLAccount(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.financeService.createGLAccount(data, tenantId);
  }

  @Get('finance/transactions')
  @ApiOperation({ summary: 'Get transactions' })
  async getTransactions(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.financeService.getTransactions(tenantId, filters);
  }

  @Post('finance/transactions')
  @ApiOperation({ summary: 'Create transaction' })
  async createTransaction(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.financeService.createTransaction(data, tenantId, userId);
  }

  @Get('finance/summary')
  @ApiOperation({ summary: 'Get income/expense summary' })
  async getFinancialSummary(
    @CurrentUser('tenantId') tenantId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.financeService.getIncomeExpenseSummary(tenantId, new Date(startDate), new Date(endDate));
  }

  @Get('hr/employees')
  @ApiOperation({ summary: 'Get employees' })
  async getEmployees(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.personnelService.getEmployees(tenantId, filters);
  }

  @Post('hr/employees')
  @ApiOperation({ summary: 'Create employee' })
  async createEmployee(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.personnelService.createEmployee(data, tenantId);
  }

  @Get('hr/payroll')
  @ApiOperation({ summary: 'Get payroll records' })
  async getPayrolls(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.payrollService.getPayrolls(tenantId, filters);
  }

  @Post('hr/payroll/generate')
  @ApiOperation({ summary: 'Generate payroll' })
  async generatePayroll(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.payrollService.generatePayroll(data.employeeId, data.periodStart, data.periodEnd, tenantId, userId);
  }

  @Get('inventory/stock-cards')
  @ApiOperation({ summary: 'Get stock cards' })
  async getStockCards(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.stockCardsService.getStockCards(tenantId, filters);
  }

  @Post('inventory/stock-cards')
  @ApiOperation({ summary: 'Create stock card' })
  async createStockCard(@Body() data: any, @CurrentUser('tenantId') tenantId: string) {
    return this.stockCardsService.createStockCard(data, tenantId);
  }

  @Get('procurement/purchase-orders')
  @ApiOperation({ summary: 'Get purchase orders' })
  async getPurchaseOrders(@CurrentUser('tenantId') tenantId: string, @Query() filters: any) {
    return this.purchaseOrdersService.getPurchaseOrders(tenantId, filters);
  }

  @Post('procurement/purchase-orders')
  @ApiOperation({ summary: 'Create purchase order' })
  async createPurchaseOrder(@Body() data: any, @CurrentUser('tenantId') tenantId: string, @CurrentUser('id') userId: string) {
    return this.purchaseOrdersService.createPurchaseOrder(data, tenantId, userId);
  }
}

