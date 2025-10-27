import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../core/database/database.constants';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { sql } from 'drizzle-orm';

export interface ComplianceFramework {
  id: string;
  tenantId: string;
  name: string;
  type: 'ISO27001' | 'SOC2' | 'GDPR' | 'KVKK' | 'HIPAA' | 'PCI-DSS';
  version: string;
  description: string;
  requirements: ComplianceRequirement[];
  status: 'draft' | 'active' | 'suspended' | 'expired';
  validFrom: Date;
  validTo: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface ComplianceRequirement {
  id: string;
  frameworkId: string;
  code: string;
  title: string;
  description: string;
  category: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'not_applicable' | 'not_implemented' | 'partially_implemented' | 'fully_implemented';
  evidence: ComplianceEvidence[];
  lastReviewed: Date;
  nextReview: Date;
}

export interface ComplianceEvidence {
  id: string;
  requirementId: string;
  type: 'document' | 'screenshot' | 'log' | 'test_result' | 'policy' | 'procedure';
  title: string;
  description: string;
  filePath?: string;
  url?: string;
  content?: string;
  uploadedBy: string;
  uploadedAt: Date;
  verifiedBy?: string;
  verifiedAt?: Date;
}

export interface ComplianceAudit {
  id: string;
  tenantId: string;
  frameworkId: string;
  auditorId: string;
  auditType: 'internal' | 'external' | 'self_assessment';
  startDate: Date;
  endDate: Date;
  status: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  findings: ComplianceFinding[];
  score: number;
  recommendations: string[];
  reportPath?: string;
  createdAt: Date;
}

export interface ComplianceFinding {
  id: string;
  auditId: string;
  requirementId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  evidence: string[];
  remediation: string;
  dueDate: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  assignedTo: string;
  createdAt: Date;
}

export interface DataProcessingActivity {
  id: string;
  tenantId: string;
  name: string;
  description: string;
  purpose: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
  dataCategories: string[];
  dataSubjects: string[];
  recipients: string[];
  transfers: DataTransfer[];
  retentionPeriod: number; // months
  securityMeasures: string[];
  status: 'active' | 'inactive' | 'under_review';
  createdAt: Date;
  updatedAt: Date;
}

export interface DataTransfer {
  id: string;
  activityId: string;
  destination: string;
  country: string;
  adequacy: boolean;
  safeguards: string[];
  legalBasis: string;
}

@Injectable()
export class ComplianceService {
  private readonly logger = new Logger(ComplianceService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createComplianceFramework(framework: Omit<ComplianceFramework, 'id' | 'createdAt' | 'updatedAt'>): Promise<ComplianceFramework> {
    const id = `CF-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO compliance_frameworks (id, tenant_id, name, type, version, description, 
                                       requirements, status, valid_from, valid_to, created_at, updated_at)
      VALUES (${id}, ${framework.tenantId}, ${framework.name}, ${framework.type}, ${framework.version},
              ${framework.description}, ${JSON.stringify(framework.requirements)}, ${framework.status},
              ${framework.validFrom}, ${framework.validTo}, ${now}, ${now})
    `);

    this.logger.log(`Compliance framework created: ${id} for tenant ${framework.tenantId}`);

    return {
      id,
      ...framework,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getComplianceFrameworks(tenantId: string): Promise<ComplianceFramework[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM compliance_frameworks WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      type: row.type as ComplianceFramework['type'],
      version: row.version as string,
      description: row.description as string,
      requirements: JSON.parse(row.requirements as string),
      status: row.status as ComplianceFramework['status'],
      validFrom: new Date(row.valid_from as string),
      validTo: new Date(row.valid_to as string),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  async createComplianceRequirement(requirement: Omit<ComplianceRequirement, 'id'>): Promise<ComplianceRequirement> {
    const id = `CR-${Date.now()}`;

    await this.db.execute(sql`
      INSERT INTO compliance_requirements (id, framework_id, code, title, description, category,
                                         priority, status, evidence, last_reviewed, next_review)
      VALUES (${id}, ${requirement.frameworkId}, ${requirement.code}, ${requirement.title},
              ${requirement.description}, ${requirement.category}, ${requirement.priority},
              ${requirement.status}, ${JSON.stringify(requirement.evidence)},
              ${requirement.lastReviewed}, ${requirement.nextReview})
    `);

    this.logger.log(`Compliance requirement created: ${id} for framework ${requirement.frameworkId}`);

    return {
      id,
      ...requirement,
    };
  }

  async updateRequirementStatus(requirementId: string, status: ComplianceRequirement['status']): Promise<void> {
    await this.db.execute(sql`
      UPDATE compliance_requirements SET status = ${status}, last_reviewed = NOW() WHERE id = ${requirementId}
    `);

    this.logger.log(`Compliance requirement ${requirementId} status updated to ${status}`);
  }

  async createComplianceEvidence(evidence: Omit<ComplianceEvidence, 'id' | 'uploadedAt'>): Promise<ComplianceEvidence> {
    const id = `CE-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO compliance_evidence (id, requirement_id, type, title, description, file_path,
                                     url, content, uploaded_by, uploaded_at, verified_by, verified_at)
      VALUES (${id}, ${evidence.requirementId}, ${evidence.type}, ${evidence.title},
              ${evidence.description}, ${evidence.filePath || null}, ${evidence.url || null},
              ${evidence.content || null}, ${evidence.uploadedBy}, ${now},
              ${evidence.verifiedBy || null}, ${evidence.verifiedAt || null})
    `);

    this.logger.log(`Compliance evidence created: ${id} for requirement ${evidence.requirementId}`);

    return {
      id,
      ...evidence,
      uploadedAt: now,
    };
  }

  async createComplianceAudit(audit: Omit<ComplianceAudit, 'id' | 'createdAt'>): Promise<ComplianceAudit> {
    const id = `CA-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO compliance_audits (id, tenant_id, framework_id, auditor_id, audit_type,
                                   start_date, end_date, status, findings, score, recommendations, report_path, created_at)
      VALUES (${id}, ${audit.tenantId}, ${audit.frameworkId}, ${audit.auditorId}, ${audit.auditType},
              ${audit.startDate}, ${audit.endDate}, ${audit.status}, ${JSON.stringify(audit.findings)},
              ${audit.score}, ${JSON.stringify(audit.recommendations)}, ${audit.reportPath || null}, ${now})
    `);

    this.logger.log(`Compliance audit created: ${id} for tenant ${audit.tenantId}`);

    return {
      id,
      ...audit,
      createdAt: now,
    };
  }

  async getComplianceAudits(tenantId: string, frameworkId?: string): Promise<ComplianceAudit[]> {
    let query = sql`SELECT * FROM compliance_audits WHERE tenant_id = ${tenantId}`;
    
    if (frameworkId) {
      query = sql`SELECT * FROM compliance_audits WHERE tenant_id = ${tenantId} AND framework_id = ${frameworkId}`;
    }

    const result = await this.db.execute(query);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      frameworkId: row.framework_id as string,
      auditorId: row.auditor_id as string,
      auditType: row.audit_type as ComplianceAudit['auditType'],
      startDate: new Date(row.start_date as string),
      endDate: new Date(row.end_date as string),
      status: row.status as ComplianceAudit['status'],
      findings: JSON.parse(row.findings as string),
      score: parseFloat(row.score as string),
      recommendations: JSON.parse(row.recommendations as string),
      reportPath: row.report_path as string,
      createdAt: new Date(row.created_at as string),
    }));
  }

  async createDataProcessingActivity(activity: Omit<DataProcessingActivity, 'id' | 'createdAt' | 'updatedAt'>): Promise<DataProcessingActivity> {
    const id = `DPA-${Date.now()}`;
    const now = new Date();

    await this.db.execute(sql`
      INSERT INTO data_processing_activities (id, tenant_id, name, description, purpose, legal_basis,
                                            data_categories, data_subjects, recipients, transfers,
                                            retention_period, security_measures, status, created_at, updated_at)
      VALUES (${id}, ${activity.tenantId}, ${activity.name}, ${activity.description}, ${activity.purpose},
              ${activity.legalBasis}, ${JSON.stringify(activity.dataCategories)}, ${JSON.stringify(activity.dataSubjects)},
              ${JSON.stringify(activity.recipients)}, ${JSON.stringify(activity.transfers)}, ${activity.retentionPeriod},
              ${JSON.stringify(activity.securityMeasures)}, ${activity.status}, ${now}, ${now})
    `);

    this.logger.log(`Data processing activity created: ${id} for tenant ${activity.tenantId}`);

    return {
      id,
      ...activity,
      createdAt: now,
      updatedAt: now,
    };
  }

  async getDataProcessingActivities(tenantId: string): Promise<DataProcessingActivity[]> {
    const result = await this.db.execute(sql`
      SELECT * FROM data_processing_activities WHERE tenant_id = ${tenantId} ORDER BY created_at DESC
    `);

    return result.map(row => ({
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string,
      purpose: row.purpose as string,
      legalBasis: row.legal_basis as DataProcessingActivity['legalBasis'],
      dataCategories: JSON.parse(row.data_categories as string),
      dataSubjects: JSON.parse(row.data_subjects as string),
      recipients: JSON.parse(row.recipients as string),
      transfers: JSON.parse(row.transfers as string),
      retentionPeriod: parseInt(row.retention_period as string),
      securityMeasures: JSON.parse(row.security_measures as string),
      status: row.status as DataProcessingActivity['status'],
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    }));
  }

  async getComplianceDashboard(tenantId: string): Promise<any> {
    const frameworks = await this.getComplianceFrameworks(tenantId);
    const audits = await this.getComplianceAudits(tenantId);
    const activities = await this.getDataProcessingActivities(tenantId);

    const activeFrameworks = frameworks.filter(f => f.status === 'active');
    const recentAudits = audits.filter(a => a.status === 'completed').slice(0, 5);
    const activeActivities = activities.filter(a => a.status === 'active');

    const complianceScore = this.calculateComplianceScore(frameworks, audits);

    return {
      summary: {
        totalFrameworks: frameworks.length,
        activeFrameworks: activeFrameworks.length,
        totalAudits: audits.length,
        recentAudits: recentAudits.length,
        dataProcessingActivities: activities.length,
        activeActivities: activeActivities.length,
        complianceScore,
      },
      frameworks: activeFrameworks,
      recentAudits,
      activities: activeActivities,
      metrics: {
        averageAuditScore: audits.length > 0 ? audits.reduce((sum, audit) => sum + audit.score, 0) / audits.length : 0,
        openFindings: audits.reduce((sum, audit) => sum + audit.findings.filter(f => f.status === 'open').length, 0),
        complianceRate: this.calculateComplianceRate(frameworks),
      },
    };
  }

  private calculateComplianceScore(frameworks: ComplianceFramework[], audits: ComplianceAudit[]): number {
    if (frameworks.length === 0) return 0;

    const frameworkScores = frameworks.map(framework => {
      const frameworkAudits = audits.filter(audit => audit.frameworkId === framework.id);
      if (frameworkAudits.length === 0) return 0;
      
      const latestAudit = frameworkAudits.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
      return latestAudit.score;
    });

    return Math.round(frameworkScores.reduce((sum, score) => sum + score, 0) / frameworkScores.length);
  }

  private calculateComplianceRate(frameworks: ComplianceFramework[]): number {
    if (frameworks.length === 0) return 0;

    const activeFrameworks = frameworks.filter(f => f.status === 'active');
    return Math.round((activeFrameworks.length / frameworks.length) * 100);
  }
}
