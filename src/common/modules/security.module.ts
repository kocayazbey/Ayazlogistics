import { Module } from '@nestjs/common';
import { TenantIsolationMandatoryGuard } from '../guards/tenant-isolation-mandatory.guard';
import { RateLimitStrictGuard } from '../guards/rate-limit-strict.guard';
import { OwaspCrsMiddleware } from '../middleware/owasp-crs.middleware';
import { CspMiddleware } from '../middleware/csp.middleware';
import { AuditPiiRedactionInterceptor } from '../interceptors/audit-pii-redaction.interceptor';
import {
  SecurityMiddleware,
  RequestSizeLimitMiddleware,
  DdosProtectionMiddleware,
  InputSanitizationMiddleware
} from '../middleware/security.middleware';
import { AuditSecureStorageService } from '../services/audit-secure-storage.service';
import { FieldLevelEncryptionService } from '../services/field-level-encryption.service';
import { BackupEncryptionService } from '../services/backup-encryption.service';
import { KeyRotationService } from '../services/key-rotation.service';
import { SecurityAuditService } from '../../core/security/security-audit.service';
import { CspReportController } from '../controllers/csp-report.controller';

@Module({
  providers: [
    TenantIsolationMandatoryGuard,
    RateLimitStrictGuard,
    OwaspCrsMiddleware,
    CspMiddleware,
    SecurityMiddleware,
    RequestSizeLimitMiddleware,
    DdosProtectionMiddleware,
    InputSanitizationMiddleware,
    AuditPiiRedactionInterceptor,
    AuditSecureStorageService,
    FieldLevelEncryptionService,
    BackupEncryptionService,
    KeyRotationService,
    SecurityAuditService,
  ],
  controllers: [CspReportController],
  exports: [
    TenantIsolationMandatoryGuard,
    RateLimitStrictGuard,
    OwaspCrsMiddleware,
    CspMiddleware,
    SecurityMiddleware,
    RequestSizeLimitMiddleware,
    DdosProtectionMiddleware,
    InputSanitizationMiddleware,
    AuditPiiRedactionInterceptor,
    AuditSecureStorageService,
    FieldLevelEncryptionService,
    BackupEncryptionService,
    KeyRotationService,
    SecurityAuditService,
  ],
})
export class SecurityModule {}
