import { Injectable, Logger } from '@nestjs/common';
import { EventBusService } from '../../../core/events/event-bus.service';

interface NotificationTemplate {
  id: string;
  name: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  subject?: string;
  body: string;
  variables: string[];
  isActive: boolean;
}

interface Notification {
  id: string;
  userId: string;
  type: 'email' | 'sms' | 'push' | 'in_app';
  title: string;
  message: string;
  data?: any;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'sent' | 'delivered' | 'failed' | 'read';
  createdAt: Date;
  sentAt?: Date;
  readAt?: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private templates: Map<string, NotificationTemplate> = new Map();
  private notifications: Map<string, Notification> = new Map();

  constructor(private readonly eventBus: EventBusService) {
    this.initializeTemplates();
  }

  private initializeTemplates() {
    const templates: NotificationTemplate[] = [
      {
        id: 'receiving_complete',
        name: 'Receiving Complete',
        type: 'email',
        subject: 'Receiving Order Completed',
        body: 'Receiving order {{orderNumber}} has been completed successfully.',
        variables: ['orderNumber'],
        isActive: true,
      },
      {
        id: 'picking_assigned',
        name: 'Picking Task Assigned',
        type: 'push',
        body: 'New picking task assigned: {{taskNumber}}',
        variables: ['taskNumber'],
        isActive: true,
      },
      {
        id: 'shipment_ready',
        name: 'Shipment Ready',
        type: 'sms',
        body: 'Shipment {{shipmentNumber}} is ready for pickup.',
        variables: ['shipmentNumber'],
        isActive: true,
      },
      {
        id: 'inventory_low',
        name: 'Low Inventory Alert',
        type: 'email',
        subject: 'Low Inventory Alert',
        body: 'Product {{productCode}} is running low. Current stock: {{quantity}}',
        variables: ['productCode', 'quantity'],
        isActive: true,
      },
      {
        id: 'quality_issue',
        name: 'Quality Issue',
        type: 'in_app',
        body: 'Quality issue detected in {{location}}. Please investigate.',
        variables: ['location'],
        isActive: true,
      },
    ];

    templates.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  async sendNotification(
    userId: string,
    templateId: string,
    variables: Record<string, any>,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    data?: any
  ): Promise<string> {
    const template = this.templates.get(templateId);
    if (!template) {
      throw new Error(`Template ${templateId} not found`);
    }

    if (!template.isActive) {
      throw new Error(`Template ${templateId} is not active`);
    }

    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const processedMessage = this.processTemplate(template.body, variables);
    const processedSubject = template.subject ? this.processTemplate(template.subject, variables) : undefined;

    const notification: Notification = {
      id: notificationId,
      userId,
      type: template.type,
      title: processedSubject || 'Notification',
      message: processedMessage,
      data,
      priority,
      status: 'pending',
      createdAt: new Date(),
    };

    this.notifications.set(notificationId, notification);

    try {
      await this.deliverNotification(notification);
      notification.status = 'sent';
      notification.sentAt = new Date();
    } catch (error) {
      this.logger.error('Failed to send notification', { notificationId, error });
      notification.status = 'failed';
    }

    await this.eventBus.emit('notification.sent', {
      notificationId,
      userId,
      type: template.type,
      templateId,
    });

    return notificationId;
  }

  private processTemplate(template: string, variables: Record<string, any>): string {
    let processed = template;
    Object.entries(variables).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processed = processed.replace(new RegExp(placeholder, 'g'), String(value));
    });
    return processed;
  }

  private async deliverNotification(notification: Notification): Promise<void> {
    switch (notification.type) {
      case 'email':
        await this.sendEmail(notification);
        break;
      case 'sms':
        await this.sendSMS(notification);
        break;
      case 'push':
        await this.sendPush(notification);
        break;
      case 'in_app':
        await this.sendInApp(notification);
        break;
      default:
        throw new Error(`Unsupported notification type: ${notification.type}`);
    }
  }

  private async sendEmail(notification: Notification): Promise<void> {
    // Implement email sending logic
    this.logger.log('Sending email notification', { notificationId: notification.id });
    // Integration with SendGrid, AWS SES, etc.
  }

  private async sendSMS(notification: Notification): Promise<void> {
    // Implement SMS sending logic
    this.logger.log('Sending SMS notification', { notificationId: notification.id });
    // Integration with Twilio, AWS SNS, etc.
  }

  private async sendPush(notification: Notification): Promise<void> {
    // Implement push notification logic
    this.logger.log('Sending push notification', { notificationId: notification.id });
    // Integration with Firebase, OneSignal, etc.
  }

  private async sendInApp(notification: Notification): Promise<void> {
    // Implement in-app notification logic
    this.logger.log('Sending in-app notification', { notificationId: notification.id });
    // Store in database for real-time delivery
  }

  async markAsRead(notificationId: string): Promise<void> {
    const notification = this.notifications.get(notificationId);
    if (notification) {
      notification.status = 'read';
      notification.readAt = new Date();
      
      await this.eventBus.emit('notification.read', {
        notificationId,
        userId: notification.userId,
      });
    }
  }

  async getUserNotifications(userId: string, limit = 50): Promise<Notification[]> {
    const userNotifications = Array.from(this.notifications.values())
      .filter(n => n.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    return userNotifications;
  }

  async getUnreadCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && n.status !== 'read')
      .length;
  }

  async createTemplate(template: Omit<NotificationTemplate, 'id'>): Promise<string> {
    const templateId = `template_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newTemplate: NotificationTemplate = {
      id: templateId,
      ...template,
    };

    this.templates.set(templateId, newTemplate);
    return templateId;
  }

  async updateTemplate(templateId: string, updates: Partial<NotificationTemplate>): Promise<void> {
    const template = this.templates.get(templateId);
    if (template) {
      Object.assign(template, updates);
    }
  }

  async getTemplates(): Promise<NotificationTemplate[]> {
    return Array.from(this.templates.values());
  }

  async getNotificationStats(userId?: string): Promise<{
    total: number;
    unread: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const notifications = userId 
      ? Array.from(this.notifications.values()).filter(n => n.userId === userId)
      : Array.from(this.notifications.values());

    const stats = {
      total: notifications.length,
      unread: notifications.filter(n => n.status !== 'read').length,
      byType: {} as Record<string, number>,
      byStatus: {} as Record<string, number>,
    };

    notifications.forEach(notification => {
      stats.byType[notification.type] = (stats.byType[notification.type] || 0) + 1;
      stats.byStatus[notification.status] = (stats.byStatus[notification.status] || 0) + 1;
    });

    return stats;
  }
}
