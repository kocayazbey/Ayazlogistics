const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface ApiError {
  message: string;
  status: number;
  code?: string;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
}

class MobileApiClient {
  private baseURL: string;
  private retryCount = 3;
  private retryDelay = 1000;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Client-Type': 'mobile',
    };

    // Get token from AsyncStorage
    const token = this.getStoredToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add tenant context if available
    const tenantId = this.getStoredTenantId();
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    return headers;
  }

  private getStoredToken(): string | null {
    // In React Native, you would use AsyncStorage
    // For now, return null - implement with AsyncStorage
    return null;
  }

  private getStoredTenantId(): string | null {
    // In React Native, you would use AsyncStorage
    // For now, return null - implement with AsyncStorage
    return null;
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = {
        message: errorData.message || response.statusText,
        status: response.status,
        code: errorData.code,
      };
      throw error;
    }

    return response.json();
  }

  private async retryRequest<T>(
    requestFn: () => Promise<Response>,
    retries = this.retryCount
  ): Promise<ApiResponse<T>> {
    try {
      const response = await requestFn();
      return this.handleResponse<T>(response);
    } catch (error) {
      if (retries > 0 && this.shouldRetry(error as ApiError)) {
        await this.delay(this.retryDelay * (this.retryCount - retries + 1));
        return this.retryRequest(requestFn, retries - 1);
      }
      throw error;
    }
  }

  private shouldRetry(error: ApiError): boolean {
    return error.status >= 500 || error.status === 429;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.baseURL}${endpoint}`);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return this.retryRequest<T>(() =>
      fetch(url.toString(), {
        method: 'GET',
        headers: this.getHeaders(),
      })
    );
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(() =>
      fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      })
    );
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(() =>
      fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
      })
    );
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.retryRequest<T>(() =>
      fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
      })
    );
  }
}

export const mobileApiClient = new MobileApiClient(API_BASE_URL);

// ============================================================================
// MOBILE API ENDPOINTS
// ============================================================================

export const mobileAuthApi = {
  login: (email: string, password: string) =>
    mobileApiClient.post('/v1/mobile/auth/login', { email, password }),
  logout: () => mobileApiClient.post('/v1/mobile/auth/logout', {}),
  refreshToken: () => mobileApiClient.post('/v1/mobile/auth/refresh', {}),
  getProfile: () => mobileApiClient.get('/v1/mobile/auth/profile'),
};

export const mobileWmsApi = {
  // Receiving Operations
  getReceivingTasks: (userId: string) =>
    mobileApiClient.get('/v1/mobile/wms/receiving/tasks', { userId }),
  startReceiving: (taskId: string, userId: string) =>
    mobileApiClient.post('/v1/mobile/wms/receiving/start', { taskId, userId }),
  completeReceiving: (taskId: string, data: any) =>
    mobileApiClient.post('/v1/mobile/wms/receiving/complete', { taskId, ...data }),

  // Picking Operations
  getPickingTasks: (userId: string) =>
    mobileApiClient.get('/v1/mobile/wms/picking/tasks', { userId }),
  startPicking: (taskId: string, userId: string) =>
    mobileApiClient.post('/v1/mobile/wms/picking/start', { taskId, userId }),
  completePicking: (taskId: string, data: any) =>
    mobileApiClient.post('/v1/mobile/wms/picking/complete', { taskId, ...data }),

  // Shipping Operations
  getShippingTasks: (userId: string) =>
    mobileApiClient.get('/v1/mobile/wms/shipping/tasks', { userId }),
  startShipping: (taskId: string, userId: string) =>
    mobileApiClient.post('/v1/mobile/wms/shipping/start', { taskId, userId }),
  completeShipping: (taskId: string, data: any) =>
    mobileApiClient.post('/v1/mobile/wms/shipping/complete', { taskId, ...data }),

  // Inventory Operations
  getInventory: (locationId?: string) =>
    mobileApiClient.get('/v1/mobile/wms/inventory', { locationId }),
  updateInventory: (data: any) =>
    mobileApiClient.post('/v1/mobile/wms/inventory/update', data),
  cycleCount: (data: any) =>
    mobileApiClient.post('/v1/mobile/wms/inventory/cycle-count', data),
};

export const mobileTmsApi = {
  // Route Operations
  getRoutes: (driverId: string) =>
    mobileApiClient.get('/v1/mobile/tms/routes', { driverId }),
  startRoute: (routeId: string, driverId: string) =>
    mobileApiClient.post('/v1/mobile/tms/routes/start', { routeId, driverId }),
  updateRouteStatus: (routeId: string, status: string) =>
    mobileApiClient.post('/v1/mobile/tms/routes/status', { routeId, status }),

  // Delivery Operations
  getDeliveries: (driverId: string) =>
    mobileApiClient.get('/v1/mobile/tms/deliveries', { driverId }),
  startDelivery: (deliveryId: string, driverId: string) =>
    mobileApiClient.post('/v1/mobile/tms/deliveries/start', { deliveryId, driverId }),
  completeDelivery: (deliveryId: string, data: any) =>
    mobileApiClient.post('/v1/mobile/tms/deliveries/complete', { deliveryId, ...data }),
};

export const mobileErpApi = {
  // Financial Operations
  getInvoices: (userId: string) =>
    mobileApiClient.get('/v1/mobile/erp/invoices', { userId }),
  createInvoice: (data: any) =>
    mobileApiClient.post('/v1/mobile/erp/invoices', data),
  getTransactions: (userId: string) =>
    mobileApiClient.get('/v1/mobile/erp/transactions', { userId }),

  // Customer Operations
  getCustomers: (userId: string) =>
    mobileApiClient.get('/v1/mobile/erp/customers', { userId }),
  createCustomer: (data: any) =>
    mobileApiClient.post('/v1/mobile/erp/customers', data),
  updateCustomer: (customerId: string, data: any) =>
    mobileApiClient.put(`/v1/mobile/erp/customers/${customerId}`, data),
};
