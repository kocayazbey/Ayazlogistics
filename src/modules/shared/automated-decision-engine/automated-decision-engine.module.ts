import { Module } from '@nestjs/common';
import { AutomatedDecisionEngineController } from './automated-decision-engine.controller';
import { AutomatedDecisionEngineService } from './automated-decision-engine.service';
import { DatabaseModule } from '../../../../core/database/database.module';
import { EventsModule } from '../../../../core/events/events.module';

@Module({
  imports: [
    DatabaseModule,
    EventsModule,
  ],
  controllers: [AutomatedDecisionEngineController],
  providers: [AutomatedDecisionEngineService],
  exports: [AutomatedDecisionEngineService],
})
export class AutomatedDecisionEngineModule {}
