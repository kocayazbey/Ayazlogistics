import { Test, TestingModule } from '@nestjs/testing';
import { CRMService } from '../../src/modules/shared/crm/services/crm.service';
import { DatabaseService } from '../../src/core/database/database.service';
import { NotFoundException } from '@nestjs/common';

describe('CRMService', () => {
  let service: CRMService;
  let dbService: DatabaseService;

  const mockDbService = {
    client: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CRMService,
        {
          provide: DatabaseService,
          useValue: mockDbService,
        },
      ],
    }).compile();

    service = module.get<CRMService>(CRMService);
    dbService = module.get<DatabaseService>(DatabaseService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCustomers', () => {
    it('should return paginated customers', async () => {
      const mockCustomers = [
        {
          id: 'customer-1',
          tenantId: 'tenant-1',
          customerNumber: 'CUST-001',
          companyName: 'Test Company',
          isActive: true,
        },
      ];

      mockDbService.client.offset.mockResolvedValueOnce(mockCustomers);
      mockDbService.client.offset.mockResolvedValueOnce([{ count: 1 }]);

      const result = await service.getCustomers('tenant-1');

      expect(result.data).toEqual(mockCustomers);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter customers by type', async () => {
      await service.getCustomers('tenant-1', { customerType: 'enterprise' });
      expect(mockDbService.client.where).toHaveBeenCalled();
    });

    it('should search customers', async () => {
      await service.getCustomers('tenant-1', { search: 'Test' });
      expect(mockDbService.client.where).toHaveBeenCalled();
    });
  });

  describe('createCustomer', () => {
    it('should create a new customer', async () => {
      const mockCustomer = {
        id: 'customer-new',
        customerNumber: `CUST-${Date.now()}`,
        companyName: 'New Company',
        tenantId: 'tenant-1',
      };

      mockDbService.client.returning.mockResolvedValue([mockCustomer]);

      const result = await service.createCustomer(
        { companyName: 'New Company' },
        'tenant-1',
        'user-1'
      );

      expect(result).toHaveProperty('customerNumber');
      expect(mockDbService.client.insert).toHaveBeenCalled();
    });
  });

  describe('convertLeadToCustomer', () => {
    it('should convert lead to customer', async () => {
      const mockLead = {
        id: 'lead-1',
        companyName: 'Lead Company',
        contactName: 'John Doe',
        email: 'john@example.com',
        phone: '+905551234567',
        status: 'qualified',
        tenantId: 'tenant-1',
      };

      const mockCustomer = {
        id: 'customer-new',
        customerNumber: `CUST-${Date.now()}`,
        companyName: 'Lead Company',
        tenantId: 'tenant-1',
      };

      mockDbService.client.limit.mockResolvedValueOnce([mockLead]);
      mockDbService.client.offset.mockResolvedValueOnce([]);
      mockDbService.client.returning.mockResolvedValueOnce([mockCustomer]);
      mockDbService.client.returning.mockResolvedValueOnce([{ ...mockLead, status: 'converted' }]);
      mockDbService.client.limit.mockResolvedValueOnce([{ ...mockLead, status: 'converted' }]);
      mockDbService.client.offset.mockResolvedValueOnce([]);

      const result = await service.convertLeadToCustomer('lead-1', 'tenant-1', 'user-1');

      expect(result).toHaveProperty('customer');
      expect(result).toHaveProperty('lead');
    });
  });

  describe('getCustomerStats', () => {
    it('should calculate customer statistics', async () => {
      const mockCustomers = [
        { isActive: true, customerType: 'regular' },
        { isActive: true, customerType: 'vip' },
        { isActive: false, customerType: 'regular' },
        { isActive: true, customerType: 'enterprise' },
      ];

      mockDbService.client.where.mockResolvedValue(mockCustomers);

      const stats = await service.getCustomerStats('tenant-1');

      expect(stats.total).toBe(4);
      expect(stats.active).toBe(3);
      expect(stats.inactive).toBe(1);
      expect(stats.byType.regular).toBe(2);
      expect(stats.byType.vip).toBe(1);
      expect(stats.byType.enterprise).toBe(1);
    });
  });

  describe('getLeadStats', () => {
    it('should calculate lead statistics', async () => {
      const mockLeads = [
        { status: 'new', leadScore: 70, estimatedValue: '50000' },
        { status: 'contacted', leadScore: 80, estimatedValue: '75000' },
        { status: 'qualified', leadScore: 90, estimatedValue: '100000' },
        { status: 'converted', leadScore: 95, estimatedValue: '120000' },
        { status: 'lost', leadScore: 40, estimatedValue: '30000' },
      ];

      mockDbService.client.where.mockResolvedValue(mockLeads);

      const stats = await service.getLeadStats('tenant-1');

      expect(stats.total).toBe(5);
      expect(stats.new).toBe(1);
      expect(stats.contacted).toBe(1);
      expect(stats.qualified).toBe(1);
      expect(stats.converted).toBe(1);
      expect(stats.lost).toBe(1);
      expect(stats.averageLeadScore).toBe(75);
      expect(stats.totalEstimatedValue).toBe(375000);
    });
  });
});

