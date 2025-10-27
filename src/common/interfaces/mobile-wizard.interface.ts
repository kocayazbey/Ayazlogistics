export interface WizardConfig {
  id: string;
  name: string;
  description: string;
  version: string;
  sessionTimeout: number;
  requireConfirmation: boolean;
  steps: WizardStep[];
}

export interface WizardStep {
  id: string;
  name: string;
  order: number;
  validationRules?: ValidationRule[];
}

export interface ValidationRule {
  field: string;
  type: 'required' | 'email' | 'phone' | 'custom';
  message: string;
  messageTr: string;
  customValidator?: (value: any) => boolean;
}

export interface WizardSession {
  id: string;
  wizardId: string;
  userId: string;
  currentStep: number;
  data: Record<string, any>;
  startedAt: Date;
  lastActivityAt: Date;
  completed: boolean;
}

export interface WizardNavigationResult {
  success: boolean;
  currentStep: number;
  totalSteps: number;
  canGoNext: boolean;
  canGoPrevious: boolean;
  validationErrors?: Record<string, string>;
}

export interface WizardValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface WizardCompletionResult {
  success: boolean;
  completedSteps: number;
  totalSteps: number;
  completionTime: number;
  data: Record<string, any>;
}