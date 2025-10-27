import { Module } from '@nestjs/common';
import { LighthouseCiService } from '../services/lighthouse-ci.service';
import { K6LoadTestingService } from '../services/k6-load-testing.service';
import { DastSecurityService } from '../services/dast-security.service';
import { StrykerMutationService } from '../services/stryker-mutation.service';
import { PactContractService } from '../services/pact-contract.service';
import { E2eStabilityService } from '../services/e2e-stability.service';
import { CoverageThresholdService } from '../services/coverage-threshold.service';
import { LighthouseCiController } from '../controllers/lighthouse-ci.controller';
import { K6LoadTestingController } from '../controllers/k6-load-testing.controller';
import { DastSecurityController } from '../controllers/dast-security.controller';
import { StrykerMutationController } from '../controllers/stryker-mutation.controller';
import { PactContractController } from '../controllers/pact-contract.controller';
import { E2eStabilityController } from '../controllers/e2e-stability.controller';
import { CoverageThresholdController } from '../controllers/coverage-threshold.controller';

@Module({
  providers: [
    LighthouseCiService,
    K6LoadTestingService,
    DastSecurityService,
    StrykerMutationService,
    PactContractService,
    E2eStabilityService,
    CoverageThresholdService,
  ],
  controllers: [
    LighthouseCiController,
    K6LoadTestingController,
    DastSecurityController,
    StrykerMutationController,
    PactContractController,
    E2eStabilityController,
    CoverageThresholdController,
  ],
  exports: [
    LighthouseCiService,
    K6LoadTestingService,
    DastSecurityService,
    StrykerMutationService,
    PactContractService,
    E2eStabilityService,
    CoverageThresholdService,
  ],
})
export class TestingModule {}
