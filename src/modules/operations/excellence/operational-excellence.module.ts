import { Module } from '@nestjs/common';
import { OperationalExcellenceController } from './operational-excellence.controller';
import { OperationalExcellenceService } from './operational-excellence.service';

@Module({
  controllers: [OperationalExcellenceController],
  providers: [OperationalExcellenceService],
  exports: [OperationalExcellenceService],
})
export class OperationalExcellenceModule {}
