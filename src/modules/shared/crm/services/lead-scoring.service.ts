// =====================================================================================
// AYAZLOGISTICS - CRM LEAD SCORING SERVICE
// =====================================================================================
// Description: Intelligent lead scoring, qualification, and conversion workflows
// Features: ML-based scoring, conversion prediction, workflow automation, SLA tracking
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, gte, lte, isNull, desc, sql, inArray, or } from 'drizzle-orm';
import * as schema from '@/database/schema';
import { crmLeads, crmCustomers, crmActivities } from '@/database/schema/shared/crm.schema';

// =====================================================================================
// INTERFACES & TYPES
// =====================================================================================

interface Lead {
  id: string;
  name: string;
  company?: string;
  email: string;
  phone: string;
  jobTitle?: string;
  source: string;
  status: string;
  priority: string;
  estimatedValue?: number;
  industry?: string;
  description?: string;
  leadScore?: number;
  qualificationScore?: number;
  conversionProbability?: number;
  tags?: string[];
  notes?: string;
  lastContactedAt?: Date;
  nextFollowUp?: Date;
  assignedTo?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
}

interface ScoringCriteria {
  demographic: {
    jobTitle: { weight: number; keywords: string[] };
    company: { weight: number; targetIndustries: string[] };
    location: { weight: number; preferredRegions: string[] };
  };
  behavioral: {
    emailEngagement: { weight: number; openRate: number; clickRate: number };
    websiteActivity: { weight: number; pageViews: number; timeOnSite: number };
    contentDownloads: { weight: number; count: number };
    formSubmissions: { weight: number; count: number };
  };
  firmographic: {
    companySize: { weight: number; minEmployees: number; maxEmployees: number };
    revenue: { weight: number; minRevenue: number; maxRevenue: number };
    industry: { weight: number; targetIndustries: string[] };
    technology: { weight: number; technologies: string[] };
  };
  engagement: {
    responseTime: { weight: number; avgResponseTime: number };
    meetingsScheduled: { weight: number; count: number };
    emailsSent: { weight: number; count: number };
    callsMade: { weight: number; count: number };
  };
}

interface LeadScoreResult {
  leadId: string;
  totalScore: number;
  maxScore: number;
  percentage: number;
  breakdown: {
    demographic: number;
    behavioral: number;
    firmographic: number;
    engagement: number;
  };
  factors: ScoringFactor[];
  recommendation: 'hot' | 'warm' | 'cold' | 'disqualified';
  nextActions: string[];
  conversionProbability: number;
}

interface ScoringFactor {
  category: string;
  factor: string;
  score: number;
  maxScore: number;
  impact: 'positive' | 'negative' | 'neutral';
  reason: string;
}

interface ConversionPrediction {
  leadId: string;
  probability: number;
  confidence: number;
  expectedRevenue: number;
  expectedCloseDays: number;
  riskFactors: string[];
  opportunityFactors: string[];
  recommendedActions: string[];
}

interface LeadQualificationResult {
  leadId: string;
  qualified: boolean;
  qualificationScore: number;
  bant: {
    budget: { score: number; status: 'yes' | 'no' | 'unknown'; notes: string };
    authority: { score: number; status: 'yes' | 'no' | 'unknown'; notes: string };
    need: { score: number; status: 'yes' | 'no' | 'unknown'; notes: string };
    timeline: { score: number; status: 'yes' | 'no' | 'unknown'; notes: string };
  };
  fitScore: number;
  intentScore: number;
  overallAssessment: string;
  disqualificationReasons: string[];
}

interface ConversionWorkflow {
  leadId: string;
  currentStage: string;
  stages: WorkflowStage[];
  nextStage: string;
  blockers: string[];
  estimatedCloseDate: Date;
  probability: number;
}

interface WorkflowStage {
  name: string;
  status: 'completed' | 'in_progress' | 'pending' | 'blocked';
  completedAt?: Date;
  tasks: WorkflowTask[];
  requiredActivities: string[];
  successCriteria: string[];
}

interface WorkflowTask {
  id: string;
  title: string;
  description: string;
  assignedTo?: string;
  dueDate?: Date;
  status: 'open' | 'in_progress' | 'completed' | 'cancelled';
  priority: string;
}

