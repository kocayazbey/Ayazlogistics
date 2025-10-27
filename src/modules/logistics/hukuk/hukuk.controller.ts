import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Body, 
  Param, 
  Query,
  UseGuards,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../core/auth/decorators/current-user.decorator';
import { ContractApprovalService } from '../ayaz-hukuk/proposal-contract-approval/contract-approval.service';
import { ContractManagerService } from '../ayaz-document/contract-management/contract-manager.service';

@ApiTags('Legal')
@Controller({ path: 'legal', version: '1' })
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class HukukController {
  constructor(
    private readonly approvalService: ContractApprovalService,
    private readonly contractManager: ContractManagerService,
  ) {}

  @Get('contracts')
  @ApiOperation({ summary: 'Get all legal contracts' })
  @ApiQuery({ name: 'customerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'approvalStatus', required: false })
  async getContracts(
    @CurrentUser('tenantId') tenantId: string,
    @Query('customerId') customerId?: string,
    @Query('status') status?: string,
    @Query('approvalStatus') approvalStatus?: string,
  ) {
    const contracts = await this.contractManager.getContracts(tenantId, {
      customerId,
      status,
      approvalStatus,
    });

    return {
      success: true,
      data: contracts,
      count: contracts.length,
    };
  }

  @Get('contracts/:id')
  @ApiOperation({ summary: 'Get contract by ID' })
  async getContractById(
    @Param('id') contractId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const contract = await this.contractManager.getContractById(contractId, tenantId);

    return {
      success: true,
      data: contract,
    };
  }

  @Post('contracts/:id/submit-review')
  @ApiOperation({ summary: 'Submit contract for legal review' })
  async submitForLegalReview(
    @Param('id') contractId: string,
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const result = await this.approvalService.submitForLegalReview(contractId, tenantId, userId);

    return {
      success: true,
      message: 'Contract submitted for legal review',
      data: result,
    };
  }

  @Post('contracts/:id/approve-legal')
  @ApiOperation({ summary: 'Approve contract (Legal department)' })
  async approveLegal(
    @Param('id') contractId: string,
    @Body() data: { comments?: string },
    @CurrentUser('id') approverId: string,
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const result = await this.approvalService.approveLegalReview(
      contractId,
      approverId,
      data.comments,
      tenantId,
    );

    return {
      success: true,
      message: 'Contract approved by legal department',
      data: result,
    };
  }

  @Post('contracts/:id/reject-legal')
  @ApiOperation({ summary: 'Reject contract (Legal department)' })
  async rejectLegal(
    @Param('id') contractId: string,
    @Body() data: { reason: string },
    @CurrentUser('id') approverId: string,
  ) {
    const result = await this.approvalService.rejectLegalReview(
      contractId,
      approverId,
      data.reason,
    );

    return {
      success: true,
      message: 'Contract rejected by legal department',
      data: result,
    };
  }

  @Post('contracts/:id/approve-admin')
  @ApiOperation({ summary: 'Approve contract (Admin)' })
  async approveAdmin(
    @Param('id') contractId: string,
    @Body() data: { comments?: string },
    @CurrentUser('id') approverId: string,
  ) {
    const result = await this.approvalService.approveAdmin(contractId, approverId, data.comments);

    return {
      success: true,
      message: 'Contract approved by admin',
      data: result,
    };
  }

  @Post('contracts/:id/customer-sign')
  @ApiOperation({ summary: 'Customer signature' })
  async customerSign(
    @Param('id') contractId: string,
    @Body() data: { signatureData: string; customerId: string },
  ) {
    const result = await this.approvalService.customerSign(
      contractId,
      data.signatureData,
      data.customerId,
    );

    return {
      success: true,
      message: 'Contract signed by customer',
      data: result,
    };
  }

  @Get('contracts/:id/workflow')
  @ApiOperation({ summary: 'Get approval workflow status' })
  async getApprovalWorkflow(@Param('id') contractId: string) {
    const workflow = await this.approvalService.getApprovalWorkflow(contractId);

    return {
      success: true,
      data: workflow,
    };
  }

  @Get('approvals/pending')
  @ApiOperation({ summary: 'Get pending approvals for current user' })
  @ApiQuery({ name: 'role', required: true, enum: ['legal', 'admin'] })
  async getPendingApprovals(
    @CurrentUser('tenantId') tenantId: string,
    @Query('role') role: string,
  ) {
    const approvals = await this.approvalService.getPendingApprovals(tenantId, role);

    return {
      success: true,
      data: approvals,
      count: approvals.length,
    };
  }

  @Post('approvals/:id/delegate')
  @ApiOperation({ summary: 'Delegate approval to another user' })
  async delegateApproval(
    @Param('id') contractId: string,
    @Body() data: { toApproverId: string; reason: string },
    @CurrentUser('id') fromApproverId: string,
  ) {
    const result = await this.approvalService.delegateApproval(
      contractId,
      fromApproverId,
      data.toApproverId,
      data.reason,
    );

    return {
      success: true,
      message: 'Approval delegated successfully',
      data: result,
    };
  }

  @Post('approvals/:id/escalate')
  @ApiOperation({ summary: 'Escalate approval' })
  async escalateApproval(
    @Param('id') contractId: string,
    @Body() data: { reason: string },
    @CurrentUser('id') escalatedBy: string,
  ) {
    const result = await this.approvalService.escalateApproval(
      contractId,
      escalatedBy,
      data.reason,
    );

    return {
      success: true,
      message: 'Approval escalated',
      data: result,
    };
  }

  @Get('analytics/summary')
  @ApiOperation({ summary: 'Get legal contracts summary' })
  async getContractsSummary(@CurrentUser('tenantId') tenantId: string) {
    const summary = await this.contractManager.generateContractSummaryReport(tenantId);

    return {
      success: true,
      data: summary,
    };
  }

  @Get('contracts/expiring/soon')
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

  @Post('contracts/:id/renew')
  @ApiOperation({ summary: 'Renew legal contract' })
  async renewContract(
    @Param('id') contractId: string,
    @Body() data: { newEndDate: string },
    @CurrentUser('tenantId') tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    const renewed = await this.contractManager.renewContract(
      contractId,
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

  @Post('contracts/:id/terminate')
  @ApiOperation({ summary: 'Terminate legal contract' })
  async terminateContract(
    @Param('id') contractId: string,
    @Body() data: { reason: string },
    @CurrentUser('tenantId') tenantId: string,
  ) {
    const terminated = await this.contractManager.terminateContract(
      contractId,
      data.reason,
      tenantId,
    );

    return {
      success: true,
      message: 'Contract terminated successfully',
      data: terminated,
    };
  }
}

