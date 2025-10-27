import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { receivingOrders } from '../../../../database/schema/shared/wms.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

/**
 * Receiving Types Service
 * Different receiving approval workflows
 * Based on Axata: Giriş Onay Çeşitleri
 */
@Injectable()
export class ReceivingTypesService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Order-Based Free Entry
   * Axata: Siparişe Bağlı Serbest Giriş
   * No validation, quick entry
   */
  async createFreeReceiving(data: {
    warehouseId: string;
    poNumber: string;
    supplier: string;
    items: Array<{
      productId: string;
      quantity: number;
    }>;
  }, tenantId: string, userId: string) {
    const receivingNumber = `RCV-FREE-${Date.now()}`;

    const [order] = await this.db
      .insert(receivingOrders)
      .values({
        warehouseId: data.warehouseId,
        receivingNumber,
        poNumber: data.poNumber,
        supplier: data.supplier,
        status: 'auto_approved',
        receivedBy: userId,
        metadata: {
          receivingType: 'free',
          autoApproved: true,
          validationSkipped: true,
        },
      })
      .returning();

    await this.eventBus.emit('receiving.free.created', {
      receivingOrderId: order.id,
      tenantId,
    });

    return {
      receivingOrder: order,
      items: data.items,
      validationRequired: false,
    };
  }

  /**
   * Order-Based Planned Entry
   * Axata: Siparişe Bağlı Planlı Giriş
   * Validates against expected ASN
   */
  async createPlannedReceiving(data: {
    warehouseId: string;
    poNumber: string;
    asnNumber: string;
    expectedItems: Array<{
      productId: string;
      expectedQuantity: number;
      expectedDeliveryDate: Date;
    }>;
  }, tenantId: string, userId: string) {
    const receivingNumber = `RCV-PLAN-${Date.now()}`;

    const [order] = await this.db
      .insert(receivingOrders)
      .values({
        warehouseId: data.warehouseId,
        receivingNumber,
        poNumber: data.poNumber,
        status: 'pending_validation',
        receivedBy: userId,
        metadata: {
          receivingType: 'planned',
          asnNumber: data.asnNumber,
          expectedItems: data.expectedItems,
          requiresValidation: true,
        },
      })
      .returning();

    await this.eventBus.emit('receiving.planned.created', {
      receivingOrderId: order.id,
      asnNumber: data.asnNumber,
      tenantId,
    });

    return {
      receivingOrder: order,
      expectedItems: data.expectedItems,
      validationRequired: true,
    };
  }

  /**
   * Order-Based Controlled Entry
   * Axata: Siparişe Bağlı Kontrollü Giriş
   * Requires approval at each step
   */
  async createControlledReceiving(data: {
    warehouseId: string;
    poNumber: string;
    supplier: string;
    items: Array<{
      productId: string;
      quantity: number;
      requiresQc: boolean;
      qcCriteria?: string[];
    }>;
    approvers: string[];
  }, tenantId: string, userId: string) {
    const receivingNumber = `RCV-CTRL-${Date.now()}`;

    const [order] = await this.db
      .insert(receivingOrders)
      .values({
        warehouseId: data.warehouseId,
        receivingNumber,
        poNumber: data.poNumber,
        supplier: data.supplier,
        status: 'pending_approval',
        receivedBy: userId,
        metadata: {
          receivingType: 'controlled',
          requiresApproval: true,
          approvers: data.approvers,
          qcRequired: data.items.some(i => i.requiresQc),
          approvalWorkflow: {
            step: 1,
            totalSteps: data.approvers.length + (data.items.some(i => i.requiresQc) ? 1 : 0),
            currentApprover: data.approvers[0],
          },
        },
      })
      .returning();

    await this.eventBus.emit('receiving.controlled.created', {
      receivingOrderId: order.id,
      approvers: data.approvers,
      tenantId,
    });

    return {
      receivingOrder: order,
      items: data.items,
      approvalWorkflow: order.metadata.approvalWorkflow,
    };
  }

  /**
   * Free Entry (No PO)
   * Axata: Serbest Giriş
   */
  async createUnplannedReceiving(data: {
    warehouseId: string;
    supplier?: string;
    items: Array<{
      productId: string;
      quantity: number;
      lotNumber?: string;
    }>;
    reason: string;
  }, tenantId: string, userId: string) {
    const receivingNumber = `RCV-UNPL-${Date.now()}`;

    const [order] = await this.db
      .insert(receivingOrders)
      .values({
        warehouseId: data.warehouseId,
        receivingNumber,
        supplier: data.supplier,
        status: 'pending_supervisor_approval',
        receivedBy: userId,
        metadata: {
          receivingType: 'unplanned',
          noPurchaseOrder: true,
          reason: data.reason,
          requiresSupervisorApproval: true,
        },
      })
      .returning();

    await this.eventBus.emit('receiving.unplanned.created', {
      receivingOrderId: order.id,
      reason: data.reason,
      tenantId,
    });

    return {
      receivingOrder: order,
      items: data.items,
      requiresApproval: true,
    };
  }

  /**
   * Label-less Pallet Entry
   * Axata: Palet Etiketsiz Giriş
   */
  async createLabellessReceiving(data: {
    warehouseId: string;
    poNumber?: string;
    items: Array<{
      productId: string;
      quantity: number;
      palletNumber?: string;
    }>;
    generateLabelsImmediately: boolean;
  }, tenantId: string, userId: string) {
    const receivingNumber = `RCV-NOLBL-${Date.now()}`;

    const generatedPalletIds = [];

    for (const item of data.items) {
      const palletId = item.palletNumber || `PLT-${Date.now()}-${generatedPalletIds.length}`;
      generatedPalletIds.push(palletId);

      if (data.generateLabelsImmediately) {
        await this.eventBus.emit('pallet.label.generate', {
          palletId,
          productId: item.productId,
          quantity: item.quantity,
          tenantId,
        });
      }
    }

    const [order] = await this.db
      .insert(receivingOrders)
      .values({
        warehouseId: data.warehouseId,
        receivingNumber,
        poNumber: data.poNumber,
        status: 'labels_generated',
        receivedBy: userId,
        metadata: {
          receivingType: 'labelless',
          generatedPalletIds,
          labelsGenerated: data.generateLabelsImmediately,
        },
      })
      .returning();

    return {
      receivingOrder: order,
      generatedPalletIds,
      labelsGenerated: data.generateLabelsImmediately,
    };
  }

  /**
   * Approve receiving
   */
  async approveReceiving(data: {
    receivingOrderId: string;
    approverId: string;
    approvalNotes?: string;
  }, tenantId: string) {
    const [order] = await this.db
      .select()
      .from(receivingOrders)
      .where(eq(receivingOrders.id, data.receivingOrderId))
      .limit(1);

    if (!order) {
      throw new NotFoundException('Receiving order not found');
    }

    const workflow = order.metadata?.approvalWorkflow;
    const nextStep = (workflow?.step || 0) + 1;

    let newStatus = order.status;
    if (nextStep >= (workflow?.totalSteps || 1)) {
      newStatus = 'approved';
    }

    await this.db
      .update(receivingOrders)
      .set({
        status: newStatus,
        metadata: {
          ...order.metadata,
          approvalWorkflow: {
            ...workflow,
            step: nextStep,
            approvals: [
              ...(workflow?.approvals || []),
              {
                approverId: data.approverId,
                approvedAt: new Date(),
                notes: data.approvalNotes,
              },
            ],
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(receivingOrders.id, data.receivingOrderId));

    await this.eventBus.emit('receiving.approved', {
      receivingOrderId: data.receivingOrderId,
      approverId: data.approverId,
      finalApproval: newStatus === 'approved',
      tenantId,
    });

    return {
      receivingOrderId: data.receivingOrderId,
      status: newStatus,
      approvedBy: data.approverId,
      approvedAt: new Date(),
      workflowComplete: newStatus === 'approved',
    };
  }

  /**
   * Reject receiving
   */
  async rejectReceiving(data: {
    receivingOrderId: string;
    rejectedBy: string;
    rejectionReason: string;
  }, tenantId: string) {
    await this.db
      .update(receivingOrders)
      .set({
        status: 'rejected',
        metadata: {
          rejection: {
            rejectedBy: data.rejectedBy,
            reason: data.rejectionReason,
            rejectedAt: new Date(),
          },
        },
        updatedAt: new Date(),
      })
      .where(eq(receivingOrders.id, data.receivingOrderId));

    await this.eventBus.emit('receiving.rejected', {
      receivingOrderId: data.receivingOrderId,
      reason: data.rejectionReason,
      tenantId,
    });

    return {
      receivingOrderId: data.receivingOrderId,
      status: 'rejected',
      rejectedAt: new Date(),
    };
  }
}

