import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import Redis from 'ioredis';
import { WebSocketGateway } from '../../realtime/gateways/websocket.gateway';
// import { RealTimeStreamProcessingService } from '../ai/real-time-stream-processing.service';
// import { AdvancedFilteringService } from '../ai/advanced-filtering.service';

export interface RealTimeSubscription {
  id: string;
  clientId: string;
  userId: string;
  tenantId: string;
  type: 'data' | 'analytics' | 'ai' | 'alerts' | 'system';
  filters: any;
  channels: string[];
  active: boolean;
  createdAt: Date;
  lastActivity: Date;
}

export interface DataStreamEvent {
  id: string;
  type: 'data_point' | 'anomaly' | 'insight' | 'alert' | 'system';
  source: string;
  data: any;
  timestamp: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  metadata: Record<string, any>;
}

export interface RealTimeMetrics {
  totalConnections: number;
  activeSubscriptions: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorRate: number;
  dataStreams: string[];
  topChannels: Array<{ channel: string; subscribers: number; messages: number }>;
}

@Injectable()
export class WebSocketEnhancedService {
  private readonly logger = new Logger(WebSocketEnhancedService.name);
  private subscriptions: Map<string, RealTimeSubscription> = new Map();
  private eventHistory: DataStreamEvent[] = new Map();
  private metrics: RealTimeMetrics;
  private redis: Redis;

