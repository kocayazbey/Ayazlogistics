import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

/**
 * Returns Management Service
 * Handles various types of returns
 * Based on Axata: İade İşlemleri Çeşitliliği
 */
@Injectable()
export class ReturnsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  /**
   * Order Return Entry
   * Axata: Sipariş İade Girişi
   */
  async createOrderReturn(data: {
    originalOrderNumber: string;
    warehouseId: string;
    customerId: string;
    returnReason: string;
    items: Array<{
      productId: string;
      quantity: number;
      returnCondition: 'good' | 'damaged' | 'expired' | 'wrong_item';
      damageNotes?: string;
      photoUrl?: string;
    }>;
    rmaNumber?: string;
  }, tenantId: string, userId: string) {
    const returnNumber = `RET-ORD-${Date.now()}`;

    const returnRecord = {
      id: `return-${Date.now()}`,
      returnNumber,
      returnType: 'order_return',
      originalOrderNumber: data.originalOrderNumber,
      warehouseId: data.warehouseId,
      customerId: data.customerId,
      returnReason: data.returnReason,
      rmaNumber: data.rmaNumber,
      items: data.items,
      status: 'pending_inspection',
      createdBy: userId,
      createdAt: new Date(),
    };

    await this.eventBus.emit('return.order.created', {
      returnId: returnRecord.id,
      returnNumber,
      tenantId,
    });

    return returnRecord;
  }

  /**
   * Dock Return Entry
   * Axata: Perondan İade Girişi
   */
  async createDockReturn(data: {
    warehouseId: string;
    dockLocation: string;
    palletId: string;
    returnReason: string;
    supervisor: string;
    items: Array<{
      productId: string;
      quantity: number;
      condition: string;
    }>;
  }, tenantId: string, userId: string) {
    const returnNumber = `RET-DOCK-${Date.now()}`;

    const returnRecord = {
      id: `return-dock-${Date.now()}`,
      returnNumber,
      returnType: 'dock_return',
      warehouseId: data.warehouseId,
      dockLocation: data.dockLocation,
      palletId: data.palletId,
      returnReason: data.returnReason,
      supervisor: data.supervisor,
      items: data.items,
      status: 'in_review',
      createdBy: userId,
      createdAt: new Date(),
    };

    await this.eventBus.emit('return.dock.created', {
      returnId: returnRecord.id,
      returnNumber,
      tenantId,
    });

    return returnRecord;
  }

  /**
   * Picking Cart Return
   * Axata: Toplama Arabasından İade Girişi
   */
  async createPickingCartReturn(data: {
    warehouseId: string;
    cartId: string;
    pickingOrderId: string;
    items: Array<{
      productId: string;
      quantity: number;
      returnReason: 'damaged' | 'wrong_item' | 'overpick' | 'other';
      toLocationId: string;
    }>;
  }, tenantId: string, userId: string) {
    const returnNumber = `RET-CART-${Date.now()}`;

    // Return items back to inventory
    for (const item of data.items) {
      // Update inventory at specified location
      await this.eventBus.emit('item.returned.from.cart', {
        productId: item.productId,
        quantity: item.quantity,
        locationId: item.toLocationId,
        reason: item.returnReason,
      });
    }

    return {
      returnNumber,
      returnType: 'cart_return',
      cartId: data.cartId,
      pickingOrderId: data.pickingOrderId,
      itemsReturned: data.items.length,
      totalQuantity: data.items.reduce((sum, item) => sum + item.quantity, 0),
      processedAt: new Date(),
    };
  }

  /**
   * Customer Return Entry
   * Axata: Müşteriden İade Girişi
   */
  async createCustomerReturn(data: {
    customerId: string;
    warehouseId: string;
    originalInvoiceNumber?: string;
    returnReason: string;
    returnMethod: 'customer_drop_off' | 'carrier_pickup' | 'field_return';
    items: Array<{
      productId: string;
      quantity: number;
      condition: 'new' | 'opened' | 'used' | 'damaged';
      serialNumbers?: string[];
      customerNotes?: string;
    }>;
    refundMethod?: 'credit' | 'exchange' | 'refund';
    approvalRequired?: boolean;
  }, tenantId: string, userId: string) {
    const returnNumber = `RET-CUST-${Date.now()}`;

    const returnRecord = {
      id: `return-cust-${Date.now()}`,
      returnNumber,
      returnType: 'customer_return',
      customerId: data.customerId,
      warehouseId: data.warehouseId,
      originalInvoiceNumber: data.originalInvoiceNumber,
      returnReason: data.returnReason,
      returnMethod: data.returnMethod,
      items: data.items,
      refundMethod: data.refundMethod,
      status: data.approvalRequired ? 'pending_approval' : 'pending_inspection',
      createdBy: userId,
      createdAt: new Date(),
    };

    await this.eventBus.emit('return.customer.created', {
      returnId: returnRecord.id,
      returnNumber,
      customerId: data.customerId,
      approvalRequired: data.approvalRequired,
      tenantId,
    });

    return returnRecord;
  }

  /**
   * Process return inspection
   */
  async inspectReturn(data: {
    returnId: string;
    inspectionResults: Array<{
      productId: string;
      quantity: number;
      inspectedCondition: 'accept' | 'reject' | 'regrade';
      disposition: 'restock' | 'quarantine' | 'dispose' | 'repair';
      notes?: string;
    }>;
    inspector: string;
  }, tenantId: string) {
    const inspectionId = `INSP-RET-${Date.now()}`;

    // Process each item based on disposition
    for (const result of data.inspectionResults) {
      if (result.disposition === 'restock') {
        await this.eventBus.emit('return.item.restocked', {
          productId: result.productId,
          quantity: result.quantity,
          tenantId,
        });
      } else if (result.disposition === 'quarantine') {
        await this.eventBus.emit('return.item.quarantined', {
          productId: result.productId,
          quantity: result.quantity,
          tenantId,
        });
      }
    }

    await this.eventBus.emit('return.inspected', {
      returnId: data.returnId,
      inspectionId,
      inspector: data.inspector,
      tenantId,
    });

    return {
      returnId: data.returnId,
      inspectionId,
      inspectedItems: data.inspectionResults.length,
      inspector: data.inspector,
      inspectedAt: new Date(),
    };
  }

  /**
   * Get return reasons catalog
   */
  getReturnReasons() {
    return [
      { code: 'damaged_in_transit', name: 'Damaged in Transit', requiresPhoto: true },
      { code: 'wrong_item', name: 'Wrong Item Shipped', requiresPhoto: false },
      { code: 'defective', name: 'Defective Product', requiresPhoto: true },
      { code: 'expired', name: 'Expired Product', requiresPhoto: false },
      { code: 'customer_changed_mind', name: 'Customer Changed Mind', requiresPhoto: false },
      { code: 'not_as_described', name: 'Not as Described', requiresPhoto: true },
      { code: 'overship', name: 'Overshipped Quantity', requiresPhoto: false },
      { code: 'quality_issue', name: 'Quality Issue', requiresPhoto: true },
      { code: 'packaging_damaged', name: 'Packaging Damaged', requiresPhoto: true },
      { code: 'other', name: 'Other (specify in notes)', requiresPhoto: false },
    ];
  }
}

