import { Module } from '@nestjs/common';
import { SupplierIntegrationController } from './supplier-integration.controller';
import { SupplierIntegrationService } from './supplier-integration.service';
import { DatabaseModule } from '../../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [SupplierIntegrationController],
  providers: [SupplierIntegrationService],
  exports: [SupplierIntegrationService],
})
export class SupplierIntegrationModule {}
