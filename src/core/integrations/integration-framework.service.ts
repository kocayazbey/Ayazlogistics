import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface IntegrationConfig {
  id: string;
  name: string;
  type: 'payment' | 'shipping' | 'banking' | 'communication' | 'tracking' | 'government' | 'marketplace';
  provider: string;
  status: 'active' | 'inactive' | 'error' | 'maintenance';
  credentials: Record<string, any>;
  endpoints: Record<string, string>;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerHour: number;
    burstLimit: number;
  };
  retryConfig: {
    maxAttempts: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
  };
  timeout: number;
  version: string;
  metadata: Record<string, any>;
}

export interface IntegrationRequest {
  id: string;
  integrationId: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  endpoint: string;
  headers: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
  timeout: number;
  retryCount: number;
  startedAt: Date;
  completedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'timeout';
  response?: any;
  error?: string;
  userId?: string;
  ipAddress: string;
}

export interface IntegrationMetrics {
  integrationId: string;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  uptime: number; // percentage
  lastHealthCheck: Date;
  errorRate: number;
  status: 'healthy' | 'degraded' | 'unhealthy';
}

@Injectable()
export class IntegrationFrameworkService {
  private readonly logger = new Logger(IntegrationFrameworkService.name);
  private integrations: Map<string, IntegrationConfig> = new Map();
  private requests: Map<string, IntegrationRequest> = new Map();
  private metrics: Map<string, IntegrationMetrics> = new Map();

  constructor(private configService: ConfigService) {
    this.initializeFramework();
  }

  private async initializeFramework(): Promise<void> {
    this.logger.log('Initializing Integration Framework...');

    // Load integration configurations
    await this.loadIntegrationConfigurations();

    // Start monitoring
    this.startHealthMonitoring();

    // Start metrics collection
    this.startMetricsCollection();

    this.logger.log('Integration Framework initialized successfully');
  }

