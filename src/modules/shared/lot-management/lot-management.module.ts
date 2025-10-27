import { Module } from '@nestjs/common';
import { LotManagementController } from './lot-management.controller';
import { LotManagementService } from './lot-management.service';
import { DatabaseModule } from '../../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [LotManagementController],
  providers: [LotManagementService],
  exports: [LotManagementService],
})
export class LotManagementModule {}
