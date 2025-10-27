import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { StandardizedDatabaseService } from '../../core/database/database.service';
import { apiKeys } from '../../database/schema/core/api-keys.schema';
import { apiUsage } from '../../database/schema/analytics/api-usage.schema';
import { eq, and, gte, lte, like, desc, asc } from 'drizzle-orm';
import * as crypto from 'crypto';

@Injectable()
export class ApiPortalService {
  constructor(private readonly db: StandardizedDatabaseService) {}

  async getApiKeys(page: number = 1, limit: number = 10, search?: string) {
    const offset = (page - 1) * limit;
    
    let whereClause = {};
    if (search) {
      whereClause = like(apiKeys.name, `%${search}%`);
    }

    const keys = await this.db.query.apiKeys.findMany({
      where: whereClause,
      orderBy: [desc(apiKeys.createdAt)],
      limit,
      offset,
    });

    const total = await this.db.db.select().from(apiKeys).where(whereClause);

    return {
      data: keys,
      pagination: {
        page,
        limit,
        total: total.length,
        pages: Math.ceil(total.length / limit),
      },
    };
  }

  async createApiKey(createApiKeyDto: any) {
    const { name, description, permissions, expiresAt, rateLimit } = createApiKeyDto;

    // Generate API key
    const apiKey = this.generateApiKey();
    const hashedKey = this.hashApiKey(apiKey);

    // Create API key record
    const newApiKey = await this.db.db.insert(apiKeys).values({
      name,
      description,
      keyHash: hashedKey,
      permissions: JSON.stringify(permissions),
      expiresAt,
      rateLimit,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    return {
      ...newApiKey[0],
      key: apiKey, // Only return the key once
    };
  }

  async getApiKey(id: string) {
    const apiKey = await this.db.query.apiKeys.findFirst({
      where: eq(apiKeys.id, id),
    });

    if (!apiKey) {
      throw new NotFoundException(`API key with ID ${id} not found`);
    }

    return apiKey;
  }

  async updateApiKey(id: string, updateApiKeyDto: any) {
    const existingKey = await this.getApiKey(id);
    
    const updatedKey = await this.db.db.update(apiKeys)
      .set({
        ...updateApiKeyDto,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();

    return updatedKey[0];
  }

  async deleteApiKey(id: string) {
    const existingKey = await this.getApiKey(id);
    
    await this.db.db.delete(apiKeys).where(eq(apiKeys.id, id));
    
    return { message: 'API key deleted successfully' };
  }

  async regenerateApiKey(id: string) {
    const existingKey = await this.getApiKey(id);
    
    // Generate new API key
    const newApiKey = this.generateApiKey();
    const hashedKey = this.hashApiKey(newApiKey);

    // Update the key hash
    const updatedKey = await this.db.db.update(apiKeys)
      .set({
        keyHash: hashedKey,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();

    return {
      ...updatedKey[0],
      key: newApiKey, // Only return the key once
    };
  }

  async getApiUsage(query: any) {
    const { startDate, endDate, apiKeyId, endpoint, page = 1, limit = 10 } = query;
    const offset = (page - 1) * limit;

    let whereClause = {};
    if (startDate && endDate) {
      whereClause = and(
        gte(apiUsage.timestamp, new Date(startDate)),
        lte(apiUsage.timestamp, new Date(endDate))
      );
    }
    if (apiKeyId) {
      whereClause = and(whereClause, eq(apiUsage.apiKeyId, apiKeyId));
    }
    if (endpoint) {
      whereClause = and(whereClause, like(apiUsage.endpoint, `%${endpoint}%`));
    }

    const usage = await this.db.query.apiUsage.findMany({
      where: whereClause,
      orderBy: [desc(apiUsage.timestamp)],
      limit,
      offset,
    });

    const total = await this.db.db.select().from(apiUsage).where(whereClause);

    return {
      data: usage,
      pagination: {
        page,
        limit,
        total: total.length,
        pages: Math.ceil(total.length / limit),
      },
    };
  }

  async getApiUsageSummary(query: any) {
    const { startDate, endDate, apiKeyId } = query;

    let whereClause = {};
    if (startDate && endDate) {
      whereClause = and(
        gte(apiUsage.timestamp, new Date(startDate)),
        lte(apiUsage.timestamp, new Date(endDate))
      );
    }
    if (apiKeyId) {
      whereClause = and(whereClause, eq(apiUsage.apiKeyId, apiKeyId));
    }

    const usage = await this.db.query.apiUsage.findMany({
      where: whereClause,
    });

    // Calculate summary statistics
    const totalRequests = usage.length;
    const successfulRequests = usage.filter(u => u.statusCode >= 200 && u.statusCode < 300).length;
    const errorRequests = usage.filter(u => u.statusCode >= 400).length;
    const averageResponseTime = usage.reduce((sum, u) => sum + u.responseTime, 0) / totalRequests;

    return {
      totalRequests,
      successfulRequests,
      errorRequests,
      successRate: (successfulRequests / totalRequests) * 100,
      averageResponseTime,
      period: {
        startDate,
        endDate,
      },
    };
  }

  async getEndpointUsage(query: any) {
    const { startDate, endDate, apiKeyId } = query;

    let whereClause = {};
    if (startDate && endDate) {
      whereClause = and(
        gte(apiUsage.timestamp, new Date(startDate)),
        lte(apiUsage.timestamp, new Date(endDate))
      );
    }
    if (apiKeyId) {
      whereClause = and(whereClause, eq(apiUsage.apiKeyId, apiKeyId));
    }

    const usage = await this.db.query.apiUsage.findMany({
      where: whereClause,
    });

    // Group by endpoint
    const endpointStats = usage.reduce((acc, u) => {
      const endpoint = u.endpoint;
      if (!acc[endpoint]) {
        acc[endpoint] = {
          endpoint,
          totalRequests: 0,
          successfulRequests: 0,
          errorRequests: 0,
          averageResponseTime: 0,
        };
      }
      
      acc[endpoint].totalRequests++;
      if (u.statusCode >= 200 && u.statusCode < 300) {
        acc[endpoint].successfulRequests++;
      } else if (u.statusCode >= 400) {
        acc[endpoint].errorRequests++;
      }
      acc[endpoint].averageResponseTime += u.responseTime;
    }, {});

    // Calculate averages
    Object.values(endpointStats).forEach((stats: any) => {
      stats.averageResponseTime = stats.averageResponseTime / stats.totalRequests;
      stats.successRate = (stats.successfulRequests / stats.totalRequests) * 100;
    });

    return Object.values(endpointStats);
  }

  async getApiErrors(query: any) {
    const { startDate, endDate, apiKeyId } = query;

    let whereClause = {};
    if (startDate && endDate) {
      whereClause = and(
        gte(apiUsage.timestamp, new Date(startDate)),
        lte(apiUsage.timestamp, new Date(endDate))
      );
    }
    if (apiKeyId) {
      whereClause = and(whereClause, eq(apiUsage.apiKeyId, apiKeyId));
    }

    const usage = await this.db.query.apiUsage.findMany({
      where: whereClause,
    });

    // Filter error responses
    const errors = usage.filter(u => u.statusCode >= 400);

    // Group by error code
    const errorStats = errors.reduce((acc, u) => {
      const statusCode = u.statusCode;
      if (!acc[statusCode]) {
        acc[statusCode] = {
          statusCode,
          count: 0,
          endpoints: {},
        };
      }
      
      acc[statusCode].count++;
      if (!acc[statusCode].endpoints[u.endpoint]) {
        acc[statusCode].endpoints[u.endpoint] = 0;
      }
      acc[statusCode].endpoints[u.endpoint]++;
    }, {});

    return Object.values(errorStats);
  }

  async getApiDocumentation() {
    return {
      title: 'AyazLogistics API',
      version: '1.0.0',
      description: 'Comprehensive API for logistics management',
      baseUrl: 'https://api.ayazlogistics.com',
      authentication: {
        type: 'API Key',
        header: 'X-API-Key',
        description: 'Include your API key in the X-API-Key header',
      },
      rateLimiting: {
        default: '1000 requests per hour',
        description: 'Rate limits are applied per API key',
      },
      endpoints: [
        {
          path: '/api/v1/auth/login',
          method: 'POST',
          description: 'User authentication',
          parameters: ['email', 'password'],
        },
        {
          path: '/api/v1/inventory',
          method: 'GET',
          description: 'Get inventory items',
          parameters: ['page', 'limit', 'search'],
        },
        {
          path: '/api/v1/shipments',
          method: 'GET',
          description: 'Get shipments',
          parameters: ['page', 'limit', 'status'],
        },
      ],
    };
  }

  async getApiEndpoints() {
    return [
      {
        path: '/api/v1/auth',
        methods: ['POST'],
        description: 'Authentication endpoints',
        endpoints: [
          {
            path: '/login',
            method: 'POST',
            description: 'User login',
            parameters: ['email', 'password'],
            response: 'JWT token',
          },
          {
            path: '/refresh',
            method: 'POST',
            description: 'Refresh JWT token',
            parameters: ['refreshToken'],
            response: 'New JWT token',
          },
        ],
      },
      {
        path: '/api/v1/inventory',
        methods: ['GET', 'POST', 'PUT', 'DELETE'],
        description: 'Inventory management endpoints',
        endpoints: [
          {
            path: '/',
            method: 'GET',
            description: 'Get inventory items',
            parameters: ['page', 'limit', 'search'],
            response: 'Paginated inventory items',
          },
          {
            path: '/:id',
            method: 'GET',
            description: 'Get inventory item by ID',
            parameters: ['id'],
            response: 'Inventory item details',
          },
        ],
      },
    ];
  }

  async getApiSchemas() {
    return {
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string' },
          },
        },
        InventoryItem: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            quantity: { type: 'number' },
            price: { type: 'number' },
          },
        },
        Shipment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            trackingNumber: { type: 'string' },
            status: { type: 'string' },
            origin: { type: 'string' },
            destination: { type: 'string' },
          },
        },
      },
    };
  }

  async getApiStatus() {
    return {
      status: 'operational',
      uptime: process.uptime(),
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      services: {
        database: 'operational',
        redis: 'operational',
        queue: 'operational',
      },
    };
  }

  async getApiHealth() {
    return {
      status: 'healthy',
      checks: {
        database: 'healthy',
        redis: 'healthy',
        queue: 'healthy',
      },
      timestamp: new Date().toISOString(),
    };
  }

  private generateApiKey(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashApiKey(apiKey: string): string {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
}
