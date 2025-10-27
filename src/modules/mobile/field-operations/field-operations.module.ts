import { Module } from '@nestjs/common';
import { FieldOperationsController } from './field-operations.controller';
import { FieldOperationsService } from './field-operations.service';

@Module({
  controllers: [FieldOperationsController],
  providers: [FieldOperationsService],
  exports: [FieldOperationsService],
})
export class FieldOperationsModule {}
