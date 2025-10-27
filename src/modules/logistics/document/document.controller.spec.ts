import { Test, TestingModule } from '@nestjs/testing';
import { DocumentController } from './document.controller';
import { ContractManagerService } from '../ayaz-document/contract-management/contract-manager.service';
import { ProposalGeneratorService } from '../ayaz-document/proposal-pdf/proposal-generator.service';
import { StorageService } from '../../../core/storage/storage.service';

describe('DocumentController', () => {
  let controller: DocumentController;
  let contractManager: ContractManagerService;
  let proposalGenerator: ProposalGeneratorService;
  let storageService: StorageService;

  const mockContractManager = {
    getContracts: jest.fn(),
    getContractById: jest.fn(),
    createContract: jest.fn(),
    updateContract: jest.fn(),
    submitForApproval: jest.fn(),
    renewContract: jest.fn(),
    terminateContract: jest.fn(),
    generateContractSummaryReport: jest.fn(),
    getExpiringContracts: jest.fn(),
    linkBillingContract: jest.fn(),
  };

  const mockProposalGenerator = {
    generateProposal: jest.fn(),
    trackProposalStatus: jest.fn(),
    acceptProposal: jest.fn(),
    rejectProposal: jest.fn(),
    convertProposalToContract: jest.fn(),
    reviseProposal: jest.fn(),
  };

  const mockStorageService = {
    upload: jest.fn(),
    download: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DocumentController],
      providers: [
        {
          provide: ContractManagerService,
          useValue: mockContractManager,
        },
        {
          provide: ProposalGeneratorService,
          useValue: mockProposalGenerator,
        },
        {
          provide: StorageService,
          useValue: mockStorageService,
        },
      ],
    }).compile();

    controller = module.get<DocumentController>(DocumentController);
    contractManager = module.get<ContractManagerService>(ContractManagerService);
    proposalGenerator = module.get<ProposalGeneratorService>(ProposalGeneratorService);
    storageService = module.get<StorageService>(StorageService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getDocuments', () => {
    it('should return all documents', async () => {
      const mockDocuments = [
        { id: '1', contractNumber: 'CONT-001', status: 'active' },
        { id: '2', contractNumber: 'CONT-002', status: 'pending' },
      ];

      mockContractManager.getContracts.mockResolvedValue(mockDocuments);

      const result = await controller.getDocuments('tenant-1');

      expect(result).toEqual({
        success: true,
        data: mockDocuments,
        count: 2,
      });
      expect(contractManager.getContracts).toHaveBeenCalledWith('tenant-1', {
        customerId: undefined,
        contractType: undefined,
        status: undefined,
      });
    });

    it('should filter documents by customerId', async () => {
      const mockDocuments = [{ id: '1', contractNumber: 'CONT-001' }];
      mockContractManager.getContracts.mockResolvedValue(mockDocuments);

      await controller.getDocuments('tenant-1', 'customer-1');

      expect(contractManager.getContracts).toHaveBeenCalledWith('tenant-1', {
        customerId: 'customer-1',
        contractType: undefined,
        status: undefined,
      });
    });
  });

  describe('getDocumentById', () => {
    it('should return a document by ID', async () => {
      const mockDocument = { id: '1', contractNumber: 'CONT-001' };
      mockContractManager.getContractById.mockResolvedValue(mockDocument);

      const result = await controller.getDocumentById('1', 'tenant-1');

      expect(result).toEqual({
        success: true,
        data: mockDocument,
      });
      expect(contractManager.getContractById).toHaveBeenCalledWith('1', 'tenant-1');
    });
  });

  describe('createDocument', () => {
    it('should create a new document', async () => {
      const documentData = {
        customerId: 'customer-1',
        customerName: 'Test Customer',
        contractType: 'service_agreement',
        startDate: new Date(),
      };

      const mockCreated = { id: '1', ...documentData };
      mockContractManager.createContract.mockResolvedValue(mockCreated);

      const result = await controller.createDocument(
        documentData,
        'tenant-1',
        'user-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Contract created successfully',
        data: mockCreated,
      });
      expect(contractManager.createContract).toHaveBeenCalledWith(
        documentData,
        'tenant-1',
        'user-1',
      );
    });
  });

  describe('updateDocument', () => {
    it('should update a document', async () => {
      const updateData = { status: 'active' };
      const mockUpdated = { id: '1', ...updateData };
      mockContractManager.updateContract.mockResolvedValue(mockUpdated);

      const result = await controller.updateDocument('1', updateData, 'tenant-1');

      expect(result).toEqual({
        success: true,
        message: 'Contract updated successfully',
        data: mockUpdated,
      });
    });
  });

  describe('deleteDocument', () => {
    it('should soft delete a document', async () => {
      mockContractManager.updateContract.mockResolvedValue({});

      const result = await controller.deleteDocument('1', 'tenant-1');

      expect(result).toEqual({
        success: true,
        message: 'Contract deleted successfully',
      });
      expect(contractManager.updateContract).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ status: 'deleted' }),
        'tenant-1',
      );
    });
  });

  describe('submitForApproval', () => {
    it('should submit document for approval', async () => {
      const mockResult = { contractId: '1', status: 'pending_approval' };
      mockContractManager.submitForApproval.mockResolvedValue(mockResult);

      const result = await controller.submitForApproval('1', 'tenant-1');

      expect(result).toEqual({
        success: true,
        message: 'Contract submitted for approval',
        data: mockResult,
      });
    });
  });

  describe('renewContract', () => {
    it('should renew a contract', async () => {
      const mockRenewed = { id: '1', endDate: '2025-12-31' };
      mockContractManager.renewContract.mockResolvedValue(mockRenewed);

      const result = await controller.renewContract(
        '1',
        { newEndDate: '2025-12-31' },
        'tenant-1',
        'user-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Contract renewed successfully',
        data: mockRenewed,
      });
      expect(contractManager.renewContract).toHaveBeenCalledWith(
        '1',
        expect.any(Date),
        'tenant-1',
        'user-1',
      );
    });
  });

  describe('terminateContract', () => {
    it('should terminate a contract', async () => {
      const mockTerminated = { id: '1', status: 'terminated' };
      mockContractManager.terminateContract.mockResolvedValue(mockTerminated);

      const result = await controller.terminateContract(
        '1',
        { reason: 'Customer request' },
        'tenant-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Contract terminated successfully',
        data: mockTerminated,
      });
    });
  });

  describe('generateProposal', () => {
    it('should generate a proposal', async () => {
      const proposalData = {
        proposalNumber: 'PROP-001',
        customerName: 'Test Customer',
        services: [],
      };

      const mockResult = {
        proposalNumber: 'PROP-001',
        pdfBytes: new Uint8Array([1, 2, 3]),
        total: 1000,
        validUntil: new Date(),
      };

      mockProposalGenerator.generateProposal.mockResolvedValue(mockResult);
      mockStorageService.upload.mockResolvedValue({
        url: 'https://storage.example.com/proposals/PROP-001.pdf',
      });

      const result = await controller.generateProposal(proposalData, 'tenant-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Proposal generated successfully');
      expect(result.data.fileUrl).toBeDefined();
      expect(storageService.upload).toHaveBeenCalled();
    });
  });

  describe('getProposalStatus', () => {
    it('should return proposal status', async () => {
      const mockStatus = {
        proposalNumber: 'PROP-001',
        status: 'sent',
        sentAt: new Date(),
      };

      mockProposalGenerator.trackProposalStatus.mockResolvedValue(mockStatus);

      const result = await controller.getProposalStatus('PROP-001', 'tenant-1');

      expect(result).toEqual({
        success: true,
        data: mockStatus,
      });
    });
  });

  describe('acceptProposal', () => {
    it('should accept a proposal', async () => {
      const mockResult = {
        proposalNumber: 'PROP-001',
        status: 'accepted',
        acceptedAt: new Date(),
      };

      mockProposalGenerator.acceptProposal.mockResolvedValue(mockResult);

      const result = await controller.acceptProposal('PROP-001', {
        customerId: 'customer-1',
        acceptedBy: 'user-1',
      });

      expect(result).toEqual({
        success: true,
        message: 'Proposal accepted',
        data: mockResult,
      });
    });
  });

  describe('rejectProposal', () => {
    it('should reject a proposal', async () => {
      const mockResult = {
        proposalNumber: 'PROP-001',
        status: 'rejected',
        rejectedAt: new Date(),
        reason: 'Price too high',
      };

      mockProposalGenerator.rejectProposal.mockResolvedValue(mockResult);

      const result = await controller.rejectProposal('PROP-001', {
        customerId: 'customer-1',
        reason: 'Price too high',
      });

      expect(result).toEqual({
        success: true,
        message: 'Proposal rejected',
        data: mockResult,
      });
    });
  });

  describe('convertProposalToContract', () => {
    it('should convert proposal to contract', async () => {
      const mockResult = {
        proposalNumber: 'PROP-001',
        contractNumber: 'CONT-001',
        convertedAt: new Date(),
      };

      mockProposalGenerator.convertProposalToContract.mockResolvedValue(mockResult);

      const result = await controller.convertProposalToContract(
        'PROP-001',
        'tenant-1',
        'user-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Proposal converted to contract',
        data: mockResult,
      });
    });
  });

  describe('uploadDocument', () => {
    it('should upload a document file', async () => {
      const mockFile = {
        originalname: 'test.pdf',
        buffer: Buffer.from('test'),
        size: 1024,
        mimetype: 'application/pdf',
      } as Express.Multer.File;

      mockStorageService.upload.mockResolvedValue({
        url: 'https://storage.example.com/documents/test.pdf',
      });

      const result = await controller.uploadDocument(
        mockFile,
        {},
        'tenant-1',
        'user-1',
      );

      expect(result.success).toBe(true);
      expect(result.message).toBe('Document uploaded successfully');
      expect(result.data.fileName).toBe('test.pdf');
      expect(result.data.fileUrl).toBeDefined();
    });
  });

  describe('linkBillingContract', () => {
    it('should link legal contract to billing contract', async () => {
      mockContractManager.linkBillingContract.mockResolvedValue({ linked: true });

      const result = await controller.linkBillingContract(
        'legal-1',
        'billing-1',
        'tenant-1',
      );

      expect(result).toEqual({
        success: true,
        message: 'Contracts linked successfully',
        data: { linked: true },
      });
    });
  });

  describe('getDocumentSummary', () => {
    it('should return document summary', async () => {
      const mockSummary = {
        total: 100,
        active: 50,
        pending: 30,
        expired: 20,
      };

      mockContractManager.generateContractSummaryReport.mockResolvedValue(
        mockSummary,
      );

      const result = await controller.getDocumentSummary('tenant-1');

      expect(result).toEqual({
        success: true,
        data: mockSummary,
      });
    });
  });

  describe('getExpiringContracts', () => {
    it('should return expiring contracts', async () => {
      const mockResult = {
        expiringContracts: [],
        count: 5,
        daysAhead: 30,
      };

      mockContractManager.getExpiringContracts.mockResolvedValue(mockResult);

      const result = await controller.getExpiringContracts('tenant-1', 30);

      expect(result).toEqual({
        success: true,
        data: mockResult,
      });
      expect(contractManager.getExpiringContracts).toHaveBeenCalledWith(
        'tenant-1',
        30,
      );
    });

    it('should use default 30 days if not provided', async () => {
      const mockResult = {
        expiringContracts: [],
        count: 5,
        daysAhead: 30,
      };

      mockContractManager.getExpiringContracts.mockResolvedValue(mockResult);

      await controller.getExpiringContracts('tenant-1');

      expect(contractManager.getExpiringContracts).toHaveBeenCalledWith(
        'tenant-1',
        30,
      );
    });
  });
});

