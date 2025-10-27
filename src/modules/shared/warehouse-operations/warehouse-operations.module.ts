import { Module } from '@nestjs/common';
import { WarehouseOperationsController } from './warehouse-operations.controller';
import { WarehouseOperationsService } from './warehouse-operations.service';
import { DatabaseModule } from '../../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WarehouseOperationsController],
  providers: [WarehouseOperationsService],
  exports: [WarehouseOperationsService],
})
export class WarehouseOperationsModule {}
