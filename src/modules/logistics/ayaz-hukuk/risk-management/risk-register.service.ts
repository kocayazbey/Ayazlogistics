import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface Risk {
  id: string;
  category: 'operational' | 'financial' | 'legal' | 'strategic' | 'reputational';
  title: string;
  description: string;
  probability: 'low' | 'medium' | 'high' | 'critical';
  impact: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  owner: string;
  status: 'identified' | 'assessed' | 'mitigated' | 'accepted' | 'closed';
  mitigationPlan?: string;
  mitigationActions: Array<{
    action: string;
    responsible: string;
    dueDate: Date;
    status: string;
  }>;
}

@Injectable()
export class RiskRegisterService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async registerRisk(data: Omit<Risk, 'id' | 'riskScore' | 'mitigationActions'>): Promise<Risk> {
    const riskScore = this.calculateRiskScore(data.probability, data.impact);

    const risk: Risk = {
      ...data,
      id: `RISK-${Date.now()}`,
      riskScore,
      mitigationActions: [],
    };

    await this.eventBus.publish('risk.registered', {
      riskId: risk.id,
      category: risk.category,
      riskScore,
    });

    return risk;
  }

  private calculateRiskScore(probability: string, impact: string): number {
    const scores = { low: 1, medium: 2, high: 3, critical: 4 };
    return scores[probability] * scores[impact];
  }

  async getRiskMatrix(): Promise<any> {
    const risks = await this.getAllRisks();
    
    const matrix = {
      critical: risks.filter(r => r.riskScore >= 12),
      high: risks.filter(r => r.riskScore >= 6 && r.riskScore < 12),
      medium: risks.filter(r => r.riskScore >= 3 && r.riskScore < 6),
      low: risks.filter(r => r.riskScore < 3),
    };

    return {
      matrix,
      totalRisks: risks.length,
      criticalCount: matrix.critical.length,
      avgRiskScore: risks.reduce((sum, r) => sum + r.riskScore, 0) / risks.length,
    };
  }

  private async getAllRisks(): Promise<Risk[]> {
    return [
      {
        id: 'RISK-001',
        category: 'operational',
        title: 'Warehouse capacity shortage',
        description: 'Peak season may exceed current capacity',
        probability: 'high',
        impact: 'high',
        riskScore: 9,
        owner: 'Operations Manager',
        status: 'assessed',
        mitigationActions: [],
      },
    ];
  }
}

