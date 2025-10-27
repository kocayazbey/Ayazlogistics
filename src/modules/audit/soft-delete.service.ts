import { Injectable, Logger, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../database/database.constants';
import { StandardizedDatabaseService } from '../../database/standardized-database.service';
import { softDeletes, dataBackups, users } from '../../database/schema/core/audit.schema';
import { eq, and, gte, desc } from 'drizzle-orm';

export interface SoftDeleteRequest {
  entityType: string;
  entityId: string;
  reason?: string;
  userId: string;
  ipAddress?: string;
  userAgent?: string;
}

export interface RestoreRequest {
  entityType: string;
  entityId: string;
  userId: string;
  ipAddress?: string;
}

export interface SoftDeleteRecord {
  id: string;
  entityType: string;
  entityId: string;
  entityData: any;
  deletedAt: Date;
  deletedBy: string;
  reason?: string;
  isRestored: boolean;
  retentionUntil: Date;
}

@Injectable()
export class SoftDeleteService {
  private readonly logger = new Logger(SoftDeleteService.name);

  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly dbService: StandardizedDatabaseService,
  ) {}

  private get db() {
    return this.dbService.getDb();
  }

  /**
   * Soft delete an entity with full audit trail
   */
  async softDeleteEntity(request: SoftDeleteRequest): Promise<SoftDeleteRecord> {
    try {
      this.logger.log(`Soft deleting ${request.entityType}:${request.entityId} by user ${request.userId}`);

      // Validate user permissions
      await this.validateDeletePermission(request.userId, request.entityType);

      // Get entity data before deletion
      const entityData = await this.getEntityData(request.entityType, request.entityId);
      if (!entityData) {
        throw new NotFoundException(`${request.entityType} not found`);
      }

      // Check if already soft deleted
      const existingSoftDelete = await this.db
        .select()
        .from(softDeletes)
        .where(
          and(
            eq(softDeletes.entityType, request.entityType),
            eq(softDeletes.entityId, request.entityId),
            eq(softDeletes.isRestored, false)
          )
        )
        .limit(1);

      if (existingSoftDelete.length > 0) {
        throw new BadRequestException(`${request.entityType} is already soft deleted`);
      }

      // Calculate retention date (7 years for GDPR compliance)
      const retentionUntil = new Date();
      retentionUntil.setFullYear(retentionUntil.getFullYear() + 7);

      // Insert soft delete record
      const [softDeleteRecord] = await this.db
        .insert(softDeletes)
        .values({
          tenantId: entityData.tenantId,
          userId: request.userId,
          entityType: request.entityType,
          entityId: request.entityId,
          entityData: entityData.data,
          deletedBy: request.userId,
          reason: request.reason,
          ipAddress: request.ipAddress,
          userAgent: request.userAgent,
          retentionUntil,
        })
        .returning();

      // Mark entity as soft deleted
      await this.markEntityAsDeleted(request.entityType, request.entityId, request.userId, request.reason, retentionUntil);

      // Create audit log
      await this.createAuditLog({
        action: 'SOFT_DELETE',
        entityType: request.entityType,
        entityId: request.entityId,
        userId: request.userId,
        details: {
          reason: request.reason,
          retentionUntil: retentionUntil.toISOString(),
        },
      });

      this.logger.log(`Soft delete completed: ${request.entityType}:${request.entityId}`);

      return {
        id: softDeleteRecord.id,
        entityType: softDeleteRecord.entityType,
        entityId: softDeleteRecord.entityId,
        entityData: softDeleteRecord.entityData,
        deletedAt: softDeleteRecord.deletedAt,
        deletedBy: softDeleteRecord.deletedBy,
        reason: softDeleteRecord.reason,
        isRestored: softDeleteRecord.isRestored,
        retentionUntil: softDeleteRecord.retentionUntil,
      };
    } catch (error) {
      this.logger.error(`Soft delete failed: ${request.entityType}:${request.entityId}`, error);
      throw error;
    }
  }

  /**
   * Restore a soft deleted entity
   */
  async restoreEntity(request: RestoreRequest): Promise<SoftDeleteRecord> {
    try {
      this.logger.log(`Restoring ${request.entityType}:${request.entityId} by user ${request.userId}`);

      // Validate user permissions
      await this.validateRestorePermission(request.userId, request.entityType);

      // Find soft delete record
      const [softDeleteRecord] = await this.db
        .select()
        .from(softDeletes)
        .where(
          and(
            eq(softDeletes.entityType, request.entityType),
            eq(softDeletes.entityId, request.entityId),
            eq(softDeletes.isRestored, false)
          )
        )
        .limit(1);

      if (!softDeleteRecord) {
        throw new NotFoundException(`${request.entityType} not found or not soft deleted`);
      }

      // Check retention policy
      if (softDeleteRecord.retentionUntil && softDeleteRecord.retentionUntil < new Date()) {
        throw new BadRequestException(`${request.entityType} retention period has expired`);
      }

      // Restore entity data
      await this.restoreEntityData(request.entityType, request.entityId, softDeleteRecord.entityData);

      // Update soft delete record
      await this.db
        .update(softDeletes)
        .set({
          isRestored: true,
          restoredAt: new Date(),
          restoredBy: request.userId,
        })
        .where(eq(softDeletes.id, softDeleteRecord.id));

      // Mark entity as active
      await this.markEntityAsActive(request.entityType, request.entityId);

      // Create audit log
      await this.createAuditLog({
        action: 'RESTORE',
        entityType: request.entityType,
        entityId: request.entityId,
        userId: request.userId,
        details: {
          originalDeletionId: softDeleteRecord.id,
        },
      });

      this.logger.log(`Restore completed: ${request.entityType}:${request.entityId}`);

      return {
        id: softDeleteRecord.id,
        entityType: softDeleteRecord.entityType,
        entityId: softDeleteRecord.entityId,
        entityData: softDeleteRecord.entityData,
        deletedAt: softDeleteRecord.deletedAt,
        deletedBy: softDeleteRecord.deletedBy,
        reason: softDeleteRecord.reason,
        isRestored: true,
        retentionUntil: softDeleteRecord.retentionUntil,
      };
    } catch (error) {
      this.logger.error(`Restore failed: ${request.entityType}:${request.entityId}`, error);
      throw error;
    }
  }

  /**
   * Get soft delete history for an entity
   */
  async getSoftDeleteHistory(
    entityType: string,
    entityId: string,
    tenantId: string,
  ): Promise<SoftDeleteRecord[]> {
    const records = await this.db
      .select()
      .from(softDeletes)
      .where(
        and(
          eq(softDeletes.tenantId, tenantId),
          eq(softDeletes.entityType, entityType),
          eq(softDeletes.entityId, entityId)
        )
      )
      .orderBy(desc(softDeletes.createdAt));

    return records.map(record => ({
      id: record.id,
      entityType: record.entityType,
      entityId: record.entityId,
      entityData: record.entityData,
      deletedAt: record.deletedAt,
      deletedBy: record.deletedBy,
      reason: record.reason,
      isRestored: record.isRestored,
      retentionUntil: record.retentionUntil,
    }));
  }

  /**
   * Get all soft deleted entities for a tenant
   */
  async getSoftDeletedEntities(
    tenantId: string,
    entityType?: string,
    page: number = 1,
    limit: number = 20,
  ): Promise<{ records: SoftDeleteRecord[]; total: number; pages: number }> {
    const offset = (page - 1) * limit;

    let whereClause = eq(softDeletes.tenantId, tenantId);
    if (entityType) {
      whereClause = and(whereClause, eq(softDeletes.entityType, entityType));
    }

    const [records, totalResult] = await Promise.all([
      this.db
        .select()
        .from(softDeletes)
        .where(whereClause)
        .orderBy(desc(softDeletes.deletedAt))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ count: 'count(*)' })
        .from(softDeletes)
        .where(whereClause),
    ]);

    const total = parseInt(totalResult[0].count);
    const pages = Math.ceil(total / limit);

    return {
      records: records.map(record => ({
        id: record.id,
        entityType: record.entityType,
        entityId: record.entityId,
        entityData: record.entityData,
        deletedAt: record.deletedAt,
        deletedBy: record.deletedBy,
        reason: record.reason,
        isRestored: record.isRestored,
        retentionUntil: record.retentionUntil,
      })),
      total,
      pages,
    };
  }

  /**
   * Cleanup expired soft delete records
   */
  async cleanupExpiredRecords(): Promise<number> {
    try {
      const expiredRecords = await this.db
        .select()
        .from(softDeletes)
        .where(
          and(
            gte(softDeletes.retentionUntil, new Date()),
            eq(softDeletes.isRestored, false)
          )
        );

      if (expiredRecords.length === 0) {
        return 0;
      }

      // Delete expired soft delete records
      const result = await this.db
        .delete(softDeletes)
        .where(
          and(
            gte(softDeletes.retentionUntil, new Date()),
            eq(softDeletes.isRestored, false)
          )
        );

      this.logger.log(`Cleaned up ${result.rowCount} expired soft delete records`);
      return result.rowCount || 0;
    } catch (error) {
      this.logger.error('Failed to cleanup expired soft delete records:', error);
      return 0;
    }
  }

  /**
   * Get entity data before deletion
   */
  private async getEntityData(entityType: string, entityId: string): Promise<{ data: any; tenantId: string } | null> {
    try {
      switch (entityType) {
        case 'users':
          const [user] = await this.db
            .select()
            .from(users)
            .where(eq(users.id, entityId))
            .limit(1);
          return user ? { data: user, tenantId: user.tenantId } : null;

        // Add other entity types as needed
        default:
          throw new BadRequestException(`Unsupported entity type: ${entityType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to get entity data: ${entityType}:${entityId}`, error);
      return null;
    }
  }

  /**
   * Mark entity as soft deleted
   */
  private async markEntityAsDeleted(
    entityType: string,
    entityId: string,
    deletedBy: string,
    reason: string,
    retentionUntil: Date,
  ): Promise<void> {
    try {
      switch (entityType) {
        case 'users':
          await this.db
            .update(users)
            .set({
              isDeleted: true,
              deletedAt: new Date(),
              deletedBy,
              deletedReason: reason,
              retentionUntil,
              updatedAt: new Date(),
            })
            .where(eq(users.id, entityId));
          break;

        // Add other entity types as needed
        default:
          throw new BadRequestException(`Unsupported entity type: ${entityType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to mark entity as deleted: ${entityType}:${entityId}`, error);
      throw error;
    }
  }

  /**
   * Mark entity as active (restore)
   */
  private async markEntityAsActive(entityType: string, entityId: string): Promise<void> {
    try {
      switch (entityType) {
        case 'users':
          await this.db
            .update(users)
            .set({
              isDeleted: false,
              deletedAt: null,
              deletedBy: null,
              deletedReason: null,
              retentionUntil: null,
              updatedAt: new Date(),
            })
            .where(eq(users.id, entityId));
          break;

        // Add other entity types as needed
        default:
          throw new BadRequestException(`Unsupported entity type: ${entityType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to mark entity as active: ${entityType}:${entityId}`, error);
      throw error;
    }
  }

  /**
   * Restore entity data
   */
  private async restoreEntityData(entityType: string, entityId: string, entityData: any): Promise<void> {
    try {
      switch (entityType) {
        case 'users':
          await this.db
            .update(users)
            .set({
              email: entityData.email,
              name: entityData.name,
              role: entityData.role,
              isActive: entityData.isActive,
              metadata: entityData.metadata,
              updatedAt: new Date(),
            })
            .where(eq(users.id, entityId));
          break;

        // Add other entity types as needed
        default:
          throw new BadRequestException(`Unsupported entity type: ${entityType}`);
      }
    } catch (error) {
      this.logger.error(`Failed to restore entity data: ${entityType}:${entityId}`, error);
      throw error;
    }
  }

  /**
   * Validate delete permissions
   */
  private async validateDeletePermission(userId: string, entityType: string): Promise<void> {
    // TODO: Implement proper permission validation based on user roles and entity ownership
    // For now, allow all authenticated users
  }

  /**
   * Validate restore permissions
   */
  private async validateRestorePermission(userId: string, entityType: string): Promise<void> {
    // TODO: Implement proper permission validation for restore operations
    // For now, allow all authenticated users
  }

  /**
   * Create audit log entry
   */
  private async createAuditLog(logData: {
    action: string;
    entityType: string;
    entityId: string;
    userId: string;
    details?: any;
  }): Promise<void> {
    // TODO: Implement audit log creation
    this.logger.log(`Audit log: ${logData.action} on ${logData.entityType}:${logData.entityId} by ${logData.userId}`);
  }

  /**
   * Check if entity is soft deleted
   */
  async isSoftDeleted(entityType: string, entityId: string, tenantId: string): Promise<boolean> {
    try {
      switch (entityType) {
        case 'users':
          const [user] = await this.db
            .select({ isDeleted: users.isDeleted })
            .from(users)
            .where(eq(users.id, entityId))
            .limit(1);
          return user?.isDeleted || false;

        // Add other entity types as needed
        default:
          return false;
      }
    } catch (error) {
      this.logger.error(`Failed to check soft delete status: ${entityType}:${entityId}`, error);
      return false;
    }
  }

  /**
   * Get soft delete statistics for a tenant
   */
  async getSoftDeleteStats(tenantId: string): Promise<{
    totalDeleted: number;
    totalRestored: number;
    byEntityType: Record<string, number>;
    byMonth: Record<string, number>;
  }> {
    const stats = await this.db
      .select({
        entityType: softDeletes.entityType,
        isRestored: softDeletes.isRestored,
        deletedAt: softDeletes.deletedAt,
      })
      .from(softDeletes)
      .where(eq(softDeletes.tenantId, tenantId));

    const totalDeleted = stats.length;
    const totalRestored = stats.filter(s => s.isRestored).length;

    const byEntityType: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    stats.forEach(stat => {
      // Count by entity type
      byEntityType[stat.entityType] = (byEntityType[stat.entityType] || 0) + 1;

      // Count by month
      const monthKey = stat.deletedAt.toISOString().substring(0, 7); // YYYY-MM
      byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
    });

    return {
      totalDeleted,
      totalRestored,
      byEntityType,
      byMonth,
    };
  }
}
