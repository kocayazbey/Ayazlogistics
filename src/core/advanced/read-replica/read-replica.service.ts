import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';

@Injectable()
export class ReadReplicaService {
  private readonly logger = new Logger(ReadReplicaService.name);
  private masterPool: Pool;
  private replicaPools: Pool[] = [];
  private currentReplicaIndex = 0;

  constructor() {
    this.masterPool = new Pool({
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      database: process.env.DATABASE_NAME,
      user: process.env.DATABASE_USERNAME,
      password: process.env.DATABASE_PASSWORD,
      max: 10,
    });

    const replicaHost = process.env.DATABASE_READ_REPLICA_HOST;
    if (replicaHost) {
      this.replicaPools.push(new Pool({
        host: replicaHost,
        port: parseInt(process.env.DATABASE_READ_REPLICA_PORT || '5432'),
        database: process.env.DATABASE_NAME,
        user: process.env.DATABASE_USERNAME,
        password: process.env.DATABASE_PASSWORD,
        max: 20,
      }));

      this.logger.log(`Read replica configured: ${replicaHost}`);
    }
  }

  async queryMaster(text: string, params?: any[]): Promise<any> {
    return this.masterPool.query(text, params);
  }

  async queryReplica(text: string, params?: any[]): Promise<any> {
    if (this.replicaPools.length === 0) {
      return this.masterPool.query(text, params);
    }

    const pool = this.replicaPools[this.currentReplicaIndex];
    this.currentReplicaIndex = (this.currentReplicaIndex + 1) % this.replicaPools.length;

    try {
      return await pool.query(text, params);
    } catch (error) {
      this.logger.warn('Replica query failed, falling back to master');
      return this.masterPool.query(text, params);
    }
  }

  async checkReplicaLag(): Promise<number> {
    if (this.replicaPools.length === 0) return 0;

    try {
      const masterResult = await this.masterPool.query('SELECT pg_current_wal_lsn()');
      const replicaResult = await this.replicaPools[0].query('SELECT pg_last_wal_replay_lsn()');

      const masterLSN = masterResult.rows[0].pg_current_wal_lsn;
      const replicaLSN = replicaResult.rows[0].pg_last_wal_replay_lsn;

      const lag = this.calculateLSNDifference(masterLSN, replicaLSN);
      
      if (lag > 1000000) {
        this.logger.warn(`High replication lag detected: ${lag} bytes`);
      }

      return lag;
    } catch (error) {
      this.logger.error('Failed to check replica lag:', error);
      return -1;
    }
  }

  private calculateLSNDifference(lsn1: string, lsn2: string): number {
    return 0;
  }
}

