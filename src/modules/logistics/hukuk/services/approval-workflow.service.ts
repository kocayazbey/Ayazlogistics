// =====================================================================================
// AYAZLOGISTICS - LEGAL/HUKUK APPROVAL WORKFLOW SERVICE
// =====================================================================================
// Description: Multi-level contract approval workflow with notifications and tracking
// Features: Sequential/parallel approvals, delegation, escalation, audit trail
// Author: AyazLogistics Development Team
// Date: 2025-10-24
// =====================================================================================

import { Injectable, Logger, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, inArray, sql } from 'drizzle-orm';
import * as schema from '@/database/schema';
import { legalContracts, legalContractApprovals } from '@/database/schema/logistics/hukuk.schema';
import { users } from '@/database/schema/core/users.schema';

// =====================================================================================
// INTERFACES & TYPES
// =====================================================================================

interface ApprovalWorkflow {
  contractId: string;
  currentLevel: string;
  status: 'pending' | 'in_progress' | 'approved' | 'rejected' | 'cancelled';
  levels: ApprovalLevel[];
  history: ApprovalAction[];
  requiredApprovals: number;
  obtainedApprovals: number;
  progress: number;
}

interface ApprovalLevel {
  level: string;
  name: string;
  sequence: number;
  type: 'sequential' | 'parallel' | 'any_one';
  approvers: Approver[];
  status: 'pending' | 'in_progress' | 'approved' | 'rejected';
  dueDate?: Date;
  completedAt?: Date;
  requiredApprovals: number;
  currentApprovals: number;
  conditions?: ApprovalCondition[];
}

interface Approver {
  userId: string;
  name: string;
  email: string;
  role: string;
  status: 'pending' | 'approved' | 'rejected' | 'delegated' | 'abstained';
  canDelegate: boolean;
  delegatedTo?: string;
  notifiedAt?: Date;
  respondedAt?: Date;
  comments?: string;
}

interface ApprovalCondition {
  type: 'value_threshold' | 'department' | 'party_type' | 'custom';
  field: string;
  operator: '>' | '<' | '=' | '>=' | '<=' | '!=';
  value: any;
  met: boolean;
}

interface ApprovalAction {
  timestamp: Date;
  userId: string;
  userName: string;
  action: 'submitted' | 'approved' | 'rejected' | 'delegated' | 'recalled' | 'escalated' | 'commented';
  level: string;
  comments: string;
  ipAddress?: string;
  metadata?: Record<string, any>;
}

interface ApprovalRequest {
  contractId: string;
  approverId: string;
  level: string;
  message: string;
  attachments?: string[];
  dueDate?: Date;
  priority: 'low' | 'normal' | 'high' | 'urgent';
}

interface ApprovalResponse {
  contractId: string;
  approverId: string;
  action: 'approve' | 'reject' | 'delegate' | 'request_changes';
  comments: string;
  signature?: string;
  conditions?: string[];
  delegateTo?: string;
}

interface EscalationRule {
  level: string;
  daysOverdue: number;
  escalateTo: string[];
  notifyOriginalApprover: boolean;
  autoApprove: boolean;
  message: string;
}

interface DelegationRequest {
  fromUserId: string;
  toUserId: string;
  contractId: string;
  reason: string;
  expiresAt?: Date;
  canSubDelegate: boolean;
}

// =====================================================================================
// SERVICE IMPLEMENTATION
// =====================================================================================

@Injectable()
export class ApprovalWorkflowService {
  private readonly logger = new Logger(ApprovalWorkflowService.name);

  // Default workflow configuration
  private readonly DEFAULT_WORKFLOW = {
    levels: [
      { level: 'legal_review', name: 'Legal Review', sequence: 1, type: 'any_one' as const, minApprovals: 1 },
      { level: 'financial_review', name: 'Financial Review', sequence: 2, type: 'any_one' as const, minApprovals: 1 },
      { level: 'management_approval', name: 'Management Approval', sequence: 3, type: 'sequential' as const, minApprovals: 1 },
      { level: 'ceo_approval', name: 'CEO Approval', sequence: 4, type: 'any_one' as const, minApprovals: 1 },
    ],
  };

  constructor(
    @Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase<typeof schema>,
  ) {}

  // =====================================================================================
  // WORKFLOW INITIALIZATION
  // =====================================================================================

