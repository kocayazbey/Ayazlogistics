import { Module } from '@nestjs/common';
import { DocumentController } from './document.controller';
import { ContractManagerService } from '../../../modules/logistics/ayaz-document/contract-management/contract-manager.service';
import { ProposalGeneratorService } from '../../../modules/logistics/ayaz-document/proposal-pdf/proposal-generator.service';

@Module({
  controllers: [DocumentController],
  providers: [ContractManagerService, ProposalGeneratorService],
  exports: [ContractManagerService, ProposalGeneratorService],
})
export class DocumentModule {}

