import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface ExpiringDocument {
  id: string;
  type: string;
  name: string;
  expiryDate: Date;
  ownerId: string;
  status: 'valid' | 'expiring_soon' | 'expired';
  daysUntilExpiry: number;
  renewalRequired: boolean;
}

@Injectable()
export class DocumentExpiryTrackingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async trackDocuments(tenantId: string): Promise<ExpiringDocument[]> {
    const documents = await this.getAllDocuments(tenantId);
    const now = new Date();

    return documents.map(doc => {
      const daysUntilExpiry = Math.floor((doc.expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      let status: 'valid' | 'expiring_soon' | 'expired' = 'valid';
      if (daysUntilExpiry < 0) status = 'expired';
      else if (daysUntilExpiry <= 30) status = 'expiring_soon';

      return {
        ...doc,
        daysUntilExpiry,
        status,
      };
    });
  }

  async sendExpiryNotifications(tenantId: string): Promise<void> {
    const documents = await this.trackDocuments(tenantId);
    
    const expiringSoon = documents.filter(d => d.status === 'expiring_soon');
    const expired = documents.filter(d => d.status === 'expired');

    for (const doc of expiringSoon) {
      await this.eventBus.publish('document.expiring_soon', {
        documentId: doc.id,
        type: doc.type,
        ownerId: doc.ownerId,
        daysUntilExpiry: doc.daysUntilExpiry,
      });
    }

    for (const doc of expired) {
      await this.eventBus.publish('document.expired', {
        documentId: doc.id,
        type: doc.type,
        ownerId: doc.ownerId,
      });
    }
  }

  private async getAllDocuments(tenantId: string): Promise<any[]> {
    return [
      {
        id: 'doc-001',
        type: 'insurance_policy',
        name: 'Cargo Insurance Policy',
        expiryDate: new Date('2024-12-31'),
        ownerId: 'tenant-1',
        renewalRequired: true,
      },
      {
        id: 'doc-002',
        type: 'license',
        name: 'Operating License',
        expiryDate: new Date('2025-06-30'),
        ownerId: 'tenant-1',
        renewalRequired: true,
      },
    ];
  }

  async getExpiryReport(tenantId: string): Promise<any> {
    const documents = await this.trackDocuments(tenantId);

    return {
      total: documents.length,
      valid: documents.filter(d => d.status === 'valid').length,
      expiringSoon: documents.filter(d => d.status === 'expiring_soon').length,
      expired: documents.filter(d => d.status === 'expired').length,
      byType: this.groupByType(documents),
    };
  }

  private groupByType(documents: ExpiringDocument[]): any {
    const grouped = new Map();
    documents.forEach(doc => {
      if (!grouped.has(doc.type)) {
        grouped.set(doc.type, []);
      }
      grouped.get(doc.type).push(doc);
    });
    return Object.fromEntries(grouped);
  }
}

