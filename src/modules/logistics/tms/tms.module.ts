import { Module } from '@nestjs/common';
import { TmsController } from './tms.controller';
import { DriversController } from './controllers/drivers.controller';
import { TmsService } from './tms.service';
import { TMSService } from './services/tms.service';
import { DatabaseModule } from '../../../core/database/database.module';
import { PaginationService } from '../../../common/services/pagination.service';
import { QueryBuilderService } from '../../../common/services/query-builder.service';

@Module({
  imports: [DatabaseModule],
  controllers: [TmsController, DriversController],
  providers: [
    TmsService,
    TMSService,
    PaginationService,
    QueryBuilderService,
  ],
  exports: [TmsService, TMSService],
})
export class TmsModule {}