import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { SoftDeleteService } from './soft-delete.service';

@Module({
  imports: [DatabaseModule],
  providers: [SoftDeleteService],
  exports: [SoftDeleteService],
})
export class AuditModule {}
