import { SetMetadata } from '@nestjs/common';

export const AI_KEY = 'ai';
export const AI_OPTIONS_KEY = 'ai_options';

export interface AIOptions {
  model?: string;
  provider?: string;
  temperature?: number;
  maxTokens?: number;
  enableCaching?: boolean;
  enableStreaming?: boolean;
  enableLogging?: boolean;
  customPrompts?: string[];
  fallbackModel?: string;
  retryAttempts?: number;
  timeout?: number;
}

export const AI = (options: AIOptions = {}) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    SetMetadata(AI_KEY, true)(target, propertyKey, descriptor);
    SetMetadata(AI_OPTIONS_KEY, {
      enableCaching: true,
      enableLogging: true,
      retryAttempts: 3,
      timeout: 30000,
      ...options,
    })(target, propertyKey, descriptor);
    return descriptor;
  };
};

export const AIGPT3 = () => AI({ model: 'gpt-3.5-turbo', provider: 'openai' });
export const AIGPT4 = () => AI({ model: 'gpt-4', provider: 'openai' });
export const AICache = () => AI({ enableCaching: true });
export const AIAudit = () => AI({ enableLogging: true });
