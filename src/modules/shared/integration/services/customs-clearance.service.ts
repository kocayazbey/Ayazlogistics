import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface CustomsDeclaration {
  id: string;
  declarationType: 'import' | 'export' | 'transit';
  customsRegime: string;
  hsCode: string;
  originCountry: string;
  destinationCountry: string;
  goodsValue: number;
  currency: string;
  weight: number;
  status: 'draft' | 'submitted' | 'under_review' | 'cleared' | 'rejected';
}

@Injectable()
export class CustomsClearanceService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async submitCustomsDeclaration(
    declaration: Omit<CustomsDeclaration, 'id' | 'status'>,
    tenantId: string,
  ): Promise<CustomsDeclaration> {
    const declarationId = `CSD-${Date.now()}`;

    const customsDeclaration: CustomsDeclaration = {
      id: declarationId,
      ...declaration,
      status: 'submitted',
    };

    await this.eventBus.emit('customs.declaration.submitted', {
      declarationId,
      type: declaration.declarationType,
      tenantId,
    });

    return customsDeclaration;
  }

  async calculateDuties(
    hsCode: string,
    originCountry: string,
    value: number,
    tenantId: string,
  ): Promise<{
    customsDuty: number;
    vat: number;
    otherTaxes: number;
    totalDuties: number;
  }> {
    return {
      customsDuty: value * 0.05,
      vat: value * 0.18,
      otherTaxes: value * 0.02,
      totalDuties: value * 0.25,
    };
  }
}

