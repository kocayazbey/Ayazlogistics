import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface SecurityAuditEvent {
  id: string;
  timestamp: Date;
  eventType: 'login' | 'logout' | 'failed_login' | 'rate_limit' | 'suspicious_activity' | 'security_violation';
  userId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  method: string;
  statusCode: number;
  riskScore: number;
  details: Record<string, any>;
}

export interface SecurityMetrics {
  totalEvents: number;
  failedLogins: number;
  suspiciousActivities: number;
  rateLimitExceedances: number;
  topRiskyIPs: Array<{ ip: string; count: number; riskScore: number }>;
  topRiskyUsers: Array<{ userId: string; count: number; riskScore: number }>;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);
  private events: SecurityAuditEvent[] = [];
  private readonly maxEventsInMemory = 10000;

  constructor(private configService: ConfigService) {}

  async logSecurityEvent(event: Omit<SecurityAuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const securityEvent: SecurityAuditEvent = {
      id: this.generateEventId(),
      timestamp: new Date(),
      ...event,
    };

    // Store in memory (in production, this should go to a dedicated security database)
    this.events.unshift(securityEvent);

    // Keep only recent events in memory
    if (this.events.length > this.maxEventsInMemory) {
      this.events = this.events.slice(0, this.maxEventsInMemory);
    }

    // Log based on severity
    this.logBasedOnRisk(securityEvent);

    // Alert if high risk
    if (securityEvent.riskScore >= 8) {
      await this.sendSecurityAlert(securityEvent);
    }
  }

  async logFailedLogin(
    ipAddress: string,
    userAgent: string,
    endpoint: string,
    details: Record<string, any> = {},
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'failed_login',
      ipAddress,
      userAgent,
      endpoint,
      method: 'POST',
      statusCode: 401,
      riskScore: 3,
      details: {
        reason: details.reason || 'Invalid credentials',
        username: details.username || 'unknown',
        ...details,
      },
    });
  }

  async logSuspiciousActivity(
    ipAddress: string,
    userAgent: string,
    endpoint: string,
    method: string,
    details: Record<string, any> = {},
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'suspicious_activity',
      ipAddress,
      userAgent,
      endpoint,
      method,
      statusCode: 400,
      riskScore: 7,
      details,
    });
  }

  async logRateLimitExceeded(
    ipAddress: string,
    userAgent: string,
    endpoint: string,
    method: string,
    limit: number,
    details: Record<string, any> = {},
  ): Promise<void> {
    await this.logSecurityEvent({
      eventType: 'rate_limit',
      ipAddress,
      userAgent,
      endpoint,
      method,
      statusCode: 429,
      riskScore: 5,
      details: {
        limit,
        ...details,
      },
    });
  }

  async getSecurityMetrics(timeRange: 'hour' | 'day' | 'week' = 'day'): Promise<SecurityMetrics> {
    const cutoff = this.getCutoffTime(timeRange);

    const recentEvents = this.events.filter(event => event.timestamp >= cutoff);

    const failedLogins = recentEvents.filter(e => e.eventType === 'failed_login').length;
    const suspiciousActivities = recentEvents.filter(e => e.eventType === 'suspicious_activity').length;
    const rateLimitExceedances = recentEvents.filter(e => e.eventType === 'rate_limit').length;

    // Calculate top risky IPs
    const ipRiskMap = new Map<string, { count: number; riskScore: number }>();
    recentEvents.forEach(event => {
      const current = ipRiskMap.get(event.ipAddress) || { count: 0, riskScore: 0 };
      ipRiskMap.set(event.ipAddress, {
        count: current.count + 1,
        riskScore: current.riskScore + event.riskScore,
      });
    });

    const topRiskyIPs = Array.from(ipRiskMap.entries())
      .map(([ip, data]) => ({ ip, count: data.count, riskScore: data.riskScore }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    // Calculate top risky users
    const userRiskMap = new Map<string, { count: number; riskScore: number }>();
    recentEvents.forEach(event => {
      if (event.userId) {
        const current = userRiskMap.get(event.userId) || { count: 0, riskScore: 0 };
        userRiskMap.set(event.userId, {
          count: current.count + 1,
          riskScore: current.riskScore + event.riskScore,
        });
      }
    });

    const topRiskyUsers = Array.from(userRiskMap.entries())
      .map(([userId, data]) => ({ userId, count: data.count, riskScore: data.riskScore }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);

    return {
      totalEvents: recentEvents.length,
      failedLogins,
      suspiciousActivities,
      rateLimitExceedances,
      topRiskyIPs,
      topRiskyUsers,
    };
  }

  async getEventsByIP(ipAddress: string, limit: number = 100): Promise<SecurityAuditEvent[]> {
    return this.events
      .filter(event => event.ipAddress === ipAddress)
      .slice(0, limit);
  }

  async getEventsByUser(userId: string, limit: number = 100): Promise<SecurityAuditEvent[]> {
    return this.events
      .filter(event => event.userId === userId)
      .slice(0, limit);
  }

  async getHighRiskEvents(riskThreshold: number = 7, limit: number = 100): Promise<SecurityAuditEvent[]> {
    return this.events
      .filter(event => event.riskScore >= riskThreshold)
      .slice(0, limit);
  }

  private generateEventId(): string {
    return `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getCutoffTime(timeRange: 'hour' | 'day' | 'week'): Date {
    const now = new Date();
    switch (timeRange) {
      case 'hour':
        return new Date(now.getTime() - 60 * 60 * 1000);
      case 'day':
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      default:
        return new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }
  }

  private logBasedOnRisk(event: SecurityAuditEvent): void {
    const logData = {
      eventId: event.id,
      eventType: event.eventType,
      ipAddress: event.ipAddress,
      userId: event.userId,
      riskScore: event.riskScore,
      details: event.details,
    };

    switch (event.riskScore) {
      case 1:
      case 2:
      case 3:
        this.logger.log(`Security event: ${JSON.stringify(logData)}`);
        break;
      case 4:
      case 5:
      case 6:
        this.logger.warn(`Security warning: ${JSON.stringify(logData)}`);
        break;
      case 7:
      case 8:
      case 9:
        this.logger.error(`Security alert: ${JSON.stringify(logData)}`);
        break;
      case 10:
        this.logger.error(`CRITICAL security event: ${JSON.stringify(logData)}`);
        break;
      default:
        this.logger.debug(`Security event: ${JSON.stringify(logData)}`);
    }
  }

  private async sendSecurityAlert(event: SecurityAuditEvent): Promise<void> {
    // In production, this should send alerts via email, Slack, PagerDuty, etc.
    this.logger.error(`🚨 SECURITY ALERT: High risk event detected - ${event.eventType} from IP ${event.ipAddress}, Risk Score: ${event.riskScore}`);

    // TODO: Implement alert mechanisms
    // - Email notifications
    // - Slack/webhook notifications
    // - PagerDuty integration
    // - SIEM integration
  }

  // Cleanup old events periodically
  async cleanupOldEvents(olderThanDays: number = 30): Promise<number> {
    const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = this.events.length;
    this.events = this.events.filter(event => event.timestamp >= cutoff);
    const removedCount = initialCount - this.events.length;

    this.logger.log(`Cleaned up ${removedCount} old security events older than ${olderThanDays} days`);
    return removedCount;
  }
}
