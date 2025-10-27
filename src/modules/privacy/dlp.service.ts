import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StandardizedDatabaseService } from '../../core/database/standardized-database.service';

export interface PIIPattern {
  name: string;
  pattern: RegExp;
  type: 'email' | 'phone' | 'ssn' | 'credit_card' | 'iban' | 'address' | 'name';
  sensitivity: 'low' | 'medium' | 'high' | 'critical';
  masking: string;
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted';
  description: string;
  handlingRequirements: string[];
  retentionPeriod: number;
}

export interface DataLossIncident {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  dataType: string;
  affectedRecords: number;
  description: string;
  status: 'detected' | 'investigating' | 'contained' | 'resolved';
  remediation: string[];
}

@Injectable()
export class DlpService {
  private readonly logger = new Logger(DlpService.name);
  private readonly piiPatterns: PIIPattern[];
  private readonly dataClassifications: Map<string, DataClassification>;

  constructor(
    private configService: ConfigService,
    private databaseService: StandardizedDatabaseService
  ) {
    this.piiPatterns = this.initializePIIPatterns();
    this.dataClassifications = this.initializeDataClassifications();
  }

  async scanForPII(content: string, context?: string): Promise<{
    detected: PIIPattern[];
    masked: string;
    riskScore: number;
  }> {
    const detected: PIIPattern[] = [];
    let maskedContent = content;

    for (const pattern of this.piiPatterns) {
      const matches = content.match(pattern.pattern);
      if (matches) {
        detected.push(pattern);
        maskedContent = this.maskPII(maskedContent, pattern);
      }
    }

    const riskScore = this.calculateRiskScore(detected);
    
    this.logger.log(`PII scan completed. Detected: ${detected.length} patterns, Risk Score: ${riskScore}`);

    return {
      detected,
      masked: maskedContent,
      riskScore
    };
  }

  async classifyData(data: any, context: string): Promise<DataClassification> {
    const classification = this.determineClassification(data, context);
    
    this.logger.log(`Data classified as: ${classification.level} for context: ${context}`);
    
    return classification;
  }

  async detectDataLoss(data: any, context: string): Promise<DataLossIncident | null> {
    const riskIndicators = await this.analyzeRiskIndicators(data, context);
    
    if (riskIndicators.score > 70) {
      const incident = await this.createDataLossIncident(riskIndicators);
      this.logger.warn(`Data loss incident detected: ${incident.id}`);
      return incident;
    }

    return null;
  }

  async maskSensitiveData(data: any): Promise<any> {
    if (typeof data === 'string') {
      return this.maskStringData(data);
    }

    if (typeof data === 'object' && data !== null) {
      const masked = { ...data };
      
      for (const [key, value] of Object.entries(masked)) {
        if (typeof value === 'string') {
          masked[key] = this.maskStringData(value);
        } else if (typeof value === 'object') {
          masked[key] = await this.maskSensitiveData(value);
        }
      }
      
      return masked;
    }

    return data;
  }

  async auditDataAccess(userId: string, resource: string, action: string): Promise<void> {
    await this.databaseService.insert('data_access_audit', {
      userId,
      resource,
      action,
      timestamp: new Date(),
      ipAddress: 'unknown', // Would be populated from request context
      userAgent: 'unknown'
    });

    this.logger.log(`Data access audited: ${action} on ${resource} by ${userId}`);
  }

  async generateDataInventory(): Promise<any> {
    const inventory = {
      dataTypes: [],
      dataFlows: [],
      storageLocations: [],
      processingPurposes: [],
      retentionPolicies: []
    };

    // Scan database for data types
    const tables = await this.databaseService.getTables();
    for (const table of tables) {
      const schema = await this.databaseService.getTableSchema(table);
      inventory.dataTypes.push({
        name: table,
        fields: schema.fields,
        classification: this.classifyTableData(table)
      });
    }

    return inventory;
  }

