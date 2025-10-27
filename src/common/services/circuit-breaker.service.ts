import { Injectable, Logger } from '@nestjs/common';

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN'
}

@Injectable()
export class CircuitBreakerService {
  private readonly logger = new Logger('CircuitBreakerService');
  private circuits = new Map<string, any>();

  createCircuit(name: string, options: any) {
    const circuit = {
      name,
      state: CircuitState.CLOSED,
      failureCount: 0,
      lastFailureTime: null,
      ...options
    };
    
    this.circuits.set(name, circuit);
    return circuit;
  }

  async execute<T>(circuitName: string, operation: () => Promise<T>): Promise<T> {
    const circuit = this.circuits.get(circuitName);
    
    if (!circuit) {
      throw new Error(`Circuit ${circuitName} not found`);
    }

    if (circuit.state === CircuitState.OPEN) {
      if (Date.now() - circuit.lastFailureTime > circuit.timeout) {
        circuit.state = CircuitState.HALF_OPEN;
      } else {
        throw new Error(`Circuit ${circuitName} is OPEN`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess(circuit);
      return result;
    } catch (error) {
      this.onFailure(circuit);
      throw error;
    }
  }

  private onSuccess(circuit: any) {
    circuit.failureCount = 0;
    circuit.state = CircuitState.CLOSED;
  }

  private onFailure(circuit: any) {
    circuit.failureCount++;
    circuit.lastFailureTime = Date.now();
    
    if (circuit.failureCount >= circuit.threshold) {
      circuit.state = CircuitState.OPEN;
    }
  }

  getCircuitState(circuitName: string): CircuitState {
    return this.circuits.get(circuitName)?.state || CircuitState.CLOSED;
  }
}