import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface CarbonEmission {
  id: string;
  tenantId: string;
  source: string;
  category: 'transport' | 'warehouse' | 'packaging' | 'energy' | 'other';
  amount: number; // kg CO2
  unit: string;
  date: Date;
  location?: string;
  vehicleId?: string;
  routeId?: string;
  createdAt: Date;
}

export interface SustainabilityGoal {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  target: number;
  unit: string;
  category: 'carbon_reduction' | 'waste_reduction' | 'energy_efficiency' | 'renewable_energy';
  deadline: Date;
  isActive: boolean;
  createdAt: Date;
}

export interface SustainabilityReport {
  id: string;
  tenantId: string;
  period: string;
  totalEmissions: number;
  emissionsByCategory: Record<string, number>;
  goalsAchieved: number;
  goalsTotal: number;
  recommendations: string[];
  generatedAt: Date;
}

@Injectable()
export class SustainabilityService {
  private readonly logger = new Logger(SustainabilityService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async recordCarbonEmission(emission: Omit<CarbonEmission, 'id' | 'createdAt'>): Promise<CarbonEmission> {
    const id = `CO2-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO carbon_emissions (id, tenant_id, source, category, amount, unit, date,
                                  location, vehicle_id, route_id, created_at)
      VALUES (${id}, ${emission.tenantId}, ${emission.source}, ${emission.category},
              ${emission.amount}, ${emission.unit}, ${emission.date}, ${emission.location || null},
              ${emission.vehicleId || null}, ${emission.routeId || null}, ${now})
    `);

    this.logger.log(`Carbon emission recorded: ${id} for tenant ${emission.tenantId}`);

    return {
      id,
      ...emission,
      createdAt: now,
    };
  }

  async getCarbonEmissions(tenantId: string, startDate?: Date, endDate?: Date): Promise<CarbonEmission[]> {
    let query = sql`SELECT * FROM carbon_emissions WHERE tenant_id = ${tenantId}`;
    
    if (startDate && endDate) {
      query = sql`SELECT * FROM carbon_emissions WHERE tenant_id = ${tenantId} 
                  AND date >= ${startDate} AND date <= ${endDate}`;
    } else if (startDate) {
      query = sql`SELECT * FROM carbon_emissions WHERE tenant_id = ${tenantId} AND date >= ${startDate}`;
    } else if (endDate) {
      query = sql`SELECT * FROM carbon_emissions WHERE tenant_id = ${tenantId} AND date <= ${endDate}`;
    }

    query = sql`${query} ORDER BY date DESC`;

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      source: row.source as string,
      category: row.category as CarbonEmission['category'],
      amount: parseFloat(row.amount as string),
      unit: row.unit as string,
      date: new Date(row.date as string),
      location: row.location as string,
      vehicleId: row.vehicle_id as string,
      routeId: row.route_id as string,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async createSustainabilityGoal(goal: Omit<SustainabilityGoal, 'id' | 'createdAt'>): Promise<SustainabilityGoal> {
    const id = `GOAL-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO sustainability_goals (id, tenant_id, name, description, target, unit,
                                      category, deadline, is_active, created_at)
      VALUES (${id}, ${goal.tenantId}, ${goal.name}, ${goal.description}, ${goal.target},
              ${goal.unit}, ${goal.category}, ${goal.deadline}, ${goal.isActive}, ${now})
    `);

    this.logger.log(`Sustainability goal created: ${id} for tenant ${goal.tenantId}`);

    return {
      id,
      ...goal,
      createdAt: now,
    };
  }

