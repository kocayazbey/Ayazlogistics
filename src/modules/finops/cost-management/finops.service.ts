import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface CostRecord {
  id: string;
  tenantId: string;
  category: 'infrastructure' | 'software' | 'services' | 'personnel' | 'other';
  service: string;
  amount: number;
  currency: string;
  period: string; // YYYY-MM format
  tags: Record<string, string>;
  createdAt: Date;
}

export interface UnitEconomics {
  id: string;
  tenantId: string;
  metric: string;
  value: number;
  unit: string;
  period: string;
  costPerUnit: number;
  revenuePerUnit: number;
  margin: number;
  createdAt: Date;
}

export interface CostOptimization {
  id: string;
  tenantId: string;
  recommendation: string;
  category: string;
  potentialSavings: number;
  implementationCost: number;
  roi: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  createdAt: Date;
}

@Injectable()
export class FinOpsService {
  private readonly logger = new Logger(FinOpsService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async recordCost(cost: Omit<CostRecord, 'id' | 'createdAt'>): Promise<CostRecord> {
    const id = `COST-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO cost_records (id, tenant_id, category, service, amount, currency, period, tags, created_at)
      VALUES (${id}, ${cost.tenantId}, ${cost.category}, ${cost.service}, ${cost.amount},
              ${cost.currency}, ${cost.period}, ${JSON.stringify(cost.tags)}, ${now})
    `);

    this.logger.log(`Cost recorded: ${id} for tenant ${cost.tenantId}`);

    return {
      id,
      ...cost,
      createdAt: now,
    };
  }

  async getCosts(tenantId: string, period?: string): Promise<CostRecord[]> {
    let query = sql`SELECT * FROM cost_records WHERE tenant_id = ${tenantId}`;
    
    if (period) {
      query = sql`SELECT * FROM cost_records WHERE tenant_id = ${tenantId} AND period = ${period}`;
    }

    query = sql`${query} ORDER BY created_at DESC`;

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      category: row.category as CostRecord['category'],
      service: row.service as string,
      amount: parseFloat(row.amount as string),
      currency: row.currency as string,
      period: row.period as string,
      tags: JSON.parse(row.tags as string),
      createdAt: new Date(row.created_at as string),
    }));
  }

  async recordUnitEconomics(unitEconomics: Omit<UnitEconomics, 'id' | 'createdAt'>): Promise<UnitEconomics> {
    const id = `UNIT-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO unit_economics (id, tenant_id, metric, value, unit, period, cost_per_unit,
                                 revenue_per_unit, margin, created_at)
      VALUES (${id}, ${unitEconomics.tenantId}, ${unitEconomics.metric}, ${unitEconomics.value},
              ${unitEconomics.unit}, ${unitEconomics.period}, ${unitEconomics.costPerUnit},
              ${unitEconomics.revenuePerUnit}, ${unitEconomics.margin}, ${now})
    `);

    this.logger.log(`Unit economics recorded: ${id} for tenant ${unitEconomics.tenantId}`);

    return {
      id,
      ...unitEconomics,
      createdAt: now,
    };
  }

  async getUnitEconomics(tenantId: string, period?: string): Promise<UnitEconomics[]> {
    let query = sql`SELECT * FROM unit_economics WHERE tenant_id = ${tenantId}`;
    
    if (period) {
      query = sql`SELECT * FROM unit_economics WHERE tenant_id = ${tenantId} AND period = ${period}`;
    }

    query = sql`${query} ORDER BY created_at DESC`;

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      metric: row.metric as string,
      value: parseFloat(row.value as string),
      unit: row.unit as string,
      period: row.period as string,
      costPerUnit: parseFloat(row.cost_per_unit as string),
      revenuePerUnit: parseFloat(row.revenue_per_unit as string),
      margin: parseFloat(row.margin as string),
      createdAt: new Date(row.created_at as string),
    }));
  }

  async createCostOptimization(optimization: Omit<CostOptimization, 'id' | 'createdAt'>): Promise<CostOptimization> {
    const id = `OPT-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO cost_optimizations (id, tenant_id, recommendation, category, potential_savings,
                                     implementation_cost, roi, priority, status, created_at)
      VALUES (${id}, ${optimization.tenantId}, ${optimization.recommendation}, ${optimization.category},
              ${optimization.potentialSavings}, ${optimization.implementationCost}, ${optimization.roi},
              ${optimization.priority}, ${optimization.status}, ${now})
    `);

    this.logger.log(`Cost optimization created: ${id} for tenant ${optimization.tenantId}`);

    return {
      id,
      ...optimization,
      createdAt: now,
    };
  }

  async getCostOptimizations(tenantId: string): Promise<CostOptimization[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM cost_optimizations WHERE tenant_id = ${tenantId} ORDER BY priority DESC, created_at DESC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      recommendation: row.recommendation as string,
      category: row.category as string,
      potentialSavings: parseFloat(row.potential_savings as string),
      implementationCost: parseFloat(row.implementation_cost as string),
      roi: parseFloat(row.roi as string),
      priority: row.priority as CostOptimization['priority'],
      status: row.status as CostOptimization['status'],
      createdAt: new Date(row.created_at as string),
    }));
  }

  async getFinOpsDashboard(tenantId: string): Promise<any> {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM format
    
    const costs = await this.getCosts(tenantId, currentMonth);
    const unitEconomics = await this.getUnitEconomics(tenantId, currentMonth);
    const optimizations = await this.getCostOptimizations(tenantId);

    const totalCosts = costs.reduce((sum, cost) => sum + cost.amount, 0);
    
    const costsByCategory = costs.reduce((acc, cost) => {
      acc[cost.category] = (acc[cost.category] || 0) + cost.amount;
      return acc;
    }, {} as Record<string, number>);

    const activeOptimizations = optimizations.filter(opt => opt.status === 'pending' || opt.status === 'in_progress');
    const totalPotentialSavings = activeOptimizations.reduce((sum, opt) => sum + opt.potentialSavings, 0);

    const averageMargin = unitEconomics.length > 0 
      ? unitEconomics.reduce((sum, ue) => sum + ue.margin, 0) / unitEconomics.length 
      : 0;

    return {
      summary: {
        totalCosts: Math.round(totalCosts * 100) / 100,
        totalOptimizations: optimizations.length,
        activeOptimizations: activeOptimizations.length,
        totalPotentialSavings: Math.round(totalPotentialSavings * 100) / 100,
        averageMargin: Math.round(averageMargin * 100) / 100,
      },
      costsByCategory,
      topOptimizations: activeOptimizations
        .sort((a, b) => b.potentialSavings - a.potentialSavings)
        .slice(0, 5)
        .map(opt => ({
          id: opt.id,
          recommendation: opt.recommendation,
          potentialSavings: opt.potentialSavings,
          roi: opt.roi,
          priority: opt.priority,
        })),
      unitEconomics: unitEconomics.map(ue => ({
        metric: ue.metric,
        value: ue.value,
        costPerUnit: ue.costPerUnit,
        revenuePerUnit: ue.revenuePerUnit,
        margin: ue.margin,
      })),
    };
  }
}
