import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Opportunity } from './entities/opportunity.entity';
import { OpportunityActivity } from './entities/opportunity-activity.entity';
import { OpportunityNote } from './entities/opportunity-note.entity';
import { CreateOpportunityDto } from './dto/create-opportunity.dto';
import { UpdateOpportunityDto } from './dto/update-opportunity.dto';

@Injectable()
export class OpportunitiesService {
  constructor(
    @InjectRepository(Opportunity)
    private readonly opportunityRepository: Repository<Opportunity>,
    @InjectRepository(OpportunityActivity)
    private readonly activityRepository: Repository<OpportunityActivity>,
    @InjectRepository(OpportunityNote)
    private readonly noteRepository: Repository<OpportunityNote>
  ) {}

  async getOpportunities(filters: {
    tenantId: string;
    stage?: string;
    assignedTo?: string;
    search?: string;
    page: number;
    limit: number;
  }) {
    const query = this.opportunityRepository
      .createQueryBuilder('opportunity')
      .where('opportunity.tenantId = :tenantId', { tenantId: filters.tenantId })
      .leftJoinAndSelect('opportunity.assignedUser', 'assignedUser')
      .orderBy('opportunity.createdAt', 'DESC');

    if (filters.stage) {
      query.andWhere('opportunity.stage = :stage', { stage: filters.stage });
    }

    if (filters.assignedTo) {
      query.andWhere('opportunity.assignedTo = :assignedTo', { assignedTo: filters.assignedTo });
    }

    if (filters.search) {
      query.andWhere(
        '(opportunity.name ILIKE :search OR opportunity.description ILIKE :search OR opportunity.customerName ILIKE :search)',
        { search: `%${filters.search}%` }
      );
    }

    const [opportunities, total] = await query
      .skip((filters.page - 1) * filters.limit)
      .take(filters.limit)
      .getManyAndCount();

    return {
      opportunities,
      total,
      page: filters.page,
      limit: filters.limit,
      totalPages: Math.ceil(total / filters.limit)
    };
  }

  async getOpportunitiesStats(tenantId: string) {
    const totalOpportunities = await this.opportunityRepository.count({
      where: { tenantId }
    });

    const openOpportunities = await this.opportunityRepository.count({
      where: { tenantId, status: 'open' }
    });

    const wonOpportunities = await this.opportunityRepository.count({
      where: { tenantId, status: 'won' }
    });

    const lostOpportunities = await this.opportunityRepository.count({
      where: { tenantId, status: 'lost' }
    });

    const totalValue = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .where('opportunity.tenantId = :tenantId', { tenantId })
      .andWhere('opportunity.status = :status', { status: 'open' })
      .select('SUM(opportunity.value)', 'totalValue')
      .getRawOne();

    const avgDealSize = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .where('opportunity.tenantId = :tenantId', { tenantId })
      .andWhere('opportunity.status = :status', { status: 'open' })
      .select('AVG(opportunity.value)', 'avgValue')
      .getRawOne();

    return {
      totalOpportunities,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      totalValue: parseFloat(totalValue.totalValue) || 0,
      avgDealSize: parseFloat(avgDealSize.avgValue) || 0
    };
  }

  async getSalesPipeline(tenantId: string) {
    const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won', 'closed_lost'];
    
    const pipeline = await Promise.all(
      stages.map(async (stage) => {
        const count = await this.opportunityRepository.count({
          where: { tenantId, stage, status: 'open' }
        });

        const value = await this.opportunityRepository
          .createQueryBuilder('opportunity')
          .where('opportunity.tenantId = :tenantId', { tenantId })
          .andWhere('opportunity.stage = :stage', { stage })
          .andWhere('opportunity.status = :status', { status: 'open' })
          .select('SUM(opportunity.value)', 'totalValue')
          .getRawOne();

        return {
          stage,
          count,
          value: parseFloat(value.totalValue) || 0
        };
      })
    );

    const totalValue = pipeline.reduce((sum, stage) => sum + stage.value, 0);
    const totalCount = pipeline.reduce((sum, stage) => sum + stage.count, 0);

    return {
      pipeline,
      totalValue,
      totalCount
    };
  }

