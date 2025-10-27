import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/drizzle-orm.provider';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { opportunities, customers, contacts } from '../../../core/database/schema';
import { eq, and, desc, like, gte, lte } from 'drizzle-orm';

export interface Opportunity {
  id: string;
  company: string;
  value: number;
  stage: string;
  probability: number;
  contact: string;
  expectedCloseDate?: Date;
  source?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  email: string;
  revenue: number;
  status: 'active' | 'inactive' | 'vip' | 'prospect';
  orders?: number;
  lastOrderDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class MobileCrmService {
  private readonly logger = new Logger(MobileCrmService.name);

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase,
  ) {}

  async getOpportunities(
    tenantId: string,
    userId: string,
    filters?: {
      stage?: string;
      minValue?: number;
      maxValue?: number;
      probability?: number;
      dateFrom?: Date;
      dateTo?: Date;
    },
  ) {
    try {
      let query = this.db
        .select()
        .from(opportunities)
        .where(eq(opportunities.tenantId, tenantId))
        .orderBy(desc(opportunities.createdAt));

      if (filters?.stage) {
        query = query.where(eq(opportunities.stage, filters.stage));
      }

      if (filters?.minValue) {
        query = query.where(gte(opportunities.value, filters.minValue));
      }

      if (filters?.maxValue) {
        query = query.where(lte(opportunities.value, filters.maxValue));
      }

      if (filters?.probability) {
        query = query.where(gte(opportunities.probability, filters.probability));
      }

      if (filters?.dateFrom) {
        query = query.where(gte(opportunities.expectedCloseDate, filters.dateFrom));
      }

      if (filters?.dateTo) {
        query = query.where(lte(opportunities.expectedCloseDate, filters.dateTo));
      }

      const opportunitiesData = await query;

      return {
        success: true,
        data: opportunitiesData,
        count: opportunitiesData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get opportunities: ${error.message}`);
      throw new Error('Failed to retrieve opportunities');
    }
  }

  async getOpportunityById(opportunityId: string, tenantId: string) {
    try {
      const opportunity = await this.db
        .select()
        .from(opportunities)
        .where(
          and(
            eq(opportunities.id, opportunityId),
            eq(opportunities.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!opportunity.length) {
        throw new NotFoundException('Opportunity not found');
      }

      return {
        success: true,
        data: opportunity[0],
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get opportunity: ${error.message}`);
      throw new Error('Failed to retrieve opportunity');
    }
  }

  async updateOpportunity(
    opportunityId: string,
    data: Partial<Opportunity>,
    tenantId: string,
  ) {
    try {
      const existingOpportunity = await this.getOpportunityById(opportunityId, tenantId);

      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await this.db
        .update(opportunities)
        .set(updateData)
        .where(
          and(
            eq(opportunities.id, opportunityId),
            eq(opportunities.tenantId, tenantId),
          ),
        );

      this.logger.log(`Opportunity updated: ${opportunityId}`);

      return {
        success: true,
        message: 'Opportunity updated successfully',
        data: { ...existingOpportunity.data, ...updateData },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update opportunity: ${error.message}`);
      throw new Error('Failed to update opportunity');
    }
  }

  async getCustomers(
    tenantId: string,
    filters?: {
      status?: string;
      search?: string;
      minRevenue?: number;
      maxRevenue?: number;
    },
  ) {
    try {
      let query = this.db
        .select()
        .from(customers)
        .where(eq(customers.tenantId, tenantId))
        .orderBy(desc(customers.createdAt));

      if (filters?.status) {
        query = query.where(eq(customers.status, filters.status));
      }

      if (filters?.search) {
        query = query.where(
          like(customers.name, `%${filters.search}%`),
        );
      }

      if (filters?.minRevenue) {
        query = query.where(gte(customers.revenue, filters.minRevenue));
      }

      if (filters?.maxRevenue) {
        query = query.where(lte(customers.revenue, filters.maxRevenue));
      }

      const customersData = await query;

      return {
        success: true,
        data: customersData,
        count: customersData.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get customers: ${error.message}`);
      throw new Error('Failed to retrieve customers');
    }
  }

