import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { users, customers, orders, invoices, vehicles, drivers, inventory, auditLogs, employees } from '../../database/schema';

interface RetentionPolicy {
  id: string;
  dataType: string;
  tableName: string;
  retentionPeriodDays: number;
  archiveBeforeDelete: boolean;
  legalBasis: 'GDPR' | 'KVKK' | 'SOX' | 'PCI_DSS' | 'TAX_LAW' | 'CUSTOM';
  isActive: boolean;
  lastExecuted?: Date;
  nextExecution: Date;
}

interface ArchiveJob {
  id: string;
  policyId: string;
  startTime: Date;
  endTime?: Date;
  status: 'running' | 'completed' | 'failed';
  recordsProcessed: number;
  recordsArchived: number;
  recordsDeleted: number;
  errors: number;
}

@Injectable()
export class DataRetentionService {
  private readonly logger = new Logger(DataRetentionService.name);

  private readonly DEFAULT_POLICIES: Partial<RetentionPolicy>[] = [
    {
      dataType: 'audit_logs',
      tableName: 'audit_logs',
      retentionPeriodDays: 2555,
      archiveBeforeDelete: true,
      legalBasis: 'SOX',
    },
    {
      dataType: 'financial_transactions',
      tableName: 'gl_transactions',
      retentionPeriodDays: 3650,
      archiveBeforeDelete: true,
      legalBasis: 'TAX_LAW',
    },
    {
      dataType: 'invoices',
      tableName: 'invoices',
      retentionPeriodDays: 3650,
      archiveBeforeDelete: true,
      legalBasis: 'TAX_LAW',
    },
    {
      dataType: 'customer_data',
      tableName: 'customers',
      retentionPeriodDays: 730,
      archiveBeforeDelete: true,
      legalBasis: 'GDPR',
    },
    {
      dataType: 'vehicle_locations',
      tableName: 'vehicle_locations',
      retentionPeriodDays: 90,
      archiveBeforeDelete: true,
      legalBasis: 'CUSTOM',
    },
    {
      dataType: 'integration_logs',
      tableName: 'integration_logs',
      retentionPeriodDays: 30,
      archiveBeforeDelete: false,
      legalBasis: 'CUSTOM',
    },
    {
      dataType: 'notifications',
      tableName: 'notifications',
      retentionPeriodDays: 90,
      archiveBeforeDelete: false,
      legalBasis: 'CUSTOM',
    },
    {
      dataType: 'sessions',
      tableName: 'sessions',
      retentionPeriodDays: 30,
      archiveBeforeDelete: false,
      legalBasis: 'CUSTOM',
    },
  ];

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async initializeRetentionPolicies(): Promise<void> {
    this.logger.log('Initializing data retention policies');

    for (const policy of this.DEFAULT_POLICIES) {
      const id = `policy_${policy.dataType}`;
      const nextExecution = new Date();
      nextExecution.setDate(nextExecution.getDate() + 1);

      await this.db.execute(
        `INSERT INTO data_retention_policies 
         (id, data_type, table_name, retention_period_days, archive_before_delete, legal_basis, is_active, next_execution)
         VALUES ($1, $2, $3, $4, $5, $6, true, $7)
         ON CONFLICT (id) DO NOTHING`,
        [id, policy.dataType, policy.tableName, policy.retentionPeriodDays, 
         policy.archiveBeforeDelete, policy.legalBasis, nextExecution]
      );
    }

    this.logger.log(`${this.DEFAULT_POLICIES.length} retention policies initialized`);
  }

  async executeRetentionPolicy(policyId: string): Promise<ArchiveJob> {
    this.logger.log(`Executing retention policy: ${policyId}`);

    const policyResult = await this.db.execute(
      `SELECT * FROM data_retention_policies WHERE id = $1`,
      [policyId]
    );

    if (policyResult.rows.length === 0) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const policy = policyResult.rows[0];
    const jobId = `job_${Date.now()}`;

    const job: ArchiveJob = {
      id: jobId,
      policyId,
      startTime: new Date(),
      status: 'running',
      recordsProcessed: 0,
      recordsArchived: 0,
      recordsDeleted: 0,
      errors: 0,
    };

    await this.db.execute(
      `INSERT INTO archive_jobs (id, policy_id, start_time, status)
       VALUES ($1, $2, $3, 'running')`,
      [jobId, policyId, job.startTime]
    );

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - policy.retention_period_days);

