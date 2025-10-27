import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { EventBusService } from '../../../../core/events/event-bus.service';
import { StorageService } from '../../../../core/storage/storage.service';

interface ProposalData {
  proposalNumber: string;
  customerName: string;
  customerAddress: string;
  contactPerson: string;
  validUntil: Date;
  services: Array<{
    serviceName: string;
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }>;
  terms?: string[];
  notes?: string;
}

@Injectable()
export class ProposalGeneratorService {
  constructor(
    private readonly eventBus: EventBusService,
    private readonly storageService: StorageService,
  ) {}

  async generateProposal(data: ProposalData, tenantId: string) {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 842]);
    const { width, height } = page.getSize();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    let yPosition = height - 50;

    page.drawText('BUSINESS PROPOSAL', {
      x: 50,
      y: yPosition,
      size: 24,
      font: boldFont,
      color: rgb(0, 0.2, 0.5),
    });

    yPosition -= 30;
    page.drawText(`Proposal #: ${data.proposalNumber}`, { x: 50, y: yPosition, size: 12, font });
    yPosition -= 20;
    page.drawText(`Date: ${new Date().toLocaleDateString()}`, { x: 50, y: yPosition, size: 12, font });
    yPosition -= 20;
    page.drawText(`Valid Until: ${data.validUntil.toLocaleDateString()}`, { x: 50, y: yPosition, size: 12, font });

    yPosition -= 40;
    page.drawText('Prepared For:', { x: 50, y: yPosition, size: 14, font: boldFont });
    yPosition -= 20;
    page.drawText(data.customerName, { x: 50, y: yPosition, size: 12, font });
    yPosition -= 15;
    page.drawText(data.customerAddress, { x: 50, y: yPosition, size: 10, font });
    yPosition -= 15;
    page.drawText(`Attn: ${data.contactPerson}`, { x: 50, y: yPosition, size: 10, font });

    yPosition -= 40;
    page.drawText('Proposed Services:', { x: 50, y: yPosition, size: 14, font: boldFont });
    yPosition -= 25;

    page.drawText('Service', { x: 50, y: yPosition, size: 10, font: boldFont });
    page.drawText('Qty', { x: 300, y: yPosition, size: 10, font: boldFont });
    page.drawText('Unit Price', { x: 350, y: yPosition, size: 10, font: boldFont });
    page.drawText('Total', { x: 450, y: yPosition, size: 10, font: boldFont });
    yPosition -= 20;

    let subtotal = 0;

    for (const service of data.services) {
      page.drawText(service.serviceName, { x: 50, y: yPosition, size: 9, font });
      page.drawText(service.quantity.toString(), { x: 300, y: yPosition, size: 9, font });
      page.drawText(service.unitPrice.toFixed(2), { x: 350, y: yPosition, size: 9, font });
      page.drawText(service.total.toFixed(2), { x: 450, y: yPosition, size: 9, font });
      yPosition -= 15;

      if (service.description) {
        page.drawText(service.description, { x: 60, y: yPosition, size: 8, font, color: rgb(0.4, 0.4, 0.4) });
        yPosition -= 15;
      }

      subtotal += service.total;
    }

    yPosition -= 20;
    const tax = subtotal * 0.20;
    const total = subtotal + tax;

    page.drawText(`Subtotal: ${subtotal.toFixed(2)} TRY`, { x: 350, y: yPosition, size: 12, font });
    yPosition -= 20;
    page.drawText(`Tax (20%): ${tax.toFixed(2)} TRY`, { x: 350, y: yPosition, size: 12, font });
    yPosition -= 20;
    page.drawText(`Total: ${total.toFixed(2)} TRY`, { x: 350, y: yPosition, size: 14, font: boldFont });

    if (data.terms && data.terms.length > 0) {
      yPosition -= 40;
      page.drawText('Terms and Conditions:', { x: 50, y: yPosition, size: 12, font: boldFont });
      yPosition -= 20;

      for (const term of data.terms) {
        page.drawText(`• ${term}`, { x: 50, y: yPosition, size: 9, font });
        yPosition -= 15;

        if (yPosition < 100) break;
      }
    }

    if (data.notes) {
      yPosition -= 30;
      if (yPosition > 100) {
        page.drawText('Notes:', { x: 50, y: yPosition, size: 12, font: boldFont });
        yPosition -= 20;
        page.drawText(data.notes, { x: 50, y: yPosition, size: 9, font });
      }
    }

    const pdfBytes = await pdfDoc.save();

    await this.eventBus.emit('proposal.generated', {
      proposalNumber: data.proposalNumber,
      customerName: data.customerName,
      total,
      tenantId,
    });

    return {
      proposalNumber: data.proposalNumber,
      pdfBytes,
      total,
      validUntil: data.validUntil,
    };
  }

  async convertProposalToContract(proposalNumber: string, tenantId: string, userId: string) {
    const contractNumber = `CONT-${Date.now()}`;

    await this.eventBus.emit('proposal.converted.to.contract', {
      proposalNumber,
      contractNumber,
      tenantId,
    });

    return {
      proposalNumber,
      contractNumber,
      convertedAt: new Date(),
      convertedBy: userId,
    };
  }

  async trackProposalStatus(proposalNumber: string, tenantId: string) {
    return {
      proposalNumber,
      status: 'sent',
      sentAt: new Date(),
      viewedAt: null,
      acceptedAt: null,
      rejectedAt: null,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    };
  }

  async acceptProposal(proposalNumber: string, customerId: string, acceptedBy: string) {
    await this.eventBus.emit('proposal.accepted', {
      proposalNumber,
      customerId,
      acceptedBy,
    });

    return {
      proposalNumber,
      status: 'accepted',
      acceptedAt: new Date(),
      nextSteps: 'Contract will be generated',
    };
  }

  async rejectProposal(proposalNumber: string, customerId: string, reason: string) {
    await this.eventBus.emit('proposal.rejected', {
      proposalNumber,
      customerId,
      reason,
    });

    return {
      proposalNumber,
      status: 'rejected',
      rejectedAt: new Date(),
      reason,
    };
  }

  async reviseProposal(proposalNumber: string, revisions: any, tenantId: string, userId: string) {
    const revisedProposalNumber = `${proposalNumber}-R${Date.now()}`;

    await this.eventBus.emit('proposal.revised', {
      originalProposal: proposalNumber,
      revisedProposal: revisedProposalNumber,
      tenantId,
    });

    return {
      originalProposal: proposalNumber,
      revisedProposal: revisedProposalNumber,
      revisions,
      revisedAt: new Date(),
      revisedBy: userId,
    };
  }
}