  async getCustomerById(customerId: string, tenantId: string) {
    try {
      const customer = await this.db
        .select()
        .from(customers)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.tenantId, tenantId),
          ),
        )
        .limit(1);

      if (!customer.length) {
        throw new NotFoundException('Customer not found');
      }

      // Get additional customer details
      const customerDetails = customer[0];

      // Get orders count and last order date (mock for now)
      const ordersCount = Math.floor(Math.random() * 100);
      const lastOrderDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000);

      return {
        success: true,
        data: {
          ...customerDetails,
          orders: ordersCount,
          lastOrderDate: lastOrderDate.toISOString().split('T')[0],
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get customer: ${error.message}`);
      throw new Error('Failed to retrieve customer');
    }
  }

  async updateCustomer(
    customerId: string,
    data: Partial<Customer>,
    tenantId: string,
  ) {
    try {
      const existingCustomer = await this.getCustomerById(customerId, tenantId);

      const updateData = {
        ...data,
        updatedAt: new Date(),
      };

      await this.db
        .update(customers)
        .set(updateData)
        .where(
          and(
            eq(customers.id, customerId),
            eq(customers.tenantId, tenantId),
          ),
        );

      this.logger.log(`Customer updated: ${customerId}`);

      return {
        success: true,
        message: 'Customer updated successfully',
        data: { ...existingCustomer.data, ...updateData },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to update customer: ${error.message}`);
      throw new Error('Failed to update customer');
    }
  }

  async getCustomerContacts(customerId: string, tenantId: string) {
    try {
      const customerContacts = await this.db
        .select()
        .from(contacts)
        .where(
          and(
            eq(contacts.customerId, customerId),
            eq(contacts.tenantId, tenantId),
          ),
        )
        .orderBy(desc(contacts.createdAt));

      return {
        success: true,
        data: customerContacts,
        count: customerContacts.length,
      };
    } catch (error) {
      this.logger.error(`Failed to get customer contacts: ${error.message}`);
      throw new Error('Failed to retrieve customer contacts');
    }
  }

  async getSalesPipeline(tenantId: string) {
    try {
      const pipeline = await this.db
        .select({
          stage: opportunities.stage,
          count: opportunities.id,
          totalValue: opportunities.value,
        })
        .from(opportunities)
        .where(eq(opportunities.tenantId, tenantId))
        .groupBy(opportunities.stage);

      return {
        success: true,
        data: pipeline,
      };
    } catch (error) {
      this.logger.error(`Failed to get sales pipeline: ${error.message}`);
      throw new Error('Failed to retrieve sales pipeline');
    }
  }

  async getSalesMetrics(tenantId: string, period: 'week' | 'month' | 'quarter' | 'year' = 'month') {
    try {
      const now = new Date();
      let startDate: Date;

      switch (period) {
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case 'month':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case 'quarter':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case 'year':
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const opportunities = await this.db
        .select()
        .from(opportunities)
        .where(
          and(
            eq(opportunities.tenantId, tenantId),
            gte(opportunities.createdAt, startDate),
          ),
        );

      const totalValue = opportunities.reduce((sum, opp) => sum + opp.value, 0);
      const wonOpportunities = opportunities.filter(opp => opp.stage === 'Won');
      const wonValue = wonOpportunities.reduce((sum, opp) => sum + opp.value, 0);
      const winRate = opportunities.length > 0 ? (wonOpportunities.length / opportunities.length) * 100 : 0;

      return {
        success: true,
        data: {
          totalOpportunities: opportunities.length,
          totalValue,
          wonOpportunities: wonOpportunities.length,
          wonValue,
          winRate: Math.round(winRate * 100) / 100,
          averageDealSize: opportunities.length > 0 ? totalValue / opportunities.length : 0,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get sales metrics: ${error.message}`);
      throw new Error('Failed to retrieve sales metrics');
    }
  }
}
