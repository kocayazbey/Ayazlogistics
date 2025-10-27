import { Injectable, Inject, NotFoundException, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte } from 'drizzle-orm';
import { purchaseOrders, purchaseOrderLines, suppliers } from '../../../../../database/schema/shared/erp-procurement.schema';
import { EventBusService } from '../../../../../core/events/event-bus.service';

@Injectable()
export class PurchaseOrdersService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createPurchaseOrder(data: {
    supplierId: string;
    orderDate: Date;
    expectedDeliveryDate?: Date;
    lines: Array<{
      stockCardId?: string;
      description: string;
      quantity: number;
      unitPrice: number;
    }>;
    paymentTerms?: string;
    notes?: string;
  }, tenantId: string, userId: string) {
    const [supplier] = await this.db
      .select()
      .from(suppliers)
      .where(eq(suppliers.id, data.supplierId))
      .limit(1);

    if (!supplier) {
      throw new NotFoundException('Supplier not found');
    }

    let subtotal = 0;
    for (const line of data.lines) {
      subtotal += line.quantity * line.unitPrice;
    }

    const taxRate = 0.20;
    const taxAmount = subtotal * taxRate;
    const shippingCost = 0;
    const totalAmount = subtotal + taxAmount + shippingCost;

    const poNumber = `PO-${Date.now()}`;

    const [po] = await this.db
      .insert(purchaseOrders)
      .values({
        tenantId,
        poNumber,
        supplierId: data.supplierId,
        orderDate: data.orderDate,
        expectedDeliveryDate: data.expectedDeliveryDate,
        status: 'draft',
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        shippingCost: shippingCost.toString(),
        totalAmount: totalAmount.toString(),
        paymentTerms: data.paymentTerms || supplier.paymentTerms,
        notes: data.notes,
        createdBy: userId,
      })
      .returning();

    for (let i = 0; i < data.lines.length; i++) {
      const line = data.lines[i];
      const lineTotal = line.quantity * line.unitPrice;

      await this.db
        .insert(purchaseOrderLines)
        .values({
          purchaseOrderId: po.id,
          stockCardId: line.stockCardId,
          lineNumber: i + 1,
          description: line.description,
          quantity: line.quantity,
          unitPrice: line.unitPrice.toString(),
          lineTotal: lineTotal.toString(),
          receivedQuantity: 0,
          lineStatus: 'pending',
        });
    }

    await this.eventBus.emit('purchase.order.created', { poId: po.id, supplierId: data.supplierId, tenantId });

    return po;
  }

  async getPurchaseOrders(tenantId: string, filters?: {
    supplierId?: string;
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    let query = this.db.select().from(purchaseOrders).where(eq(purchaseOrders.tenantId, tenantId));

    if (filters?.supplierId) {
      query = query.where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.supplierId, filters.supplierId)));
    }

    if (filters?.status) {
      query = query.where(and(eq(purchaseOrders.tenantId, tenantId), eq(purchaseOrders.status, filters.status)));
    }

    if (filters?.startDate && filters?.endDate) {
      query = query.where(
        and(
          eq(purchaseOrders.tenantId, tenantId),
          gte(purchaseOrders.orderDate, filters.startDate),
          lte(purchaseOrders.orderDate, filters.endDate),
        ),
      );
    }

    return await query;
  }

  async approvePurchaseOrder(poId: string, approverId: string, tenantId: string) {
    const [updated] = await this.db
      .update(purchaseOrders)
      .set({
        status: 'approved',
        approvedBy: approverId,
        approvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Purchase order not found');
    }

    await this.eventBus.emit('purchase.order.approved', { poId, approverId, tenantId });

    return updated;
  }

  async receivePurchaseOrder(poId: string, lineReceipts: Array<{
    lineId: string;
    receivedQuantity: number;
  }>, tenantId: string) {
    const [po] = await this.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, tenantId)))
      .limit(1);

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    for (const receipt of lineReceipts) {
      const [line] = await this.db
        .select()
        .from(purchaseOrderLines)
        .where(eq(purchaseOrderLines.id, receipt.lineId))
        .limit(1);

      if (!line) continue;

      const newReceivedQty = (line.receivedQuantity || 0) + receipt.receivedQuantity;
      const lineStatus = newReceivedQty >= line.quantity ? 'received' : 'partial';

      await this.db
        .update(purchaseOrderLines)
        .set({
          receivedQuantity: newReceivedQty,
          lineStatus,
          updatedAt: new Date(),
        })
        .where(eq(purchaseOrderLines.id, receipt.lineId));
    }

    const allLines = await this.db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, poId));

    const allReceived = allLines.every((line: any) => line.lineStatus === 'received');
    const anyPartial = allLines.some((line: any) => line.lineStatus === 'partial');

    let newStatus = po.status;
    if (allReceived) {
      newStatus = 'received';
    } else if (anyPartial) {
      newStatus = 'partial';
    }

    const [updated] = await this.db
      .update(purchaseOrders)
      .set({
        status: newStatus,
        actualDeliveryDate: allReceived ? new Date() : undefined,
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, poId))
      .returning();

    await this.eventBus.emit('purchase.order.received', { poId, status: newStatus, tenantId });

    return updated;
  }

  async getPurchaseOrderWithLines(poId: string, tenantId: string) {
    const [po] = await this.db
      .select()
      .from(purchaseOrders)
      .where(and(eq(purchaseOrders.id, poId), eq(purchaseOrders.tenantId, tenantId)))
      .limit(1);

    if (!po) {
      throw new NotFoundException('Purchase order not found');
    }

    const lines = await this.db
      .select()
      .from(purchaseOrderLines)
      .where(eq(purchaseOrderLines.purchaseOrderId, poId));

    return {
      ...po,
      lines,
    };
  }
}
