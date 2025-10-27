import { Module } from '@nestjs/common';
import { CustomerSegmentationController } from './customer-segmentation.controller';
import { CustomerSegmentationService } from './customer-segmentation.service';
import { DatabaseModule } from '../../../../core/database/database.module';
import { EventsModule } from '../../../../core/events/events.module';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
  ],
  controllers: [CustomerSegmentationController],
  providers: [CustomerSegmentationService],
  exports: [CustomerSegmentationService],
})
export class CustomerSegmentationModule {}
