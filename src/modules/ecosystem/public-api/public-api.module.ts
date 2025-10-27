import { Module } from '@nestjs/common';
import { PublicAPIController } from './public-api.controller';
import { PublicAPIService } from './public-api.service';

@Module({
  controllers: [PublicAPIController],
  providers: [PublicAPIService],
  exports: [PublicAPIService],
})
export class PublicAPIModule {}
