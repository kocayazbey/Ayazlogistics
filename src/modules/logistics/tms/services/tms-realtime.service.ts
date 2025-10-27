import { Injectable } from '@nestjs/common';
import { WebSocketGateway, WebSocketServer, SubscribeMessage, MessageBody, ConnectedSocket } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { DatabaseService } from '../../../../core/database/database.service';
import { eq, and, gte } from 'drizzle-orm';
import { gpsTracking, vehicles, routes } from '../../../../database/schema/logistics/tms.schema';

interface GPSLocation {
  vehicleId: string;
  latitude: number;
  longitude: number;
  speed?: number;
  heading?: number;
  accuracy?: number;
  timestamp: Date;
  driverId?: string;
  routeId?: string;
}

interface VehicleStatus {
  vehicleId: string;
  status: 'moving' | 'stopped' | 'idle' | 'offline';
  currentLocation: {
    latitude: number;
    longitude: number;
  };
  speed: number;
  lastUpdate: Date;
}

@Injectable()
@WebSocketGateway({
  namespace: '/tms/tracking',
  cors: {
    origin: '*',
  },
})
export class TMSRealtimeService {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Socket> = new Map();
  private vehicleSubscriptions: Map<string, Set<string>> = new Map(); // vehicleId -> Set of socketIds
  private routeSubscriptions: Map<string, Set<string>> = new Map(); // routeId -> Set of socketIds

  constructor(private readonly db: DatabaseService) {
    // Simulate real-time updates every 5 seconds
    setInterval(() => this.simulateVehicleUpdates(), 5000);
  }

