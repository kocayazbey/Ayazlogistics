import { Module } from '@nestjs/common';
import { TlsAutomationService } from '../services/tls-automation.service';
import { ActiveActiveTestingService } from '../services/active-active-testing.service';
import { TlsAutomationController } from '../controllers/tls-automation.controller';
import { ActiveActiveTestingController } from '../controllers/active-active-testing.controller';

@Module({
  providers: [TlsAutomationService, ActiveActiveTestingService],
  controllers: [TlsAutomationController, ActiveActiveTestingController],
  exports: [TlsAutomationService, ActiveActiveTestingService],
})
export class InfrastructureModule {}
