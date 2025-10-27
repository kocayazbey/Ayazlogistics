import { Injectable, Logger } from '@nestjs/common';

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

interface CircuitBreakerOptions {
  failureThreshold: number;
  successThreshold: number;
  timeout: number;
  resetTimeout: number;
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger(CircuitBreakerService.name);
  private circuits = new Map<string, {
    state: CircuitState;
    failures: number;
    successes: number;
    nextAttempt: number;
    options: CircuitBreakerOptions;
  }>();

  async execute<T>(
    name: string,
    fn: () => Promise<T>,
    options: Partial<CircuitBreakerOptions> = {},
  ): Promise<T> {
    const opts: CircuitBreakerOptions = {
      failureThreshold: options.failureThreshold || 5,
      successThreshold: options.successThreshold || 2,
      timeout: options.timeout || 30000,
      resetTimeout: options.resetTimeout || 60000,
    };

    if (!this.circuits.has(name)) {
      this.circuits.set(name, {
        state: CircuitState.CLOSED,
        failures: 0,
        successes: 0,
        nextAttempt: 0,
        options: opts,
      });
    }

    const circuit = this.circuits.get(name)!;

    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() < circuit.nextAttempt) {
        throw new Error(`Circuit breaker ${name} is OPEN`);
      }
      circuit.state = CircuitState.HALF_OPEN;
      this.logger.log(`Circuit ${name} entering HALF_OPEN state`);
    }

    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('Timeout')), opts.timeout)
        ),
      ]);

      this.onSuccess(name);
      return result;
    } catch (error) {
      this.onFailure(name);
      throw error;
    }
  }

  private onSuccess(name: string): void {
    const circuit = this.circuits.get(name)!;
    circuit.failures = 0;

    if (circuit.state === CircuitState.HALF_OPEN) {
      circuit.successes++;
      if (circuit.successes >= circuit.options.successThreshold) {
        circuit.state = CircuitState.CLOSED;
        circuit.successes = 0;
        this.logger.log(`Circuit ${name} CLOSED`);
      }
    }
  }

  private onFailure(name: string): void {
    const circuit = this.circuits.get(name)!;
    circuit.failures++;
    circuit.successes = 0;

    if (circuit.failures >= circuit.options.failureThreshold) {
      circuit.state = CircuitState.OPEN;
      circuit.nextAttempt = Date.now() + circuit.options.resetTimeout;
      this.logger.warn(`Circuit ${name} OPEN after ${circuit.failures} failures`);
    }
  }

  getState(name: string): CircuitState {
    return this.circuits.get(name)?.state || CircuitState.CLOSED;
  }
}

