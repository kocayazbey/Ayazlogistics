import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as amqp from 'amqplib';

interface StoredEvent {
  id: string;
  eventType: string;
  aggregateId: string;
  aggregateType: string;
  payload: any;
  metadata: {
    userId?: string;
    timestamp: Date;
    version: number;
    causationId?: string;
    correlationId?: string;
  };
  processed: boolean;
  processedAt?: Date;
  retryCount: number;
  lastError?: string;
}

interface ReplayConfiguration {
  fromDate: Date;
  toDate?: Date;
  eventTypes?: string[];
  aggregateTypes?: string[];
  aggregateIds?: string[];
  batchSize: number;
  delayMs: number;
  skipProcessed: boolean;
}

interface ReplaySession {
  id: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed' | 'paused' | 'cancelled';
  configuration: ReplayConfiguration;
  progress: {
    totalEvents: number;
    processedEvents: number;
    failedEvents: number;
    currentPosition: number;
  };
}

@Injectable()
export class EventReplayService {
  private readonly logger = new Logger(EventReplayService.name);
  private connection: amqp.Connection;
  private channel: amqp.Channel;
  private activeSessions = new Map<string, ReplaySession>();

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {
    this.initializeRabbitMQ();
  }

  private async initializeRabbitMQ(): Promise<void> {
    try {
      this.connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672');
      this.channel = await this.connection.createChannel();

      await this.channel.assertExchange('event_replay', 'topic', { durable: true });
      
      this.logger.log('Event replay service initialized');
    } catch (error) {
      this.logger.error('RabbitMQ initialization failed:', error);
    }
  }

  async startReplay(config: ReplayConfiguration): Promise<string> {
    const sessionId = `replay_${Date.now()}`;
    
    this.logger.log(`Starting event replay session: ${sessionId}`);

    const totalEvents = await this.countEvents(config);

    const session: ReplaySession = {
      id: sessionId,
      startedAt: new Date(),
      status: 'running',
      configuration: config,
      progress: {
        totalEvents,
        processedEvents: 0,
        failedEvents: 0,
        currentPosition: 0,
      },
    };

    this.activeSessions.set(sessionId, session);

    await this.db.execute(
      `INSERT INTO event_replay_sessions 
       (id, started_at, status, configuration, total_events)
       VALUES ($1, $2, 'running', $3, $4)`,
      [sessionId, session.startedAt, JSON.stringify(config), totalEvents]
    );

    this.executeReplay(session).catch(error => {
      this.logger.error(`Replay session ${sessionId} failed:`, error);
      session.status = 'failed';
    });

    return sessionId;
  }

  private async countEvents(config: ReplayConfiguration): Promise<number> {
    let whereClause = 'WHERE created_at >= $1';
    const params: any[] = [config.fromDate];
    let paramIndex = 2;

    if (config.toDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(config.toDate);
      paramIndex++;
    }

    if (config.eventTypes && config.eventTypes.length > 0) {
      whereClause += ` AND event_type = ANY($${paramIndex})`;
      params.push(config.eventTypes);
      paramIndex++;
    }

    if (config.aggregateTypes && config.aggregateTypes.length > 0) {
      whereClause += ` AND aggregate_type = ANY($${paramIndex})`;
      params.push(config.aggregateTypes);
      paramIndex++;
    }

    if (config.skipProcessed) {
      whereClause += ' AND processed = false';
    }

    const result = await this.db.execute(
      `SELECT COUNT(*) as count FROM event_store ${whereClause}`,
      params
    );

    return parseInt(result.rows[0].count);
  }

