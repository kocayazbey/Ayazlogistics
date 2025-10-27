import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  WizardConfig,
  WizardSession,
  WizardStep,
  WizardNavigationResult,
  WizardValidationResult,
  WizardCompletionResult,
  ValidationRule,
} from '../interfaces/mobile-wizard.interface';
import { EventEmitter2 } from '@nestjs/event-emitter';

/**
 * Mobile Wizard Service
 * Provides multi-step wizard functionality for mobile handheld operations
 * Features: Progress tracking, validation, session resume, auto-save
 */
@Injectable()
export class MobileWizardService {
  private wizardConfigs: Map<string, WizardConfig> = new Map();
  private activeSessions: Map<string, WizardSession> = new Map();

  constructor(
    private eventEmitter: EventEmitter2,
  ) {
    this.initializeWizardConfigs();
  }

  /**
   * Initialize predefined wizard configurations
   */
  private initializeWizardConfigs(): void {
    // Receiving Wizard
    this.registerWizard({
      id: 'receiving-planned',
      name: 'Planned Receiving',
      nameTr: 'Planlı Giriş',
      description: 'Multi-step planned receiving workflow',
      descriptionTr: 'Çok adımlı planlı giriş iş akışı',
      allowBack: true,
      allowSkip: false,
      saveProgress: true,
      sessionTimeout: 30,
      requireConfirmation: true,
      steps: [
        {
          id: 'scan-po',
          name: 'Scan Purchase Order',
          order: 1,
          validationRules: [
            {
              field: 'poNumber',
              type: 'required',
              message: 'Purchase order number is required',
              messageTr: 'Sipariş numarası zorunludur',
            },
          ],
        },
        {
          id: 'verify-supplier',
          name: 'Verify Supplier',
          order: 2,
          validationRules: [
            {
              field: 'supplierId',
              type: 'required',
              message: 'Supplier must be verified',
              messageTr: 'Tedarikçi doğrulanmalıdır',
            },
          ],
        },
        {
          id: 'scan-items',
          name: 'Scan Items',
          order: 3,
          validationRules: [
            {
              field: 'items',
              type: 'custom',
              message: 'At least one item must be scanned',
              messageTr: 'En az bir ürün taranmalıdır',
              customValidator: (value) => Array.isArray(value) && value.length > 0,
            },
          ],
        },
        {
          id: 'quality-check',
          name: 'Quality Check',
          order: 4,
          isOptional: true,
        },
        {
          id: 'assign-location',
          name: 'Assign Location',
          order: 5,
          validationRules: [
            {
              field: 'locationId',
              type: 'required',
              message: 'Location must be assigned',
              messageTr: 'Konum atanmalıdır',
            },
          ],
        },
        {
          id: 'print-label',
          name: 'Print Label',
          order: 6,
        },
        {
          id: 'confirm',
          name: 'Confirm Receiving',
          order: 7,
        },
      ],
    });

    // Picking Wizard
    this.registerWizard({
      id: 'picking-standard',
      name: 'Standard Picking',
      nameTr: 'Standart Toplama',
      allowBack: true,
      saveProgress: true,
      sessionTimeout: 45,
      requireConfirmation: true,
      steps: [
        {
          id: 'scan-order',
          name: 'Scan Order',
          order: 1,
          validationRules: [
            {
              field: 'orderId',
              type: 'required',
              message: 'Order ID is required',
              messageTr: 'Sipariş numarası zorunludur',
            },
          ],
        },
        {
          id: 'review-picks',
          name: 'Review Pick List',
          order: 2,
        },
        {
          id: 'navigate-location',
          name: 'Navigate to Location',
          order: 3,
        },
        {
          id: 'scan-item',
          name: 'Scan Item',
          order: 4,
          validationRules: [
            {
              field: 'barcode',
              type: 'required',
              message: 'Item barcode is required',
              messageTr: 'Ürün barkodu zorunludur',
            },
          ],
        },
        {
          id: 'confirm-quantity',
          name: 'Confirm Quantity',
          order: 5,
          validationRules: [
            {
              field: 'quantity',
              type: 'custom',
              message: 'Quantity must be greater than 0',
              messageTr: 'Miktar 0\'dan büyük olmalıdır',
              customValidator: (value) => value > 0,
            },
          ],
        },
        {
          id: 'assign-cart',
          name: 'Assign to Cart',
          order: 6,
        },
        {
          id: 'complete',
          name: 'Complete Picking',
          order: 7,
        },
      ],
    });

    // Pallet Transfer Wizard
    this.registerWizard({
      id: 'pallet-transfer',
      name: 'Pallet Transfer',
      nameTr: 'Palet Transfer',
      allowBack: true,
      saveProgress: true,
      sessionTimeout: 20,
      requireConfirmation: true,
      steps: [
        {
          id: 'scan-source-pallet',
          name: 'Scan Source Pallet',
          order: 1,
          validationRules: [
            {
              field: 'sourcePalletId',
              type: 'required',
              message: 'Source pallet ID is required',
              messageTr: 'Kaynak palet numarası zorunludur',
            },
          ],
        },
        {
          id: 'verify-contents',
          name: 'Verify Contents',
          order: 2,
        },
        {
          id: 'scan-destination',
          name: 'Scan Destination',
          order: 3,
          validationRules: [
            {
              field: 'destinationLocationId',
              type: 'required',
              message: 'Destination location is required',
              messageTr: 'Hedef konum zorunludur',
            },
          ],
        },
        {
          id: 'confirm-transfer',
          name: 'Confirm Transfer',
          order: 4,
        },
      ],
    });

    // Cycle Count Wizard
    this.registerWizard({
      id: 'cycle-count',
      name: 'Cycle Count',
      nameTr: 'Periyodik Sayım',
      allowBack: false,
      saveProgress: true,
      sessionTimeout: 60,
      requireConfirmation: true,
      steps: [
        {
          id: 'scan-location',
          name: 'Scan Location',
          order: 1,
          validationRules: [
            {
              field: 'locationId',
              type: 'required',
              message: 'Location is required',
              messageTr: 'Konum zorunludur',
            },
          ],
        },
        {
          id: 'count-items',
          name: 'Count Items',
          order: 2,
          validationRules: [
            {
              field: 'counts',
              type: 'custom',
              message: 'At least one item must be counted',
              messageTr: 'En az bir ürün sayılmalıdır',
              customValidator: (value) => Array.isArray(value) && value.length > 0,
            },
          ],
        },
        {
          id: 'verify-discrepancies',
          name: 'Verify Discrepancies',
          order: 3,
          isOptional: true,
        },
        {
          id: 'supervisor-approval',
          name: 'Supervisor Approval',
          order: 4,
          isOptional: true,
        },
        {
          id: 'submit-count',
          name: 'Submit Count',
          order: 5,
        },
      ],
    });

    // Forklift Operation Wizard
    this.registerWizard({
      id: 'forklift-putaway',
      name: 'Forklift Putaway',
      nameTr: 'Forklift Yerleştirme',
      allowBack: true,
      saveProgress: true,
      sessionTimeout: 25,
      requireConfirmation: true,
      steps: [
        {
          id: 'scan-task',
          name: 'Scan Task',
          order: 1,
          validationRules: [
            {
              field: 'taskId',
              type: 'required',
              message: 'Task ID is required',
              messageTr: 'Görev numarası zorunludur',
            },
          ],
        },
        {
          id: 'scan-pallet',
          name: 'Scan Pallet',
          order: 2,
          validationRules: [
            {
              field: 'palletId',
              type: 'required',
              message: 'Pallet ID is required',
              messageTr: 'Palet numarası zorunludur',
            },
          ],
        },
        {
          id: 'navigate-to-location',
          name: 'Navigate to Location',
          order: 3,
        },
        {
          id: 'verify-location',
          name: 'Verify Location',
          order: 4,
          validationRules: [
            {
              field: 'locationBarcode',
              type: 'required',
              message: 'Location must be verified',
              messageTr: 'Konum doğrulanmalıdır',
            },
          ],
        },
        {
          id: 'confirm-putaway',
          name: 'Confirm Putaway',
          order: 5,
        },
      ],
    });

    // Return Processing Wizard
    this.registerWizard({
      id: 'return-processing',
      name: 'Return Processing',
      nameTr: 'İade İşleme',
      allowBack: true,
      saveProgress: true,
      sessionTimeout: 40,
      requireConfirmation: true,
      steps: [
        {
          id: 'scan-return',
          name: 'Scan Return',
          order: 1,
          validationRules: [
            {
              field: 'returnId',
              type: 'required',
              message: 'Return ID is required',
              messageTr: 'İade numarası zorunludur',
            },
          ],
        },
        {
          id: 'inspect-items',
          name: 'Inspect Items',
          order: 2,
          validationRules: [
            {
              field: 'inspectionResults',
              type: 'required',
              message: 'Inspection results are required',
              messageTr: 'Muayene sonuçları zorunludur',
            },
          ],
        },
        {
          id: 'select-disposition',
          name: 'Select Disposition',
          order: 3,
          validationRules: [
            {
              field: 'disposition',
              type: 'required',
              message: 'Disposition is required',
              messageTr: 'İşlem tipi zorunludur',
            },
          ],
        },
        {
          id: 'assign-location',
          name: 'Assign Location',
          order: 4,
        },
        {
          id: 'complete-return',
          name: 'Complete Return',
          order: 5,
        },
      ],
    });
  }

