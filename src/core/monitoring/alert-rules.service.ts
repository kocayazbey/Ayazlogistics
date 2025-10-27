import { Injectable, Logger } from '@nestjs/common';
import { InjectRedis } from '@nestjs-modules/ioredis';
import Redis from 'ioredis';
import { EventBusService } from '../events/event-bus.service';

interface AlertRule {
  id: string;
  name: string;
  type: 'error_rate' | 'response_time' | 'uptime' | 'cpu' | 'memory' | 'disk';
  threshold: number;
  window: number; // seconds
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  actions: Array<'email' | 'sms' | 'slack' | 'webhook'>;
  recipients: string[];
}

interface Alert {
  id: string;
  ruleId: string;
  timestamp: Date;
  value: number;
  threshold: number;
  message: string;
  severity: string;
  acknowledged: boolean;
}

@Injectable()
export class AlertRulesService {
  private readonly logger = new Logger(AlertRulesService.name);
  private rules: Map<string, AlertRule> = new Map();

  constructor(
    @InjectRedis()
    private readonly redis: Redis,
    private readonly eventBus: EventBusService,
  ) {
    this.initializeDefaultRules();
    this.startMonitoring();
  }

  private initializeDefaultRules() {
    const defaultRules: AlertRule[] = [
      {
        id: 'error-rate-high',
        name: 'High Error Rate',
        type: 'error_rate',
        threshold: 5, // 5% error rate
        window: 300, // 5 minutes
        severity: 'high',
        enabled: true,
        actions: ['email', 'slack'],
        recipients: ['admin@ayazlogistics.com'],
      },
      {
        id: 'response-time-slow',
        name: 'Slow Response Time',
        type: 'response_time',
        threshold: 1000, // 1000ms
        window: 300,
        severity: 'medium',
        enabled: true,
        actions: ['slack'],
        recipients: ['devops@ayazlogistics.com'],
      },
      {
        id: 'uptime-critical',
        name: 'Service Down',
        type: 'uptime',
        threshold: 99, // 99% uptime
        window: 60,
        severity: 'critical',
        enabled: true,
        actions: ['email', 'sms', 'slack'],
        recipients: ['admin@ayazlogistics.com', 'devops@ayazlogistics.com'],
      },
      {
        id: 'cpu-high',
        name: 'High CPU Usage',
        type: 'cpu',
        threshold: 80, // 80%
        window: 300,
        severity: 'medium',
        enabled: true,
        actions: ['slack'],
        recipients: ['devops@ayazlogistics.com'],
      },
      {
        id: 'memory-high',
        name: 'High Memory Usage',
        type: 'memory',
        threshold: 85, // 85%
        window: 300,
        severity: 'high',
        enabled: true,
        actions: ['email', 'slack'],
        recipients: ['devops@ayazlogistics.com'],
      },
      {
        id: 'disk-full',
        name: 'Disk Space Critical',
        type: 'disk',
        threshold: 90, // 90%
        window: 600,
        severity: 'critical',
        enabled: true,
        actions: ['email', 'sms', 'slack'],
        recipients: ['admin@ayazlogistics.com', 'devops@ayazlogistics.com'],
      },
    ];

    defaultRules.forEach(rule => this.rules.set(rule.id, rule));
    this.logger.log(`Initialized ${defaultRules.length} alert rules`);
  }

  private startMonitoring() {
    setInterval(() => this.checkAllRules(), 60000); // Check every minute
    this.logger.log('Alert monitoring started');
  }

  private async checkAllRules() {
    for (const [id, rule] of this.rules.entries()) {
      if (!rule.enabled) continue;

      try {
        await this.checkRule(rule);
      } catch (error) {
        this.logger.error(`Error checking rule ${id}:`, error);
      }
    }
  }

  private async checkRule(rule: AlertRule) {
    let currentValue: number;

    switch (rule.type) {
      case 'error_rate':
        currentValue = await this.getErrorRate(rule.window);
        break;
      case 'response_time':
        currentValue = await this.getAverageResponseTime(rule.window);
        break;
      case 'uptime':
        currentValue = await this.getUptime(rule.window);
        break;
      case 'cpu':
        currentValue = await this.getCPUUsage();
        break;
      case 'memory':
        currentValue = await this.getMemoryUsage();
        break;
      case 'disk':
        currentValue = await this.getDiskUsage();
        break;
      default:
        return;
    }

    const isTriggered = this.evaluateThreshold(rule, currentValue);

    if (isTriggered) {
      await this.triggerAlert(rule, currentValue);
    }
  }

  private evaluateThreshold(rule: AlertRule, value: number): boolean {
    switch (rule.type) {
      case 'uptime':
        return value < rule.threshold; // Alert if uptime is BELOW threshold
      default:
        return value > rule.threshold; // Alert if value is ABOVE threshold
    }
  }

  private async triggerAlert(rule: AlertRule, value: number) {
    const alert: Alert = {
      id: `alert_${Date.now()}`,
      ruleId: rule.id,
      timestamp: new Date(),
      value,
      threshold: rule.threshold,
      message: this.generateAlertMessage(rule, value),
      severity: rule.severity,
      acknowledged: false,
    };

    await this.redis.setex(
      `alert:${alert.id}`,
      86400, // 24 hours
      JSON.stringify(alert)
    );

    await this.redis.lpush('alerts:active', alert.id);

    // Execute alert actions
    for (const action of rule.actions) {
      await this.executeAction(action, alert, rule);
    }

    await this.eventBus.emit('alert.triggered', alert);

    this.logger.warn(`Alert triggered: ${rule.name} (${value} > ${rule.threshold})`);
  }

