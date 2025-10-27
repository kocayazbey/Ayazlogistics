import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { shipments } from '../../../../database/schema/shared/wms.schema';
import { shipmentTracking } from '../../../../database/schema/logistics/tracking.schema';
import { CacheService } from '../../common/services/cache.service';

interface TrackingEvent {
  status: string;
  location: string;
  timestamp: Date;
  description: string;
  latitude?: number;
  longitude?: number;
}

@Injectable()
export class OrderTrackingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly cacheService: CacheService,
  ) {}

  async trackOrder(orderNumber: string, customerId?: string) {
    const [shipment] = await this.db
      .select()
      .from(shipments)
      .where(eq(shipments.shipmentNumber, orderNumber))
      .limit(1);

    if (!shipment) {
      throw new Error('Order not found');
    }

    const trackingEvents = await this.db
      .select()
      .from(shipmentTracking)
      .where(eq(shipmentTracking.shipmentId, shipment.id));

    const events: TrackingEvent[] = trackingEvents.map((event: any) => ({
      status: event.status,
      location: event.location,
      timestamp: event.timestamp,
      description: event.description,
      latitude: event.latitude ? parseFloat(event.latitude) : undefined,
      longitude: event.longitude ? parseFloat(event.longitude) : undefined,
    }));

    events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const estimatedDelivery = this.calculateEstimatedDelivery(shipment, events);

    return {
      orderNumber,
      shipment,
      currentStatus: shipment.status,
      trackingNumber: shipment.trackingNumber,
      events,
      estimatedDelivery,
      carrier: shipment.carrier,
      destination: {
        name: shipment.shipToName,
        address: shipment.shipToAddress,
      },
    };
  }

  async trackByTrackingNumber(trackingNumber: string) {
    const cacheKey = this.cacheService.generateKey('tracking', trackingNumber);

    return this.cacheService.wrap(cacheKey, async () => {
      const [shipment] = await this.db
        .select()
        .from(shipments)
        .where(eq(shipments.trackingNumber, trackingNumber))
        .limit(1);

      if (!shipment) {
        throw new Error('Tracking number not found');
      }

      const events = await this.db
        .select()
        .from(shipmentTracking)
        .where(eq(shipmentTracking.shipmentId, shipment.id));

      return {
        trackingNumber,
        shipmentNumber: shipment.shipmentNumber,
        currentStatus: shipment.status,
        events,
        estimatedDelivery: this.calculateEstimatedDelivery(shipment, events),
      };
    }, 180);
  }

  async getCustomerOrders(customerId: string, filters?: {
    status?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    return {
      customerId,
      orders: [],
      totalOrders: 0,
    };
  }

  async addTrackingEvent(shipmentId: string, event: {
    status: string;
    location: string;
    description?: string;
    latitude?: number;
    longitude?: number;
  }, tenantId: string) {
    const [trackingEvent] = await this.db
      .insert(shipmentTracking)
      .values({
        tenantId,
        shipmentId,
        status: event.status,
        location: event.location,
        description: event.description,
        latitude: event.latitude?.toString(),
        longitude: event.longitude?.toString(),
        timestamp: new Date(),
      })
      .returning();

    await this.db
      .update(shipments)
      .set({
        status: event.status,
        updatedAt: new Date(),
      })
      .where(eq(shipments.id, shipmentId));

    const [shipment] = await this.db
      .select()
      .from(shipments)
      .where(eq(shipments.id, shipmentId))
      .limit(1);

    if (shipment?.trackingNumber) {
      await this.cacheService.del(this.cacheService.generateKey('tracking', shipment.trackingNumber));
    }

    return trackingEvent;
  }

  private calculateEstimatedDelivery(shipment: any, events: any[]): Date {
    if (shipment.status === 'delivered' && shipment.deliveredAt) {
      return shipment.deliveredAt;
    }

    const shippedEvent = events.find((e: any) => e.status === 'shipped');
    const baseDate = shippedEvent?.timestamp || shipment.createdAt;

    const estimatedDate = new Date(baseDate);
    estimatedDate.setDate(estimatedDate.getDate() + 3);

    return estimatedDate;
  }

  async subscribeToOrderUpdates(orderNumber: string, email: string, phone?: string) {
    return {
      orderNumber,
      subscribed: true,
      email,
      phone,
      subscribedAt: new Date(),
    };
  }

  async getDeliveryProof(orderNumber: string) {
    const [shipment] = await this.db
      .select()
      .from(shipments)
      .where(eq(shipments.shipmentNumber, orderNumber))
      .limit(1);

    if (!shipment || shipment.status !== 'delivered') {
      throw new Error('Delivery proof not available');
    }

    return {
      orderNumber,
      deliveredAt: shipment.deliveredAt,
      signature: shipment.metadata?.signature,
      photo: shipment.metadata?.photo,
      recipientName: shipment.metadata?.recipientName,
      notes: shipment.metadata?.deliveryNotes,
    };
  }
}
