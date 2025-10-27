import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface EDIConnection {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  partnerId: string;
  standard: 'X12' | 'EDIFACT' | 'TRADACOMS' | 'ODETTE';
  version: string;
  connectionType: 'ftp' | 'sftp' | 'as2' | 'api' | 'email';
  configuration: EDIConfiguration;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface EDIConfiguration {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: string;
  compression?: string;
  acknowledgment?: boolean;
  retryAttempts?: number;
  timeout?: number;
  schedule?: string;
}

export interface EDIDocument {
  id: string;
  connectionId: string;
  documentType: string;
  standard: string;
  version: string;
  direction: 'inbound' | 'outbound';
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'acknowledged';
  content: string;
  metadata: Record<string, any>;
  processedAt?: Date;
  acknowledgedAt?: Date;
  errorMessage?: string;
  createdAt: Date;
}

export interface EDIMapping {
  id: string;
  connectionId: string;
  documentType: string;
  sourceField: string;
  targetField: string;
  transformation?: string;
  isRequired: boolean;
  defaultValue?: string;
  createdAt: Date;
}

export interface ShippingAPIConnection {
  id: string;
  tenantId: string;
  name: string;
  provider: 'ups' | 'fedex' | 'dhl' | 'turkish_cargo' | 'aras' | 'mng' | 'yurtici';
  apiKey: string;
  apiSecret?: string;
  baseUrl: string;
  environment: 'sandbox' | 'production';
  features: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ERPConnection {
  id: string;
  tenantId: string;
  name: string;
  system: 'sap' | 'oracle' | 'microsoft_dynamics' | 'netsuite' | 'odoo' | 'custom';
  connectionType: 'api' | 'database' | 'file' | 'webhook';
  configuration: ERPConfiguration;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ERPConfiguration {
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  apiEndpoint?: string;
  apiKey?: string;
  schema?: string;
  table?: string;
  webhookUrl?: string;
  authentication?: string;
}

@Injectable()
export class EDIService {
  private readonly logger = new Logger(EDIService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createEDIConnection(connection: Omit<EDIConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<EDIConnection> {
    const id = `EDI-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO edi_connections (id, tenant_id, name, description, partner_id, standard, version,
                                  connection_type, configuration, is_active, created_at, updated_at)
      VALUES (${id}, ${connection.tenantId}, ${connection.name}, ${connection.description},
              ${connection.partnerId}, ${connection.standard}, ${connection.version},
              ${connection.connectionType}, ${JSON.stringify(connection.configuration)},
              ${connection.isActive}, ${now}, ${now})
    `);

    this.logger.log(`EDI connection created: ${id} for tenant ${connection.tenantId}`);

    return {
      id,
      ...connection,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getEDIConnections(tenantId: string): Promise<EDIConnection[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM edi_connections WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string,
      partnerId: row.partner_id as string,
      standard: row.standard as EDIConnection['standard'],
      version: row.version as string,
      connectionType: row.connection_type as EDIConnection['connectionType'],
      configuration: JSON.parse(row.configuration as string),
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  async createEDIDocument(document: Omit<EDIDocument, 'id' | 'createdAt'>): Promise<EDIDocument> {
    const id = `EDD-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO edi_documents (id, connection_id, document_type, standard, version, direction,
                               status, content, metadata, processed_at, acknowledged_at,
                               error_message, created_at)
      VALUES (${id}, ${document.connectionId}, ${document.documentType}, ${document.standard},
              ${document.version}, ${document.direction}, ${document.status}, ${document.content},
              ${JSON.stringify(document.metadata)}, ${document.processedAt || null},
              ${document.acknowledgedAt || null}, ${document.errorMessage || null}, ${now})
    `);

    this.logger.log(`EDI document created: ${id} for connection ${document.connectionId}`);

    return {
      id,
      ...document,
      createdAt: now,
    };
  }

  async processEDIDocument(documentId: string): Promise<void> {
    await this.db.execute(sql`
      UPDATE edi_documents SET status = 'processing', processed_at = NOW() WHERE id = ${documentId}
    `);

    try {
      // Process EDI document logic here
      await this.db.execute(sql`
        UPDATE edi_documents SET status = 'completed' WHERE id = ${documentId}
      `);

      this.logger.log(`EDI document processed successfully: ${documentId}`);
    } catch (error) {
      await this.db.execute(sql`
        UPDATE edi_documents SET status = 'failed', error_message = ${error.message} WHERE id = ${documentId}
      `);

      this.logger.error(`EDI document processing failed: ${documentId}`, error);
    }
  }

  async createEDIMapping(mapping: Omit<EDIMapping, 'id' | 'createdAt'>): Promise<EDIMapping> {
    const id = `EDM-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO edi_mappings (id, connection_id, document_type, source_field, target_field,
                              transformation, is_required, default_value, created_at)
      VALUES (${id}, ${mapping.connectionId}, ${mapping.documentType}, ${mapping.sourceField},
              ${mapping.targetField}, ${mapping.transformation || null}, ${mapping.isRequired},
              ${mapping.defaultValue || null}, ${now})
    `);

    this.logger.log(`EDI mapping created: ${id} for connection ${mapping.connectionId}`);

    return {
      id,
      ...mapping,
      createdAt: now,
    };
  }

  async createShippingAPIConnection(connection: Omit<ShippingAPIConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShippingAPIConnection> {
    const id = `SAC-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO shipping_api_connections (id, tenant_id, name, provider, api_key, api_secret,
                                          base_url, environment, features, is_active, created_at, updated_at)
      VALUES (${id}, ${connection.tenantId}, ${connection.name}, ${connection.provider},
              ${connection.apiKey}, ${connection.apiSecret || null}, ${connection.baseUrl},
              ${connection.environment}, ${JSON.stringify(connection.features)}, ${connection.isActive},
              ${now}, ${now})
    `);

    this.logger.log(`Shipping API connection created: ${id} for tenant ${connection.tenantId}`);

    return {
      id,
      ...connection,
      createdAt: now,
      updatedAt: now,
    };
  }

  async createERPConnection(connection: Omit<ERPConnection, 'id' | 'createdAt' | 'updatedAt'>): Promise<ERPConnection> {
    const id = `ERC-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO erp_connections (id, tenant_id, name, system, connection_type, configuration,
                                  is_active, created_at, updated_at)
      VALUES (${id}, ${connection.tenantId}, ${connection.name}, ${connection.system},
              ${connection.connectionType}, ${JSON.stringify(connection.configuration)},
              ${connection.isActive}, ${now}, ${now})
    `);

    this.logger.log(`ERP connection created: ${id} for tenant ${connection.tenantId}`);

    return {
      id,
      ...connection,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getIntegrationDashboard(tenantId: string): Promise<any> {
    const ediConnections = await this.getEDIConnections(tenantId);
    const activeEDIConnections = ediConnections.filter(c => c.isActive);

    const shippingConnectionsResult = await this.db.execute(sql`
      SELECT * FROM shipping_api_connections WHERE tenant_id = ${tenantId} AND is_active = true
    `);

    const erpConnectionsResult = await this.db.execute(sql`
      SELECT * FROM erp_connections WHERE tenant_id = ${tenantId} AND is_active = true
    `);

    const documentStatsResult = await this.db.execute(sql`
      SELECT 
        COUNT(*) as total_documents,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_documents,
        COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_documents,
        COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as documents_last_24h
      FROM edi_documents ed
      JOIN edi_connections ec ON ed.connection_id = ec.id
      WHERE ec.tenant_id = ${tenantId}
    `);

    const stats = documentStatsResult[0];

    return {
      summary: {
        totalEDIConnections: ediConnections.length,
        activeEDIConnections: activeEDIConnections.length,
        shippingConnections: shippingConnectionsResult.length,
        erpConnections: erpConnectionsResult.length,
        totalDocuments: parseInt(stats?.total_documents as string) || 0,
        completedDocuments: parseInt(stats?.completed_documents as string) || 0,
        failedDocuments: parseInt(stats?.failed_documents as string) || 0,
        documentsLast24h: parseInt(stats?.documents_last_24h as string) || 0,
      },
      connections: {
        edi: activeEDIConnections,
        shipping: shippingConnectionsResult.map(row => ({
          id: row.id as string,
          name: row.name as string,
          provider: row.provider as string,
          environment: row.environment as string,
        })),
        erp: erpConnectionsResult.map(row => ({
          id: row.id as string,
          name: row.name as string,
          system: row.system as string,
          connectionType: row.connection_type as string,
        })),
      },
      metrics: {
        successRate: this.calculateSuccessRate(
          parseInt(stats?.completed_documents as string) || 0,
          parseInt(stats?.total_documents as string) || 0
        ),
        averageProcessingTime: await this.getAverageProcessingTime(tenantId),
      },
    };
  }

  private calculateSuccessRate(completed: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((completed / total) * 100);
  }

  private async getAverageProcessingTime(tenantId: string): Promise<number> {
    const result = await this.db.execute(sql`
      SELECT AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time
      FROM edi_documents ed
      JOIN edi_connections ec ON ed.connection_id = ec.id
      WHERE ec.tenant_id = ${tenantId}
      AND ed.status = 'completed'
      AND ed.processed_at IS NOT NULL
    `);

    return parseFloat(result[0]?.avg_processing_time as string) || 0;
  }
}
