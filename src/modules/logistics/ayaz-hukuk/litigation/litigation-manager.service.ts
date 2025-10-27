import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface LegalCase {
  id: string;
  caseNumber: string;
  caseType: 'contract_dispute' | 'liability_claim' | 'employment' | 'regulatory' | 'commercial';
  plaintiff: string;
  defendant: string;
  court: string;
  filingDate: Date;
  status: 'filed' | 'discovery' | 'trial' | 'appeal' | 'settled' | 'closed';
  claimAmount?: number;
  settlementAmount?: number;
  legalFirm?: string;
  assignedLawyer?: string;
  nextHearing?: Date;
  documents: string[];
  notes: string[];
}

@Injectable()
export class LitigationManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async registerCase(data: Omit<LegalCase, 'id' | 'documents' | 'notes'>): Promise<LegalCase> {
    const legalCase: LegalCase = {
      ...data,
      id: `CASE-${Date.now()}`,
      documents: [],
      notes: [],
    };

    await this.eventBus.publish('litigation.case.registered', {
      caseId: legalCase.id,
      caseType: legalCase.caseType,
      claimAmount: legalCase.claimAmount,
    });

    return legalCase;
  }

  async updateCaseStatus(caseId: string, status: string, notes?: string): Promise<LegalCase> {
    const legalCase = await this.getCase(caseId);
    legalCase.status = status as any;
    
    if (notes) {
      legalCase.notes.push(`${new Date().toISOString()}: ${notes}`);
    }

    await this.eventBus.publish('litigation.case.status_updated', {
      caseId,
      status,
    });

    return legalCase;
  }

  async recordSettlement(caseId: string, amount: number): Promise<LegalCase> {
    const legalCase = await this.getCase(caseId);
    legalCase.settlementAmount = amount;
    legalCase.status = 'settled';

    await this.eventBus.publish('litigation.case.settled', {
      caseId,
      settlementAmount: amount,
    });

    return legalCase;
  }

  private async getCase(id: string): Promise<LegalCase> {
    return {
      id,
      caseNumber: 'CASE-2024-001',
      caseType: 'contract_dispute',
      plaintiff: 'ABC Company',
      defendant: 'AyazLogistics',
      court: 'Istanbul Commercial Court',
      filingDate: new Date('2024-06-01'),
      status: 'discovery',
      claimAmount: 250000,
      legalFirm: 'Law Firm XYZ',
      assignedLawyer: 'Av. Ahmet Yılmaz',
      documents: [],
      notes: [],
    };
  }

  async getLitigationReport(startDate: Date, endDate: Date): Promise<any> {
    return {
      period: { startDate, endDate },
      totalCases: 12,
      activeCases: 8,
      settledCases: 3,
      closedCases: 1,
      totalClaimAmount: 1250000,
      totalSettlementAmount: 450000,
      avgCaseDuration: 125,
      legalCostsIncurred: 185000,
    };
  }
}

