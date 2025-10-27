import { Test, TestingModule } from '@nestjs/testing';
import { AutomatedDecisionEngineService } from './automated-decision-engine.service';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import { EventBusService } from '../../../../core/events/event-bus.service';

describe('AutomatedDecisionEngineService', () => {
  let service: AutomatedDecisionEngineService;
  let mockDb: any;
  let mockEventBus: any;

  beforeEach(async () => {
    mockDb = {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      delete: jest.fn().mockReturnThis(),
    };

    mockEventBus = {
      emit: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomatedDecisionEngineService,
        {
          provide: DRIZZLE_ORM,
          useValue: mockDb,
        },
        {
          provide: EventBusService,
          useValue: mockEventBus,
        },
      ],
    }).compile();

    service = module.get<AutomatedDecisionEngineService>(AutomatedDecisionEngineService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createDecisionRule', () => {
    it('should create decision rule successfully', async () => {
      const createRuleDto = {
        name: 'High Priority Order Rule',
        description: 'Automatically prioritize high-value orders',
        category: 'operational',
        priority: 'high',
        conditions: [
          {
            field: 'orderValue',
            operator: 'greater_than',
            value: 10000,
            logic: 'AND',
          },
        ],
        actions: [
          {
            type: 'update_status',
            parameters: { status: 'high_priority' },
            description: 'Mark as high priority',
          },
        ],
        tags: ['priority', 'orders'],
        isActive: true,
      };
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const result = await service.createDecisionRule(createRuleDto, tenantId, userId);

      expect(result).toBeDefined();
      expect(result.name).toBe(createRuleDto.name);
      expect(result.description).toBe(createRuleDto.description);
      expect(result.category).toBe(createRuleDto.category);
      expect(result.priority).toBe(createRuleDto.priority);
      expect(mockEventBus.emit).toHaveBeenCalledWith(
        'decision.rule.created',
        expect.objectContaining({
          tenantId,
          ruleId: result.id,
        }),
      );
    });

    it('should throw error for invalid rule data', async () => {
      const createRuleDto = {
        name: '',
        description: '',
        category: 'invalid',
        priority: 'invalid',
        conditions: [],
        actions: [],
        tags: [],
        isActive: true,
      };
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      await expect(service.createDecisionRule(createRuleDto, tenantId, userId)).rejects.toThrow();
    });
  });

  describe('getDecisionRules', () => {
    it('should get decision rules successfully', async () => {
      const tenantId = 'tenant-123';
      const category = 'operational';
      const status = 'active';
      const priority = 'high';

      mockDb.select.mockResolvedValue([
        {
          id: 'rule-1',
          name: 'High Priority Order Rule',
          description: 'Automatically prioritize high-value orders',
          category: 'operational',
          priority: 'high',
          status: 'active',
          conditions: [
            {
              field: 'orderValue',
              operator: 'greater_than',
              value: 10000,
              logic: 'AND',
            },
          ],
          actions: [
            {
              type: 'update_status',
              parameters: { status: 'high_priority' },
              description: 'Mark as high priority',
            },
          ],
          tags: ['priority', 'orders'],
          isActive: true,
          executionCount: 150,
          successRate: 0.95,
          lastExecuted: new Date(),
          createdBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getDecisionRules(tenantId, category, status, priority);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getDecisionRule', () => {
    it('should get specific decision rule successfully', async () => {
      const ruleId = 'rule-123';
      const tenantId = 'tenant-123';

      mockDb.select.mockResolvedValue([
        {
          id: ruleId,
          name: 'High Priority Order Rule',
          description: 'Automatically prioritize high-value orders',
          category: 'operational',
          priority: 'high',
          status: 'active',
          conditions: [
            {
              field: 'orderValue',
              operator: 'greater_than',
              value: 10000,
              logic: 'AND',
            },
          ],
          actions: [
            {
              type: 'update_status',
              parameters: { status: 'high_priority' },
              description: 'Mark as high priority',
            },
          ],
          tags: ['priority', 'orders'],
          isActive: true,
          executionCount: 150,
          successRate: 0.95,
          lastExecuted: new Date(),
          createdBy: 'user-123',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);

      const result = await service.getDecisionRule(ruleId, tenantId);

      expect(result).toBeDefined();
      expect(result.id).toBe(ruleId);
    });
  });

  describe('updateDecisionRule', () => {
    it('should update decision rule successfully', async () => {
      const ruleId = 'rule-123';
      const updateRuleDto = {
        name: 'Updated High Priority Order Rule',
        description: 'Updated description',
        category: 'operational',
        priority: 'high',
        conditions: [
          {
            field: 'orderValue',
            operator: 'greater_than',
            value: 15000,
            logic: 'AND',
          },
        ],
        actions: [
          {
            type: 'update_status',
            parameters: { status: 'high_priority' },
            description: 'Mark as high priority',
          },
        ],
        tags: ['priority', 'orders', 'updated'],
        isActive: true,
      };
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const result = await service.updateDecisionRule(ruleId, updateRuleDto, tenantId, userId);

      expect(result).toBeDefined();
      expect(result.id).toBe(ruleId);
      expect(result.name).toBe(updateRuleDto.name);
      expect(result.description).toBe(updateRuleDto.description);
    });
  });

  describe('deleteDecisionRule', () => {
    it('should delete decision rule successfully', async () => {
      const ruleId = 'rule-123';
      const tenantId = 'tenant-123';

      const result = await service.deleteDecisionRule(ruleId, tenantId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('executeDecisionRule', () => {
    it('should execute decision rule successfully', async () => {
      const ruleId = 'rule-123';
      const executeDto = {
        input: {
          orderValue: 15000,
          customerType: 'premium',
          region: 'europe',
        },
        context: {
          userId: 'user-123',
          timestamp: new Date(),
        },
        timeout: 30,
      };
      const tenantId = 'tenant-123';

      const result = await service.executeDecisionRule(ruleId, executeDto, tenantId);

      expect(result).toBeDefined();
      expect(result.ruleId).toBe(ruleId);
      expect(result.status).toBeDefined();
      expect(result.executionTime).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });

    it('should handle execution errors gracefully', async () => {
      const ruleId = 'rule-123';
      const executeDto = {
        input: {
          orderValue: 15000,
          customerType: 'premium',
          region: 'europe',
        },
        context: {
          userId: 'user-123',
          timestamp: new Date(),
        },
        timeout: 30,
      };
      const tenantId = 'tenant-123';

      // Mock execution error
      mockDb.select.mockRejectedValue(new Error('Rule execution failed'));

      await expect(service.executeDecisionRule(ruleId, executeDto, tenantId)).rejects.toThrow();
    });
  });

  describe('testDecisionRule', () => {
    it('should test decision rule successfully', async () => {
      const ruleId = 'rule-123';
      const testDto = {
        input: {
          orderValue: 15000,
          customerType: 'premium',
          region: 'europe',
        },
        context: {
          userId: 'user-123',
          timestamp: new Date(),
        },
        expectedOutput: {
          status: 'high_priority',
          priority: 'high',
        },
      };
      const tenantId = 'tenant-123';

      const result = await service.testDecisionRule(ruleId, testDto, tenantId);

      expect(result).toBeDefined();
      expect(result.ruleId).toBe(ruleId);
      expect(result.status).toBeDefined();
      expect(result.executionTime).toBeDefined();
      expect(result.timestamp).toBeDefined();
    });
  });

  describe('getDecisionExecutions', () => {
    it('should get decision executions successfully', async () => {
      const tenantId = 'tenant-123';
      const ruleId = 'rule-123';
      const status = 'success';
      const limit = 20;

      mockDb.select.mockResolvedValue([
        {
          id: 'execution-1',
          ruleId: 'rule-123',
          ruleName: 'High Priority Order Rule',
          trigger: 'manual',
          input: {
            orderValue: 15000,
            customerType: 'premium',
          },
          output: {
            status: 'high_priority',
            priority: 'high',
          },
          status: 'success',
          executionTime: 150,
          timestamp: new Date(),
          confidence: 0.95,
          recommendations: ['Consider expedited shipping'],
          executedBy: 'user-123',
        },
      ]);

      const result = await service.getDecisionExecutions(tenantId, ruleId, status, limit);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getDecisionExecution', () => {
    it('should get specific decision execution successfully', async () => {
      const executionId = 'execution-123';
      const tenantId = 'tenant-123';

      mockDb.select.mockResolvedValue([
        {
          id: executionId,
          ruleId: 'rule-123',
          ruleName: 'High Priority Order Rule',
          trigger: 'manual',
          input: {
            orderValue: 15000,
            customerType: 'premium',
          },
          output: {
            status: 'high_priority',
            priority: 'high',
          },
          status: 'success',
          executionTime: 150,
          timestamp: new Date(),
          confidence: 0.95,
          recommendations: ['Consider expedited shipping'],
          executedBy: 'user-123',
        },
      ]);

      const result = await service.getDecisionExecution(executionId, tenantId);

      expect(result).toBeDefined();
      expect(result.id).toBe(executionId);
    });
  });

  describe('getDecisionAnalytics', () => {
    it('should get decision analytics successfully', async () => {
      const tenantId = 'tenant-123';
      const timeRange = 30;

      const result = await service.getDecisionAnalytics(tenantId, timeRange);

      expect(result).toBeDefined();
      expect(result.totalRules).toBeDefined();
      expect(result.activeRules).toBeDefined();
      expect(result.totalExecutions).toBeDefined();
      expect(result.successRate).toBeDefined();
      expect(result.averageExecutionTime).toBeDefined();
      expect(result.topPerformingRules).toBeDefined();
      expect(Array.isArray(result.topPerformingRules)).toBe(true);
      expect(result.categoryDistribution).toBeDefined();
      expect(Array.isArray(result.categoryDistribution)).toBe(true);
      expect(result.performanceMetrics).toBeDefined();
      expect(result.executionTrends).toBeDefined();
      expect(Array.isArray(result.executionTrends)).toBe(true);
    });
  });

  describe('validateDecisionRule', () => {
    it('should validate decision rule successfully', async () => {
      const validationDto = {
        conditions: [
          {
            field: 'orderValue',
            operator: 'greater_than',
            value: 10000,
            logic: 'AND',
          },
        ],
        actions: [
          {
            type: 'update_status',
            parameters: { status: 'high_priority' },
            description: 'Mark as high priority',
          },
        ],
      };
      const tenantId = 'tenant-123';

      const result = await service.validateDecisionRule(validationDto, tenantId);

      expect(result).toBeDefined();
      expect(result.isValid).toBeDefined();
      expect(result.errors).toBeDefined();
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.warnings).toBeDefined();
      expect(Array.isArray(result.warnings)).toBe(true);
      expect(result.complexityScore).toBeDefined();
      expect(result.performanceImpact).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe('activateDecisionRule', () => {
    it('should activate decision rule successfully', async () => {
      const ruleId = 'rule-123';
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const result = await service.activateDecisionRule(ruleId, tenantId, userId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('deactivateDecisionRule', () => {
    it('should deactivate decision rule successfully', async () => {
      const ruleId = 'rule-123';
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const result = await service.deactivateDecisionRule(ruleId, tenantId, userId);

      expect(result).toBeDefined();
      expect(result.success).toBe(true);
    });
  });

  describe('getRulePerformance', () => {
    it('should get rule performance successfully', async () => {
      const ruleId = 'rule-123';
      const tenantId = 'tenant-123';

      const result = await service.getRulePerformance(ruleId, tenantId);

      expect(result).toBeDefined();
      expect(result.ruleId).toBe(ruleId);
      expect(result.ruleName).toBeDefined();
      expect(result.totalExecutions).toBeDefined();
      expect(result.successfulExecutions).toBeDefined();
      expect(result.failedExecutions).toBeDefined();
      expect(result.successRate).toBeDefined();
      expect(result.averageExecutionTime).toBeDefined();
      expect(result.lastExecution).toBeDefined();
      expect(result.trend).toBeDefined();
      expect(result.dailyFrequency).toBeDefined();
      expect(result.peakExecutionTime).toBeDefined();
      expect(result.resourceUsage).toBeDefined();
    });
  });

  describe('getRuleCategories', () => {
    it('should get rule categories successfully', async () => {
      const tenantId = 'tenant-123';

      const result = await service.getRuleCategories(tenantId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('getRuleTemplates', () => {
    it('should get rule templates successfully', async () => {
      const tenantId = 'tenant-123';
      const category = 'operational';

      const result = await service.getRuleTemplates(tenantId, category);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('duplicateDecisionRule', () => {
    it('should duplicate decision rule successfully', async () => {
      const ruleId = 'rule-123';
      const tenantId = 'tenant-123';
      const userId = 'user-123';

      const result = await service.duplicateDecisionRule(ruleId, tenantId, userId);

      expect(result).toBeDefined();
      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
    });
  });

  describe('getRuleExecutions', () => {
    it('should get rule executions successfully', async () => {
      const ruleId = 'rule-123';
      const tenantId = 'tenant-123';
      const limit = 50;

      const result = await service.getRuleExecutions(ruleId, tenantId, limit);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe('bulkExecuteRules', () => {
    it('should bulk execute rules successfully', async () => {
      const bulkExecuteDto = {
        ruleIds: ['rule-1', 'rule-2', 'rule-3'],
        input: {
          orderValue: 15000,
          customerType: 'premium',
        },
        context: {
          userId: 'user-123',
          timestamp: new Date(),
        },
        timeout: 60,
      };
      const tenantId = 'tenant-123';

      const result = await service.bulkExecuteRules(bulkExecuteDto, tenantId);

      expect(result).toBeDefined();
      expect(result.executedRules).toBeDefined();
      expect(Array.isArray(result.executedRules)).toBe(true);
      expect(result.totalExecutions).toBeDefined();
      expect(result.successfulExecutions).toBeDefined();
      expect(result.failedExecutions).toBeDefined();
    });
  });

  describe('getDecisionDashboard', () => {
    it('should get decision dashboard successfully', async () => {
      const tenantId = 'tenant-123';

      const result = await service.getDecisionDashboard(tenantId);

      expect(result).toBeDefined();
      expect(result.overview).toBeDefined();
      expect(result.recentExecutions).toBeDefined();
      expect(Array.isArray(result.recentExecutions)).toBe(true);
      expect(result.topPerformingRules).toBeDefined();
      expect(Array.isArray(result.topPerformingRules)).toBe(true);
      expect(result.executionTrends).toBeDefined();
      expect(Array.isArray(result.executionTrends)).toBe(true);
      expect(result.categoryDistribution).toBeDefined();
      expect(Array.isArray(result.categoryDistribution)).toBe(true);
      expect(result.systemHealth).toBeDefined();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      mockDb.select.mockRejectedValue(new Error('Database connection failed'));

      const tenantId = 'tenant-123';
      const category = 'operational';
      const status = 'active';
      const priority = 'high';

      await expect(service.getDecisionRules(tenantId, category, status, priority)).rejects.toThrow();
    });

    it('should handle invalid parameters', async () => {
      const ruleId = '';
      const tenantId = '';

      await expect(service.getDecisionRule(ruleId, tenantId)).rejects.toThrow();
    });
  });

  describe('performance', () => {
    it('should complete rule execution within reasonable time', async () => {
      const ruleId = 'rule-123';
      const executeDto = {
        input: {
          orderValue: 15000,
          customerType: 'premium',
          region: 'europe',
        },
        context: {
          userId: 'user-123',
          timestamp: new Date(),
        },
        timeout: 30,
      };
      const tenantId = 'tenant-123';

      const startTime = Date.now();
      await service.executeDecisionRule(ruleId, executeDto, tenantId);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });
  });
});
