import { SetMetadata } from '@nestjs/common';
import { CircuitBreakerConfig } from '../services/circuit-breaker.service';

export const CIRCUIT_BREAKER_KEY = 'circuitBreaker';

export const CircuitBreaker = (config?: Partial<CircuitBreakerConfig>) =>
  SetMetadata(CIRCUIT_BREAKER_KEY, config || {});

export const FastCircuitBreaker = () =>
  CircuitBreaker({
    failureThreshold: 3,
    timeout: 5000,
    resetTimeout: 15000,
  });

export const SlowCircuitBreaker = () =>
  CircuitBreaker({
    failureThreshold: 10,
    timeout: 30000,
    resetTimeout: 60000,
  });

export const DatabaseCircuitBreaker = () =>
  CircuitBreaker({
    failureThreshold: 5,
    timeout: 10000,
    resetTimeout: 30000,
  });

export const ExternalServiceCircuitBreaker = () =>
  CircuitBreaker({
    failureThreshold: 3,
    timeout: 15000,
    resetTimeout: 60000,
  });
