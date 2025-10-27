import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';

@ApiTags('ERP - Finance Management')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api/v1/erp/finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get()
  @ApiOperation({ summary: 'Get all finance transactions' })
  @ApiResponse({ status: 200, description: 'Finance transactions retrieved successfully' })
  async findAll(
    @CurrentUser() user: any,
    @Query('type') type?: string,
    @Query('status') status?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = { type, status };
    if (startDate && endDate) {
      filters.dateRange = { startDate: new Date(startDate), endDate: new Date(endDate) };
    }
    return this.financeService.findAll(user.tenantId, filters);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get finance transaction by ID' })
  @ApiResponse({ status: 200, description: 'Finance transaction retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Finance transaction not found' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    return this.financeService.findOne(id, user.tenantId);
  }

  @Post()
  @ApiOperation({ summary: 'Create new finance transaction' })
  @ApiResponse({ status: 201, description: 'Finance transaction created successfully' })
  async create(@CurrentUser() user: any, @Body() financeData: any) {
    return this.financeService.create(financeData, user.tenantId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update finance transaction' })
  @ApiResponse({ status: 200, description: 'Finance transaction updated successfully' })
  @ApiResponse({ status: 404, description: 'Finance transaction not found' })
  async update(
    @CurrentUser() user: any,
    @Param('id') id: string,
    @Body() financeData: any,
  ) {
    return this.financeService.update(id, financeData, user.tenantId);
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Approve finance transaction' })
  @ApiResponse({ status: 200, description: 'Finance transaction approved successfully' })
  @ApiResponse({ status: 404, description: 'Finance transaction not found' })
  async approveTransaction(@CurrentUser() user: any, @Param('id') id: string) {
    return this.financeService.approveTransaction(id, user.tenantId);
  }

  @Get('metrics/overview')
  @ApiOperation({ summary: 'Get finance metrics' })
  @ApiResponse({ status: 200, description: 'Finance metrics retrieved successfully' })
  async getMetrics(@CurrentUser() user: any) {
    return this.financeService.getFinancialMetrics(user.tenantId);
  }

  @Get('cash-flow/analysis')
  @ApiOperation({ summary: 'Get cash flow analysis' })
  @ApiResponse({ status: 200, description: 'Cash flow analysis retrieved successfully' })
  async getCashFlow(
    @CurrentUser() user: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const dateRange = startDate && endDate ? { startDate: new Date(startDate), endDate: new Date(endDate) } : undefined;
    return this.financeService.getCashFlow(user.tenantId, dateRange);
  }

  @Get('budget/analysis')
  @ApiOperation({ summary: 'Get budget analysis' })
  @ApiResponse({ status: 200, description: 'Budget analysis retrieved successfully' })
  async getBudgetAnalysis(@CurrentUser() user: any) {
    return this.financeService.getBudgetAnalysis(user.tenantId);
  }

  @Post('reports/generate')
  @ApiOperation({ summary: 'Generate financial report' })
  @ApiResponse({ status: 200, description: 'Financial report generated successfully' })
  async generateReport(
    @CurrentUser() user: any,
    @Body('reportType') reportType: string,
    @Body('dateRange') dateRange?: any,
  ) {
    return this.financeService.generateFinancialReport(user.tenantId, reportType, dateRange);
  }
}
