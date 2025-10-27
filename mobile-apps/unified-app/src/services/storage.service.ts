import AsyncStorage from '@react-native-async-storage/async-storage';

class StorageService {
  async setItem(key: string, value: any): Promise<void> {
    try {
      const jsonValue = JSON.stringify(value);
      await AsyncStorage.setItem(key, jsonValue);
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  async getItem(key: string): Promise<any> {
    try {
      const jsonValue = await AsyncStorage.getItem(key);
      return jsonValue != null ? JSON.parse(jsonValue) : null;
    } catch (error) {
      console.error('Error reading data:', error);
      return null;
    }
  }

  async removeItem(key: string): Promise<void> {
    try {
      await AsyncStorage.removeItem(key);
    } catch (error) {
      console.error('Error removing data:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await AsyncStorage.clear();
    } catch (error) {
      console.error('Error clearing storage:', error);
    }
  }

  async cacheData(key: string, data: any, expiryMinutes: number = 60) {
    const cacheData = {
      data,
      expiry: Date.now() + expiryMinutes * 60 * 1000,
    };
    await this.setItem(key, cacheData);
  }

  async getCachedData(key: string): Promise<any> {
    const cached = await this.getItem(key);
    if (!cached) return null;

    if (Date.now() > cached.expiry) {
      await this.removeItem(key);
      return null;
    }

    return cached.data;
  }

  async saveOfflineData(type: string, data: any) {
    const offlineKey = `offline_${type}`;
    const existing = (await this.getItem(offlineKey)) || [];
    existing.push({ ...data, timestamp: Date.now() });
    await this.setItem(offlineKey, existing);
  }

  async getOfflineData(type: string): Promise<any[]> {
    const offlineKey = `offline_${type}`;
    return (await this.getItem(offlineKey)) || [];
  }

  async clearOfflineData(type: string) {
    const offlineKey = `offline_${type}`;
    await this.removeItem(offlineKey);
  }
}

export default new StorageService();

