interface ApiError {
  message: string;
  status: number;
  code?: string;
  details?: any;
}

interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

class ApiErrorHandler {
  private retryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2,
  };

  private retryCount = new Map<string, number>();

  async handleError(error: any, requestId: string): Promise<never> {
    const apiError = this.transformError(error);
    
    // Log error
    console.error(`API Error [${requestId}]:`, {
      message: apiError.message,
      status: apiError.status,
      code: apiError.code,
      details: apiError.details,
    });

    // Handle specific error types
    switch (apiError.status) {
      case 401:
        this.handleUnauthorized();
        break;
      case 403:
        this.handleForbidden();
        break;
      case 404:
        this.handleNotFound(apiError);
        break;
      case 429:
        this.handleRateLimit(apiError);
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        this.handleServerError(apiError);
        break;
      default:
        this.handleGenericError(apiError);
    }

    throw apiError;
  }

  private transformError(error: any): ApiError {
    if (error.response) {
      // Axios error
      return {
        message: error.response.data?.message || error.message,
        status: error.response.status,
        code: error.response.data?.code,
        details: error.response.data?.details,
      };
    }

    if (error.request) {
      // Network error
      return {
        message: 'Network error - please check your connection',
        status: 0,
        code: 'NETWORK_ERROR',
        details: error.message,
      };
    }

    // Generic error
    return {
      message: error.message || 'An unexpected error occurred',
      status: 500,
      code: 'UNKNOWN_ERROR',
      details: error,
    };
  }

  private handleUnauthorized() {
    // Clear auth data and redirect to login
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    
    // Show notification
    this.showNotification('Session expired. Please login again.', 'error');
    
    // Redirect to login
    setTimeout(() => {
      window.location.href = '/login';
    }, 2000);
  }

  private handleForbidden() {
    this.showNotification('You do not have permission to perform this action.', 'error');
  }

  private handleNotFound(error: ApiError) {
    this.showNotification(`Resource not found: ${error.message}`, 'error');
  }

  private handleRateLimit(error: ApiError) {
    const retryAfter = error.details?.retryAfter || 60;
    this.showNotification(
      `Too many requests. Please try again in ${retryAfter} seconds.`,
      'warning'
    );
  }

  private handleServerError(error: ApiError) {
    this.showNotification(
      'Server error. Our team has been notified. Please try again later.',
      'error'
    );
  }

  private handleGenericError(error: ApiError) {
    this.showNotification(error.message, 'error');
  }

  private showNotification(message: string, type: 'success' | 'error' | 'warning' | 'info') {
    // This would integrate with your notification system
    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Example: dispatch to notification store
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent('notification', {
        detail: { message, type }
      }));
    }
  }

  async retryRequest<T>(
    requestFn: () => Promise<T>,
    requestId: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.retryConfig, ...customConfig };
    const currentRetries = this.retryCount.get(requestId) || 0;

    if (currentRetries >= config.maxRetries) {
      this.retryCount.delete(requestId);
      throw new Error('Max retries exceeded');
    }

    try {
      const result = await requestFn();
      this.retryCount.delete(requestId);
      return result;
    } catch (error) {
      const apiError = this.transformError(error);
      
      // Check if error is retryable
      if (!this.isRetryableError(apiError)) {
        this.retryCount.delete(requestId);
        throw apiError;
      }

      // Increment retry count
      this.retryCount.set(requestId, currentRetries + 1);

      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffMultiplier, currentRetries),
        config.maxDelay
      );

      console.log(`Retrying request ${requestId} in ${delay}ms (attempt ${currentRetries + 1}/${config.maxRetries})`);

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, delay));

      // Retry the request
      return this.retryRequest(requestFn, requestId, customConfig);
    }
  }

  private isRetryableError(error: ApiError): boolean {
    const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
    const retryableCodes = ['NETWORK_ERROR', 'TIMEOUT_ERROR', 'CONNECTION_ERROR'];
    
    return retryableStatusCodes.includes(error.status) || 
           retryableCodes.includes(error.code || '');
  }

  // Circuit breaker implementation
  private circuitBreaker = new Map<string, {
    state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: number;
    successCount: number;
  }>();

  async executeWithCircuitBreaker<T>(
    requestFn: () => Promise<T>,
    circuitKey: string
  ): Promise<T> {
    const circuit = this.getCircuitState(circuitKey);

    if (circuit.state === 'OPEN') {
      if (this.shouldAttemptReset(circuit)) {
        circuit.state = 'HALF_OPEN';
        circuit.successCount = 0;
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await requestFn();
      this.recordSuccess(circuit);
      return result;
    } catch (error) {
      this.recordFailure(circuit);
      throw error;
    }
  }

  private getCircuitState(circuitKey: string) {
    if (!this.circuitBreaker.has(circuitKey)) {
      this.circuitBreaker.set(circuitKey, {
        state: 'CLOSED',
        failureCount: 0,
        lastFailureTime: 0,
        successCount: 0,
      });
    }
    return this.circuitBreaker.get(circuitKey)!;
  }

  private recordFailure(circuit: any) {
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();

    if (circuit.failureCount >= 5) { // Threshold
      circuit.state = 'OPEN';
    }
  }

  private recordSuccess(circuit: any) {
    circuit.successCount++;
    
    if (circuit.state === 'HALF_OPEN' && circuit.successCount >= 3) {
      circuit.state = 'CLOSED';
      circuit.failureCount = 0;
    }
  }

  private shouldAttemptReset(circuit: any): boolean {
    return Date.now() - circuit.lastFailureTime > 30000; // 30 seconds
  }

  // Get error statistics
  getErrorStats() {
    return {
      retryCounts: Object.fromEntries(this.retryCount),
      circuitStates: Object.fromEntries(this.circuitBreaker),
    };
  }

  // Reset all error handling state
  reset() {
    this.retryCount.clear();
    this.circuitBreaker.clear();
  }
}

export const apiErrorHandler = new ApiErrorHandler();
export type { ApiError, RetryConfig };
