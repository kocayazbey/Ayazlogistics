import { Module } from '@nestjs/common';
import { MobileHrController } from './mobile-hr.controller';
import { MobileHrService } from './mobile-hr.service';
import { DatabaseModule } from '../../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [MobileHrController],
  providers: [MobileHrService],
  exports: [MobileHrService],
})
export class MobileHrModule {}