  async initializeWorkflow(
    contractId: string,
    submittedBy: string,
    options?: {
      customWorkflow?: ApprovalLevel[];
      autoStart?: boolean;
      dueInDays?: number;
    },
  ): Promise<ApprovalWorkflow> {
    this.logger.log(`Initializing approval workflow for contract: ${contractId}`);

    // Fetch contract
    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(eq(legalContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    // Determine workflow levels based on contract value and type
    const workflowLevels = options?.customWorkflow || 
      await this.determineWorkflowLevels(contract);

    // Initialize workflow in database
    const requiredApprovals = workflowLevels.reduce((sum, level) => 
      sum + level.requiredApprovals, 0
    );

    await this.db
      .update(legalContracts)
      .set({
        currentApprovalLevel: workflowLevels[0].level,
        status: 'pending_approval',
        requiredApprovals: workflowLevels.map(l => ({
          level: l.level,
          approvers: l.approvers.map(a => a.userId),
          required: l.requiredApprovals,
        })) as any,
        approvalHistory: [{
          timestamp: new Date(),
          userId: submittedBy,
          action: 'submitted',
          level: 'submission',
          comments: 'Contract submitted for approval',
        }] as any,
      })
      .where(eq(legalContracts.id, contractId));

    // Send notifications to first level approvers
    if (options?.autoStart !== false) {
      await this.notifyApprovers(contractId, workflowLevels[0]);
    }

    this.logger.log(`Workflow initialized for contract ${contractId} with ${workflowLevels.length} levels`);

    return {
      contractId,
      currentLevel: workflowLevels[0].level,
      status: 'in_progress',
      levels: workflowLevels,
      history: [],
      requiredApprovals,
      obtainedApprovals: 0,
      progress: 0,
    };
  }

  private async determineWorkflowLevels(contract: any): Promise<ApprovalLevel[]> {
    const contractValue = Number(contract.contractValue || 0);
    const levels: ApprovalLevel[] = [];

    // Always require legal review
    levels.push({
      level: 'legal_review',
      name: 'Legal Review',
      sequence: 1,
      type: 'any_one',
      approvers: await this.getApproversByRole('legal_counsel'),
      status: 'pending',
      requiredApprovals: 1,
      currentApprovals: 0,
    });

    // Financial review for contracts above threshold
    if (contractValue > 50000) {
      levels.push({
        level: 'financial_review',
        name: 'Financial Review',
        sequence: 2,
        type: 'any_one',
        approvers: await this.getApproversByRole('finance_manager'),
        status: 'pending',
        requiredApprovals: 1,
        currentApprovals: 0,
      });
    }

    // Management approval for contracts above threshold
    if (contractValue > 100000) {
      levels.push({
        level: 'management_approval',
        name: 'Management Approval',
        sequence: 3,
        type: 'sequential',
        approvers: await this.getApproversByRole('department_head'),
        status: 'pending',
        requiredApprovals: 1,
        currentApprovals: 0,
      });
    }

    // CEO approval for high-value contracts
    if (contractValue > 500000) {
      levels.push({
        level: 'ceo_approval',
        name: 'CEO Approval',
        sequence: levels.length + 1,
        type: 'any_one',
        approvers: await this.getApproversByRole('ceo'),
        status: 'pending',
        requiredApprovals: 1,
        currentApprovals: 0,
      });
    }

    return levels;
  }

  private async getApproversByRole(role: string): Promise<Approver[]> {
    const roleUsers = await this.db
      .select()
      .from(users)
      .where(and(
        eq(users.role, role),
        eq(users.isActive, true),
      ))
      .limit(10);

    return roleUsers.map(user => ({
      userId: user.id,
      name: `${user.firstName} ${user.lastName}`,
      email: user.email,
      role: user.role,
      status: 'pending',
      canDelegate: true,
    }));
  }

  // =====================================================================================
  // APPROVAL ACTIONS
  // =====================================================================================

  async approveContract(response: ApprovalResponse): Promise<ApprovalWorkflow> {
    this.logger.log(`Processing approval for contract ${response.contractId} by user ${response.approverId}`);

    // Fetch contract
    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(eq(legalContracts.id, response.contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException(`Contract ${response.contractId} not found`);
    }

    // Verify user has permission to approve
    await this.verifyApprovalPermission(response.contractId, response.approverId, contract.currentApprovalLevel);

    // Record approval
    await this.db.insert(legalContractApprovals).values({
      contractId: response.contractId,
      approvalLevel: contract.currentApprovalLevel,
      approverId: response.approverId,
      approverName: 'Approver Name', // Would fetch from users table
      action: response.action,
      comments: response.comments,
      approvedAt: new Date(),
    });

    // Update approval history
    const history = (contract.approvalHistory as any[]) || [];
    history.push({
      timestamp: new Date(),
      userId: response.approverId,
      action: response.action,
      level: contract.currentApprovalLevel,
      comments: response.comments,
    });

    // Check if level is complete
    const levelComplete = await this.checkLevelCompletion(
      response.contractId,
      contract.currentApprovalLevel,
    );

    if (levelComplete) {
      // Move to next level or complete workflow
      const nextLevel = await this.getNextApprovalLevel(
        response.contractId,
        contract.currentApprovalLevel,
      );

      if (nextLevel) {
        // Move to next level
        await this.db
          .update(legalContracts)
          .set({
            currentApprovalLevel: nextLevel.level,
            approvalHistory: history as any,
          })
          .where(eq(legalContracts.id, response.contractId));

        // Notify next level approvers
        await this.notifyApprovers(response.contractId, nextLevel);

        this.logger.log(`Contract ${response.contractId} moved to level: ${nextLevel.level}`);
      } else {
        // Workflow complete - all approvals obtained
        await this.db
          .update(legalContracts)
          .set({
            status: 'approved',
            approvalHistory: history as any,
          })
          .where(eq(legalContracts.id, response.contractId));

        this.logger.log(`Contract ${response.contractId} fully approved`);
      }
    } else {
      // Update history but stay at current level
      await this.db
        .update(legalContracts)
        .set({
          approvalHistory: history as any,
        })
        .where(eq(legalContracts.id, response.contractId));
    }

    return this.getWorkflowStatus(response.contractId);
  }

  async rejectContract(response: ApprovalResponse): Promise<ApprovalWorkflow> {
    this.logger.log(`Processing rejection for contract ${response.contractId} by user ${response.approverId}`);

    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(eq(legalContracts.id, response.contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException(`Contract ${response.contractId} not found`);
    }

    // Verify permission
    await this.verifyApprovalPermission(response.contractId, response.approverId, contract.currentApprovalLevel);

    // Record rejection
    await this.db.insert(legalContractApprovals).values({
      contractId: response.contractId,
      approvalLevel: contract.currentApprovalLevel,
      approverId: response.approverId,
      approverName: 'Approver Name',
      action: 'reject',
      comments: response.comments,
      rejectedAt: new Date(),
      rejectionReasons: response.conditions as any,
    });

    // Update contract status
    const history = (contract.approvalHistory as any[]) || [];
    history.push({
      timestamp: new Date(),
      userId: response.approverId,
      action: 'rejected',
      level: contract.currentApprovalLevel,
      comments: response.comments,
    });

    await this.db
      .update(legalContracts)
      .set({
        status: 'rejected',
        approvalHistory: history as any,
      })
      .where(eq(legalContracts.id, response.contractId));

    // Notify contract owner
    // await this.notifyRejection(response.contractId, response.comments);

    this.logger.log(`Contract ${response.contractId} rejected at level ${contract.currentApprovalLevel}`);

    return this.getWorkflowStatus(response.contractId);
  }

  async delegateApproval(delegation: DelegationRequest): Promise<void> {
    this.logger.log(`Delegating approval from ${delegation.fromUserId} to ${delegation.toUserId}`);

    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(eq(legalContracts.id, delegation.contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException(`Contract ${delegation.contractId} not found`);
    }

    // Verify delegator has permission
    await this.verifyApprovalPermission(
      delegation.contractId,
      delegation.fromUserId,
      contract.currentApprovalLevel,
    );

    // Verify delegate exists and is active
    const [delegate] = await this.db
      .select()
      .from(users)
      .where(and(
        eq(users.id, delegation.toUserId),
        eq(users.isActive, true),
      ))
      .limit(1);

    if (!delegate) {
      throw new BadRequestException('Delegate user not found or inactive');
    }

    // Record delegation
    const history = (contract.approvalHistory as any[]) || [];
    history.push({
      timestamp: new Date(),
      userId: delegation.fromUserId,
      action: 'delegated',
      level: contract.currentApprovalLevel,
      comments: `Delegated to ${delegate.firstName} ${delegate.lastName}: ${delegation.reason}`,
      metadata: {
        delegateTo: delegation.toUserId,
        expiresAt: delegation.expiresAt,
      },
    });

    await this.db
      .update(legalContracts)
      .set({
        approvalHistory: history as any,
      })
      .where(eq(legalContracts.id, delegation.contractId));

    // Notify delegate
    // await this.notifyDelegation(delegation);

    this.logger.log(`Approval delegated successfully`);
  }

  // =====================================================================================
  // WORKFLOW STATUS & TRACKING
  // =====================================================================================

  async getWorkflowStatus(contractId: string): Promise<ApprovalWorkflow> {
    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(eq(legalContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    // Get all approvals
    const approvals = await this.db
      .select()
      .from(legalContractApprovals)
      .where(eq(legalContractApprovals.contractId, contractId));

    // Reconstruct workflow
    const requiredApprovals = (contract.requiredApprovals as any[]) || [];
    const history = (contract.approvalHistory as any[]) || [];

    const levels: ApprovalLevel[] = requiredApprovals.map((req, idx) => {
      const levelApprovals = approvals.filter(a => a.approvalLevel === req.level);
      
      return {
        level: req.level,
        name: req.level.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        sequence: idx + 1,
        type: 'sequential',
        approvers: [], // Would reconstruct from data
        status: levelApprovals.length >= req.required ? 'approved' : 'pending',
        requiredApprovals: req.required,
        currentApprovals: levelApprovals.length,
      };
    });

    const obtainedApprovals = approvals.filter(a => a.action === 'approve').length;
    const totalRequired = requiredApprovals.reduce((sum, req) => sum + req.required, 0);
    const progress = totalRequired > 0 ? (obtainedApprovals / totalRequired) * 100 : 0;

    return {
      contractId,
      currentLevel: contract.currentApprovalLevel || '',
      status: contract.status as any,
      levels,
      history: history as ApprovalAction[],
      requiredApprovals: totalRequired,
      obtainedApprovals,
      progress,
    };
  }

  private async checkLevelCompletion(contractId: string, level: string): Promise<boolean> {
    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(eq(legalContracts.id, contractId))
      .limit(1);

    if (!contract) return false;

    const requiredApprovals = (contract.requiredApprovals as any[]) || [];
    const levelConfig = requiredApprovals.find(r => r.level === level);

    if (!levelConfig) return false;

    const approvals = await this.db
      .select()
      .from(legalContractApprovals)
      .where(and(
        eq(legalContractApprovals.contractId, contractId),
        eq(legalContractApprovals.approvalLevel, level),
        eq(legalContractApprovals.action, 'approve'),
      ));

    return approvals.length >= levelConfig.required;
  }

  private async getNextApprovalLevel(
    contractId: string,
    currentLevel: string,
  ): Promise<ApprovalLevel | null> {
    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(eq(legalContracts.id, contractId))
      .limit(1);

    if (!contract) return null;

    const requiredApprovals = (contract.requiredApprovals as any[]) || [];
    const currentIndex = requiredApprovals.findIndex(r => r.level === currentLevel);

    if (currentIndex === -1 || currentIndex >= requiredApprovals.length - 1) {
      return null;
    }

    const nextConfig = requiredApprovals[currentIndex + 1];
    const approvers = await this.getApproversByRole(nextConfig.level);

    return {
      level: nextConfig.level,
      name: nextConfig.level.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
      sequence: currentIndex + 2,
      type: 'sequential',
      approvers,
      status: 'pending',
      requiredApprovals: nextConfig.required,
      currentApprovals: 0,
    };
  }

  private async verifyApprovalPermission(
    contractId: string,
    userId: string,
    level: string,
  ): Promise<void> {
    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(eq(legalContracts.id, contractId))
      .limit(1);

    if (!contract) {
      throw new NotFoundException(`Contract ${contractId} not found`);
    }

    const requiredApprovals = (contract.requiredApprovals as any[]) || [];
    const levelConfig = requiredApprovals.find(r => r.level === level);

    if (!levelConfig) {
      throw new ForbiddenException('Invalid approval level');
    }

    // Check if user is in the approvers list
    if (!levelConfig.approvers.includes(userId)) {
      throw new ForbiddenException('User not authorized to approve at this level');
    }

    // Check if user has already approved
    const existingApproval = await this.db
      .select()
      .from(legalContractApprovals)
      .where(and(
        eq(legalContractApprovals.contractId, contractId),
        eq(legalContractApprovals.approvalLevel, level),
        eq(legalContractApprovals.approverId, userId),
      ))
      .limit(1);

    if (existingApproval.length > 0) {
      throw new BadRequestException('User has already responded to this approval');
    }
  }

  private async notifyApprovers(contractId: string, level: ApprovalLevel): Promise<void> {
    this.logger.log(`Notifying approvers for contract ${contractId} at level ${level.level}`);
    // Implementation would send emails/notifications to approvers
    // For now, just log
  }

  // =====================================================================================
  // ESCALATION
  // =====================================================================================

  async checkAndEscalate(contractId: string): Promise<boolean> {
    const [contract] = await this.db
      .select()
      .from(legalContracts)
      .where(eq(legalContracts.id, contractId))
      .limit(1);

    if (!contract || contract.status !== 'pending_approval') {
      return false;
    }

    // Check if approval is overdue (e.g., > 5 days)
    const history = (contract.approvalHistory as any[]) || [];
    const lastAction = history[history.length - 1];
    
    if (!lastAction) return false;

    const daysSinceLastAction = (Date.now() - new Date(lastAction.timestamp).getTime()) / (1000 * 60 * 60 * 24);

    if (daysSinceLastAction > 5) {
      // Escalate to manager
      this.logger.warn(`Escalating overdue contract approval: ${contractId}`);
      // Would send escalation notifications
      return true;
    }

    return false;
  }
}

// =====================================================================================
// END OF SERVICE
// =====================================================================================

