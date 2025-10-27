import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../../../core/events/event-bus.service';

interface AuditEvent {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  metadata?: any;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  tenantId: string;
}

interface AuditQuery {
  userId?: string;
  entityType?: string;
  entityId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  tenantId: string;
  limit?: number;
  offset?: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private auditEvents: Map<string, AuditEvent> = new Map();

  constructor(private readonly eventBus: EventBusService) {}

  async logEvent(
    userId: string,
    action: string,
    entityType: string,
    entityId: string,
    oldValues?: any,
    newValues?: any,
    metadata?: any,
    ipAddress?: string,
    userAgent?: string,
    tenantId?: string
  ): Promise<string> {
    const eventId = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const auditEvent: AuditEvent = {
      id: eventId,
      userId,
      action,
      entityType,
      entityId,
      oldValues,
      newValues,
      metadata,
      timestamp: new Date(),
      ipAddress,
      userAgent,
      tenantId: tenantId || 'default',
    };

    this.auditEvents.set(eventId, auditEvent);

    // Emit audit event for real-time monitoring
    await this.eventBus.emit('audit.event.created', {
      eventId,
      userId,
      action,
      entityType,
      entityId,
      timestamp: auditEvent.timestamp,
    });

    this.logger.log('Audit event logged', {
      eventId,
      userId,
      action,
      entityType,
      entityId,
    });

    return eventId;
  }

  async queryEvents(query: AuditQuery): Promise<{
    events: AuditEvent[];
    total: number;
    hasMore: boolean;
  }> {
    let filteredEvents = Array.from(this.auditEvents.values())
      .filter(event => event.tenantId === query.tenantId);

    if (query.userId) {
      filteredEvents = filteredEvents.filter(event => event.userId === query.userId);
    }

    if (query.entityType) {
      filteredEvents = filteredEvents.filter(event => event.entityType === query.entityType);
    }

    if (query.entityId) {
      filteredEvents = filteredEvents.filter(event => event.entityId === query.entityId);
    }

    if (query.action) {
      filteredEvents = filteredEvents.filter(event => event.action === query.action);
    }

    if (query.startDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      filteredEvents = filteredEvents.filter(event => event.timestamp <= query.endDate!);
    }

    // Sort by timestamp descending
    filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = filteredEvents.length;
    const limit = query.limit || 50;
    const offset = query.offset || 0;
    const events = filteredEvents.slice(offset, offset + limit);
    const hasMore = offset + limit < total;

    return {
      events,
      total,
      hasMore,
    };
  }

  async getEventById(eventId: string): Promise<AuditEvent | null> {
    return this.auditEvents.get(eventId) || null;
  }

  async getUserActivity(userId: string, tenantId: string, days = 30): Promise<{
    totalEvents: number;
    eventsByAction: Record<string, number>;
    eventsByEntity: Record<string, number>;
    recentEvents: AuditEvent[];
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const userEvents = Array.from(this.auditEvents.values())
      .filter(event => 
        event.userId === userId && 
        event.tenantId === tenantId &&
        event.timestamp >= startDate &&
        event.timestamp <= endDate
      );

    const eventsByAction: Record<string, number> = {};
    const eventsByEntity: Record<string, number> = {};

    userEvents.forEach(event => {
      eventsByAction[event.action] = (eventsByAction[event.action] || 0) + 1;
      eventsByEntity[event.entityType] = (eventsByEntity[event.entityType] || 0) + 1;
    });

    const recentEvents = userEvents
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, 10);

    return {
      totalEvents: userEvents.length,
      eventsByAction,
      eventsByEntity,
      recentEvents,
    };
  }

  async getEntityHistory(entityType: string, entityId: string, tenantId: string): Promise<AuditEvent[]> {
    return Array.from(this.auditEvents.values())
      .filter(event => 
        event.entityType === entityType && 
        event.entityId === entityId &&
        event.tenantId === tenantId
      )
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async getAuditStats(tenantId: string, days = 30): Promise<{
    totalEvents: number;
    uniqueUsers: number;
    eventsByAction: Record<string, number>;
    eventsByEntity: Record<string, number>;
    eventsByDay: Record<string, number>;
  }> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const events = Array.from(this.auditEvents.values())
      .filter(event => 
        event.tenantId === tenantId &&
        event.timestamp >= startDate &&
        event.timestamp <= endDate
      );

    const uniqueUsers = new Set(events.map(event => event.userId)).size;

    const eventsByAction: Record<string, number> = {};
    const eventsByEntity: Record<string, number> = {};
    const eventsByDay: Record<string, number> = {};

    events.forEach(event => {
      eventsByAction[event.action] = (eventsByAction[event.action] || 0) + 1;
      eventsByEntity[event.entityType] = (eventsByEntity[event.entityType] || 0) + 1;
      
      const day = event.timestamp.toISOString().split('T')[0];
      eventsByDay[day] = (eventsByDay[day] || 0) + 1;
    });

    return {
      totalEvents: events.length,
      uniqueUsers,
      eventsByAction,
      eventsByEntity,
      eventsByDay,
    };
  }

  async exportAuditLog(query: AuditQuery): Promise<{
    events: AuditEvent[];
    exportId: string;
    exportedAt: Date;
  }> {
    const result = await this.queryEvents(query);
    const exportId = `export_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    this.logger.log('Audit log exported', {
      exportId,
      eventCount: result.events.length,
      query,
    });

    return {
      events: result.events,
      exportId,
      exportedAt: new Date(),
    };
  }

  // Helper methods for common audit scenarios
  async logUserLogin(userId: string, ipAddress?: string, userAgent?: string, tenantId?: string): Promise<string> {
    return this.logEvent(
      userId,
      'LOGIN',
      'USER',
      userId,
      undefined,
      { loginTime: new Date() },
      { ipAddress, userAgent },
      ipAddress,
      userAgent,
      tenantId
    );
  }

  async logUserLogout(userId: string, ipAddress?: string, userAgent?: string, tenantId?: string): Promise<string> {
    return this.logEvent(
      userId,
      'LOGOUT',
      'USER',
      userId,
      undefined,
      { logoutTime: new Date() },
      { ipAddress, userAgent },
      ipAddress,
      userAgent,
      tenantId
    );
  }

  async logEntityCreate(userId: string, entityType: string, entityId: string, newValues: any, tenantId?: string): Promise<string> {
    return this.logEvent(
      userId,
      'CREATE',
      entityType,
      entityId,
      undefined,
      newValues,
      undefined,
      undefined,
      undefined,
      tenantId
    );
  }

  async logEntityUpdate(userId: string, entityType: string, entityId: string, oldValues: any, newValues: any, tenantId?: string): Promise<string> {
    return this.logEvent(
      userId,
      'UPDATE',
      entityType,
      entityId,
      oldValues,
      newValues,
      undefined,
      undefined,
      undefined,
      tenantId
    );
  }

  async logEntityDelete(userId: string, entityType: string, entityId: string, oldValues: any, tenantId?: string): Promise<string> {
    return this.logEvent(
      userId,
      'DELETE',
      entityType,
      entityId,
      oldValues,
      undefined,
      undefined,
      undefined,
      undefined,
      tenantId
    );
  }
}