  /**
   * Register a new wizard configuration
   */
  registerWizard(config: WizardConfig): void {
    this.wizardConfigs.set(config.id, config);
  }

  /**
   * Get wizard configuration by ID
   */
  getWizardConfig(wizardId: string): WizardConfig {
    const config = this.wizardConfigs.get(wizardId);
    if (!config) {
      throw new NotFoundException(`Wizard configuration not found: ${wizardId}`);
    }
    return config;
  }

  /**
   * Start a new wizard session
   */
  async startWizard(
    wizardId: string,
    userId: string,
    deviceInfo?: any,
  ): Promise<WizardSession> {
    const config = this.getWizardConfig(wizardId);

    const session: WizardSession = {
      id: this.generateSessionId(),
      wizardConfigId: wizardId,
      userId,
      currentStepIndex: 0,
      startedAt: new Date(),
      lastActivityAt: new Date(),
      completedSteps: [],
      wizardData: {},
      status: 'active',
      deviceInfo,
    };

    this.activeSessions.set(session.id, session);

    await this.eventEmitter.emitAsync('wizard.started', {
      sessionId: session.id,
      wizardId,
      userId,
    });

    return session;
  }

  /**
   * Get current wizard session
   */
  getSession(sessionId: string): WizardSession {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new NotFoundException(`Wizard session not found: ${sessionId}`);
    }

