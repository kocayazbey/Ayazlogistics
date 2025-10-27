import axios, { AxiosInstance, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

interface TrackingInfo {
  id: string;
  trackingNumber: string;
  status: string;
  origin: string;
  destination: string;
  currentLocation?: string;
  estimatedDelivery: string;
  steps: TrackingStep[];
}

interface TrackingStep {
  id: string;
  title: string;
  description: string;
  timestamp?: string;
  completed: boolean;
}

interface Shipment {
  id: string;
  trackingNumber: string;
  status: string;
  origin: string;
  destination: string;
  estimatedDelivery: string;
  createdAt: string;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  shipmentId?: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  company?: string;
  address: string;
  isVerified: boolean;
  joinDate: string;
}

class ApiService {
  private api: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = __DEV__
      ? 'http://localhost:3000/api'  // Development
      : 'https://api.ayazlogistics.com/api'; // Production

    this.api = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      async (config) => {
        const token = await AsyncStorage.getItem('authToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors
    this.api.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired or invalid
          await AsyncStorage.removeItem('authToken');
          await AsyncStorage.removeItem('userProfile');
          // TODO: Navigate to login screen
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication methods
  async login(email: string, password: string): Promise<ApiResponse<{ token: string; user: UserProfile }>> {
    try {
      const response = await this.api.post('/auth/login', { email, password });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Giriş yapılırken hata oluştu');
    }
  }

  async register(userData: {
    name: string;
    email: string;
    password: string;
    phone: string;
    company?: string;
  }): Promise<ApiResponse<{ token: string; user: UserProfile }>> {
    try {
      const response = await this.api.post('/auth/register', userData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kayıt olurken hata oluştu');
    }
  }

  async logout(): Promise<ApiResponse<void>> {
    try {
      const response = await this.api.post('/auth/logout');
      await AsyncStorage.removeItem('authToken');
      await AsyncStorage.removeItem('userProfile');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Çıkış yapılırken hata oluştu');
    }
  }

  // Profile methods
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await this.api.get('/customer/profile');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Profil yüklenirken hata oluştu');
    }
  }

  async updateProfile(profileData: Partial<UserProfile>): Promise<ApiResponse<UserProfile>> {
    try {
      const response = await this.api.put('/customer/profile', profileData);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Profil güncellenirken hata oluştu');
    }
  }

  // Shipment tracking methods
  async trackShipment(trackingNumber: string): Promise<ApiResponse<TrackingInfo>> {
    try {
      const response = await this.api.get(`/tracking/${trackingNumber}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kargo takibi yapılırken hata oluştu');
    }
  }

  async getShipments(page: number = 1, limit: number = 10): Promise<ApiResponse<{ shipments: Shipment[]; total: number }>> {
    try {
      const response = await this.api.get(`/customer/shipments?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Kargolar yüklenirken hata oluştu');
    }
  }

  // Invoice methods
  async getInvoices(page: number = 1, limit: number = 10): Promise<ApiResponse<{ invoices: Invoice[]; total: number }>> {
    try {
      const response = await this.api.get(`/customer/invoices?page=${page}&limit=${limit}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Faturalar yüklenirken hata oluştu');
    }
  }

  async getInvoice(invoiceId: string): Promise<ApiResponse<Invoice>> {
    try {
      const response = await this.api.get(`/customer/invoices/${invoiceId}`);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Fatura yüklenirken hata oluştu');
    }
  }

  async downloadInvoice(invoiceId: string): Promise<Blob> {
    try {
      const response = await this.api.get(`/customer/invoices/${invoiceId}/download`, {
        responseType: 'blob',
      });
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Fatura indirilirken hata oluştu');
    }
  }

  // Notification settings
  async getNotificationSettings(): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.get('/customer/notifications/settings');
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Bildirim ayarları yüklenirken hata oluştu');
    }
  }

  async updateNotificationSettings(settings: any): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.put('/customer/notifications/settings', settings);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Bildirim ayarları güncellenirken hata oluştu');
    }
  }

  // Support methods
  async submitSupportTicket(ticket: {
    subject: string;
    message: string;
    priority: 'low' | 'medium' | 'high';
    category: string;
  }): Promise<ApiResponse<any>> {
    try {
      const response = await this.api.post('/customer/support/tickets', ticket);
      return response.data;
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Destek talebi gönderilirken hata oluştu');
    }
  }
}

// Export singleton instance
export const apiService = new ApiService();
export default apiService;
