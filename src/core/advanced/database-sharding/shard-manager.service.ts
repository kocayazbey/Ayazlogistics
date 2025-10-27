import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

interface ShardConfig {
  id: string;
  name: string;
  host: string;
  port: number;
  database: string;
  tenantIds: string[];
}

@Injectable()
export class ShardManagerService {
  private readonly logger = new Logger(ShardManagerService.name);
  private shards = new Map<string, Pool>();
  private tenantShardMap = new Map<string, string>();

  constructor() {
    this.initializeShards();
  }

  private initializeShards(): void {
    const shardConfigs: ShardConfig[] = [
      {
        id: 'shard-1',
        name: 'Primary Shard',
        host: process.env.DATABASE_HOST || 'localhost',
        port: 5432,
        database: 'ayazlogistics_shard_1',
        tenantIds: [],
      },
      {
        id: 'shard-2',
        name: 'Secondary Shard',
        host: process.env.DATABASE_SHARD_2_HOST || 'localhost',
        port: 5433,
        database: 'ayazlogistics_shard_2',
        tenantIds: [],
      },
    ];

    shardConfigs.forEach(config => {
      const pool = new Pool({
        host: config.host,
        port: config.port,
        database: config.database,
        user: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        max: 20,
      });

      this.shards.set(config.id, pool);
      config.tenantIds.forEach(tenantId => {
        this.tenantShardMap.set(tenantId, config.id);
      });

      this.logger.log(`Shard initialized: ${config.name}`);
    });
  }

  getShardForTenant(tenantId: string): Pool {
    const shardId = this.tenantShardMap.get(tenantId) || 'shard-1';
    const shard = this.shards.get(shardId);
    
    if (!shard) {
      throw new Error(`Shard not found for tenant ${tenantId}`);
    }

    return shard;
  }

  async query(tenantId: string, text: string, params?: any[]): Promise<any> {
    const shard = this.getShardForTenant(tenantId);
    return shard.query(text, params);
  }

  async rebalanceShards(): Promise<void> {
    this.logger.log('Starting shard rebalancing...');
    
    const shardLoads = await Promise.all(
      Array.from(this.shards.entries()).map(async ([shardId, pool]) => {
        const result = await pool.query('SELECT COUNT(*) FROM tenants');
        return { shardId, count: parseInt(result.rows[0].count) };
      })
    );

    this.logger.log('Shard loads:', shardLoads);
  }
}

