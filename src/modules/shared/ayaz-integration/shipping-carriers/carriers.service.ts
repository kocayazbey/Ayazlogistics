import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { integrations, integrationLogs } from '../../../../database/schema/shared/integration.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class CarriersService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async registerCarrier(carrierName: string, provider: string, credentials: any, config: any, tenantId: string) {
    const [integration] = await this.db
      .insert(integrations)
      .values({
        tenantId,
        integrationName: carrierName,
        integrationType: 'shipping',
        provider,
        credentials,
        config,
      })
      .returning();

    await this.eventBus.emit('carrier.registered', { integrationId: integration.id, carrierName, tenantId });
    return integration;
  }

  async getShippingRate(integrationId: string, shipmentDetails: any) {
    const [integration] = await this.db
      .select()
      .from(integrations)
      .where(eq(integrations.id, integrationId))
      .limit(1);

    const startTime = Date.now();

    try {
      const rate = await this.callCarrierAPI(integration, 'get_rate', shipmentDetails);
      const duration = Date.now() - startTime;

      await this.logIntegration(integrationId, 'get_rate', shipmentDetails, rate, 200, true, duration);

      return rate;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await this.logIntegration(integrationId, 'get_rate', shipmentDetails, null, 500, false, duration, error.message);
      throw error;
    }
  }

  async createShipment(integrationId: string, shipmentData: any) {
    const [integration] = await this.db
      .select()
      .from(integrations)
      .where(eq(integrations.id, integrationId))
      .limit(1);

    const startTime = Date.now();

    try {
      const response = await this.callCarrierAPI(integration, 'create_shipment', shipmentData);
      const duration = Date.now() - startTime;

      await this.logIntegration(integrationId, 'create_shipment', shipmentData, response, 200, true, duration);

      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await this.logIntegration(integrationId, 'create_shipment', shipmentData, null, 500, false, duration, error.message);
      throw error;
    }
  }

  async trackShipment(integrationId: string, trackingNumber: string) {
    const [integration] = await this.db
      .select()
      .from(integrations)
      .where(eq(integrations.id, integrationId))
      .limit(1);

    const startTime = Date.now();

    try {
      const tracking = await this.callCarrierAPI(integration, 'track', { trackingNumber });
      const duration = Date.now() - startTime;

      await this.logIntegration(integrationId, 'track', { trackingNumber }, tracking, 200, true, duration);

      return tracking;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      await this.logIntegration(integrationId, 'track', { trackingNumber }, null, 500, false, duration, error.message);
      throw error;
    }
  }

  private async callCarrierAPI(integration: any, operation: string, data: any) {
    return { 
      success: true,
      operation,
      provider: integration.provider,
      data,
      mockResponse: true,
    };
  }

  private async logIntegration(integrationId: string, operation: string, request: any, response: any, statusCode: number, success: boolean, duration: number, errorMessage?: string) {
    await this.db.insert(integrationLogs).values({
      integrationId,
      operation,
      direction: 'outbound',
      request,
      response,
      statusCode,
      success,
      errorMessage,
      duration,
    });
  }
}

