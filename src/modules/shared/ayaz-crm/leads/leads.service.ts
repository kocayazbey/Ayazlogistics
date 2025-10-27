import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, like, or, gte, lte } from 'drizzle-orm';
import { leads, customers } from '../../../../database/schema/shared/crm.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { CacheService } from '../../../../common/services/cache.service';

@Injectable()
export class LeadsService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly cacheService: CacheService,
  ) {}

  async createLead(data: any, tenantId: string, userId: string) {
    const leadNumber = `LEAD-${Date.now()}`;

    const [lead] = await this.db
      .insert(leads)
      .values({
        tenantId,
        leadNumber,
        contactName: data.contactName,
        companyName: data.companyName,
        email: data.email,
        phone: data.phone,
        source: data.source,
        status: 'new',
        estimatedValue: data.estimatedValue,
        assignedTo: data.assignedTo || userId,
        notes: data.notes,
        metadata: data.metadata,
        createdBy: userId,
      })
      .returning();

    const leadScore = await this.calculateLeadScore(lead);
    
    await this.db
      .update(leads)
      .set({ leadScore })
      .where(eq(leads.id, lead.id));

    await this.eventBus.emit('lead.created', { leadId: lead.id, tenantId, leadScore });
    await this.cacheService.del(this.cacheService.generateKey('leads', tenantId));

    return { ...lead, leadScore };
  }

  async getLeads(tenantId: string, filters?: { status?: string; search?: string; assignedTo?: string; minScore?: number }) {
    const cacheKey = this.cacheService.generateKey('leads', tenantId, JSON.stringify(filters || {}));
    
    return this.cacheService.wrap(cacheKey, async () => {
      let query = this.db.select().from(leads).where(eq(leads.tenantId, tenantId));

      if (filters?.status) {
        query = query.where(and(eq(leads.tenantId, tenantId), eq(leads.status, filters.status)));
      }

      if (filters?.search) {
        query = query.where(
          and(
            eq(leads.tenantId, tenantId),
            or(
              like(leads.companyName, `%${filters.search}%`),
              like(leads.contactName, `%${filters.search}%`),
              like(leads.email, `%${filters.search}%`),
            ),
          ),
        );
      }

      if (filters?.assignedTo) {
        query = query.where(and(eq(leads.tenantId, tenantId), eq(leads.assignedTo, filters.assignedTo)));
      }

      if (filters?.minScore) {
        query = query.where(and(eq(leads.tenantId, tenantId), gte(leads.leadScore, filters.minScore)));
      }

      return await query;
    }, 300);
  }

  async getLeadById(leadId: string, tenantId: string) {
    const [lead] = await this.db
      .select()
      .from(leads)
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
      .limit(1);

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async updateLead(leadId: string, data: any, tenantId: string) {
    const [updated] = await this.db
      .update(leads)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
      .returning();

    if (!updated) {
      throw new NotFoundException('Lead not found');
    }

    await this.eventBus.emit('lead.updated', { leadId, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('leads', tenantId));

    return updated;
  }

  async convertToCustomer(leadId: string, tenantId: string, userId: string) {
    const lead = await this.getLeadById(leadId, tenantId);

    const customerNumber = `CUST-${Date.now()}`;

    const [customer] = await this.db
      .insert(customers)
      .values({
        tenantId,
        customerNumber,
        companyName: lead.companyName || 'N/A',
        contactName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        customerType: 'prospect',
        isActive: true,
        createdBy: userId,
      })
      .returning();

    await this.db
      .update(leads)
      .set({
        status: 'converted',
        convertedAt: new Date(),
        convertedToCustomerId: customer.id,
        updatedAt: new Date(),
      })
      .where(eq(leads.id, leadId));

    await this.eventBus.emit('lead.converted', { leadId, customerId: customer.id, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('leads', tenantId));
    await this.cacheService.del(this.cacheService.generateKey('customers', tenantId));

    return customer;
  }

  async calculateLeadScore(lead: any): Promise<number> {
    let score = 0;

    if (lead.email) score += 10;
    if (lead.phone) score += 10;
    if (lead.companyName) score += 15;
    if (lead.estimatedValue) {
      const value = parseFloat(lead.estimatedValue);
      if (value > 100000) score += 30;
      else if (value > 50000) score += 20;
      else if (value > 10000) score += 10;
    }
    if (lead.source === 'referral') score += 20;
    else if (lead.source === 'website') score += 15;
    else if (lead.source === 'cold_call') score += 5;

    return Math.min(score, 100);
  }

  async getLeadsByScore(tenantId: string, minScore: number = 70) {
    return await this.db
      .select()
      .from(leads)
      .where(and(eq(leads.tenantId, tenantId), gte(leads.leadScore, minScore)));
  }

  async assignLead(leadId: string, userId: string, tenantId: string) {
    const [updated] = await this.db
      .update(leads)
      .set({ assignedTo: userId, updatedAt: new Date() })
      .where(and(eq(leads.id, leadId), eq(leads.tenantId, tenantId)))
      .returning();

    await this.eventBus.emit('lead.assigned', { leadId, userId, tenantId });
    await this.cacheService.del(this.cacheService.generateKey('leads', tenantId));

    return updated;
  }
}
