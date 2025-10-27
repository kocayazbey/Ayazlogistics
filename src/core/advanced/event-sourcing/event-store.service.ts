import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export interface DomainEvent {
  id: string;
  aggregateId: string;
  aggregateType: string;
  eventType: string;
  eventData: any;
  metadata: any;
  version: number;
  timestamp: Date;
}

@Injectable()
export class EventStoreService {
  private readonly logger = new Logger(EventStoreService.name);
  private eventHandlers = new Map<string, Array<(event: DomainEvent) => Promise<void>>>();

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async saveEvent(event: Omit<DomainEvent, 'id' | 'timestamp'>): Promise<DomainEvent> {
    const fullEvent: DomainEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    this.logger.debug(`Saving event: ${event.eventType} for aggregate ${event.aggregateId}`);

    await this.db.execute(
      `INSERT INTO event_store (id, aggregate_id, aggregate_type, event_type, event_data, metadata, version, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [fullEvent.id, fullEvent.aggregateId, fullEvent.aggregateType, fullEvent.eventType,
       JSON.stringify(fullEvent.eventData), JSON.stringify(fullEvent.metadata),
       fullEvent.version, fullEvent.timestamp]
    );

    await this.publishEvent(fullEvent);
    return fullEvent;
  }

  async getEvents(aggregateId: string, fromVersion: number = 0): Promise<DomainEvent[]> {
    const result = await this.db.execute(
      `SELECT * FROM event_store WHERE aggregate_id = $1 AND version > $2 ORDER BY version ASC`,
      [aggregateId, fromVersion]
    );
    return result.rows as any[];
  }

  async getEventsByType(eventType: string, limit: number = 100): Promise<DomainEvent[]> {
    const result = await this.db.execute(
      `SELECT * FROM event_store WHERE event_type = $1 ORDER BY timestamp DESC LIMIT $2`,
      [eventType, limit]
    );
    return result.rows as any[];
  }

  subscribe(eventType: string, handler: (event: DomainEvent) => Promise<void>): void {
    const handlers = this.eventHandlers.get(eventType) || [];
    handlers.push(handler);
    this.eventHandlers.set(eventType, handlers);
    this.logger.log(`Subscribed to event: ${eventType}`);
  }

  private async publishEvent(event: DomainEvent): Promise<void> {
    const handlers = this.eventHandlers.get(event.eventType) || [];
    await Promise.all(handlers.map(handler => handler(event)));
  }

  async replayEvents(aggregateId: string): Promise<any> {
    const events = await this.getEvents(aggregateId);
    this.logger.log(`Replaying ${events.length} events for aggregate ${aggregateId}`);
    
    for (const event of events) {
      await this.publishEvent(event);
    }

    return { replayed: events.length };
  }
}