  private async executeReplay(session: ReplaySession): Promise<void> {
    const config = session.configuration;
    let offset = 0;

    while (session.status === 'running') {
      const events = await this.fetchEventBatch(config, offset, config.batchSize);

      if (events.length === 0) {
        session.status = 'completed';
        session.completedAt = new Date();
        break;
      }

      for (const event of events) {
        try {
          await this.replayEvent(event);
          session.progress.processedEvents++;

          await this.db.execute(
            `UPDATE event_store SET processed = true, processed_at = NOW() WHERE id = $1`,
            [event.id]
          );
        } catch (error) {
          session.progress.failedEvents++;
          
          await this.db.execute(
            `UPDATE event_store SET 
             retry_count = retry_count + 1,
             last_error = $2
             WHERE id = $1`,
            [event.id, error.message]
          );

          this.logger.error(`Event replay failed for ${event.id}:`, error);
        }

        session.progress.currentPosition++;

        if (config.delayMs > 0) {
          await new Promise(resolve => setTimeout(resolve, config.delayMs));
        }
      }

      offset += config.batchSize;

      await this.db.execute(
        `UPDATE event_replay_sessions SET
         processed_events = $2,
         failed_events = $3,
         current_position = $4
         WHERE id = $1`,
        [session.id, session.progress.processedEvents, session.progress.failedEvents, session.progress.currentPosition]
      );
    }

    if (session.status === 'completed') {
      await this.db.execute(
        `UPDATE event_replay_sessions SET
         status = 'completed',
         completed_at = $2
         WHERE id = $1`,
        [session.id, session.completedAt]
      );

      this.logger.log(`Replay session ${session.id} completed: ${session.progress.processedEvents}/${session.progress.totalEvents} events`);
    }

    this.activeSessions.delete(session.id);
  }

  private async fetchEventBatch(config: ReplayConfiguration, offset: number, limit: number): Promise<StoredEvent[]> {
    let whereClause = 'WHERE created_at >= $1';
    const params: any[] = [config.fromDate];
    let paramIndex = 2;

    if (config.toDate) {
      whereClause += ` AND created_at <= $${paramIndex}`;
      params.push(config.toDate);
      paramIndex++;
    }

    if (config.eventTypes && config.eventTypes.length > 0) {
      whereClause += ` AND event_type = ANY($${paramIndex})`;
      params.push(config.eventTypes);
      paramIndex++;
    }

    if (config.skipProcessed) {
      whereClause += ' AND processed = false';
    }

    params.push(limit, offset);

    const result = await this.db.execute(
      `SELECT * FROM event_store ${whereClause} ORDER BY created_at ASC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      params
    );

    return result.rows.map(row => ({
      id: row.id,
      eventType: row.event_type,
      aggregateId: row.aggregate_id,
      aggregateType: row.aggregate_type,
      payload: JSON.parse(row.payload),
      metadata: JSON.parse(row.metadata),
      processed: row.processed,
      processedAt: row.processed_at ? new Date(row.processed_at) : undefined,
      retryCount: row.retry_count || 0,
      lastError: row.last_error,
    }));
  }

  private async replayEvent(event: StoredEvent): Promise<void> {
    const routingKey = `${event.aggregateType}.${event.eventType}`;

    await this.channel.publish(
      'event_replay',
      routingKey,
      Buffer.from(JSON.stringify({
        ...event.payload,
        _replay: true,
        _originalTimestamp: event.metadata.timestamp,
        _replayedAt: new Date(),
      })),
      {
        persistent: true,
        headers: {
          'x-event-id': event.id,
          'x-event-type': event.eventType,
          'x-replayed': 'true',
        },
      }
    );
  }

  async pauseReplay(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      session.status = 'paused';
      
      await this.db.execute(
        `UPDATE event_replay_sessions SET status = 'paused' WHERE id = $1`,
        [sessionId]
      );

      this.logger.log(`Replay session paused: ${sessionId}`);
    }
  }

  async resumeReplay(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (session && session.status === 'paused') {
      session.status = 'running';
      
      await this.db.execute(
        `UPDATE event_replay_sessions SET status = 'running' WHERE id = $1`,
        [sessionId]
      );

      this.executeReplay(session);

      this.logger.log(`Replay session resumed: ${sessionId}`);
    }
  }

  async cancelReplay(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    
    if (session) {
      session.status = 'cancelled';
      
      await this.db.execute(
        `UPDATE event_replay_sessions SET status = 'cancelled', completed_at = NOW() WHERE id = $1`,
        [sessionId]
      );

      this.activeSessions.delete(sessionId);

      this.logger.log(`Replay session cancelled: ${sessionId}`);
    }
  }

  async getReplayProgress(sessionId: string): Promise<ReplaySession | null> {
    return this.activeSessions.get(sessionId) || null;
  }
}

