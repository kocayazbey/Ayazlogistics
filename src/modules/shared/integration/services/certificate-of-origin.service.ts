import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface CertificateOfOrigin {
  id: string;
  certificateNumber: string;
  exporter: {
    name: string;
    address: string;
    country: string;
  };
  consignee: {
    name: string;
    address: string;
    country: string;
  };
  goods: Array<{
    description: string;
    hsCode: string;
    quantity: number;
    originCountry: string;
  }>;
  issuedDate: Date;
  issuedBy: string;
  status: 'draft' | 'issued' | 'verified' | 'rejected';
}

@Injectable()
export class CertificateOfOriginService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createCertificate(
    certificate: Omit<CertificateOfOrigin, 'id' | 'status' | 'issuedDate'>,
    tenantId: string,
  ): Promise<CertificateOfOrigin> {
    const certId = `COO-${Date.now()}`;

    const newCertificate: CertificateOfOrigin = {
      id: certId,
      ...certificate,
      issuedDate: new Date(),
      status: 'draft',
    };

    await this.eventBus.emit('certificate.origin.created', {
      certId,
      exporterCountry: certificate.exporter.country,
      consigneeCountry: certificate.consignee.country,
      tenantId,
    });

    return newCertificate;
  }

  async issueCertificate(certId: string, tenantId: string): Promise<void> {
    await this.eventBus.emit('certificate.origin.issued', {
      certId,
      issuedAt: new Date(),
      tenantId,
    });
  }
}

