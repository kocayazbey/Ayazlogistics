import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface ApprovalWorkflow {
  id: string;
  workflowName: string;
  documentType: string;
  steps: Array<{
    stepNumber: number;
    stepName: string;
    approverRole: string;
    approverUserId?: string;
    isParallel: boolean;
    requiredApprovals: number;
    timeoutHours?: number;
    escalationRole?: string;
  }>;
  isActive: boolean;
  createdAt: Date;
}

interface ApprovalRequest {
  id: string;
  workflowId: string;
  documentId: string;
  documentType: string;
  requestedBy: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  currentStep: number;
  createdAt: Date;
  completedAt?: Date;
}

interface ApprovalStep {
  id: string;
  requestId: string;
  stepNumber: number;
  approverId: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated';
  comments?: string;
  decidedAt?: Date;
  delegatedTo?: string;
}

@Injectable()
export class ApprovalWorkflowService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createWorkflow(
    data: Omit<ApprovalWorkflow, 'id' | 'createdAt'>,
    tenantId: string,
    userId: string,
  ): Promise<ApprovalWorkflow> {
    const workflowId = `WF-${Date.now()}`;

    const workflow: ApprovalWorkflow = {
      id: workflowId,
      ...data,
      createdAt: new Date(),
    };

    await this.eventBus.emit('approval.workflow.created', {
      workflowId,
      workflowName: data.workflowName,
      documentType: data.documentType,
      steps: data.steps.length,
      tenantId,
    });

    return workflow;
  }

  async initiateApproval(
    documentId: string,
    documentType: string,
    tenantId: string,
    userId: string,
  ): Promise<ApprovalRequest> {
    const workflow = await this.getWorkflowByDocumentType(documentType, tenantId);

    if (!workflow) {
      throw new Error(`No workflow configured for document type: ${documentType}`);
    }

    const requestId = `REQ-${Date.now()}`;

    const request: ApprovalRequest = {
      id: requestId,
      workflowId: workflow.id,
      documentId,
      documentType,
      requestedBy: userId,
      status: 'pending',
      currentStep: 1,
      createdAt: new Date(),
    };

    await this.eventBus.emit('approval.request.initiated', {
      requestId,
      documentId,
      workflowId: workflow.id,
      requestedBy: userId,
      tenantId,
    });

    // Create approval steps
    await this.createApprovalSteps(requestId, workflow, tenantId);

    return request;
  }

  async approveStep(
    requestId: string,
    stepId: string,
    approverId: string,
    comments?: string,
    tenantId?: string,
  ): Promise<void> {
    await this.eventBus.emit('approval.step.approved', {
      requestId,
      stepId,
      approverId,
      approvedAt: new Date(),
      comments,
      tenantId,
    });

    // Check if all steps in current level are approved
    await this.checkAndAdvanceWorkflow(requestId, tenantId || '');
  }

  async rejectStep(
    requestId: string,
    stepId: string,
    approverId: string,
    reason: string,
    tenantId: string,
  ): Promise<void> {
    await this.eventBus.emit('approval.step.rejected', {
      requestId,
      stepId,
      approverId,
      rejectedAt: new Date(),
      reason,
      tenantId,
    });

    // Reject entire request
    await this.updateRequestStatus(requestId, 'rejected', tenantId);
  }

  async delegateApproval(
    requestId: string,
    stepId: string,
    fromUserId: string,
    toUserId: string,
    reason?: string,
    tenantId?: string,
  ): Promise<void> {
    await this.eventBus.emit('approval.delegated', {
      requestId,
      stepId,
      fromUserId,
      toUserId,
      delegatedAt: new Date(),
      reason,
      tenantId,
    });
  }

  async getPendingApprovals(userId: string, tenantId: string): Promise<ApprovalRequest[]> {
    // Mock: Would query pending approvals for this user
    return [];
  }

  async getApprovalHistory(
    documentId: string,
    tenantId: string,
  ): Promise<Array<ApprovalRequest & { steps: ApprovalStep[] }>> {
    // Mock: Would query approval history
    return [];
  }

  private async createApprovalSteps(
    requestId: string,
    workflow: ApprovalWorkflow,
    tenantId: string,
  ): Promise<void> {
    for (const step of workflow.steps) {
      const stepId = `STEP-${Date.now()}-${step.stepNumber}`;

      await this.eventBus.emit('approval.step.created', {
        stepId,
        requestId,
        stepNumber: step.stepNumber,
        approverRole: step.approverRole,
        tenantId,
      });
    }
  }

  private async checkAndAdvanceWorkflow(requestId: string, tenantId: string): Promise<void> {
    // Mock: Would check if current step is complete and advance to next
    await this.eventBus.emit('approval.workflow.advanced', {
      requestId,
      tenantId,
    });
  }

  private async updateRequestStatus(
    requestId: string,
    status: ApprovalRequest['status'],
    tenantId: string,
  ): Promise<void> {
    await this.eventBus.emit('approval.request.status_updated', {
      requestId,
      status,
      tenantId,
    });
  }

  private async getWorkflowByDocumentType(
    documentType: string,
    tenantId: string,
  ): Promise<ApprovalWorkflow | null> {
    // Mock: Would query workflows table
    return null;
  }
}

