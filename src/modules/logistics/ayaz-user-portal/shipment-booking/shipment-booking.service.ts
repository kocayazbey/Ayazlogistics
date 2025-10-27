import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface ShipmentBookingRequest {
  customerId: string;
  serviceType: 'standard' | 'express' | 'economy' | 'same_day';
  shipmentType: 'document' | 'package' | 'pallet' | 'ltl' | 'ftl';
  pickupAddress: {
    contactName: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
    country: string;
    instructions?: string;
  };
  deliveryAddress: {
    contactName: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    district: string;
    postalCode?: string;
    country: string;
    instructions?: string;
  };
  pickupDate: Date;
  pickupTimeSlot?: string;
  deliveryDate?: Date;
  packages: Array<{
    weight: number;
    length: number;
    width: number;
    height: number;
    quantity: number;
    description: string;
    value?: number;
    isFragile?: boolean;
    requiresSpecialHandling?: boolean;
  }>;
  additionalServices?: {
    insurance?: boolean;
    insuranceValue?: number;
    signatureRequired?: boolean;
    saturdayDelivery?: boolean;
    cod?: boolean;
    codAmount?: number;
  };
  paymentType: 'sender' | 'receiver' | 'third_party';
  references?: {
    purchaseOrder?: string;
    invoice?: string;
    customerReference?: string;
  };
  notes?: string;
}

interface ShipmentBooking {
  id: string;
  bookingNumber: string;
  customerId: string;
  status: 'draft' | 'confirmed' | 'pickup_scheduled' | 'picked_up' | 'in_transit' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  carrierName?: string;
  estimatedCost?: number;
  actualCost?: number;
  createdAt: Date;
}

@Injectable()
export class ShipmentBookingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createBooking(
    request: ShipmentBookingRequest,
    tenantId: string,
    userId: string,
  ): Promise<ShipmentBooking> {
    const bookingId = `BK-${Date.now()}`;
    const bookingNumber = `BOOK-${Date.now()}`;

    const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight * pkg.quantity, 0);
    const estimatedCost = await this.calculateEstimatedCost(request);

    const booking: ShipmentBooking = {
      id: bookingId,
      bookingNumber,
      customerId: request.customerId,
      status: 'draft',
      estimatedCost,
      createdAt: new Date(),
    };

    await this.eventBus.emit('shipment.booking.created', {
      bookingId,
      bookingNumber,
      customerId: request.customerId,
      serviceType: request.serviceType,
      estimatedCost,
      tenantId,
    });

    return booking;
  }

  async confirmBooking(
    bookingId: string,
    selectedCarrier: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.eventBus.emit('shipment.booking.confirmed', {
      bookingId,
      selectedCarrier,
      confirmedBy: userId,
      tenantId,
    });
  }

  async getQuotes(bookingId: string, tenantId: string): Promise<Array<{
    carrier: string;
    service: string;
    price: number;
    currency: string;
    estimatedDelivery: string;
  }>> {
    // Mock quotes from multiple carriers
    return [
      {
        carrier: 'DHL',
        service: 'Express',
        price: 150,
        currency: 'TRY',
        estimatedDelivery: '1-2 business days',
      },
      {
        carrier: 'Yurtiçi Kargo',
        service: 'Standard',
        price: 85,
        currency: 'TRY',
        estimatedDelivery: '2-3 business days',
      },
      {
        carrier: 'MNG Kargo',
        service: 'Economy',
        price: 65,
        currency: 'TRY',
        estimatedDelivery: '3-5 business days',
      },
    ];
  }

  async cancelBooking(
    bookingId: string,
    reason: string,
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.eventBus.emit('shipment.booking.cancelled', {
      bookingId,
      reason,
      cancelledBy: userId,
      tenantId,
    });
  }

  async getBooking(bookingId: string, tenantId: string): Promise<ShipmentBooking | null> {
    // Mock: Would query shipment_bookings table
    return null;
  }

  async getCustomerBookings(
    customerId: string,
    filters: {
      status?: string;
      startDate?: Date;
      endDate?: Date;
    },
    tenantId: string,
  ): Promise<ShipmentBooking[]> {
    // Mock: Would query with filters
    return [];
  }

  private async calculateEstimatedCost(request: ShipmentBookingRequest): Promise<number> {
    const baseRate = {
      'same_day': 200,
      'express': 120,
      'standard': 75,
      'economy': 50,
    }[request.serviceType] || 75;

    const totalWeight = request.packages.reduce((sum, pkg) => sum + pkg.weight * pkg.quantity, 0);
    const weightCost = totalWeight * 0.5;

    let additionalCost = 0;
    if (request.additionalServices?.insurance) {
      additionalCost += (request.additionalServices.insuranceValue || 0) * 0.01;
    }
    if (request.additionalServices?.saturdayDelivery) {
      additionalCost += 50;
    }
    if (request.additionalServices?.cod) {
      additionalCost += 25;
    }

    return baseRate + weightCost + additionalCost;
  }
}

