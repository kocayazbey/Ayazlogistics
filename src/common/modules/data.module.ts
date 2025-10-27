import { Module } from '@nestjs/common';
import { DeterministicSeedService } from '../services/deterministic-seed.service';
import { PostgresRlsService } from '../services/postgres-rls.service';
import { DataQualityLineageService } from '../services/data-quality-lineage.service';
import { FieldLevelEncryptionService } from '../services/field-level-encryption.service';
import { BackupRotationService } from '../services/backup-rotation.service';
import { PostgresRlsController } from '../controllers/postgres-rls.controller';
import { DataQualityLineageController } from '../controllers/data-quality-lineage.controller';
import { FieldLevelEncryptionController } from '../controllers/field-level-encryption.controller';

@Module({
  providers: [
    DeterministicSeedService,
    PostgresRlsService,
    DataQualityLineageService,
    FieldLevelEncryptionService,
    BackupRotationService,
  ],
  controllers: [
    PostgresRlsController,
    DataQualityLineageController,
    FieldLevelEncryptionController,
  ],
  exports: [
    DeterministicSeedService,
    PostgresRlsService,
    DataQualityLineageService,
    FieldLevelEncryptionService,
    BackupRotationService,
  ],
})
export class DataModule {}
