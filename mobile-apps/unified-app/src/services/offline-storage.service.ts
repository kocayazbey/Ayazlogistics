import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

export interface OfflineData {
  id: string;
  type: string;
  data: any;
  timestamp: number;
  synced: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export class OfflineStorageService {
  private static instance: OfflineStorageService;
  private isOnline: boolean = true;
  private syncQueue: OfflineData[] = [];
  private maxRetries: number = 3;

  private constructor() {
    this.initializeNetworkListener();
  }

  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  private initializeNetworkListener(): void {
    NetInfo.addEventListener(state => {
      this.isOnline = state.isConnected ?? false;
      if (this.isOnline) {
        this.processSyncQueue();
      }
    });
  }

  async storeOfflineData(data: Omit<OfflineData, 'id' | 'timestamp' | 'synced'>): Promise<string> {
    const offlineData: OfflineData = {
      id: this.generateId(),
      ...data,
      timestamp: Date.now(),
      synced: false
    };

    await AsyncStorage.setItem(
      `offline_${offlineData.id}`,
      JSON.stringify(offlineData)
    );

    this.syncQueue.push(offlineData);
    
    if (this.isOnline) {
      this.processSyncQueue();
    }

    return offlineData.id;
  }

  async getOfflineData(id: string): Promise<OfflineData | null> {
    const data = await AsyncStorage.getItem(`offline_${id}`);
    return data ? JSON.parse(data) : null;
  }

  async getAllOfflineData(): Promise<OfflineData[]> {
    const keys = await AsyncStorage.getAllKeys();
    const offlineKeys = keys.filter(key => key.startsWith('offline_'));
    const data = await AsyncStorage.multiGet(offlineKeys);
    
    return data.map(([key, value]) => JSON.parse(value!));
  }

  async syncOfflineData(id: string): Promise<boolean> {
    const offlineData = await this.getOfflineData(id);
    if (!offlineData) return false;

    try {
      await this.syncToServer(offlineData);
      await this.markAsSynced(id);
      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      return false;
    }
  }

  private async processSyncQueue(): Promise<void> {
    if (!this.isOnline || this.syncQueue.length === 0) return;

    const sortedQueue = this.syncQueue.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    for (const data of sortedQueue) {
      try {
        await this.syncToServer(data);
        await this.markAsSynced(data.id);
        this.syncQueue = this.syncQueue.filter(item => item.id !== data.id);
      } catch (error) {
        console.error(`Failed to sync ${data.id}:`, error);
      }
    }
  }

  private async syncToServer(data: OfflineData): Promise<void> {
    const endpoint = this.getEndpointForType(data.type);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${await this.getAuthToken()}`
      },
      body: JSON.stringify(data.data)
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.statusText}`);
    }
  }

  private async markAsSynced(id: string): Promise<void> {
    const data = await this.getOfflineData(id);
    if (data) {
      data.synced = true;
      await AsyncStorage.setItem(`offline_${id}`, JSON.stringify(data));
    }
  }

  private getEndpointForType(type: string): string {
    const endpoints = {
      'shipment': '/api/shipments',
      'inventory': '/api/inventory',
      'driver_location': '/api/driver-locations',
      'delivery_proof': '/api/delivery-proofs'
    };
    return endpoints[type] || '/api/data';
  }

  private async getAuthToken(): Promise<string> {
    return await AsyncStorage.getItem('auth_token') || '';
  }

  private generateId(): string {
    return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
