import { Provider } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as postgresSchema from './schema';
import * as sqliteSchema from './schema/sqlite';
import { ConfigService } from '@nestjs/config';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface DatabaseConfig {
  host: string;
  port: number;
  username: string;
  password: string;
  database: string;
  ssl: boolean | object;
  maxConnections: number;
  minConnections: number;
  idleTimeout: number;
  connectTimeout: number;
  acquireTimeout: number;
  maxLifetime: number;
  connectionRetryAttempts: number;
  connectionRetryDelay: number;
}

export const DRIZZLE_ORM = 'DRIZZLE_ORM';

export const databaseProvider: Provider<any> = {
  provide: DRIZZLE_ORM,
  useFactory: (configService: ConfigService): any => {
    const nodeEnv = configService.get<string>('NODE_ENV', 'development');
    const dbType = configService.get<string>('DATABASE_TYPE', 'postgresql');

    // For development, use SQLite as fallback if PostgreSQL is not available
    if (nodeEnv === 'development' || dbType === 'sqlite') {
      console.log('🔄 Using SQLite for development (fallback mode)');

      try {
        const sqlite = new Database('ayazlogistics-dev.sqlite');
        const drizzleInstance = drizzleSQLite(sqlite, { schema: sqliteSchema });

        console.log('✅ SQLite database connected successfully');
        return drizzleInstance;
      } catch (error) {
        console.error('❌ SQLite connection failed:', error.message);
        throw error;
      }
    }

    // PostgreSQL configuration
    const dbConfig: DatabaseConfig = {
      host: configService.get<string>('DATABASE_HOST', 'localhost'),
      port: configService.get<number>('DATABASE_PORT', 5432),
      username: configService.get<string>('DATABASE_USERNAME', 'postgres'),
      password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
      database: configService.get<string>('DATABASE_NAME', 'ayazlogistics'),
      ssl: configService.get<string>('NODE_ENV') === 'production'
        ? { rejectUnauthorized: false }
        : false,
      maxConnections: configService.get<number>('DATABASE_MAX_CONNECTIONS', 20),
      minConnections: configService.get<number>('DATABASE_MIN_CONNECTIONS', 2),
      idleTimeout: configService.get<number>('DATABASE_IDLE_TIMEOUT', 30),
      connectTimeout: configService.get<number>('DATABASE_CONNECT_TIMEOUT', 10),
      acquireTimeout: configService.get<number>('DATABASE_ACQUIRE_TIMEOUT', 30),
      maxLifetime: configService.get<number>('DATABASE_MAX_LIFETIME', 3600),
      connectionRetryAttempts: configService.get<number>('DATABASE_RETRY_ATTEMPTS', 5),
      connectionRetryDelay: configService.get<number>('DATABASE_RETRY_DELAY', 1000),
    };

    try {
      const connectionString = configService.get<string>('DATABASE_URL') ||
        `postgresql://${dbConfig.username}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

      // Enhanced postgres client with comprehensive connection pooling
      const client = postgres(connectionString, {
        max: dbConfig.maxConnections,
        min: dbConfig.minConnections,
        idle_timeout: dbConfig.idleTimeout,
        connect_timeout: dbConfig.connectTimeout,
        max_lifetime: dbConfig.maxLifetime,
        max_pipeline: 100, // Enable pipelining for better performance
        ssl: dbConfig.ssl,
        // Connection retry configuration
        retry: {
          attempts: dbConfig.connectionRetryAttempts,
          delay: dbConfig.connectionRetryDelay,
        },
        // Performance optimizations
        fetch_types: false, // Faster queries by not fetching type information
        prepare: true, // Use prepared statements for better performance
        // Connection health checks
        onconnect: (conn) => {
          console.log(`✅ PostgreSQL connection established: ${conn.pid}`);
        },
        onclose: (conn) => {
          console.log(`🔌 PostgreSQL connection closed: ${conn.pid}`);
        },
        // Error handling
        onerror: (err, conn) => {
          console.error(`❌ PostgreSQL connection error:`, err);
        },
      });

      // Create Drizzle instance with schema
      const drizzleInstance: PostgresJsDatabase<typeof schema> = drizzle(client, {
        schema,
        logger: configService.get<string>('NODE_ENV') === 'development',
      });

      // Add connection pool monitoring
      setInterval(() => {
        const poolStats = {
          total: client.reserved + client.idle,
          reserved: client.reserved,
          idle: client.idle,
          waiting: client.waiting,
        };
        console.log('📊 PostgreSQL Pool Stats:', poolStats);
      }, 30000); // Log every 30 seconds

      console.log('✅ PostgreSQL database connected successfully');
      return drizzleInstance;

    } catch (error) {
      console.error('❌ PostgreSQL connection failed, falling back to SQLite:', error.message);

      // Fallback to SQLite if PostgreSQL fails
      const sqlite = new Database('ayazlogistics-dev.sqlite');
      const drizzleInstance = drizzleSQLite(sqlite, { schema: sqliteSchema });

      console.log('🔄 Fallback: SQLite database connected successfully');
      return drizzleInstance;
    }
  },
  inject: [ConfigService],
};