  // Integration Management
  async registerIntegration(config: Omit<IntegrationConfig, 'id'>): Promise<string> {
    const integrationId = `integration_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const integrationConfig: IntegrationConfig = {
      id: integrationId,
      ...config,
    };

    this.integrations.set(integrationId, integrationConfig);

    // Validate configuration
    await this.validateIntegrationConfig(integrationConfig);

    // Persist configuration
    await this.persistIntegrationConfig(integrationConfig);

    this.logger.log(`Integration registered: ${integrationId} (${config.name})`);
    return integrationId;
  }

  async getIntegration(integrationId: string): Promise<IntegrationConfig | null> {
    return this.integrations.get(integrationId) || null;
  }

  async listIntegrations(type?: IntegrationConfig['type'], status?: IntegrationConfig['status']): Promise<IntegrationConfig[]> {
    let integrations = Array.from(this.integrations.values());

    if (type) {
      integrations = integrations.filter(i => i.type === type);
    }

    if (status) {
      integrations = integrations.filter(i => i.status === status);
    }

    return integrations;
  }

  async updateIntegrationStatus(integrationId: string, status: IntegrationConfig['status']): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration) return false;

    integration.status = status;
    await this.persistIntegrationConfig(integration);

    this.logger.log(`Integration status updated: ${integrationId} -> ${status}`);
    return true;
  }

  async removeIntegration(integrationId: string): Promise<boolean> {
    const integration = this.integrations.get(integrationId);
    if (!integration) return false;

    this.integrations.delete(integrationId);
    await this.deleteIntegrationConfig(integrationId);

    this.logger.log(`Integration removed: ${integrationId}`);
    return true;
  }

  // Request Management
  async executeRequest(
    integrationId: string,
    method: IntegrationRequest['method'],
    endpoint: string,
    options: {
      headers?: Record<string, string>;
      body?: any;
      params?: Record<string, any>;
      timeout?: number;
      userId?: string;
      ipAddress: string;
    } = {},
  ): Promise<any> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      throw new Error(`Integration not found: ${integrationId}`);
    }

    if (integration.status !== 'active') {
      throw new Error(`Integration not active: ${integrationId}`);
    }

    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const request: IntegrationRequest = {
      id: requestId,
      integrationId,
      method,
      endpoint,
      headers: { ...this.getDefaultHeaders(integration), ...options.headers },
      body: options.body,
      params: options.params,
      timeout: options.timeout || integration.timeout,
      retryCount: 0,
      startedAt: new Date(),
      status: 'pending',
      userId: options.userId,
      ipAddress: options.ipAddress,
    };

    this.requests.set(requestId, request);

    try {
      // Check rate limits
      await this.checkRateLimit(integrationId, options.ipAddress, options.userId);

      // Execute request with retry logic
      const response = await this.executeWithRetry(request, integration);

      request.status = 'completed';
      request.completedAt = new Date();
      request.response = response;

      // Update metrics
      this.updateMetrics(integrationId, true, Date.now() - request.startedAt.getTime());

      this.logger.log(`Request completed: ${requestId} (${method} ${endpoint})`);
      return response;

    } catch (error) {
      request.status = 'failed';
      request.completedAt = new Date();
      request.error = error.message;

      // Update metrics
      this.updateMetrics(integrationId, false, Date.now() - request.startedAt.getTime());

      this.logger.error(`Request failed: ${requestId}`, error);
      throw error;
    }
  }

  // Health Monitoring
  async checkIntegrationHealth(integrationId: string): Promise<{
    healthy: boolean;
    responseTime: number;
    status: string;
    details: any;
  }> {
    const integration = this.integrations.get(integrationId);
    if (!integration) {
      return { healthy: false, responseTime: 0, status: 'not_found', details: {} };
    }

    const startTime = Date.now();

    try {
      // Check health endpoint if available
      if (integration.endpoints.health) {
        const response = await fetch(integration.endpoints.health, {
          method: 'GET',
          headers: this.getDefaultHeaders(integration),
          signal: AbortSignal.timeout(10000), // 10 second timeout
        });

        const responseTime = Date.now() - startTime;
        const healthy = response.ok;

        return {
          healthy,
          responseTime,
          status: healthy ? 'healthy' : 'unhealthy',
          details: { statusCode: response.status, responseTime },
        };
      }

      // Fallback health check
      return {
        healthy: true,
        responseTime: Date.now() - startTime,
        status: 'healthy',
        details: { fallback: true },
      };

    } catch (error) {
      return {
        healthy: false,
        responseTime: Date.now() - startTime,
        status: 'error',
        details: { error: error.message },
      };
    }
  }

  // Metrics
  async getIntegrationMetrics(integrationId?: string): Promise<IntegrationMetrics[]> {
    if (integrationId) {
      const metrics = this.metrics.get(integrationId);
      return metrics ? [metrics] : [];
    }

    return Array.from(this.metrics.values());
  }

  async getFrameworkMetrics(): Promise<{
    totalIntegrations: number;
    activeIntegrations: number;
    totalRequests: number;
    successfulRequests: number;
    failedRequests: number;
    averageResponseTime: number;
  }> {
    const allMetrics = Array.from(this.metrics.values());

    return {
      totalIntegrations: this.integrations.size,
      activeIntegrations: Array.from(this.integrations.values()).filter(i => i.status === 'active').length,
      totalRequests: allMetrics.reduce((sum, m) => sum + m.totalRequests, 0),
      successfulRequests: allMetrics.reduce((sum, m) => sum + m.successfulRequests, 0),
      failedRequests: allMetrics.reduce((sum, m) => sum + m.failedRequests, 0),
      averageResponseTime: allMetrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / allMetrics.length || 0,
    };
  }

  // Private methods
  private async loadIntegrationConfigurations(): Promise<void> {
    // Load from database or configuration
    // This would typically load from an integrations registry table
    this.logger.log('Loading integration configurations...');

    // Initialize default integrations
    const defaultIntegrations: Omit<IntegrationConfig, 'id'>[] = [
      {
        name: 'Iyzico Payment Gateway',
        type: 'payment',
        provider: 'iyzico',
        status: 'active',
        credentials: {
          apiKey: this.configService.get<string>('IYZICO_API_KEY'),
          secretKey: this.configService.get<string>('IYZICO_SECRET_KEY'),
        },
        endpoints: {
          base: this.configService.get<string>('IYZICO_BASE_URL', 'https://sandbox-api.iyzipay.com'),
          health: this.configService.get<string>('IYZICO_HEALTH_URL', 'https://sandbox-api.iyzipay.com/health'),
        },
        rateLimits: { requestsPerMinute: 100, requestsPerHour: 1000, burstLimit: 10 },
        retryConfig: { maxAttempts: 3, initialDelay: 1000, maxDelay: 10000, backoffMultiplier: 2 },
        timeout: 30000,
        version: '1.0.0',
        metadata: { description: 'Turkish payment gateway integration' },
      },
      {
        name: 'Aras Kargo Shipping',
        type: 'shipping',
        provider: 'aras_kargo',
        status: 'active',
        credentials: {
          username: this.configService.get<string>('ARAS_KARGO_USERNAME'),
          password: this.configService.get<string>('ARAS_KARGO_PASSWORD'),
          customerId: this.configService.get<string>('ARAS_KARGO_CUSTOMER_ID'),
        },
        endpoints: {
          base: this.configService.get<string>('ARAS_KARGO_API_URL', 'https://api.araskargo.com.tr/v1'),
          health: this.configService.get<string>('ARAS_KARGO_HEALTH_URL', 'https://api.araskargo.com.tr/health'),
        },
        rateLimits: { requestsPerMinute: 50, requestsPerHour: 500, burstLimit: 5 },
        retryConfig: { maxAttempts: 3, initialDelay: 2000, maxDelay: 15000, backoffMultiplier: 2 },
        timeout: 45000,
        version: '1.0.0',
        metadata: { description: 'Turkish cargo company integration' },
      },
    ];

    for (const config of defaultIntegrations) {
      if (this.isIntegrationConfigured(config)) {
        await this.registerIntegration(config);
      }
    }
  }

  private isIntegrationConfigured(config: Omit<IntegrationConfig, 'id'>): boolean {
    return Object.values(config.credentials).every(cred => cred && cred.trim() !== '');
  }

  private async validateIntegrationConfig(config: IntegrationConfig): Promise<void> {
    // Validate credentials are not empty
    if (!this.isIntegrationConfigured(config)) {
      throw new Error(`Integration ${config.name} credentials are not properly configured`);
    }

    // Validate endpoints are accessible
    if (config.endpoints.health) {
      const health = await this.checkIntegrationHealth(config.id);
      if (!health.healthy) {
        throw new Error(`Integration ${config.name} health check failed`);
      }
    }
  }

  private getDefaultHeaders(integration: IntegrationConfig): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'AyazLogistics-Integration/1.0',
    };

    // Add authentication headers based on provider
    switch (integration.provider) {
      case 'iyzico':
        headers['Authorization'] = `Bearer ${integration.credentials.apiKey}`;
        break;
      case 'aras_kargo':
        // Basic auth or API key based implementation
        break;
      default:
        // Generic implementation
        break;
    }

    return headers;
  }

  private async checkRateLimit(integrationId: string, ipAddress: string, userId?: string): Promise<void> {
    // Implement rate limiting logic
    // This would typically use Redis or in-memory store
  }

  private async executeWithRetry(request: IntegrationRequest, integration: IntegrationConfig): Promise<any> {
    let lastError: Error;

    for (let attempt = 0; attempt <= integration.retryConfig.maxAttempts; attempt++) {
      request.retryCount = attempt;

      try {
        const response = await this.executeSingleRequest(request, integration);
        return response;

      } catch (error) {
        lastError = error;

        if (attempt < integration.retryConfig.maxAttempts) {
          const delay = Math.min(
            integration.retryConfig.initialDelay * Math.pow(integration.retryConfig.backoffMultiplier, attempt),
            integration.retryConfig.maxDelay,
          );

          await this.sleep(delay);
        }
      }
    }

    throw lastError!;
  }

  private async executeSingleRequest(request: IntegrationRequest, integration: IntegrationConfig): Promise<any> {
    const url = this.buildUrl(integration.endpoints.base, request.endpoint, request.params);

    const options: RequestInit = {
      method: request.method,
      headers: request.headers,
      signal: AbortSignal.timeout(request.timeout),
    };

    if (request.body && ['POST', 'PUT', 'PATCH'].includes(request.method)) {
      options.body = JSON.stringify(request.body);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.json();
  }

  private buildUrl(baseUrl: string, endpoint: string, params?: Record<string, any>): string {
    let url = `${baseUrl}${endpoint}`;

    if (params && Object.keys(params).length > 0) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      url += `?${searchParams.toString()}`;
    }

    return url;
  }

  private updateMetrics(integrationId: string, success: boolean, responseTime: number): void {
    let metrics = this.metrics.get(integrationId);

    if (!metrics) {
      metrics = {
        integrationId,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        averageResponseTime: 0,
        uptime: 100,
        lastHealthCheck: new Date(),
        errorRate: 0,
        status: 'healthy',
      };
      this.metrics.set(integrationId, metrics);
    }

    metrics.totalRequests++;
    if (success) {
      metrics.successfulRequests++;
    } else {
      metrics.failedRequests++;
    }

    // Update average response time
    metrics.averageResponseTime = (metrics.averageResponseTime * (metrics.totalRequests - 1) + responseTime) / metrics.totalRequests;

    // Update error rate
    metrics.errorRate = (metrics.failedRequests / metrics.totalRequests) * 100;

    // Update status based on error rate
    if (metrics.errorRate > 10) {
      metrics.status = 'unhealthy';
    } else if (metrics.errorRate > 5) {
      metrics.status = 'degraded';
    } else {
      metrics.status = 'healthy';
    }
  }

  private async persistIntegrationConfig(config: IntegrationConfig): Promise<void> {
    // Persist to database in production
    this.logger.debug(`Persisting integration config: ${config.id}`);
  }

  private async deleteIntegrationConfig(integrationId: string): Promise<void> {
    // Delete from database in production
    this.logger.debug(`Deleting integration config: ${integrationId}`);
  }

  private startHealthMonitoring(): void {
    setInterval(async () => {
      for (const [integrationId, integration] of this.integrations) {
        if (integration.status === 'active') {
          try {
            const health = await this.checkIntegrationHealth(integrationId);

            if (!health.healthy) {
              this.logger.warn(`Integration health issue: ${integrationId}`, health);
              await this.updateIntegrationStatus(integrationId, 'error');
            } else {
              await this.updateIntegrationStatus(integrationId, 'active');
            }
          } catch (error) {
            this.logger.error(`Error checking integration health: ${integrationId}`, error);
            await this.updateIntegrationStatus(integrationId, 'error');
          }
        }
      }
    }, 60000); // Check every minute
  }

  private startMetricsCollection(): void {
    setInterval(() => {
      this.logger.debug('Integration metrics:', this.getFrameworkMetrics());
    }, 300000); // Log every 5 minutes
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
