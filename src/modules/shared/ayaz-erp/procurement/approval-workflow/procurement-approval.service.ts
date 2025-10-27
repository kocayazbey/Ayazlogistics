import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../../core/events/event-bus.service';
import { pgTable, uuid, varchar, text, timestamp, decimal } from 'drizzle-orm/pg-core';
import { tenants } from '../../../../../database/schema/core/tenants.schema';
import { users } from '../../../../../database/schema/core/users.schema';

export const procurementApprovals = pgTable('erp_procurement_approvals', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  purchaseOrderId: uuid('purchase_order_id').notNull(),
  approvalLevel: varchar('approval_level', { length: 50 }).notNull(),
  approverId: uuid('approver_id').references(() => users.id),
  status: varchar('status', { length: 20 }).default('pending'),
  comments: text('comments'),
  approvedAt: timestamp('approved_at'),
  rejectedAt: timestamp('rejected_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const approvalLimits = pgTable('erp_approval_limits', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id, { onDelete: 'cascade' }),
  roleLevel: varchar('role_level', { length: 50 }).notNull(),
  minAmount: decimal('min_amount', { precision: 12, scale: 2 }).notNull(),
  maxAmount: decimal('max_amount', { precision: 12, scale: 2 }),
  requiresAdditionalApproval: varchar('requires_additional', { length: 20 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

@Injectable()
export class ProcurementApprovalService {
  private readonly approvalHierarchy = [
    { level: 'team_lead', maxAmount: 10000 },
    { level: 'manager', maxAmount: 50000 },
    { level: 'director', maxAmount: 200000 },
    { level: 'cfo', maxAmount: 1000000 },
    { level: 'ceo', maxAmount: Infinity },
  ];

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async submitForApproval(
    purchaseOrderId: string,
    amount: number,
    tenantId: string,
  ): Promise<any[]> {
    const requiredLevels = this.getRequiredApprovalLevels(amount);
    const approvals = [];

    for (const level of requiredLevels) {
      const [approval] = await this.db.insert(procurementApprovals).values({
        tenantId,
        purchaseOrderId,
        approvalLevel: level,
        status: 'pending',
      }).returning();

      approvals.push(approval);
    }

    await this.eventBus.emit('procurement.submitted.for.approval', {
      purchaseOrderId,
      amount,
      approvalLevels: requiredLevels,
    });

    return approvals;
  }

  async approvePurchaseOrder(
    purchaseOrderId: string,
    approvalLevel: string,
    approverId: string,
    comments?: string,
  ): Promise<any> {
    const [approval] = await this.db
      .update(procurementApprovals)
      .set({
        approverId,
        status: 'approved',
        comments,
        approvedAt: new Date(),
      })
      .where(
        and(
          eq(procurementApprovals.purchaseOrderId, purchaseOrderId),
          eq(procurementApprovals.approvalLevel, approvalLevel),
        ),
      )
      .returning();

    const allApprovals = await this.db
      .select()
      .from(procurementApprovals)
      .where(eq(procurementApprovals.purchaseOrderId, purchaseOrderId));

    const allApproved = allApprovals.every((a) => a.status === 'approved');

    if (allApproved) {
      await this.eventBus.emit('procurement.fully.approved', {
        purchaseOrderId,
        finalApproverId: approverId,
      });
    }

    return approval;
  }

  async rejectPurchaseOrder(
    purchaseOrderId: string,
    approvalLevel: string,
    approverId: string,
    reason: string,
  ): Promise<any> {
    const [approval] = await this.db
      .update(procurementApprovals)
      .set({
        approverId,
        status: 'rejected',
        comments: reason,
        rejectedAt: new Date(),
      })
      .where(
        and(
          eq(procurementApprovals.purchaseOrderId, purchaseOrderId),
          eq(procurementApprovals.approvalLevel, approvalLevel),
        ),
      )
      .returning();

    await this.db
      .update(procurementApprovals)
      .set({ status: 'cancelled' })
      .where(
        and(
          eq(procurementApprovals.purchaseOrderId, purchaseOrderId),
          eq(procurementApprovals.status, 'pending'),
        ),
      );

    await this.eventBus.emit('procurement.rejected', {
      purchaseOrderId,
      rejectedBy: approverId,
      level: approvalLevel,
    });

    return approval;
  }

  async getApprovalStatus(purchaseOrderId: string): Promise<any> {
    const approvals = await this.db
      .select()
      .from(procurementApprovals)
      .where(eq(procurementApprovals.purchaseOrderId, purchaseOrderId))
      .orderBy(procurementApprovals.createdAt);

    const totalLevels = approvals.length;
    const approvedLevels = approvals.filter((a) => a.status === 'approved').length;
    const rejectedLevels = approvals.filter((a) => a.status === 'rejected').length;

    const status = rejectedLevels > 0
      ? 'rejected'
      : approvedLevels === totalLevels
      ? 'fully_approved'
      : 'pending_approval';

    return {
      purchaseOrderId,
      status,
      totalLevels,
      approvedLevels,
      rejectedLevels,
      approvals,
    };
  }

  private getRequiredApprovalLevels(amount: number): string[] {
    const levels: string[] = [];

    for (const level of this.approvalHierarchy) {
      if (amount <= level.maxAmount) {
        levels.push(level.level);
        break;
      }
      levels.push(level.level);
    }

    return levels;
  }
}

