import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface Chargeback {
  id: string;
  customerId: string;
  invoiceId: string;
  chargebackType: 'shortage' | 'damage' | 'billing_error' | 'service_failure' | 'late_delivery';
  amount: number;
  description: string;
  evidence: string[];
  status: 'submitted' | 'under_review' | 'approved' | 'rejected' | 'resolved';
  submittedAt: Date;
  resolvedAt?: Date;
}

@Injectable()
export class ChargebackManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async submitChargeback(
    customerId: string,
    chargeback: Omit<Chargeback, 'id' | 'status' | 'submittedAt'>,
    tenantId: string,
  ): Promise<Chargeback> {
    const chargebackId = `CB-${Date.now()}`;

    const newChargeback: Chargeback = {
      id: chargebackId,
      ...chargeback,
      status: 'submitted',
      submittedAt: new Date(),
    };

    await this.eventBus.emit('chargeback.submitted', {
      chargebackId,
      customerId,
      amount: chargeback.amount,
      type: chargeback.chargebackType,
      tenantId,
    });

    return newChargeback;
  }

  async reviewChargeback(
    chargebackId: string,
    decision: 'approved' | 'rejected',
    notes: string,
    tenantId: string,
  ): Promise<void> {
    await this.eventBus.emit('chargeback.reviewed', {
      chargebackId,
      decision,
      notes,
      reviewedAt: new Date(),
      tenantId,
    });
  }
}

