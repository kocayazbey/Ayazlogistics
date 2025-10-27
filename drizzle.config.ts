import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';

dotenv.config();

const dbType = process.env.DATABASE_TYPE || 'postgresql';

export default {
  schema: dbType === 'sqlite' ? './src/database/schema/sqlite/index.ts' : './src/database/schema/**/*.schema.ts',
  out: './drizzle/migrations',
  dialect: dbType === 'sqlite' ? 'sqlite' : 'postgresql',
  ...(dbType === 'sqlite' ? {
    driver: 'better-sqlite',
    dbCredentials: {
      url: './ayazlogistics-dev.sqlite',
    },
  } : {
    dbCredentials: {
      host: process.env.DATABASE_HOST || 'localhost',
      port: Number(process.env.DATABASE_PORT) || 5432,
      user: process.env.DATABASE_USERNAME || 'postgres',
      password: process.env.DATABASE_PASSWORD || 'postgres',
      database: process.env.DATABASE_NAME || 'ayazlogistics',
    },
  }),
  verbose: true,
  strict: true,
} satisfies Config;

