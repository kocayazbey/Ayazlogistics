import { Module } from '@nestjs/common';
import { IntelligentInventoryController } from './intelligent-inventory.controller';
import { IntelligentInventoryService } from './intelligent-inventory.service';
import { DatabaseModule } from '../../../../core/database/database.module';
import { EventsModule } from '../../../../core/events/events.module';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
  ],
  controllers: [IntelligentInventoryController],
  providers: [IntelligentInventoryService],
  exports: [IntelligentInventoryService],
})
export class IntelligentInventoryModule {}
