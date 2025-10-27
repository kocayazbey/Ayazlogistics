import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface AnalyticsEvent {
  id: string;
  name: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
  platform: string;
  version: string;
}

export interface UserBehavior {
  screenViews: number;
  timeSpent: number;
  actions: string[];
  lastActive: number;
}

export class AnalyticsService {
  private static instance: AnalyticsService;
  private sessionId: string;
  private userId?: string;
  private isOnline: boolean = true;
  private eventQueue: AnalyticsEvent[] = [];
  private maxQueueSize: number = 100;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.initializeNetworkListener();
  }

  static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  private initializeNetworkListener(): void {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      if (this.isOnline) {
        this.flushEventQueue();
      }
    });
  }

  async trackEvent(name: string, properties: Record<string, any> = {}): Promise<void> {
    const event: AnalyticsEvent = {
      id: this.generateEventId(),
      name,
      properties: {
        ...properties,
        platform: Platform.OS,
        version: await this.getAppVersion(),
        timestamp: Date.now()
      },
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId,
      platform: Platform.OS,
      version: await this.getAppVersion()
    };

    if (this.isOnline) {
      await this.sendEventToServer(event);
    } else {
      await this.queueEvent(event);
    }
  }

  async trackScreenView(screenName: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('screen_view', {
      screen_name: screenName,
      ...properties
    });
  }

  async trackUserAction(action: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('user_action', {
      action,
      ...properties
    });
  }

  async trackBusinessEvent(eventType: string, properties: Record<string, any> = {}): Promise<void> {
    await this.trackEvent('business_event', {
      event_type: eventType,
      ...properties
    });
  }

  async setUserId(userId: string): Promise<void> {
    this.userId = userId;
    await AsyncStorage.setItem('analytics_user_id', userId);
  }

  async getUserBehavior(): Promise<UserBehavior> {
    const behavior = await AsyncStorage.getItem('user_behavior');
    return behavior ? JSON.parse(behavior) : {
      screenViews: 0,
      timeSpent: 0,
      actions: [],
      lastActive: Date.now()
    };
  }

  async updateUserBehavior(updates: Partial<UserBehavior>): Promise<void> {
    const current = await this.getUserBehavior();
    const updated = { ...current, ...updates };
    await AsyncStorage.setItem('user_behavior', JSON.stringify(updated));
  }

  private async sendEventToServer(event: AnalyticsEvent): Promise<void> {
    try {
      const response = await fetch('/api/analytics/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await this.getAuthToken()}`
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`Analytics send failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to send analytics event:', error);
      await this.queueEvent(event);
    }
  }

  private async queueEvent(event: AnalyticsEvent): Promise<void> {
    this.eventQueue.push(event);
    
    if (this.eventQueue.length > this.maxQueueSize) {
      this.eventQueue = this.eventQueue.slice(-this.maxQueueSize);
    }

    await AsyncStorage.setItem('analytics_queue', JSON.stringify(this.eventQueue));
  }

  private async flushEventQueue(): Promise<void> {
    const queuedEvents = await AsyncStorage.getItem('analytics_queue');
    if (queuedEvents) {
      this.eventQueue = JSON.parse(queuedEvents);
    }

    for (const event of this.eventQueue) {
      try {
        await this.sendEventToServer(event);
      } catch (error) {
        console.error('Failed to flush event:', error);
        break;
      }
    }

    this.eventQueue = [];
    await AsyncStorage.removeItem('analytics_queue');
  }

  private async getAuthToken(): Promise<string> {
    return await AsyncStorage.getItem('auth_token') || '';
  }

  private async getAppVersion(): Promise<string> {
    return await AsyncStorage.getItem('app_version') || '1.0.0';
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
