import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface NegotiationStage {
  stage: string;
  status: 'pending' | 'in_progress' | 'completed';
  startDate: Date;
  completedDate?: Date;
  participants: string[];
  keyPoints: string[];
}

interface ContractNegotiation {
  id: string;
  contractId: string;
  customerId: string;
  contractType: string;
  currentStage: string;
  stages: NegotiationStage[];
  keyTerms: Record<string, any>;
  status: 'draft' | 'negotiating' | 'agreed' | 'cancelled';
  startDate: Date;
  targetCloseDate: Date;
}

@Injectable()
export class ContractNegotiationTrackerService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async startNegotiation(data: { customerId: string; contractType: string }): Promise<ContractNegotiation> {
    const stages: NegotiationStage[] = [
      {
        stage: 'Initial Proposal',
        status: 'completed',
        startDate: new Date(),
        completedDate: new Date(),
        participants: ['sales-team'],
        keyPoints: ['Pricing structure', 'Service levels'],
      },
      {
        stage: 'Terms Discussion',
        status: 'in_progress',
        startDate: new Date(),
        participants: ['sales-team', 'customer-team'],
        keyPoints: ['Payment terms', 'SLA commitments'],
      },
      {
        stage: 'Legal Review',
        status: 'pending',
        startDate: new Date(),
        participants: ['legal-team'],
        keyPoints: ['Liability clauses', 'Termination terms'],
      },
      {
        stage: 'Final Agreement',
        status: 'pending',
        startDate: new Date(),
        participants: ['executives'],
        keyPoints: ['Signature', 'Effective date'],
      },
    ];

    const negotiation: ContractNegotiation = {
      id: `NEG-${Date.now()}`,
      contractId: `CONTRACT-${Date.now()}`,
      customerId: data.customerId,
      contractType: data.contractType,
      currentStage: 'Terms Discussion',
      stages,
      keyTerms: {},
      status: 'negotiating',
      startDate: new Date(),
      targetCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };

    await this.eventBus.publish('negotiation.started', {
      negotiationId: negotiation.id,
      customerId: data.customerId,
    });

    return negotiation;
  }

  async updateNegotiationTerm(negotiationId: string, term: string, value: any, notes?: string): Promise<void> {
    await this.eventBus.publish('negotiation.term.updated', {
      negotiationId,
      term,
      value,
      notes,
      updatedAt: new Date(),
    });
  }

  async advanceStage(negotiationId: string, currentStage: string): Promise<void> {
    await this.eventBus.publish('negotiation.stage.advanced', {
      negotiationId,
      fromStage: currentStage,
      advancedAt: new Date(),
    });
  }

  async getNegotiationHistory(negotiationId: string): Promise<any[]> {
    return [
      { date: new Date('2024-10-01'), action: 'Negotiation started', user: 'Sales Manager' },
      { date: new Date('2024-10-05'), action: 'Initial proposal sent', user: 'Sales Team' },
      { date: new Date('2024-10-10'), action: 'Customer counter-offer received', user: 'Customer' },
      { date: new Date('2024-10-15'), action: 'Pricing revised', user: 'Pricing Team' },
    ];
  }
}

