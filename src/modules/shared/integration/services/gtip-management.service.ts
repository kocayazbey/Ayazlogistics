import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface GTIPCode {
  id: string;
  gtipCode: string;
  hsCode: string;
  description: string;
  dutyRate: number;
  vatRate: number;
  unit: string;
  restrictions?: string[];
}

@Injectable()
export class GTIPManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
  ) {}

  async searchGTIPCode(keyword: string, tenantId: string): Promise<GTIPCode[]> {
    try {
      // Import GTIP schema
      const { gtipCodes } = await import('../../../../database/schema/shared/integration.schema');
      const { ilike, or } = await import('drizzle-orm');

      const results = await this.db
        .select()
        .from(gtipCodes)
        .where(
          or(
            ilike(gtipCodes.gtipCode, `%${keyword}%`),
            ilike(gtipCodes.description, `%${keyword}%`),
            ilike(gtipCodes.hsCode, `%${keyword}%`)
          )
        )
        .limit(50);

      return results.map(gtip => ({
        id: gtip.id,
        gtipCode: gtip.gtipCode,
        hsCode: gtip.hsCode,
        description: gtip.description,
        dutyRate: gtip.dutyRate,
        vatRate: gtip.vatRate,
        unit: gtip.unit,
        restrictions: gtip.restrictions || []
      }));
    } catch (error) {
      console.error('Error searching GTIP codes:', error);
      return [];
    }
  }

  async getGTIPDetails(gtipCode: string, tenantId: string): Promise<GTIPCode | null> {
    try {
      // Import GTIP schema
      const { gtipCodes } = await import('../../../../database/schema/shared/integration.schema');
      const { eq } = await import('drizzle-orm');

      const result = await this.db
        .select()
        .from(gtipCodes)
        .where(eq(gtipCodes.gtipCode, gtipCode))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const gtip = result[0];
      return {
        id: gtip.id,
        gtipCode: gtip.gtipCode,
        hsCode: gtip.hsCode,
        description: gtip.description,
        dutyRate: gtip.dutyRate,
        vatRate: gtip.vatRate,
        unit: gtip.unit,
        restrictions: gtip.restrictions || []
      };
    } catch (error) {
      console.error('Error getting GTIP details:', error);
      return null;
    }
  }

  async calculateImportDuties(
    gtipCode: string,
    value: number,
    weight: number,
    tenantId: string,
  ): Promise<{
    customsDuty: number;
    vat: number;
    totalTax: number;
  }> {
    const gtip = await this.getGTIPDetails(gtipCode, tenantId);

    const customsDuty = value * ((gtip?.dutyRate || 0) / 100);
    const vat = (value + customsDuty) * ((gtip?.vatRate || 0) / 100);

    return {
      customsDuty,
      vat,
      totalTax: customsDuty + vat,
    };
  }
}

