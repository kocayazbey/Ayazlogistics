import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

interface DimensionTable {
  name: string;
  columns: Array<{ name: string; type: string }>;
  primaryKey: string;
}

interface FactTable {
  name: string;
  measures: Array<{ name: string; aggregation: 'sum' | 'avg' | 'count' | 'min' | 'max' }>;
  dimensions: string[];
  grainLevel: string;
}

interface OLAPCube {
  name: string;
  dimensions: string[];
  measures: string[];
  hierarchies: Record<string, string[]>;
}

interface DataMartSchema {
  subject: string;
  factTables: FactTable[];
  dimensionTables: DimensionTable[];
  cubes: OLAPCube[];
}

@Injectable()
export class DataWarehouseService {
  private readonly logger = new Logger(DataWarehouseService.name);

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {}

  async createStarSchema(schema: DataMartSchema): Promise<void> {
    this.logger.log(`Creating star schema for ${schema.subject}`);

    for (const dimension of schema.dimensionTables) {
      await this.createDimensionTable(dimension);
    }

    for (const fact of schema.factTables) {
      await this.createFactTable(fact);
    }

    this.logger.log(`Star schema created for ${schema.subject}`);
  }

  private async createDimensionTable(dimension: DimensionTable): Promise<void> {
    const columnDefs = dimension.columns.map(col => `${col.name} ${col.type}`).join(', ');
    const sql = `
      CREATE TABLE IF NOT EXISTS dim_${dimension.name} (
        ${dimension.primaryKey} SERIAL PRIMARY KEY,
        ${columnDefs},
        valid_from TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        valid_to TIMESTAMP,
        is_current BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.db.execute(sql);
    await this.db.execute(`CREATE INDEX idx_dim_${dimension.name}_current ON dim_${dimension.name}(is_current) WHERE is_current = true`);
    
    this.logger.debug(`Dimension table created: dim_${dimension.name}`);
  }

  private async createFactTable(fact: FactTable): Promise<void> {
    const measureCols = fact.measures.map(m => `${m.name} DECIMAL(18,2)`).join(', ');
    const dimensionFKs = fact.dimensions.map(d => `${d}_key INTEGER REFERENCES dim_${d}(${d}_key)`).join(', ');

    const sql = `
      CREATE TABLE IF NOT EXISTS fact_${fact.name} (
        fact_key SERIAL PRIMARY KEY,
        ${dimensionFKs},
        ${measureCols},
        transaction_date DATE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      ) PARTITION BY RANGE (transaction_date)
    `;

    await this.db.execute(sql);
    
    for (const dim of fact.dimensions) {
      await this.db.execute(`CREATE INDEX idx_fact_${fact.name}_${dim} ON fact_${fact.name}(${dim}_key)`);
    }

    await this.db.execute(`CREATE INDEX idx_fact_${fact.name}_date ON fact_${fact.name}(transaction_date)`);
    
    this.logger.debug(`Fact table created: fact_${fact.name}`);
  }

  async runETLProcess(sourceTables: string[], targetFactTable: string): Promise<{ processed: number; errors: number }> {
    this.logger.log(`Starting ETL process: ${sourceTables.join(', ')} -> ${targetFactTable}`);

    const startTime = Date.now();
    let processed = 0;
    let errors = 0;

    try {
      await this.db.execute('BEGIN');

      for (const sourceTable of sourceTables) {
        const extractResult = await this.extractData(sourceTable);
        const transformedData = await this.transformData(extractResult);
        const loadResult = await this.loadData(targetFactTable, transformedData);
        
        processed += loadResult.count;
        errors += loadResult.errors;
      }

      await this.db.execute('COMMIT');
      
      const duration = Date.now() - startTime;
      this.logger.log(`ETL completed: ${processed} records in ${duration}ms`);

      await this.updateETLMetadata(targetFactTable, processed, errors, duration);
    } catch (error) {
      await this.db.execute('ROLLBACK');
      this.logger.error('ETL process failed:', error);
      throw error;
    }

    return { processed, errors };
  }

  private async extractData(sourceTable: string): Promise<any[]> {
    const result = await this.db.execute(`SELECT * FROM ${sourceTable} WHERE processed_at IS NULL LIMIT 10000`);
    return result.rows;
  }

  private async transformData(rawData: any[]): Promise<any[]> {
    return rawData.map(row => ({
      ...row,
      transformed_at: new Date(),
    }));
  }

  private async loadData(targetTable: string, data: any[]): Promise<{ count: number; errors: number }> {
    let count = 0;
    let errors = 0;

    for (const row of data) {
      try {
        await this.db.execute(
          `INSERT INTO ${targetTable} (data) VALUES ($1)`,
          [JSON.stringify(row)]
        );
        count++;
      } catch (error) {
        errors++;
        this.logger.error('Load failed for row:', error);
      }
    }

    return { count, errors };
  }

  private async updateETLMetadata(tableName: string, processed: number, errors: number, duration: number): Promise<void> {
    await this.db.execute(
      `INSERT INTO etl_runs (table_name, records_processed, errors, duration_ms, run_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [tableName, processed, errors, duration]
    );
  }

