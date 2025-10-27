import { Injectable } from '@nestjs/common';
import { NotificationWebSocketGateway } from './websocket.gateway';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  userId?: string;
  tenantId: string;
  metadata?: any;
  timestamp: Date;
  read?: boolean;
}

@Injectable()
export class NotificationWebSocketService {
  constructor(
    private readonly notificationGateway: NotificationWebSocketGateway,
  ) {}

  async sendUserNotification(userId: string, notification: Omit<Notification, 'id' | 'timestamp'>) {
    const fullNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    this.notificationGateway.sendUserNotification(userId, fullNotification);
    
    return fullNotification;
  }

  async sendBroadcastNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'userId'>) {
    const fullNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      read: false,
    };

    this.notificationGateway.sendBroadcast(fullNotification);
    
    return fullNotification;
  }

  async sendInvoiceNotification(userId: string, invoiceData: {
    invoiceNumber: string;
    amount: number;
    currency: string;
    dueDate: Date;
  }) {
    return this.sendUserNotification(userId, {
      type: 'info',
      title: 'Yeni Fatura',
      message: `Fatura ${invoiceData.invoiceNumber} oluşturuldu. Tutar: ${invoiceData.amount} ${invoiceData.currency}`,
      tenantId: '',
      metadata: invoiceData,
    });
  }

  async sendDeliveryNotification(userId: string, deliveryData: {
    trackingNumber: string;
    status: string;
    location?: string;
  }) {
    const statusMessages = {
      picked_up: 'Kargo toplandı',
      in_transit: 'Kargo yolda',
      delivered: 'Kargo teslim edildi',
      delayed: 'Kargo gecikti',
    };

    return this.sendUserNotification(userId, {
      type: deliveryData.status === 'delivered' ? 'success' : 'info',
      title: 'Teslimat Güncellemesi',
      message: `${deliveryData.trackingNumber}: ${statusMessages[deliveryData.status] || deliveryData.status}`,
      tenantId: '',
      metadata: deliveryData,
    });
  }

  async sendSystemAlert(tenantId: string, alertData: {
    severity: 'info' | 'warning' | 'error';
    title: string;
    message: string;
  }) {
    return this.sendBroadcastNotification({
      type: alertData.severity,
      title: alertData.title,
      message: alertData.message,
      tenantId,
    });
  }
}

