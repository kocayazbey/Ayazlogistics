import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface SigningSession {
  id: string;
  documentId: string;
  signers: Array<{
    userId: string;
    email: string;
    role: string;
    signOrder: number;
    signed: boolean;
    signedAt?: Date;
  }>;
  status: 'initiated' | 'in_progress' | 'completed' | 'cancelled';
  expiresAt: Date;
}

@Injectable()
export class MultiPartySigningService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async initiateSigningSession(
    documentId: string,
    signers: Array<{ userId: string; email: string; role: string; signOrder: number }>,
    tenantId: string,
  ): Promise<SigningSession> {
    const sessionId = `SIGN-${Date.now()}`;

    const session: SigningSession = {
      id: sessionId,
      documentId,
      signers: signers.map(s => ({ ...s, signed: false })),
      status: 'initiated',
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    };

    await this.eventBus.emit('signing.session.initiated', {
      sessionId,
      documentId,
      signerCount: signers.length,
      tenantId,
    });

    return session;
  }

  async recordSignature(
    sessionId: string,
    userId: string,
    signatureData: string,
    tenantId: string,
  ): Promise<void> {
    await this.eventBus.emit('document.signed', {
      sessionId,
      userId,
      signedAt: new Date(),
      tenantId,
    });
  }
}

