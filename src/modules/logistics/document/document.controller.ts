import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete,
  Body, 
  Param, 
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
  UploadedFile,
  UseInterceptors,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { ContractManagerService } from '../ayaz-document/contract-management/contract-manager.service';
import { ProposalGeneratorService } from '../ayaz-document/proposal-pdf/proposal-generator.service';
import { StorageService } from '../../../core/storage/storage.service';

@ApiTags('Documents')
@Controller({ path: 'documents', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class DocumentController {
  constructor(
    private readonly contractManager: ContractManagerService,
    private readonly proposalGenerator: ProposalGeneratorService,
    private readonly storageService: StorageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all documents with filters' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'contractType', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getDocuments(
    @CurrentUser('tenantId') tenantId: string,
    @Query('customerId') customerId?: string,
    @Query('contractType') contractType?: string,
    @Query('status') status?: string,
  ) {
    const contracts = await this.contractManager.getContracts(tenantId, {
      customerId,
      contractType,
      status,
    });

    return {
      success: true,
      data: contracts,
      count: contracts.length,
    };
  }

  @Get('summary')
  @ApiOperation({ summary: 'Get document summary report' })
  async getDocumentSummary(@CurrentUser('tenantId') tenantId: string) {
    const summary = await this.contractManager.generateContractSummaryReport(tenantId);

    return {
      success: true,
      data: summary,
    };
  }

  @Get('expiring')
  @ApiOperation({ summary: 'Get expiring contracts' })
  @ApiQuery({ name: 'daysAhead', required: false, type: Number })
  async getExpiringContracts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('daysAhead') daysAhead?: number,
  ) {
    const result = await this.contractManager.getExpiringContracts(
      tenantId,
      daysAhead ? parseInt(daysAhead.toString()) : 30,
    );

    return {
      success: true,
      data: result,
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get document by ID' })
  async getDocumentById(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const contract = await this.contractManager.getContractById(id, tenantId);

    return {
      success: true,
      data: contract,
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create new contract document' })
  @HttpCode(HttpStatus.CREATED)
  async createDocument(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const contract = await this.contractManager.createContract(data, tenantId, userId);

    return {
      success: true,
      message: 'Contract created successfully',
      data: contract,
    };
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update contract document' })
  async updateDocument(
    @Param('id') id: string,
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const updated = await this.contractManager.updateContract(id, data, tenantId);

    return {
      success: true,
      message: 'Contract updated successfully',
      data: updated,
    };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete contract document' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteDocument(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    // Soft delete implementation
    await this.contractManager.updateContract(
      id,
      { status: 'deleted', updatedAt: new Date() },
      tenantId,
    );

    return {
      success: true,
      message: 'Contract deleted successfully',
    };
  }

  @Post(':id/submit-approval')
  @ApiOperation({ summary: 'Submit contract for approval' })
  async submitForApproval(
    @Param('id') id: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const result = await this.contractManager.submitForApproval(id, tenantId);

    return {
      success: true,
      message: 'Contract submitted for approval',
      data: result,
    };
  }

  @Post(':id/renew')
  @ApiOperation({ summary: 'Renew contract' })
  async renewContract(
    @Param('id') id: string,
    @Body() data: { newEndDate: string },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const renewed = await this.contractManager.renewContract(
      id,
      new Date(data.newEndDate),
      tenantId,
      userId,
    );

    return {
      success: true,
      message: 'Contract renewed successfully',
      data: renewed,
    };
  }

  @Post(':id/terminate')
  @ApiOperation({ summary: 'Terminate contract' })
  async terminateContract(
    @Param('id') id: string,
    @Body() data: { reason: string },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const terminated = await this.contractManager.terminateContract(id, data.reason, tenantId);

    return {
      success: true,
      message: 'Contract terminated successfully',
      data: terminated,
    };
  }

  @Post('proposals/generate')
  @ApiOperation({ summary: 'Generate proposal PDF' })
  async generateProposal(
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const result = await this.proposalGenerator.generateProposal(data, tenantId);

    // Upload PDF to storage
    const fileName = `proposals/${result.proposalNumber}.pdf`;
    const uploadResult = await this.storageService.upload(
      Buffer.from(result.pdfBytes),
      fileName,
      'application/pdf',
    );

    return {
      success: true,
      message: 'Proposal generated successfully',
      data: {
        proposalNumber: result.proposalNumber,
        fileUrl: uploadResult.url,
        total: result.total,
        validUntil: result.validUntil,
      },
    };
  }

  @Get('proposals/:proposalNumber/status')
  @ApiOperation({ summary: 'Track proposal status' })
  async getProposalStatus(
    @Param('proposalNumber') proposalNumber: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const status = await this.proposalGenerator.trackProposalStatus(proposalNumber, tenantId);

    return {
      success: true,
      data: status,
    };
  }

  @Post('proposals/:proposalNumber/accept')
  @ApiOperation({ summary: 'Accept proposal' })
  async acceptProposal(
    @Param('proposalNumber') proposalNumber: string,
    @Body() data: { customerId: string; acceptedBy: string },
  ) {
    const result = await this.proposalGenerator.acceptProposal(
      proposalNumber,
      data.customerId,
      data.acceptedBy,
    );

    return {
      success: true,
      message: 'Proposal accepted',
      data: result,
    };
  }

  @Post('proposals/:proposalNumber/reject')
  @ApiOperation({ summary: 'Reject proposal' })
  async rejectProposal(
    @Param('proposalNumber') proposalNumber: string,
    @Body() data: { customerId: string; reason: string },
  ) {
    const result = await this.proposalGenerator.rejectProposal(
      proposalNumber,
      data.customerId,
      data.reason,
    );

    return {
      success: true,
      message: 'Proposal rejected',
      data: result,
    };
  }

  @Post('proposals/:proposalNumber/convert')
  @ApiOperation({ summary: 'Convert proposal to contract' })
  async convertProposalToContract(
    @Param('proposalNumber') proposalNumber: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.proposalGenerator.convertProposalToContract(
      proposalNumber,
      tenantId,
      userId,
    );

    return {
      success: true,
      message: 'Proposal converted to contract',
      data: result,
    };
  }

  @Post('proposals/:proposalNumber/revise')
  @ApiOperation({ summary: 'Revise proposal' })
  async reviseProposal(
    @Param('proposalNumber') proposalNumber: string,
    @Body() data: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.proposalGenerator.reviseProposal(
      proposalNumber,
      data.revisions,
      tenantId,
      userId,
    );

    return {
      success: true,
      message: 'Proposal revised',
      data: result,
    };
  }

  @Post('upload')
  @ApiOperation({ summary: 'Upload document file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: any,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const fileName = `documents/${tenantId}/${Date.now()}-${file.originalname}`;
    const uploadResult = await this.storageService.upload(
      file.buffer,
      fileName,
      file.mimetype,
    );

    return {
      success: true,
      message: 'Document uploaded successfully',
      data: {
        fileName: file.originalname,
        fileUrl: uploadResult.url,
        fileSize: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
        uploadedBy: userId,
      },
    };
  }

  @Post(':legalContractId/link-billing/:billingContractId')
  @ApiOperation({ summary: 'Link legal contract to billing contract' })
  async linkBillingContract(
    @Param('legalContractId') legalContractId: string,
    @Param('billingContractId') billingContractId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const result = await this.contractManager.linkBillingContract(
      legalContractId,
      billingContractId,
      tenantId,
    );

    return {
      success: true,
      message: 'Contracts linked successfully',
      data: result,
    };
  }
}

