import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from '../../../database/schema/shared/crm.schema';

@Injectable()
export class LeadService {
  constructor(
    @InjectRepository(Lead)
    private leadRepository: Repository<Lead>,
  ) {}

  async findAll(tenantId: string, filters?: any): Promise<Lead[]> {
    const query = this.leadRepository.createQueryBuilder('lead')
      .where('lead.tenantId = :tenantId', { tenantId });

    if (filters?.status) {
      query.andWhere('lead.status = :status', { status: filters.status });
    }

    if (filters?.source) {
      query.andWhere('lead.source = :source', { source: filters.source });
    }

    if (filters?.assignedTo) {
      query.andWhere('lead.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    return query.getMany();
  }

  async findOne(id: string, tenantId: string): Promise<Lead> {
    return this.leadRepository.findOne({
      where: { id, tenantId },
      relations: ['assignedTo', 'activities'],
    });
  }

  async create(leadData: Partial<Lead>, tenantId: string): Promise<Lead> {
    const lead = this.leadRepository.create({
      ...leadData,
      tenantId,
      leadNumber: this.generateLeadNumber(),
      status: 'new',
    });
    return this.leadRepository.save(lead);
  }

  async update(id: string, leadData: Partial<Lead>, tenantId: string): Promise<Lead> {
    await this.leadRepository.update({ id, tenantId }, leadData);
    return this.findOne(id, tenantId);
  }

  async updateStatus(id: string, status: string, tenantId: string): Promise<Lead> {
    const lead = await this.findOne(id, tenantId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    lead.status = status;
    lead.statusUpdatedAt = new Date();
    return this.leadRepository.save(lead);
  }

  async assignLead(id: string, assignedTo: string, tenantId: string): Promise<Lead> {
    const lead = await this.findOne(id, tenantId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    lead.assignedTo = assignedTo;
    lead.assignedAt = new Date();
    return this.leadRepository.save(lead);
  }

  async convertToCustomer(leadId: string, tenantId: string): Promise<any> {
    const lead = await this.findOne(leadId, tenantId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    // Convert lead to customer
    const customerData = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      source: lead.source,
      notes: lead.notes,
    };

    // Update lead status
    lead.status = 'converted';
    lead.convertedAt = new Date();
    await this.leadRepository.save(lead);

    return customerData;
  }

  async getLeadMetrics(tenantId: string): Promise<any> {
    const leads = await this.findAll(tenantId);
    
    const total = leads.length;
    const newLeads = leads.filter(l => l.status === 'new').length;
    const qualified = leads.filter(l => l.status === 'qualified').length;
    const converted = leads.filter(l => l.status === 'converted').length;
    const lost = leads.filter(l => l.status === 'lost').length;

    return {
      total,
      newLeads,
      qualified,
      converted,
      lost,
      conversionRate: total > 0 ? (converted / total) * 100 : 0,
      qualificationRate: total > 0 ? (qualified / total) * 100 : 0,
    };
  }

  async getLeadSources(tenantId: string): Promise<any> {
    const leads = await this.findAll(tenantId);
    
    const sources = {};
    for (const lead of leads) {
      sources[lead.source] = (sources[lead.source] || 0) + 1;
    }

    return sources;
  }

  async getLeadPipeline(tenantId: string): Promise<any> {
    const leads = await this.findAll(tenantId);
    
    const pipeline = {
      new: leads.filter(l => l.status === 'new'),
      qualified: leads.filter(l => l.status === 'qualified'),
      proposal: leads.filter(l => l.status === 'proposal'),
      negotiation: leads.filter(l => l.status === 'negotiation'),
      closed: leads.filter(l => l.status === 'converted' || l.status === 'lost'),
    };

    return pipeline;
  }

  private generateLeadNumber(): string {
    const timestamp = Date.now();
    return `LEAD-${timestamp}`;
  }
}
