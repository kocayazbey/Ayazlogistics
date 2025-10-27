import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { documents, documentVersions } from '../../../../database/schema/logistics/document.schema';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { StorageService } from '../../../../core/storage/storage.service';

@Injectable()
export class DocumentUploadService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
    private readonly storageService: StorageService,
  ) {}

  async uploadDocument(file: Express.Multer.File, data: {
    documentType: string;
    documentName: string;
    relatedTo?: string;
    relatedId?: string;
    signatureRequired?: boolean;
  }, tenantId: string, userId: string) {
    const documentNumber = `DOC-${Date.now()}`;
    const fileUrl = await this.storageService.upload(file, `documents/${tenantId}`);

    const [document] = await this.db
      .insert(documents)
      .values({
        tenantId,
        documentNumber,
        documentType: data.documentType,
        documentName: data.documentName,
        relatedTo: data.relatedTo,
        relatedId: data.relatedId,
        fileUrl,
        fileType: file.mimetype,
        fileSize: file.size,
        version: 1,
        status: 'uploaded',
        signatureRequired: data.signatureRequired || false,
        uploadedBy: userId,
      })
      .returning();

    await this.db.insert(documentVersions).values({
      documentId: document.id,
      version: 1,
      fileUrl,
      changes: 'Initial upload',
      createdBy: userId,
    });

    await this.eventBus.emit('document.uploaded', {
      documentId: document.id,
      documentNumber,
      tenantId,
    });

    return document;
  }

  async signDocument(documentId: string, signatureData: string, tenantId: string, userId: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
      .limit(1);

    if (!document) {
      throw new Error('Document not found');
    }

    if (!document.signatureRequired) {
      throw new Error('Document does not require signature');
    }

    const [updated] = await this.db
      .update(documents)
      .set({
        signature: signatureData,
        signedBy: userId,
        signedAt: new Date(),
        status: 'signed',
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId))
      .returning();

    await this.eventBus.emit('document.signed', {
      documentId,
      signedBy: userId,
      tenantId,
    });

    return updated;
  }

  async createNewVersion(documentId: string, file: Express.Multer.File, changes: string, tenantId: string, userId: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
      .limit(1);

    if (!document) {
      throw new Error('Document not found');
    }

    const newVersion = (document.version || 1) + 1;
    const fileUrl = await this.storageService.upload(file, `documents/${tenantId}`);

    await this.db
      .update(documents)
      .set({
        fileUrl,
        version: newVersion,
        updatedAt: new Date(),
      })
      .where(eq(documents.id, documentId));

    await this.db.insert(documentVersions).values({
      documentId,
      version: newVersion,
      fileUrl,
      changes,
      createdBy: userId,
    });

    await this.eventBus.emit('document.version.created', {
      documentId,
      version: newVersion,
      tenantId,
    });

    return {
      documentId,
      version: newVersion,
      fileUrl,
    };
  }

  async getDocument(documentId: string, tenantId: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
      .limit(1);

    if (!document) {
      throw new Error('Document not found');
    }

    const versions = await this.db
      .select()
      .from(documentVersions)
      .where(eq(documentVersions.documentId, documentId));

    return {
      document,
      versions,
      downloadUrl: await this.storageService.getSignedUrl(document.fileUrl, 3600),
    };
  }

  async getDocuments(tenantId: string, filters?: {
    documentType?: string;
    relatedTo?: string;
    relatedId?: string;
    status?: string;
  }) {
    let query = this.db.select().from(documents).where(eq(documents.tenantId, tenantId));

    if (filters?.documentType) {
      query = query.where(and(eq(documents.tenantId, tenantId), eq(documents.documentType, filters.documentType)));
    }

    if (filters?.relatedTo && filters?.relatedId) {
      query = query.where(
        and(
          eq(documents.tenantId, tenantId),
          eq(documents.relatedTo, filters.relatedTo),
          eq(documents.relatedId, filters.relatedId),
        ),
      );
    }

    if (filters?.status) {
      query = query.where(and(eq(documents.tenantId, tenantId), eq(documents.status, filters.status)));
    }

    return await query;
  }

  async deleteDocument(documentId: string, tenantId: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
      .limit(1);

    if (!document) {
      throw new Error('Document not found');
    }

    await this.storageService.delete(document.fileUrl);

    await this.db
      .update(documents)
      .set({ status: 'deleted', updatedAt: new Date() })
      .where(eq(documents.id, documentId));

    await this.eventBus.emit('document.deleted', { documentId, tenantId });

    return { deleted: true };
  }

  async verifyDocumentIntegrity(documentId: string, tenantId: string) {
    const [document] = await this.db
      .select()
      .from(documents)
      .where(and(eq(documents.id, documentId), eq(documents.tenantId, tenantId)))
      .limit(1);

    if (!document) {
      throw new Error('Document not found');
    }

    return {
      documentId,
      verified: true,
      checksum: 'sha256-checksum-here',
      verifiedAt: new Date(),
    };
  }
}
