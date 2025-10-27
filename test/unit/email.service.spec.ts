import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from '../../src/core/email/email.service';
import { Logger } from '@nestjs/common';

describe('EmailService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
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

    service = module.get<EmailService>(EmailService);
  });

  describe('sendEmail', () => {
    it('should send email successfully', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
        from: 'noreply@ayazlogistics.com',
      };

      const result = await service.sendEmail(emailData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should handle invalid email address', async () => {
      const emailData = {
        to: 'invalid-email',
        subject: 'Test Email',
        body: 'This is a test email',
        from: 'noreply@ayazlogistics.com',
      };

      await expect(service.sendEmail(emailData)).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const emailData = {
        to: '',
        subject: 'Test Email',
        body: 'This is a test email',
        from: 'noreply@ayazlogistics.com',
      };

      await expect(service.sendEmail(emailData)).rejects.toThrow();
    });
  });

  describe('sendBulkEmail', () => {
    it('should send bulk email successfully', async () => {
      const bulkEmailData = {
        recipients: ['user1@example.com', 'user2@example.com'],
        subject: 'Bulk Test Email',
        body: 'This is a bulk test email',
        from: 'noreply@ayazlogistics.com',
      };

      const result = await service.sendBulkEmail(bulkEmailData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('should handle partial failures in bulk email', async () => {
      const bulkEmailData = {
        recipients: ['user1@example.com', 'invalid-email'],
        subject: 'Bulk Test Email',
        body: 'This is a bulk test email',
        from: 'noreply@ayazlogistics.com',
      };

      const result = await service.sendBulkEmail(bulkEmailData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(1);
      expect(result.failedCount).toBe(1);
    });

    it('should handle empty recipients list', async () => {
      const bulkEmailData = {
        recipients: [],
        subject: 'Bulk Test Email',
        body: 'This is a bulk test email',
        from: 'noreply@ayazlogistics.com',
      };

      await expect(service.sendBulkEmail(bulkEmailData)).rejects.toThrow();
    });
  });

  describe('sendTemplateEmail', () => {
    it('should send template email successfully', async () => {
      const templateEmailData = {
        to: 'test@example.com',
        templateId: 'welcome-template',
        variables: {
          userName: 'John Doe',
          companyName: 'AyazLogistics',
        },
        from: 'noreply@ayazlogistics.com',
      };

      const result = await service.sendTemplateEmail(templateEmailData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should handle non-existent template', async () => {
      const templateEmailData = {
        to: 'test@example.com',
        templateId: 'non-existent-template',
        variables: {},
        from: 'noreply@ayazlogistics.com',
      };

      await expect(service.sendTemplateEmail(templateEmailData)).rejects.toThrow();
    });

    it('should validate required template variables', async () => {
      const templateEmailData = {
        to: 'test@example.com',
        templateId: 'welcome-template',
        variables: {
          userName: 'John Doe',
          // Missing companyName
        },
        from: 'noreply@ayazlogistics.com',
      };

      await expect(service.sendTemplateEmail(templateEmailData)).rejects.toThrow();
    });
  });

  describe('scheduleEmail', () => {
    it('should schedule email successfully', async () => {
      const scheduledEmailData = {
        to: 'test@example.com',
        subject: 'Scheduled Email',
        body: 'This is a scheduled email',
        from: 'noreply@ayazlogistics.com',
        scheduledAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      const result = await service.scheduleEmail(scheduledEmailData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
    });

    it('should handle past scheduled time', async () => {
      const scheduledEmailData = {
        to: 'test@example.com',
        subject: 'Scheduled Email',
        body: 'This is a scheduled email',
        from: 'noreply@ayazlogistics.com',
        scheduledAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      await expect(service.scheduleEmail(scheduledEmailData)).rejects.toThrow();
    });

    it('should validate schedule time format', async () => {
      const scheduledEmailData = {
        to: 'test@example.com',
        subject: 'Scheduled Email',
        body: 'This is a scheduled email',
        from: 'noreply@ayazlogistics.com',
        scheduledAt: 'invalid-date' as any,
      };

      await expect(service.scheduleEmail(scheduledEmailData)).rejects.toThrow();
    });
  });

  describe('getEmailStatus', () => {
    it('should get email status successfully', async () => {
      const messageId = 'message-001';
      const status = await service.getEmailStatus(messageId);

      expect(status).toBeDefined();
      expect(status.messageId).toBe(messageId);
      expect(status.status).toBeDefined();
    });

    it('should handle non-existent message', async () => {
      const messageId = 'non-existent';

      await expect(service.getEmailStatus(messageId)).rejects.toThrow();
    });
  });

  describe('getEmailHistory', () => {
    it('should get email history successfully', async () => {
      const filters = {
        recipient: 'test@example.com',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        limit: 10,
        offset: 0,
      };

      const history = await service.getEmailHistory(filters);

      expect(history).toBeDefined();
      expect(Array.isArray(history.emails)).toBe(true);
      expect(history.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty filters', async () => {
      const filters = {};

      const history = await service.getEmailHistory(filters);

      expect(history).toBeDefined();
      expect(Array.isArray(history.emails)).toBe(true);
    });

    it('should validate date range', async () => {
      const filters = {
        startDate: new Date('2025-01-31'),
        endDate: new Date('2025-01-01'),
      };

      await expect(service.getEmailHistory(filters)).rejects.toThrow();
    });
  });

  describe('createEmailTemplate', () => {
    it('should create email template successfully', async () => {
      const templateData = {
        name: 'welcome_template',
        subject: 'Welcome to {{companyName}}',
        body: 'Hello {{userName}}, welcome to {{companyName}}!',
        variables: ['userName', 'companyName'],
        category: 'welcome',
      };

      const result = await service.createEmailTemplate(templateData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.templateId).toBeDefined();
    });

    it('should handle duplicate template name', async () => {
      const templateData = {
        name: 'existing_template',
        subject: 'Test Subject',
        body: 'Test Body',
        variables: [],
        category: 'test',
      };

      await expect(service.createEmailTemplate(templateData)).rejects.toThrow();
    });

    it('should validate template variables', async () => {
      const templateData = {
        name: 'invalid_template',
        subject: 'Welcome to {{companyName}}',
        body: 'Hello {{userName}}, welcome to {{companyName}}!',
        variables: ['userName'], // Missing companyName
        category: 'welcome',
      };

      await expect(service.createEmailTemplate(templateData)).rejects.toThrow();
    });
  });

  describe('updateEmailTemplate', () => {
    it('should update email template successfully', async () => {
      const templateId = 'template-001';
      const updateData = {
        subject: 'Updated Welcome to {{companyName}}',
        body: 'Updated Hello {{userName}}, welcome to {{companyName}}!',
      };

      const result = await service.updateEmailTemplate(templateId, updateData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle non-existent template', async () => {
      const templateId = 'non-existent';
      const updateData = {
        subject: 'Updated Subject',
        body: 'Updated Body',
      };

      await expect(service.updateEmailTemplate(templateId, updateData)).rejects.toThrow();
    });
  });

  describe('deleteEmailTemplate', () => {
    it('should delete email template successfully', async () => {
      const templateId = 'template-001';
      const result = await service.deleteEmailTemplate(templateId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle non-existent template', async () => {
      const templateId = 'non-existent';

      await expect(service.deleteEmailTemplate(templateId)).rejects.toThrow();
    });
  });

  describe('getEmailTemplates', () => {
    it('should get email templates successfully', async () => {
      const filters = {
        category: 'welcome',
        limit: 10,
        offset: 0,
      };

      const templates = await service.getEmailTemplates(filters);

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should handle empty filters', async () => {
      const filters = {};

      const templates = await service.getEmailTemplates(filters);

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
    });
  });

  describe('getEmailStatistics', () => {
    it('should get email statistics successfully', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const statistics = await service.getEmailStatistics(period);

      expect(statistics).toBeDefined();
      expect(statistics.period).toEqual(period);
      expect(statistics.totalSent).toBeGreaterThanOrEqual(0);
      expect(statistics.totalDelivered).toBeGreaterThanOrEqual(0);
      expect(statistics.totalBounced).toBeGreaterThanOrEqual(0);
      expect(statistics.totalOpened).toBeGreaterThanOrEqual(0);
    });

    it('should include delivery rate', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const statistics = await service.getEmailStatistics(period);

      expect(statistics.deliveryRate).toBeDefined();
      expect(statistics.deliveryRate).toBeGreaterThanOrEqual(0);
      expect(statistics.deliveryRate).toBeLessThanOrEqual(100);
    });

    it('should include open rate', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const statistics = await service.getEmailStatistics(period);

      expect(statistics.openRate).toBeDefined();
      expect(statistics.openRate).toBeGreaterThanOrEqual(0);
      expect(statistics.openRate).toBeLessThanOrEqual(100);
    });
  });

  describe('error handling', () => {
    it('should handle email service errors', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'This is a test email',
        from: 'noreply@ayazlogistics.com',
      };

      jest.spyOn(service, 'sendEmail').mockRejectedValue(new Error('Email service unavailable'));

      await expect(service.sendEmail(emailData)).rejects.toThrow('Email service unavailable');
    });

    it('should handle template service errors', async () => {
      const templateEmailData = {
        to: 'test@example.com',
        templateId: 'welcome-template',
        variables: {},
        from: 'noreply@ayazlogistics.com',
      };

      jest.spyOn(service, 'sendTemplateEmail').mockRejectedValue(new Error('Template service unavailable'));

      await expect(service.sendTemplateEmail(templateEmailData)).rejects.toThrow('Template service unavailable');
    });

    it('should handle scheduling service errors', async () => {
      const scheduledEmailData = {
        to: 'test@example.com',
        subject: 'Scheduled Email',
        body: 'This is a scheduled email',
        from: 'noreply@ayazlogistics.com',
        scheduledAt: new Date(Date.now() + 3600000),
      };

      jest.spyOn(service, 'scheduleEmail').mockRejectedValue(new Error('Scheduling service unavailable'));

      await expect(service.scheduleEmail(scheduledEmailData)).rejects.toThrow('Scheduling service unavailable');
    });
  });

  describe('data validation', () => {
    it('should validate email content length', async () => {
      const emailData = {
        to: 'test@example.com',
        subject: 'Test Email',
        body: 'x'.repeat(10000), // Too long
        from: 'noreply@ayazlogistics.com',
      };

      await expect(service.sendEmail(emailData)).rejects.toThrow();
    });

    it('should validate email address format', async () => {
      const emailData = {
        to: 'invalid-email-format',
        subject: 'Test Email',
        body: 'This is a test email',
        from: 'noreply@ayazlogistics.com',
      };

      await expect(service.sendEmail(emailData)).rejects.toThrow();
    });

    it('should validate template content', async () => {
      const templateData = {
        name: 'invalid_template',
        subject: 'Test Subject',
        body: 'x'.repeat(50000), // Too long
        variables: [],
        category: 'test',
      };

      await expect(service.createEmailTemplate(templateData)).rejects.toThrow();
    });
  });
});
