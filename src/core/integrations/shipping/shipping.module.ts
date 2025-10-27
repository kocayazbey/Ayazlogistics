import { Module } from '@nestjs/common';
import { ShippingController } from './shipping.controller';
import { ArasKargoService } from './aras-kargo.service';
import { MNGKargoService } from './mng-kargo.service';
import { YurticiKargoService } from './yurtici-kargo.service';
import { IntegrationFrameworkService } from '../integration-framework.service';

@Module({
  controllers: [ShippingController],
  providers: [ArasKargoService, MNGKargoService, YurticiKargoService, IntegrationFrameworkService],
  exports: [ArasKargoService, MNGKargoService, YurticiKargoService, IntegrationFrameworkService],
})
export class ShippingModule {}

