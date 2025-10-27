import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface CustomsDeclaration {
  id: string;
  shipmentId: string;
  declarationType: 'import' | 'export' | 'transit';
  country: string;
  hsCode: string;
  commodityDescription: string;
  value: number;
  currency: string;
  quantity: number;
  weight: number;
  status: 'draft' | 'submitted' | 'under_review' | 'cleared' | 'held' | 'rejected';
  submittedAt?: Date;
  clearedAt?: Date;
}

interface CustomsDocument {
  type: string;
  required: boolean;
  uploaded: boolean;
  validUntil?: Date;
}

@Injectable()
export class CustomsClearanceService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createDeclaration(data: Partial<CustomsDeclaration>): Promise<CustomsDeclaration> {
    const declaration: CustomsDeclaration = {
      id: `CUSTOMS-${Date.now()}`,
      shipmentId: data.shipmentId!,
      declarationType: data.declarationType!,
      country: data.country!,
      hsCode: data.hsCode!,
      commodityDescription: data.commodityDescription!,
      value: data.value!,
      currency: data.currency || 'USD',
      quantity: data.quantity!,
      weight: data.weight!,
      status: 'draft'
    };

    await this.eventBus.publish('customs.declaration.created', {
      declarationId: declaration.id,
      shipmentId: declaration.shipmentId
    });

    return declaration;
  }

  async submitDeclaration(declarationId: string): Promise<CustomsDeclaration> {
    const declaration = await this.getDeclaration(declarationId);
    
    declaration.status = 'submitted';
    declaration.submittedAt = new Date();

    await this.eventBus.publish('customs.declaration.submitted', {
      declarationId,
      submittedAt: declaration.submittedAt
    });

    return declaration;
  }

  async calculateDutiesAndTaxes(declaration: CustomsDeclaration): Promise<any> {
    const dutyRate = this.getDutyRate(declaration.hsCode, declaration.country);
    const dutyAmount = declaration.value * dutyRate;
    
    const vatRate = 0.20;
    const vatBase = declaration.value + dutyAmount;
    const vatAmount = vatBase * vatRate;

    return {
      declarationId: declaration.id,
      customsValue: declaration.value,
      currency: declaration.currency,
      duties: {
        rate: dutyRate * 100,
        amount: dutyAmount
      },
      vat: {
        rate: vatRate * 100,
        base: vatBase,
        amount: vatAmount
      },
      totalTaxes: dutyAmount + vatAmount,
      totalPayable: declaration.value + dutyAmount + vatAmount
    };
  }

  private getDutyRate(hsCode: string, country: string): number {
    const rates: Record<string, number> = {
      '8471': 0.00,
      '6203': 0.12,
      '8528': 0.14,
      '9403': 0.00
    };

    const category = hsCode.substring(0, 4);
    return rates[category] || 0.05;
  }

  async getRequiredDocuments(declaration: CustomsDeclaration): Promise<CustomsDocument[]> {
    const baseDocuments: CustomsDocument[] = [
      { type: 'Commercial Invoice', required: true, uploaded: false },
      { type: 'Packing List', required: true, uploaded: false },
      { type: 'Bill of Lading/AWB', required: true, uploaded: false },
      { type: 'Certificate of Origin', required: false, uploaded: false }
    ];

    if (declaration.declarationType === 'import') {
      baseDocuments.push(
        { type: 'Import License', required: true, uploaded: false },
        { type: 'Customs Declaration Form', required: true, uploaded: false }
      );
    }

    if (declaration.declarationType === 'export') {
      baseDocuments.push(
        { type: 'Export License', required: false, uploaded: false },
        { type: 'Export Declaration', required: true, uploaded: false }
      );
    }

    return baseDocuments;
  }

  async trackCustomsStatus(shipmentId: string): Promise<any> {
    return {
      shipmentId,
      declarations: [
        {
          id: 'CUSTOMS-001',
          type: 'export',
          country: 'Turkey',
          status: 'cleared',
          submittedAt: new Date('2024-10-20'),
          clearedAt: new Date('2024-10-21'),
          duration: 24
        },
        {
          id: 'CUSTOMS-002',
          type: 'import',
          country: 'Germany',
          status: 'under_review',
          submittedAt: new Date('2024-10-23'),
          estimatedClearance: new Date('2024-10-25'),
          duration: null
        }
      ],
      overallStatus: 'in_progress',
      blockers: [],
      estimatedCompletion: new Date('2024-10-25')
    };
  }

  async getCustomsClearanceReport(startDate: Date, endDate: Date): Promise<any> {
    return {
      period: { startDate, endDate },
      totalDeclarations: 156,
      cleared: 142,
      pending: 10,
      held: 3,
      rejected: 1,
      averageClearanceTime: 28.5,
      totalDutiesPaid: 245000,
      totalVatPaid: 458000,
      clearanceRate: 91.0,
      complianceScore: 96
    };
  }
}

