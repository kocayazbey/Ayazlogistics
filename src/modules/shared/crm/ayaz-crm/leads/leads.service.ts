import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Lead } from './entities/lead.entity';
import { LeadActivity } from './entities/lead-activity.entity';
import { LeadNote } from './entities/lead-note.entity';
import { CreateLeadDto } from './dto/create-lead.dto';
import { UpdateLeadDto } from './dto/update-lead.dto';

@Injectable()
export class LeadsService {
  constructor(
    @InjectRepository(Lead)
    private readonly leadRepository: Repository<Lead>,
    @InjectRepository(LeadActivity)
    private readonly activityRepository: Repository<LeadActivity>,
    @InjectRepository(LeadNote)
    private readonly noteRepository: Repository<LeadNote>
  ) {}

  async getLeads(filters: {
    tenantId: string;
    status?: string;
    source?: string;
    assignedTo?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const query = this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.tenantId = :tenantId', { tenantId: filters.tenantId })
      .leftJoinAndSelect('lead.assignedUser', 'assignedUser')
      .orderBy('lead.createdAt', 'DESC');

    if (filters.status) {
      query.andWhere('lead.status = :status', { status: filters.status });
    }

    if (filters.source) {
      query.andWhere('lead.source = :source', { source: filters.source });
    }

    if (filters.assignedTo) {
      query.andWhere('lead.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    if (filters.search) {
      query.andWhere(
        '(lead.firstName ILIKE :search OR lead.lastName ILIKE :search OR lead.email ILIKE :search OR lead.company ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const [leads, total] = await query
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return {
      leads,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    };
  }

  async getLeadsStats(tenantId: string) {
    const totalLeads = await this.leadRepository.count({
      where: { tenantId }
    });

    const newLeads = await this.leadRepository.count({
      where: { tenantId, status: 'new' }
    });

    const qualifiedLeads = await this.leadRepository.count({
      where: { tenantId, status: 'qualified' }
    });

    const convertedLeads = await this.leadRepository.count({
      where: { tenantId, status: 'converted' }
    });

    const lostLeads = await this.leadRepository.count({
      where: { tenantId, status: 'lost' }
    });

    const avgLeadValue = await this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.estimatedValue > 0')
      .select('AVG(lead.estimatedValue)', 'avgValue')
      .getRawOne();

    return {
      totalLeads,
      newLeads,
      qualifiedLeads,
      convertedLeads,
      lostLeads,
      avgLeadValue: parseFloat(avgLeadValue.avgValue) || 0
    };
  }

  async getLeadsConversion(tenantId: string, filters: { startDate?: string; endDate?: string }) {
    const startDate = filters.startDate ? new Date(filters.startDate) : new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters.endDate ? new Date(filters.endDate) : new Date();

    const totalLeads = await this.leadRepository.count({
      where: {
        tenantId,
        createdAt: { $gte: startDate, $lte: endDate }
      }
    });

    const convertedLeads = await this.leadRepository.count({
      where: {
        tenantId,
        status: 'converted',
        convertedAt: { $gte: startDate, $lte: endDate }
      }
    });

    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    const sourceStats = await this.leadRepository
      .createQueryBuilder('lead')
      .where('lead.tenantId = :tenantId', { tenantId })
      .andWhere('lead.createdAt >= :startDate', { startDate })
      .andWhere('lead.createdAt <= :endDate', { endDate })
      .select(['lead.source', 'COUNT(*) as count'])
      .groupBy('lead.source')
      .getRawMany();

    return {
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      },
      totalLeads,
      convertedLeads,
      conversionRate,
      sourceBreakdown: sourceStats.map(stat => ({
        source: stat.lead_source,
        count: parseInt(stat.count)
      }))
    };
  }

  async getLead(id: string, tenantId: string) {
    const lead = await this.leadRepository.findOne({
      where: { id, tenantId },
      relations: ['assignedUser', 'activities', 'notes']
    });

    if (!lead) {
      throw new NotFoundException('Lead not found');
    }

    return lead;
  }

  async createLead(createLeadDto: CreateLeadDto, userId: string, tenantId: string) {
    const lead = this.leadRepository.create({
      ...createLeadDto,
      tenantId,
      createdBy: userId,
      status: 'new'
    });

    const savedLead = await this.leadRepository.save(lead);

    // Create initial activity
    await this.createActivity(savedLead.id, {
      type: 'created',
      description: 'Lead created',
      userId
    });

    return savedLead;
  }

  async updateLead(id: string, updateLeadDto: UpdateLeadDto, userId: string, tenantId: string) {
    const lead = await this.getLead(id, tenantId);

    Object.assign(lead, updateLeadDto);
    lead.updatedBy = userId;
    lead.updatedAt = new Date();

    const savedLead = await this.leadRepository.save(lead);

    // Create update activity
    await this.createActivity(id, {
      type: 'updated',
      description: 'Lead updated',
      userId
    });

    return savedLead;
  }

  async qualifyLead(id: string, userId: string, tenantId: string) {
    const lead = await this.getLead(id, tenantId);

    if (lead.status !== 'new') {
      throw new BadRequestException('Only new leads can be qualified');
    }

    lead.status = 'qualified';
    lead.qualifiedAt = new Date();
    lead.qualifiedBy = userId;

    const savedLead = await this.leadRepository.save(lead);

    // Create qualification activity
    await this.createActivity(id, {
      type: 'qualified',
      description: 'Lead qualified',
      userId
    });

    return savedLead;
  }

  async convertLead(id: string, userId: string, tenantId: string) {
    const lead = await this.getLead(id, tenantId);

    if (lead.status !== 'qualified') {
      throw new BadRequestException('Only qualified leads can be converted');
    }

    lead.status = 'converted';
    lead.convertedAt = new Date();
    lead.convertedBy = userId;

    const savedLead = await this.leadRepository.save(lead);

    // Create conversion activity
    await this.createActivity(id, {
      type: 'converted',
      description: 'Lead converted to opportunity',
      userId
    });

    return savedLead;
  }

  async getLeadActivities(id: string, tenantId: string) {
    await this.getLead(id, tenantId); // Verify lead exists

    return this.activityRepository.find({
      where: { leadId: id },
      order: { createdAt: 'DESC' }
    });
  }

  async getLeadNotes(id: string, tenantId: string) {
    await this.getLead(id, tenantId); // Verify lead exists

    return this.noteRepository.find({
      where: { leadId: id },
      order: { createdAt: 'DESC' }
    });
  }

  async addLeadNote(id: string, noteData: { content: string; type?: string }, userId: string, tenantId: string) {
    await this.getLead(id, tenantId); // Verify lead exists

    const note = this.noteRepository.create({
      leadId: id,
      content: noteData.content,
      type: noteData.type || 'general',
      userId
    });

    const savedNote = await this.noteRepository.save(note);

    // Create note activity
    await this.createActivity(id, {
      type: 'note_added',
      description: 'Note added to lead',
      userId
    });

    return savedNote;
  }

  private async createActivity(leadId: string, activityData: {
    type: string;
    description: string;
    userId: string;
  }) {
    const activity = this.activityRepository.create({
      leadId,
      type: activityData.type,
      description: activityData.description,
      userId: activityData.userId
    });

    return this.activityRepository.save(activity);
  }
}
