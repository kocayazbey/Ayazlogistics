import { Module } from '@nestjs/common';
import { SustainabilityController } from './sustainability.controller';
import { SustainabilityService } from './sustainability.service';

@Module({
  controllers: [SustainabilityController],
  providers: [SustainabilityService],
  exports: [SustainabilityService],
})
export class SustainabilityModule {}
