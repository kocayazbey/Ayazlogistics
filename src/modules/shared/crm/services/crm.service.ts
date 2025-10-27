import { Injectable, NotFoundException } from '@nestjs/common';
import { eq, and, like, desc, or } from 'drizzle-orm';
import { DatabaseService } from '../../../../core/database/database.service';
import { customers, leads, dealers, activities } from '../../../../database/schema/shared/crm.schema';

@Injectable()
export class CRMService {
  constructor(private readonly db: DatabaseService) {}

  async getCustomers(tenantId: string, filters?: {
    customerType?: string;
    search?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [eq(customers.tenantId, tenantId)];
    
    if (filters?.customerType) {
      conditions.push(eq(customers.customerType, filters.customerType));
    }
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(customers.isActive, filters.isActive));
    }
    
    if (filters?.search) {
      conditions.push(
        or(
          like(customers.companyName, `%${filters.search}%`),
          like(customers.contactName, `%${filters.search}%`),
          like(customers.email, `%${filters.search}%`)
        )
      );
    }

    const customerList = await this.db.client
      .select()
      .from(customers)
      .where(and(...conditions))
      .orderBy(desc(customers.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    const total = await this.db.client
      .select({ count: customers.id })
      .from(customers)
      .where(and(...conditions));

    return {
      data: customerList,
      total: total.length,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  async getCustomerById(customerId: string, tenantId: string) {
    const customer = await this.db.client
      .select()
      .from(customers)
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!customer.length) {
      throw new NotFoundException('Customer not found');
    }

    const customerActivities = await this.db.client
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.relatedTo, 'customer'),
          eq(activities.relatedId, customerId),
          eq(activities.tenantId, tenantId)
        )
      )
      .orderBy(desc(activities.createdAt))
      .limit(10);

