import { Injectable, Inject, UnauthorizedException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import * as crypto from 'crypto';

interface APIKey {
  id: string;
  customerId: string;
  keyName: string;
  apiKey: string;
  apiSecret: string;
  permissions: string[];
  ipWhitelist?: string[];
  rateLimit?: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  isActive: boolean;
  expiresAt?: Date;
  lastUsedAt?: Date;
  createdAt: Date;
  createdBy: string;
}

interface APIUsageLog {
  id: string;
  apiKeyId: string;
  customerId: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number;
  ipAddress: string;
  userAgent?: string;
  requestSize?: number;
  responseSize?: number;
  timestamp: Date;
}

@Injectable()
export class APIAccessService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createAPIKey(
    data: {
      customerId: string;
      keyName: string;
      permissions: string[];
      ipWhitelist?: string[];
      rateLimit?: APIKey['rateLimit'];
      expiresAt?: Date;
    },
    tenantId: string,
    userId: string,
  ): Promise<{ apiKey: string; apiSecret: string; keyId: string }> {
    const keyId = `KEY-${Date.now()}`;
    const apiKey = this.generateAPIKey();
    const apiSecret = this.generateAPISecret();

    const key: APIKey = {
      id: keyId,
      customerId: data.customerId,
      keyName: data.keyName,
      apiKey,
      apiSecret: this.hashSecret(apiSecret),
      permissions: data.permissions,
      ipWhitelist: data.ipWhitelist,
      rateLimit: data.rateLimit || {
        requestsPerMinute: 60,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      isActive: true,
      expiresAt: data.expiresAt,
      createdAt: new Date(),
      createdBy: userId,
    };

    await this.eventBus.emit('api_key.created', {
      keyId,
      customerId: data.customerId,
      keyName: data.keyName,
      tenantId,
    });

    return {
      apiKey,
      apiSecret, // Return unhashed secret only once
      keyId,
    };
  }

  async validateAPIKey(
    apiKey: string,
    apiSecret: string,
    ipAddress: string,
  ): Promise<APIKey | null> {
    // Mock: Would query api_keys table
    const storedKey = null; // await db query

    if (!storedKey) {
      return null;
    }

    // Verify secret
    const hashedSecret = this.hashSecret(apiSecret);
    if (hashedSecret !== (storedKey as any).apiSecret) {
      return null;
    }

    // Check if active
    if (!(storedKey as any).isActive) {
      return null;
    }

    // Check expiration
    if ((storedKey as any).expiresAt && new Date() > new Date((storedKey as any).expiresAt)) {
      return null;
    }

    // Check IP whitelist
    if ((storedKey as any).ipWhitelist && (storedKey as any).ipWhitelist.length > 0) {
      if (!(storedKey as any).ipWhitelist.includes(ipAddress)) {
        return null;
      }
    }

    return storedKey;
  }

  async checkPermission(apiKeyId: string, requiredPermission: string): Promise<boolean> {
    // Mock: Would query and check permissions
    return true;
  }

  async checkRateLimit(apiKeyId: string): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: Date;
  }> {
    // Mock: Would check Redis for rate limit counters
    return {
      allowed: true,
      remaining: 50,
      resetAt: new Date(Date.now() + 60000),
    };
  }

  async logAPIUsage(log: Omit<APIUsageLog, 'id' | 'timestamp'>): Promise<void> {
    const logId = `LOG-${Date.now()}`;

    const usageLog: APIUsageLog = {
      id: logId,
      ...log,
      timestamp: new Date(),
    };

    await this.eventBus.emit('api.usage.logged', {
      apiKeyId: log.apiKeyId,
      endpoint: log.endpoint,
      statusCode: log.statusCode,
    });
  }

  async getAPIKeyList(customerId: string, tenantId: string): Promise<Omit<APIKey, 'apiSecret'>[]> {
    // Mock: Would query api_keys table
    return [];
  }

  async revokeAPIKey(keyId: string, customerId: string, tenantId: string, userId: string): Promise<void> {
    await this.eventBus.emit('api_key.revoked', {
      keyId,
      customerId,
      revokedBy: userId,
      tenantId,
    });
  }

  async regenerateAPISecret(keyId: string, customerId: string, tenantId: string, userId: string): Promise<string> {
    const newSecret = this.generateAPISecret();
    const hashedSecret = this.hashSecret(newSecret);

    await this.eventBus.emit('api_key.secret_regenerated', {
      keyId,
      customerId,
      regeneratedBy: userId,
      tenantId,
    });

    return newSecret;
  }

  async getUsageStatistics(
    apiKeyId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<any> {
    return {
      apiKeyId,
      period: { startDate, endDate },
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      avgResponseTime: 0,
      topEndpoints: [],
      errorBreakdown: [],
    };
  }

  private generateAPIKey(): string {
    return 'ayaz_' + crypto.randomBytes(24).toString('hex');
  }

  private generateAPISecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private hashSecret(secret: string): string {
    return crypto.createHash('sha256').update(secret).digest('hex');
  }
}

