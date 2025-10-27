import { Module, Global, Logger, OnModuleInit, OnModuleDestroy, Injectable, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { DRIZZLE_ORM } from './database.constants';
import { DatabaseService } from './database.service';
import { StandardizedDatabaseService } from './standardized-database.service';
import { DatabaseErrorHandlerService } from './database-error-handler.service';
import { TransactionManagerService } from './transaction-manager.service';
import { DatabaseHealthCheckService } from './database-health-check.service';
import { QueryOptimizerService } from './query-optimizer.service';
import * as schema from '../../database/schema';
import { sql } from 'drizzle-orm';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DRIZZLE_ORM,
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => {
        const logger = new Logger('DatabaseModule');
        
        // Support both DATABASE_URL and individual components
        const databaseUrl = configService.get('DATABASE_URL');
        
        let connectionString: string;
        
        if (databaseUrl) {
          connectionString = databaseUrl;
        } else {
          // Build connection string from individual components
          connectionString = `postgresql://${configService.get('DATABASE_USERNAME')}:${configService.get('DATABASE_PASSWORD')}@${configService.get('DATABASE_HOST')}:${configService.get('DATABASE_PORT')}/${configService.get('DATABASE_NAME')}`;
        }

        const poolConfig = {
          max: configService.get('DATABASE_POOL_MAX', 10),
          idle_timeout: configService.get('DATABASE_IDLE_TIMEOUT', 20),
          connect_timeout: configService.get('DATABASE_CONNECTION_TIMEOUT', 10),
          max_lifetime: configService.get('DATABASE_MAX_LIFETIME', 60 * 30), // 30 minutes
          statement_timeout: configService.get('DATABASE_STATEMENT_TIMEOUT', 30000),
          prepare: true,
          transform: {
            undefined: null,
          },
        };

        logger.log(`🔌 Connecting to database: ${configService.get('DATABASE_HOST') || 'unknown'}`);
        
        try {
          const client = postgres(connectionString, poolConfig);
          
          // Test connection
          await client`SELECT 1`;
          logger.log('✅ Database connection established successfully');
          
          return drizzle(client, { 
            schema,
            logger: configService.get('ENABLE_QUERY_LOGGING') === 'true' ? {
              logQuery: (query, params) => {
                logger.debug(`Query: ${query}`, params);
              },
            } : false,
          });
        } catch (error) {
          logger.error('❌ Failed to connect to database:', error);
          throw error;
        }
      },
    },
    DatabaseService,
    StandardizedDatabaseService,
    DatabaseErrorHandlerService,
    TransactionManagerService,
    DatabaseHealthCheckService,
    QueryOptimizerService,
  ],
  exports: [DRIZZLE_ORM, DatabaseService, StandardizedDatabaseService, DatabaseErrorHandlerService, TransactionManagerService, DatabaseHealthCheckService, QueryOptimizerService],
})
export class DatabaseModule implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(DatabaseModule.name);

  async onModuleInit() {
    this.logger.log('📦 Database module initialized');
  }

  async onModuleDestroy() {
    this.logger.log('📦 Database module destroyed');
  }
}

