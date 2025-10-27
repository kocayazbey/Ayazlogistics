const rawBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const API_BASE_URL = rawBase;

interface ApiError {
  message: string;
  status: number;
  code?: string;
}

class ApiClient {
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
    };

    // Get token from cookie instead of localStorage
    const getCookieValue = (name: string): string | null => {
      if (typeof window === 'undefined') return null;
      const value = `; ${document.cookie}`;
      const parts = value.split(`; ${name}=`);
      if (parts.length === 2) {
        return parts.pop()?.split(';').shift() || null;
      }
      return null;
    };

    const token = getCookieValue('access_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // Add tenant context if available (keep localStorage for tenant for now)
    const tenantId = typeof window !== 'undefined' ? localStorage.getItem('tenantId') : null;
    if (tenantId) {
      headers['X-Tenant-ID'] = tenantId;
    }

    return headers;
  }

  private async handleResponse<T>(response: Response): Promise<T> {
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
  ): Promise<T> {
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

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<T> {
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
        credentials: 'include', // Include cookies in requests
      })
    );
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.retryRequest<T>(() =>
      fetch(`${this.baseURL}${endpoint}`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include', // Include cookies in requests
      })
    );
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.retryRequest<T>(() =>
      fetch(`${this.baseURL}${endpoint}`, {
        method: 'PUT',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include', // Include cookies in requests
      })
    );
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.retryRequest<T>(() =>
      fetch(`${this.baseURL}${endpoint}`, {
        method: 'DELETE',
        headers: this.getHeaders(),
        credentials: 'include', // Include cookies in requests
      })
    );
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.retryRequest<T>(() =>
      fetch(`${this.baseURL}${endpoint}`, {
        method: 'PATCH',
        headers: this.getHeaders(),
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include', // Include cookies in requests
      })
    );
  }
}

export const apiClient = new ApiClient(API_BASE_URL);

export const billingApi = {
  getMetrics: (period: string) => apiClient.get(`/v1/billing/metrics?period=${period}`),
  getInvoices: () => apiClient.get('/v1/billing/invoices'),
  calculateUsage: (data: any) => apiClient.post('/v1/billing/usage/calculate', data),
};

export const crmApi = {
  getCustomers: () => apiClient.get('/v1/crm/customers'),
  getLeads: () => apiClient.get('/v1/crm/leads'),
  getCampaigns: () => apiClient.get('/v1/crm/campaigns'),
};

export const trackingApi = {
  getShipments: () => apiClient.get('/v1/tracking/shipments'),
  getShipmentById: (id: string) => apiClient.get(`/v1/tracking/shipments/${id}`),
};

export const analyticsApi = {
  getKPIs: () => apiClient.get('/v1/analytics/kpis'),
  getPredictiveInsights: () => apiClient.get('/v1/analytics/predictive'),
};

export const erpApi = {
  getFinancials: () => apiClient.get('/v1/erp/financials'),
  getTransactions: () => apiClient.get('/v1/erp/transactions'),
  getBudgets: () => apiClient.get('/v1/erp/budgets'),
};