    // Check session timeout
    if (this.isSessionExpired(session)) {
      session.status = 'paused';
    }

    return session;
  }

  /**
   * Resume a paused wizard session
   */
  async resumeSession(sessionId: string, userId: string): Promise<WizardSession> {
    const session = this.getSession(sessionId);

    if (session.userId !== userId) {
      throw new BadRequestException('Unauthorized to resume this session');
    }

    session.status = 'active';
    session.lastActivityAt = new Date();

    await this.eventEmitter.emitAsync('wizard.resumed', {
      sessionId,
      userId,
    });

    return session;
  }

  /**
   * Navigate to next step
   */
  async goToNextStep(sessionId: string, stepData?: Record<string, any>): Promise<WizardNavigationResult> {
    const session = this.getSession(sessionId);
    const config = this.getWizardConfig(session.wizardConfigId);

    // Validate current step
    const currentStep = config.steps[session.currentStepIndex];
    if (stepData) {
      const validation = this.validateStep(currentStep, stepData);
      if (!validation.isValid) {
        return {
          success: false,
          currentStep,
          canGoNext: false,
          canGoBack: config.allowBack,
          progress: this.calculateProgress(session, config),
          message: validation.errors[0]?.message,
          messageTr: validation.errors[0]?.messageTr,
        };
      }

      // Save step data
      session.wizardData[currentStep.id] = stepData;
      session.completedSteps.push(currentStep.id);
    }

    // Check if there's a next step
    if (session.currentStepIndex >= config.steps.length - 1) {
      return {
        success: false,
        currentStep,
        canGoNext: false,
        canGoBack: config.allowBack,
        progress: 100,
        message: 'This is the last step',
        messageTr: 'Bu son adımdır',
      };
    }

    // Move to next step
    session.currentStepIndex++;
    session.lastActivityAt = new Date();

    const nextStep = config.steps[session.currentStepIndex];

    await this.eventEmitter.emitAsync('wizard.step.completed', {
      sessionId,
      completedStep: currentStep.id,
      nextStep: nextStep.id,
    });

    return {
      success: true,
      currentStep: nextStep,
      previousStep: currentStep,
      nextStep: config.steps[session.currentStepIndex + 1],
      canGoNext: session.currentStepIndex < config.steps.length - 1,
      canGoBack: config.allowBack && session.currentStepIndex > 0,
      progress: this.calculateProgress(session, config),
    };
  }

  /**
   * Navigate to previous step
   */
  async goToPreviousStep(sessionId: string): Promise<WizardNavigationResult> {
    const session = this.getSession(sessionId);
    const config = this.getWizardConfig(session.wizardConfigId);

    if (!config.allowBack) {
      throw new BadRequestException('Going back is not allowed in this wizard');
    }

    if (session.currentStepIndex === 0) {
      const currentStep = config.steps[0];
      return {
        success: false,
        currentStep,
        canGoNext: true,
        canGoBack: false,
        progress: this.calculateProgress(session, config),
        message: 'This is the first step',
        messageTr: 'Bu ilk adımdır',
      };
    }

    session.currentStepIndex--;
    session.lastActivityAt = new Date();

    const currentStep = config.steps[session.currentStepIndex];

    return {
      success: true,
      currentStep,
      previousStep: config.steps[session.currentStepIndex - 1],
      nextStep: config.steps[session.currentStepIndex + 1],
      canGoNext: true,
      canGoBack: session.currentStepIndex > 0,
      progress: this.calculateProgress(session, config),
    };
  }

  /**
   * Skip current step (if allowed)
   */
  async skipStep(sessionId: string): Promise<WizardNavigationResult> {
    const session = this.getSession(sessionId);
    const config = this.getWizardConfig(session.wizardConfigId);

    const currentStep = config.steps[session.currentStepIndex];

    if (!currentStep.isOptional && !config.allowSkip) {
      throw new BadRequestException('Current step cannot be skipped');
    }

    return this.goToNextStep(sessionId);
  }

  /**
   * Complete wizard
   */
  async completeWizard(sessionId: string, finalData?: Record<string, any>): Promise<WizardCompletionResult> {
    const session = this.getSession(sessionId);
    const config = this.getWizardConfig(session.wizardConfigId);

    // Validate final step if data provided
    const finalStep = config.steps[config.steps.length - 1];
    if (finalData) {
      const validation = this.validateStep(finalStep, finalData);
      if (!validation.isValid) {
        throw new BadRequestException(validation.errors[0]?.messageTr || validation.errors[0]?.message);
      }
      session.wizardData[finalStep.id] = finalData;
    }

    // Mark session as completed
    session.status = 'completed';
    session.lastActivityAt = new Date();

    const result: WizardCompletionResult = {
      success: true,
      wizardId: session.wizardConfigId,
      sessionId: session.id,
      data: session.wizardData,
      completedAt: new Date(),
      message: 'Wizard completed successfully',
      messageTr: 'İşlem başarıyla tamamlandı',
    };

    await this.eventEmitter.emitAsync('wizard.completed', {
      sessionId: session.id,
      wizardId: session.wizardConfigId,
      userId: session.userId,
      data: session.wizardData,
    });

    // Clean up session after some time
    setTimeout(() => {
      this.activeSessions.delete(sessionId);
    }, 300000); // 5 minutes

    return result;
  }

  /**
   * Cancel wizard
   */
  async cancelWizard(sessionId: string, reason?: string): Promise<void> {
    const session = this.getSession(sessionId);
    session.status = 'cancelled';

    await this.eventEmitter.emitAsync('wizard.cancelled', {
      sessionId,
      wizardId: session.wizardConfigId,
      userId: session.userId,
      reason,
    });

    this.activeSessions.delete(sessionId);
  }

  /**
   * Validate step data
   */
  private validateStep(step: WizardStep, data: Record<string, any>): WizardValidationResult {
    const errors: Array<{ field: string; message: string; messageTr: string }> = [];

    if (!step.validationRules) {
      return { isValid: true, errors: [] };
    }

    for (const rule of step.validationRules) {
      const value = data[rule.field];

      switch (rule.type) {
        case 'required':
          if (value === undefined || value === null || value === '') {
            errors.push({
              field: rule.field,
              message: rule.message,
              messageTr: rule.messageTr,
            });
          }
          break;

        case 'minLength':
          if (typeof value === 'string' && value.length < (rule.value || 0)) {
            errors.push({
              field: rule.field,
              message: rule.message,
              messageTr: rule.messageTr,
            });
          }
          break;

        case 'maxLength':
          if (typeof value === 'string' && value.length > (rule.value || 0)) {
            errors.push({
              field: rule.field,
              message: rule.message,
              messageTr: rule.messageTr,
            });
          }
          break;

        case 'pattern':
          if (typeof value === 'string' && rule.value && !new RegExp(rule.value).test(value)) {
            errors.push({
              field: rule.field,
              message: rule.message,
              messageTr: rule.messageTr,
            });
          }
          break;

        case 'custom':
          if (rule.customValidator && !rule.customValidator(value, data)) {
            errors.push({
              field: rule.field,
              message: rule.message,
              messageTr: rule.messageTr,
            });
          }
          break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calculate wizard progress percentage
   */
  private calculateProgress(session: WizardSession, config: WizardConfig): number {
    return Math.round(((session.currentStepIndex + 1) / config.steps.length) * 100);
  }

  /**
   * Check if session is expired
   */
  private isSessionExpired(session: WizardSession): boolean {
    const config = this.getWizardConfig(session.wizardConfigId);
    if (!config.sessionTimeout) return false;

    const timeoutMs = config.sessionTimeout * 60 * 1000;
    const elapsedMs = Date.now() - session.lastActivityAt.getTime();

    return elapsedMs > timeoutMs;
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `WIZ-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get all active sessions for a user
   */
  getUserSessions(userId: string): WizardSession[] {
    return Array.from(this.activeSessions.values()).filter(
      (session) => session.userId === userId && session.status !== 'completed' && session.status !== 'cancelled',
    );
  }

  /**
   * Auto-save session data
   */
  async autoSave(sessionId: string, stepData: Record<string, any>): Promise<void> {
    const session = this.getSession(sessionId);
    const config = this.getWizardConfig(session.wizardConfigId);

    if (!config.saveProgress) {
      throw new BadRequestException('Auto-save is not enabled for this wizard');
    }

    const currentStep = config.steps[session.currentStepIndex];
    session.wizardData[currentStep.id] = {
      ...session.wizardData[currentStep.id],
      ...stepData,
    };
    session.lastActivityAt = new Date();

    await this.eventEmitter.emitAsync('wizard.autosaved', {
      sessionId,
      stepId: currentStep.id,
    });
  }
}

