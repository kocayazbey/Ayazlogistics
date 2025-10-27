import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface PackagingRule {
  id: string;
  customerId: string;
  productId?: string;
  productCategory?: string;
  ruleName: string;
  ruleType: 'mandatory' | 'preferred' | 'optional';
  packagingRequirements: {
    boxType?: string;
    boxDimensions?: { length: number; width: number; height: number };
    maxWeight?: number;
    paddingMaterial?: string;
    labelRequirements?: string[];
    specialInstructions?: string;
    insertDocuments?: string[];
    giftWrap?: boolean;
    customBranding?: boolean;
    fragilHandling?: boolean;
    orientationMarking?: boolean;
  };
  priority: number;
  isActive: boolean;
}

@Injectable()
export class CustomerPackagingRulesService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createPackagingRule(
    rule: Omit<PackagingRule, 'id'>,
    tenantId: string,
    userId: string,
  ): Promise<PackagingRule> {
    const ruleId = `PKG-RULE-${Date.now()}`;

    const fullRule: PackagingRule = {
      id: ruleId,
      ...rule,
    };

    await this.eventBus.emit('packaging.rule.created', {
      ruleId,
      customerId: rule.customerId,
      ruleName: rule.ruleName,
      tenantId,
    });

    return fullRule;
  }

  async getPackagingRules(
    customerId: string,
    productId?: string,
    tenantId?: string,
  ): Promise<PackagingRule[]> {
    // Mock: Would query packaging_rules table
    return [];
  }

  async getApplicableRules(
    customerId: string,
    productId: string,
    productCategory: string,
    tenantId: string,
  ): Promise<PackagingRule[]> {
    const allRules = await this.getPackagingRules(customerId, productId, tenantId);

    const applicableRules = allRules
      .filter(rule => 
        !rule.productId || rule.productId === productId ||
        !rule.productCategory || rule.productCategory === productCategory
      )
      .sort((a, b) => b.priority - a.priority);

    return applicableRules;
  }

  async validatePackaging(
    packagingData: {
      customerId: string;
      productId: string;
      productCategory: string;
      boxType: string;
      weight: number;
      dimensions: { length: number; width: number; height: number };
      labels: string[];
    },
    tenantId: string,
  ): Promise<{ valid: boolean; violations: string[]; warnings: string[] }> {
    const rules = await this.getApplicableRules(
      packagingData.customerId,
      packagingData.productId,
      packagingData.productCategory,
      tenantId,
    );

    const violations: string[] = [];
    const warnings: string[] = [];

    for (const rule of rules) {
      if (rule.ruleType === 'mandatory') {
        if (rule.packagingRequirements.boxType && 
            rule.packagingRequirements.boxType !== packagingData.boxType) {
          violations.push(`Box type must be ${rule.packagingRequirements.boxType}`);
        }

        if (rule.packagingRequirements.maxWeight && 
            packagingData.weight > rule.packagingRequirements.maxWeight) {
          violations.push(`Weight exceeds maximum of ${rule.packagingRequirements.maxWeight}kg`);
        }

        if (rule.packagingRequirements.labelRequirements) {
          const missingLabels = rule.packagingRequirements.labelRequirements.filter(
            reqLabel => !packagingData.labels.includes(reqLabel)
          );
          if (missingLabels.length > 0) {
            violations.push(`Missing required labels: ${missingLabels.join(', ')}`);
          }
        }
      } else if (rule.ruleType === 'preferred') {
        if (rule.packagingRequirements.boxType && 
            rule.packagingRequirements.boxType !== packagingData.boxType) {
          warnings.push(`Preferred box type is ${rule.packagingRequirements.boxType}`);
        }
      }
    }

    return {
      valid: violations.length === 0,
      violations,
      warnings,
    };
  }

  async getPackagingInstructions(
    customerId: string,
    orderId: string,
    tenantId: string,
  ): Promise<any> {
    return {
      orderId,
      customerId,
      instructions: [],
      specialRequirements: [],
      documents: [],
    };
  }

  async recordPackagingCompliance(
    packagingData: {
      orderId: string;
      customerId: string;
      compliant: boolean;
      violations: string[];
      correctionsTaken?: string[];
    },
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.eventBus.emit('packaging.compliance.recorded', {
      orderId: packagingData.orderId,
      customerId: packagingData.customerId,
      compliant: packagingData.compliant,
      violationCount: packagingData.violations.length,
      tenantId,
    });
  }

  async getPackagingComplianceReport(
    customerId: string,
    startDate: Date,
    endDate: Date,
    tenantId: string,
  ): Promise<any> {
    return {
      customerId,
      period: { startDate, endDate },
      summary: {
        totalOrders: 0,
        compliantOrders: 0,
        complianceRate: 0,
        violationCount: 0,
      },
      topViolations: [],
      trends: [],
    };
  }
}

