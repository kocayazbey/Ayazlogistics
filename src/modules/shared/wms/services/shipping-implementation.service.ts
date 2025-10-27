import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, sql } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { shipments } from '../../../../database/schema/shared/wms.schema';

@Injectable()
export class ShippingImplementationService {
  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createShipment(data: {
    tenantId: string;
    warehouseId: string;
    orderId: string;
    customerId: string;
    carrier?: string;
    shipToName: string;
    shipToAddress: string;
    items: any[];
    createdBy: string;
  }): Promise<any> {
    const shipmentNumber = `SHIP-${Date.now()}`;
    const trackingNumber = `TRACK-${Date.now()}`;

    const [shipment] = await this.db.insert(shipments).values({
      tenantId: data.tenantId,
      warehouseId: data.warehouseId,
      shipmentNumber,
      orderId: data.orderId,
      customerId: data.customerId,
      trackingNumber,
      carrier: data.carrier,
      shipToName: data.shipToName,
      shipToAddress: data.shipToAddress,
      status: 'preparing',
      items: data.items,
      createdBy: data.createdBy,
    }).returning();

    await this.eventBus.emit('shipment.created', { shipmentId: shipment.id });
    return shipment;
  }

  async packShipment(shipmentId: string, packagingDetails: any): Promise<any> {
    const [updated] = await this.db
      .update(shipments)
      .set({
        status: 'packed',
        metadata: sql`COALESCE(${shipments.metadata}, '{}'::jsonb) || ${JSON.stringify(packagingDetails)}::jsonb`,
      })
      .where(eq(shipments.id, shipmentId))
      .returning();

    await this.eventBus.emit('shipment.packed', { shipmentId });
    return updated;
  }

  async dispatchShipment(shipmentId: string, userId: string): Promise<any> {
    const [updated] = await this.db
      .update(shipments)
      .set({
        status: 'dispatched',
        shippedDate: new Date(),
      })
      .where(eq(shipments.id, shipmentId))
      .returning();

    await this.eventBus.emit('shipment.dispatched', { shipmentId });
    return updated;
  }

  async getShipments(tenantId: string, filters?: any): Promise<any[]> {
    let query = this.db.select().from(shipments).where(eq(shipments.tenantId, tenantId));
    return await query;
  }
}

