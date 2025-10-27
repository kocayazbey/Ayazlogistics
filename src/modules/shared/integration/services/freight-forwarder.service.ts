import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import axios from 'axios';

interface FreightForwarder {
  id: string;
  name: string;
  code: string;
  services: string[];
  coverage: string[];
}

interface FreightQuoteRequest {
  origin: string;
  destination: string;
  incoterm: 'FOB' | 'CIF' | 'EXW' | 'DDP' | 'DAP';
  shipmentType: 'FCL' | 'LCL' | 'Air' | 'Road';
  weight: number;
  volume: number;
  commodityType: string;
  containerType?: '20ft' | '40ft' | '40ft HC';
}

@Injectable()
export class FreightForwarderService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async getForwarders(tenantId: string): Promise<FreightForwarder[]> {
    try {
      // Import freight forwarders schema
      const { freightForwarders } = await import('../../../../database/schema/shared/integration.schema');
      const { eq } = await import('drizzle-orm');

      const results = await this.db
        .select()
        .from(freightForwarders)
        .where(eq(freightForwarders.tenantId, tenantId));

      return results.map(ff => ({
        id: ff.id,
        name: ff.name,
        code: ff.code,
        services: ff.services || [],
        coverage: ff.coverage || []
      }));
    } catch (error) {
      console.error('Error fetching freight forwarders:', error);
      return [];
    }
  }

  async requestQuote(
    forwarderId: string,
    request: FreightQuoteRequest,
    tenantId: string,
  ): Promise<any> {
    try {
      // Import schemas
      const { freightForwarders, freightQuotes } = await import('../../../../database/schema/shared/integration.schema');
      const { eq } = await import('drizzle-orm');

      // Get forwarder details
      const forwarderResult = await this.db
        .select()
        .from(freightForwarders)
        .where(eq(freightForwarders.id, forwarderId))
        .limit(1);

      if (forwarderResult.length === 0) {
        throw new Error(`Freight forwarder not found: ${forwarderId}`);
      }

      const forwarder = forwarderResult[0];

      // Calculate quote based on request parameters
      const basePrice = this.calculateBasePrice(request);
      const quoteId = `QT-${Date.now()}`;

      // Save quote to database
      await this.db
        .insert(freightQuotes)
        .values({
          id: quoteId,
          forwarderId,
          tenantId,
          origin: request.origin,
          destination: request.destination,
          incoterm: request.incoterm,
          shipmentType: request.shipmentType,
          weight: request.weight,
          volume: request.volume,
          commodityType: request.commodityType,
          containerType: request.containerType,
          price: basePrice,
          currency: 'USD',
          transitTime: this.calculateTransitTime(request),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          status: 'pending'
        });

      return {
        quoteId,
        forwarderId,
        forwarderName: forwarder.name,
        price: basePrice,
        currency: 'USD',
        transitTime: this.calculateTransitTime(request),
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        services: ['ocean_freight', 'customs_clearance', 'port_handling'],
      };
    } catch (error) {
      console.error('Error requesting quote:', error);
      throw error;
    }
  }

  private calculateBasePrice(request: FreightQuoteRequest): number {
    let basePrice = 0;
    
    // Base price by shipment type
    switch (request.shipmentType) {
      case 'FCL':
        basePrice = 2000;
        break;
      case 'LCL':
        basePrice = 1500;
        break;
      case 'Air':
        basePrice = 3000;
        break;
      case 'Road':
        basePrice = 800;
        break;
    }

    // Weight factor
    if (request.weight > 1000) {
      basePrice += (request.weight - 1000) * 0.5;
    }

    // Volume factor
    if (request.volume > 10) {
      basePrice += (request.volume - 10) * 50;
    }

    return Math.round(basePrice);
  }

  private calculateTransitTime(request: FreightQuoteRequest): string {
    switch (request.shipmentType) {
      case 'FCL':
        return '15-20 days';
      case 'LCL':
        return '20-25 days';
      case 'Air':
        return '3-7 days';
      case 'Road':
        return '5-10 days';
      default:
        return '15-20 days';
    }
  }

  async bookShipment(quoteId: string, tenantId: string): Promise<any> {
    try {
      // Import schemas
      const { freightQuotes, freightBookings } = await import('../../../../database/schema/shared/integration.schema');
      const { eq } = await import('drizzle-orm');

      // Get quote details
      const quoteResult = await this.db
        .select()
        .from(freightQuotes)
        .where(eq(freightQuotes.id, quoteId))
        .limit(1);

      if (quoteResult.length === 0) {
        throw new Error(`Quote not found: ${quoteId}`);
      }

      const quote = quoteResult[0];
      const bookingId = `BK-${Date.now()}`;

      // Create booking
      await this.db
        .insert(freightBookings)
        .values({
          id: bookingId,
          quoteId,
          tenantId,
          status: 'confirmed',
          bookingDate: new Date(),
          documents: ['booking_confirmation', 'commercial_invoice', 'packing_list']
        });

      // Update quote status
      await this.db
        .update(freightQuotes)
        .set({ status: 'booked' })
        .where(eq(freightQuotes.id, quoteId));

      return {
        bookingId,
        status: 'confirmed',
        documents: ['booking_confirmation', 'commercial_invoice', 'packing_list'],
      };
    } catch (error) {
      console.error('Error booking shipment:', error);
      throw error;
    }
  }

  async trackShipment(bookingId: string, tenantId: string): Promise<any> {
    try {
      // Import schemas
      const { freightBookings, freightTracking } = await import('../../../../database/schema/shared/integration.schema');
      const { eq } = await import('drizzle-orm');

      // Get booking details
      const bookingResult = await this.db
        .select()
        .from(freightBookings)
        .where(eq(freightBookings.id, bookingId))
        .limit(1);

      if (bookingResult.length === 0) {
        throw new Error(`Booking not found: ${bookingId}`);
      }

      const booking = bookingResult[0];

      // Get tracking milestones
      const milestones = await this.db
        .select()
        .from(freightTracking)
        .where(eq(freightTracking.bookingId, bookingId))
        .orderBy(freightTracking.timestamp);

      return {
        bookingId,
        status: booking.status,
        currentLocation: milestones.length > 0 ? milestones[milestones.length - 1].location : 'Unknown',
        estimatedArrival: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        milestones: milestones.map(m => ({
          location: m.location,
          status: m.status,
          timestamp: m.timestamp,
          description: m.description
        })),
      };
    } catch (error) {
      console.error('Error tracking shipment:', error);
      throw error;
    }
  }
}

