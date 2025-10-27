import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '@/database/drizzle.module';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as AWS from 'aws-sdk';
import * as fs from 'fs';
import { exec } from 'child_process';
import * as util from 'util';

const execPromise = util.promisify(exec);

interface BackupMetadata {
  id: string;
  timestamp: Date;
  size: number;
  type: 'full' | 'incremental';
  location: string;
  checksum: string;
  status: 'completed' | 'failed' | 'in_progress';
}

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private s3: AWS.S3;

  constructor(@Inject(DRIZZLE_ORM) private readonly db: PostgresJsDatabase) {
    this.s3 = new AWS.S3({
      region: process.env.AWS_REGION,
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    });
  }

  async createBackup(type: 'full' | 'incremental' = 'full'): Promise<BackupMetadata> {
    this.logger.log(`Creating ${type} backup...`);
    const timestamp = new Date();
    const backupId = `backup_${timestamp.getTime()}`;
    const filename = `${backupId}.sql`;

    try {
      const command = type === 'full'
        ? `pg_dump -h ${process.env.DATABASE_HOST} -U ${process.env.DATABASE_USERNAME} -d ${process.env.DATABASE_NAME} > ${filename}`
        : `pg_dump -h ${process.env.DATABASE_HOST} -U ${process.env.DATABASE_USERNAME} -d ${process.env.DATABASE_NAME} --format=custom > ${filename}`;

      await execPromise(command);

      const stats = fs.statSync(filename);
      const size = stats.size;

      const fileContent = fs.readFileSync(filename);
      await this.uploadToS3(filename, fileContent);

      fs.unlinkSync(filename);

      const metadata: BackupMetadata = {
        id: backupId,
        timestamp,
        size,
        type,
        location: `s3://${process.env.BACKUP_S3_BUCKET}/${filename}`,
        checksum: '',
        status: 'completed',
      };

      this.logger.log(`Backup created: ${backupId} (${(size / 1024 / 1024).toFixed(2)} MB)`);
      return metadata;
    } catch (error) {
      this.logger.error('Backup creation failed:', error);
      throw error;
    }
  }

  async restoreBackup(backupId: string): Promise<void> {
    this.logger.log(`Restoring backup: ${backupId}`);

    try {
      const filename = `${backupId}.sql`;
      const content = await this.downloadFromS3(filename);

      fs.writeFileSync(filename, content);

      const command = `psql -h ${process.env.DATABASE_HOST} -U ${process.env.DATABASE_USERNAME} -d ${process.env.DATABASE_NAME} < ${filename}`;
      await execPromise(command);

      fs.unlinkSync(filename);

      this.logger.log(`Backup restored successfully: ${backupId}`);
    } catch (error) {
      this.logger.error('Backup restore failed:', error);
      throw error;
    }
  }

  async listBackups(): Promise<BackupMetadata[]> {
    try {
      const response = await this.s3.listObjectsV2({
        Bucket: process.env.BACKUP_S3_BUCKET || '',
      }).promise();

      return (response.Contents || []).map(obj => ({
        id: obj.Key!.replace('.sql', ''),
        timestamp: obj.LastModified!,
        size: obj.Size!,
        type: 'full',
        location: `s3://${process.env.BACKUP_S3_BUCKET}/${obj.Key}`,
        checksum: obj.ETag!,
        status: 'completed' as const,
      }));
    } catch (error) {
      this.logger.error('Failed to list backups:', error);
      return [];
    }
  }

  private async uploadToS3(filename: string, content: Buffer): Promise<void> {
    await this.s3.putObject({
      Bucket: process.env.BACKUP_S3_BUCKET || '',
      Key: filename,
      Body: content,
    }).promise();
  }

  private async downloadFromS3(filename: string): Promise<Buffer> {
    const response = await this.s3.getObject({
      Bucket: process.env.BACKUP_S3_BUCKET || '',
      Key: filename,
    }).promise();

    return response.Body as Buffer;
  }

  async deleteOldBackups(retentionDays: number = 30): Promise<number> {
    const backups = await this.listBackups();
    const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    
    let deleted = 0;
    for (const backup of backups) {
      if (backup.timestamp < cutoffDate) {
        await this.s3.deleteObject({
          Bucket: process.env.BACKUP_S3_BUCKET || '',
          Key: `${backup.id}.sql`,
        }).promise();
        deleted++;
      }
    }

    this.logger.log(`Deleted ${deleted} old backups`);
    return deleted;
  }
}

