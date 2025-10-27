import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StandardizedDatabaseService } from '../../core/database/standardized-database.service';
import { AuditLoggingService } from '../../common/services/audit-logging.service';

export interface DataSubjectRequest {
  id: string;
  userId: string;
  type: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction';
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  requestDate: Date;
  completionDate?: Date;
  reason?: string;
  data?: any;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  granted: boolean;
  grantedAt?: Date;
  withdrawnAt?: Date;
  version: string;
  legalBasis: 'consent' | 'contract' | 'legal_obligation' | 'vital_interests' | 'public_task' | 'legitimate_interests';
}

export interface DataRetentionPolicy {
  dataType: string;
  retentionPeriod: number; // days
  legalBasis: string;
  autoDelete: boolean;
  anonymizationRequired: boolean;
}

@Injectable()
export class GdprService {
  private readonly logger = new Logger(GdprService.name);
  private readonly retentionPolicies: DataRetentionPolicy[];

  constructor(
    private configService: ConfigService,
    private databaseService: StandardizedDatabaseService,
    private auditService: AuditLoggingService
  ) {
    this.retentionPolicies = this.loadRetentionPolicies();
  }

  async createDataSubjectRequest(request: Omit<DataSubjectRequest, 'id' | 'requestDate'>): Promise<DataSubjectRequest> {
    const dsr: DataSubjectRequest = {
      id: this.generateRequestId(),
      ...request,
      requestDate: new Date(),
      status: 'pending'
    };

    await this.databaseService.insert('data_subject_requests', dsr);
    
    this.auditService.log({
      action: 'dsr_created',
      resource: 'data_subject_request',
      resourceId: dsr.id,
      userId: dsr.userId,
      metadata: { type: dsr.type }
    });

    this.logger.log(`Data Subject Request created: ${dsr.id} for user: ${dsr.userId}`);
    return dsr;
  }

  async processDataSubjectRequest(requestId: string, userId: string): Promise<any> {
    const request = await this.databaseService.findOne('data_subject_requests', { id: requestId });
    
    if (!request) {
      throw new Error('Data Subject Request not found');
    }

    if (request.userId !== userId) {
      throw new Error('Unauthorized access to Data Subject Request');
    }

    await this.databaseService.update('data_subject_requests', 
      { id: requestId }, 
      { status: 'processing' }
    );

    let result;

    switch (request.type) {
      case 'access':
        result = await this.processAccessRequest(userId);
        break;
      case 'rectification':
        result = await this.processRectificationRequest(userId, request.data);
        break;
      case 'erasure':
        result = await this.processErasureRequest(userId);
        break;
      case 'portability':
        result = await this.processPortabilityRequest(userId);
        break;
      case 'restriction':
        result = await this.processRestrictionRequest(userId, request.data);
        break;
      default:
        throw new Error('Invalid request type');
    }

    await this.databaseService.update('data_subject_requests', 
      { id: requestId }, 
      { 
        status: 'completed',
        completionDate: new Date(),
        data: result
      }
    );

    this.auditService.log({
      action: 'dsr_processed',
      resource: 'data_subject_request',
      resourceId: requestId,
      userId,
      metadata: { type: request.type }
    });

    return result;
  }

  private async processAccessRequest(userId: string): Promise<any> {
    const userData = await this.collectUserData(userId);
    return {
      personalData: userData,
      processingPurposes: await this.getProcessingPurposes(userId),
      dataRetention: await this.getDataRetentionInfo(userId),
      rights: this.getDataSubjectRights()
    };
  }

  private async processRectificationRequest(userId: string, correctionData: any): Promise<any> {
    const updatedFields = [];
    
    for (const [field, value] of Object.entries(correctionData)) {
      if (this.isValidField(field)) {
        await this.databaseService.update('users', 
          { id: userId }, 
          { [field]: value }
        );
        updatedFields.push(field);
      }
    }

    this.auditService.log({
      action: 'data_rectified',
      resource: 'user',
      resourceId: userId,
      userId,
      metadata: { fields: updatedFields }
    });

    return { updatedFields, timestamp: new Date() };
  }

  private async processErasureRequest(userId: string): Promise<any> {
    // Check if erasure is legally possible
    const canErase = await this.canEraseUserData(userId);
    
    if (!canErase.allowed) {
      throw new Error(`Data erasure not allowed: ${canErase.reason}`);
    }

    // Anonymize instead of delete for legal compliance
    await this.anonymizeUserData(userId);
    
    this.auditService.log({
      action: 'data_erased',
      resource: 'user',
      resourceId: userId,
      userId,
      metadata: { method: 'anonymization' }
    });

    return { status: 'anonymized', timestamp: new Date() };
  }

  private async processPortabilityRequest(userId: string): Promise<any> {
    const userData = await this.collectUserData(userId);
    const exportData = {
      personalData: userData,
      exportDate: new Date(),
      format: 'JSON',
      version: '1.0'
    };

    this.auditService.log({
      action: 'data_exported',
      resource: 'user',
      resourceId: userId,
      userId,
      metadata: { format: 'JSON' }
    });

    return exportData;
  }

