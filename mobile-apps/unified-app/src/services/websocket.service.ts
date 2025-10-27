import { io, Socket } from 'socket.io-client';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: Date;
  id: string;
}

export interface WebSocketConfig {
  url: string;
  options?: {
    autoConnect?: boolean;
    reconnection?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    timeout?: number;
  };
}

class WebSocketService {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private listeners: Map<string, Array<(data: any) => void>> = new Map();
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;

  constructor() {
    this.config = {
      url: __DEV__ 
        ? 'http://localhost:3000' 
        : 'https://api.ayazlogistics.com',
      options: {
        autoConnect: false,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 20000,
      },
    };
  }

  async connect(): Promise<void> {
    if (this.socket?.connected) {
      return;
    }

    try {
      const token = await AsyncStorage.getItem('token');
      if (!token) {
        throw new Error('No authentication token');
      }

      this.socket = io(this.config.url, {
        ...this.config.options,
        auth: {
          token,
        },
        transports: ['websocket', 'polling'],
      });

      this.setupEventListeners();
      
      return new Promise((resolve, reject) => {
        if (!this.socket) {
          reject(new Error('Socket not initialized'));
          return;
        }

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          reject(error);
        });

        this.socket.on('disconnect', (reason) => {
          console.log('WebSocket disconnected:', reason);
          this.isConnected = false;
        });
      });
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      throw error;
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  private setupEventListeners(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('WebSocket reconnection attempt:', attemptNumber);
      this.reconnectAttempts = attemptNumber;
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
    });

    this.socket.on('reconnect_failed', () => {
      console.error('WebSocket reconnection failed');
      this.isConnected = false;
      Alert.alert(
        'Bağlantı Hatası',
        'Sunucuya bağlanılamıyor. Lütfen internet bağlantınızı kontrol edin.',
        [{ text: 'Tamam' }]
      );
    });

    // Authentication events
    this.socket.on('auth_error', (error) => {
      console.error('Authentication error:', error);
      this.handleAuthError();
    });

    this.socket.on('auth_success', () => {
      console.log('Authentication successful');
    });

    // Business logic events
    this.socket.on('task_update', (data) => {
      this.emit('task_update', data);
    });

    this.socket.on('inventory_update', (data) => {
      this.emit('inventory_update', data);
    });

    this.socket.on('order_update', (data) => {
      this.emit('order_update', data);
    });

    this.socket.on('notification', (data) => {
      this.emit('notification', data);
    });

    this.socket.on('location_update', (data) => {
      this.emit('location_update', data);
    });

    this.socket.on('system_alert', (data) => {
      this.emit('system_alert', data);
    });

    // Generic message handler
    this.socket.on('message', (message: WebSocketMessage) => {
      this.emit(message.type, message.data);
    });
  }

  private async handleAuthError(): Promise<void> {
    try {
      await AsyncStorage.removeItem('token');
      await AsyncStorage.removeItem('refreshToken');
      this.disconnect();
    } catch (error) {
      console.error('Error handling auth error:', error);
    }
  }

  // Event subscription methods
  on(event: string, callback: (data: any) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  off(event: string, callback?: (data: any) => void): void {
    if (!this.listeners.has(event)) return;

    if (callback) {
      const callbacks = this.listeners.get(event)!;
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    } else {
      this.listeners.delete(event);
    }
  }

  private emit(event: string, data: any): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in event callback:', error);
        }
      });
    }
  }

  // Message sending methods
  send(event: string, data: any): void {
    if (!this.socket || !this.isConnected) {
      console.warn('WebSocket not connected, cannot send message');
      return;
    }

    this.socket.emit(event, data);
  }

  sendMessage(type: string, data: any): void {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date(),
      id: Math.random().toString(36).substr(2, 9),
    };

    this.send('message', message);
  }

  // Business logic methods
  joinRoom(room: string): void {
    this.send('join_room', { room });
  }

  leaveRoom(room: string): void {
    this.send('leave_room', { room });
  }

  subscribeToTaskUpdates(taskId: string): void {
    this.joinRoom(`task_${taskId}`);
  }

  subscribeToInventoryUpdates(): void {
    this.joinRoom('inventory');
  }

  subscribeToOrderUpdates(orderId: string): void {
    this.joinRoom(`order_${orderId}`);
  }

  subscribeToLocationUpdates(): void {
    this.joinRoom('location');
  }

  subscribeToNotifications(): void {
    this.joinRoom('notifications');
  }

  // Real-time data methods
  requestTaskUpdate(taskId: string): void {
    this.send('request_task_update', { taskId });
  }

  requestInventoryUpdate(): void {
    this.send('request_inventory_update', {});
  }

  requestOrderUpdate(orderId: string): void {
    this.send('request_order_update', { orderId });
  }

  sendLocationUpdate(latitude: number, longitude: number, accuracy?: number): void {
    this.send('location_update', {
      latitude,
      longitude,
      accuracy,
      timestamp: new Date(),
    });
  }

  sendTaskStatusUpdate(taskId: string, status: string, data?: any): void {
    this.send('task_status_update', {
      taskId,
      status,
      data,
      timestamp: new Date(),
    });
  }

  sendInventoryUpdate(itemId: string, quantity: number, location?: string): void {
    this.send('inventory_update', {
      itemId,
      quantity,
      location,
      timestamp: new Date(),
    });
  }

  sendOrderUpdate(orderId: string, status: string, data?: any): void {
    this.send('order_update', {
      orderId,
      status,
      data,
      timestamp: new Date(),
    });
  }

  // Utility methods
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    return this.socket.connected ? 'connected' : 'disconnected';
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  // Cleanup
  destroy(): void {
    this.disconnect();
    this.listeners.clear();
  }
}

export const webSocketService = new WebSocketService();
export default webSocketService;
