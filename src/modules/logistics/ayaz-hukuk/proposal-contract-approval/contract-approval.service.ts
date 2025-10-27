import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { legalContracts, legalApprovals } from '../../../../database/schema/logistics/hukuk.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { NotificationsService } from '../../ayaz-user-portal/notifications/notifications.service';

@Injectable()
export class ContractApprovalService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async submitForLegalReview(contractId: string, tenantId: string, submittedBy: string) {
    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(and(eq(legalContracts.id, contractId), eq(legalContracts.tenantId, tenantId)))
      .limit(1);

    if (!contract) {
      throw new Error('Contract not found');
    }

    await this.db
      .update(legalContracts)
      .set({
        approvalStatus: 'legal_review',
        updatedAt: new Date(),
      })
      .where(eq(legalContracts.id, contractId));

    await this.db.insert(legalApprovals).values({
      contractId,
      approvalStage: 'legal_review',
      approverRole: 'legal',
      decision: 'pending',
    });

    await this.eventBus.emit('contract.legal.review.requested', {
      contractId,
      contractNumber: contract.contractNumber,
      tenantId,
    });

    return {
      contractId,
      status: 'legal_review',
      submittedAt: new Date(),
    };
  }

  async approveLegalReview(contractId: string, approverId: string, comments?: string, tenantId?: string) {
    await this.db
      .update(legalApprovals)
      .set({
        approverId,
        decision: 'approved',
        comments,
        approvedAt: new Date(),
      })
      .where(
        and(
          eq(legalApprovals.contractId, contractId),
          eq(legalApprovals.approvalStage, 'legal_review'),
        ),
      );

    await this.db
      .update(legalContracts)
      .set({
        legalApprovedBy: approverId,
        legalApprovedAt: new Date(),
        approvalStatus: 'admin_approval',
        updatedAt: new Date(),
      })
      .where(eq(legalContracts.id, contractId));

    await this.db.insert(legalApprovals).values({
      contractId,
      approvalStage: 'admin_approval',
      approverRole: 'admin',
      decision: 'pending',
    });

    await this.eventBus.emit('contract.legal.approved', {
      contractId,
      approverId,
    });

    return {
      contractId,
      stage: 'admin_approval',
      approvedBy: approverId,
      approvedAt: new Date(),
    };
  }

  async rejectLegalReview(contractId: string, approverId: string, reason: string) {
    await this.db
      .update(legalApprovals)
      .set({
        approverId,
        decision: 'rejected',
        comments: reason,
        approvedAt: new Date(),
      })
      .where(
        and(
          eq(legalApprovals.contractId, contractId),
          eq(legalApprovals.approvalStage, 'legal_review'),
        ),
      );

    await this.db
      .update(legalContracts)
      .set({
        approvalStatus: 'rejected',
        rejectionReason: reason,
        updatedAt: new Date(),
      })
      .where(eq(legalContracts.id, contractId));

    await this.eventBus.emit('contract.legal.rejected', {
      contractId,
      approverId,
      reason,
    });

    return {
      contractId,
      status: 'rejected',
      reason,
      rejectedBy: approverId,
      rejectedAt: new Date(),
    };
  }

  async approveAdmin(contractId: string, approverId: string, comments?: string) {
    await this.db
      .update(legalApprovals)
      .set({
        approverId,
        decision: 'approved',
        comments,
        approvedAt: new Date(),
      })
      .where(
        and(
          eq(legalApprovals.contractId, contractId),
          eq(legalApprovals.approvalStage, 'admin_approval'),
        ),
      );

    await this.db
      .update(legalContracts)
      .set({
        adminApprovedBy: approverId,
        adminApprovedAt: new Date(),
        approvalStatus: 'customer_signature',
        status: 'pending_signature',
        updatedAt: new Date(),
      })
      .where(eq(legalContracts.id, contractId));

    await this.eventBus.emit('contract.admin.approved', {
      contractId,
      approverId,
    });

    return {
      contractId,
      stage: 'customer_signature',
      approvedBy: approverId,
      approvedAt: new Date(),
    };
  }

  async customerSign(contractId: string, signatureData: string, customerId: string) {
    const [updated] = await this.db
      .update(legalContracts)
      .set({
        customerSignature: signatureData,
        customerSignedAt: new Date(),
        approvalStatus: 'completed',
        status: 'active',
        updatedAt: new Date(),
      })
      .where(eq(legalContracts.id, contractId))
      .returning();

    await this.db.insert(legalApprovals).values({
      contractId,
      approvalStage: 'customer_signature',
      decision: 'approved',
      comments: 'Customer signed',
      approvedAt: new Date(),
    });

    await this.eventBus.emit('contract.customer.signed', {
      contractId,
      customerId,
    });

    return updated;
  }

  async getApprovalWorkflow(contractId: string) {
    const approvals = await this.db
      .select()
      .from(legalApprovals)
      .where(eq(legalApprovals.contractId, contractId));

    const workflow = {
      contractId,
      stages: [
        {
          stage: 'legal_review',
          status: 'pending',
          approver: null,
          decision: null,
          approvedAt: null,
        },
        {
          stage: 'admin_approval',
          status: 'pending',
          approver: null,
          decision: null,
          approvedAt: null,
        },
        {
          stage: 'customer_signature',
          status: 'pending',
          approver: null,
          decision: null,
          approvedAt: null,
        },
      ],
    };

    for (const approval of approvals) {
      const stage = workflow.stages.find((s) => s.stage === approval.approvalStage);
      if (stage) {
        stage.status = approval.decision;
        stage.approver = approval.approverId;
        stage.decision = approval.decision;
        stage.approvedAt = approval.approvedAt;
      }
    }

    return workflow;
  }

  async getPendingApprovals(tenantId: string, approverRole: string) {
    const stage = approverRole === 'legal' ? 'legal_review' : 'admin_approval';

    const pendingApprovals = await this.db
      .select()
      .from(legalApprovals)
      .where(
        and(
          eq(legalApprovals.approvalStage, stage),
          eq(legalApprovals.decision, 'pending'),
        ),
      );

    const contractIds = pendingApprovals.map((a: any) => a.contractId);

    if (contractIds.length === 0) {
      return [];
    }

    const contracts = await this.db
      .select()
      .from(legalContracts)
      .where(eq(legalContracts.tenantId, tenantId));

    return contracts.filter((c: any) => contractIds.includes(c.id));
  }

  async delegateApproval(contractId: string, fromApproverId: string, toApproverId: string, reason: string) {
    await this.eventBus.emit('approval.delegated', {
      contractId,
      fromApproverId,
      toApproverId,
      reason,
    });

    return {
      contractId,
      delegatedFrom: fromApproverId,
      delegatedTo: toApproverId,
      reason,
      delegatedAt: new Date(),
    };
  }

  async escalateApproval(contractId: string, escalatedBy: string, reason: string) {
    await this.eventBus.emit('approval.escalated', {
      contractId,
      escalatedBy,
      reason,
    });

    return {
      contractId,
      escalatedBy,
      reason,
      escalatedAt: new Date(),
      status: 'escalated',
    };
  }
}
