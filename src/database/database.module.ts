import { Module } from '@nestjs/common';
import { databaseProvider } from './database.provider';
import { DatabaseHealthService } from './database-health.service';
import { DatabaseController } from './controllers/database.controller';

@Module({
  providers: [databaseProvider, DatabaseHealthService],
  controllers: [DatabaseController],
  exports: [databaseProvider, DatabaseHealthService],
})
export class DatabaseModule {}
