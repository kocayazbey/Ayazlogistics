import { Injectable, Logger } from '@nestjs/common';
import * as AWS from 'aws-sdk';
import * as parquet from 'parquetjs';
import * as fs from 'fs';

interface DataLakeZone {
  name: 'raw' | 'processed' | 'curated' | 'archive';
  bucket: string;
  path: string;
}

interface DataIngestion {
  source: string;
  destination: DataLakeZone;
  format: 'json' | 'csv' | 'parquet' | 'avro';
  partitionBy?: string[];
  schema?: any;
}

interface DataCatalogEntry {
  id: string;
  name: string;
  zone: string;
  location: string;
  schema: any;
  format: string;
  size: number;
  recordCount?: number;
  createdAt: Date;
  lastModified: Date;
  metadata: Record<string, any>;
}

@Injectable()
export class DataLakeService {
  private readonly logger = new Logger(DataLakeService.name);
  private s3: AWS.S3;
  private glue: AWS.Glue;
  private athena: AWS.Athena;

  constructor() {
    this.s3 = new AWS.S3({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });

    this.glue = new AWS.Glue({ region: process.env.AWS_REGION });
    this.athena = new AWS.Athena({ region: process.env.AWS_REGION });
  }

  async ingestData(ingestion: DataIngestion, data: any[]): Promise<string> {
    this.logger.log(`Ingesting ${data.length} records to ${ingestion.destination.name} zone`);

    const timestamp = new Date().toISOString();
    const partitionPath = this.buildPartitionPath(timestamp, ingestion.partitionBy);
    const key = `${ingestion.destination.path}/${partitionPath}/data_${Date.now()}.${ingestion.format}`;

    let fileBuffer: Buffer;

    switch (ingestion.format) {
      case 'json':
        fileBuffer = Buffer.from(JSON.stringify(data, null, 2));
        break;
      case 'parquet':
        fileBuffer = await this.convertToParquet(data, ingestion.schema);
        break;
      case 'csv':
        fileBuffer = this.convertToCSV(data);
        break;
      default:
        throw new Error(`Unsupported format: ${ingestion.format}`);
    }

    await this.s3.putObject({
      Bucket: ingestion.destination.bucket,
      Key: key,
      Body: fileBuffer,
      Metadata: {
        source: ingestion.source,
        recordCount: data.length.toString(),
        ingestedAt: timestamp,
      },
    }).promise();

    this.logger.log(`Data ingested to s3://${ingestion.destination.bucket}/${key}`);
    
    await this.updateDataCatalog({
      id: key,
      name: ingestion.source,
      zone: ingestion.destination.name,
      location: `s3://${ingestion.destination.bucket}/${key}`,
      schema: ingestion.schema || {},
      format: ingestion.format,
      size: fileBuffer.length,
      recordCount: data.length,
      createdAt: new Date(),
      lastModified: new Date(),
      metadata: {},
    });

    return key;
  }

  private buildPartitionPath(timestamp: string, partitionBy?: string[]): string {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `year=${year}/month=${month}/day=${day}`;
  }

  private async convertToParquet(data: any[], schema: any): Promise<Buffer> {
    const tempFile = `/tmp/data_${Date.now()}.parquet`;
    
    const writer = await parquet.ParquetWriter.openFile(schema, tempFile);
    
    for (const record of data) {
      await writer.appendRow(record);
    }
    
    await writer.close();
    
    const buffer = fs.readFileSync(tempFile);
    fs.unlinkSync(tempFile);
    
    return buffer;
  }

  private convertToCSV(data: any[]): Buffer {
    if (data.length === 0) return Buffer.from('');

    const headers = Object.keys(data[0]);
    const rows = data.map(row => headers.map(h => JSON.stringify(row[h])).join(','));
    const csv = [headers.join(','), ...rows].join('\n');

    return Buffer.from(csv);
  }

  async queryDataLake(query: string, outputLocation: string): Promise<any[]> {
    this.logger.log('Running Athena query on data lake');

    const params = {
      QueryString: query,
      ResultConfiguration: {
        OutputLocation: outputLocation,
      },
      QueryExecutionContext: {
        Database: process.env.ATHENA_DATABASE || 'ayazlogistics',
      },
    };

    const execution = await this.athena.startQueryExecution(params).promise();
    const queryExecutionId = execution.QueryExecutionId!;

    let status = 'RUNNING';
    while (status === 'RUNNING' || status === 'QUEUED') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const statusResult = await this.athena.getQueryExecution({ QueryExecutionId: queryExecutionId }).promise();
      status = statusResult.QueryExecution!.Status!.State!;
    }

