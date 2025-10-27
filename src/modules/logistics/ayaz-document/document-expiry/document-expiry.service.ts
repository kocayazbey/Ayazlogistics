import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface ExpiringDocument {
  documentId: string;
  documentType: string;
  expiryDate: Date;
  daysUntilExpiry: number;
  renewalRequired: boolean;
  responsiblePerson?: string;
}

@Injectable()
export class DocumentExpiryService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async trackDocumentExpiry(
    documentId: string,
    expiryDate: Date,
    tenantId: string,
  ): Promise<void> {
    await this.eventBus.emit('document.expiry.tracked', {
      documentId,
      expiryDate,
      tenantId,
    });
  }

  async getExpiringDocuments(
    daysAhead: number,
    tenantId: string,
  ): Promise<ExpiringDocument[]> {
    // Mock: Would query documents expiring within X days
    return [];
  }

  async sendExpiryReminders(tenantId: string): Promise<number> {
    const expiringDocs = await this.getExpiringDocuments(30, tenantId);

    for (const doc of expiringDocs) {
      if (doc.daysUntilExpiry <= 30) {
        await this.eventBus.emit('document.expiry.reminder', {
          documentId: doc.documentId,
          daysUntilExpiry: doc.daysUntilExpiry,
          responsiblePerson: doc.responsiblePerson,
          tenantId,
        });
      }
    }

    return expiringDocs.length;
  }
}