      if (policy.archive_before_delete) {
        job.recordsArchived = await this.archiveRecords(
          policy.table_name,
          `${policy.table_name}_archive`,
          cutoffDate
        );
      }

      job.recordsDeleted = await this.deleteRecords(policy.table_name, cutoffDate);
      job.recordsProcessed = job.recordsArchived + job.recordsDeleted;

      job.status = 'completed';
      job.endTime = new Date();

      await this.db.execute(
        `UPDATE archive_jobs SET 
         end_time = $2,
         status = 'completed',
         records_processed = $3,
         records_archived = $4,
         records_deleted = $5
         WHERE id = $1`,
        [jobId, job.endTime, job.recordsProcessed, job.recordsArchived, job.recordsDeleted]
      );

      await this.db.execute(
        `UPDATE data_retention_policies SET 
         last_executed = $2,
         next_execution = $2 + INTERVAL '1 day'
         WHERE id = $1`,
        [policyId, job.startTime]
      );

      this.logger.log(`Retention policy executed: ${job.recordsProcessed} records processed`);

    } catch (error) {
      job.status = 'failed';
      job.errors++;

      await this.db.execute(
        `UPDATE archive_jobs SET status = 'failed', errors = $2 WHERE id = $1`,
        [jobId, job.errors]
      );

      this.logger.error(`Retention policy failed:`, error);
      throw error;
    }

    return job;
  }

  private async archiveRecords(sourceTable: string, archiveTable: string, cutoffDate: Date): Promise<number> {
    this.logger.log(`Archiving records from ${sourceTable} older than ${cutoffDate.toISOString()}`);

    await this.db.execute(
      `CREATE TABLE IF NOT EXISTS ${archiveTable} (LIKE ${sourceTable} INCLUDING ALL)`
    );

    const result = await this.db.execute(
      `INSERT INTO ${archiveTable} 
       SELECT * FROM ${sourceTable} 
       WHERE created_at < $1`,
      [cutoffDate]
    );

    return result.rowCount || 0;
  }

  private async deleteRecords(tableName: string, cutoffDate: Date): Promise<number> {
    this.logger.log(`Deleting records from ${tableName} older than ${cutoffDate.toISOString()}`);

    const result = await this.db.execute(
      `DELETE FROM ${tableName} WHERE created_at < $1`,
      [cutoffDate]
    );

    return result.rowCount || 0;
  }

  async executeAllPolicies(): Promise<ArchiveJob[]> {
    const policies = await this.db.execute(
      `SELECT * FROM data_retention_policies 
       WHERE is_active = true AND next_execution <= NOW()`
    );

    const jobs: ArchiveJob[] = [];

    for (const policy of policies.rows) {
      try {
        const job = await this.executeRetentionPolicy(policy.id);
        jobs.push(job);
      } catch (error) {
        this.logger.error(`Policy execution failed for ${policy.id}:`, error);
      }
    }

    return jobs;
  }

  async createRetentionReport(): Promise<any> {
    const policies = await this.db.execute(
      `SELECT 
        p.data_type,
        p.retention_period_days,
        p.legal_basis,
        p.last_executed,
        COUNT(j.id) as job_count,
        SUM(j.records_archived) as total_archived,
        SUM(j.records_deleted) as total_deleted
       FROM data_retention_policies p
       LEFT JOIN archive_jobs j ON p.id = j.policy_id
       GROUP BY p.id, p.data_type, p.retention_period_days, p.legal_basis, p.last_executed
       ORDER BY p.data_type`
    );

    const totalArchived = policies.rows.reduce((sum, r) => sum + parseInt(r.total_archived || '0'), 0);
    const totalDeleted = policies.rows.reduce((sum, r) => sum + parseInt(r.total_deleted || '0'), 0);

    return {
      generatedAt: new Date(),
      policies: policies.rows,
      summary: {
        totalPolicies: policies.rows.length,
        totalArchived,
        totalDeleted,
        totalProcessed: totalArchived + totalDeleted,
      },
    };
  }

  async getLegalHoldStatus(dataType: string): Promise<boolean> {
    const result = await this.db.execute(
      `SELECT COUNT(*) as count FROM legal_holds 
       WHERE data_type = $1 AND is_active = true AND expires_at > NOW()`,
      [dataType]
    );

    return parseInt(result.rows[0].count) > 0;
  }

  async createLegalHold(
    dataType: string,
    reason: string,
    requestedBy: string,
    expiresAt?: Date,
  ): Promise<void> {
    await this.db.execute(
      `INSERT INTO legal_holds (data_type, reason, requested_by, is_active, expires_at, created_at)
       VALUES ($1, $2, $3, true, $4, NOW())`,
      [dataType, reason, requestedBy, expiresAt]
    );

    await this.db.execute(
      `UPDATE data_retention_policies SET is_active = false WHERE data_type = $1`,
      [dataType]
    );

    this.logger.warn(`Legal hold placed on ${dataType}: ${reason}`);
  }

  async releaseLegalHold(holdId: string, releasedBy: string): Promise<void> {
    const hold = await this.db.execute(
      `SELECT * FROM legal_holds WHERE id = $1`,
      [holdId]
    );

    if (hold.rows.length === 0) {
      throw new Error(`Legal hold not found: ${holdId}`);
    }

    await this.db.execute(
      `UPDATE legal_holds SET is_active = false, released_at = NOW(), released_by = $2 WHERE id = $1`,
      [holdId, releasedBy]
    );

    await this.db.execute(
      `UPDATE data_retention_policies SET is_active = true WHERE data_type = $1`,
      [hold.rows[0].data_type]
    );

    this.logger.log(`Legal hold released: ${holdId}`);
  }

  async getDataInventory(): Promise<any[]> {
    const tableSchemas = [
      { name: 'users', schema: users },
      { name: 'customers', schema: customers },
      { name: 'orders', schema: orders },
      { name: 'invoices', schema: invoices },
      { name: 'vehicles', schema: vehicles },
      { name: 'drivers', schema: drivers },
      { name: 'inventory', schema: inventory },
      { name: 'audit_logs', schema: auditLogs },
      { name: 'employees', schema: employees }
    ];

    const inventory = await Promise.all(
      tableSchemas.map(async ({ name, schema }) => {
        const countResult = await this.db.execute(`SELECT COUNT(*) as count FROM ${name}`);
        const sizeResult = await this.db.execute(
          `SELECT pg_total_relation_size($1) as size`,
          [name]
        );

        const oldestResult = await this.db.execute(
          `SELECT MIN(created_at) as oldest FROM ${name}`
        );

        return {
          table: name,
          recordCount: parseInt(countResult.rows[0].count),
          sizeBytes: parseInt(sizeResult.rows[0].size),
          oldestRecord: oldestResult.rows[0]?.oldest,
        };
      })
    );

    return inventory.sort((a, b) => b.sizeBytes - a.sizeBytes);
  }

  async compressOldData(tableName: string, monthsOld: number): Promise<void> {
    this.logger.log(`Compressing data in ${tableName} older than ${monthsOld} months`);

    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsOld);

    await this.db.execute(
      `CREATE TABLE IF NOT EXISTS ${tableName}_compressed (LIKE ${tableName})
       WITH (toast_compression = lz4)`
    );

    await this.db.execute(
      `INSERT INTO ${tableName}_compressed 
       SELECT * FROM ${tableName} WHERE created_at < $1`,
      [cutoffDate]
    );

    await this.db.execute(
      `DELETE FROM ${tableName} WHERE created_at < $1`,
      [cutoffDate]
    );

    this.logger.log(`Compression completed for ${tableName}`);
  }
}

