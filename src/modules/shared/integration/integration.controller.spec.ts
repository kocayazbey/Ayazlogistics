import { Test, TestingModule } from '@nestjs/testing';
import { IntegrationController } from './integration.controller';

describe('IntegrationController', () => {
  let controller: IntegrationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IntegrationController],
    }).compile();

    controller = module.get<IntegrationController>(IntegrationController);
  });

  describe('getIntegrations', () => {
    it('should return all integrations', async () => {
      const result = await controller.getIntegrations('tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.count).toBeGreaterThan(0);
    });

    it('should filter integrations by type', async () => {
      const result = await controller.getIntegrations('tenant-1', 'payment');

      expect(result.success).toBe(true);
      expect(result.data.every((i: any) => i.type === 'payment')).toBe(true);
    });

    it('should filter integrations by active status', async () => {
      const result = await controller.getIntegrations('tenant-1', undefined, true);

      expect(result.success).toBe(true);
      expect(result.data.every((i: any) => i.isActive === true)).toBe(true);
    });
  });

  describe('getIntegrationById', () => {
    it('should return integration by ID', async () => {
      const result = await controller.getIntegrationById('1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.id).toBe('1');
    });
  });

  describe('createIntegration', () => {
    it('should create a new integration', async () => {
      const integrationData = {
        name: 'New Integration',
        type: 'payment',
        provider: 'stripe',
        config: {},
      };

      const result = await controller.createIntegration(
        integrationData,
        'tenant-1',
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Integration created successfully');
      expect(result.data.name).toBe(integrationData.name);
    });
  });

  describe('updateIntegration', () => {
    it('should update an integration', async () => {
      const updateData = { name: 'Updated Name' };

      const result = await controller.updateIntegration(
        '1',
        updateData,
        'tenant-1',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Integration updated successfully');
    });
  });

  describe('deleteIntegration', () => {
    it('should delete an integration', async () => {
      const result = await controller.deleteIntegration('1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Integration deleted successfully');
    });
  });

  describe('enableIntegration', () => {
    it('should enable an integration', async () => {
      const result = await controller.enableIntegration('1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Integration enabled');
      expect(result.data.isActive).toBe(true);
    });
  });

  describe('disableIntegration', () => {
    it('should disable an integration', async () => {
      const result = await controller.disableIntegration('1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Integration disabled');
      expect(result.data.isActive).toBe(false);
    });
  });

  describe('getIntegrationLogs', () => {
    it('should return integration logs', async () => {
      const result = await controller.getIntegrationLogs('1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should filter logs by success status', async () => {
      const result = await controller.getIntegrationLogs(
        '1',
        undefined,
        undefined,
        true,
      );

      expect(result.success).toBe(true);
      expect(result.data.every((log: any) => log.success === true)).toBe(true);
    });

    it('should limit number of logs', async () => {
      const result = await controller.getIntegrationLogs(
        '1',
        undefined,
        undefined,
        undefined,
        2,
      );

      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(2);
    });
  });

  describe('testIntegration', () => {
    it('should test integration connection', async () => {
      const result = await controller.testIntegration('1', 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Integration test completed');
      expect(result.data.tested).toBe(true);
      expect(result.data.success).toBe(true);
    });
  });

  describe('triggerSync', () => {
    it('should trigger manual sync', async () => {
      const result = await controller.triggerSync('1', {}, 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Sync triggered successfully');
      expect(result.data.status).toBe('in_progress');
    });

    it('should trigger sync for specific entity', async () => {
      const result = await controller.triggerSync(
        '1',
        { entity: 'orders' },
        'tenant-1',
      );

      expect(result.success).toBe(true);
      expect(result.data.entity).toBe('orders');
    });
  });

  describe('getSyncHistory', () => {
    it('should return sync history', async () => {
      const result = await controller.getSyncHistory('1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });

    it('should limit sync history', async () => {
      const result = await controller.getSyncHistory('1', 1);

      expect(result.success).toBe(true);
      expect(result.data.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getWebhooks', () => {
    it('should return integration webhooks', async () => {
      const result = await controller.getWebhooks('1');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('createWebhook', () => {
    it('should create a webhook', async () => {
      const webhookData = {
        event: 'order.created',
        url: 'https://example.com/webhook',
      };

      const result = await controller.createWebhook('1', webhookData);

      expect(result.success).toBe(true);
      expect(result.message).toBe('Webhook created successfully');
      expect(result.data.event).toBe(webhookData.event);
    });
  });

  describe('getMarketplaceIntegrations', () => {
    it('should return all marketplace integrations', async () => {
      const result = await controller.getMarketplaceIntegrations();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data)).toBe(true);
      expect(result.data.length).toBeGreaterThan(0);
    });

    it('should filter marketplace integrations by category', async () => {
      const result = await controller.getMarketplaceIntegrations('payment');

      expect(result.success).toBe(true);
      expect(result.data.every((i: any) => i.category === 'payment')).toBe(true);
    });
  });

  describe('installMarketplaceIntegration', () => {
    it('should install integration from marketplace', async () => {
      const config = { apiKey: 'test-key' };

      const result = await controller.installMarketplaceIntegration(
        'payment-iyzico',
        config,
        'tenant-1',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Integration installed successfully');
      expect(result.data.marketplaceId).toBe('payment-iyzico');
      expect(result.data.isActive).toBe(true);
    });
  });
});

