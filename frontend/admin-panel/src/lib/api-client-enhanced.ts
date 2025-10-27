import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

interface APIConfig {
  baseURL: string;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

interface RequestOptions extends AxiosRequestConfig {
  skipAuth?: boolean;
  skipRetry?: boolean;
}

class APIClient {
  private client: AxiosInstance;
  private authToken: string | null = null;
  private refreshTokenPromise: Promise<string> | null = null;

  constructor(config: APIConfig) {
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
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
        // Add auth token
        if (this.authToken && !config.headers.Authorization) {
          config.headers.Authorization = `Bearer ${this.authToken}`;
        }

        // Add tenant ID
        const tenantId = this.getTenantId();
        if (tenantId) {
          config.headers['X-Tenant-ID'] = tenantId;
        }

        // Add request ID for tracing
        config.headers['X-Request-ID'] = this.generateRequestId();

        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest: any = error.config;

        // Handle 401 - Unauthorized
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const newToken = await this.refreshToken();
            this.setAuthToken(newToken);
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return this.client(originalRequest);
          } catch (refreshError) {
            // Redirect to login
            if (typeof window !== 'undefined') {
              window.location.href = '/login';
            }
            return Promise.reject(refreshError);
          }
        }

        // Handle 429 - Rate Limit
        if (error.response?.status === 429) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
          console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
          
          await this.delay(retryAfter * 1000);
          return this.client(originalRequest);
        }

        // Handle network errors with retry
        if (!originalRequest._retryCount) {
          originalRequest._retryCount = 0;
        }

        if (originalRequest._retryCount < 3 && this.isRetryableError(error)) {
          originalRequest._retryCount++;
          const delay = originalRequest._retryCount * 1000; // Exponential backoff
          
          console.log(`Retrying request (${originalRequest._retryCount}/3) after ${delay}ms`);
          await this.delay(delay);
          
          return this.client(originalRequest);
        }

        return Promise.reject(error);
      },
    );
  }

  private isRetryableError(error: AxiosError): boolean {
    if (!error.response) {
      // Network error
      return true;
    }

    // Retry on 5xx errors
    return error.response.status >= 500 && error.response.status < 600;
  }

  private async refreshToken(): Promise<string> {
    if (this.refreshTokenPromise) {
      return this.refreshTokenPromise;
    }

    this.refreshTokenPromise = (async () => {
      try {
        const refreshToken = this.getRefreshToken();
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await this.client.post('/auth/refresh', { refreshToken });
        const { accessToken } = response.data;

        this.saveTokens(accessToken, refreshToken);
        return accessToken;
      } finally {
        this.refreshTokenPromise = null;
      }
    })();

    return this.refreshTokenPromise;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getTenantId(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('tenantId');
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('refreshToken');
  }

  private saveTokens(accessToken: string, refreshToken: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }

  setAuthToken(token: string) {
    this.authToken = token;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', token);
    }
  }

  clearAuth() {
    this.authToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  // HTTP Methods
  async get<T = any>(url: string, options?: RequestOptions): Promise<T> {
    const response = await this.client.get<T>(url, options);
    return response.data;
  }

  async post<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const response = await this.client.post<T>(url, data, options);
    return response.data;
  }

  async put<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const response = await this.client.put<T>(url, data, options);
    return response.data;
  }

  async patch<T = any>(url: string, data?: any, options?: RequestOptions): Promise<T> {
    const response = await this.client.patch<T>(url, data, options);
    return response.data;
  }

  async delete<T = any>(url: string, options?: RequestOptions): Promise<T> {
    const response = await this.client.delete<T>(url, options);
    return response.data;
  }
}

// Create singleton instance
const apiClient = new APIClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api/v1',
  timeout: 30000,
  retries: 3,
  retryDelay: 1000,
});

export default apiClient;

// API methods for each module
export const authAPI = {
  login: (email: string, password: string) => apiClient.post('/auth/login', { email, password }),
  register: (data: any) => apiClient.post('/auth/register', data),
  logout: () => apiClient.post('/auth/logout'),
  getProfile: () => apiClient.get('/auth/profile'),
  refreshToken: (refreshToken: string) => apiClient.post('/auth/refresh', { refreshToken }),
};

export const tmsAPI = {
  getVehicles: () => apiClient.get('/tms/vehicles'),
  createVehicle: (data: any) => apiClient.post('/tms/vehicles', data),
  getDrivers: () => apiClient.get('/tms/drivers'),
  createDriver: (data: any) => apiClient.post('/tms/drivers', data),
  optimizeRoute: (stops: any[]) => apiClient.post('/tms/optimize-route', { stops }),
  getRoutes: () => apiClient.get('/tms/routes'),
};

export const wmsAPI = {
  getWarehouses: () => apiClient.get('/wms/warehouses'),
  createWarehouse: (data: any) => apiClient.post('/wms/warehouses', data),
  getReceiving: () => apiClient.get('/wms/receiving'),
  createReceiving: (data: any) => apiClient.post('/wms/receiving', data),
  getPicking: () => apiClient.get('/wms/picking'),
  getInventory: () => apiClient.get('/wms/inventory'),
};

export const crmAPI = {
  getCustomers: () => apiClient.get('/crm/customers'),
  createCustomer: (data: any) => apiClient.post('/crm/customers', data),
  getLeads: () => apiClient.get('/crm/leads'),
  createLead: (data: any) => apiClient.post('/crm/leads', data),
  convertLead: (leadId: string) => apiClient.post(`/crm/leads/${leadId}/convert`),
};

export const billingAPI = {
  getInvoices: (params?: any) => apiClient.get('/billing/invoices', { params }),
  getInvoiceById: (id: string) => apiClient.get(`/billing/invoices/${id}`),
  generateInvoice: (data: any) => apiClient.post('/billing/generate-invoice', data),
  getContracts: () => apiClient.get('/billing/contracts'),
  createContract: (data: any) => apiClient.post('/billing/contracts', data),
  calculatePrice: (data: any) => apiClient.post('/billing/calculate-price', data),
};

export const analyticsAPI = {
  getDashboards: () => apiClient.get('/analytics/dashboards'),
  getKPIs: () => apiClient.get('/analytics/kpis'),
  getReports: (type: string, params?: any) => apiClient.get(`/analytics/reports/${type}`, { params }),
};

