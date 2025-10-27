import { Module } from '@nestjs/common';
import { PricingCampaignsController } from './pricing-campaigns.controller';
import { PricingCampaignsService } from './pricing-campaigns.service';
import { DatabaseModule } from '../../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PricingCampaignsController],
  providers: [PricingCampaignsService],
  exports: [PricingCampaignsService],
})
export class PricingCampaignsModule {}
