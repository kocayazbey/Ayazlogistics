import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Finance } from '../../../database/schema/shared/erp.schema';

@Injectable()
export class FinanceService {
  constructor(
    @InjectRepository(Finance)
    private financeRepository: Repository<Finance>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Finance[]> {
    const query = this.financeRepository.createQueryBuilder('finance')
      .where('finance.tenantId = :tenantId', { tenantId });

    if (filters?.type) {
      query.andWhere('finance.type = :type', { type: filters.type });
    }

    if (filters?.status) {
      query.andWhere('finance.status = :status', { status: filters.status });
    }

    if (filters?.dateRange) {
      query.andWhere('finance.date BETWEEN :startDate AND :endDate', {
        startDate: filters.dateRange.startDate,
        endDate: filters.dateRange.endDate,
      });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Finance> {
    return this.financeRepository.findOne({
      where: { id, tenantId },
      relations: ['account', 'category'],
    });
  }

  async create(financeData: Partial<Finance>, tenantId: string): Promise<Finance> {
    const finance = this.financeRepository.create({
      ...financeData,
      tenantId,
      transactionNumber: this.generateTransactionNumber(),
      status: 'pending',
    });
    return this.financeRepository.save(finance);
  }

  async update(id: string, financeData: Partial<Finance>, tenantId: string): Promise<Finance> {
    await this.financeRepository.update({ id, tenantId }, financeData);
    return this.findOne(id, tenantId);
  }

  async approveTransaction(id: string, tenantId: string): Promise<Finance> {
    const finance = await this.findOne(id, tenantId);
    if (!finance) {
      throw new Error('Finance transaction not found');
    }

    finance.status = 'approved';
    finance.approvedAt = new Date();
    return this.financeRepository.save(finance);
  }

  async getFinancialMetrics(tenantId: string): Promise<any> {
    const finances = await this.findAll(tenantId);
    
    const totalRevenue = finances
      .filter(f => f.type === 'revenue')
      .reduce((sum, f) => sum + f.amount, 0);
    
    const totalExpenses = finances
      .filter(f => f.type === 'expense')
      .reduce((sum, f) => sum + f.amount, 0);
    
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      profitMargin,
      transactionCount: finances.length,
    };
  }

  async getCashFlow(tenantId: string, dateRange?: any): Promise<any> {
    const finances = await this.findAll(tenantId, dateRange);
    
    const cashFlow = {
      inflow: finances.filter(f => f.type === 'revenue').reduce((sum, f) => sum + f.amount, 0),
      outflow: finances.filter(f => f.type === 'expense').reduce((sum, f) => sum + f.amount, 0),
      netCashFlow: 0,
    };
    
    cashFlow.netCashFlow = cashFlow.inflow - cashFlow.outflow;
    
    return cashFlow;
  }

  async getBudgetAnalysis(tenantId: string): Promise<any> {
    // Implement budget analysis logic
    // This would typically involve:
    // 1. Comparing actual vs budgeted amounts
    // 2. Calculating variances
    // 3. Identifying over/under budget categories
    // 4. Generating budget recommendations

    return {
      budgetedAmount: 0,
      actualAmount: 0,
      variance: 0,
      variancePercentage: 0,
      recommendations: [],
    };
  }

  async generateFinancialReport(tenantId: string, reportType: string, dateRange?: any): Promise<any> {
    const finances = await this.findAll(tenantId, dateRange);
    
    const report = {
      reportType,
      dateRange,
      summary: {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
      },
      details: finances,
      generatedAt: new Date(),
    };

    return report;
  }

  private generateTransactionNumber(): string {
    const timestamp = Date.now();
    return `TXN-${timestamp}`;
  }
}
