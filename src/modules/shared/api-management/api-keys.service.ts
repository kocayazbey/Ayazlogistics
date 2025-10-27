import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, or, desc, asc, sql } from 'drizzle-orm';
import { apiKeys, apiKeyUsage } from '../../../database/schema/shared/api-management.schema';
import { CreateApiKeyDto, UpdateApiKeyDto, ApiKeyQueryDto } from './dto/api-key.dto';
import { randomBytes, createHash } from 'crypto';

@Injectable()
export class ApiKeysService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async create(createApiKeyDto: CreateApiKeyDto) {
    try {
      // Generate API key
      const keyValue = this.generateApiKey();
      const hashedKey = this.hashApiKey(keyValue);

      const [apiKey] = await this.db
        .insert(apiKeys)
        .values({
          ...createApiKeyDto,
          keyHash: hashedKey,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return {
        ...apiKey,
        keyValue, // Only returned once during creation
      };
    } catch (error) {
      throw new BadRequestException('API key creation failed');
    }
  }

  async findAll(query: ApiKeyQueryDto) {
    const { page = 1, limit = 10, search, status, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    
    const offset = (page - 1) * limit;
    
    let whereConditions = [];
    
    if (search) {
      whereConditions.push(
        or(
          eq(apiKeys.name, search),
          eq(apiKeys.description, search),
          eq(apiKeys.clientId, search)
        )
      );
    }
    
    if (status) {
      whereConditions.push(eq(apiKeys.isActive, status === 'active'));
    }

    const [apiKeysList, total] = await Promise.all([
      this.db
        .select()
        .from(apiKeys)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
        .orderBy(sortOrder === 'desc' ? desc(apiKeys[sortBy]) : asc(apiKeys[sortBy]))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: apiKeys.id })
        .from(apiKeys)
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    ]);

    return {
      data: apiKeysList,
      pagination: {
        page,
        limit,
        total: total.length,
        totalPages: Math.ceil(total.length / limit),
      },
    };
  }

  async findOne(id: string) {
    const [apiKey] = await this.db
      .select()
      .from(apiKeys)
      .where(eq(apiKeys.id, id))
      .limit(1);

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  async update(id: string, updateApiKeyDto: UpdateApiKeyDto) {
    const [apiKey] = await this.db
      .update(apiKeys)
      .set({
        ...updateApiKeyDto,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return apiKey;
  }

  async remove(id: string) {
    const [apiKey] = await this.db
      .update(apiKeys)
      .set({
        isActive: false,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return { message: 'API key deactivated successfully' };
  }

  async regenerate(id: string) {
    const existingKey = await this.findOne(id);
    
    const keyValue = this.generateApiKey();
    const hashedKey = this.hashApiKey(keyValue);

    const [apiKey] = await this.db
      .update(apiKeys)
      .set({
        keyHash: hashedKey,
        lastUsed: null,
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();

    return {
      ...apiKey,
      keyValue, // Only returned once during regeneration
    };
  }

  async revoke(id: string) {
    const [apiKey] = await this.db
      .update(apiKeys)
      .set({
        isActive: false,
        revokedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(apiKeys.id, id))
      .returning();

    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    return { message: 'API key revoked successfully' };
  }

  async getUsage(id: string, period: string) {
    const apiKey = await this.findOne(id);
    
    const days = this.parsePeriod(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const usage = await this.db
      .select({
        date: apiKeyUsage.date,
        requests: sql<number>`count(*)`,
        errors: sql<number>`sum(case when status_code >= 400 then 1 else 0 end)`,
      })
      .from(apiKeyUsage)
      .where(
        and(
          eq(apiKeyUsage.apiKeyId, id),
          sql`date >= ${startDate}`
        )
      )
      .groupBy(apiKeyUsage.date)
      .orderBy(asc(apiKeyUsage.date));

    return {
      apiKeyId: id,
      period,
      usage,
    };
  }

  async getRateLimits() {
    return {
      default: {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        requestsPerDay: 10000,
      },
      tiers: {
        basic: {
          requestsPerMinute: 50,
          requestsPerHour: 500,
          requestsPerDay: 5000,
        },
        premium: {
          requestsPerMinute: 200,
          requestsPerHour: 2000,
          requestsPerDay: 20000,
        },
        enterprise: {
          requestsPerMinute: 500,
          requestsPerHour: 5000,
          requestsPerDay: 50000,
        },
      },
    };
  }

  private generateApiKey(): string {
    const prefix = 'ak_';
    const randomPart = randomBytes(32).toString('hex');
    return `${prefix}${randomPart}`;
  }

  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }

  private parsePeriod(period: string): number {
    const match = period.match(/(\d+)([dhmy])/);
    if (!match) return 30;

    const value = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
      case 'd': return value;
      case 'h': return Math.ceil(value / 24);
      case 'm': return value * 30;
      case 'y': return value * 365;
      default: return 30;
    }
  }
}
