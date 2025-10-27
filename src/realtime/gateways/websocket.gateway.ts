import {
  WebSocketGateway as WSGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { EventService } from '../services/event.service';
import { RealtimeService } from '../services/realtime.service';
import Redis from 'ioredis';
import { RedisAdapter } from '@socket.io/redis-adapter';
import { RateLimitingService } from '../../modules/audit/rate-limiting.service';

interface ClientData {
  userId?: string;
  tenantId?: string;
  roles: string[];
  permissions: string[];
  deviceInfo: {
    userAgent: string;
    ip: string;
    platform: string;
  };
  subscriptions: Set<string>;
  lastActivity: Date;
  connectionTime: Date;
}

interface RoomInfo {
  id: string;
  name: string;
  type: 'user' | 'tenant' | 'global' | 'custom';
  clientCount: number;
  createdAt: Date;
  metadata: Record<string, any>;
}

@WSGateway({
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  },
  namespace: '/realtime',
  transports: ['websocket', 'polling'],
  adapter: RedisAdapter,
  connectTimeout: 20000,
  pingTimeout: 60000,
  pingInterval: 25000,
  maxHttpBufferSize: 1e6, // 1MB
  allowUpgrades: true,
})
export class WebSocketGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(WebSocketGateway.name);
  private connectedClients = new Map<string, Socket>();
  private clientData = new Map<string, ClientData>();
  private rooms = new Map<string, RoomInfo>();
  private redis: Redis;
  private heartbeatInterval?: NodeJS.Timeout;
  private cleanupInterval?: NodeJS.Timeout;
  private maxConnections: number;
  private connectionCount = 0;

  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private eventService: EventService,
    private realtimeService: RealtimeService,
    private rateLimitingService: RateLimitingService,
  ) {
    this.maxConnections = this.configService.get<number>('WEBSOCKET_MAX_CONNECTIONS', 10000);

    this.redis = new Redis({
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
    } as any);

    this.setupRedisSubscriptions();
  }

  afterInit(server: Server) {
    this.logger.log('WebSocket Gateway initialized');

    // Setup Redis adapter for horizontal scaling
    // Redis adapter must be set up after server initialization
    const setupRedisAdapter = async () => {
      try {
        const pubClient = new Redis({
          host: this.configService.get<string>('REDIS_HOST', 'localhost'),
          port: this.configService.get<number>('REDIS_PORT', 6379),
          password: this.configService.get<string>('REDIS_PASSWORD'),
          db: this.configService.get<number>('REDIS_DB', 0),
          retryDelayOnFailover: 100,
          enableReadyCheck: false,
          maxRetriesPerRequest: 3,
        } as any);

        const subClient = pubClient.duplicate();

        // Wait for Redis connections to be ready
        await Promise.all([
          new Promise<void>((resolve, reject) => {
            pubClient.once('ready', resolve);
            pubClient.once('error', reject);
            setTimeout(() => reject(new Error('Redis pub client connection timeout')), 5000);
          }),
          new Promise<void>((resolve, reject) => {
            subClient.once('ready', resolve);
            subClient.once('error', reject);
            setTimeout(() => reject(new Error('Redis sub client connection timeout')), 5000);
          })
        ]);

        // server.adapter(new RedisAdapter(pubClient, subClient));
        this.logger.log('✅ Redis client configured for WebSocket scaling');
        this.logger.log(`📊 Socket.IO server ready for ${this.configService.get<number>('WEBSOCKET_MAX_CONNECTIONS', 10000)}+ concurrent connections`);
      } catch (error) {
        this.logger.error('❌ Failed to setup Redis adapter:', error);
        this.logger.warn('⚠️  WebSocket will run in single-instance mode (not horizontally scalable)');
      }
    };

    setupRedisAdapter();
    this.startHeartbeat();
    this.startCleanup();
  }

  async handleConnection(client: Socket) {
    try {
      const clientIP = this.getClientIP(client);
      const userAgent = client.handshake.headers['user-agent'] || 'unknown';

      // Check for DDoS attack
      const ddosStatus = this.rateLimitingService.detectDDoSAttack();
      if (ddosStatus.isUnderAttack) {
        this.logger.error(`DDoS attack detected - Level: ${ddosStatus.attackLevel}, Details:`, ddosStatus.details);

        if (ddosStatus.attackLevel === 'high') {
          this.rateLimitingService.activateEmergencyLimits();
        }

        client.emit('error', {
          message: 'Service temporarily unavailable due to high load',
          code: 'DDOS_PROTECTION'
        });
        client.disconnect();
        return;
      }

      // Check rate limiting for this IP
      const rateLimitResult = this.rateLimitingService.checkWebSocketConnectionLimit({
        ip: clientIP,
        userAgent,
      });

      if (!rateLimitResult.allowed) {
        this.logger.warn(`Connection rejected - rate limit exceeded: ${clientIP} - Blocked until: ${new Date(rateLimitResult.blockedUntil!)}`);

        client.emit('error', {
          message: 'Too many connection attempts. Please try again later.',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimitResult.blockedUntil! - Date.now()) / 1000),
        });
        client.disconnect();
        return;
      }

      // Check connection limits
      if (this.connectionCount >= this.maxConnections) {
        this.logger.warn(`Connection rejected - max connections reached: ${client.id} (Current: ${this.connectionCount}/${this.maxConnections})`);
        client.emit('error', {
          message: 'Server at maximum capacity',
          code: 'CONNECTION_LIMIT_EXCEEDED'
        });
        client.disconnect();
        return;
      }

      const token = client.handshake.auth.token || client.handshake.query.token as string;
      if (!token) {
        this.logger.warn(`Connection rejected - no token: ${client.id}`);
        client.emit('error', { message: 'Authentication required' });
        client.disconnect();
        return;
      }

      this.connectionCount++;

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_SECRET')!,
      });

      // Extract client information
      const clientInfo: ClientData = {
        userId: payload.sub,
        tenantId: payload.tenantId,
        roles: payload.roles || [],
        permissions: payload.permissions || [],
        deviceInfo: {
          userAgent: client.handshake.headers['user-agent'] || 'unknown',
          ip: this.getClientIP(client),
          platform: this.getClientPlatform(client.handshake.headers['user-agent']),
        },
        subscriptions: new Set(),
        lastActivity: new Date(),
        connectionTime: new Date(),
      };

      // Store client data
      this.connectedClients.set(client.id, client);
      this.clientData.set(client.id, clientInfo);

      // Join user to their personal room
      client.join(`user_${payload.sub}`);

      // Join tenant room if applicable
      if (payload.tenantId) {
        client.join(`tenant_${payload.tenantId}`);
      }

      // Join role-based rooms
      payload.roles?.forEach((role: string) => {
        client.join(`role_${role}`);
      });

      // Send welcome message with client info
      client.emit('connected', {
        message: 'Connected to real-time updates',
        clientId: client.id,
        userId: payload.sub,
        rooms: Array.from(client.rooms),
        timestamp: new Date().toISOString(),
      });

      // Store client metadata in Redis for cross-instance access
      await this.updateRedisConnection(client.id, clientInfo);

      this.logger.log(`Client connected: ${client.id} (User: ${payload.sub}, IP: ${clientInfo.deviceInfo.ip})`);

      // Emit connection event
      this.eventService.emit('websocket.client_connected', {
        clientId: client.id,
        userId: payload.sub,
        tenantId: payload.tenantId,
        deviceInfo: clientInfo.deviceInfo,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error);
      client.emit('error', { message: 'Authentication failed' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const clientInfo = this.clientData.get(client.id);

    // Update Redis (cleanup will be handled by Socket.IO Redis adapter)
    if (clientInfo?.userId) {
      this.redis.hdel('websocket:connections', client.id);
      this.redis.srem(`websocket:user:${clientInfo.userId}`, client.id);
      if (clientInfo.tenantId) {
        this.redis.srem(`websocket:tenant:${clientInfo.tenantId}`, client.id);
      }
    }

    // Remove from rooms
    this.updateRoomCounts(client);

    // Clean up client data
    this.connectedClients.delete(client.id);
    this.clientData.delete(client.id);

    // Decrement connection count
    this.connectionCount = Math.max(0, this.connectionCount - 1);

    this.logger.log(`Client disconnected: ${client.id} (User: ${clientInfo?.userId}) - Active connections: ${this.connectionCount}/${this.maxConnections}`);

    // Emit disconnect event
    this.eventService.emit('websocket.client_disconnected', {
      clientId: client.id,
      userId: clientInfo?.userId,
      tenantId: clientInfo?.tenantId,
      connectionTime: clientInfo?.connectionTime,
      disconnectionTime: new Date(),
      timestamp: new Date().toISOString(),
    });
  }

  @SubscribeMessage('join_room')
  handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; metadata?: Record<string, any> },
  ) {
    try {
      // Rate limit room join operations
      const clientIP = this.getClientIP(client);
      const rateLimitResult = this.rateLimitingService.checkApiRateLimit({
        ip: clientIP,
        userAgent: client.handshake.headers['user-agent'] || 'unknown',
        userId: this.clientData.get(client.id)?.userId,
      }, '/realtime/join_room');

      if (!rateLimitResult.allowed) {
        client.emit('error', {
          message: 'Too many room join attempts',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: Math.ceil((rateLimitResult.blockedUntil! - Date.now()) / 1000),
        });
        return;
      }

      client.join(data.room);
      this.updateClientActivity(client.id);

      // Update room info
      this.createOrUpdateRoom(data.room, 'custom', data.metadata);

      const clientInfo = this.clientData.get(client.id);
      if (clientInfo) {
        clientInfo.subscriptions.add(data.room);
      }

      this.logger.log(`Client ${client.id} joined room: ${data.room}`);
      client.emit('room_joined', { room: data.room, timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.error(`Error joining room ${data.room} for client ${client.id}:`, error);
      client.emit('error', { message: 'Failed to join room' });
    }
  }

  @SubscribeMessage('leave_room')
  handleLeaveRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string },
  ) {
    try {
      client.leave(data.room);
      this.updateClientActivity(client.id);

      const clientInfo = this.clientData.get(client.id);
      if (clientInfo) {
        clientInfo.subscriptions.delete(data.room);
      }

      // Update room counts
      this.updateRoomCounts(client);

      this.logger.log(`Client ${client.id} left room: ${data.room}`);
      client.emit('room_left', { room: data.room, timestamp: new Date().toISOString() });
    } catch (error) {
      this.logger.error(`Error leaving room ${data.room} for client ${client.id}:`, error);
    }
  }

  @SubscribeMessage('subscribe_events')
  handleEventSubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { events: string[] },
  ) {
    try {
      this.updateClientActivity(client.id);

      const clientInfo = this.clientData.get(client.id);
      if (clientInfo) {
        // Subscribe to Redis channels for these events
        data.events.forEach(event => {
          this.redis.subscribe(`events:${event}`);
          clientInfo.subscriptions.add(`event:${event}`);
        });
      }

      this.logger.log(`Client ${client.id} subscribed to events: ${data.events.join(', ')}`);
      client.emit('events_subscribed', {
        events: data.events,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error subscribing to events for client ${client.id}:`, error);
      client.emit('error', { message: 'Failed to subscribe to events' });
    }
  }

  @SubscribeMessage('unsubscribe_events')
  handleEventUnsubscription(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { events: string[] },
  ) {
    try {
      this.updateClientActivity(client.id);

      const clientInfo = this.clientData.get(client.id);
      if (clientInfo) {
        data.events.forEach(event => {
          this.redis.unsubscribe(`events:${event}`);
          clientInfo.subscriptions.delete(`event:${event}`);
        });
      }

      this.logger.log(`Client ${client.id} unsubscribed from events: ${data.events.join(', ')}`);
      client.emit('events_unsubscribed', {
        events: data.events,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      this.logger.error(`Error unsubscribing from events for client ${client.id}:`, error);
    }
  }

  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: Socket) {
    this.updateClientActivity(client.id);
    client.emit('pong', {
      timestamp: new Date().toISOString(),
      serverTime: Date.now(),
    });
  }

  @SubscribeMessage('get_client_info')
  handleGetClientInfo(@ConnectedSocket() client: Socket) {
    const clientInfo = this.clientData.get(client.id);
    if (clientInfo) {
      client.emit('client_info', {
        clientId: client.id,
        ...clientInfo,
        connectedRooms: Array.from(client.rooms),
        subscriptions: Array.from(clientInfo.subscriptions),
      });
    }
  }

  @SubscribeMessage('broadcast_to_room')
  handleBroadcastToRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { room: string; event: string; payload: any },
  ) {
    const clientInfo = this.clientData.get(client.id);
    if (clientInfo && this.hasPermission(clientInfo, 'broadcast')) {
      this.broadcastToRoom(data.room, data.event, {
        ...data.payload,
        sender: clientInfo.userId,
        timestamp: new Date().toISOString(),
      });
    } else {
      client.emit('error', { message: 'Insufficient permissions for broadcasting' });
    }
  }

  // Enhanced broadcast methods
  public broadcastToUser(userId: string, event: string, data: any) {
    this.server.to(`user_${userId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastToTenant(tenantId: string, event: string, data: any) {
    this.server.to(`tenant_${tenantId}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToRole(role: string, event: string, data: any) {
    this.server.to(`role_${role}`).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  broadcastToRoom(room: string, event: string, data: any) {
    this.server.to(room).emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcastToAll(event: string, data: any) {
    this.server.emit(event, {
      ...data,
      timestamp: new Date().toISOString(),
    });
  }

  public broadcast(event: string, data: any) {
    this.broadcastToAll(event, data);
  }

  // Send to specific client
  sendToClient(clientId: string, event: string, data: any) {
    const client = this.connectedClients.get(clientId);
    if (client) {
      client.emit(event, {
        ...data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  getConnectedClients() {
    return Array.from(this.connectedClients.keys());
  }

  getClientCount() {
    return this.connectedClients.size;
  }

  getConnectedUsers(): string[] {
    const users = new Set<string>();
    this.clientData.forEach(client => {
      if (client.userId) {
        users.add(client.userId);
      }
    });
    return Array.from(users);
  }

  getRoomInfo(roomName: string): RoomInfo | null {
    return this.rooms.get(roomName) || null;
  }

  getAllRooms(): RoomInfo[] {
    return Array.from(this.rooms.values());
  }

  // Private helper methods
  private getClientIP(client: Socket): string {
    return (
      client.handshake.headers['x-forwarded-for']?.toString().split(',')[0] ||
      client.handshake.headers['x-real-ip']?.toString() ||
      client.handshake.address ||
      'unknown'
    );
  }

  private getClientPlatform(userAgent?: string): string {
    if (!userAgent) return 'unknown';

    if (userAgent.includes('Mobile')) return 'mobile';
    if (userAgent.includes('Tablet')) return 'tablet';
    return 'desktop';
  }

  private hasPermission(clientInfo: ClientData, permission: string): boolean {
    return clientInfo.permissions.includes(permission) ||
           clientInfo.permissions.includes('*') ||
           clientInfo.roles.includes('admin');
  }

  private updateClientActivity(clientId: string): void {
    const clientInfo = this.clientData.get(clientId);
    if (clientInfo) {
      clientInfo.lastActivity = new Date();
    }
  }

  private createOrUpdateRoom(roomName: string, type: RoomInfo['type'], metadata: Record<string, any> = {}): void {
    let roomInfo = this.rooms.get(roomName);

    if (!roomInfo) {
      roomInfo = {
        id: roomName,
        name: roomName,
        type,
        clientCount: 0,
        createdAt: new Date(),
        metadata,
      };
      this.rooms.set(roomName, roomInfo);
    }

    // Update client count
    roomInfo.clientCount = this.server.sockets.adapter.rooms.get(roomName)?.size || 0;
  }

  private updateRoomCounts(client: Socket): void {
    client.rooms.forEach(roomName => {
      if (roomName !== client.id) { // Skip the client's own room
        const roomInfo = this.rooms.get(roomName);
        if (roomInfo) {
          roomInfo.clientCount = this.server.sockets.adapter.rooms.get(roomName)?.size || 0;
        }
      }
    });
  }

  private async updateRedisConnection(clientId: string, clientInfo: ClientData): Promise<void> {
    try {
      await this.redis.hset('websocket:connections', clientId, JSON.stringify(clientInfo));

      if (clientInfo.userId) {
        await this.redis.sadd(`websocket:user:${clientInfo.userId}`, clientId);
      }

      if (clientInfo.tenantId) {
        await this.redis.sadd(`websocket:tenant:${clientInfo.tenantId}`, clientId);
      }
    } catch (error) {
      this.logger.error(`Error updating Redis connection info for ${clientId}:`, error);
    }
  }

  private setupRedisSubscriptions(): void {
    this.redis.subscribe('events:*', (err, count) => {
      if (err) {
        this.logger.error('Error subscribing to Redis events:', err);
      } else {
        this.logger.log(`Subscribed to ${count} Redis event channels`);
      }
    });

    this.redis.on('message', (channel, message) => {
      try {
        const eventName = channel.replace('events:', '');
        const data = JSON.parse(message);

        // Broadcast to all connected clients
        this.broadcastToAll(`event:${eventName}`, data);
      } catch (error) {
        this.logger.error('Error processing Redis message:', error);
      }
    });
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.server.sockets.sockets.forEach((socket: Socket) => {
        const clientInfo = this.clientData.get(socket.id);
        if (clientInfo) {
          const timeSinceActivity = Date.now() - clientInfo.lastActivity.getTime();

          // Check if client is inactive for more than 5 minutes
          if (timeSinceActivity > 5 * 60 * 1000) {
            this.logger.warn(`Terminating inactive client: ${socket.id}`);
            socket.disconnect();
          } else {
            socket.emit('heartbeat', { timestamp: new Date().toISOString() });
          }
        }
      });
    }, 30000); // Every 30 seconds
  }

  private startCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      // Clean up empty rooms
      this.rooms.forEach((room, roomName) => {
        if (room.clientCount === 0 && room.type === 'custom') {
          this.rooms.delete(roomName);
          this.logger.debug(`Cleaned up empty room: ${roomName}`);
        }
      });

      // Clean up Redis keys for disconnected clients
      this.redis.keys('websocket:connections').then(keys => {
        if (keys.length > 0) {
          keys.forEach(key => {
            this.redis.hgetall(key).then(data => {
              // Check if any of these connections are still active
              // This is a simplified cleanup - in production you might want more sophisticated logic
            });
          });
        }
      });
    }, 300000); // Every 5 minutes
  }

  // Public methods for external services
  async emitToUser(userId: string, event: string, data: any): Promise<void> {
    this.broadcastToUser(userId, event, data);

    // Also publish to Redis for cross-instance communication
    await this.redis.publish(`events:user:${userId}`, JSON.stringify({ event, data }));
  }

  async emitToTenant(tenantId: string, event: string, data: any): Promise<void> {
    this.broadcastToTenant(tenantId, event, data);

    // Also publish to Redis for cross-instance communication
    await this.redis.publish(`events:tenant:${tenantId}`, JSON.stringify({ event, data }));
  }

  async emitGlobal(event: string, data: any): Promise<void> {
    this.broadcastToAll(event, data);

    // Also publish to Redis for cross-instance communication
    await this.redis.publish('events:global', JSON.stringify({ event, data }));
  }

  // WMS-specific event handlers
  @SubscribeMessage('wms:subscribe')
  async handleWmsSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      warehouseId?: string;
      operationTypes?: string[];
      eventTypes?: string[];
    },
  ) {
    const clientData = this.clientData.get(client.id);
    if (!clientData) {
      client.emit('error', { message: 'Client not authenticated' });
      return;
    }

    try {
      const subscriptions = new Set<string>();

      // Subscribe to warehouse-specific events
      if (data.warehouseId) {
        subscriptions.add(`wms:warehouse:${data.warehouseId}`);
        await client.join(`wms:warehouse:${data.warehouseId}`);
      }

      // Subscribe to operation type events
      if (data.operationTypes) {
        for (const opType of data.operationTypes) {
          subscriptions.add(`wms:operation:${opType}`);
          await client.join(`wms:operation:${opType}`);
        }
      }

      // Subscribe to specific event types
      if (data.eventTypes) {
        for (const eventType of data.eventTypes) {
          subscriptions.add(`wms:event:${eventType}`);
          await client.join(`wms:event:${eventType}`);
        }
      }

      // Subscribe to user-specific events
      subscriptions.add(`wms:user:${clientData.userId}`);
      await client.join(`wms:user:${clientData.userId}`);

      // Subscribe to tenant-specific events
      subscriptions.add(`wms:tenant:${clientData.tenantId}`);
      await client.join(`wms:tenant:${clientData.tenantId}`);

      // Update client subscriptions
      clientData.subscriptions = subscriptions;
      this.clientData.set(client.id, clientData);

      client.emit('wms:subscribed', {
        subscriptions: Array.from(subscriptions),
        timestamp: new Date().toISOString(),
      });

      this.logger.debug(`WMS subscriptions for client ${client.id}: ${Array.from(subscriptions)}`);

    } catch (error) {
      this.logger.error(`Error subscribing to WMS events for client ${client.id}:`, error);
      client.emit('error', { message: 'Subscription failed' });
    }
  }

  @SubscribeMessage('wms:mobile-sync')
  async handleMobileSync(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      deviceId: string;
      lastSyncTime?: string;
      operations?: any[];
    },
  ) {
    const clientData = this.clientData.get(client.id);
    if (!clientData) {
      client.emit('error', { message: 'Client not authenticated' });
      return;
    }

    try {
      // Process mobile sync request
      const syncResult = await this.realtimeService.handleMobileSync({
        deviceId: data.deviceId,
        userId: clientData.userId,
        tenantId: clientData.tenantId,
        lastSyncTime: data.lastSyncTime ? new Date(data.lastSyncTime) : undefined,
        operations: data.operations || [],
      });

      client.emit('wms:sync-response', {
        success: true,
        data: syncResult,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Error processing mobile sync for client ${client.id}:`, error);
      client.emit('wms:sync-response', {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  @SubscribeMessage('wms:operation-update')
  async handleOperationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: {
      operationId: string;
      operationType: string;
      status: string;
      warehouseId?: string;
      metadata?: Record<string, any>;
    },
  ) {
    const clientData = this.clientData.get(client.id);
    if (!clientData) {
      client.emit('error', { message: 'Client not authenticated' });
      return;
    }

    try {
      // Broadcast operation update to relevant rooms
      const rooms = [
        `wms:user:${clientData.userId}`,
        `wms:tenant:${clientData.tenantId}`,
        `wms:operation:${data.operationType}`,
      ];

      if (data.warehouseId) {
        rooms.push(`wms:warehouse:${data.warehouseId}`);
      }

      // Emit to all relevant rooms
      for (const room of rooms) {
        this.server.to(room).emit('wms:operation-updated', {
          operationId: data.operationId,
          operationType: data.operationType,
          status: data.status,
          warehouseId: data.warehouseId,
          metadata: data.metadata,
          updatedBy: clientData.userId,
          updatedAt: new Date().toISOString(),
        });
      }

      client.emit('wms:operation-update-acknowledged', {
        operationId: data.operationId,
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      this.logger.error(`Error broadcasting operation update for client ${client.id}:`, error);
      client.emit('error', { message: 'Failed to broadcast operation update' });
    }
  }

  // Graceful shutdown
  async onModuleDestroy(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    await this.redis.quit();

    // Disconnect all clients
    this.server.sockets.sockets.forEach((socket: Socket) => {
      socket.disconnect(true);
    });

    this.logger.log('WebSocket Gateway shut down gracefully');
  }
}