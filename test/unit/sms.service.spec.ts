import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from '../../src/core/sms/sms.service';
import { Logger } from '@nestjs/common';

describe('SmsService', () => {
  let service: SmsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
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

    service = module.get<SmsService>(SmsService);
  });

  describe('sendSms', () => {
    it('should send SMS successfully', async () => {
      const smsData = {
        to: '+905551234567',
        message: 'This is a test SMS',
        from: '+905559876543',
      };

      const result = await service.sendSms(smsData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should handle invalid phone number', async () => {
      const smsData = {
        to: 'invalid-phone',
        message: 'This is a test SMS',
        from: '+905559876543',
      };

      await expect(service.sendSms(smsData)).rejects.toThrow();
    });

    it('should validate required fields', async () => {
      const smsData = {
        to: '',
        message: 'This is a test SMS',
        from: '+905559876543',
      };

      await expect(service.sendSms(smsData)).rejects.toThrow();
    });
  });

  describe('sendBulkSms', () => {
    it('should send bulk SMS successfully', async () => {
      const bulkSmsData = {
        recipients: ['+905551234567', '+905551234568'],
        message: 'This is a bulk test SMS',
        from: '+905559876543',
      };

      const result = await service.sendBulkSms(bulkSmsData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(2);
      expect(result.failedCount).toBe(0);
    });

    it('should handle partial failures in bulk SMS', async () => {
      const bulkSmsData = {
        recipients: ['+905551234567', 'invalid-phone'],
        message: 'This is a bulk test SMS',
        from: '+905559876543',
      };

      const result = await service.sendBulkSms(bulkSmsData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.totalSent).toBe(1);
      expect(result.failedCount).toBe(1);
    });

    it('should handle empty recipients list', async () => {
      const bulkSmsData = {
        recipients: [],
        message: 'This is a bulk test SMS',
        from: '+905559876543',
      };

      await expect(service.sendBulkSms(bulkSmsData)).rejects.toThrow();
    });
  });

  describe('sendTemplateSms', () => {
    it('should send template SMS successfully', async () => {
      const templateSmsData = {
        to: '+905551234567',
        templateId: 'welcome-template',
        variables: {
          userName: 'John Doe',
          companyName: 'AyazLogistics',
        },
        from: '+905559876543',
      };

      const result = await service.sendTemplateSms(templateSmsData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should handle non-existent template', async () => {
      const templateSmsData = {
        to: '+905551234567',
        templateId: 'non-existent-template',
        variables: {},
        from: '+905559876543',
      };

      await expect(service.sendTemplateSms(templateSmsData)).rejects.toThrow();
    });

    it('should validate required template variables', async () => {
      const templateSmsData = {
        to: '+905551234567',
        templateId: 'welcome-template',
        variables: {
          userName: 'John Doe',
          // Missing companyName
        },
        from: '+905559876543',
      };

      await expect(service.sendTemplateSms(templateSmsData)).rejects.toThrow();
    });
  });

  describe('scheduleSms', () => {
    it('should schedule SMS successfully', async () => {
      const scheduledSmsData = {
        to: '+905551234567',
        message: 'This is a scheduled SMS',
        from: '+905559876543',
        scheduledAt: new Date(Date.now() + 3600000), // 1 hour from now
      };

      const result = await service.scheduleSms(scheduledSmsData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.scheduleId).toBeDefined();
    });

    it('should handle past scheduled time', async () => {
      const scheduledSmsData = {
        to: '+905551234567',
        message: 'This is a scheduled SMS',
        from: '+905559876543',
        scheduledAt: new Date(Date.now() - 3600000), // 1 hour ago
      };

      await expect(service.scheduleSms(scheduledSmsData)).rejects.toThrow();
    });

    it('should validate schedule time format', async () => {
      const scheduledSmsData = {
        to: '+905551234567',
        message: 'This is a scheduled SMS',
        from: '+905559876543',
        scheduledAt: 'invalid-date' as any,
      };

      await expect(service.scheduleSms(scheduledSmsData)).rejects.toThrow();
    });
  });

  describe('getSmsStatus', () => {
    it('should get SMS status successfully', async () => {
      const messageId = 'message-001';
      const status = await service.getSmsStatus(messageId);

      expect(status).toBeDefined();
      expect(status.messageId).toBe(messageId);
      expect(status.status).toBeDefined();
    });

    it('should handle non-existent message', async () => {
      const messageId = 'non-existent';

      await expect(service.getSmsStatus(messageId)).rejects.toThrow();
    });
  });

  describe('getSmsHistory', () => {
    it('should get SMS history successfully', async () => {
      const filters = {
        recipient: '+905551234567',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-01-31'),
        limit: 10,
        offset: 0,
      };

      const history = await service.getSmsHistory(filters);

      expect(history).toBeDefined();
      expect(Array.isArray(history.sms)).toBe(true);
      expect(history.totalCount).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty filters', async () => {
      const filters = {};

      const history = await service.getSmsHistory(filters);

      expect(history).toBeDefined();
      expect(Array.isArray(history.sms)).toBe(true);
    });

    it('should validate date range', async () => {
      const filters = {
        startDate: new Date('2025-01-31'),
        endDate: new Date('2025-01-01'),
      };

      await expect(service.getSmsHistory(filters)).rejects.toThrow();
    });
  });

  describe('createSmsTemplate', () => {
    it('should create SMS template successfully', async () => {
      const templateData = {
        name: 'welcome_template',
        message: 'Welcome to {{companyName}}, {{userName}}!',
        variables: ['userName', 'companyName'],
        category: 'welcome',
      };

      const result = await service.createSmsTemplate(templateData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.templateId).toBeDefined();
    });

    it('should handle duplicate template name', async () => {
      const templateData = {
        name: 'existing_template',
        message: 'Test Message',
        variables: [],
        category: 'test',
      };

      await expect(service.createSmsTemplate(templateData)).rejects.toThrow();
    });

    it('should validate template variables', async () => {
      const templateData = {
        name: 'invalid_template',
        message: 'Welcome to {{companyName}}, {{userName}}!',
        variables: ['userName'], // Missing companyName
        category: 'welcome',
      };

      await expect(service.createSmsTemplate(templateData)).rejects.toThrow();
    });
  });

  describe('updateSmsTemplate', () => {
    it('should update SMS template successfully', async () => {
      const templateId = 'template-001';
      const updateData = {
        message: 'Updated Welcome to {{companyName}}, {{userName}}!',
      };

      const result = await service.updateSmsTemplate(templateId, updateData);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle non-existent template', async () => {
      const templateId = 'non-existent';
      const updateData = {
        message: 'Updated Message',
      };

      await expect(service.updateSmsTemplate(templateId, updateData)).rejects.toThrow();
    });
  });

  describe('deleteSmsTemplate', () => {
    it('should delete SMS template successfully', async () => {
      const templateId = 'template-001';
      const result = await service.deleteSmsTemplate(templateId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });

    it('should handle non-existent template', async () => {
      const templateId = 'non-existent';

      await expect(service.deleteSmsTemplate(templateId)).rejects.toThrow();
    });
  });

  describe('getSmsTemplates', () => {
    it('should get SMS templates successfully', async () => {
      const filters = {
        category: 'welcome',
        limit: 10,
        offset: 0,
      };

      const templates = await service.getSmsTemplates(filters);

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
    });

    it('should handle empty filters', async () => {
      const filters = {};

      const templates = await service.getSmsTemplates(filters);

      expect(templates).toBeDefined();
      expect(Array.isArray(templates)).toBe(true);
    });
  });

  describe('getSmsStatistics', () => {
    it('should get SMS statistics successfully', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const statistics = await service.getSmsStatistics(period);

      expect(statistics).toBeDefined();
      expect(statistics.period).toEqual(period);
      expect(statistics.totalSent).toBeGreaterThanOrEqual(0);
      expect(statistics.totalDelivered).toBeGreaterThanOrEqual(0);
      expect(statistics.totalFailed).toBeGreaterThanOrEqual(0);
    });

    it('should include delivery rate', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const statistics = await service.getSmsStatistics(period);

      expect(statistics.deliveryRate).toBeDefined();
      expect(statistics.deliveryRate).toBeGreaterThanOrEqual(0);
      expect(statistics.deliveryRate).toBeLessThanOrEqual(100);
    });

    it('should include cost breakdown', async () => {
      const period = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31'),
      };

      const statistics = await service.getSmsStatistics(period);

      expect(statistics.costBreakdown).toBeDefined();
      expect(statistics.costBreakdown.totalCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('error handling', () => {
    it('should handle SMS service errors', async () => {
      const smsData = {
        to: '+905551234567',
        message: 'This is a test SMS',
        from: '+905559876543',
      };

      jest.spyOn(service, 'sendSms').mockRejectedValue(new Error('SMS service unavailable'));

      await expect(service.sendSms(smsData)).rejects.toThrow('SMS service unavailable');
    });

    it('should handle template service errors', async () => {
      const templateSmsData = {
        to: '+905551234567',
        templateId: 'welcome-template',
        variables: {},
        from: '+905559876543',
      };

      jest.spyOn(service, 'sendTemplateSms').mockRejectedValue(new Error('Template service unavailable'));

      await expect(service.sendTemplateSms(templateSmsData)).rejects.toThrow('Template service unavailable');
    });

    it('should handle scheduling service errors', async () => {
      const scheduledSmsData = {
        to: '+905551234567',
        message: 'This is a scheduled SMS',
        from: '+905559876543',
        scheduledAt: new Date(Date.now() + 3600000),
      };

      jest.spyOn(service, 'scheduleSms').mockRejectedValue(new Error('Scheduling service unavailable'));

      await expect(service.scheduleSms(scheduledSmsData)).rejects.toThrow('Scheduling service unavailable');
    });
  });

  describe('data validation', () => {
    it('should validate SMS message length', async () => {
      const smsData = {
        to: '+905551234567',
        message: 'x'.repeat(1000), // Too long
        from: '+905559876543',
      };

      await expect(service.sendSms(smsData)).rejects.toThrow();
    });

    it('should validate phone number format', async () => {
      const smsData = {
        to: 'invalid-phone-format',
        message: 'This is a test SMS',
        from: '+905559876543',
      };

      await expect(service.sendSms(smsData)).rejects.toThrow();
    });

    it('should validate template content', async () => {
      const templateData = {
        name: 'invalid_template',
        message: 'x'.repeat(1000), // Too long
        variables: [],
        category: 'test',
      };

      await expect(service.createSmsTemplate(templateData)).rejects.toThrow();
    });
  });
});
