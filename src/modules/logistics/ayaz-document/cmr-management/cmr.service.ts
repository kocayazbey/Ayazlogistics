import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import * as PDFDocument from 'pdfkit';

interface CMRDocument {
  id: string;
  cmrNumber: string;
  issueDate: Date;
  sender: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  consignee: {
    name: string;
    address: string;
    city: string;
    postalCode: string;
    country: string;
  };
  carrier: {
    name: string;
    address: string;
    registrationNumber?: string;
  };
  deliveryPlace: {
    name: string;
    address: string;
    city: string;
    country: string;
    deliveryDate?: Date;
  };
  goods: Array<{
    description: string;
    packagingType: string;
    numberOfPackages: number;
    methodOfPacking: string;
    grossWeight: number;
    volume?: number;
    marksAndNumbers?: string;
  }>;
  vehicle: {
    registrationNumber: string;
    trailer1?: string;
    trailer2?: string;
  };
  freightCharges: {
    payableBy: 'sender' | 'consignee';
    currency: string;
    amount?: number;
    paymentInstructions?: string;
  };
  customsDocuments?: string[];
  specialAgreements?: string;
  senderInstructions?: string;
  carrierReservations?: string;
  createdAt: Date;
  signedBySender?: boolean;
  signedByCarrier?: boolean;
  signedByConsignee?: boolean;
  status: 'draft' | 'issued' | 'in_transit' | 'delivered' | 'archived';
}

@Injectable()
export class CMRService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createCMR(
    data: Omit<CMRDocument, 'id' | 'createdAt' | 'status'>,
    tenantId: string,
    userId: string,
  ): Promise<CMRDocument> {
    const cmrId = `CMR-${Date.now()}`;

    const cmrDocument: CMRDocument = {
      id: cmrId,
      ...data,
      createdAt: new Date(),
      status: 'draft',
    };

    await this.eventBus.emit('cmr.created', {
      cmrId,
      cmrNumber: data.cmrNumber,
      sender: data.sender.name,
      consignee: data.consignee.name,
      tenantId,
    });

    return cmrDocument;
  }

  async getCMR(cmrId: string, tenantId: string): Promise<CMRDocument | null> {
    // Mock: Would query cmr_documents table
    return null;
  }

  async updateCMRStatus(
    cmrId: string,
    status: CMRDocument['status'],
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.eventBus.emit('cmr.status.updated', {
      cmrId,
      status,
      updatedBy: userId,
      tenantId,
    });
  }

  async signCMR(
    cmrId: string,
    signedBy: 'sender' | 'carrier' | 'consignee',
    signature: string,
    signatureDate: Date,
    tenantId: string,
  ): Promise<void> {
    await this.eventBus.emit('cmr.signed', {
      cmrId,
      signedBy,
      signatureDate,
      tenantId,
    });
  }

  async generateCMRPDF(cmrId: string, tenantId: string): Promise<Buffer> {
    const cmr = await this.getCMR(cmrId, tenantId);
    
    if (!cmr) {
      throw new Error('CMR document not found');
    }

    return this.createCMRPDF(cmr);
  }

  private createCMRPDF(cmr: CMRDocument): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 50 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(20).text('CMR - CONSIGNMENT NOTE', { align: 'center' });
        doc.fontSize(12).text(`CMR No: ${cmr.cmrNumber}`, { align: 'center' });
        doc.moveDown();

        // Sender
        doc.fontSize(14).text('1. SENDER', { underline: true });
        doc.fontSize(10).text(cmr.sender.name);
        doc.text(cmr.sender.address);
        doc.text(`${cmr.sender.postalCode} ${cmr.sender.city}, ${cmr.sender.country}`);
        doc.moveDown();

        // Consignee
        doc.fontSize(14).text('2. CONSIGNEE', { underline: true });
        doc.fontSize(10).text(cmr.consignee.name);
        doc.text(cmr.consignee.address);
        doc.text(`${cmr.consignee.postalCode} ${cmr.consignee.city}, ${cmr.consignee.country}`);
        doc.moveDown();

        // Delivery Place
        doc.fontSize(14).text('3. PLACE OF DELIVERY', { underline: true });
        doc.fontSize(10).text(cmr.deliveryPlace.name);
        doc.text(cmr.deliveryPlace.address);
        doc.text(`${cmr.deliveryPlace.city}, ${cmr.deliveryPlace.country}`);
        doc.moveDown();

        // Goods Description
        doc.fontSize(14).text('4. GOODS', { underline: true });
        cmr.goods.forEach((item, idx) => {
          doc.fontSize(10).text(`${idx + 1}. ${item.description}`);
          doc.text(`   Packaging: ${item.packagingType}, Qty: ${item.numberOfPackages}`);
          doc.text(`   Weight: ${item.grossWeight}kg${item.volume ? `, Volume: ${item.volume}m³` : ''}`);
        });
        doc.moveDown();

        // Carrier
        doc.fontSize(14).text('5. CARRIER', { underline: true });
        doc.fontSize(10).text(cmr.carrier.name);
        doc.text(cmr.carrier.address);
        if (cmr.carrier.registrationNumber) {
          doc.text(`Registration: ${cmr.carrier.registrationNumber}`);
        }
        doc.moveDown();

        // Vehicle
        doc.fontSize(14).text('6. VEHICLE', { underline: true });
        doc.fontSize(10).text(`Truck: ${cmr.vehicle.registrationNumber}`);
        if (cmr.vehicle.trailer1) doc.text(`Trailer 1: ${cmr.vehicle.trailer1}`);
        if (cmr.vehicle.trailer2) doc.text(`Trailer 2: ${cmr.vehicle.trailer2}`);
        doc.moveDown();

        // Freight
        doc.fontSize(14).text('7. FREIGHT CHARGES', { underline: true });
        doc.fontSize(10).text(`Payable by: ${cmr.freightCharges.payableBy}`);
        if (cmr.freightCharges.amount) {
          doc.text(`Amount: ${cmr.freightCharges.amount} ${cmr.freightCharges.currency}`);
        }
        doc.moveDown();

        // Special Agreements
        if (cmr.specialAgreements) {
          doc.fontSize(14).text('8. SPECIAL AGREEMENTS', { underline: true });
          doc.fontSize(10).text(cmr.specialAgreements);
          doc.moveDown();
        }

        // Signatures
        doc.fontSize(12).text('SIGNATURES', { underline: true });
        doc.text('Sender: ___________________  Date: ___________');
        doc.text('Carrier: ___________________  Date: ___________');
        doc.text('Consignee: ___________________  Date: ___________');

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async getCMRList(
    filters: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      carrier?: string;
    },
    tenantId: string,
  ): Promise<CMRDocument[]> {
    // Mock: Would query cmr_documents table with filters
    return [];
  }

  async archiveCMR(cmrId: string, tenantId: string): Promise<void> {
    await this.updateCMRStatus(cmrId, 'archived', tenantId, 'system');
  }
}

