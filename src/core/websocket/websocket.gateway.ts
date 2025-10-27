import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Injectable } from '@nestjs/common';

@Injectable()
@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/tracking',
})
export class TrackingWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedClients: Map<string, Socket> = new Map();

  handleConnection(client: Socket) {
    console.log(`Client connected: ${client.id}`);
    this.connectedClients.set(client.id, client);
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
    this.connectedClients.delete(client.id);
  }

  @SubscribeMessage('subscribe-shipment')
  handleSubscribeShipment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { shipmentId: string },
  ) {
    client.join(`shipment:${data.shipmentId}`);
    return { event: 'subscribed', data: { shipmentId: data.shipmentId } };
  }

  @SubscribeMessage('unsubscribe-shipment')
  handleUnsubscribeShipment(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { shipmentId: string },
  ) {
    client.leave(`shipment:${data.shipmentId}`);
    return { event: 'unsubscribed', data: { shipmentId: data.shipmentId } };
  }

  sendShipmentUpdate(shipmentId: string, update: any) {
    this.server.to(`shipment:${shipmentId}`).emit('shipment-update', update);
  }

  sendLocationUpdate(shipmentId: string, location: any) {
    this.server.to(`shipment:${shipmentId}`).emit('location-update', location);
  }

  sendAlert(shipmentId: string, alert: any) {
    this.server.to(`shipment:${shipmentId}`).emit('alert', alert);
  }

  broadcastNotification(notification: any) {
    this.server.emit('notification', notification);
  }
}

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationWebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: Socket) {
    console.log(`Notification client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    console.log(`Notification client disconnected: ${client.id}`);
  }

  @SubscribeMessage('subscribe-user')
  handleSubscribeUser(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string },
  ) {
    client.join(`user:${data.userId}`);
  }

  sendUserNotification(userId: string, notification: any) {
    this.server.to(`user:${userId}`).emit('notification', notification);
  }

  sendBroadcast(notification: any) {
    this.server.emit('broadcast', notification);
  }
}
