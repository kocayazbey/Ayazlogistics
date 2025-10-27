import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { EventBusService } from '../../../../core/events/event-bus.service';

interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'review' | 'signature' | 'notification';
  assignedTo: string[];
  requiredApprovals: number;
  currentApprovals: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  dueDate?: Date;
  comments?: string[];
}

interface DocumentWorkflow {
  id: string;
  documentId: string;
  documentType: string;
  initiatedBy: string;
  steps: WorkflowStep[];
  currentStep: number;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  createdAt: Date;
  completedAt?: Date;
}

@Injectable()
export class DocumentWorkflowService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createWorkflow(documentId: string, documentType: string, initiatedBy: string): Promise<DocumentWorkflow> {
    const steps = this.getWorkflowSteps(documentType);

    const workflow: DocumentWorkflow = {
      id: `WF-${Date.now()}`,
      documentId,
      documentType,
      initiatedBy,
      steps,
      currentStep: 0,
      status: 'pending',
      createdAt: new Date(),
    };

    await this.eventBus.publish('workflow.created', {
      workflowId: workflow.id,
      documentId,
      steps: steps.length,
    });

    return workflow;
  }

  private getWorkflowSteps(documentType: string): WorkflowStep[] {
    const workflows: Record<string, WorkflowStep[]> = {
      contract: [
        {
          id: 'step-1',
          name: 'Legal Review',
          type: 'review',
          assignedTo: ['legal-team'],
          requiredApprovals: 1,
          currentApprovals: 0,
          status: 'pending',
        },
        {
          id: 'step-2',
          name: 'Finance Approval',
          type: 'approval',
          assignedTo: ['finance-manager'],
          requiredApprovals: 1,
          currentApprovals: 0,
          status: 'pending',
        },
        {
          id: 'step-3',
          name: 'Executive Signature',
          type: 'signature',
          assignedTo: ['ceo', 'cfo'],
          requiredApprovals: 1,
          currentApprovals: 0,
          status: 'pending',
        },
      ],
      invoice: [
        {
          id: 'step-1',
          name: 'Finance Review',
          type: 'review',
          assignedTo: ['finance-team'],
          requiredApprovals: 1,
          currentApprovals: 0,
          status: 'pending',
        },
        {
          id: 'step-2',
          name: 'Manager Approval',
          type: 'approval',
          assignedTo: ['finance-manager'],
          requiredApprovals: 1,
          currentApprovals: 0,
          status: 'pending',
        },
      ],
      shipping_document: [
        {
          id: 'step-1',
          name: 'Operations Review',
          type: 'review',
          assignedTo: ['operations-team'],
          requiredApprovals: 1,
          currentApprovals: 0,
          status: 'pending',
        },
        {
          id: 'step-2',
          name: 'Customs Approval',
          type: 'approval',
          assignedTo: ['customs-officer'],
          requiredApprovals: 1,
          currentApprovals: 0,
          status: 'pending',
        },
      ],
    };

    return workflows[documentType] || [];
  }

  async approveStep(workflowId: string, stepId: string, userId: string, comment?: string): Promise<DocumentWorkflow> {
    const workflow = await this.getWorkflow(workflowId);
    const step = workflow.steps.find(s => s.id === stepId);

    if (!step) {
      throw new Error('Step not found');
    }

    step.currentApprovals += 1;
    
    if (comment) {
      step.comments = step.comments || [];
      step.comments.push(comment);
    }

    if (step.currentApprovals >= step.requiredApprovals) {
      step.status = 'approved';
      workflow.currentStep += 1;

      if (workflow.currentStep >= workflow.steps.length) {
        workflow.status = 'approved';
        workflow.completedAt = new Date();
      }
    }

    await this.eventBus.publish('workflow.step.approved', {
      workflowId,
      stepId,
      userId,
    });

    return workflow;
  }

  async rejectStep(workflowId: string, stepId: string, userId: string, reason: string): Promise<DocumentWorkflow> {
    const workflow = await this.getWorkflow(workflowId);
    const step = workflow.steps.find(s => s.id === stepId);

    if (!step) {
      throw new Error('Step not found');
    }

    step.status = 'rejected';
    workflow.status = 'rejected';

    step.comments = step.comments || [];
    step.comments.push(`Rejected by ${userId}: ${reason}`);

    await this.eventBus.publish('workflow.step.rejected', {
      workflowId,
      stepId,
      userId,
      reason,
    });

    return workflow;
  }

  private async getWorkflow(workflowId: string): Promise<DocumentWorkflow> {
    return {
      id: workflowId,
      documentId: 'doc-1',
      documentType: 'contract',
      initiatedBy: 'user-1',
      steps: [],
      currentStep: 0,
      status: 'in_progress',
      createdAt: new Date(),
    };
  }

  async getPendingApprovals(userId: string): Promise<any[]> {
    return [
      {
        workflowId: 'WF-001',
        documentId: 'DOC-001',
        documentType: 'Contract',
        stepName: 'Legal Review',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        priority: 'high',
      },
    ];
  }
}

