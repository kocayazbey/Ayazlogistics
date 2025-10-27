import { Module } from '@nestjs/common';
import { HukukController } from './hukuk.controller';
import { ContractApprovalService } from '../../../modules/logistics/ayaz-hukuk/proposal-contract-approval/contract-approval.service';
import { ContractManagerService } from '../ayaz-document/contract-management/contract-manager.service';
import { EventsModule } from '../../../core/events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [HukukController],
  providers: [ContractApprovalService, ContractManagerService],
  exports: [ContractApprovalService, ContractManagerService],
})
export class HukukModule {}