  async getSustainabilityGoals(tenantId: string): Promise<SustainabilityGoal[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM sustainability_goals WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string,
      target: parseFloat(row.target as string),
      unit: row.unit as string,
      category: row.category as SustainabilityGoal['category'],
      deadline: new Date(row.deadline as string),
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async generateSustainabilityReport(tenantId: string, period: string): Promise<SustainabilityReport> {
    const startDate = new Date(period);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);

    const emissions = await this.getCarbonEmissions(tenantId, startDate, endDate);
    const goals = await this.getSustainabilityGoals(tenantId);

    const totalEmissions = emissions.reduce((sum, emission) => sum + emission.amount, 0);
    
    const emissionsByCategory = emissions.reduce((acc, emission) => {
      acc[emission.category] = (acc[emission.category] || 0) + emission.amount;
      return acc;
    }, {} as Record<string, number>);

    const activeGoals = goals.filter(goal => goal.isActive);
    const goalsAchieved = activeGoals.filter(goal => {
      const categoryEmissions = emissionsByCategory[goal.category] || 0;
      return categoryEmissions <= goal.target;
    }).length;

    const recommendations = this.generateRecommendations(emissionsByCategory, activeGoals);

    const report: SustainabilityReport = {
      id: `REPORT-${Date.now()}`,
      tenantId,
      period,
      totalEmissions,
      emissionsByCategory,
      goalsAchieved,
      goalsTotal: activeGoals.length,
      recommendations,
      generatedAt: new Date(),
    };

    await this.db.execute(sql`
      INSERT INTO sustainability_reports (id, tenant_id, period, total_emissions, emissions_by_category,
                                        goals_achieved, goals_total, recommendations, generated_at)
      VALUES (${report.id}, ${report.tenantId}, ${report.period}, ${report.totalEmissions},
              ${JSON.stringify(report.emissionsByCategory)}, ${report.goalsAchieved}, ${report.goalsTotal},
              ${JSON.stringify(report.recommendations)}, ${report.generatedAt})
    `);

    this.logger.log(`Sustainability report generated: ${report.id} for tenant ${tenantId}`);

    return report;
  }

  async getSustainabilityDashboard(tenantId: string): Promise<any> {
    const currentMonth = new Date();
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0);

    const emissions = await this.getCarbonEmissions(tenantId, startOfMonth, endOfMonth);
    const goals = await this.getSustainabilityGoals(tenantId);
    const activeGoals = goals.filter(goal => goal.isActive);

    const totalEmissions = emissions.reduce((sum, emission) => sum + emission.amount, 0);
    
    const emissionsByCategory = emissions.reduce((acc, emission) => {
      acc[emission.category] = (acc[emission.category] || 0) + emission.amount;
      return acc;
    }, {} as Record<string, number>);

    const goalsProgress = activeGoals.map(goal => {
      const categoryEmissions = emissionsByCategory[goal.category] || 0;
      const progress = Math.max(0, ((goal.target - categoryEmissions) / goal.target) * 100);
      return {
        name: goal.name,
        category: goal.category,
        target: goal.target,
        current: categoryEmissions,
        progress: Math.min(100, progress),
        deadline: goal.deadline,
      };
    });

    return {
      summary: {
        totalEmissions: Math.round(totalEmissions * 100) / 100,
        totalGoals: activeGoals.length,
        achievedGoals: goalsProgress.filter(g => g.progress >= 100).length,
        averageProgress: goalsProgress.length > 0 
          ? goalsProgress.reduce((sum, g) => sum + g.progress, 0) / goalsProgress.length 
          : 0,
      },
      emissionsByCategory,
      goalsProgress,
      recommendations: this.generateRecommendations(emissionsByCategory, activeGoals),
    };
  }

  private generateRecommendations(emissionsByCategory: Record<string, number>, goals: SustainabilityGoal[]): string[] {
    const recommendations: string[] = [];

    if (emissionsByCategory.transport > 0) {
      recommendations.push('Consider optimizing delivery routes to reduce transport emissions');
      recommendations.push('Evaluate electric vehicle adoption for last-mile delivery');
    }

    if (emissionsByCategory.warehouse > 0) {
      recommendations.push('Implement energy-efficient lighting and HVAC systems');
      recommendations.push('Consider solar panel installation for warehouse operations');
    }

    if (emissionsByCategory.packaging > 0) {
      recommendations.push('Switch to biodegradable or recyclable packaging materials');
      recommendations.push('Optimize packaging sizes to reduce material usage');
    }

    const unmetGoals = goals.filter(goal => {
      const categoryEmissions = emissionsByCategory[goal.category] || 0;
      return categoryEmissions > goal.target;
    });

    if (unmetGoals.length > 0) {
      recommendations.push(`Focus on ${unmetGoals.map(g => g.name).join(', ')} to meet sustainability goals`);
    }

    return recommendations.slice(0, 5); // Limit to 5 recommendations
  }
}
