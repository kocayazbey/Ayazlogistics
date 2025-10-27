import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { apiErrorHandler } from './error-handler';
import {
  ApiResponse,
  InventoryItem,
  CreateInventoryDto,
  UpdateInventoryDto,
  Receipt,
  CreateReceiptDto,
  Pick,
  CreatePickDto,
  Shipment,
  CreateShipmentDto,
  Operation,
  Zone,
  Route,
  Driver,
  Vehicle,
  User,
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  ChurnPrediction,
  FraudDetection,
  SentimentAnalysis,
  InventoryFilter,
  OperationsFilter,
  RoutesFilter,
  InventoryStats,
  OperationsStats,
  RoutesStats,
} from '../types/api.types';

class TypedApiClient {
  private client: AxiosInstance;
  private baseURL: string;

  constructor() {
    this.baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        const tenantId = localStorage.getItem('tenantId');
        if (tenantId) {
          config.headers['X-Tenant-ID'] = tenantId;
        }

        const requestId = this.generateRequestId();
        config.headers['X-Request-ID'] = requestId;
        config.metadata = { requestId };

        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        const requestId = error.config?.metadata?.requestId || 'unknown';
        return apiErrorHandler.handleError(error, requestId);
      }
    );
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async request<T>(config: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response: AxiosResponse<ApiResponse<T>> = await this.client.request(config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  // Auth API
  auth = {
    login: (data: LoginRequest): Promise<ApiResponse<LoginResponse>> =>
      this.request<LoginResponse>({
        method: 'POST',
        url: '/auth/login',
        data,
      }),

    register: (data: RegisterRequest): Promise<ApiResponse<User>> =>
      this.request<User>({
        method: 'POST',
        url: '/auth/register',
        data,
      }),

    getProfile: (): Promise<ApiResponse<User>> =>
      this.request<User>({
        method: 'GET',
        url: '/auth/profile',
      }),

    refreshToken: (refreshToken: string): Promise<ApiResponse<{ accessToken: string }>> =>
      this.request<{ accessToken: string }>({
        method: 'POST',
        url: '/auth/refresh',
        data: { refreshToken },
      }),

    logout: (): Promise<ApiResponse<void>> =>
      this.request<void>({
        method: 'POST',
        url: '/auth/logout',
      }),
  };

  // WMS API
  wms = {
    inventory: {
      getAll: (filters?: InventoryFilter): Promise<ApiResponse<InventoryItem[]>> =>
        this.request<InventoryItem[]>({
          method: 'GET',
          url: '/wms/inventory',
          params: filters,
        }),

      getById: (id: string): Promise<ApiResponse<InventoryItem>> =>
        this.request<InventoryItem>({
          method: 'GET',
          url: `/wms/inventory/${id}`,
        }),

      create: (data: CreateInventoryDto): Promise<ApiResponse<InventoryItem>> =>
        this.request<InventoryItem>({
          method: 'POST',
          url: '/wms/inventory',
          data,
        }),

      update: (id: string, data: UpdateInventoryDto): Promise<ApiResponse<InventoryItem>> =>
        this.request<InventoryItem>({
          method: 'PUT',
          url: `/wms/inventory/${id}`,
          data,
        }),

      delete: (id: string): Promise<ApiResponse<void>> =>
        this.request<void>({
          method: 'DELETE',
          url: `/wms/inventory/${id}`,
        }),

      getStats: (): Promise<ApiResponse<InventoryStats>> =>
        this.request<InventoryStats>({
          method: 'GET',
          url: '/wms/inventory/stats',
        }),
    },

    receipts: {
      getAll: (filters?: any): Promise<ApiResponse<Receipt[]>> =>
        this.request<Receipt[]>({
          method: 'GET',
          url: '/wms/receipts',
          params: filters,
        }),

      getById: (id: string): Promise<ApiResponse<Receipt>> =>
        this.request<Receipt>({
          method: 'GET',
          url: `/wms/receipts/${id}`,
        }),

      create: (data: CreateReceiptDto): Promise<ApiResponse<Receipt>> =>
        this.request<Receipt>({
          method: 'POST',
          url: '/wms/receipts',
          data,
        }),

      approve: (id: string): Promise<ApiResponse<Receipt>> =>
        this.request<Receipt>({
          method: 'POST',
          url: `/wms/receipts/${id}/approve`,
        }),
    },

    picks: {
      getAll: (filters?: any): Promise<ApiResponse<Pick[]>> =>
        this.request<Pick[]>({
          method: 'GET',
          url: '/wms/picks',
          params: filters,
        }),

      getById: (id: string): Promise<ApiResponse<Pick>> =>
        this.request<Pick>({
          method: 'GET',
          url: `/wms/picks/${id}`,
        }),

      create: (data: CreatePickDto): Promise<ApiResponse<Pick>> =>
        this.request<Pick>({
          method: 'POST',
          url: '/wms/picks',
          data,
        }),

      assign: (id: string, assignedTo: string): Promise<ApiResponse<Pick>> =>
        this.request<Pick>({
          method: 'POST',
          url: `/wms/picks/${id}/assign`,
          data: { assignedTo },
        }),

      start: (id: string): Promise<ApiResponse<Pick>> =>
        this.request<Pick>({
          method: 'POST',
          url: `/wms/picks/${id}/start`,
        }),

      complete: (id: string): Promise<ApiResponse<Pick>> =>
        this.request<Pick>({
          method: 'POST',
          url: `/wms/picks/${id}/complete`,
        }),
    },

    shipments: {
      getAll: (filters?: any): Promise<ApiResponse<Shipment[]>> =>
        this.request<Shipment[]>({
          method: 'GET',
          url: '/wms/shipments',
          params: filters,
        }),

      getById: (id: string): Promise<ApiResponse<Shipment>> =>
        this.request<Shipment>({
          method: 'GET',
          url: `/wms/shipments/${id}`,
        }),

      create: (data: CreateShipmentDto): Promise<ApiResponse<Shipment>> =>
        this.request<Shipment>({
          method: 'POST',
          url: '/wms/shipments',
          data,
        }),

      dispatch: (id: string): Promise<ApiResponse<Shipment>> =>
        this.request<Shipment>({
          method: 'POST',
          url: `/wms/shipments/${id}/dispatch`,
        }),
    },

    operations: {
      getAll: (filters?: OperationsFilter): Promise<ApiResponse<Operation[]>> =>
        this.request<Operation[]>({
          method: 'GET',
          url: '/wms/operations',
          params: filters,
        }),

      getStats: (): Promise<ApiResponse<OperationsStats>> =>
        this.request<OperationsStats>({
          method: 'GET',
          url: '/wms/operations/stats',
        }),
    },

    zones: {
      getAll: (): Promise<ApiResponse<Zone[]>> =>
        this.request<Zone[]>({
          method: 'GET',
          url: '/wms/zones',
        }),

      getCapacity: (id: string): Promise<ApiResponse<any>> =>
        this.request<any>({
          method: 'GET',
          url: `/wms/zones/${id}/capacity`,
        }),
    },
  };

  // TMS API
  tms = {
    routes: {
      getAll: (filters?: RoutesFilter): Promise<ApiResponse<Route[]>> =>
        this.request<Route[]>({
          method: 'GET',
          url: '/tms/routes',
          params: filters,
        }),

      getById: (id: string): Promise<ApiResponse<Route>> =>
        this.request<Route>({
          method: 'GET',
          url: `/tms/routes/${id}`,
        }),

      create: (data: any): Promise<ApiResponse<Route>> =>
        this.request<Route>({
          method: 'POST',
          url: '/tms/routes',
          data,
        }),

      optimize: (id: string): Promise<ApiResponse<Route>> =>
        this.request<Route>({
          method: 'POST',
          url: `/tms/routes/${id}/optimize`,
        }),

      start: (id: string): Promise<ApiResponse<Route>> =>
        this.request<Route>({
          method: 'POST',
          url: `/tms/routes/${id}/start`,
        }),

      complete: (id: string): Promise<ApiResponse<Route>> =>
        this.request<Route>({
          method: 'POST',
          url: `/tms/routes/${id}/complete`,
        }),

      getStats: (): Promise<ApiResponse<RoutesStats>> =>
        this.request<RoutesStats>({
          method: 'GET',
          url: '/tms/routes/stats',
        }),
    },

    drivers: {
      getAll: (filters?: any): Promise<ApiResponse<Driver[]>> =>
        this.request<Driver[]>({
          method: 'GET',
          url: '/tms/drivers',
          params: filters,
        }),

      getById: (id: string): Promise<ApiResponse<Driver>> =>
        this.request<Driver>({
          method: 'GET',
          url: `/tms/drivers/${id}`,
        }),

      create: (data: any): Promise<ApiResponse<Driver>> =>
        this.request<Driver>({
          method: 'POST',
          url: '/tms/drivers',
          data,
        }),
    },

    vehicles: {
      getAll: (filters?: any): Promise<ApiResponse<Vehicle[]>> =>
        this.request<Vehicle[]>({
          method: 'GET',
          url: '/tms/vehicles',
          params: filters,
        }),

      getById: (id: string): Promise<ApiResponse<Vehicle>> =>
        this.request<Vehicle>({
          method: 'GET',
          url: `/tms/vehicles/${id}`,
        }),

      create: (data: any): Promise<ApiResponse<Vehicle>> =>
        this.request<Vehicle>({
          method: 'POST',
          url: '/tms/vehicles',
          data,
        }),
    },
  };

  // AI API
  ai = {
    predictChurn: (customerId: string): Promise<ApiResponse<ChurnPrediction>> =>
      this.request<ChurnPrediction>({
        method: 'GET',
        url: `/ai/churn-prediction/${customerId}`,
      }),

    detectFraud: (data: { transactionId: string }): Promise<ApiResponse<FraudDetection>> =>
      this.request<FraudDetection>({
        method: 'POST',
        url: '/ai/fraud-detection',
        data,
      }),

    analyzeSentiment: (data: { feedback: string }): Promise<ApiResponse<SentimentAnalysis>> =>
      this.request<SentimentAnalysis>({
        method: 'POST',
        url: '/ai/sentiment-analysis',
        data,
      }),
  };
}

export const typedApiClient = new TypedApiClient();
export default typedApiClient;