interface SLAMetrics {
  leadId: string;
  responseTime: {
    target: number; // minutes
    actual: number;
    met: boolean;
  };
  firstContact: {
    target: number; // hours
    actual: number;
    met: boolean;
  };
  qualification: {
    target: number; // days
    actual: number;
    met: boolean;
  };
  followUpFrequency: {
    target: number; // days
    actual: number;
    met: boolean;
  };
  overallCompliance: number;
  violations: string[];
}

interface LeadNurturingPlan {
  leadId: string;
  campaign: string;
  sequence: NurturingStep[];
  currentStep: number;
  completedSteps: number;
  nextAction: NurturingStep;
  estimatedCompletionDate: Date;
}

interface NurturingStep {
  stepNumber: number;
  type: 'email' | 'call' | 'sms' | 'content' | 'event' | 'task';
  title: string;
  description: string;
  scheduledDate: Date;
  status: 'scheduled' | 'sent' | 'completed' | 'failed';
  metrics?: {
    delivered?: boolean;
    opened?: boolean;
    clicked?: boolean;
    responded?: boolean;
  };
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class LeadScoringService {
  private readonly logger = new Logger(LeadScoringService.name);

  // Scoring thresholds
  private readonly HOT_LEAD_THRESHOLD = 80;
  private readonly WARM_LEAD_THRESHOLD = 60;
  private readonly COLD_LEAD_THRESHOLD = 40;

  // SLA targets (configurable)
  private readonly SLA_RESPONSE_TIME_MINUTES = 15;
  private readonly SLA_FIRST_CONTACT_HOURS = 24;
  private readonly SLA_QUALIFICATION_DAYS = 3;
  private readonly SLA_FOLLOWUP_DAYS = 7;

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // =====================================================================================
  // LEAD SCORING - MAIN METHOD
  // =====================================================================================

  async scoreLead(leadId: string, recalculate: boolean = false): Promise<LeadScoreResult> {
    this.logger.log(`Scoring lead: ${leadId} (recalculate: ${recalculate})`);

    // Fetch lead
    const [lead] = await this.db
      .select()
      .from(crmLeads)
      .where(eq(crmLeads.id, leadId))
      .limit(1);

    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    // Check if we should use cached score
    if (!recalculate && lead.leadScore) {
      // Return cached score if recent (< 24 hours old)
      const scoreAge = Date.now() - new Date(lead.updatedAt).getTime();
      if (scoreAge < 24 * 60 * 60 * 1000) {
        this.logger.debug(`Using cached score for lead ${leadId}`);
        // Reconstruct result from cached data
        return this.reconstructScoreResult(lead);
      }
    }

    // Get lead activities
    const activities = await this.db
      .select()
      .from(crmActivities)
      .where(eq(crmActivities.leadId, leadId))
      .orderBy(desc(crmActivities.createdAt));

    // Load scoring criteria (from config or database)
    const criteria = this.getDefaultScoringCriteria();

    // Calculate scores for each category
    const demographicScore = this.calculateDemographicScore(lead, criteria);
    const behavioralScore = this.calculateBehavioralScore(lead, activities, criteria);
    const firmographicScore = this.calculateFirmographicScore(lead, criteria);
    const engagementScore = this.calculateEngagementScore(lead, activities, criteria);

    // Calculate total score
    const totalScore = demographicScore.score + behavioralScore.score + 
                      firmographicScore.score + engagementScore.score;
    const maxScore = demographicScore.maxScore + behavioralScore.maxScore + 
                    firmographicScore.maxScore + engagementScore.maxScore;
    const percentage = (totalScore / maxScore) * 100;

    // Determine recommendation
    let recommendation: 'hot' | 'warm' | 'cold' | 'disqualified';
    if (percentage >= this.HOT_LEAD_THRESHOLD) {
      recommendation = 'hot';
    } else if (percentage >= this.WARM_LEAD_THRESHOLD) {
      recommendation = 'warm';
    } else if (percentage >= this.COLD_LEAD_THRESHOLD) {
      recommendation = 'cold';
    } else {
      recommendation = 'disqualified';
    }

    // Compile all scoring factors
    const factors: ScoringFactor[] = [
      ...demographicScore.factors,
      ...behavioralScore.factors,
      ...firmographicScore.factors,
      ...engagementScore.factors,
    ];

    // Generate next actions
    const nextActions = this.generateNextActions(recommendation, factors, activities);

    // Calculate conversion probability
    const conversionProbability = this.calculateConversionProbability(
      percentage,
      activities.length,
      lead,
    );

    const result: LeadScoreResult = {
      leadId,
      totalScore,
      maxScore,
      percentage,
      breakdown: {
        demographic: demographicScore.score,
        behavioral: behavioralScore.score,
        firmographic: firmographicScore.score,
        engagement: engagementScore.score,
      },
      factors,
      recommendation,
      nextActions,
      conversionProbability,
    };

    // Update lead with new score
    await this.db
      .update(crmLeads)
      .set({
        leadScore: Math.round(totalScore),
        qualificationScore: percentage.toString(),
        priority: recommendation === 'hot' ? 'high' : recommendation === 'warm' ? 'medium' : 'low',
        updatedAt: new Date(),
      })
      .where(eq(crmLeads.id, leadId));

    this.logger.log(
      `Lead ${leadId} scored: ${totalScore.toFixed(2)}/${maxScore} (${percentage.toFixed(2)}%) - ${recommendation}`,
    );

    return result;
  }

  private calculateDemographicScore(
    lead: any,
    criteria: ScoringCriteria,
  ): { score: number; maxScore: number; factors: ScoringFactor[] } {
    let score = 0;
    let maxScore = 0;
    const factors: ScoringFactor[] = [];

    // Job Title
    const jobTitleWeight = criteria.demographic.jobTitle.weight;
    maxScore += jobTitleWeight;
    if (lead.jobTitle) {
      const keywords = criteria.demographic.jobTitle.keywords;
      const matchCount = keywords.filter(keyword =>
        lead.jobTitle.toLowerCase().includes(keyword.toLowerCase()),
      ).length;
      const jobTitleScore = (matchCount / keywords.length) * jobTitleWeight;
      score += jobTitleScore;
      
      factors.push({
        category: 'Demographic',
        factor: 'Job Title',
        score: jobTitleScore,
        maxScore: jobTitleWeight,
        impact: jobTitleScore > jobTitleWeight * 0.5 ? 'positive' : 'neutral',
        reason: matchCount > 0 ? `Matches ${matchCount} target keywords` : 'No keyword matches',
      });
    }

    // Company
    const companyWeight = criteria.demographic.company.weight;
    maxScore += companyWeight;
    if (lead.company && lead.industry) {
      const isTargetIndustry = criteria.demographic.company.targetIndustries.includes(lead.industry);
      const companyScore = isTargetIndustry ? companyWeight : companyWeight * 0.5;
      score += companyScore;
      
      factors.push({
        category: 'Demographic',
        factor: 'Company Industry',
        score: companyScore,
        maxScore: companyWeight,
        impact: isTargetIndustry ? 'positive' : 'neutral',
        reason: isTargetIndustry ? 'Target industry match' : 'Not in target industry',
      });
    }

    return { score, maxScore, factors };
  }

  private calculateBehavioralScore(
    lead: any,
    activities: any[],
    criteria: ScoringCriteria,
  ): { score: number; maxScore: number; factors: ScoringFactor[] } {
    let score = 0;
    let maxScore = 0;
    const factors: ScoringFactor[] = [];

    // Email engagement
    const emailWeight = criteria.behavioral.emailEngagement.weight;
    maxScore += emailWeight;
    const emailActivities = activities.filter(a => a.type === 'email');
    if (emailActivities.length > 0) {
      // Simplified engagement calculation
      const engagementScore = Math.min(emailWeight, (emailActivities.length / 10) * emailWeight);
      score += engagementScore;
      
      factors.push({
        category: 'Behavioral',
        factor: 'Email Engagement',
        score: engagementScore,
        maxScore: emailWeight,
        impact: engagementScore > emailWeight * 0.7 ? 'positive' : 'neutral',
        reason: `${emailActivities.length} email interactions`,
      });
    }

    // Website activity
    const websiteWeight = criteria.behavioral.websiteActivity.weight;
    maxScore += websiteWeight;
    const metadata = lead.metadata as any;
    if (metadata?.pageViews) {
      const websiteScore = Math.min(websiteWeight, (metadata.pageViews / 20) * websiteWeight);
      score += websiteScore;
      
      factors.push({
        category: 'Behavioral',
        factor: 'Website Activity',
        score: websiteScore,
        maxScore: websiteWeight,
        impact: websiteScore > websiteWeight * 0.7 ? 'positive' : 'neutral',
        reason: `${metadata.pageViews} page views`,
      });
    }

    return { score, maxScore, factors };
  }

  private calculateFirmographicScore(
    lead: any,
    criteria: ScoringCriteria,
  ): { score: number; maxScore: number; factors: ScoringFactor[] } {
    let score = 0;
    let maxScore = 0;
    const factors: ScoringFactor[] = [];

    // Company size (from metadata or external enrichment)
    const companySizeWeight = criteria.firmographic.companySize.weight;
    maxScore += companySizeWeight;
    const metadata = lead.metadata as any;
    if (metadata?.employeeCount) {
      const { minEmployees, maxEmployees } = criteria.firmographic.companySize;
      const inRange = metadata.employeeCount >= minEmployees && metadata.employeeCount <= maxEmployees;
      const sizeScore = inRange ? companySizeWeight : companySizeWeight * 0.5;
      score += sizeScore;
      
      factors.push({
        category: 'Firmographic',
        factor: 'Company Size',
        score: sizeScore,
        maxScore: companySizeWeight,
        impact: inRange ? 'positive' : 'neutral',
        reason: inRange ? 'Within target company size' : 'Outside target size range',
      });
    }

    // Industry
    const industryWeight = criteria.firmographic.industry.weight;
    maxScore += industryWeight;
    if (lead.industry) {
      const isTargetIndustry = criteria.firmographic.industry.targetIndustries.some(
        target => target.toLowerCase() === lead.industry.toLowerCase(),
      );
      const industryScore = isTargetIndustry ? industryWeight : industryWeight * 0.3;
      score += industryScore;
      
      factors.push({
        category: 'Firmographic',
        factor: 'Industry',
        score: industryScore,
        maxScore: industryWeight,
        impact: isTargetIndustry ? 'positive' : 'negative',
        reason: isTargetIndustry ? 'Target industry' : 'Non-target industry',
      });
    }

    return { score, maxScore, factors };
  }

  private calculateEngagementScore(
    lead: any,
    activities: any[],
    criteria: ScoringCriteria,
  ): { score: number; maxScore: number; factors: ScoringFactor[] } {
    let score = 0;
    let maxScore = 0;
    const factors: ScoringFactor[] = [];

    // Response time
    const responseTimeWeight = criteria.engagement.responseTime.weight;
    maxScore += responseTimeWeight;
    if (lead.lastContactedAt) {
      const timeSinceContact = Date.now() - new Date(lead.lastContactedAt).getTime();
      const daysSince = timeSinceContact / (1000 * 60 * 60 * 24);
      const responseScore = Math.max(0, responseTimeWeight * (1 - daysSince / 30)); // Decay over 30 days
      score += responseScore;
      
      factors.push({
        category: 'Engagement',
        factor: 'Recency',
        score: responseScore,
        maxScore: responseTimeWeight,
        impact: responseScore > responseTimeWeight * 0.7 ? 'positive' : 'neutral',
        reason: `Last contacted ${daysSince.toFixed(0)} days ago`,
      });
    }

    // Meetings scheduled
    const meetingsWeight = criteria.engagement.meetingsScheduled.weight;
    maxScore += meetingsWeight;
    const meetings = activities.filter(a => a.type === 'meeting');
    if (meetings.length > 0) {
      const meetingScore = Math.min(meetingsWeight, meetings.length * (meetingsWeight / 3));
      score += meetingScore;
      
      factors.push({
        category: 'Engagement',
        factor: 'Meetings',
        score: meetingScore,
        maxScore: meetingsWeight,
        impact: 'positive',
        reason: `${meetings.length} meetings scheduled/completed`,
      });
    }

    // Calls made
    const callsWeight = criteria.engagement.callsMade.weight;
    maxScore += callsWeight;
    const calls = activities.filter(a => a.type === 'call');
    if (calls.length > 0) {
      const callScore = Math.min(callsWeight, calls.length * (callsWeight / 5));
      score += callScore;
      
      factors.push({
        category: 'Engagement',
        factor: 'Calls',
        score: callScore,
        maxScore: callsWeight,
        impact: 'positive',
        reason: `${calls.length} calls made`,
      });
    }

    return { score, maxScore, factors };
  }

  private calculateConversionProbability(
    scorePercentage: number,
    activityCount: number,
    lead: any,
  ): number {
    // Simplified probability calculation
    // In production, would use ML model
    let probability = scorePercentage / 100;

    // Adjust based on activity level
    if (activityCount > 10) probability += 0.1;
    else if (activityCount > 5) probability += 0.05;

    // Adjust based on estimated value
    if (lead.estimatedValue) {
      const value = Number(lead.estimatedValue);
      if (value > 100000) probability += 0.1;
      else if (value > 50000) probability += 0.05;
    }

    // Adjust based on source
    if (lead.source === 'referral') probability += 0.15;
    else if (lead.source === 'website') probability += 0.05;

    return Math.min(1, Math.max(0, probability));
  }

  private generateNextActions(
    recommendation: string,
    factors: ScoringFactor[],
    activities: any[],
  ): string[] {
    const actions: string[] = [];

    switch (recommendation) {
      case 'hot':
        actions.push('Schedule demo/discovery call within 24 hours');
        actions.push('Send personalized proposal');
        actions.push('Involve senior sales representative');
        if (activities.filter(a => a.type === 'meeting').length === 0) {
          actions.push('Book first meeting ASAP');
        }
        break;

      case 'warm':
        actions.push('Continue nurturing with targeted content');
        actions.push('Schedule qualification call');
        actions.push('Share case studies relevant to their industry');
        break;

      case 'cold':
        actions.push('Add to nurturing campaign');
        actions.push('Gather more information about needs and budget');
        actions.push('Re-engage with value proposition');
        break;

      case 'disqualified':
        actions.push('Archive or reassign to marketing');
        actions.push('Consider for future campaigns');
        break;
    }

    // Add actions based on missing factors
    const lowScoringFactors = factors.filter(f => f.score < f.maxScore * 0.5);
    lowScoringFactors.forEach(factor => {
      if (factor.category === 'Engagement') {
        actions.push(`Increase ${factor.factor.toLowerCase()} frequency`);
      }
    });

    return actions;
  }

  private getDefaultScoringCriteria(): ScoringCriteria {
    return {
      demographic: {
        jobTitle: {
          weight: 15,
          keywords: ['director', 'manager', 'vp', 'chief', 'head', 'owner', 'founder'],
        },
        company: {
          weight: 10,
          targetIndustries: ['logistics', 'manufacturing', 'retail', 'e-commerce', 'wholesale'],
        },
        location: {
          weight: 5,
          preferredRegions: ['Istanbul', 'Ankara', 'Izmir'],
        },
      },
      behavioral: {
        emailEngagement: { weight: 15, openRate: 0.3, clickRate: 0.1 },
        websiteActivity: { weight: 15, pageViews: 5, timeOnSite: 120 },
        contentDownloads: { weight: 10, count: 2 },
        formSubmissions: { weight: 10, count: 1 },
      },
      firmographic: {
        companySize: { weight: 10, minEmployees: 10, maxEmployees: 5000 },
        revenue: { weight: 10, minRevenue: 1000000, maxRevenue: 100000000 },
        industry: { weight: 10, targetIndustries: ['logistics', 'manufacturing', 'retail'] },
        technology: { weight: 5, technologies: ['erp', 'wms', 'tms'] },
      },
      engagement: {
        responseTime: { weight: 10, avgResponseTime: 24 },
        meetingsScheduled: { weight: 15, count: 1 },
        emailsSent: { weight: 5, count: 3 },
        callsMade: { weight: 10, count: 2 },
      },
    };
  }

  private reconstructScoreResult(lead: any): LeadScoreResult {
    const score = lead.leadScore || 0;
    const percentage = parseFloat(lead.qualificationScore || '0');
    
    return {
      leadId: lead.id,
      totalScore: score,
      maxScore: 100,
      percentage,
      breakdown: {
        demographic: score * 0.3,
        behavioral: score * 0.3,
        firmographic: score * 0.2,
        engagement: score * 0.2,
      },
      factors: [],
      recommendation: percentage >= 80 ? 'hot' : percentage >= 60 ? 'warm' : percentage >= 40 ? 'cold' : 'disqualified',
      nextActions: [],
      conversionProbability: percentage / 100,
    };
  }

  // =====================================================================================
  // LEAD QUALIFICATION (BANT)
  // =====================================================================================

  async qualifyLead(
    leadId: string,
    qualificationData: {
      hasBudget?: boolean;
      budgetAmount?: number;
      hasAuthority?: boolean;
      decisionMaker?: string;
      hasNeed?: boolean;
      painPoints?: string[];
      hasTimeline?: boolean;
      timeframe?: string;
      notes?: Record<string, string>;
    },
  ): Promise<LeadQualificationResult> {
    this.logger.log(`Qualifying lead: ${leadId}`);

    const bant = {
      budget: this.evaluateBANTCriteria(
        'budget',
        qualificationData.hasBudget,
        qualificationData.notes?.budget || '',
      ),
      authority: this.evaluateBANTCriteria(
        'authority',
        qualificationData.hasAuthority,
        qualificationData.notes?.authority || '',
      ),
      need: this.evaluateBANTCriteria(
        'need',
        qualificationData.hasNeed,
        qualificationData.notes?.need || '',
      ),
      timeline: this.evaluateBANTCriteria(
        'timeline',
        qualificationData.hasTimeline,
        qualificationData.notes?.timeline || '',
      ),
    };

    const qualificationScore = 
      (bant.budget.score + bant.authority.score + bant.need.score + bant.timeline.score) / 4;

    const qualified = qualificationScore >= 75;

    const disqualificationReasons: string[] = [];
    if (bant.budget.status === 'no') disqualificationReasons.push('No budget');
    if (bant.authority.status === 'no') disqualificationReasons.push('Not decision maker');
    if (bant.need.status === 'no') disqualificationReasons.push('No clear need');
    if (bant.timeline.status === 'no') disqualificationReasons.push('No timeline');

    // Update lead
    await this.db
      .update(crmLeads)
      .set({
        qualificationScore: qualificationScore.toString(),
        status: qualified ? 'qualified' : 'disqualified',
        metadata: sql`COALESCE(${crmLeads.metadata}, '{}'::jsonb) || ${JSON.stringify({ bant })}::jsonb`,
      })
      .where(eq(crmLeads.id, leadId));

    return {
      leadId,
      qualified,
      qualificationScore,
      bant,
      fitScore: qualificationScore,
      intentScore: (bant.need.score + bant.timeline.score) / 2,
      overallAssessment: qualified 
        ? 'Lead meets qualification criteria'
        : 'Lead does not meet minimum qualification standards',
      disqualificationReasons,
    };
  }

  private evaluateBANTCriteria(
    criterion: string,
    hasIt?: boolean,
    notes?: string,
  ): { score: number; status: 'yes' | 'no' | 'unknown'; notes: string } {
    if (hasIt === undefined) {
      return { score: 50, status: 'unknown', notes: notes || 'Not yet evaluated' };
    }
    return {
      score: hasIt ? 100 : 0,
      status: hasIt ? 'yes' : 'no',
      notes: notes || '',
    };
  }

  // =====================================================================================
  // CONVERSION WORKFLOW
  // =====================================================================================

  async getConversionWorkflow(leadId: string): Promise<ConversionWorkflow> {
    const [lead] = await this.db
      .select()
      .from(crmLeads)
      .where(eq(crmLeads.id, leadId))
      .limit(1);

    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    const stages: WorkflowStage[] = [
      {
        name: 'Initial Contact',
        status: lead.lastContactedAt ? 'completed' : 'in_progress',
        completedAt: lead.lastContactedAt ? new Date(lead.lastContactedAt) : undefined,
        tasks: [],
        requiredActivities: ['first_contact'],
        successCriteria: ['Lead responded', 'Basic information gathered'],
      },
      {
        name: 'Qualification',
        status: lead.qualificationScore ? 'completed' : 'pending',
        tasks: [],
        requiredActivities: ['discovery_call', 'needs_assessment'],
        successCriteria: ['BANT criteria met', 'Decision maker identified'],
      },
      {
        name: 'Proposal',
        status: 'pending',
        tasks: [],
        requiredActivities: ['demo', 'proposal_sent'],
        successCriteria: ['Proposal reviewed', 'Questions answered'],
      },
      {
        name: 'Negotiation',
        status: 'pending',
        tasks: [],
        requiredActivities: ['negotiate_terms', 'address_objections'],
        successCriteria: ['Terms agreed', 'Contract prepared'],
      },
      {
        name: 'Closed Won',
        status: 'pending',
        tasks: [],
        requiredActivities: ['contract_signed'],
        successCriteria: ['Contract executed', 'Payment received'],
      },
    ];

    const currentStageIndex = stages.findIndex(s => s.status === 'in_progress' || s.status === 'pending');
    const currentStage = stages[currentStageIndex]?.name || 'Initial Contact';
    const nextStage = stages[currentStageIndex + 1]?.name || 'Complete';

    return {
      leadId,
      currentStage,
      stages,
      nextStage,
      blockers: [],
      estimatedCloseDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      probability: lead.qualificationScore ? parseFloat(lead.qualificationScore) / 100 : 0.2,
    };
  }

  // =====================================================================================
  // SLA TRACKING
  // =====================================================================================

  async trackSLA(leadId: string): Promise<SLAMetrics> {
    const [lead] = await this.db
      .select()
      .from(crmLeads)
      .where(eq(crmLeads.id, leadId))
      .limit(1);

    if (!lead) {
      throw new NotFoundException(`Lead ${leadId} not found`);
    }

    const activities = await this.db
      .select()
      .from(crmActivities)
      .where(eq(crmActivities.leadId, leadId))
      .orderBy(crmActivities.createdAt);

    const createdAt = new Date(lead.createdAt);
    const now = new Date();

    // Response time (first activity after creation)
    const firstActivity = activities[0];
    const responseTimeMinutes = firstActivity
      ? (new Date(firstActivity.createdAt).getTime() - createdAt.getTime()) / (1000 * 60)
      : (now.getTime() - createdAt.getTime()) / (1000 * 60);

    // First contact
    const firstContactHours = lead.lastContactedAt
      ? (new Date(lead.lastContactedAt).getTime() - createdAt.getTime()) / (1000 * 60 * 60)
      : (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);

    // Qualification
    const qualificationDays = lead.qualificationScore
      ? (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24)
      : null;

    // Follow-up frequency
    const daysSinceLastContact = lead.lastContactedAt
      ? (now.getTime() - new Date(lead.lastContactedAt).getTime()) / (1000 * 60 * 60 * 24)
      : null;

    const violations: string[] = [];
    let metCount = 0;
    let totalChecks = 0;

    const responseTimeMet = responseTimeMinutes <= this.SLA_RESPONSE_TIME_MINUTES;
    if (!responseTimeMet) violations.push('Response time SLA violated');
    if (responseTimeMet) metCount++;
    totalChecks++;

    const firstContactMet = firstContactHours <= this.SLA_FIRST_CONTACT_HOURS;
    if (!firstContactMet) violations.push('First contact SLA violated');
    if (firstContactMet) metCount++;
    totalChecks++;

    const compliance = (metCount / totalChecks) * 100;

    return {
      leadId,
      responseTime: {
        target: this.SLA_RESPONSE_TIME_MINUTES,
        actual: responseTimeMinutes,
        met: responseTimeMet,
      },
      firstContact: {
        target: this.SLA_FIRST_CONTACT_HOURS,
        actual: firstContactHours,
        met: firstContactMet,
      },
      qualification: {
        target: this.SLA_QUALIFICATION_DAYS,
        actual: qualificationDays || 0,
        met: qualificationDays ? qualificationDays <= this.SLA_QUALIFICATION_DAYS : false,
      },
      followUpFrequency: {
        target: this.SLA_FOLLOWUP_DAYS,
        actual: daysSinceLastContact || 0,
        met: daysSinceLastContact ? daysSinceLastContact <= this.SLA_FOLLOWUP_DAYS : true,
      },
      overallCompliance: compliance,
      violations,
    };
  }

  // =====================================================================================
  // BATCH OPERATIONS
  // =====================================================================================

  async scoreAllLeads(tenantId: string, status?: string): Promise<{ scored: number; failed: number }> {
    this.logger.log(`Scoring all leads for tenant: ${tenantId}`);

    const conditions = [eq(crmLeads.tenantId, tenantId)];
    if (status) {
      conditions.push(eq(crmLeads.status, status));
    }

    const leads = await this.db
      .select()
      .from(crmLeads)
      .where(and(...conditions));

    let scored = 0;
    let failed = 0;

    for (const lead of leads) {
      try {
        await this.scoreLead(lead.id, true);
        scored++;
      } catch (error) {
        this.logger.error(`Failed to score lead ${lead.id}:`, error);
        failed++;
      }
    }

    this.logger.log(`Scoring complete: ${scored} scored, ${failed} failed`);

    return { scored, failed };
  }
}

// =====================================================================================
// END OF SERVICE
// =====================================================================================