  private initializePIIPatterns(): PIIPattern[] {
    return [
      {
        name: 'Email Address',
        pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
        type: 'email',
        sensitivity: 'medium',
        masking: '***@***.***'
      },
      {
        name: 'Turkish Phone Number',
        pattern: /(\+90|0)?[5][0-9]{9}/g,
        type: 'phone',
        sensitivity: 'high',
        masking: '***-***-****'
      },
      {
        name: 'Turkish ID Number',
        pattern: /\b[1-9][0-9]{10}\b/g,
        type: 'ssn',
        sensitivity: 'critical',
        masking: '***-***-****'
      },
      {
        name: 'Credit Card Number',
        pattern: /\b[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}[-\s]?[0-9]{4}\b/g,
        type: 'credit_card',
        sensitivity: 'critical',
        masking: '****-****-****-****'
      },
      {
        name: 'IBAN',
        pattern: /\bTR[0-9]{2}[0-9]{4}[0-9]{16}\b/g,
        type: 'iban',
        sensitivity: 'critical',
        masking: 'TR**-****-****-****-****-****'
      }
    ];
  }

  private initializeDataClassifications(): Map<string, DataClassification> {
    const classifications = new Map();
    
    classifications.set('user_personal_data', {
      level: 'confidential',
      description: 'Personal information of users',
      handlingRequirements: ['Encryption at rest', 'Access logging', 'Consent management'],
      retentionPeriod: 2555 // 7 years
    });

    classifications.set('financial_data', {
      level: 'restricted',
      description: 'Financial and payment information',
      handlingRequirements: ['PCI DSS compliance', 'Encryption in transit and at rest', 'Audit logging'],
      retentionPeriod: 2555 // 7 years
    });

    classifications.set('operational_data', {
      level: 'internal',
      description: 'Business operations and logistics data',
      handlingRequirements: ['Access control', 'Regular backups'],
      retentionPeriod: 1095 // 3 years
    });

    return classifications;
  }

  private maskPII(content: string, pattern: PIIPattern): string {
    return content.replace(pattern.pattern, pattern.masking);
  }

  private calculateRiskScore(detected: PIIPattern[]): number {
    const weights = {
      low: 1,
      medium: 3,
      high: 7,
      critical: 10
    };

    const totalWeight = detected.reduce((sum, pattern) => sum + weights[pattern.sensitivity], 0);
    const maxPossibleWeight = detected.length * 10;
    
    return maxPossibleWeight > 0 ? (totalWeight / maxPossibleWeight) * 100 : 0;
  }

  private determineClassification(data: any, context: string): DataClassification {
    // Simple classification logic - would be more sophisticated in production
    if (context.includes('financial') || context.includes('payment')) {
      return this.dataClassifications.get('financial_data');
    }
    
    if (context.includes('user') || context.includes('personal')) {
      return this.dataClassifications.get('user_personal_data');
    }
    
    return this.dataClassifications.get('operational_data');
  }

  private async analyzeRiskIndicators(data: any, context: string): Promise<{
    score: number;
    indicators: string[];
  }> {
    const indicators: string[] = [];
    let score = 0;

    // Check for sensitive data patterns
    const piiScan = await this.scanForPII(JSON.stringify(data));
    if (piiScan.detected.length > 0) {
      indicators.push('PII detected in data');
      score += 30;
    }

    // Check for unusual data access patterns
    if (context.includes('bulk_export') || context.includes('mass_download')) {
      indicators.push('Bulk data access detected');
      score += 40;
    }

    // Check for data volume
    const dataSize = JSON.stringify(data).length;
    if (dataSize > 1000000) { // 1MB
      indicators.push('Large data volume detected');
      score += 20;
    }

    return { score, indicators };
  }

  private async createDataLossIncident(riskIndicators: any): Promise<DataLossIncident> {
    const incident: DataLossIncident = {
      id: `dlp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      severity: riskIndicators.score > 90 ? 'critical' : riskIndicators.score > 70 ? 'high' : 'medium',
      dataType: 'mixed',
      affectedRecords: 0,
      description: `Data loss risk detected: ${riskIndicators.indicators.join(', ')}`,
      status: 'detected',
      remediation: [
        'Immediate data access review',
        'User notification if required',
        'Security team investigation',
        'Remediation plan implementation'
      ]
    };

    await this.databaseService.insert('data_loss_incidents', incident);
    return incident;
  }

  private maskStringData(content: string): string {
    let masked = content;
    
    for (const pattern of this.piiPatterns) {
      masked = masked.replace(pattern.pattern, pattern.masking);
    }
    
    return masked;
  }

  private classifyTableData(tableName: string): string {
    if (tableName.includes('user') || tableName.includes('profile')) {
      return 'confidential';
    }
    
    if (tableName.includes('payment') || tableName.includes('financial')) {
      return 'restricted';
    }
    
    return 'internal';
  }
}
