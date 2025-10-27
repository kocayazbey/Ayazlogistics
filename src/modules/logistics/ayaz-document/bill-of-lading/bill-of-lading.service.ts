import { Injectable, Inject } from '@nestjs/common';
import { DRIZZLE_ORM } from '../../../../core/database/database.constants';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and } from 'drizzle-orm';
import { EventBusService } from '../../../../core/events/event-bus.service';
import * as PDFDocument from 'pdfkit';

interface BillOfLading {
  id: string;
  blNumber: string;
  blType: 'ocean' | 'air' | 'truck' | 'rail';
  issuedDate: Date;
  shipper: {
    name: string;
    address: string;
    city: string;
    country: string;
    taxNumber?: string;
    contact?: string;
    phone?: string;
  };
  consignee: {
    name: string;
    address: string;
    city: string;
    country: string;
    taxNumber?: string;
    contact?: string;
    phone?: string;
  };
  notifyParty?: {
    name: string;
    address: string;
    city: string;
    country: string;
    contact?: string;
    phone?: string;
  };
  vessel?: {
    name: string;
    voyageNumber: string;
  };
  flight?: {
    number: string;
    departureDate: Date;
  };
  portOfLoading: {
    name: string;
    code: string;
    country: string;
  };
  portOfDischarge: {
    name: string;
    code: string;
    country: string;
  };
  placeOfDelivery?: {
    name: string;
    code?: string;
    country: string;
  };
  containers?: Array<{
    containerNumber: string;
    sealNumber: string;
    containerType: string;
    packageCount: number;
  }>;
  cargo: Array<{
    description: string;
    hsCode?: string;
    marksAndNumbers: string;
    numberOfPackages: number;
    packageType: string;
    grossWeight: number;
    netWeight?: number;
    volume?: number;
  }>;
  freight: {
    terms: 'prepaid' | 'collect' | 'third_party';
    amount?: number;
    currency?: string;
    payableAt?: string;
  };
  issuer: {
    name: string;
    address: string;
    signature?: string;
  };
  placeOfIssue: string;
  dateOfIssue: Date;
  originalBLCount: number;
  status: 'draft' | 'issued' | 'surrendered' | 'delivered' | 'archived';
  isNegotiable: boolean;
  createdAt: Date;
}

@Injectable()
export class BillOfLadingService {
  constructor(
    @Inject(DRIZZLE_ORM)
    private readonly db: PostgresJsDatabase,
    private readonly eventBus: EventBusService,
  ) {}

  async createBL(
    data: Omit<BillOfLading, 'id' | 'createdAt' | 'status'>,
    tenantId: string,
    userId: string,
  ): Promise<BillOfLading> {
    const blId = `BL-${Date.now()}`;

    const billOfLading: BillOfLading = {
      id: blId,
      ...data,
      createdAt: new Date(),
      status: 'draft',
    };

    await this.eventBus.emit('bill_of_lading.created', {
      blId,
      blNumber: data.blNumber,
      blType: data.blType,
      shipper: data.shipper.name,
      consignee: data.consignee.name,
      tenantId,
    });

    return billOfLading;
  }

  async getBL(blId: string, tenantId: string): Promise<BillOfLading | null> {
    // Mock: Would query bill_of_lading table
    return null;
  }

  async updateBLStatus(
    blId: string,
    status: BillOfLading['status'],
    tenantId: string,
    userId: string,
  ): Promise<void> {
    await this.eventBus.emit('bill_of_lading.status.updated', {
      blId,
      status,
      updatedBy: userId,
      tenantId,
    });
  }

  async surrenderBL(
    blId: string,
    surrenderedBy: string,
    surrenderDate: Date,
    tenantId: string,
  ): Promise<void> {
    await this.updateBLStatus(blId, 'surrendered', tenantId, surrenderedBy);

    await this.eventBus.emit('bill_of_lading.surrendered', {
      blId,
      surrenderedBy,
      surrenderDate,
      tenantId,
    });
  }

  async generateBLPDF(blId: string, copyNumber: number, tenantId: string): Promise<Buffer> {
    const bl = await this.getBL(blId, tenantId);
    
    if (!bl) {
      throw new Error('Bill of Lading not found');
    }

    return this.createBLPDF(bl, copyNumber);
  }

