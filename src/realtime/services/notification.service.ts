import { Injectable, Logger } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

export interface Notification {
  id: string;
  userId: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  data?: any;
  read: boolean;
  createdAt: Date;
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private notifications: Map<string, Notification[]> = new Map();

  constructor(private realtimeService: RealtimeService) {}

  async createNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    message: string,
    data?: any,
  ): Promise<Notification> {
    const notification: Notification = {
      id: this.generateId(),
      userId,
      type,
      title,
      message,
      data,
      read: false,
      createdAt: new Date(),
    };

    // Store notification
    const userNotifications = this.notifications.get(userId) || [];
    userNotifications.push(notification);
    this.notifications.set(userId, userNotifications);

    // Broadcast real-time notification
    await this.realtimeService.broadcastNotification(userId, notification);

    this.logger.log(`Notification created for user ${userId}: ${title}`);
    return notification;
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async markAsRead(userId: string, notificationId: string): Promise<boolean> {
    const userNotifications = this.notifications.get(userId) || [];
    const notification = userNotifications.find(n => n.id === notificationId);
    
    if (notification) {
      notification.read = true;
      return true;
    }
    
    return false;
  }

  async markAllAsRead(userId: string): Promise<number> {
    const userNotifications = this.notifications.get(userId) || [];
    const unreadCount = userNotifications.filter(n => !n.read).length;
    
    userNotifications.forEach(notification => {
      notification.read = true;
    });
    
    return unreadCount;
  }

  async getUnreadCount(userId: string): Promise<number> {
    const userNotifications = this.notifications.get(userId) || [];
    return userNotifications.filter(n => !n.read).length;
  }

  async deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    const userNotifications = this.notifications.get(userId) || [];
    const index = userNotifications.findIndex(n => n.id === notificationId);
    
    if (index !== -1) {
      userNotifications.splice(index, 1);
      return true;
    }
    
    return false;
  }

  // System notifications
  async notifyInventoryLowStock(inventoryId: string, sku: string, currentQuantity: number, minQuantity: number) {
    // This would typically query for users who should receive this notification
    const adminUsers = ['admin-user-id']; // In real implementation, query from database
    
    for (const userId of adminUsers) {
      await this.createNotification(
        userId,
        'warning',
        'Low Stock Alert',
        `Inventory item ${sku} is running low. Current: ${currentQuantity}, Minimum: ${minQuantity}`,
        { inventoryId, sku, currentQuantity, minQuantity }
      );
    }
  }

  async notifyShipmentStatusChange(shipmentId: string, trackingNumber: string, status: string, customerId: string) {
    await this.createNotification(
      customerId,
      'info',
      'Shipment Update',
      `Your shipment ${trackingNumber} status has been updated to: ${status}`,
      { shipmentId, trackingNumber, status }
    );
  }

  async notifyRouteAssigned(routeId: string, routeName: string, driverId: string) {
    await this.createNotification(
      driverId,
      'info',
      'New Route Assignment',
      `You have been assigned to route: ${routeName}`,
      { routeId, routeName }
    );
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}