  private generateAlertMessage(rule: AlertRule, value: number): string {
    const messages = {
      error_rate: `Error rate is ${value.toFixed(2)}% (threshold: ${rule.threshold}%)`,
      response_time: `Average response time is ${value.toFixed(0)}ms (threshold: ${rule.threshold}ms)`,
      uptime: `Uptime is ${value.toFixed(2)}% (threshold: ${rule.threshold}%)`,
      cpu: `CPU usage is ${value.toFixed(2)}% (threshold: ${rule.threshold}%)`,
      memory: `Memory usage is ${value.toFixed(2)}% (threshold: ${rule.threshold}%)`,
      disk: `Disk usage is ${value.toFixed(2)}% (threshold: ${rule.threshold}%)`,
    };

    return messages[rule.type] || `${rule.name}: ${value} exceeds threshold ${rule.threshold}`;
  }

  private async executeAction(action: string, alert: Alert, rule: AlertRule) {
    switch (action) {
      case 'email':
        await this.sendEmailAlert(alert, rule);
        break;
      case 'sms':
        await this.sendSMSAlert(alert, rule);
        break;
      case 'slack':
        await this.sendSlackAlert(alert, rule);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert, rule);
        break;
    }
  }

  private async sendEmailAlert(alert: Alert, rule: AlertRule) {
    this.logger.log(`[EMAIL] Alert: ${alert.message} to ${rule.recipients.join(', ')}`);
  }

  private async sendSMSAlert(alert: Alert, rule: AlertRule) {
    this.logger.log(`[SMS] Critical Alert: ${alert.message}`);
  }

  private async sendSlackAlert(alert: Alert, rule: AlertRule) {
    this.logger.log(`[SLACK] Alert: ${alert.message}`);
  }

  private async sendWebhookAlert(alert: Alert, rule: AlertRule) {
    this.logger.log(`[WEBHOOK] Alert: ${JSON.stringify(alert)}`);
  }

  // Metric collectors
  private async getErrorRate(windowSeconds: number): Promise<number> {
    const totalRequests = await this.redis.get('metrics:requests:total') || '100';
    const errorRequests = await this.redis.get('metrics:requests:errors') || '2';
    
    const total = parseInt(totalRequests, 10);
    const errors = parseInt(errorRequests, 10);
    
    return (errors / total) * 100;
  }

  private async getAverageResponseTime(windowSeconds: number): Promise<number> {
    const responseTime = await this.redis.get('metrics:response_time:avg');
    return responseTime ? parseFloat(responseTime) : 150;
  }

  private async getUptime(windowSeconds: number): Promise<number> {
    const uptime = await this.redis.get('metrics:uptime');
    return uptime ? parseFloat(uptime) : 99.9;
  }

  private async getCPUUsage(): Promise<number> {
    const cpu = await this.redis.get('metrics:cpu');
    return cpu ? parseFloat(cpu) : 45;
  }

  private async getMemoryUsage(): Promise<number> {
    const memory = await this.redis.get('metrics:memory');
    return memory ? parseFloat(memory) : 65;
  }

  private async getDiskUsage(): Promise<number> {
    const disk = await this.redis.get('metrics:disk');
    return disk ? parseFloat(disk) : 55;
  }

  // Public API
  async createRule(rule: Omit<AlertRule, 'id'>): Promise<AlertRule> {
    const id = `rule_${Date.now()}`;
    const newRule = { ...rule, id };
    
    this.rules.set(id, newRule);
    await this.redis.setex(`alert:rule:${id}`, 0, JSON.stringify(newRule));
    
    this.logger.log(`Alert rule created: ${newRule.name}`);
    return newRule;
  }

  async updateRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule> {
    const rule = this.rules.get(id);
    if (!rule) throw new Error('Rule not found');

    const updated = { ...rule, ...updates };
    this.rules.set(id, updated);
    
    await this.redis.setex(`alert:rule:${id}`, 0, JSON.stringify(updated));
    
    return updated;
  }

  async deleteRule(id: string): Promise<boolean> {
    this.rules.delete(id);
    await this.redis.del(`alert:rule:${id}`);
    return true;
  }

  async getActiveAlerts(): Promise<Alert[]> {
    const alertIds = await this.redis.lrange('alerts:active', 0, -1);
    const alerts: Alert[] = [];

    for (const id of alertIds) {
      const data = await this.redis.get(`alert:${id}`);
      if (data) {
        alerts.push(JSON.parse(data));
      }
    }

    return alerts;
  }

  async acknowledgeAlert(alertId: string): Promise<boolean> {
    const data = await this.redis.get(`alert:${alertId}`);
    if (!data) return false;

    const alert = JSON.parse(data);
    alert.acknowledged = true;

    await this.redis.setex(`alert:${alertId}`, 86400, JSON.stringify(alert));
    await this.redis.lrem('alerts:active', 1, alertId);

    this.logger.log(`Alert acknowledged: ${alertId}`);
    return true;
  }
}

