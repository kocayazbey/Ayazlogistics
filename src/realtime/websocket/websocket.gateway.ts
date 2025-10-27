import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { WsJwtGuard } from '../guards/ws-jwt.guard';

@WebSocketGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/wms',
})
export class WMSWebSocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(WMSWebSocketGateway.name);
  private connectedClients = new Map<string, Socket>();

  constructor(private readonly jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('WMS WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      client.data.userId = payload.sub;
      client.data.tenantId = payload.tenantId;
      client.data.warehouseId = payload.warehouseId;

      this.connectedClients.set(client.id, client);
      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub})`);

      // Join warehouse room
      if (payload.warehouseId) {
        client.join(`warehouse:${payload.warehouseId}`);
      }

      // Join tenant room
      if (payload.tenantId) {
        client.join(`tenant:${payload.tenantId}`);
      }

      client.emit('connected', { message: 'Connected to WMS WebSocket' });
    } catch (error) {
      this.logger.error('WebSocket connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.connectedClients.delete(client.id);
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('inventory:subscribe')
  handleInventorySubscribe(@ConnectedSocket() client: Socket) {
    const warehouseId = client.data.warehouseId;
    if (warehouseId) {
      client.join(`inventory:${warehouseId}`);
      client.emit('inventory:subscribed', { warehouseId });
    }
  }

  @SubscribeMessage('operations:subscribe')
  handleOperationsSubscribe(@ConnectedSocket() client: Socket) {
    const warehouseId = client.data.warehouseId;
    if (warehouseId) {
      client.join(`operations:${warehouseId}`);
      client.emit('operations:subscribed', { warehouseId });
    }
  }

  @SubscribeMessage('tracking:subscribe')
  handleTrackingSubscribe(@ConnectedSocket() client: Socket, @MessageBody() data: { shipmentId: string }) {
    client.join(`tracking:${data.shipmentId}`);
    client.emit('tracking:subscribed', { shipmentId: data.shipmentId });
  }

  // Broadcast methods
  broadcastInventoryUpdate(warehouseId: string, data: any) {
    this.server.to(`inventory:${warehouseId}`).emit('inventory:updated', data);
  }

  broadcastOperationUpdate(warehouseId: string, data: any) {
    this.server.to(`operations:${warehouseId}`).emit('operation:updated', data);
  }

  broadcastTrackingUpdate(shipmentId: string, data: any) {
    this.server.to(`tracking:${shipmentId}`).emit('tracking:updated', data);
  }

  broadcastAlert(tenantId: string, alert: any) {
    this.server.to(`tenant:${tenantId}`).emit('alert', alert);
  }

  // Get connected clients count
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  // Get clients by warehouse
  getClientsByWarehouse(warehouseId: string): Socket[] {
    const room = this.server.sockets.adapter.rooms.get(`warehouse:${warehouseId}`);
    if (!room) return [];
    
    return Array.from(room).map(socketId => this.connectedClients.get(socketId)).filter(Boolean);
  }
}
