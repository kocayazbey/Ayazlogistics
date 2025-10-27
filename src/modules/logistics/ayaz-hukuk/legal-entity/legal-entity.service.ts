import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface LegalEntity {
  id: string;
  name: string;
  entityType: 'corporation' | 'llc' | 'partnership' | 'branch' | 'subsidiary';
  registrationNumber: string;
  taxId: string;
  country: string;
  state?: string;
  incorporationDate: Date;
  status: 'active' | 'inactive' | 'dissolved';
  parentEntityId?: string;
  directors: Array<{
    name: string;
    title: string;
    appointedDate: Date;
  }>;
  licenses: Array<{
    type: string;
    number: string;
    expiryDate: Date;
  }>;
  bankAccounts: Array<{
    bank: string;
    accountNumber: string;
    currency: string;
  }>;
}

@Injectable()
export class LegalEntityManagementService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async registerEntity(data: Omit<LegalEntity, 'id' | 'directors' | 'licenses' | 'bankAccounts'>): Promise<LegalEntity> {
    const entity: LegalEntity = {
      ...data,
      id: `ENTITY-${Date.now()}`,
      directors: [],
      licenses: [],
      bankAccounts: [],
    };

    await this.eventBus.publish('legal_entity.registered', {
      entityId: entity.id,
      name: entity.name,
      entityType: entity.entityType,
    });

    return entity;
  }

  async getEntityHierarchy(rootEntityId: string): Promise<any> {
    return {
      id: rootEntityId,
      name: 'AyazLogistics Group',
      entityType: 'corporation',
      children: [
        {
          id: 'sub-1',
          name: 'AyazLogistics TR',
          entityType: 'subsidiary',
          country: 'Turkey',
        },
        {
          id: 'sub-2',
          name: 'AyazLogistics EU',
          entityType: 'subsidiary',
          country: 'Germany',
        },
      ],
    };
  }

  async trackComplianceByEntity(entityId: string): Promise<any> {
    return {
      entityId,
      licenses: {
        total: 5,
        active: 4,
        expiringSoon: 1,
      },
      filings: {
        annualReport: { dueDate: new Date('2024-12-31'), status: 'pending' },
        taxReturn: { dueDate: new Date('2024-04-30'), status: 'filed' },
      },
      complianceScore: 92,
    };
  }
}

