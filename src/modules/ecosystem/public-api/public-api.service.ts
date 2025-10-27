import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface PublicAPI {
  id: string;
  tenantId: string;
  name: string;
  version: string;
  description: string;
  baseUrl: string;
  endpoints: APIEndpoint[];
  authentication: APIAuthentication;
  rateLimits: RateLimit[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface APIEndpoint {
  id: string;
  path: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  description: string;
  parameters: APIParameter[];
  responses: APIResponse[];
  isDeprecated: boolean;
}

export interface APIParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  example?: any;
}

export interface APIResponse {
  statusCode: number;
  description: string;
  schema?: any;
}

export interface APIAuthentication {
  type: 'api_key' | 'oauth2' | 'bearer' | 'basic';
  required: boolean;
  description: string;
}

export interface RateLimit {
  window: number; // seconds
  limit: number; // requests
  burst?: number;
}

export interface SDK {
  id: string;
  tenantId: string;
  name: string;
  language: string;
  version: string;
  description: string;
  downloadUrl: string;
  documentationUrl: string;
  isActive: boolean;
  createdAt: Date;
}

export interface Webhook {
  id: string;
  tenantId: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  retryPolicy: RetryPolicy;
  createdAt: Date;
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMultiplier: number;
  maxDelay: number; // seconds
}

export interface Plugin {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  version: string;
  category: string;
  price: number;
  currency: string;
  developer: string;
  downloadUrl: string;
  isActive: boolean;
  createdAt: Date;
}

export interface PartnerProgram {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  requirements: string[];
  benefits: string[];
  commission: number; // percentage
  isActive: boolean;
  createdAt: Date;
}

@Injectable()
export class PublicAPIService {
  private readonly logger = new Logger(PublicAPIService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createPublicAPI(api: Omit<PublicAPI, 'id' | 'createdAt' | 'updatedAt'>): Promise<PublicAPI> {
    const id = `API-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO public_apis (id, tenant_id, name, version, description, base_url,
                             endpoints, authentication, rate_limits, is_active, created_at, updated_at)
      VALUES (${id}, ${api.tenantId}, ${api.name}, ${api.version}, ${api.description},
              ${api.baseUrl}, ${JSON.stringify(api.endpoints)}, ${JSON.stringify(api.authentication)},
              ${JSON.stringify(api.rateLimits)}, ${api.isActive}, ${now}, ${now})
    `);

    this.logger.log(`Public API created: ${id} for tenant ${api.tenantId}`);

    return {
      id,
      ...api,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getPublicAPIs(tenantId: string): Promise<PublicAPI[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM public_apis WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      version: row.version as string,
      description: row.description as string,
      baseUrl: row.base_url as string,
      endpoints: JSON.parse(row.endpoints as string),
      authentication: JSON.parse(row.authentication as string),
      rateLimits: JSON.parse(row.rate_limits as string),
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  async createSDK(sdk: Omit<SDK, 'id' | 'createdAt'>): Promise<SDK> {
    const id = `SDK-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO sdks (id, tenant_id, name, language, version, description,
                      download_url, documentation_url, is_active, created_at)
      VALUES (${id}, ${sdk.tenantId}, ${sdk.name}, ${sdk.language}, ${sdk.version},
              ${sdk.description}, ${sdk.downloadUrl}, ${sdk.documentationUrl},
              ${sdk.isActive}, ${now})
    `);

    this.logger.log(`SDK created: ${id} for tenant ${sdk.tenantId}`);

    return {
      id,
      ...sdk,
      createdAt: now,
    };
  }

  async createWebhook(webhook: Omit<Webhook, 'id' | 'createdAt'>): Promise<Webhook> {
    const id = `WH-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO webhooks (id, tenant_id, name, url, events, secret, is_active,
                           retry_policy, created_at)
      VALUES (${id}, ${webhook.tenantId}, ${webhook.name}, ${webhook.url},
              ${JSON.stringify(webhook.events)}, ${webhook.secret}, ${webhook.isActive},
              ${JSON.stringify(webhook.retryPolicy)}, ${now})
    `);

    this.logger.log(`Webhook created: ${id} for tenant ${webhook.tenantId}`);

    return {
      id,
      ...webhook,
      createdAt: now,
    };
  }

  async createPlugin(plugin: Omit<Plugin, 'id' | 'createdAt'>): Promise<Plugin> {
    const id = `PLUGIN-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO plugins (id, tenant_id, name, description, version, category,
                          price, currency, developer, download_url, is_active, created_at)
      VALUES (${id}, ${plugin.tenantId}, ${plugin.name}, ${plugin.description},
              ${plugin.version}, ${plugin.category}, ${plugin.price}, ${plugin.currency},
              ${plugin.developer}, ${plugin.downloadUrl}, ${plugin.isActive}, ${now})
    `);

    this.logger.log(`Plugin created: ${id} for tenant ${plugin.tenantId}`);

    return {
      id,
      ...plugin,
      createdAt: now,
    };
  }

  async createPartnerProgram(program: Omit<PartnerProgram, 'id' | 'createdAt'>): Promise<PartnerProgram> {
    const id = `PP-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO partner_programs (id, tenant_id, name, description, tier, requirements,
                                   benefits, commission, is_active, created_at)
      VALUES (${id}, ${program.tenantId}, ${program.name}, ${program.description},
              ${program.tier}, ${JSON.stringify(program.requirements)}, ${JSON.stringify(program.benefits)},
              ${program.commission}, ${program.isActive}, ${now})
    `);

    this.logger.log(`Partner program created: ${id} for tenant ${program.tenantId}`);

    return {
      id,
      ...program,
      createdAt: now,
    };
  }

  async getEcosystemDashboard(tenantId: string): Promise<any> {
    const apis = await this.getPublicAPIs(tenantId);
    const activeAPIs = apis.filter(api => api.isActive);

    const sdksResult = await this.db.execute(sql`
      SELECT * FROM sdks WHERE tenant_id = ${tenantId} AND is_active = true
    `);

    const webhooksResult = await this.db.execute(sql`
      SELECT * FROM webhooks WHERE tenant_id = ${tenantId} AND is_active = true
    `);

    const pluginsResult = await this.db.execute(sql`
      SELECT * FROM plugins WHERE tenant_id = ${tenantId} AND is_active = true
    `);

    const partnerProgramsResult = await this.db.execute(sql`
      SELECT * FROM partner_programs WHERE tenant_id = ${tenantId} AND is_active = true
    `);

    return {
      summary: {
        totalAPIs: apis.length,
        activeAPIs: activeAPIs.length,
        totalSDKs: sdksResult.length,
        totalWebhooks: webhooksResult.length,
        totalPlugins: pluginsResult.length,
        totalPartnerPrograms: partnerProgramsResult.length,
      },
      apis: activeAPIs,
      sdks: sdksResult.map(row => ({
        id: row.id as string,
        name: row.name as string,
        language: row.language as string,
        version: row.version as string,
        downloadUrl: row.download_url as string,
      })),
      webhooks: webhooksResult.map(row => ({
        id: row.id as string,
        name: row.name as string,
        url: row.url as string,
        events: JSON.parse(row.events as string),
      })),
      plugins: pluginsResult.map(row => ({
        id: row.id as string,
        name: row.name as string,
        category: row.category as string,
        price: parseFloat(row.price as string),
        developer: row.developer as string,
      })),
      partnerPrograms: partnerProgramsResult.map(row => ({
        id: row.id as string,
        name: row.name as string,
        tier: row.tier as string,
        commission: parseFloat(row.commission as string),
      })),
    };
  }
}