  private createBLPDF(bl: BillOfLading, copyNumber: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ size: 'A4', margin: 40 });
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));

        // Header
        doc.fontSize(18).text('BILL OF LADING', { align: 'center', underline: true });
        doc.fontSize(10).text(`${bl.isNegotiable ? 'NEGOTIABLE' : 'NON-NEGOTIABLE'}`, { align: 'center' });
        doc.fontSize(12).text(`B/L No: ${bl.blNumber}`, { align: 'center' });
        doc.fontSize(10).text(`Copy ${copyNumber} of ${bl.originalBLCount}`, { align: 'center' });
        doc.moveDown();

        // Shipper
        doc.fontSize(12).text('SHIPPER', { underline: true });
        doc.fontSize(9).text(bl.shipper.name);
        doc.text(bl.shipper.address);
        doc.text(`${bl.shipper.city}, ${bl.shipper.country}`);
        if (bl.shipper.taxNumber) doc.text(`Tax No: ${bl.shipper.taxNumber}`);
        doc.moveDown();

        // Consignee
        doc.fontSize(12).text('CONSIGNEE', { underline: true });
        doc.fontSize(9).text(bl.consignee.name);
        doc.text(bl.consignee.address);
        doc.text(`${bl.consignee.city}, ${bl.consignee.country}`);
        doc.moveDown();

        // Notify Party
        if (bl.notifyParty) {
          doc.fontSize(12).text('NOTIFY PARTY', { underline: true });
          doc.fontSize(9).text(bl.notifyParty.name);
          doc.text(bl.notifyParty.address);
          doc.text(`${bl.notifyParty.city}, ${bl.notifyParty.country}`);
          doc.moveDown();
        }

        // Vessel/Flight
        if (bl.blType === 'ocean' && bl.vessel) {
          doc.fontSize(12).text('VESSEL / VOYAGE', { underline: true });
          doc.fontSize(9).text(`${bl.vessel.name} / ${bl.vessel.voyageNumber}`);
          doc.moveDown();
        } else if (bl.blType === 'air' && bl.flight) {
          doc.fontSize(12).text('FLIGHT', { underline: true });
          doc.fontSize(9).text(`${bl.flight.number} / ${bl.flight.departureDate.toISOString().split('T')[0]}`);
          doc.moveDown();
        }

        // Ports
        doc.fontSize(12).text('PORT OF LOADING', { underline: true });
        doc.fontSize(9).text(`${bl.portOfLoading.name} (${bl.portOfLoading.code}), ${bl.portOfLoading.country}`);
        doc.moveDown();

        doc.fontSize(12).text('PORT OF DISCHARGE', { underline: true });
        doc.fontSize(9).text(`${bl.portOfDischarge.name} (${bl.portOfDischarge.code}), ${bl.portOfDischarge.country}`);
        doc.moveDown();

        if (bl.placeOfDelivery) {
          doc.fontSize(12).text('PLACE OF DELIVERY', { underline: true });
          doc.fontSize(9).text(`${bl.placeOfDelivery.name}, ${bl.placeOfDelivery.country}`);
          doc.moveDown();
        }

        // Containers
        if (bl.containers && bl.containers.length > 0) {
          doc.fontSize(12).text('CONTAINERS', { underline: true });
          bl.containers.forEach((container, idx) => {
            doc.fontSize(9).text(
              `${idx + 1}. ${container.containerNumber} | Seal: ${container.sealNumber} | Type: ${container.containerType}`
            );
          });
          doc.moveDown();
        }

        // Cargo
        doc.fontSize(12).text('CARGO DESCRIPTION', { underline: true });
        doc.fontSize(8);

        const tableTop = doc.y;
        const colWidths = [30, 150, 80, 60, 80];
        const headers = ['No.', 'Description', 'Marks', 'Packages', 'Weight (kg)'];

        // Table header
        let xPos = 40;
        headers.forEach((header, idx) => {
          doc.text(header, xPos, tableTop, { width: colWidths[idx], continued: false });
          xPos += colWidths[idx];
        });

        doc.moveTo(40, doc.y).lineTo(540, doc.y).stroke();
        doc.moveDown(0.5);

        // Table rows
        bl.cargo.forEach((item, idx) => {
          xPos = 40;
          const rowY = doc.y;

          doc.text(`${idx + 1}`, xPos, rowY, { width: colWidths[0] });
          xPos += colWidths[0];

          doc.text(item.description, xPos, rowY, { width: colWidths[1] });
          xPos += colWidths[1];

          doc.text(item.marksAndNumbers || '-', xPos, rowY, { width: colWidths[2] });
          xPos += colWidths[2];

          doc.text(`${item.numberOfPackages} ${item.packageType}`, xPos, rowY, { width: colWidths[3] });
          xPos += colWidths[3];

          doc.text(item.grossWeight.toString(), xPos, rowY, { width: colWidths[4] });

          doc.moveDown();
        });

        doc.moveTo(40, doc.y).lineTo(540, doc.y).stroke();
        doc.moveDown();

        // Freight Terms
        doc.fontSize(12).text('FREIGHT TERMS', { underline: true });
        doc.fontSize(9).text(`Freight: ${bl.freight.terms.toUpperCase()}`);
        if (bl.freight.amount) {
          doc.text(`Amount: ${bl.freight.amount} ${bl.freight.currency}`);
        }
        doc.moveDown();

        // Issuer
        doc.fontSize(10).text('Issued by:');
        doc.text(bl.issuer.name);
        doc.text(`Place: ${bl.placeOfIssue}`);
        doc.text(`Date: ${bl.dateOfIssue.toISOString().split('T')[0]}`);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async issueBL(blId: string, tenantId: string, userId: string): Promise<void> {
    await this.updateBLStatus(blId, 'issued', tenantId, userId);
  }

  async getBLList(
    filters: {
      startDate?: Date;
      endDate?: Date;
      status?: string;
      blType?: string;
    },
    tenantId: string,
  ): Promise<BillOfLading[]> {
    // Mock: Would query bill_of_lading table with filters
    return [];
  }
}

