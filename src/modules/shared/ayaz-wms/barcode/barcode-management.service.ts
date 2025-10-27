import { Injectable, Inject, BadRequestException } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

@Injectable()
export class BarcodeManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createBarcodeStructure(data: any, tenantId: string) {
    const structureId = `BS-${Date.now()}`;
    await this.eventBus.emit('barcode.structure.created', { structureId, tenantId });
    return { id: structureId, ...data, tenantId };
  }

  async getBarcodeStructures(tenantId: string) {
    return [
      { id: '1', name: 'EAN-13', pattern: '^[0-9]{13}$', type: 'product' },
      { id: '2', name: 'Code128', pattern: '^[A-Z0-9]{8,}$', type: 'pallet' },
      { id: '3', name: 'QR-Location', pattern: '^LOC-[A-Z0-9]{6}$', type: 'location' },
    ];
  }

  async validateBarcode(barcode: string, structureId: string) {
    const structure = await this.getBarcodeStructures('tenant');
    const found = structure.find(s => s.id === structureId);
    if (!found) throw new BadRequestException('Invalid structure');
    const regex = new RegExp(found.pattern);
    return { valid: regex.test(barcode), structure: found };
  }

  async parseBarcode(barcode: string) {
    return { barcode, parsed: { type: 'unknown', data: {} } };
  }

  async getLabelTemplates(tenantId: string) {
    return [
      { id: '1', name: 'Pallet Label', type: 'pallet', format: 'ZPL' },
      { id: '2', name: 'Location Label', type: 'location', format: 'ZPL' },
      { id: '3', name: 'Product Label', type: 'product', format: 'ZPL' },
    ];
  }

  async createLabelTemplate(data: any, tenantId: string) {
    return { id: `TPL-${Date.now()}`, ...data, tenantId };
  }

  async generateBarcode(data: any) {
    return { barcode: `GEN-${Date.now()}`, format: data.format || 'Code128' };
  }
}

