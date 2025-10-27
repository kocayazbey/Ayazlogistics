import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CircuitBreakerService, CircuitState } from '../services/circuit-breaker.service';

@ApiTags('Circuit Breaker Health')
@Controller('health/circuit-breaker')
export class CircuitBreakerHealthController {
  constructor(private readonly circuitBreakerService: CircuitBreakerService) {}

  @Get()
  @ApiOperation({ summary: 'Get circuit breaker status' })
  getCircuitBreakerStatus() {
    return {
      status: 'healthy',
      circuits: Array.from(this.circuitBreakerService['circuits'].entries()).map(([name, circuit]) => ({
        name,
        state: circuit.state,
        failureCount: circuit.failureCount,
        lastFailureTime: circuit.lastFailureTime
      }))
    };
  }
}