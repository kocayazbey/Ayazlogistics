import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface DamageReport {
  id: string;
  itemId: string;
  reportedBy: string;
  damageType: 'physical' | 'water' | 'contamination' | 'expiry' | 'other';
  severity: 'minor' | 'moderate' | 'severe' | 'total_loss';
  description: string;
  photos: string[];
  reportedAt: Date;
  resolution?: {
    action: 'repaired' | 'returned' | 'disposed' | 'credited';
    notes: string;
    resolvedAt: Date;
  };
}

@Injectable()
export class DamageTrackingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async reportDamage(
    itemId: string,
    reportedBy: string,
    damage: {
      type: DamageReport['damageType'];
      severity: DamageReport['severity'];
      description: string;
      photos: string[];
    },
    tenantId: string,
  ): Promise<DamageReport> {
    const reportId = `DMG-${Date.now()}`;

    const report: DamageReport = {
      id: reportId,
      itemId,
      reportedBy,
      damageType: damage.type,
      severity: damage.severity,
      description: damage.description,
      photos: damage.photos,
      reportedAt: new Date(),
    };

    await this.eventBus.emit('damage.reported', {
      reportId,
      itemId,
      severity: damage.severity,
      tenantId,
    });

    return report;
  }

  async resolveDamage(
    reportId: string,
    resolution: DamageReport['resolution'],
    tenantId: string,
  ): Promise<void> {
    await this.eventBus.emit('damage.resolved', {
      reportId,
      action: resolution.action,
      resolvedAt: resolution.resolvedAt,
      tenantId,
    });
  }
}

