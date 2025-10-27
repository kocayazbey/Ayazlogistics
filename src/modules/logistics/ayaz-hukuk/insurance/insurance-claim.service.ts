import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface InsuranceClaim {
  id: string;
  policyNumber: string;
  claimType: 'cargo_damage' | 'theft' | 'accident' | 'liability';
  incidentId?: string;
  shipmentId?: string;
  claimAmount: number;
  currency: string;
  description: string;
  filedBy: string;
  filedAt: Date;
  status: 'filed' | 'under_review' | 'approved' | 'rejected' | 'paid';
  approvedAmount?: number;
  paidAmount?: number;
  paidAt?: Date;
  adjusterNotes?: string;
  documents: string[];
}

@Injectable()
export class InsuranceClaimService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async fileClaim(data: Omit<InsuranceClaim, 'id' | 'filedAt' | 'status' | 'documents'>): Promise<InsuranceClaim> {
    const claim: InsuranceClaim = {
      ...data,
      id: `CLAIM-${Date.now()}`,
      filedAt: new Date(),
      status: 'filed',
      documents: [],
    };

    await this.eventBus.publish('insurance.claim.filed', {
      claimId: claim.id,
      amount: claim.claimAmount,
      type: claim.claimType,
    });

    return claim;
  }

  async updateClaimStatus(
    claimId: string,
    status: 'under_review' | 'approved' | 'rejected',
    notes?: string,
    approvedAmount?: number
  ): Promise<InsuranceClaim> {
    const claim = await this.getClaim(claimId);
    
    claim.status = status;
    claim.adjusterNotes = notes;
    
    if (status === 'approved' && approvedAmount) {
      claim.approvedAmount = approvedAmount;
    }

    await this.eventBus.publish('insurance.claim.status_updated', {
      claimId,
      status,
      approvedAmount,
    });

    return claim;
  }

  async recordPayment(claimId: string, amount: number, paymentDate: Date = new Date()): Promise<InsuranceClaim> {
    const claim = await this.getClaim(claimId);
    
    claim.paidAmount = amount;
    claim.paidAt = paymentDate;
    claim.status = 'paid';

    await this.eventBus.publish('insurance.claim.paid', {
      claimId,
      amount,
    });

    return claim;
  }

  private async getClaim(id: string): Promise<InsuranceClaim> {
    return {
      id,
      policyNumber: 'POL-12345',
      claimType: 'cargo_damage',
      claimAmount: 15000,
      currency: 'TRY',
      description: 'Cargo damaged during transport',
      filedBy: 'user-1',
      filedAt: new Date(),
      status: 'filed',
      documents: [],
    };
  }

  async getClaimStatistics(startDate: Date, endDate: Date): Promise<any> {
    return {
      period: { startDate, endDate },
      totalClaims: 28,
      totalClaimAmount: 425000,
      approvedClaims: 22,
      approvedAmount: 365000,
      paidClaims: 18,
      paidAmount: 320000,
      avgProcessingTime: 15.5,
      approvalRate: 78.6,
      byType: {
        cargo_damage: 15,
        theft: 3,
        accident: 8,
        liability: 2,
      },
    };
  }
}

