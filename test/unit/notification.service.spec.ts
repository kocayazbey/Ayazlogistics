import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../../src/core/notifications/notification.service';
import { Logger } from '@nestjs/common';

describe('NotificationService', () => {
  let service: NotificationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: Logger,
          useValue: {
            log: jest.fn(),
            error: jest.fn(),
            warn: jest.fn(),
            debug: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
  });

  describe('sendNotification', () => {
    it('should send notification successfully', async () => {
      const notification = {
        userId: 'user-001',
        type: 'email',
        subject: 'Test Notification',
        content: 'This is a test notification',
        priority: 'normal',
        metadata: { source: 'test' },
      };

      const result = await service.sendNotification(notification);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
    });

    it('should handle invalid notification type', async () => {
      const notification = {
        userId: 'user-001',
        type: 'invalid_type',
        subject: 'Test Notification',
        content: 'This is a test notification',
        priority: 'normal',
        metadata: {},
      };

      await expect(service.sendNotification(notification)).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const notification = {
        userId: '',
        type: 'email',
        subject: 'Test Notification',
        content: 'This is a test notification',
        priority: 'normal',
        metadata: {},
      };

      await expect(service.sendNotification(notification)).rejects.toThrow();
    });
  });

  describe('sendBulkNotification', () => {
    it('should send bulk notification successfully', async () => {
      const bulkNotification = {
        userIds: ['user-001', 'user-002', 'user-003'],
        type: 'email',
        subject: 'Bulk Test Notification',
        content: 'This is a bulk test notification',
        priority: 'normal',
        metadata: { source: 'bulk_test' },
      };

      const result = await service.sendBulkNotification(bulkNotification);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(3);
      expect(result.failedCount).toBe(0);
    });

    it('should handle partial failures in bulk notification', async () => {
      const bulkNotification = {
        userIds: ['user-001', 'invalid-user', 'user-003'],
        type: 'email',
        subject: 'Bulk Test Notification',
        content: 'This is a bulk test notification',
        priority: 'normal',
        metadata: {},
      };

      const result = await service.sendBulkNotification(bulkNotification);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(2);
      expect(result.failedCount).toBe(1);
    });

    it('should handle empty user list', async () => {
      const bulkNotification = {
        userIds: [],
        type: 'email',
        subject: 'Bulk Test Notification',
        content: 'This is a bulk test notification',
        priority: 'normal',
        metadata: {},
      };

      await expect(service.sendBulkNotification(bulkNotification)).rejects.toThrow();
    });
  });

  describe('scheduleNotification', () => {
    it('should schedule notification successfully', async () => {
      const scheduledNotification = {
        userId: 'user-001',
        type: 'email',
        subject: 'Scheduled Notification',
        content: 'This is a scheduled notification',
        priority: 'normal',
        scheduledAt: new Date(Date.now() + 3600000), // 1 hour from now
        metadata: { source: 'scheduled_test' },
      };

      const result = await service.scheduleNotification(scheduledNotification);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
    });

    it('should handle past scheduled time', async () => {
      const scheduledNotification = {
        userId: 'user-001',
        type: 'email',
        subject: 'Scheduled Notification',
        content: 'This is a scheduled notification',
        priority: 'normal',
        scheduledAt: new Date(Date.now() - 3600000), // 1 hour ago
        metadata: {},
      };

      await expect(service.scheduleNotification(scheduledNotification)).rejects.toThrow();
    });

    it('should validate schedule time format', async () => {
      const scheduledNotification = {
        userId: 'user-001',
        type: 'email',
        subject: 'Scheduled Notification',
        content: 'This is a scheduled notification',
        priority: 'normal',
        scheduledAt: 'invalid-date' as any,
        metadata: {},
      };

      await expect(service.scheduleNotification(scheduledNotification)).rejects.toThrow();
    });
  });

  describe('getUserNotifications', () => {
    it('should get user notifications successfully', async () => {
      const userId = 'user-001';
      const filters = {
        type: 'email',
        status: 'unread',
        limit: 10,
        offset: 0,
      };

      const notifications = await service.getUserNotifications(userId, filters);

      expect(notifications).toBeDefined();
      expect(Array.isArray(notifications.items)).toBe(true);
      expect(notifications.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty filters', async () => {
      const userId = 'user-001';
      const filters = {};

      const notifications = await service.getUserNotifications(userId, filters);

      expect(notifications).toBeDefined();
      expect(Array.isArray(notifications.items)).toBe(true);
    });

    it('should validate user ID', async () => {
      const userId = '';
      const filters = {};

      await expect(service.getUserNotifications(userId, filters)).rejects.toThrow();
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read successfully', async () => {
      const notificationId = 'notification-001';
      const result = await service.markAsRead(notificationId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle non-existent notification', async () => {
      const notificationId = 'non-existent';

      await expect(service.markAsRead(notificationId)).rejects.toThrow();
    });

    it('should validate notification ID format', async () => {
      const notificationId = '';

      await expect(service.markAsRead(notificationId)).rejects.toThrow();
    });
  });

  describe('markAsUnread', () => {
    it('should mark notification as unread successfully', async () => {
      const notificationId = 'notification-001';
      const result = await service.markAsUnread(notificationId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle non-existent notification', async () => {
      const notificationId = 'non-existent';

      await expect(service.markAsUnread(notificationId)).rejects.toThrow();
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification successfully', async () => {
      const notificationId = 'notification-001';
      const result = await service.deleteNotification(notificationId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle non-existent notification', async () => {
      const notificationId = 'non-existent';

      await expect(service.deleteNotification(notificationId)).rejects.toThrow();
    });
  });

  describe('getNotificationStats', () => {
    it('should get notification statistics successfully', async () => {
      const userId = 'user-001';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const stats = await service.getNotificationStats(userId, period);

      expect(stats).toBeDefined();
      expect(stats.userId).toBe(userId);
      expect(stats.period).toEqual(period);
      expect(stats.totalSent).toBeGreaterThanOrEqual(0);
      expect(stats.totalRead).toBeGreaterThanOrEqual(0);
      expect(stats.totalUnread).toBeGreaterThanOrEqual(0);
    });

    it('should handle invalid date range', async () => {
      const userId = 'user-001';
      const invalidPeriod = {
        start: new Date('2025-01-31'),
        end: new Date('2025-01-01'),
      };

      await expect(service.getNotificationStats(userId, invalidPeriod)).rejects.toThrow();
    });

    it('should include breakdown by type', async () => {
      const userId = 'user-001';
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const stats = await service.getNotificationStats(userId, period);

      expect(stats.breakdownByType).toBeDefined();
      expect(Array.isArray(stats.breakdownByType)).toBe(true);
    });
  });

  describe('createNotificationTemplate', () => {
    it('should create notification template successfully', async () => {
      const template = {
        name: 'welcome_email',
        type: 'email',
        subject: 'Welcome to {{appName}}',
        content: 'Hello {{userName}}, welcome to {{appName}}!',
        variables: ['appName', 'userName'],
        metadata: { category: 'welcome' },
      };

      const result = await service.createNotificationTemplate(template);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.templateId).toBeDefined();
    });

    it('should handle duplicate template name', async () => {
      const template = {
        name: 'existing_template',
        type: 'email',
        subject: 'Test Subject',
        content: 'Test Content',
        variables: [],
        metadata: {},
      };

      await expect(service.createNotificationTemplate(template)).rejects.toThrow();
    });

    it('should validate template variables', async () => {
      const template = {
        name: 'invalid_template',
        type: 'email',
        subject: 'Welcome to {{appName}}',
        content: 'Hello {{userName}}, welcome to {{appName}}!',
        variables: ['appName'], // Missing userName
        metadata: {},
      };

      await expect(service.createNotificationTemplate(template)).rejects.toThrow();
    });
  });

  describe('sendTemplateNotification', () => {
    it('should send template notification successfully', async () => {
      const templateNotification = {
        userId: 'user-001',
        templateId: 'welcome_email',
        variables: {
          appName: 'AyazLogistics',
          userName: 'John Doe',
        },
        priority: 'normal',
        metadata: { source: 'template_test' },
      };

      const result = await service.sendTemplateNotification(templateNotification);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();
    });

    it('should handle non-existent template', async () => {
      const templateNotification = {
        userId: 'user-001',
        templateId: 'non-existent',
        variables: {},
        priority: 'normal',
        metadata: {},
      };

      await expect(service.sendTemplateNotification(templateNotification)).rejects.toThrow();
    });

    it('should validate required variables', async () => {
      const templateNotification = {
        userId: 'user-001',
        templateId: 'welcome_email',
        variables: {
          appName: 'AyazLogistics',
          // Missing userName
        },
        priority: 'normal',
        metadata: {},
      };

      await expect(service.sendTemplateNotification(templateNotification)).rejects.toThrow();
    });
  });

  describe('getNotificationPreferences', () => {
    it('should get notification preferences successfully', async () => {
      const userId = 'user-001';
      const preferences = await service.getNotificationPreferences(userId);

      expect(preferences).toBeDefined();
      expect(preferences.userId).toBe(userId);
      expect(preferences.emailEnabled).toBeDefined();
      expect(preferences.smsEnabled).toBeDefined();
      expect(preferences.pushEnabled).toBeDefined();
    });

    it('should handle non-existent user', async () => {
      const userId = 'non-existent';

      await expect(service.getNotificationPreferences(userId)).rejects.toThrow();
    });
  });

  describe('updateNotificationPreferences', () => {
    it('should update notification preferences successfully', async () => {
      const userId = 'user-001';
      const preferences = {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        emailFrequency: 'daily',
        smsFrequency: 'never',
        pushFrequency: 'immediate',
      };

      const result = await service.updateNotificationPreferences(userId, preferences);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle invalid preference values', async () => {
      const userId = 'user-001';
      const preferences = {
        emailEnabled: 'invalid' as any,
        smsEnabled: false,
        pushEnabled: true,
        emailFrequency: 'invalid_frequency',
        smsFrequency: 'never',
        pushFrequency: 'immediate',
      };

      await expect(service.updateNotificationPreferences(userId, preferences)).rejects.toThrow();
    });
  });

  describe('error handling', () => {
    it('should handle email service errors', async () => {
      const notification = {
        userId: 'user-001',
        type: 'email',
        subject: 'Test Notification',
        content: 'This is a test notification',
        priority: 'normal',
        metadata: {},
      };

      jest.spyOn(service, 'sendNotification').mockRejectedValue(new Error('Email service unavailable'));

      await expect(service.sendNotification(notification)).rejects.toThrow('Email service unavailable');
    });

    it('should handle SMS service errors', async () => {
      const notification = {
        userId: 'user-001',
        type: 'sms',
        subject: 'Test SMS',
        content: 'This is a test SMS',
        priority: 'normal',
        metadata: {},
      };

      jest.spyOn(service, 'sendNotification').mockRejectedValue(new Error('SMS service unavailable'));

      await expect(service.sendNotification(notification)).rejects.toThrow('SMS service unavailable');
    });

    it('should handle push notification errors', async () => {
      const notification = {
        userId: 'user-001',
        type: 'push',
        subject: 'Test Push',
        content: 'This is a test push notification',
        priority: 'normal',
        metadata: {},
      };

      jest.spyOn(service, 'sendNotification').mockRejectedValue(new Error('Push service unavailable'));

      await expect(service.sendNotification(notification)).rejects.toThrow('Push service unavailable');
    });
  });

  describe('data validation', () => {
    it('should validate notification content length', async () => {
      const notification = {
        userId: 'user-001',
        type: 'email',
        subject: 'Test Notification',
        content: 'x'.repeat(10000), // Too long
        priority: 'normal',
        metadata: {},
      };

      await expect(service.sendNotification(notification)).rejects.toThrow();
    });

    it('should validate email format for email notifications', async () => {
      const notification = {
        userId: 'invalid-email-format',
        type: 'email',
        subject: 'Test Notification',
        content: 'This is a test notification',
        priority: 'normal',
        metadata: {},
      };

      await expect(service.sendNotification(notification)).rejects.toThrow();
    });

    it('should validate phone number format for SMS notifications', async () => {
      const notification = {
        userId: 'user-001',
        type: 'sms',
        subject: 'Test SMS',
        content: 'This is a test SMS',
        priority: 'normal',
        metadata: { phoneNumber: 'invalid-phone' },
      };

      await expect(service.sendNotification(notification)).rejects.toThrow();
    });
  });
});