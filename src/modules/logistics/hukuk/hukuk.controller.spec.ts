import { Test, TestingModule } from '@nestjs/testing';
import { HukukController } from './hukuk.controller';
import { ContractApprovalService } from '../ayaz-hukuk/proposal-contract-approval/contract-approval.service';
import { ContractManagerService } from '../ayaz-document/contract-management/contract-manager.service';

describe('HukukController', () => {
  let controller: HukukController;
  let approvalService: ContractApprovalService;
  let contractManager: ContractManagerService;

  const mockApprovalService = {
    submitForLegalReview: jest.fn(),
    approveLegalReview: jest.fn(),
    rejectLegalReview: jest.fn(),
    approveAdmin: jest.fn(),
    customerSign: jest.fn(),
    getApprovalWorkflow: jest.fn(),
    getPendingApprovals: jest.fn(),
    delegateApproval: jest.fn(),
    escalateApproval: jest.fn(),
  };

  const mockContractManager = {
    getContracts: jest.fn(),
    getContractById: jest.fn(),
    generateContractSummaryReport: jest.fn(),
    getExpiringContracts: jest.fn(),
    renewContract: jest.fn(),
    terminateContract: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [HukukController],
      providers: [
        {
          provide: ContractApprovalService,
          useValue: mockApprovalService,
        },
        {
          provide: ContractManagerService,
          useValue: mockContractManager,
        },
      ],
    }).compile();

    controller = module.get<HukukController>(HukukController);
    approvalService = module.get<ContractApprovalService>(
      ContractApprovalService,
    );
    contractManager = module.get<ContractManagerService>(ContractManagerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getContracts', () => {
    it('should return all legal contracts', async () => {
      const mockContracts = [
        { id: '1', contractNumber: 'LEGAL-001', approvalStatus: 'pending' },
        { id: '2', contractNumber: 'LEGAL-002', approvalStatus: 'approved' },
      ];

      mockContractManager.getContracts.mockResolvedValue(mockContracts);

      const result = await controller.getContracts('tenant-1');

      expect(result).toEqual({
        success: true,
        data: mockContracts,
        count: 2,
      });
    });

    it('should filter contracts by approval status', async () => {
      const mockContracts = [
        { id: '1', contractNumber: 'LEGAL-001', approvalStatus: 'pending' },
      ];

      mockContractManager.getContracts.mockResolvedValue(mockContracts);

      await controller.getContracts('tenant-1', undefined, undefined, 'pending');

      expect(contractManager.getContracts).toHaveBeenCalledWith('tenant-1', {
        customerId: undefined,
        status: undefined,
        approvalStatus: 'pending',
      });
    });
  });

  describe('getContractById', () => {
    it('should return a contract by ID', async () => {
      const mockContract = { id: '1', contractNumber: 'LEGAL-001' };
      mockContractManager.getContractById.mockResolvedValue(mockContract);

      const result = await controller.getContractById('1', 'tenant-1');

      expect(result).toEqual({
        success: true,
        data: mockContract,
      });
    });
  });

  describe('submitForLegalReview', () => {
    it('should submit contract for legal review', async () => {
      const mockResult = {
        contractId: '1',
        status: 'legal_review',
        submittedAt: new Date(),
      };

      mockApprovalService.submitForLegalReview.mockResolvedValue(mockResult);

      const result = await controller.submitForLegalReview(
        '1',
        'tenant-1',
        'user-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Contract submitted for legal review',
        data: mockResult,
      });
      expect(approvalService.submitForLegalReview).toHaveBeenCalledWith(
        '1',
        'tenant-1',
        'user-1',
      );
    });
  });

  describe('approveLegal', () => {
    it('should approve contract by legal department', async () => {
      const mockResult = {
        contractId: '1',
        stage: 'admin_approval',
        approvedBy: 'legal-user-1',
        approvedAt: new Date(),
      };

      mockApprovalService.approveLegalReview.mockResolvedValue(mockResult);

      const result = await controller.approveLegal(
        '1',
        { comments: 'Looks good' },
        'legal-user-1',
        'tenant-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Contract approved by legal department',
        data: mockResult,
      });
      expect(approvalService.approveLegalReview).toHaveBeenCalledWith(
        '1',
        'legal-user-1',
        'Looks good',
        'tenant-1',
      );
    });
  });

  describe('rejectLegal', () => {
    it('should reject contract by legal department', async () => {
      const mockResult = {
        contractId: '1',
        status: 'rejected',
        reason: 'Missing clauses',
        rejectedBy: 'legal-user-1',
        rejectedAt: new Date(),
      };

      mockApprovalService.rejectLegalReview.mockResolvedValue(mockResult);

      const result = await controller.rejectLegal(
        '1',
        { reason: 'Missing clauses' },
        'legal-user-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Contract rejected by legal department',
        data: mockResult,
      });
    });
  });

  describe('approveAdmin', () => {
    it('should approve contract by admin', async () => {
      const mockResult = {
        contractId: '1',
        stage: 'customer_signature',
        approvedBy: 'admin-1',
        approvedAt: new Date(),
      };

      mockApprovalService.approveAdmin.mockResolvedValue(mockResult);

      const result = await controller.approveAdmin(
        '1',
        { comments: 'Approved' },
        'admin-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Contract approved by admin',
        data: mockResult,
      });
    });
  });

  describe('customerSign', () => {
    it('should process customer signature', async () => {
      const mockSigned = {
        id: '1',
        customerSignature: 'signature-data',
        customerSignedAt: new Date(),
        status: 'active',
      };

      mockApprovalService.customerSign.mockResolvedValue(mockSigned);

      const result = await controller.customerSign('1', {
        signatureData: 'signature-data',
        customerId: 'customer-1',
      });

      expect(result).toEqual({
        success: true,
        message: 'Contract signed by customer',
        data: mockSigned,
      });
    });
  });

  describe('getApprovalWorkflow', () => {
    it('should return approval workflow', async () => {
      const mockWorkflow = {
        contractId: '1',
        stages: [
          { stage: 'legal_review', status: 'approved' },
          { stage: 'admin_approval', status: 'pending' },
          { stage: 'customer_signature', status: 'pending' },
        ],
      };

      mockApprovalService.getApprovalWorkflow.mockResolvedValue(mockWorkflow);

      const result = await controller.getApprovalWorkflow('1');

      expect(result).toEqual({
        success: true,
        data: mockWorkflow,
      });
    });
  });

  describe('getPendingApprovals', () => {
    it('should return pending approvals for legal role', async () => {
      const mockApprovals = [
        { id: '1', contractNumber: 'LEGAL-001' },
        { id: '2', contractNumber: 'LEGAL-002' },
      ];

      mockApprovalService.getPendingApprovals.mockResolvedValue(mockApprovals);

      const result = await controller.getPendingApprovals('tenant-1', 'legal');

      expect(result).toEqual({
        success: true,
        data: mockApprovals,
        count: 2,
      });
      expect(approvalService.getPendingApprovals).toHaveBeenCalledWith(
        'tenant-1',
        'legal',
      );
    });
  });

  describe('delegateApproval', () => {
    it('should delegate approval to another user', async () => {
      const mockResult = {
        contractId: '1',
        delegatedFrom: 'user-1',
        delegatedTo: 'user-2',
        reason: 'Out of office',
        delegatedAt: new Date(),
      };

      mockApprovalService.delegateApproval.mockResolvedValue(mockResult);

      const result = await controller.delegateApproval(
        '1',
        { toApproverId: 'user-2', reason: 'Out of office' },
        'user-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Approval delegated successfully',
        data: mockResult,
      });
    });
  });

  describe('escalateApproval', () => {
    it('should escalate approval', async () => {
      const mockResult = {
        contractId: '1',
        escalatedBy: 'user-1',
        reason: 'Urgent',
        escalatedAt: new Date(),
        status: 'escalated',
      };

      mockApprovalService.escalateApproval.mockResolvedValue(mockResult);

      const result = await controller.escalateApproval(
        '1',
        { reason: 'Urgent' },
        'user-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Approval escalated',
        data: mockResult,
      });
    });
  });

  describe('getContractsSummary', () => {
    it('should return contracts summary', async () => {
      const mockSummary = {
        total: 100,
        active: 60,
        pending: 25,
        expired: 10,
        terminated: 5,
      };

      mockContractManager.generateContractSummaryReport.mockResolvedValue(
        mockSummary,
      );

      const result = await controller.getContractsSummary('tenant-1');

      expect(result).toEqual({
        success: true,
        data: mockSummary,
      });
    });
  });

  describe('getExpiringContracts', () => {
    it('should return expiring contracts', async () => {
      const mockResult = {
        expiringContracts: [{ id: '1', endDate: '2025-01-01' }],
        count: 1,
        daysAhead: 30,
      };

      mockContractManager.getExpiringContracts.mockResolvedValue(mockResult);

      const result = await controller.getExpiringContracts('tenant-1', 30);

      expect(result).toEqual({
        success: true,
        data: mockResult,
      });
    });
  });

  describe('renewContract', () => {
    it('should renew a legal contract', async () => {
      const mockRenewed = { id: '1', endDate: '2026-12-31' };
      mockContractManager.renewContract.mockResolvedValue(mockRenewed);

      const result = await controller.renewContract(
        '1',
        { newEndDate: '2026-12-31' },
        'tenant-1',
        'user-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Contract renewed successfully',
        data: mockRenewed,
      });
    });
  });

  describe('terminateContract', () => {
    it('should terminate a legal contract', async () => {
      const mockTerminated = { id: '1', status: 'terminated' };
      mockContractManager.terminateContract.mockResolvedValue(mockTerminated);

      const result = await controller.terminateContract(
        '1',
        { reason: 'Mutual agreement' },
        'tenant-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Contract terminated successfully',
        data: mockTerminated,
      });
    });
  });
});

