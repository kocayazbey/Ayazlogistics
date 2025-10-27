import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  message: string;
  code: string;
  status: number;
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = __DEV__ 
      ? 'http://localhost:3000/api/v1' 
      : 'https://api.ayazlogistics.com/v1';
    
    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.api.interceptors.request.use(
      async (config) => {
        // Add auth token
        if (this.token) {
          config.headers.Authorization = `Bearer ${this.token}`;
        }

        // Add device info
        const deviceInfo = await this.getDeviceInfo();
        config.headers['X-Device-ID'] = deviceInfo.deviceId;
        config.headers['X-App-Version'] = deviceInfo.appVersion;
        config.headers['X-Platform'] = deviceInfo.platform;

        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle 401 errors (token expired)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            await this.refreshToken();
            return this.api(originalRequest);
          } catch (refreshError) {
            await this.logout();
            return Promise.reject(refreshError);
          }
        }

        // Handle network errors
        if (!error.response) {
          Alert.alert(
            'Bağlantı Hatası',
            'İnternet bağlantınızı kontrol edin ve tekrar deneyin.',
            [{ text: 'Tamam' }]
          );
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private async getDeviceInfo(): Promise<{
    deviceId: string;
    appVersion: string;
    platform: string;
  }> {
    try {
      const deviceId = await AsyncStorage.getItem('deviceId') || 'unknown';
      const appVersion = '1.0.0';
      const platform = 'react-native';
      
      return { deviceId, appVersion, platform };
    } catch (error) {
      return { deviceId: 'unknown', appVersion: '1.0.0', platform: 'react-native' };
    }
  }

  private handleError(error: any): ApiError {
    if (error.response) {
      return {
        message: error.response.data?.message || 'Sunucu hatası',
        code: error.response.data?.code || 'SERVER_ERROR',
        status: error.response.status,
      };
    } else if (error.request) {
      return {
        message: 'Ağ bağlantısı hatası',
        code: 'NETWORK_ERROR',
        status: 0,
      };
    } else {
      return {
        message: error.message || 'Bilinmeyen hata',
        code: 'UNKNOWN_ERROR',
        status: 0,
      };
    }
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse<{
    user: any;
    token: string;
    refreshToken: string;
  }>> {
    const response = await this.api.post('/auth/login', { email, password });
    const { token, refreshToken } = response.data.data;
    
    this.token = token;
    await AsyncStorage.setItem('token', token);
    await AsyncStorage.setItem('refreshToken', refreshToken);
    
    return response.data;
  }

  async logout(): Promise<void> {
    this.token = null;
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
  }

  async refreshToken(): Promise<void> {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    if (!refreshToken) throw new Error('No refresh token');

    const response = await this.api.post('/auth/refresh', { refreshToken });
    const { token } = response.data.data;
    
    this.token = token;
    await AsyncStorage.setItem('token', token);
  }

  async setToken(token: string): Promise<void> {
    this.token = token;
    await AsyncStorage.setItem('token', token);
  }

  // Generic HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.get(url, config);
    return response.data;
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.post(url, data, config);
    return response.data;
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.put(url, data, config);
    return response.data;
  }

  async patch<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.patch(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    const response = await this.api.delete(url, config);
    return response.data;
  }

  // File upload
  async uploadFile<T>(url: string, file: any, onProgress?: (progress: number) => void): Promise<ApiResponse<T>> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await this.api.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });

    return response.data;
  }

  // Business logic methods
  async getTasks(role: string, filters?: any): Promise<ApiResponse<any[]>> {
    return this.get(`/tasks?role=${role}`, { params: filters });
  }

  async updateTaskStatus(taskId: string, status: string, data?: any): Promise<ApiResponse<any>> {
    return this.patch(`/tasks/${taskId}/status`, { status, ...data });
  }

  async getInventory(filters?: any): Promise<ApiResponse<any[]>> {
    return this.get('/inventory', { params: filters });
  }

  async updateInventory(itemId: string, data: any): Promise<ApiResponse<any>> {
    return this.patch(`/inventory/${itemId}`, data);
  }

  async getOrders(filters?: any): Promise<ApiResponse<any[]>> {
    return this.get('/orders', { params: filters });
  }

  async createOrder(data: any): Promise<ApiResponse<any>> {
    return this.post('/orders', data);
  }

  async updateOrder(orderId: string, data: any): Promise<ApiResponse<any>> {
    return this.patch(`/orders/${orderId}`, data);
  }

  async getInvoices(filters?: any): Promise<ApiResponse<any[]>> {
    return this.get('/invoices', { params: filters });
  }

  async createInvoice(data: any): Promise<ApiResponse<any>> {
    return this.post('/invoices', data);
  }

  async getCustomers(filters?: any): Promise<ApiResponse<any[]>> {
    return this.get('/customers', { params: filters });
  }

  async createCustomer(data: any): Promise<ApiResponse<any>> {
    return this.post('/customers', data);
  }

  async getEmployees(filters?: any): Promise<ApiResponse<any[]>> {
    return this.get('/employees', { params: filters });
  }

  async updateEmployee(employeeId: string, data: any): Promise<ApiResponse<any>> {
    return this.patch(`/employees/${employeeId}`, data);
  }

  async getReports(type: string, filters?: any): Promise<ApiResponse<any>> {
    return this.get(`/reports/${type}`, { params: filters });
  }

  async getNotifications(filters?: any): Promise<ApiResponse<any[]>> {
    return this.get('/notifications', { params: filters });
  }

  async markNotificationAsRead(notificationId: string): Promise<ApiResponse<any>> {
    return this.patch(`/notifications/${notificationId}/read`);
  }

  async getLocation(): Promise<ApiResponse<{ latitude: number; longitude: number }>> {
    return this.get('/location');
  }

  async updateLocation(latitude: number, longitude: number): Promise<ApiResponse<any>> {
    return this.post('/location', { latitude, longitude });
  }

  async scanBarcode(barcode: string): Promise<ApiResponse<any>> {
    return this.post('/scan/barcode', { barcode });
  }

  async scanQRCode(qrCode: string): Promise<ApiResponse<any>> {
    return this.post('/scan/qr', { qrCode });
  }

  async uploadPhoto(photo: any, metadata?: any): Promise<ApiResponse<any>> {
    return this.uploadFile('/upload/photo', photo);
  }

  async getDashboardData(role: string): Promise<ApiResponse<any>> {
    return this.get(`/dashboard?role=${role}`);
  }

  async getAnalytics(type: string, period: string): Promise<ApiResponse<any>> {
    return this.get(`/analytics/${type}`, { params: { period } });
  }

  // Real-time methods
  async subscribeToUpdates(callback: (data: any) => void): Promise<void> {
    // This would be implemented with WebSocket or Server-Sent Events
    // For now, we'll use polling
    setInterval(async () => {
      try {
        const response = await this.get('/updates');
        if (response.success && response.data) {
          callback(response.data);
        }
      } catch (error) {
        console.error('Error fetching updates:', error);
      }
    }, 5000);
  }

  async sendRealTimeUpdate(type: string, data: any): Promise<ApiResponse<any>> {
    return this.post('/realtime/update', { type, data });
  }
}

export const apiService = new ApiService();
export default apiService;