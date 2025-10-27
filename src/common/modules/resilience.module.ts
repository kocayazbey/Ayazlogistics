import { Module } from '@nestjs/common';
import { CircuitBreakerService } from '../services/circuit-breaker.service';
import { ReadReplicaRoutingService } from '../services/read-replica-routing.service';
import { DatabaseFailoverService } from '../services/database-failover.service';
import { QuotaService } from '../services/quota.service';
import { CircuitBreakerHealthController } from '../controllers/circuit-breaker-health.controller';

@Module({
  providers: [
    CircuitBreakerService,
    ReadReplicaRoutingService,
    DatabaseFailoverService,
    QuotaService,
  ],
  controllers: [CircuitBreakerHealthController],
  exports: [
    CircuitBreakerService,
    ReadReplicaRoutingService,
    DatabaseFailoverService,
    QuotaService,
  ],
})
export class ResilienceModule {}
