import { Module } from '@nestjs/common';
import { EDIController } from './edi.controller';
import { EDIService } from './edi.service';
import { IntegrationFrameworkService } from '../../../core/integrations/integration-framework.service';

@Module({
  controllers: [EDIController],
  providers: [EDIService, IntegrationFrameworkService],
  exports: [EDIService, IntegrationFrameworkService],
})
export class EDIModule {}