    return {
      ...customer[0],
      recentActivities: customerActivities,
    };
  }

  async createCustomer(data: any, tenantId: string, userId: string) {
    const customerNumber = `CUST-${Date.now()}`;
    
    const [newCustomer] = await this.db.client
      .insert(customers)
      .values({
        ...data,
        customerNumber,
        tenantId,
        createdBy: userId,
      })
      .returning();

    return newCustomer;
  }

  async updateCustomer(customerId: string, data: any, tenantId: string) {
    const [updated] = await this.db.client
      .update(customers)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(customers.id, customerId),
          eq(customers.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundException('Customer not found');
    }

    return updated;
  }

  async getLeads(tenantId: string, filters?: {
    status?: string;
    assignedTo?: string;
    source?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [eq(leads.tenantId, tenantId)];
    
    if (filters?.status) {
      conditions.push(eq(leads.status, filters.status));
    }
    
    if (filters?.assignedTo) {
      conditions.push(eq(leads.assignedTo, filters.assignedTo));
    }
    
    if (filters?.source) {
      conditions.push(eq(leads.source, filters.source));
    }

    const leadList = await this.db.client
      .select()
      .from(leads)
      .where(and(...conditions))
      .orderBy(desc(leads.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    const total = await this.db.client
      .select({ count: leads.id })
      .from(leads)
      .where(and(...conditions));

    return {
      data: leadList,
      total: total.length,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  async getLeadById(leadId: string, tenantId: string) {
    const lead = await this.db.client
      .select()
      .from(leads)
      .where(
        and(
          eq(leads.id, leadId),
          eq(leads.tenantId, tenantId)
        )
      )
      .limit(1);

    if (!lead.length) {
      throw new NotFoundException('Lead not found');
    }

    const leadActivities = await this.db.client
      .select()
      .from(activities)
      .where(
        and(
          eq(activities.relatedTo, 'lead'),
          eq(activities.relatedId, leadId),
          eq(activities.tenantId, tenantId)
        )
      )
      .orderBy(desc(activities.createdAt))
      .limit(10);

    return {
      ...lead[0],
      recentActivities: leadActivities,
    };
  }

  async createLead(data: any, tenantId: string, userId: string) {
    const leadNumber = `LEAD-${Date.now()}`;
    
    const [newLead] = await this.db.client
      .insert(leads)
      .values({
        ...data,
        leadNumber,
        tenantId,
        createdBy: userId,
      })
      .returning();

    return newLead;
  }

  async updateLead(leadId: string, data: any, tenantId: string) {
    const [updated] = await this.db.client
      .update(leads)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(leads.id, leadId),
          eq(leads.tenantId, tenantId)
        )
      )
      .returning();

    if (!updated) {
      throw new NotFoundException('Lead not found');
    }

    return updated;
  }

  async convertLeadToCustomer(leadId: string, tenantId: string, userId: string) {
    const lead = await this.getLeadById(leadId, tenantId);
    
    const newCustomer = await this.createCustomer({
      companyName: lead.companyName,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      customerType: 'regular',
      isActive: true,
    }, tenantId, userId);

    await this.updateLead(leadId, {
      status: 'converted',
      convertedAt: new Date(),
      convertedToCustomerId: newCustomer.id,
    }, tenantId);

    return {
      customer: newCustomer,
      lead: await this.getLeadById(leadId, tenantId),
    };
  }

  async getDealers(tenantId: string, filters?: {
    region?: string;
    isActive?: boolean;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [eq(dealers.tenantId, tenantId)];
    
    if (filters?.region) {
      conditions.push(eq(dealers.region, filters.region));
    }
    
    if (filters?.isActive !== undefined) {
      conditions.push(eq(dealers.isActive, filters.isActive));
    }

    const dealerList = await this.db.client
      .select()
      .from(dealers)
      .where(and(...conditions))
      .orderBy(desc(dealers.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    const total = await this.db.client
      .select({ count: dealers.id })
      .from(dealers)
      .where(and(...conditions));

    return {
      data: dealerList,
      total: total.length,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  async createDealer(data: any, tenantId: string, userId: string) {
    const dealerNumber = `DEALER-${Date.now()}`;
    
    const [newDealer] = await this.db.client
      .insert(dealers)
      .values({
        ...data,
        dealerNumber,
        tenantId,
      })
      .returning();

    return newDealer;
  }

  async getActivities(tenantId: string, filters?: {
    relatedTo?: string;
    relatedId?: string;
    activityType?: string;
    status?: string;
    assignedTo?: string;
    limit?: number;
    offset?: number;
  }) {
    const conditions = [eq(activities.tenantId, tenantId)];
    
    if (filters?.relatedTo) {
      conditions.push(eq(activities.relatedTo, filters.relatedTo));
    }
    
    if (filters?.relatedId) {
      conditions.push(eq(activities.relatedId, filters.relatedId));
    }
    
    if (filters?.activityType) {
      conditions.push(eq(activities.activityType, filters.activityType));
    }
    
    if (filters?.status) {
      conditions.push(eq(activities.status, filters.status));
    }
    
    if (filters?.assignedTo) {
      conditions.push(eq(activities.assignedTo, filters.assignedTo));
    }

    const activityList = await this.db.client
      .select()
      .from(activities)
      .where(and(...conditions))
      .orderBy(desc(activities.createdAt))
      .limit(filters?.limit || 50)
      .offset(filters?.offset || 0);

    const total = await this.db.client
      .select({ count: activities.id })
      .from(activities)
      .where(and(...conditions));

    return {
      data: activityList,
      total: total.length,
      limit: filters?.limit || 50,
      offset: filters?.offset || 0,
    };
  }

  async createActivity(data: any, tenantId: string, userId: string) {
    const [newActivity] = await this.db.client
      .insert(activities)
      .values({
        ...data,
        tenantId,
        createdBy: userId,
      })
      .returning();

    return newActivity;
  }

  async getCustomerStats(tenantId: string) {
    const allCustomers = await this.db.client
      .select()
      .from(customers)
      .where(eq(customers.tenantId, tenantId));

    return {
      total: allCustomers.length,
      active: allCustomers.filter(c => c.isActive).length,
      inactive: allCustomers.filter(c => !c.isActive).length,
      byType: {
        regular: allCustomers.filter(c => c.customerType === 'regular').length,
        vip: allCustomers.filter(c => c.customerType === 'vip').length,
        enterprise: allCustomers.filter(c => c.customerType === 'enterprise').length,
      },
    };
  }

  async getLeadStats(tenantId: string) {
    const allLeads = await this.db.client
      .select()
      .from(leads)
      .where(eq(leads.tenantId, tenantId));

    return {
      total: allLeads.length,
      new: allLeads.filter(l => l.status === 'new').length,
      contacted: allLeads.filter(l => l.status === 'contacted').length,
      qualified: allLeads.filter(l => l.status === 'qualified').length,
      converted: allLeads.filter(l => l.status === 'converted').length,
      lost: allLeads.filter(l => l.status === 'lost').length,
      averageLeadScore: allLeads.reduce((sum, l) => sum + (l.leadScore || 0), 0) / allLeads.length,
      totalEstimatedValue: allLeads.reduce((sum, l) => sum + parseFloat(l.estimatedValue || '0'), 0),
    };
  }
}

