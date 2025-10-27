import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, desc } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { WebSocketGateway } from '../../../../core/websocket/websocket.gateway';
import { EmailService } from '../../../shared/integration/services/email.service';
import { SmsService } from '../../../shared/integration/services/sms.service';
import { notifications } from '../../../../database/schema/core/notifications.schema';

interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  actionUrl?: string;
  read: boolean;
  createdAt: Date;
  channels: ('email' | 'sms' | 'push' | 'in_app')[];
}

@Injectable()
export class NotificationsService {
  private notifications: Map<string, Notification[]> = new Map();

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly wsGateway: WebSocketGateway,
    private readonly emailService: EmailService,
    private readonly smsService: SmsService,
  ) {}

  async sendNotification(data: {
    userId: string;
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    actionUrl?: string;
    channels?: ('email' | 'sms' | 'push' | 'in_app')[];
    emailData?: { email: string };
    smsData?: { phone: string };
  }) {
    // Veritabanına kaydet
    const [dbNotification] = await this.db
      .insert(notifications)
      .values({
        userId: data.userId,
        type: data.type,
        title: data.title,
        message: data.message,
        isRead: false,
        data: {
          actionUrl: data.actionUrl,
          channels: data.channels || ['in_app'],
        },
      })
      .returning();

    const notification: Notification = {
      id: dbNotification.id,
      userId: dbNotification.userId,
      type: dbNotification.type as 'info' | 'warning' | 'error' | 'success',
      title: dbNotification.title,
      message: dbNotification.message,
      actionUrl: dbNotification.data?.actionUrl,
      read: dbNotification.isRead,
      createdAt: dbNotification.createdAt,
      channels: dbNotification.data?.channels || ['in_app'],
    };

    // Memory cache'e de ekle (performans için)
    const userNotifications = this.notifications.get(data.userId) || [];
    userNotifications.unshift(notification);
    this.notifications.set(data.userId, userNotifications);

    if (data.channels?.includes('in_app')) {
      this.wsGateway.sendToRoom(`user:${data.userId}`, 'notification:new', notification);
    }

    if (data.channels?.includes('email') && data.emailData) {
      await this.emailService.sendNotificationEmail(data.emailData.email, {
        title: data.title,
        message: data.message,
        actionUrl: data.actionUrl,
      });
    }

    if (data.channels?.includes('sms') && data.smsData) {
      await this.smsService.sendSms({
        to: data.smsData.phone,
        message: `${data.title}: ${data.message}`,
      });
    }

    await this.eventBus.emit('notification.sent', {
      notificationId,
      userId: data.userId,
      type: data.type,
      channels: data.channels,
    });

    return notification;
  }

  async getUserNotifications(userId: string, filters?: {
    read?: boolean;
    type?: string;
    limit?: number;
  }) {
    // Filtreleri oluştur
    const conditions = [eq(notifications.userId, userId)];
    
    if (filters?.read !== undefined) {
      conditions.push(eq(notifications.isRead, filters.read));
    }

    if (filters?.type) {
      conditions.push(eq(notifications.type, filters.type));
    }

    // Veritabanından al
    const dbNotifications = await this.db
      .select()
      .from(notifications)
      .where(and(...conditions))
      .orderBy(desc(notifications.createdAt))
      .limit(filters?.limit || 50);

    const userNotifications = dbNotifications.map((n) => ({
      id: n.id,
      userId: n.userId,
      type: n.type as 'info' | 'warning' | 'error' | 'success',
      title: n.title,
      message: n.message,
      actionUrl: n.data?.actionUrl,
      read: n.isRead,
      createdAt: n.createdAt,
      channels: n.data?.channels || ['in_app'],
    }));

    // Toplam ve okunmamış sayısını al
    const allNotifications = await this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId));

    const unreadCount = allNotifications.filter((n) => !n.isRead).length;

    return {
      total: allNotifications.length,
      unread: unreadCount,
      notifications: userNotifications,
    };
  }

  async markAsRead(notificationId: string, userId: string) {
    // Veritabanında güncelle
    const [updated] = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)))
      .returning();

    if (updated) {
      // Memory cache'i güncelle
      const userNotifications = this.notifications.get(userId) || [];
      const notification = userNotifications.find((n) => n.id === notificationId);
      if (notification) {
        notification.read = true;
        this.notifications.set(userId, userNotifications);
      }

      await this.eventBus.emit('notification.read', {
        notificationId,
        userId,
      });

      return {
        id: updated.id,
        userId: updated.userId,
        type: updated.type as 'info' | 'warning' | 'error' | 'success',
        title: updated.title,
        message: updated.message,
        actionUrl: updated.data?.actionUrl,
        read: updated.isRead,
        createdAt: updated.createdAt,
        channels: updated.data?.channels || ['in_app'],
      };
    }

    return null;
  }

  async markAllAsRead(userId: string) {
    // Veritabanında tümünü güncelle
    const updated = await this.db
      .update(notifications)
      .set({ isRead: true })
      .where(eq(notifications.userId, userId))
      .returning();

    // Memory cache'i güncelle
    const userNotifications = this.notifications.get(userId) || [];
    for (const notification of userNotifications) {
      notification.read = true;
    }
    this.notifications.set(userId, userNotifications);

    await this.eventBus.emit('notifications.all.read', { userId });

    return {
      updated: updated.length,
    };
  }

  async deleteNotification(notificationId: string, userId: string) {
    // Veritabanından sil
    await this.db
      .delete(notifications)
      .where(and(eq(notifications.id, notificationId), eq(notifications.userId, userId)));

    // Memory cache'den sil
    const userNotifications = this.notifications.get(userId) || [];
    const filtered = userNotifications.filter((n) => n.id !== notificationId);
    this.notifications.set(userId, filtered);

    return {
      deleted: true,
    };
  }

  async sendBulkNotification(data: {
    userIds: string[];
    type: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    channels?: ('email' | 'sms' | 'push' | 'in_app')[];
  }) {
    const results = [];

    for (const userId of data.userIds) {
      const result = await this.sendNotification({
        userId,
        type: data.type,
        title: data.title,
        message: data.message,
        channels: data.channels,
      });
      results.push(result);
    }

    return {
      sent: results.length,
      notifications: results,
    };
  }

  async sendShipmentNotification(data: {
    userId: string;
    shipmentId: string;
    trackingNumber: string;
    status: string;
    email?: string;
    phone?: string;
  }) {
    return this.sendNotification({
      userId: data.userId,
      type: 'info',
      title: 'Shipment Update',
      message: `Your shipment ${data.trackingNumber} is now ${data.status}`,
      actionUrl: `/tracking/${data.trackingNumber}`,
      channels: ['in_app', 'email', 'sms'],
      emailData: data.email ? { email: data.email } : undefined,
      smsData: data.phone ? { phone: data.phone } : undefined,
    });
  }

  async sendDeliveryNotification(data: {
    userId: string;
    orderNumber: string;
    deliveryTime: Date;
    email?: string;
    phone?: string;
  }) {
    return this.sendNotification({
      userId: data.userId,
      type: 'success',
      title: 'Delivery Completed',
      message: `Your order ${data.orderNumber} has been delivered`,
      channels: ['in_app', 'email', 'sms'],
      emailData: data.email ? { email: data.email } : undefined,
      smsData: data.phone ? { phone: data.phone } : undefined,
    });
  }

  async sendLowStockAlert(data: {
    userId: string;
    productSku: string;
    currentStock: number;
    reorderPoint: number;
  }) {
    return this.sendNotification({
      userId: data.userId,
      type: 'warning',
      title: 'Low Stock Alert',
      message: `Product ${data.productSku} is low on stock: ${data.currentStock} units (reorder at ${data.reorderPoint})`,
      actionUrl: `/inventory/${data.productSku}`,
      channels: ['in_app', 'email'],
    });
  }
}