  async getSalesForecast(tenantId: string, period: string = 'quarter') {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = new Date(now.getFullYear(), (quarter + 1) * 3, 0);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 11, 31);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    }

    const opportunities = await this.opportunityRepository
      .createQueryBuilder('opportunity')
      .where('opportunity.tenantId = :tenantId', { tenantId })
      .andWhere('opportunity.status = :status', { status: 'open' })
      .andWhere('opportunity.expectedCloseDate >= :startDate', { startDate })
      .andWhere('opportunity.expectedCloseDate <= :endDate', { endDate })
      .getMany();

    const forecast = opportunities.reduce((acc, opportunity) => {
      const probability = opportunity.probability || 0;
      const weightedValue = opportunity.value * (probability / 100);
      
      acc.totalValue += opportunity.value;
      acc.weightedValue += weightedValue;
      acc.highProbability += probability >= 70 ? opportunity.value : 0;
      acc.mediumProbability += probability >= 40 && probability < 70 ? opportunity.value : 0;
      acc.lowProbability += probability < 40 ? opportunity.value : 0;
      
      return acc;
    }, {
      totalValue: 0,
      weightedValue: 0,
      highProbability: 0,
      mediumProbability: 0,
      lowProbability: 0
    });

    return {
      period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      totalOpportunities: opportunities.length,
      forecast
    };
  }

  async getOpportunity(id: string, tenantId: string) {
    const opportunity = await this.opportunityRepository.findOne({
      where: { id, tenantId },
      relations: ['assignedUser', 'activities', 'notes']
    });

    if (!opportunity) {
      throw new NotFoundException('Opportunity not found');
    }

    return opportunity;
  }

  async createOpportunity(createOpportunityDto: CreateOpportunityDto, userId: string, tenantId: string) {
    const opportunity = this.opportunityRepository.create({
      ...createOpportunityDto,
      tenantId,
      createdBy: userId,
      status: 'open',
      stage: 'prospecting'
    });

    const savedOpportunity = await this.opportunityRepository.save(opportunity);

    // Create initial activity
    await this.createActivity(savedOpportunity.id, {
      type: 'created',
      description: 'Opportunity created',
      userId
    });

    return savedOpportunity;
  }

  async updateOpportunity(id: string, updateOpportunityDto: UpdateOpportunityDto, userId: string, tenantId: string) {
    const opportunity = await this.getOpportunity(id, tenantId);

    Object.assign(opportunity, updateOpportunityDto);
    opportunity.updatedBy = userId;
    opportunity.updatedAt = new Date();

    const savedOpportunity = await this.opportunityRepository.save(opportunity);

    // Create update activity
    await this.createActivity(id, {
      type: 'updated',
      description: 'Opportunity updated',
      userId
    });

    return savedOpportunity;
  }

  async advanceOpportunity(id: string, userId: string, tenantId: string) {
    const opportunity = await this.getOpportunity(id, tenantId);

    if (opportunity.status !== 'open') {
      throw new BadRequestException('Only open opportunities can be advanced');
    }

    const stages = ['prospecting', 'qualification', 'proposal', 'negotiation', 'closed_won'];
    const currentIndex = stages.indexOf(opportunity.stage);
    
    if (currentIndex === -1 || currentIndex === stages.length - 1) {
      throw new BadRequestException('Opportunity cannot be advanced further');
    }

    const newStage = stages[currentIndex + 1];
    opportunity.stage = newStage;
    opportunity.updatedBy = userId;
    opportunity.updatedAt = new Date();

    const savedOpportunity = await this.opportunityRepository.save(opportunity);

    // Create advancement activity
    await this.createActivity(id, {
      type: 'stage_advanced',
      description: `Opportunity advanced to ${newStage}`,
      userId
    });

    return savedOpportunity;
  }

  async closeOpportunity(id: string, closeData: { outcome: string; reason?: string }, userId: string, tenantId: string) {
    const opportunity = await this.getOpportunity(id, tenantId);

    if (opportunity.status !== 'open') {
      throw new BadRequestException('Only open opportunities can be closed');
    }

    opportunity.status = closeData.outcome;
    opportunity.closedAt = new Date();
    opportunity.closedBy = userId;
    opportunity.closeReason = closeData.reason;
    opportunity.updatedBy = userId;
    opportunity.updatedAt = new Date();

    const savedOpportunity = await this.opportunityRepository.save(opportunity);

    // Create closure activity
    await this.createActivity(id, {
      type: 'closed',
      description: `Opportunity closed as ${closeData.outcome}`,
      userId
    });

    return savedOpportunity;
  }

  async getOpportunityActivities(id: string, tenantId: string) {
    await this.getOpportunity(id, tenantId); // Verify opportunity exists

    return this.activityRepository.find({
      where: { opportunityId: id },
      order: { createdAt: 'DESC' }
    });
  }

  async getOpportunityNotes(id: string, tenantId: string) {
    await this.getOpportunity(id, tenantId); // Verify opportunity exists

    return this.noteRepository.find({
      where: { opportunityId: id },
      order: { createdAt: 'DESC' }
    });
  }

  async addOpportunityNote(id: string, noteData: { content: string; type?: string }, userId: string, tenantId: string) {
    await this.getOpportunity(id, tenantId); // Verify opportunity exists

    const note = this.noteRepository.create({
      opportunityId: id,
      content: noteData.content,
      type: noteData.type || 'general',
      userId
    });

    const savedNote = await this.noteRepository.save(note);

    // Create note activity
    await this.createActivity(id, {
      type: 'note_added',
      description: 'Note added to opportunity',
      userId
    });

    return savedNote;
  }

  private async createActivity(opportunityId: string, activityData: {
    type: string;
    description: string;
    userId: string;
  }) {
    const activity = this.activityRepository.create({
      opportunityId,
      type: activityData.type,
      description: activityData.description,
      userId: activityData.userId
    });

    return this.activityRepository.save(activity);
  }
}
