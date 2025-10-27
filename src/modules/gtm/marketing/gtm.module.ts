import { Module } from '@nestjs/common';
import { GTMController } from './gtm.controller';
import { GTMService } from './gtm.service';

@Module({
  controllers: [GTMController],
  providers: [GTMService],
  exports: [GTMService],
})
export class GTMModule {}
