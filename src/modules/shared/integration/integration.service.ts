import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface Integration {
  id: string;
  name: string;
  description: string;
  status: 'connected' | 'disconnected' | 'error';
  icon: string;
  category: string;
  lastSync: string;
  usage: string;
  cost: string;
  config?: any;
  tenantId: string;
}

@Injectable()
export class IntegrationService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async getIntegrations(tenantId: string): Promise<Integration[]> {
    try {
      // Import integration schema
      const { integrations } = await import('../../../database/schema/shared/integration.schema');
      const { eq } = await import('drizzle-orm');

      const results = await this.db
        .select()
        .from(integrations)
        .where(eq(integrations.tenantId, tenantId));

      return results.map(integration => ({
        id: integration.id,
        name: integration.name,
        description: integration.description,
        status: integration.status as 'connected' | 'disconnected' | 'error',
        icon: integration.icon,
        category: integration.category,
        lastSync: integration.lastSync?.toISOString() || 'Never',
        usage: `${integration.usage || 0}%`,
        cost: `$${integration.cost || 0}/month`,
        config: integration.config,
        tenantId: integration.tenantId
      }));
    } catch (error) {
      console.error('Error fetching integrations:', error);
      return [];
    }
  }

  async connectIntegration(integrationId: string, tenantId: string): Promise<boolean> {
    try {
      // Import integration schema
      const { integrations } = await import('../../../database/schema/shared/integration.schema');
      const { eq } = await import('drizzle-orm');

      await this.db
        .update(integrations)
        .set({ 
          status: 'connected',
          lastSync: new Date(),
          updatedAt: new Date()
        })
        .where(eq(integrations.id, integrationId));

      return true;
    } catch (error) {
      console.error('Error connecting integration:', error);
      return false;
    }
  }

  async disconnectIntegration(integrationId: string, tenantId: string): Promise<boolean> {
    try {
      // Import integration schema
      const { integrations } = await import('../../../database/schema/shared/integration.schema');
      const { eq } = await import('drizzle-orm');

      await this.db
        .update(integrations)
        .set({ 
          status: 'disconnected',
          updatedAt: new Date()
        })
        .where(eq(integrations.id, integrationId));

      return true;
    } catch (error) {
      console.error('Error disconnecting integration:', error);
      return false;
    }
  }

  async syncIntegration(integrationId: string, tenantId: string): Promise<boolean> {
    try {
      // Import integration schema
      const { integrations } = await import('../../../database/schema/shared/integration.schema');
      const { eq } = await import('drizzle-orm');

      // Update last sync time
      await this.db
        .update(integrations)
        .set({ 
          lastSync: new Date(),
          updatedAt: new Date()
        })
        .where(eq(integrations.id, integrationId));

      // Here you would implement actual sync logic based on integration type
      // For now, we'll just simulate a successful sync
      return true;
    } catch (error) {
      console.error('Error syncing integration:', error);
      return false;
    }
  }

  async createIntegration(integrationData: Omit<Integration, 'id' | 'lastSync' | 'usage' | 'cost'>): Promise<Integration> {
    try {
      // Import integration schema
      const { integrations } = await import('../../../database/schema/shared/integration.schema');

      const newIntegration = await this.db
        .insert(integrations)
        .values({
          name: integrationData.name,
          description: integrationData.description,
          status: integrationData.status,
          icon: integrationData.icon,
          category: integrationData.category,
          config: integrationData.config,
          tenantId: integrationData.tenantId,
          usage: 0,
          cost: 0,
          lastSync: null
        })
        .returning();

      return {
        id: newIntegration[0].id,
        name: newIntegration[0].name,
        description: newIntegration[0].description,
        status: newIntegration[0].status as 'connected' | 'disconnected' | 'error',
        icon: newIntegration[0].icon,
        category: newIntegration[0].category,
        lastSync: 'Never',
        usage: '0%',
        cost: '$0/month',
        config: newIntegration[0].config,
        tenantId: newIntegration[0].tenantId
      };
    } catch (error) {
      console.error('Error creating integration:', error);
      throw error;
    }
  }

  async updateIntegration(integrationId: string, updates: Partial<Integration>, tenantId: string): Promise<boolean> {
    try {
      // Import integration schema
      const { integrations } = await import('../../../database/schema/shared/integration.schema');
      const { eq } = await import('drizzle-orm');

      const updateData: any = {
        updatedAt: new Date()
      };

      if (updates.name) updateData.name = updates.name;
      if (updates.description) updateData.description = updates.description;
      if (updates.status) updateData.status = updates.status;
      if (updates.icon) updateData.icon = updates.icon;
      if (updates.category) updateData.category = updates.category;
      if (updates.config) updateData.config = updates.config;

      await this.db
        .update(integrations)
        .set(updateData)
        .where(eq(integrations.id, integrationId));

      return true;
    } catch (error) {
      console.error('Error updating integration:', error);
      return false;
    }
  }

  async deleteIntegration(integrationId: string, tenantId: string): Promise<boolean> {
    try {
      // Import integration schema
      const { integrations } = await import('../../../database/schema/shared/integration.schema');
      const { eq } = await import('drizzle-orm');

      await this.db
        .delete(integrations)
        .where(eq(integrations.id, integrationId));

      return true;
    } catch (error) {
      console.error('Error deleting integration:', error);
      return false;
    }
  }
}