import { SetMetadata } from '@nestjs/common';

export const ERROR_HANDLING_KEY = 'errorHandling';

export interface ErrorHandlingOptions {
  retryAttempts?: number;
  retryDelay?: number;
  fallbackMethod?: string;
  logLevel?: 'error' | 'warn' | 'debug';
  notifyAdmins?: boolean;
  customHandler?: string;
}

export const ErrorHandling = (options: ErrorHandlingOptions = {}) =>
  SetMetadata(ERROR_HANDLING_KEY, {
    retryAttempts: 3,
    retryDelay: 1000,
    logLevel: 'error',
    notifyAdmins: false,
    ...options,
  });

export const Retryable = (attempts: number = 3, delay: number = 1000) =>
  ErrorHandling({ retryAttempts: attempts, retryDelay: delay });

export const Fallback = (method: string) =>
  ErrorHandling({ fallbackMethod: method });

export const Critical = () =>
  ErrorHandling({ 
    logLevel: 'error', 
    notifyAdmins: true,
    retryAttempts: 1 
  });

export const Silent = () =>
  ErrorHandling({ 
    logLevel: 'debug',
    retryAttempts: 0 
  });