  @SubscribeMessage('subscribe:vehicle')
  handleVehicleSubscribe(
    @MessageBody() data: { vehicleId: string; tenantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { vehicleId } = data;
    
    if (!this.vehicleSubscriptions.has(vehicleId)) {
      this.vehicleSubscriptions.set(vehicleId, new Set());
    }
    
    this.vehicleSubscriptions.get(vehicleId)!.add(client.id);
    this.connectedClients.set(client.id, client);
    
    return {
      success: true,
      message: `Subscribed to vehicle ${vehicleId}`,
      vehicleId,
    };
  }

  @SubscribeMessage('unsubscribe:vehicle')
  handleVehicleUnsubscribe(
    @MessageBody() data: { vehicleId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { vehicleId } = data;
    
    if (this.vehicleSubscriptions.has(vehicleId)) {
      this.vehicleSubscriptions.get(vehicleId)!.delete(client.id);
    }
    
    return {
      success: true,
      message: `Unsubscribed from vehicle ${vehicleId}`,
    };
  }

  @SubscribeMessage('subscribe:route')
  handleRouteSubscribe(
    @MessageBody() data: { routeId: string; tenantId: string },
    @ConnectedSocket() client: Socket,
  ) {
    const { routeId } = data;
    
    if (!this.routeSubscriptions.has(routeId)) {
      this.routeSubscriptions.set(routeId, new Set());
    }
    
    this.routeSubscriptions.get(routeId)!.add(client.id);
    this.connectedClients.set(client.id, client);
    
    return {
      success: true,
      message: `Subscribed to route ${routeId}`,
      routeId,
    };
  }

  @SubscribeMessage('update:location')
  async handleLocationUpdate(
    @MessageBody() data: GPSLocation,
    @ConnectedSocket() client: Socket,
  ) {
    // Save to database
    await this.db.client.insert(gpsTracking).values({
      vehicleId: data.vehicleId,
      latitude: data.latitude.toString(),
      longitude: data.longitude.toString(),
      speed: data.speed?.toString(),
      heading: data.heading?.toString(),
      accuracy: data.accuracy?.toString(),
      timestamp: data.timestamp,
    });

    // Broadcast to subscribers
    this.broadcastLocationUpdate(data);

    return {
      success: true,
      message: 'Location updated',
      vehicleId: data.vehicleId,
    };
  }

  @SubscribeMessage('get:vehicle:status')
  async handleGetVehicleStatus(
    @MessageBody() data: { vehicleId: string; tenantId: string },
  ) {
    const status = await this.getVehicleStatus(data.vehicleId, data.tenantId);
    return status;
  }

  @SubscribeMessage('get:fleet:status')
  async handleGetFleetStatus(
    @MessageBody() data: { tenantId: string },
  ) {
    const fleetStatus = await this.getFleetStatus(data.tenantId);
    return fleetStatus;
  }

  private broadcastLocationUpdate(location: GPSLocation) {
    // Broadcast to vehicle subscribers
    if (this.vehicleSubscriptions.has(location.vehicleId)) {
      const subscribers = this.vehicleSubscriptions.get(location.vehicleId)!;
      subscribers.forEach((socketId) => {
        const client = this.connectedClients.get(socketId);
        if (client) {
          client.emit('vehicle:location:update', {
            vehicleId: location.vehicleId,
            latitude: location.latitude,
            longitude: location.longitude,
            speed: location.speed,
            heading: location.heading,
            timestamp: location.timestamp,
          });
        }
      });
    }

    // Broadcast to route subscribers if applicable
    if (location.routeId && this.routeSubscriptions.has(location.routeId)) {
      const subscribers = this.routeSubscriptions.get(location.routeId)!;
      subscribers.forEach((socketId) => {
        const client = this.connectedClients.get(socketId);
        if (client) {
          client.emit('route:vehicle:update', {
            routeId: location.routeId,
            vehicleId: location.vehicleId,
            latitude: location.latitude,
            longitude: location.longitude,
            speed: location.speed,
            timestamp: location.timestamp,
          });
        }
      });
    }

    // Broadcast to all connected clients (for fleet view)
    this.server.emit('fleet:location:update', {
      vehicleId: location.vehicleId,
      latitude: location.latitude,
      longitude: location.longitude,
      speed: location.speed,
      timestamp: location.timestamp,
    });
  }

  async getVehicleStatus(vehicleId: string, tenantId: string): Promise<VehicleStatus | null> {
    // Get latest GPS tracking
    const latestLocation = await this.db.client
      .select()
      .from(gpsTracking)
      .where(eq(gpsTracking.vehicleId, vehicleId))
      .orderBy(gpsTracking.timestamp)
      .limit(1);

    if (!latestLocation.length) {
      return null;
    }

    const location = latestLocation[0];
    const speed = parseFloat(location.speed || '0');
    
    let status: 'moving' | 'stopped' | 'idle' | 'offline' = 'stopped';
    const timeSinceUpdate = Date.now() - new Date(location.timestamp).getTime();
    
    if (timeSinceUpdate > 15 * 60 * 1000) {
      status = 'offline';
    } else if (speed > 5) {
      status = 'moving';
    } else if (speed > 0 && speed <= 5) {
      status = 'idle';
    } else {
      status = 'stopped';
    }

    return {
      vehicleId,
      status,
      currentLocation: {
        latitude: parseFloat(location.latitude),
        longitude: parseFloat(location.longitude),
      },
      speed,
      lastUpdate: new Date(location.timestamp),
    };
  }

  async getFleetStatus(tenantId: string) {
    const allVehicles = await this.db.client
      .select()
      .from(vehicles)
      .where(eq(vehicles.tenantId, tenantId));

    const statuses = await Promise.all(
      allVehicles.map((vehicle) => this.getVehicleStatus(vehicle.id, tenantId))
    );

    const validStatuses = statuses.filter((s) => s !== null) as VehicleStatus[];

    return {
      total: allVehicles.length,
      active: validStatuses.filter((s) => s.status === 'moving').length,
      idle: validStatuses.filter((s) => s.status === 'idle').length,
      stopped: validStatuses.filter((s) => s.status === 'stopped').length,
      offline: validStatuses.filter((s) => s.status === 'offline').length,
      vehicles: validStatuses,
    };
  }

  async getVehicleHistory(vehicleId: string, startTime: Date, endTime: Date) {
    const history = await this.db.client
      .select()
      .from(gpsTracking)
      .where(
        and(
          eq(gpsTracking.vehicleId, vehicleId),
          gte(gpsTracking.timestamp, startTime.toISOString())
        )
      )
      .orderBy(gpsTracking.timestamp);

    return history.map((point) => ({
      latitude: parseFloat(point.latitude),
      longitude: parseFloat(point.longitude),
      speed: parseFloat(point.speed || '0'),
      heading: parseFloat(point.heading || '0'),
      timestamp: point.timestamp,
    }));
  }

  async getRouteProgress(routeId: string, tenantId: string) {
    const route = await this.db.client
      .select()
      .from(routes)
      .where(and(eq(routes.id, routeId), eq(routes.tenantId, tenantId)))
      .limit(1);

    if (!route.length || !route[0].vehicleId) {
      return null;
    }

    const vehicleStatus = await this.getVehicleStatus(route[0].vehicleId, tenantId);

    return {
      routeId,
      status: route[0].status,
      vehicleStatus,
      currentLocation: vehicleStatus?.currentLocation,
      estimatedProgress: 45, // Calculate based on stops completed
      estimatedTimeToComplete: 2.5, // hours
    };
  }

  private async simulateVehicleUpdates() {
    // This is a simulation - in production, GPS devices would send actual data
    const allVehiclesResult = await this.db.client.select().from(vehicles).limit(10);

    for (const vehicle of allVehiclesResult) {
      const simulatedLocation: GPSLocation = {
        vehicleId: vehicle.id,
        latitude: 41.0082 + Math.random() * 0.1 - 0.05,
        longitude: 28.9784 + Math.random() * 0.1 - 0.05,
        speed: Math.random() * 80,
        heading: Math.random() * 360,
        accuracy: 10 + Math.random() * 20,
        timestamp: new Date(),
      };

      // Don't save to DB in simulation, just broadcast
      this.broadcastLocationUpdate(simulatedLocation);
    }
  }

  handleDisconnect(client: Socket) {
    // Clean up subscriptions
    this.vehicleSubscriptions.forEach((subscribers) => {
      subscribers.delete(client.id);
    });
    this.routeSubscriptions.forEach((subscribers) => {
      subscribers.delete(client.id);
    });
    this.connectedClients.delete(client.id);
  }
}