  async createAggregation(
    factTable: string,
    dimensions: string[],
    measures: Array<{ name: string; aggregation: string }>,
  ): Promise<any[]> {
    const dimensionCols = dimensions.join(', ');
    const measureCols = measures.map(m => `${m.aggregation}(${m.name}) AS ${m.name}_${m.aggregation}`).join(', ');

    const sql = `
      SELECT ${dimensionCols}, ${measureCols}
      FROM ${factTable}
      GROUP BY ${dimensionCols}
      ORDER BY ${dimensions[0]}
    `;

    const result = await this.db.execute(sql);
    return result.rows;
  }

  async createMaterializedView(viewName: string, query: string, refreshInterval: string = '1 hour'): Promise<void> {
    await this.db.execute(`CREATE MATERIALIZED VIEW IF NOT EXISTS ${viewName} AS ${query}`);
    await this.db.execute(`CREATE UNIQUE INDEX idx_${viewName}_refresh ON ${viewName}(1)`);
    
    this.logger.log(`Materialized view created: ${viewName}`);
  }

  async refreshMaterializedView(viewName: string, concurrent: boolean = true): Promise<void> {
    const concurrentClause = concurrent ? 'CONCURRENTLY' : '';
    await this.db.execute(`REFRESH MATERIALIZED VIEW ${concurrentClause} ${viewName}`);
    this.logger.log(`Materialized view refreshed: ${viewName}`);
  }

  async queryOLAPCube(
    cube: OLAPCube,
    dimensions: string[],
    measures: string[],
    filters?: Record<string, any>,
  ): Promise<any[]> {
    this.logger.log(`Querying OLAP cube: ${cube.name}`);

    const dimensionCols = dimensions.join(', ');
    const measureCols = measures.map(m => `SUM(${m}) AS total_${m}`).join(', ');
    
    let whereClause = '';
    if (filters && Object.keys(filters).length > 0) {
      whereClause = 'WHERE ' + Object.entries(filters).map(([k, v]) => `${k} = '${v}'`).join(' AND ');
    }

    const sql = `
      SELECT ${dimensionCols}, ${measureCols}
      FROM fact_${cube.name}
      ${whereClause}
      GROUP BY CUBE(${dimensionCols})
      ORDER BY ${dimensions[0]}
    `;

    const result = await this.db.execute(sql);
    return result.rows;
  }

  async createPartitionedFactTable(
    tableName: string,
    startDate: Date,
    endDate: Date,
    partitionInterval: 'month' | 'quarter' | 'year' = 'month',
  ): Promise<void> {
    const current = new Date(startDate);
    
    while (current <= endDate) {
      const partitionName = this.getPartitionName(tableName, current, partitionInterval);
      const { rangeStart, rangeEnd } = this.getPartitionRange(current, partitionInterval);

      const sql = `
        CREATE TABLE IF NOT EXISTS ${partitionName}
        PARTITION OF ${tableName}
        FOR VALUES FROM ('${rangeStart.toISOString().split('T')[0]}') TO ('${rangeEnd.toISOString().split('T')[0]}')
      `;

      await this.db.execute(sql);
      this.logger.debug(`Partition created: ${partitionName}`);

      this.advanceDate(current, partitionInterval);
    }
  }

