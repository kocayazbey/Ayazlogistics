import { Injectable } from '@nestjs/common';
import { TrackingWebSocketGateway } from './websocket.gateway';
import { DatabaseService } from '../database/database.service';
import { eq } from 'drizzle-orm';
import { gpsTracking, routes } from '../../database/schema/logistics/tms.schema';

@Injectable()
export class TrackingWebSocketService {
  constructor(
    private readonly trackingGateway: TrackingWebSocketGateway,
    private readonly db: DatabaseService,
  ) {}

  async broadcastGPSUpdate(vehicleId: string, gpsData: {
    latitude: number;
    longitude: number;
    speed: number;
    heading: number;
    accuracy: number;
    timestamp: Date;
  }) {
    await this.db.client.insert(gpsTracking).values({
      vehicleId,
      ...gpsData,
    });

    const vehicleRoutes = await this.db.client
      .select()
      .from(routes)
      .where(eq(routes.vehicleId, vehicleId))
      .limit(1);

    if (vehicleRoutes.length > 0) {
      const routeId = vehicleRoutes[0].id;
      
      this.trackingGateway.sendLocationUpdate(`route:${routeId}`, {
        vehicleId,
        routeId,
        location: {
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
        },
        speed: gpsData.speed,
        heading: gpsData.heading,
        timestamp: gpsData.timestamp,
      });
    }

    this.trackingGateway.server.to(`vehicle:${vehicleId}`).emit('gps-update', {
      vehicleId,
      ...gpsData,
    });
  }

  async broadcastShipmentUpdate(shipmentId: string, update: {
    status: string;
    location?: { latitude: number; longitude: number };
    eta?: Date;
    progress?: number;
  }) {
    this.trackingGateway.sendShipmentUpdate(shipmentId, {
      shipmentId,
      ...update,
      timestamp: new Date(),
    });
  }

  async sendDeliveryAlert(shipmentId: string, alertType: string, message: string) {
    this.trackingGateway.sendAlert(shipmentId, {
      shipmentId,
      type: alertType,
      message,
      timestamp: new Date(),
    });
  }

  async broadcastRouteProgress(routeId: string, progress: {
    currentStop: number;
    totalStops: number;
    completedStops: number;
    remainingDistance: number;
    estimatedTimeRemaining: number;
  }) {
    this.trackingGateway.server.to(`route:${routeId}`).emit('route-progress', {
      routeId,
      ...progress,
      timestamp: new Date(),
    });
  }

  subscribeToVehicle(clientId: string, vehicleId: string) {
    const client = this.trackingGateway['connectedClients'].get(clientId);
    if (client) {
      client.join(`vehicle:${vehicleId}`);
    }
  }

  unsubscribeFromVehicle(clientId: string, vehicleId: string) {
    const client = this.trackingGateway['connectedClients'].get(clientId);
    if (client) {
      client.leave(`vehicle:${vehicleId}`);
    }
  }
}