    if (status === 'SUCCEEDED') {
      const results = await this.athena.getQueryResults({ QueryExecutionId: queryExecutionId }).promise();
      return results.ResultSet!.Rows!.map(row => 
        row.Data!.reduce((obj, data, idx) => {
          const columnName = results.ResultSet!.Rows![0].Data![idx].VarCharValue || `col_${idx}`;
          obj[columnName] = data.VarCharValue;
          return obj;
        }, {} as any)
      ).slice(1);
    }

    throw new Error(`Query failed with status: ${status}`);
  }

  private async updateDataCatalog(entry: DataCatalogEntry): Promise<void> {
    const tableName = entry.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();

    await this.glue.createTable({
      DatabaseName: process.env.GLUE_DATABASE || 'ayazlogistics',
      TableInput: {
        Name: tableName,
        StorageDescriptor: {
          Location: entry.location,
          InputFormat: this.getInputFormat(entry.format),
          OutputFormat: this.getOutputFormat(entry.format),
          SerdeInfo: {
            SerializationLibrary: this.getSerdeLibrary(entry.format),
          },
          Columns: this.schemaToGlueColumns(entry.schema),
        },
        PartitionKeys: [
          { Name: 'year', Type: 'string' },
          { Name: 'month', Type: 'string' },
          { Name: 'day', Type: 'string' },
        ],
      },
    }).promise().catch(err => {
      if (err.code !== 'AlreadyExistsException') throw err;
    });

    this.logger.log(`Data catalog updated: ${tableName}`);
  }

  private getInputFormat(format: string): string {
    const formats: Record<string, string> = {
      json: 'org.apache.hadoop.mapred.TextInputFormat',
      parquet: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetInputFormat',
      csv: 'org.apache.hadoop.mapred.TextInputFormat',
    };
    return formats[format] || formats.json;
  }

  private getOutputFormat(format: string): string {
    const formats: Record<string, string> = {
      json: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
      parquet: 'org.apache.hadoop.hive.ql.io.parquet.MapredParquetOutputFormat',
      csv: 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat',
    };
    return formats[format] || formats.json;
  }

  private getSerdeLibrary(format: string): string {
    const libraries: Record<string, string> = {
      json: 'org.openx.data.jsonserde.JsonSerDe',
      parquet: 'org.apache.hadoop.hive.ql.io.parquet.serde.ParquetHiveSerDe',
      csv: 'org.apache.hadoop.hive.serde2.lazy.LazySimpleSerDe',
    };
    return libraries[format] || libraries.json;
  }

  private schemaToGlueColumns(schema: any): any[] {
    if (!schema || Object.keys(schema).length === 0) {
      return [{ Name: 'data', Type: 'string' }];
    }

    return Object.entries(schema).map(([name, type]) => ({
      Name: name,
      Type: this.mapTypeToGlue(type as string),
    }));
  }

  private mapTypeToGlue(type: string): string {
    const mapping: Record<string, string> = {
      string: 'string',
      number: 'double',
      integer: 'bigint',
      boolean: 'boolean',
      date: 'timestamp',
      array: 'array<string>',
      object: 'struct<>',
    };
    return mapping[type] || 'string';
  }

  async compactSmallFiles(zone: DataLakeZone, partitionPath: string): Promise<void> {
    this.logger.log(`Compacting small files in ${partitionPath}`);

    const objects = await this.s3.listObjectsV2({
      Bucket: zone.bucket,
      Prefix: `${zone.path}/${partitionPath}`,
    }).promise();

    const files = objects.Contents || [];
    
    if (files.length <= 1) return;

    const allData: any[] = [];
    
    for (const file of files) {
      const obj = await this.s3.getObject({
        Bucket: zone.bucket,
        Key: file.Key!,
      }).promise();

      const data = JSON.parse(obj.Body!.toString());
      allData.push(...(Array.isArray(data) ? data : [data]));
    }

    const compactedKey = `${zone.path}/${partitionPath}/compacted_${Date.now()}.json`;
    await this.s3.putObject({
      Bucket: zone.bucket,
      Key: compactedKey,
      Body: JSON.stringify(allData),
    }).promise();

    for (const file of files) {
      await this.s3.deleteObject({
        Bucket: zone.bucket,
        Key: file.Key!,
      }).promise();
    }

    this.logger.log(`Compacted ${files.length} files into 1`);
  }

  async createCrawler(name: string, databaseName: string, s3Path: string): Promise<void> {
    await this.glue.createCrawler({
      Name: name,
      Role: process.env.GLUE_CRAWLER_ROLE || '',
      DatabaseName: databaseName,
      Targets: {
        S3Targets: [{ Path: s3Path }],
      },
      Schedule: 'cron(0 1 * * ? *)',
    }).promise().catch(err => {
      if (err.code !== 'AlreadyExistsException') throw err;
    });

    this.logger.log(`Glue crawler created: ${name}`);
  }

  async runCrawler(name: string): Promise<void> {
    await this.glue.startCrawler({ Name: name }).promise();
    this.logger.log(`Crawler started: ${name}`);
  }
}

