import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { EnhancedAuditService, AuditAction } from '../../../src/core/audit/audit-enhanced.service';

describe('EnhancedAuditService', () => {
  let service: EnhancedAuditService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EnhancedAuditService,
        {
          provide: 'DATABASE_POOL',
          useValue: {
            query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<EnhancedAuditService>(EnhancedAuditService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('log', () => {
    it('should create audit log entry', async () => {
      const entry = {
        userId: 'USER_123',
        action: AuditAction.CREATE,
        entity: 'customer',
        entityId: 'CUST_456',
        timestamp: new Date(),
        success: true,
      };

      await expect(service.log(entry)).resolves.not.toThrow();
    });
  });

  describe('logUpdate', () => {
    it('should log update with diff', async () => {
      const before = { name: 'Old Name', status: 'active' };
      const after = { name: 'New Name', status: 'active' };

      await service.logUpdate('USER_123', 'customer', 'CUST_456', before, after);
      // Should not throw
    });
  });

  describe('query', () => {
    it('should query audit logs with filters', async () => {
      const result = await service.query({
        userId: 'USER_123',
        action: AuditAction.CREATE,
        limit: 10,
      });

      expect(Array.isArray(result)).toBe(true);
    });
  });
});