  constructor(
    private readonly eventEmitter: EventEmitter2,
    private readonly wsGateway: WebSocketGateway,
    // Temporarily disabled AI services
    // private readonly streamProcessing: RealTimeStreamProcessingService,
    // private readonly advancedFiltering: AdvancedFilteringService,
  ) {
    this.redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD,
    });

    this.metrics = {
      totalConnections: 0,
      activeSubscriptions: 0,
      messagesPerSecond: 0,
      averageLatency: 0,
      errorRate: 0,
      dataStreams: [],
      topChannels: [],
    };

    this.initializeEnhancedWebSocket();
    this.startMetricsCollection();
  }

  private async initializeEnhancedWebSocket(): Promise<void> {
    this.logger.log('Initializing enhanced WebSocket service...');

    // Subscribe to Redis channels for real-time data
    await this.subscribeToRedisChannels();

    // Set up event listeners
    this.setupEventListeners();

    // Start background services
    this.startBackgroundServices();

    this.logger.log('Enhanced WebSocket service initialized');
  }

  private async subscribeToRedisChannels(): Promise<void> {
    const channels = [
      'stream:*',
      'analytics:*',
      'ai:*',
      'alerts:*',
      'system:*',
      'websocket:*',
    ];

    for (const pattern of channels) {
      await this.redis.psubscribe(pattern, (err, count) => {
        if (err) {
          this.logger.error(`Failed to subscribe to ${pattern}:`, err);
        } else {
          this.logger.log(`Subscribed to ${count} channels matching ${pattern}`);
        }
      });
    }

    // Handle incoming Redis messages
    this.redis.on('pmessage', async (pattern, channel, message) => {
      try {
        const event = JSON.parse(message);
        await this.processIncomingEvent(channel, event);
      } catch (error) {
        this.logger.error(`Error processing Redis message from ${channel}:`, error);
      }
    });
  }

  private setupEventListeners(): void {
    // Listen to AI events
    this.eventEmitter.on('ai.prediction.completed', async (data) => {
      await this.broadcastAIEvent('prediction.completed', data);
    });

    this.eventEmitter.on('ai.model.trained', async (data) => {
      await this.broadcastAIEvent('model.trained', data);
    });

    this.eventEmitter.on('ai.anomaly.detected', async (data) => {
      await this.broadcastAIEvent('anomaly.detected', data);
    });

    // Listen to stream processing events
    this.eventEmitter.on('stream.data.processed', async (data) => {
      await this.broadcastStreamEvent('data.processed', data);
    });

    this.eventEmitter.on('stream.anomaly.detected', async (data) => {
      await this.broadcastStreamEvent('anomaly.detected', data);
    });

    // Listen to analytics events
    this.eventEmitter.on('analytics.insight.generated', async (data) => {
      await this.broadcastAnalyticsEvent('insight.generated', data);
    });

    // Listen to system events
    this.eventEmitter.on('system.alert', async (data) => {
      await this.broadcastSystemEvent('alert', data);
    });
  }

  private startBackgroundServices(): void {
    // Clean up inactive subscriptions every 5 minutes
    setInterval(() => {
      this.cleanupInactiveSubscriptions();
    }, 5 * 60 * 1000);

    // Update metrics every 30 seconds
    setInterval(() => {
      this.updateMetrics();
    }, 30 * 1000);

    // Process event history cleanup every hour
    setInterval(() => {
      this.cleanupEventHistory();
    }, 60 * 60 * 1000);
  }

  private async processIncomingEvent(channel: string, event: any): Promise<void> {
    const streamEvent: DataStreamEvent = {
      id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: this.classifyEventType(channel),
      source: channel,
      data: event,
      timestamp: new Date(),
      priority: this.calculateEventPriority(event),
      metadata: {
        channel,
        processed: true,
        filtered: false,
      },
    };

    // Store event in history
    this.eventHistory.push(streamEvent);

    // Apply filters if needed
    const filtered = await this.applyEventFilters(streamEvent);

    if (filtered) {
      // Broadcast to relevant subscribers
      await this.broadcastToRelevantSubscribers(streamEvent);
    }

    // Update metrics
    this.metrics.messagesPerSecond++;
  }

  private classifyEventType(channel: string): DataStreamEvent['type'] {
    if (channel.includes('stream:')) return 'data_point';
    if (channel.includes('analytics:')) return 'insight';
    if (channel.includes('ai:')) return 'analytics';
    if (channel.includes('alerts:')) return 'alert';
    if (channel.includes('system:')) return 'system';
    return 'data_point';
  }

  private calculateEventPriority(event: any): 'low' | 'medium' | 'high' | 'critical' {
    if (event.priority === 'critical' || event.severity === 'critical') return 'critical';
    if (event.priority === 'high' || event.severity === 'high') return 'high';
    if (event.priority === 'medium' || event.severity === 'medium') return 'medium';
    return 'low';
  }

  private async applyEventFilters(event: DataStreamEvent): Promise<boolean> {
    // Check if event matches any active subscription filters
    for (const subscription of this.subscriptions.values()) {
      if (!subscription.active) continue;

      const matches = this.checkEventMatchesSubscription(event, subscription);
      if (matches) {
        return true;
      }
    }

    return false;
  }

  private checkEventMatchesSubscription(event: DataStreamEvent, subscription: RealTimeSubscription): boolean {
    // Check if event type matches subscription type
    if (subscription.type !== 'data' && subscription.type !== event.type) {
      return false;
    }

    // Check channel filters
    if (subscription.channels.length > 0 && !subscription.channels.some(ch => event.source.includes(ch))) {
      return false;
    }

    // Check custom filters
    if (subscription.filters) {
      return this.checkCustomFilters(event, subscription.filters);
    }

    return true;
  }

  private checkCustomFilters(event: DataStreamEvent, filters: any): boolean {
    // Implement custom filter logic
    // This could include field-based filtering, value ranges, etc.

    for (const [field, filter] of Object.entries(filters)) {
      const eventValue = this.getNestedValue(event.data, field);
      const filterValue = filter.value;
      const operator = filter.operator;

      if (!this.applyFilterCondition(eventValue, filterValue, operator)) {
        return false;
      }
    }

    return true;
  }

  private applyFilterCondition(eventValue: any, filterValue: any, operator: string): boolean {
    switch (operator) {
      case 'eq':
        return eventValue === filterValue;
      case 'ne':
        return eventValue !== filterValue;
      case 'gt':
        return eventValue > filterValue;
      case 'lt':
        return eventValue < filterValue;
      case 'gte':
        return eventValue >= filterValue;
      case 'lte':
        return eventValue <= filterValue;
      case 'contains':
        return String(eventValue).includes(String(filterValue));
      case 'in':
        return Array.isArray(filterValue) && filterValue.includes(eventValue);
      default:
        return true;
    }
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private async broadcastToRelevantSubscribers(event: DataStreamEvent): Promise<void> {
    const relevantSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.active && this.checkEventMatchesSubscription(event, sub));

    for (const subscription of relevantSubscriptions) {
      try {
        await this.wsGateway.emitToUser(subscription.userId, `realtime:${event.type}`, {
          event,
          subscriptionId: subscription.id,
        });

        // Update subscription activity
        subscription.lastActivity = new Date();
        this.subscriptions.set(subscription.id, subscription);

      } catch (error) {
        this.logger.error(`Failed to broadcast to subscription ${subscription.id}:`, error);
      }
    }
  }

  // Public API methods
  async createSubscription(subscription: Omit<RealTimeSubscription, 'id' | 'createdAt' | 'lastActivity'>): Promise<string> {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const newSubscription: RealTimeSubscription = {
      id,
      ...subscription,
      createdAt: new Date(),
      lastActivity: new Date(),
    };

    this.subscriptions.set(id, newSubscription);
    this.metrics.activeSubscriptions = this.subscriptions.size;

    // Subscribe to relevant Redis channels
    await this.subscribeToChannels(newSubscription.channels);

    // Set up advanced filtering if needed
    if (newSubscription.filters) {
      await this.setupAdvancedFilters(id, newSubscription.filters);
    }

    this.logger.log(`Real-time subscription created: ${id} for user ${subscription.userId}`);
    return id;
  }

  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    // Unsubscribe from channels
    await this.unsubscribeFromChannels(subscription.channels);

    // Clean up advanced filters
    if (subscription.filters) {
      await this.cleanupAdvancedFilters(subscriptionId);
    }

    this.subscriptions.delete(subscriptionId);
    this.metrics.activeSubscriptions = this.subscriptions.size;

    this.logger.log(`Real-time subscription cancelled: ${subscriptionId}`);
    return true;
  }

  async updateSubscription(subscriptionId: string, updates: Partial<RealTimeSubscription>): Promise<boolean> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return false;

    // Handle channel changes
    if (updates.channels) {
      const oldChannels = subscription.channels;
      const newChannels = updates.channels;

      const removedChannels = oldChannels.filter(ch => !newChannels.includes(ch));
      const addedChannels = newChannels.filter(ch => !oldChannels.includes(ch));

      if (removedChannels.length > 0) {
        await this.unsubscribeFromChannels(removedChannels);
      }

      if (addedChannels.length > 0) {
        await this.subscribeToChannels(addedChannels);
      }
    }

    // Update subscription
    Object.assign(subscription, updates);
    subscription.lastActivity = new Date();
    this.subscriptions.set(subscriptionId, subscription);

    this.logger.log(`Real-time subscription updated: ${subscriptionId}`);
    return true;
  }

  private async subscribeToChannels(channels: string[]): Promise<void> {
    for (const channel of channels) {
      try {
        await this.redis.subscribe(channel);
        this.logger.debug(`Subscribed to channel: ${channel}`);
      } catch (error) {
        this.logger.error(`Failed to subscribe to channel ${channel}:`, error);
      }
    }
  }

  private async unsubscribeFromChannels(channels: string[]): Promise<void> {
    for (const channel of channels) {
      try {
        await this.redis.unsubscribe(channel);
        this.logger.debug(`Unsubscribed from channel: ${channel}`);
      } catch (error) {
        this.logger.error(`Failed to unsubscribe from channel ${channel}:`, error);
      }
    }
  }

  private async setupAdvancedFilters(subscriptionId: string, filters: any): Promise<void> {
    // Set up advanced filtering rules
    // This could involve creating database queries or ML models for filtering

    this.logger.debug(`Advanced filters set up for subscription: ${subscriptionId}`);
  }

  private async cleanupAdvancedFilters(subscriptionId: string): Promise<void> {
    // Clean up advanced filtering rules

    this.logger.debug(`Advanced filters cleaned up for subscription: ${subscriptionId}`);
  }

  private cleanupInactiveSubscriptions(): void {
    const now = Date.now();
    const inactiveThreshold = 30 * 60 * 1000; // 30 minutes

    for (const [id, subscription] of this.subscriptions.entries()) {
      if (now - subscription.lastActivity.getTime() > inactiveThreshold) {
        this.logger.warn(`Cleaning up inactive subscription: ${id}`);
        this.cancelSubscription(id);
      }
    }
  }

  private cleanupEventHistory(): void {
    const now = Date.now();
    const historyThreshold = 24 * 60 * 60 * 1000; // 24 hours

    this.eventHistory = this.eventHistory.filter(event =>
      now - event.timestamp.getTime() < historyThreshold
    );

    this.logger.debug(`Event history cleaned up. Remaining events: ${this.eventHistory.length}`);
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.updateMetrics();
    }, 10000); // Every 10 seconds
  }

  private updateMetrics(): void {
    this.metrics.totalConnections = this.wsGateway.getClientCount();
    this.metrics.activeSubscriptions = this.subscriptions.size;
    this.metrics.dataStreams = Array.from(new Set(
      Array.from(this.subscriptions.values()).flatMap(sub => sub.channels)
    ));

    // Calculate top channels
    const channelStats = new Map<string, { subscribers: number; messages: number }>();

    for (const subscription of this.subscriptions.values()) {
      for (const channel of subscription.channels) {
        if (!channelStats.has(channel)) {
          channelStats.set(channel, { subscribers: 0, messages: 0 });
        }
        channelStats.get(channel)!.subscribers++;
      }
    }

    this.metrics.topChannels = Array.from(channelStats.entries())
      .map(([channel, stats]) => ({ channel, ...stats }))
      .sort((a, b) => b.subscribers - a.subscribers)
      .slice(0, 10);

    // Reset message counter
    this.metrics.messagesPerSecond = 0;
  }

  // Event broadcasting methods
  private async broadcastAIEvent(type: string, data: any): Promise<void> {
    const event: DataStreamEvent = {
      id: `ai_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'ai',
      source: 'ai-service',
      data,
      timestamp: new Date(),
      priority: this.calculateEventPriority(data),
      metadata: { type, service: 'ai' },
    };

    await this.redis.publish('ai:events', JSON.stringify(event));
  }

  private async broadcastStreamEvent(type: string, data: any): Promise<void> {
    const event: DataStreamEvent = {
      id: `stream_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'data_point',
      source: 'stream-processing',
      data,
      timestamp: new Date(),
      priority: this.calculateEventPriority(data),
      metadata: { type, service: 'stream' },
    };

    await this.redis.publish('stream:events', JSON.stringify(event));
  }

  private async broadcastAnalyticsEvent(type: string, data: any): Promise<void> {
    const event: DataStreamEvent = {
      id: `analytics_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'insight',
      source: 'analytics-service',
      data,
      timestamp: new Date(),
      priority: this.calculateEventPriority(data),
      metadata: { type, service: 'analytics' },
    };

    await this.redis.publish('analytics:events', JSON.stringify(event));
  }

  private async broadcastSystemEvent(type: string, data: any): Promise<void> {
    const event: DataStreamEvent = {
      id: `system_event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'system',
      source: 'system-service',
      data,
      timestamp: new Date(),
      priority: this.calculateEventPriority(data),
      metadata: { type, service: 'system' },
    };

    await this.redis.publish('system:events', JSON.stringify(event));
  }

  // Public API methods
  async getMetrics(): Promise<RealTimeMetrics> {
    return { ...this.metrics };
  }

  async getSubscription(subscriptionId: string): Promise<RealTimeSubscription | null> {
    return this.subscriptions.get(subscriptionId) || null;
  }

  async getUserSubscriptions(userId: string): Promise<RealTimeSubscription[]> {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.userId === userId && sub.active);
  }

  async getEventHistory(
    type?: DataStreamEvent['type'],
    limit: number = 100,
    startDate?: Date,
    endDate?: Date,
  ): Promise<DataStreamEvent[]> {
    let filtered = this.eventHistory;

    if (type) {
      filtered = filtered.filter(event => event.type === type);
    }

    if (startDate) {
      filtered = filtered.filter(event => event.timestamp >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter(event => event.timestamp <= endDate);
    }

    return filtered
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  async broadcastToChannel(channel: string, event: Partial<DataStreamEvent>): Promise<void> {
    const fullEvent: DataStreamEvent = {
      id: event.id || `broadcast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: event.type || 'data_point',
      source: event.source || channel,
      data: event.data || {},
      timestamp: event.timestamp || new Date(),
      priority: event.priority || 'medium',
      metadata: event.metadata || {},
    };

    await this.redis.publish(channel, JSON.stringify(fullEvent));
    this.logger.debug(`Event broadcasted to channel ${channel}`);
  }

  async broadcastToUser(userId: string, event: Partial<DataStreamEvent>): Promise<void> {
    await this.wsGateway.emitToUser(userId, 'realtime:broadcast', event);
  }

  async broadcastToTenant(tenantId: string, event: Partial<DataStreamEvent>): Promise<void> {
    await this.wsGateway.emitToTenant(tenantId, 'realtime:broadcast', event);
  }

  async broadcastGlobal(event: Partial<DataStreamEvent>): Promise<void> {
    await this.wsGateway.broadcastToAll('realtime:broadcast', event);
  }

  // Real-time data integration methods
  async startDataStreamIntegration(streamId: string, subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    try {
      // Mock implementation - AI service disabled
      this.logger.log(`Mock data stream integration started: ${streamId} for subscription ${subscriptionId}`);

      // Update subscription
      subscription.channels.push(`stream:${streamId}`);
      subscription.lastActivity = new Date();
      this.subscriptions.set(subscriptionId, subscription);

      // Subscribe to stream events
      await this.redis.subscribe(`stream:${streamId}`);
    }
  }

  async stopDataStreamIntegration(streamId: string, subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    try {
      // Remove from subscription channels
      subscription.channels = subscription.channels.filter(ch => ch !== `stream:${streamId}`);
      subscription.lastActivity = new Date();
      this.subscriptions.set(subscriptionId, subscription);

      // Unsubscribe from Redis channel
      await this.redis.unsubscribe(`stream:${streamId}`);

      // Check if stream is still needed by other subscriptions
      const stillNeeded = Array.from(this.subscriptions.values())
        .some(sub => sub.channels.includes(`stream:${streamId}`));

      // Mock implementation - AI service disabled
      if (!stillNeeded) {
        this.logger.log(`Mock stream stopped: ${streamId}`);
      }

      this.logger.log(`Data stream integration stopped: ${streamId} for subscription ${subscriptionId}`);
    } catch (error) {
      this.logger.error(`Failed to stop data stream integration:`, error);
    }
  }

  // Analytics integration methods
  async enableAnalyticsForSubscription(subscriptionId: string, analyticsConfig: any): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      throw new Error(`Subscription not found: ${subscriptionId}`);
    }

    // Mock implementation - AI service disabled
    const query = { mock: true, result: 'Analytics disabled' };

    // Subscribe to analytics events
    subscription.channels.push('analytics:insights');
    subscription.filters = { ...subscription.filters, ...analyticsConfig.filters };
    subscription.lastActivity = new Date();
    this.subscriptions.set(subscriptionId, subscription);

    // Subscribe to Redis channel
    await this.redis.subscribe('analytics:insights');

    this.logger.log(`Analytics enabled for subscription: ${subscriptionId}`);
  }

  async disableAnalyticsForSubscription(subscriptionId: string): Promise<void> {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) return;

    // Remove analytics channels and filters
    subscription.channels = subscription.channels.filter(ch => !ch.includes('analytics:'));
    subscription.filters = this.removeAnalyticsFilters(subscription.filters);
    subscription.lastActivity = new Date();
    this.subscriptions.set(subscriptionId, subscription);

    // Unsubscribe from Redis channels
    await this.redis.unsubscribe('analytics:insights');

    this.logger.log(`Analytics disabled for subscription: ${subscriptionId}`);
  }

  private removeAnalyticsFilters(filters: any): any {
    // Remove analytics-specific filters
    const cleaned = { ...filters };

    for (const [key, filter] of Object.entries(cleaned)) {
      if (key.startsWith('analytics_') || key.includes('insight')) {
        delete cleaned[key];
      }
    }

    return cleaned;
  }
}
