import { Module } from '@nestjs/common';
import { MobileCrmController } from './mobile-crm.controller';
import { MobileCrmService } from './mobile-crm.service';
import { DatabaseModule } from '../../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MobileCrmController],
  providers: [MobileCrmService],
  exports: [MobileCrmService],
})
export class MobileCrmModule {}
