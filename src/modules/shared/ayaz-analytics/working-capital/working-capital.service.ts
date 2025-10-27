import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface WorkingCapitalMetrics {
  currentAssets: number;
  currentLiabilities: number;
  workingCapital: number;
  currentRatio: number;
  quickRatio: number;
  cashRatio: number;
  workingCapitalRatio: number;
  daysWorkingCapital: number;
}

interface CashConversionCycle {
  daysInventoryOutstanding: number;
  daysSalesOutstanding: number;
  daysPayableOutstanding: number;
  cashConversionCycle: number;
}

@Injectable()
export class WorkingCapitalAnalysisService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async calculateWorkingCapital(tenantId: string, date: Date = new Date()): Promise<WorkingCapitalMetrics> {
    const currentAssets = {
      cash: 2500000,
      accountsReceivable: 4800000,
      inventory: 3200000,
      prepaidExpenses: 450000,
    };

    const currentLiabilities = {
      accountsPayable: 3200000,
      shortTermDebt: 1500000,
      accruedExpenses: 800000,
    };

    const totalCurrentAssets = Object.values(currentAssets).reduce((sum, val) => sum + val, 0);
    const totalCurrentLiabilities = Object.values(currentLiabilities).reduce((sum, val) => sum + val, 0);
    const workingCapital = totalCurrentAssets - totalCurrentLiabilities;

    const quickAssets = currentAssets.cash + currentAssets.accountsReceivable;

    return {
      currentAssets: totalCurrentAssets,
      currentLiabilities: totalCurrentLiabilities,
      workingCapital,
      currentRatio: totalCurrentAssets / totalCurrentLiabilities,
      quickRatio: quickAssets / totalCurrentLiabilities,
      cashRatio: currentAssets.cash / totalCurrentLiabilities,
      workingCapitalRatio: workingCapital / totalCurrentAssets,
      daysWorkingCapital: (workingCapital / (totalCurrentAssets / 365)),
    };
  }

  async calculateCashConversionCycle(tenantId: string): Promise<CashConversionCycle> {
    const avgInventory = 3200000;
    const costOfGoodsSold = 28000000;
    const avgAccountsReceivable = 4800000;
    const revenue = 45000000;
    const avgAccountsPayable = 3200000;
    const purchases = 24000000;

    const daysInventoryOutstanding = (avgInventory / costOfGoodsSold) * 365;
    const daysSalesOutstanding = (avgAccountsReceivable / revenue) * 365;
    const daysPayableOutstanding = (avgAccountsPayable / purchases) * 365;

    return {
      daysInventoryOutstanding,
      daysSalesOutstanding,
      daysPayableOutstanding,
      cashConversionCycle: daysInventoryOutstanding + daysSalesOutstanding - daysPayableOutstanding,
    };
  }

  async getWorkingCapitalTrend(tenantId: string, months: number = 12): Promise<any[]> {
    const trend = [];
    const baseWC = 5450000;

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      
      const variance = (Math.random() - 0.5) * 500000;
      trend.push({
        date,
        workingCapital: baseWC + variance,
        currentRatio: 2.0 + (Math.random() - 0.5) * 0.3,
        quickRatio: 1.5 + (Math.random() - 0.5) * 0.2,
      });
    }

    return trend;
  }

  async analyzeWorkingCapitalEfficiency(tenantId: string): Promise<any> {
    const wc = await this.calculateWorkingCapital(tenantId);
    const ccc = await this.calculateCashConversionCycle(tenantId);

    return {
      workingCapital: wc,
      cashConversionCycle: ccc,
      efficiency: {
        status: wc.currentRatio > 1.5 ? 'healthy' : 'needs_improvement',
        cashCycleStatus: ccc.cashConversionCycle < 60 ? 'excellent' : 'good',
        recommendations: this.generateRecommendations(wc, ccc),
      },
      benchmarks: {
        industryAvgCurrentRatio: 1.8,
        industryAvgQuickRatio: 1.2,
        industryAvgCCC: 45,
      },
    };
  }

  private generateRecommendations(wc: WorkingCapitalMetrics, ccc: CashConversionCycle): string[] {
    const recommendations = [];

    if (ccc.daysInventoryOutstanding > 45) {
      recommendations.push('Reduce inventory holding period - target 35-40 days');
    }

    if (ccc.daysSalesOutstanding > 45) {
      recommendations.push('Improve collection efficiency - offer early payment discounts');
    }

    if (wc.currentRatio < 1.5) {
      recommendations.push('Increase working capital - consider line of credit');
    }

    if (ccc.cashConversionCycle > 60) {
      recommendations.push('Optimize cash conversion cycle - negotiate better payment terms');
    }

    return recommendations;
  }
}