  private async processRestrictionRequest(userId: string, restrictionData: any): Promise<any> {
    await this.databaseService.update('users', 
      { id: userId }, 
      { 
        processingRestricted: true,
        restrictionReason: restrictionData.reason,
        restrictionDate: new Date()
      }
    );

    this.auditService.log({
      action: 'processing_restricted',
      resource: 'user',
      resourceId: userId,
      userId,
      metadata: { reason: restrictionData.reason }
    });

    return { status: 'restricted', timestamp: new Date() };
  }

  async recordConsent(consent: Omit<ConsentRecord, 'id'>): Promise<ConsentRecord> {
    const consentRecord: ConsentRecord = {
      id: this.generateConsentId(),
      ...consent,
      grantedAt: consent.granted ? new Date() : undefined
    };

    await this.databaseService.insert('consent_records', consentRecord);
    
    this.auditService.log({
      action: 'consent_recorded',
      resource: 'consent',
      resourceId: consentRecord.id,
      userId: consentRecord.userId,
      metadata: { 
        purpose: consentRecord.purpose,
        granted: consentRecord.granted 
      }
    });

    return consentRecord;
  }

  async withdrawConsent(consentId: string, userId: string): Promise<void> {
    await this.databaseService.update('consent_records', 
      { id: consentId, userId }, 
      { 
        granted: false,
        withdrawnAt: new Date()
      }
    );

    this.auditService.log({
      action: 'consent_withdrawn',
      resource: 'consent',
      resourceId: consentId,
      userId,
      metadata: {}
    });
  }

  async applyDataRetentionPolicies(): Promise<void> {
    for (const policy of this.retentionPolicies) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retentionPeriod);

      if (policy.autoDelete) {
        await this.databaseService.delete(policy.dataType, {
          createdAt: { $lt: cutoffDate }
        });
      } else if (policy.anonymizationRequired) {
        await this.anonymizeOldData(policy.dataType, cutoffDate);
      }
    }
  }

  private async collectUserData(userId: string): Promise<any> {
    const user = await this.databaseService.findOne('users', { id: userId });
    const profile = await this.databaseService.findOne('user_profiles', { userId });
    const activities = await this.databaseService.find('user_activities', { userId });
    const preferences = await this.databaseService.findOne('user_preferences', { userId });

    return {
      personalInfo: {
        name: user?.name,
        email: user?.email,
        phone: profile?.phone,
        address: profile?.address
      },
      activities: activities.map(a => ({
        action: a.action,
        timestamp: a.timestamp,
        resource: a.resource
      })),
      preferences: preferences
    };
  }

  private async getProcessingPurposes(userId: string): Promise<string[]> {
    return [
      'Service delivery and account management',
      'Communication and support',
      'Analytics and service improvement',
      'Legal compliance and fraud prevention'
    ];
  }

  private async getDataRetentionInfo(userId: string): Promise<any> {
    return {
      accountData: 'Retained while account is active',
      activityLogs: 'Retained for 2 years',
      communicationData: 'Retained for 1 year',
      legalData: 'Retained as required by law'
    };
  }

  private getDataSubjectRights(): string[] {
    return [
      'Right to access your personal data',
      'Right to rectification of inaccurate data',
      'Right to erasure (right to be forgotten)',
      'Right to restrict processing',
      'Right to data portability',
      'Right to object to processing',
      'Rights related to automated decision making'
    ];
  }

  private async canEraseUserData(userId: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check for legal obligations
    const hasActiveContracts = await this.databaseService.count('contracts', { userId, status: 'active' });
    if (hasActiveContracts > 0) {
      return { allowed: false, reason: 'Active contracts require data retention' };
    }

    const hasLegalObligations = await this.databaseService.count('legal_obligations', { userId });
    if (hasLegalObligations > 0) {
      return { allowed: false, reason: 'Legal obligations require data retention' };
    }

    return { allowed: true };
  }

  private async anonymizeUserData(userId: string): Promise<void> {
    const anonymizedData = {
      name: 'ANONYMIZED',
      email: `anonymized_${userId}@deleted.local`,
      phone: 'ANONYMIZED',
      address: 'ANONYMIZED',
      anonymizedAt: new Date()
    };

    await this.databaseService.update('users', { id: userId }, anonymizedData);
  }

  private async anonymizeOldData(dataType: string, cutoffDate: Date): Promise<void> {
    // Implementation for anonymizing old data
    this.logger.log(`Anonymizing old data for ${dataType} before ${cutoffDate}`);
  }

  private loadRetentionPolicies(): DataRetentionPolicy[] {
    return [
      {
        dataType: 'user_activities',
        retentionPeriod: 730, // 2 years
        legalBasis: 'Legitimate interest for security and fraud prevention',
        autoDelete: false,
        anonymizationRequired: true
      },
      {
        dataType: 'audit_logs',
        retentionPeriod: 2555, // 7 years
        legalBasis: 'Legal obligation for financial records',
        autoDelete: false,
        anonymizationRequired: false
      },
      {
        dataType: 'temp_data',
        retentionPeriod: 30,
        legalBasis: 'Technical necessity',
        autoDelete: true,
        anonymizationRequired: false
      }
    ];
  }

  private generateRequestId(): string {
    return `dsr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isValidField(field: string): boolean {
    const allowedFields = ['name', 'email', 'phone', 'address'];
    return allowedFields.includes(field);
  }
}
