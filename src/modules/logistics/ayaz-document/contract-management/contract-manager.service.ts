import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, between } from 'drizzle-orm';
import { legalContracts, legalDocuments } from '../../../../database/schema/logistics/hukuk.schema';
import { billingContracts } from '../../../../database/schema/logistics/billing.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class ContractManagerService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createContract(data: {
    customerId: string;
    customerName: string;
    contractType: string;
    startDate: Date;
    endDate?: Date;
    terms?: any;
    clauses?: any;
  }, tenantId: string, userId: string) {
    const contractNumber = `CONT-${Date.now()}`;

    const [contract] = await this.db
      .insert(legalContracts)
      .values({
        tenantId,
        contractNumber,
        contractType: data.contractType,
        customerId: data.customerId,
        customerName: data.customerName,
        startDate: data.startDate,
        endDate: data.endDate,
        terms: data.terms,
        clauses: data.clauses,
        status: 'draft',
        approvalStatus: 'pending',
        createdBy: userId,
      })
      .returning();

    await this.eventBus.emit('contract.created', {
      contractId: contract.id,
      contractNumber,
      customerId: data.customerId,
      tenantId,
    });

    return contract;
  }

  async getContracts(tenantId: string, filters?: {
    customerId?: string;
    contractType?: string;
    status?: string;
    approvalStatus?: string;
  }) {
    let query = this.db.select().from(legalContracts).where(eq(legalContracts.tenantId, tenantId));

    if (filters?.customerId) {
      query = query.where(and(eq(legalContracts.tenantId, tenantId), eq(legalContracts.customerId, filters.customerId)));
    }

    if (filters?.contractType) {
      query = query.where(and(eq(legalContracts.tenantId, tenantId), eq(legalContracts.contractType, filters.contractType)));
    }

    if (filters?.status) {
      query = query.where(and(eq(legalContracts.tenantId, tenantId), eq(legalContracts.status, filters.status)));
    }

    if (filters?.approvalStatus) {
      query = query.where(and(eq(legalContracts.tenantId, tenantId), eq(legalContracts.approvalStatus, filters.approvalStatus)));
    }

    return await query;
  }

  async getContractById(contractId: string, tenantId: string) {
    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(and(eq(legalContracts.id, contractId), eq(legalContracts.tenantId, tenantId)))
      .limit(1);

    if (!contract) {
      throw new Error('Contract not found');
    }

    return contract;
  }

  async updateContract(contractId: string, data: any, tenantId: string) {
    const [updated] = await this.db
      .update(legalContracts)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(legalContracts.id, contractId), eq(legalContracts.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('contract.updated', { contractId, tenantId });

    return updated;
  }

  async submitForApproval(contractId: string, tenantId: string) {
    const [updated] = await this.db
      .update(legalContracts)
      .set({
        status: 'pending_approval',
        approvalStatus: 'pending',
        updatedAt: new Date(),
      })
      .where(and(eq(legalContracts.id, contractId), eq(legalContracts.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('contract.submitted.for.approval', {
      contractId,
      tenantId,
    });

    return updated;
  }

  async getExpiringContracts(tenantId: string, daysAhead: number = 30) {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    const expiring = await this.db
      .select()
      .from(legalContracts)
      .where(
        and(
          eq(legalContracts.tenantId, tenantId),
          eq(legalContracts.status, 'active'),
          lte(legalContracts.endDate, futureDate),
        ),
      );

    return {
      expiringContracts: expiring,
      count: expiring.length,
      daysAhead,
    };
  }

  async renewContract(contractId: string, newEndDate: Date, tenantId: string, userId: string) {
    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(and(eq(legalContracts.id, contractId), eq(legalContracts.tenantId, tenantId)))
      .limit(1);

    if (!contract) {
      throw new Error('Contract not found');
    }

    const [renewed] = await this.db
      .update(legalContracts)
      .set({
        endDate: newEndDate,
        updatedAt: new Date(),
        metadata: {
          ...contract.metadata,
          renewals: [
            ...(contract.metadata?.renewals || []),
            {
              oldEndDate: contract.endDate,
              newEndDate,
              renewedBy: userId,
              renewedAt: new Date(),
            },
          ],
        },
      })
      .where(eq(legalContracts.id, contractId))
      .returning();

    await this.eventBus.emit('contract.renewed', {
      contractId,
      newEndDate,
      tenantId,
    });

    return renewed;
  }

  async terminateContract(contractId: string, reason: string, tenantId: string) {
    const [updated] = await this.db
      .update(legalContracts)
      .set({
        status: 'terminated',
        updatedAt: new Date(),
        metadata: {
          terminationReason: reason,
          terminatedAt: new Date(),
        },
      })
      .where(and(eq(legalContracts.id, contractId), eq(legalContracts.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('contract.terminated', {
      contractId,
      reason,
      tenantId,
    });

    return updated;
  }

  async linkBillingContract(legalContractId: string, billingContractId: string, tenantId: string) {
    await this.db
      .update(legalContracts)
      .set({
        metadata: {
          billingContractId,
        },
        updatedAt: new Date(),
      })
      .where(and(eq(legalContracts.id, legalContractId), eq(legalContracts.tenantId, tenantId)));

    await this.eventBus.emit('contract.billing.linked', {
      legalContractId,
      billingContractId,
      tenantId,
    });

    return { linked: true };
  }

  async generateContractSummaryReport(tenantId: string) {
    const contracts = await this.db
      .select()
      .from(legalContracts)
      .where(eq(legalContracts.tenantId, tenantId));

    const summary = {
      total: contracts.length,
      active: contracts.filter((c: any) => c.status === 'active').length,
      pending: contracts.filter((c: any) => c.status === 'pending_approval').length,
      expired: contracts.filter((c: any) => c.status === 'expired').length,
      terminated: contracts.filter((c: any) => c.status === 'terminated').length,
      byType: {},
    };

    for (const contract of contracts) {
      const type = contract.contractType || 'unknown';
      summary.byType[type] = (summary.byType[type] || 0) + 1;
    }

    return summary;
  }
}
