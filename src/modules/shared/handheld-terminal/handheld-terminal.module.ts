import { Module } from '@nestjs/common';
import { HandheldTerminalController } from './handheld-terminal.controller';
import { HandheldTerminalService } from './handheld-terminal.service';
import { DatabaseModule } from '../../../core/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [HandheldTerminalController],
  providers: [HandheldTerminalService],
  exports: [HandheldTerminalService],
})
export class HandheldTerminalModule {}
