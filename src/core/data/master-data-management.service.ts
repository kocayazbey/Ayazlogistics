import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../events/event-bus.service';

interface MasterDataEntity {
  entityType: 'customer' | 'product' | 'location' | 'carrier' | 'supplier';
  entityId: string;
  attributes: Record<string, any>;
  dataQuality: {
    completeness: number;
    accuracy: number;
    consistency: number;
    timeliness: number;
  };
  source: string;
  lastUpdated: Date;
  steward?: string;
}

interface DataConflict {
  id: string;
  entityType: string;
  entityId: string;
  field: string;
  sourceValue: any;
  targetValue: any;
  source: string;
  target: string;
  detectedAt: Date;
  resolvedAt?: Date;
  resolution?: 'source_wins' | 'target_wins' | 'merge' | 'manual';
}

@Injectable()
export class MasterDataManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async upsertMasterData(
    entity: Omit<MasterDataEntity, 'dataQuality' | 'lastUpdated'>,
    tenantId: string,
  ): Promise<MasterDataEntity> {
    const dataQuality = this.assessDataQuality(entity.attributes);

    const masterData: MasterDataEntity = {
      ...entity,
      dataQuality,
      lastUpdated: new Date(),
    };

    await this.eventBus.emit('master.data.updated', {
      entityType: entity.entityType,
      entityId: entity.entityId,
      source: entity.source,
      tenantId,
    });

    return masterData;
  }

  private assessDataQuality(attributes: Record<string, any>): MasterDataEntity['dataQuality'] {
    const requiredFields = ['name', 'code', 'type'];
    const presentFields = requiredFields.filter(f => attributes[f]);

    const completeness = (presentFields.length / requiredFields.length) * 100;

    return {
      completeness: Math.round(completeness * 100) / 100,
      accuracy: 95,
      consistency: 90,
      timeliness: 98,
    };
  }

  async detectConflicts(
    entityType: string,
    entityId: string,
    newData: Record<string, any>,
    source: string,
    tenantId: string,
  ): Promise<DataConflict[]> {
    // Mock: Would compare with existing master data
    return [];
  }

  async resolveConflict(
    conflictId: string,
    resolution: DataConflict['resolution'],
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.eventBus.emit('data.conflict.resolved', {
      conflictId,
      resolution,
      resolvedBy: userId,
      tenantId,
    });
  }

  async getDataQualityDashboard(tenantId: string): Promise<{
    overall: number;
    byEntityType: Record<string, number>;
    topIssues: Array<{ issue: string; count: number }>;
  }> {
    return {
      overall: 92,
      byEntityType: {
        customer: 95,
        product: 90,
        location: 88,
      },
      topIssues: [],
    };
  }
}