  private getPartitionName(tableName: string, date: Date, interval: string): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const quarter = Math.ceil((date.getMonth() + 1) / 3);

    switch (interval) {
      case 'month':
        return `${tableName}_${year}_${month}`;
      case 'quarter':
        return `${tableName}_${year}_q${quarter}`;
      case 'year':
        return `${tableName}_${year}`;
      default:
        return `${tableName}_${year}_${month}`;
    }
  }

  private getPartitionRange(date: Date, interval: string): { rangeStart: Date; rangeEnd: Date } {
    const rangeStart = new Date(date);
    const rangeEnd = new Date(date);

    switch (interval) {
      case 'month':
        rangeEnd.setMonth(rangeEnd.getMonth() + 1);
        break;
      case 'quarter':
        rangeEnd.setMonth(rangeEnd.getMonth() + 3);
        break;
      case 'year':
        rangeEnd.setFullYear(rangeEnd.getFullYear() + 1);
        break;
    }

    return { rangeStart, rangeEnd };
  }

  private advanceDate(date: Date, interval: string): void {
    switch (interval) {
      case 'month':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarter':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
  }

  async createSlowlyChangingDimension(
    dimensionTable: string,
    record: any,
    type: 'SCD1' | 'SCD2' | 'SCD3' = 'SCD2',
  ): Promise<void> {
    switch (type) {
      case 'SCD1':
        await this.handleSCD1(dimensionTable, record);
        break;
      case 'SCD2':
        await this.handleSCD2(dimensionTable, record);
        break;
      case 'SCD3':
        await this.handleSCD3(dimensionTable, record);
        break;
    }
  }

  private async handleSCD1(table: string, record: any): Promise<void> {
    await this.db.execute(
      `UPDATE ${table} SET ${Object.entries(record).map(([k, v]) => `${k} = '${v}'`).join(', ')}, updated_at = NOW()
       WHERE ${Object.keys(record)[0]} = '${Object.values(record)[0]}'`
    );
  }

  private async handleSCD2(table: string, record: any): Promise<void> {
    await this.db.execute(
      `UPDATE ${table} SET is_current = false, valid_to = NOW()
       WHERE natural_key = $1 AND is_current = true`,
      [record.natural_key]
    );

    await this.db.execute(
      `INSERT INTO ${table} (${Object.keys(record).join(', ')}, is_current, valid_from)
       VALUES (${Object.keys(record).map((_, i) => `$${i + 1}`).join(', ')}, true, NOW())`,
      Object.values(record)
    );
  }

  private async handleSCD3(table: string, record: any): Promise<void> {
    const updateCols = Object.entries(record).map(([k, v]) => `${k}_current = '${v}', ${k}_previous = ${k}_current`).join(', ');
    await this.db.execute(`UPDATE ${table} SET ${updateCols}, updated_at = NOW()`);
  }

  async generateDataMartReport(
    subject: string,
    metrics: string[],
    dimensions: string[],
    dateRange: { start: Date; end: Date },
    filters?: Record<string, any>,
  ): Promise<any[]> {
    this.logger.log(`Generating report for ${subject}`);

    const metricCols = metrics.map(m => `SUM(f.${m}) AS total_${m}`).join(', ');
    const dimensionCols = dimensions.map(d => `d_${d}.name AS ${d}`).join(', ');
    const joins = dimensions.map(d => `LEFT JOIN dim_${d} d_${d} ON f.${d}_key = d_${d}.${d}_key`).join(' ');
    
    let whereClause = `WHERE f.transaction_date BETWEEN '${dateRange.start.toISOString().split('T')[0]}' AND '${dateRange.end.toISOString().split('T')[0]}'`;
    
    if (filters) {
      const filterClauses = Object.entries(filters).map(([k, v]) => `d_${k}.${k} = '${v}'`);
      whereClause += ' AND ' + filterClauses.join(' AND ');
    }

    const sql = `
      SELECT ${dimensionCols}, ${metricCols}
      FROM fact_${subject} f
      ${joins}
      ${whereClause}
      GROUP BY ${dimensions.map((d, i) => i + 1).join(', ')}
      ORDER BY ${dimensions[0]}
    `;

    const result = await this.db.execute(sql);
    return result.rows;
  }

  async createBitmapIndex(tableName: string, columnName: string): Promise<void> {
    await this.db.execute(`CREATE INDEX idx_bitmap_${tableName}_${columnName} ON ${tableName} USING btree(${columnName})`);
    this.logger.log(`Bitmap index created on ${tableName}.${columnName}`);
  }

  async analyzeQueryPerformance(query: string): Promise<any> {
    const explainResult = await this.db.execute(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query}`);
    return explainResult.rows[0]['QUERY PLAN'][0];
  }

  async createColumnStoreTable(tableName: string, columns: Array<{ name: string; type: string }>): Promise<void> {
    const columnDefs = columns.map(col => `${col.name} ${col.type}`).join(', ');
    
    const sql = `
      CREATE TABLE ${tableName} (
        ${columnDefs}
      ) WITH (orientation = column, compression = yes)
    `;

    await this.db.execute(sql);
    this.logger.log(`Column-oriented table created: ${tableName}`);
  }

  async scheduleETLJob(
    jobName: string,
    schedule: string,
    sourceQuery: string,
    targetTable: string,
  ): Promise<void> {
    await this.db.execute(
      `INSERT INTO etl_schedules (job_name, schedule, source_query, target_table, is_active)
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT (job_name) DO UPDATE SET schedule = $2, source_query = $3, target_table = $4`,
      [jobName, schedule, sourceQuery, targetTable]
    );

    this.logger.log(`ETL job scheduled: ${jobName} (${schedule})`);
  }

  async runScheduledETLJobs(): Promise<void> {
    const jobs = await this.db.execute(
      `SELECT * FROM etl_schedules WHERE is_active = true AND next_run <= NOW()`
    );

    for (const job of jobs.rows) {
      try {
        await this.runETLProcess([job.source_query], job.target_table);
        
        await this.db.execute(
          `UPDATE etl_schedules SET 
           last_run = NOW(),
           next_run = NOW() + INTERVAL '${job.schedule}',
           last_status = 'success'
           WHERE job_name = $1`,
          [job.job_name]
        );
      } catch (error) {
        await this.db.execute(
          `UPDATE etl_schedules SET last_status = 'failed', last_error = $2 WHERE job_name = $1`,
          [job.job_name, error.message]
        );
      }
    }
  }

  async createDataQualityChecks(tableName: string): Promise<any> {
    const checks = {
      totalRecords: 0,
      nullValues: {} as Record<string, number>,
      duplicates: 0,
      outliers: [] as any[],
      dataFreshness: null as Date | null,
    };

    const countResult = await this.db.execute(`SELECT COUNT(*) as count FROM ${tableName}`);
    checks.totalRecords = parseInt(countResult.rows[0].count);

    const columnsResult = await this.db.execute(
      `SELECT column_name FROM information_schema.columns WHERE table_name = $1`,
      [tableName]
    );

    for (const col of columnsResult.rows) {
      const nullResult = await this.db.execute(
        `SELECT COUNT(*) as count FROM ${tableName} WHERE ${col.column_name} IS NULL`
      );
      checks.nullValues[col.column_name] = parseInt(nullResult.rows[0].count);
    }

    const freshnessResult = await this.db.execute(`SELECT MAX(created_at) as latest FROM ${tableName}`);
    checks.dataFreshness = freshnessResult.rows[0]?.latest;

    this.logger.log(`Data quality checks completed for ${tableName}`);
    return checks;
  }

  async archiveOldData(tableName: string, retentionDays: number, archiveTable: string): Promise<number> {
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

    await this.db.execute(
      `INSERT INTO ${archiveTable} SELECT * FROM ${tableName} WHERE transaction_date < $1`,
      [cutoffDate]
    );

    const deleteResult = await this.db.execute(
      `DELETE FROM ${tableName} WHERE transaction_date < $1`,
      [cutoffDate]
    );

    this.logger.log(`Archived ${deleteResult.rowCount} records from ${tableName}`);
    return deleteResult.rowCount || 0;
  }
}

