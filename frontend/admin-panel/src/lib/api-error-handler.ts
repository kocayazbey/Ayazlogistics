import { useToast } from '@/components/Toast';

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
  details?: any;
}

export interface ErrorHandlerOptions {
  showToast?: boolean;
  fallbackMessage?: string;
  onError?: (error: ApiError) => void;
}

export class ApiErrorHandler {
  private static getErrorMessage(error: any): string {
    // Handle different error types
    if (typeof error === 'string') {
      return error;
    }

    if (error?.response?.data?.message) {
      return error.response.data.message;
    }

    if (error?.response?.data?.error) {
      return error.response.data.error;
    }

    if (error?.message) {
      return error.message;
    }

    if (error?.response?.status) {
      return this.getStatusMessage(error.response.status);
    }

    return 'An unexpected error occurred';
  }

  private static getStatusMessage(status: number): string {
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in again.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'This action conflicts with existing data.';
      case 422:
        return 'The provided data is invalid.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
        return 'Bad gateway. Service temporarily unavailable.';
      case 503:
        return 'Service temporarily unavailable. Please try again later.';
      case 504:
        return 'Request timeout. Please try again.';
      default:
        return `Request failed with status ${status}`;
    }
  }

  private static getErrorCode(error: any): string | undefined {
    return error?.response?.data?.code || error?.code;
  }

  static createError(error: any): ApiError {
    return {
      message: this.getErrorMessage(error),
      status: error?.response?.status,
      code: this.getErrorCode(error),
      details: error?.response?.data,
    };
  }

  static handleError(error: any, options: ErrorHandlerOptions = {}): ApiError {
    const apiError = this.createError(error);

    // Show toast notification if enabled
    if (options.showToast !== false) {
      const toast = useToast();
      toast.error(apiError.message);
    }

    // Call custom error handler
    if (options.onError) {
      options.onError(apiError);
    }

    // Log error for debugging
    console.error('API Error:', apiError);

    return apiError;
  }

  static isNetworkError(error: any): boolean {
    return !error?.response && error?.code !== 'ABORTED';
  }

  static isTimeoutError(error: any): boolean {
    return error?.code === 'ECONNABORTED' || error?.message?.includes('timeout');
  }

  static isValidationError(error: any): boolean {
    return error?.response?.status === 422 || error?.response?.status === 400;
  }

  static isAuthError(error: any): boolean {
    return error?.response?.status === 401 || error?.response?.status === 403;
  }

  static shouldRetry(error: any): boolean {
    const status = error?.response?.status;
    return (
      this.isNetworkError(error) ||
      this.isTimeoutError(error) ||
      status === 429 ||
      status === 502 ||
      status === 503 ||
      status === 504
    );
  }

  static getRetryDelay(attempt: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, etc.
    return Math.min(1000 * Math.pow(2, attempt), 30000);
  }
}

// React hook for handling API errors
export function useApiErrorHandler() {
  const toast = useToast();

  const handleError = (error: any, options: ErrorHandlerOptions = {}) => {
    return ApiErrorHandler.handleError(error, {
      showToast: options.showToast !== false,
      fallbackMessage: options.fallbackMessage,
      onError: (apiError) => {
        // Show appropriate toast based on error type
        if (ApiErrorHandler.isNetworkError(error)) {
          toast.error('Network connection error. Please check your internet connection.');
        } else if (ApiErrorHandler.isAuthError(error)) {
          toast.error('Authentication error. Please log in again.');
        } else {
          toast.error(apiError.message);
        }

        if (options.onError) {
          options.onError(apiError);
        }
      },
    });
  };

  const handleAsyncError = async (asyncFn: () => Promise<any>, options: ErrorHandlerOptions = {}) => {
    try {
      return await asyncFn();
    } catch (error) {
      handleError(error, options);
      throw error;
    }
  };

  return {
    handleError,
    handleAsyncError,
    createError: ApiErrorHandler.createError,
    isNetworkError: ApiErrorHandler.isNetworkError,
    isTimeoutError: ApiErrorHandler.isTimeoutError,
    isValidationError: ApiErrorHandler.isValidationError,
    isAuthError: ApiErrorHandler.isAuthError,
    shouldRetry: ApiErrorHandler.shouldRetry,
  };
}

// Utility function for retrying failed requests
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  onRetry?: (attempt: number, error: any) => void
): Promise<T> {
  let lastError: any;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (attempt === maxAttempts || !ApiErrorHandler.shouldRetry(error)) {
        throw error;
      }

      const delay = ApiErrorHandler.getRetryDelay(attempt);
      onRetry?.(attempt, error);

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
