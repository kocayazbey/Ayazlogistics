import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { StandardizedDatabaseService } from './standardized-database.service';
import { DRIZZLE_ORM } from './database.constants';

/**
 * Standardized Database Module
 * Provides a single, optimized database connection
 * Replaces the old database.module.ts and database.service.ts
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE_ORM,
      useClass: StandardizedDatabaseService,
    },
    StandardizedDatabaseService,
  ],
  exports: [DRIZZLE_ORM, StandardizedDatabaseService],
})
export class StandardizedDatabaseModule {}
